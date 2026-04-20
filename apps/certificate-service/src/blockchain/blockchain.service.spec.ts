import crypto from "crypto";

// Mock ethers before importing the service
const mockContract = {
  recordBatch: jest.fn().mockResolvedValue({ hash: "0xtxhash", wait: jest.fn().mockResolvedValue({ status: 1 }) }),
  verifyCertificate: jest.fn(),
  revokeCertificate: jest.fn().mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
};
jest.mock("ethers", () => ({
  ethers: {
    JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
    Wallet: jest.fn().mockImplementation(() => ({ connect: jest.fn() })),
    Contract: jest.fn().mockImplementation(() => mockContract),
  },
}));
jest.mock("../../../../infrastructure/blockchain/contract-config.json", () => ({
  contractAddress: "0xMockContractAddress",
}), { virtual: true });

import { BlockchainService } from "./blockchain.service";

describe("BlockchainService", () => {
  let service: BlockchainService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.POLYGON_RPC_URL = "https://rpc-test.polygon.io";
    process.env.BLOCKCHAIN_OPERATOR_PRIVATE_KEY = "0x" + "a".repeat(64);
    process.env.CERTIFICATE_CONTRACT_ADDRESS = "0xMockContractAddress";
    service = new BlockchainService();
    (service as any).contract = mockContract;
    (service as any).batchBuffer = [];
  });

  afterEach(() => {
    if ((service as any).flushTimer) clearInterval((service as any).flushTimer);
  });

  describe("recordCertificate", () => {
    it("should queue certificate hash in batch buffer", async () => {
      const pdfBuffer = Buffer.from("fake-pdf-content");
      await service.recordCertificate(pdfBuffer, "sch-1", "CERT-001");
      expect((service as any).batchBuffer).toHaveLength(1);
      expect((service as any).batchBuffer[0].certificateId).toBe("CERT-001");
    });

    it("should produce correct SHA256 hash", async () => {
      const pdfBuffer = Buffer.from("test-pdf");
      await service.recordCertificate(pdfBuffer, "sch-1", "CERT-002");
      const expectedHash = "0x" + crypto.createHash("sha256").update(pdfBuffer).digest("hex");
      expect((service as any).batchBuffer[0].certHash).toBe(expectedHash);
    });

    it("should flush batch when buffer reaches 50", async () => {
      const flushSpy = jest.spyOn(service as any, "flushBatch").mockResolvedValue(undefined);
      for (let i = 0; i < 50; i++) {
        await service.recordCertificate(Buffer.from(`pdf-${i}`), "sch-1", `CERT-${i}`);
      }
      expect(flushSpy).toHaveBeenCalled();
    });
  });

  describe("verifyCertificate", () => {
    it("should return valid=true for existing certificate", async () => {
      mockContract.verifyCertificate.mockResolvedValueOnce([true, false, "sch-1", "CERT-001", BigInt(1234567890)]);
      const hash = "0x" + "a".repeat(64);
      const result = await service.verifyCertificate(hash);
      expect(result.valid).toBe(true);
      expect(result.revoked).toBe(false);
    });

    it("should return valid=false for non-existing certificate", async () => {
      mockContract.verifyCertificate.mockResolvedValueOnce([false, false, "", "", BigInt(0)]);
      const result = await service.verifyCertificate("0x" + "b".repeat(64));
      expect(result.valid).toBe(false);
    });
  });
});
