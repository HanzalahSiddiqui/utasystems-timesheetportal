import { createCipheriv, randomBytes } from "node:crypto";

function getSsnEncryptionKey() {
  const keyHex = process.env.EMPLOYEE_SSN_ENCRYPTION_KEY || "";
  if (!/^[a-f\d]{64}$/i.test(keyHex)) {
    const error = new Error("SSN encryption is not configured. Set EMPLOYEE_SSN_ENCRYPTION_KEY to a dedicated 64-character hexadecimal key.");
    error.code = "SSN_ENCRYPTION_KEY_MISSING";
    throw error;
  }
  return Buffer.from(keyHex, "hex");
}

export function normalizeSsn(value) {
  const raw = String(value || "").trim();
  if (raw && !/^[\d\s-]+$/.test(raw)) {
    const error = new Error("SSN may contain only digits, spaces, or hyphens.");
    error.code = "SSN_INVALID";
    throw error;
  }
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length !== 9) {
    const error = new Error("SSN must contain exactly 9 digits.");
    error.code = "SSN_INVALID";
    throw error;
  }
  return digits;
}

export function encryptSsn(digits) {
  if (!digits) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getSsnEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(digits, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function maskSsn(lastFour) {
  const digits = String(lastFour || "").replace(/\D/g, "").slice(-4);
  return digits ? `***-**-${digits}` : "Not on file";
}
