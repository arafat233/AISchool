// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * School ERP — Certificate Registry (Polygon)
 *
 * Stores SHA-256 hashes of issued certificates on-chain.
 * Supports:
 *  - Single hash recording
 *  - Batch recording (gas optimisation — up to 100 hashes per tx)
 *  - Revocation
 *  - Public verification
 *
 * Deployment: Polygon Mumbai (testnet) → Polygon mainnet
 * Gas: ~21k per hash on Polygon (~$0.001 at typical gas prices)
 */
contract CertificateRegistry {
    address public owner;
    address public operator;   // backend wallet that calls recordHash

    struct CertRecord {
        bytes32 certHash;      // SHA-256 of certificate PDF
        string schoolId;
        string certificateId;
        uint256 issuedAt;
        bool revoked;
        string revokedReason;
    }

    // certHash → CertRecord
    mapping(bytes32 => CertRecord) private records;
    // certificateId → certHash (for lookup by internal ID)
    mapping(string => bytes32) private idToHash;

    event CertificateRecorded(
        bytes32 indexed certHash,
        string indexed certificateId,
        string schoolId,
        uint256 issuedAt
    );

    event CertificateRevoked(
        bytes32 indexed certHash,
        string reason,
        uint256 revokedAt
    );

    event BatchRecorded(uint256 count, uint256 timestamp);

    modifier onlyOperator() {
        require(msg.sender == owner || msg.sender == operator, "Not authorized");
        _;
    }

    constructor(address _operator) {
        owner = msg.sender;
        operator = _operator;
    }

    function setOperator(address _operator) external {
        require(msg.sender == owner, "Only owner");
        operator = _operator;
    }

    // ── Single record ────────────────────────────────────────────────────────

    function recordCertificate(
        bytes32 certHash,
        string calldata schoolId,
        string calldata certificateId
    ) external onlyOperator {
        require(records[certHash].issuedAt == 0, "Already recorded");
        records[certHash] = CertRecord({
            certHash: certHash,
            schoolId: schoolId,
            certificateId: certificateId,
            issuedAt: block.timestamp,
            revoked: false,
            revokedReason: ""
        });
        idToHash[certificateId] = certHash;
        emit CertificateRecorded(certHash, certificateId, schoolId, block.timestamp);
    }

    // ── Batch record (gas optimisation) ─────────────────────────────────────

    function recordBatch(
        bytes32[] calldata hashes,
        string[] calldata schoolIds,
        string[] calldata certificateIds
    ) external onlyOperator {
        require(hashes.length == schoolIds.length && hashes.length == certificateIds.length, "Array length mismatch");
        require(hashes.length <= 100, "Max 100 per batch");

        for (uint256 i = 0; i < hashes.length; i++) {
            if (records[hashes[i]].issuedAt != 0) continue; // Skip duplicates
            records[hashes[i]] = CertRecord({
                certHash: hashes[i],
                schoolId: schoolIds[i],
                certificateId: certificateIds[i],
                issuedAt: block.timestamp,
                revoked: false,
                revokedReason: ""
            });
            idToHash[certificateIds[i]] = hashes[i];
            emit CertificateRecorded(hashes[i], certificateIds[i], schoolIds[i], block.timestamp);
        }
        emit BatchRecorded(hashes.length, block.timestamp);
    }

    // ── Revocation ───────────────────────────────────────────────────────────

    function revokeCertificate(bytes32 certHash, string calldata reason) external onlyOperator {
        require(records[certHash].issuedAt != 0, "Not found");
        require(!records[certHash].revoked, "Already revoked");
        records[certHash].revoked = true;
        records[certHash].revokedReason = reason;
        emit CertificateRevoked(certHash, reason, block.timestamp);
    }

    // ── Public verification ──────────────────────────────────────────────────

    function verifyCertificate(bytes32 certHash)
        external view
        returns (bool valid, bool revoked, string memory schoolId, string memory certificateId, uint256 issuedAt)
    {
        CertRecord memory r = records[certHash];
        if (r.issuedAt == 0) {
            return (false, false, "", "", 0);
        }
        return (!r.revoked, r.revoked, r.schoolId, r.certificateId, r.issuedAt);
    }

    function verifyCertificateById(string calldata certificateId)
        external view
        returns (bool valid, bool revoked, bytes32 certHash, uint256 issuedAt)
    {
        bytes32 h = idToHash[certificateId];
        if (h == bytes32(0)) return (false, false, 0, 0);
        CertRecord memory r = records[h];
        return (!r.revoked, r.revoked, h, r.issuedAt);
    }
}
