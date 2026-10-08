import { createHash, randomBytes } from "node:crypto";

/** A long random resume token. Only its SHA-256 hash is stored in the database. */
export function newToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
