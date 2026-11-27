import crypto from "crypto";
import bcrypt from "bcryptjs";

const TEMPORARY_PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const TEMPORARY_PASSWORD_GROUPS = 3;
const TEMPORARY_PASSWORD_GROUP_LENGTH = 4;

export function generateTemporaryPassword(): string {
  const groups = Array.from({ length: TEMPORARY_PASSWORD_GROUPS }, () =>
    Array.from({ length: TEMPORARY_PASSWORD_GROUP_LENGTH }, () =>
      TEMPORARY_PASSWORD_ALPHABET[crypto.randomInt(TEMPORARY_PASSWORD_ALPHABET.length)],
    ).join(""),
  );
  return groups.join("-");
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export const UNKNOWN_ACCOUNT_PASSWORD_HASH = bcrypt.hashSync(crypto.randomBytes(24).toString("hex"), 10);

type LoginCandidate = { email: string; username?: string | null };

export function pickLoginAccount<T extends LoginCandidate>(candidates: T[], identifier: string): T | undefined {
  const exact = candidates.find((candidate) => candidate.email === identifier || candidate.username === identifier);
  if (exact) return exact;
  const normalized = normalizeEmail(identifier);
  const caseInsensitive = candidates.filter((candidate) =>
    candidate.email.toLowerCase() === normalized || candidate.username?.toLowerCase() === normalized);
  return caseInsensitive.length === 1 ? caseInsensitive[0] : undefined;
}

export type InitialPassword = { passwordHash: string; mustChangePassword: true; temporaryPassword: string | null };

export async function initialPasswordFor(chosenPassword: string | null | undefined): Promise<InitialPassword> {
  const temporaryPassword = chosenPassword ? null : generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(chosenPassword || (temporaryPassword as string), 10);
  return { passwordHash, mustChangePassword: true, temporaryPassword };
}
