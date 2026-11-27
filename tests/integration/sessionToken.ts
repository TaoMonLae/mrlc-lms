import jwt from 'jsonwebtoken';
import type { PrismaClient } from '@prisma/client';

type TokenClaims = { userId: string; role: string; email: string };

export async function signSessionToken(db: Pick<PrismaClient, 'authSession'>, secret: string, claims: TokenClaims, lifetimeSeconds: number) {
  const session = await db.authSession.create({ data: { userId: claims.userId, expiresAt: new Date(Date.now() + lifetimeSeconds * 1000) } });
  return jwt.sign({ ...claims, sessionId: session.id }, secret, { expiresIn: lifetimeSeconds });
}
