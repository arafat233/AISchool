/**
 * Blockchain recording service — called by certificate-service on every issuance.
 * Uses ethers.js to interact with the deployed CertificateRegistry contract.
 */
import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";
import crypto from "crypto";
import * as contractConfig from "../../../../infrastructure/blockchain/contract-config.json";

const ABI = [
  "function recordCertificate(bytes32 certHash, string schoolId, string certificateId) external",
  "function recordBatch(bytes32[] hashes, string[] schoolIds, string[] certificateIds) external",
  "function revokeCertificate(bytes32 certHash, string reason) external",
  "function verifyCertificate(bytes32 certHash) external view returns (bool valid, bool revoked, string schoolId, string certificateId, uint256 issuedAt)",
  "function verifyCertificateById(string certificateId) external view returns (bool valid, bool revoked, bytes32 certHash, uint256 issuedAt)",
  "event CertificateRecorded(bytes32 indexed certHash, string indexed certificateId, string schoolId, uint256 issuedAt)",
  "event BatchRecorded(uint256 count, uint256 timestamp)",
];

// Batch buffer — collect hashes and flush every 5 minutes or when buffer hits 50
interface BatchItem {
  certHash: string;
  schoolId: string;
  certificateId: string;
}

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private contract: ethers.Contract;
  private batchBuffer: BatchItem[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    const rpcUrl = process.env.POLYGON_RPC_URL ?? "https://rpc-mumbai.maticvigil.com";
    const privateKey = process.env.BLOCKCHAIN_OPERATOR_PRIVATE_KEY ?? "";
    const contractAddress = process.env.CERTIFICATE_CONTRACT_ADDRESS ?? contractConfig.contractAddress;

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(contractAddress, ABI, this.signer);

    // Flush batch every 5 minutes
    this.flushTimer = setInterval(() => this.flushBatch(), 5 * 60 * 1000);
  }

  /**
   * Hash a certificate PDF buffer and record on-chain.
   * Added to batch buffer — flushed every 5 min or when 50 certs accumulate.
   */
  async recordCertificate(pdfBuffer: Buffer, schoolId: string, certificateId: string): Promise<string> {
    const certHash = "0x" + crypto.createHash("sha256").update(pdfBuffer).digest("hex");
    this.batchBuffer.push({ certHash, schoolId, certificateId });
    this.logger.log(`Queued for on-chain recording: ${certificateId} (buffer: ${this.batchBuffer.length})`);

    if (this.batchBuffer.length >= 50) {
      await this.flushBatch();
    }
    return certHash;
  }

  async revokeCertificate(pdfBuffer: Buffer, reason: string): Promise<void> {
    const certHash = "0x" + crypto.createHash("sha256").update(pdfBuffer).digest("hex");
    const tx = await this.contract.revokeCertificate(certHash, reason);
    await tx.wait();
    this.logger.log(`Certificate revoked on-chain: ${certHash}`);
  }

  async verifyCertificateById(certificateId: string) {
    try {
      const result = await this.contract.verifyCertificateById(certificateId);
      return {
        found: result.valid || result.revoked,
        valid: result.valid,
        revoked: result.revoked,
        certHash: result.certHash,
        issuedAt: result.issuedAt > 0 ? new Date(Number(result.issuedAt) * 1000).toISOString() : null,
        source: "POLYGON_BLOCKCHAIN",
      };
    } catch (err) {
      this.logger.error("Blockchain verify failed", err);
      return { found: false, valid: false, error: "Blockchain query failed" };
    }
  }

  private async flushBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) return;
    const batch = this.batchBuffer.splice(0, 100);

    try {
      const hashes = batch.map((b) => b.certHash);
      const schoolIds = batch.map((b) => b.schoolId);
      const certIds = batch.map((b) => b.certificateId);

      const tx = await this.contract.recordBatch(hashes, schoolIds, certIds);
      const receipt = await tx.wait();
      this.logger.log(`Batch recorded: ${batch.length} certs, tx: ${receipt.hash}`);
    } catch (err) {
      this.logger.error("Batch record failed — re-queuing", err);
      this.batchBuffer.unshift(...batch);
    }
  }
}
