import test from "node:test";
import assert from "node:assert/strict";
import { isGuardianApiRequestAllowed } from "../../shared/familyAccess";

test("guardian API access stays within the portal and account endpoints", () => {
  assert.equal(isGuardianApiRequestAllowed("GET", "/api/family/students?x=1"), true);
  assert.equal(isGuardianApiRequestAllowed("POST", "/api/family/messages"), true);
  assert.equal(isGuardianApiRequestAllowed("GET", "/api/auth/me"), true);
  assert.equal(isGuardianApiRequestAllowed("GET", "/api/settings"), true);
  assert.equal(isGuardianApiRequestAllowed("PUT", "/api/settings"), false);
  assert.equal(isGuardianApiRequestAllowed("GET", "/api/students"), false);
  assert.equal(isGuardianApiRequestAllowed("GET", "/api/family-messages"), false);
  assert.equal(isGuardianApiRequestAllowed("GET", "/api/familyish/students"), false);
});
