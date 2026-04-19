/**
 * Hardhat deployment script — CertificateRegistry
 * Deploy: npx hardhat run infrastructure/blockchain/deploy.ts --network polygon_mumbai
 * Verify: npx hardhat verify --network polygon_mumbai <address> <operator>
 */
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const operatorAddress = process.env.BLOCKCHAIN_OPERATOR_ADDRESS ?? deployer.address;

  console.log(`Deploying CertificateRegistry from: ${deployer.address}`);
  console.log(`Operator: ${operatorAddress}`);

  const factory = await ethers.getContractFactory("CertificateRegistry");
  const contract = await factory.deploy(operatorAddress);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`CertificateRegistry deployed to: ${address}`);
  console.log(`Network: ${(await ethers.provider.getNetwork()).name}`);

  // Persist address for backend service
  const fs = await import("fs");
  const config = { contractAddress: address, operatorAddress, deployedAt: new Date().toISOString() };
  fs.writeFileSync(
    "infrastructure/blockchain/contract-config.json",
    JSON.stringify(config, null, 2)
  );
  console.log("Contract config saved to infrastructure/blockchain/contract-config.json");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
