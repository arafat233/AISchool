import { createHash, randomBytes } from "crypto";

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
