import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import {
  UNKNOWN_ACCOUNT_PASSWORD_HASH,
  generateTemporaryPassword,
  initialPasswordFor,
  normalizeEmail,
  pickLoginAccount,
} from "../../lib/accountCredentials";
import { sessionAccountForToken } from "../../lib/sessionAccess";
import { isPasswordChangePendingApiRequestAllowed } from "../../shared/accountAccess";

test("temporary passwords are random, readable and never the old shared default", () => {
  const generated = new Set(Array.from({ length: 200 }, generateTemporaryPassword));
  assert.equal(generated.size, 200);
  for (const password of generated) {
    assert.match(password, /^[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}$/);
    assert.notEqual(password, "Student123!");
  }
});

test("every initial password forces a change, and only generated ones are returned for sharing", async () => {
  const generated = await initialPasswordFor(undefined);
  assert.equal(generated.mustChangePassword, true);
  assert.ok(generated.temporaryPassword);
  assert.equal(await bcrypt.compare(generated.temporaryPassword as string, generated.passwordHash), true);

  const chosen = await initialPasswordFor("Welcome2026");
  assert.equal(chosen.mustChangePassword, true);
  assert.equal(chosen.temporaryPassword, null);
  assert.equal(await bcrypt.compare("Welcome2026", chosen.passwordHash), true);
});

test("unknown accounts are checked against a real bcrypt hash so timing matches", async () => {
  assert.equal(bcrypt.getRounds(UNKNOWN_ACCOUNT_PASSWORD_HASH), 10);
  const started = process.hrtime.bigint();
  assert.equal(await bcrypt.compare("Student123!", UNKNOWN_ACCOUNT_PASSWORD_HASH), false);
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  assert.ok(elapsedMs > 5, `expected a full bcrypt comparison, took ${elapsedMs}ms`);
});

test("login matches emails regardless of case but prefers an exact account", () => {
  assert.equal(normalizeEmail("  Thida.Aung@School.EDU "), "thida.aung@school.edu");
  const thida = { id: "1", email: "thida@school.edu", username: null };
  assert.equal(pickLoginAccount([thida], "Thida@School.edu")?.id, "1");

  const legacyUpper = { id: "2", email: "Mya@school.edu", username: null };
  const lower = { id: "3", email: "mya@school.edu", username: null };
  assert.equal(pickLoginAccount([legacyUpper, lower], "mya@school.edu")?.id, "3");
  assert.equal(pickLoginAccount([legacyUpper, lower], "MYA@school.edu"), undefined);

  const byUsername = { id: "4", email: "aung@school.edu", username: "aung.ko" };
  assert.equal(pickLoginAccount([byUsername], "Aung.Ko")?.id, "4");
  assert.equal(pickLoginAccount([], "nobody@school.edu"), undefined);
});

test("accounts with a temporary password can only reach the password change API", () => {
  assert.equal(isPasswordChangePendingApiRequestAllowed("POST", "/api/auth/change-password"), true);
  assert.equal(isPasswordChangePendingApiRequestAllowed("GET", "/api/auth/me"), true);
  assert.equal(isPasswordChangePendingApiRequestAllowed("post", "/api/auth/logout"), true);
  assert.equal(isPasswordChangePendingApiRequestAllowed("GET", "/api/settings?fresh=1"), true);
  assert.equal(isPasswordChangePendingApiRequestAllowed("GET", "/api/students"), false);
  assert.equal(isPasswordChangePendingApiRequestAllowed("GET", "/api/auth/change-password"), false);
  assert.equal(isPasswordChangePendingApiRequestAllowed("PUT", "/api/settings"), false);
});

test("live session lookup reports when the account still has to change its password", async () => {
  let account: any = { isActive: true, role: "STUDENT", isExternalLearner: false, mustChangePassword: true };
  const db: any = { user: { findUnique: async () => account } };
  const token = { userId: "student", role: "STUDENT" };
  assert.deepEqual(await sessionAccountForToken(db, token), { mustChangePassword: true });
  account = { ...account, mustChangePassword: false };
  assert.deepEqual(await sessionAccountForToken(db, token), { mustChangePassword: false });
  account = { ...account, isActive: false };
  assert.equal(await sessionAccountForToken(db, token), null);
});
