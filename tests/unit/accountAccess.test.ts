import test from "node:test";
import assert from "node:assert/strict";
import { shouldForcePasswordChange } from "../../shared/accountAccess";

test("temporary-password accounts are kept on the password replacement route", () => {
  assert.equal(shouldForcePasswordChange(true, "/games/language-quest"), true);
  assert.equal(shouldForcePasswordChange(true, "/dashboard"), true);
  assert.equal(shouldForcePasswordChange(true, "/change-password"), false);
  assert.equal(shouldForcePasswordChange(true, "/change-password?from=login"), false);
  assert.equal(shouldForcePasswordChange(false, "/games/language-quest"), false);
});
