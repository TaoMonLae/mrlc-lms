import test from "node:test";
import assert from "node:assert/strict";
import { sessionSecretProblem } from "../../lib/sessionSecret";

test("missing or short session secrets are refused", () => {
  assert.match(sessionSecretProblem(undefined) ?? "", /must be set/);
  assert.match(sessionSecretProblem("   ") ?? "", /must be set/);
  assert.match(sessionSecretProblem("Short9!Secret") ?? "", /at least 16/);
});

test("placeholder values shipped in example configuration are refused", () => {
  for (const placeholder of [
    "change-me-to-a-long-random-string",
    "CHANGE_ME_TO_A_LONG_RANDOM_STRING",
    "CHANGE_ME_TO_NEW_RANDOM_SECRET",
    "replace-with-a-long-random-secret",
    "replace-with-a-random-secret-at-least-16-characters",
    "a-long-random-string-min-16-chars",
    "ci-only-session-secret-change-me",
  ]) {
    assert.match(sessionSecretProblem(placeholder) ?? "", /placeholder/, placeholder);
  }
});

test("repetitive session secrets are refused", () => {
  assert.match(sessionSecretProblem("aaaaaaaaaaaaaaaaaaaaaaaa") ?? "", /repetitive/);
  assert.match(sessionSecretProblem("abcabcabcabcabcabcabc") ?? "", /repetitive/);
});

test("generated random secrets are accepted", () => {
  assert.equal(sessionSecretProblem("q3Vx9mT2LkP8rZ4nW7yB1cF6hJ0sD5gA"), null);
  assert.equal(sessionSecretProblem("finance-disposable-test-secret-only"), null);
});
