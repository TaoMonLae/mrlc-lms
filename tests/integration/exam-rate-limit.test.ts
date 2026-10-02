import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { registerExamPhase2Routes } from '../../examPhase2';

test('learners sharing a classroom IP retain independent exam request budgets', async () => {
  const app = express();
  registerExamPhase2Routes({
    app,
    authMiddleware: (req, _res, next) => { (req as any).user = { userId: req.headers['x-test-student'], role: 'STUDENT' }; next(); },
    prisma: { student: { findUnique: async () => ({ id: 'student' }) }, examAttempt: { findUnique: async () => null } },
    createAuditLog: async () => {}, logger: { error: () => {}, warn: () => {}, info: () => {} },
    canManageExamClass: async () => false,
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const address = server.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}/api/attempts/missing/state`;
  try {
    for (let i = 0; i < 120; i++) {
      const response = await fetch(url, { headers: { 'x-test-student': 'learner-a' } });
      await response.text();
      assert.equal(response.status, 404);
    }
    const limited = await fetch(url, { headers: { 'x-test-student': 'learner-a' } });
    await limited.text();
    assert.equal(limited.status, 429);
    const other = await fetch(url, { headers: { 'x-test-student': 'learner-b' } });
    await other.text();
    assert.equal(other.status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
