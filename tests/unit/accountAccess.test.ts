import test from "node:test";
import assert from "node:assert/strict";
import { safeAppReturnPath, shouldForcePasswordChange } from "../../shared/accountAccess";

test("temporary-password accounts are kept on the password replacement route", () => {
  assert.equal(shouldForcePasswordChange(true, "/games/language-quest"), true);
  assert.equal(shouldForcePasswordChange(true, "/dashboard"), true);
  assert.equal(shouldForcePasswordChange(true, "/change-password"), false);
  assert.equal(shouldForcePasswordChange(true, "/change-password?from=login"), false);
  assert.equal(shouldForcePasswordChange(false, "/games/language-quest"), false);
});

test("login return paths preserve classroom invites without allowing external redirects", () => {
  assert.equal(safeAppReturnPath({
    pathname: "/games/language-quest/profile",
    search: "?classroomCode=ABCD12XY",
    hash: "#classrooms",
  }), "/games/language-quest/profile?classroomCode=ABCD12XY#classrooms");
  assert.equal(safeAppReturnPath({ pathname: "//malicious.example" }), null);
  assert.equal(safeAppReturnPath({ pathname: "/login" }), null);
});
