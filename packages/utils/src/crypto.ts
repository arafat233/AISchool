import { createHash, randomBytes, createCipheriv, createDecipheriv } from "crypto";

const AES_ALGO = "aes-256-gcm";

function getFieldEncryptionKey(): Buffer {
  const key = process.env.FIELD_ENCRYPTION_KEY;
  if (!key || key.length < 32) throw new Error("FIELD_ENCRYPTION_KEY must be set and at least 32 chars");
  return Buffer.from(key.slice(0, 32), "utf8");
}

export function encryptField(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(AES_ALGO, getFieldEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${encrypted.toString("hex")}`;
}

export function decryptField(ciphertext: string): string {
  const [ivHex, tagHex, dataHex] = ciphertext.split(".");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Invalid encrypted field format");
  const decipher = createDecipheriv(AES_ALGO, getFieldEncryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

export function generateOtp(length = 6): string {
  const max = Math.pow(10, length);
  const bytes = randomBytes(4);
  const num = bytes.readUInt32BE(0);
  return String(num % max).padStart(length, "0");
}

export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hashOtp(otp: string, salt: string): string {
  return sha256(`${otp}:${salt}`);
}
