import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function signature(userId: string, fileId: string): Buffer | null {
  const secret = process.env.XAI_API_KEY;
  if (!secret) return null;
  return createHmac("sha256", secret).update("klaren-file-v1").update("\0").update(userId).update("\0").update(fileId).digest();
}

export function createFileProof(userId: string, fileId: string): string {
  const value = signature(userId, fileId);
  if (!value) throw new Error("File signing is unavailable.");
  return value.toString("hex");
}

export function verifyFileProof(userId: string, fileId: string, proof: string): boolean {
  if (!/^file-[a-zA-Z0-9_-]+$/.test(fileId) || !/^[a-f0-9]{64}$/.test(proof)) return false;
  const expected = signature(userId, fileId);
  return expected !== null && timingSafeEqual(expected, Buffer.from(proof, "hex"));
}
