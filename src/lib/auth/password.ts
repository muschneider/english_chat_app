import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing with Node's built-in scrypt (OWASP-recommended, no native
 * dependency). Stored format: `scrypt$<saltHex>$<hashHex>`.
 */
const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, keyHex] = parts;
  const key = Buffer.from(keyHex, "hex");
  const derived = (await scryptAsync(password, salt, key.length || KEY_LENGTH)) as Buffer;
  // Constant-time comparison; guard length first (timingSafeEqual throws on mismatch).
  if (key.length !== derived.length) return false;
  return timingSafeEqual(key, derived);
}
