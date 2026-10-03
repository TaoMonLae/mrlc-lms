import type { PrismaClient } from '@prisma/client';

type SessionIdentity = { userId: string; role: string; externalLearner?: boolean };

/** Recheck every session against live access, including administrative status edits. */
export async function accountStillMatchesToken(db: Pick<PrismaClient, 'user'>, identity: SessionIdentity) {
  const current = await db.user.findUnique({
    where: { id: identity.userId }, select: { role: true, isActive: true, isExternalLearner: true },
  });
  return Boolean(current?.isActive && current.role === identity.role
    && Boolean(current.isExternalLearner) === Boolean(identity.externalLearner));
}

/** Compare-and-swap prevents concurrent requests from reusing one recovery code. */
export async function consumeRecoveryCode(db: Pick<PrismaClient, 'user'>, userId: string, snapshot: string[], index: number) {
  const result = await db.user.updateMany({
    where: { id: userId, mfaRecoveryCodeHashes: { equals: snapshot } },
    data: { mfaRecoveryCodeHashes: snapshot.filter((_, current) => current !== index) },
  });
  return result.count === 1;
}
