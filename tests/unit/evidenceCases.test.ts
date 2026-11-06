import assert from "node:assert/strict";
import test from "node:test";
import { EVIDENCE_CASES, evidenceAttemptResponse, gradeEvidence, publicEvidenceCase } from "../../evidenceCases";

test("case catalog has valid, distinct answers without exposing the key", () => {
  assert.equal(new Set(EVIDENCE_CASES.map((item) => item.id)).size, EVIDENCE_CASES.length);
  assert.ok(EVIDENCE_CASES.length >= 8);
  for (const item of EVIDENCE_CASES) {
    assert.equal(item.paragraphs.length, 3);
    assert.ok(item.evidence.length >= 3);
    assert.ok(item.reasoning.length >= 3);
    assert.equal(new Set(item.evidence.map((option) => option.id)).size, item.evidence.length);
    assert.equal(new Set(item.reasoning.map((option) => option.id)).size, item.reasoning.length);
    assert.ok(item.evidence.some((option) => option.id === item.answer.evidence));
    assert.ok(item.reasoning.some((option) => option.id === item.answer.reasoning));
    assert.deepEqual(gradeEvidence(item, item.answer.evidence, item.answer.reasoning), { evidenceCorrect: true, reasoningCorrect: true });
    assert.equal(gradeEvidence(item, item.evidence.find((option) => option.id !== item.answer.evidence)!.id, item.answer.reasoning).evidenceCorrect, false);
    assert.equal(gradeEvidence(item, item.answer.evidence, item.reasoning.find((option) => option.id !== item.answer.reasoning)!.id).reasoningCorrect, false);
    const publicCase = publicEvidenceCase(item);
    assert.equal("answer" in publicCase, false);
    assert.equal("explanation" in publicCase, false);
    assert.equal("hint" in publicCase, false);
    const unsolved = evidenceAttemptResponse(item, 1, false);
    assert.equal(unsolved.solved, false);
    assert.equal("answer" in unsolved, false);
    assert.equal("evidenceCorrect" in unsolved, false);
    assert.equal("reasoningCorrect" in unsolved, false);
    assert.equal("explanation" in unsolved, false);
    const solved = evidenceAttemptResponse(item, 2, true);
    assert.equal(solved.solved, true);
    assert.deepEqual(solved.answer, item.answer);
  }
});

test("answer wording and positions do not reveal the key", () => {
  const uniqueLongestCorrect = { evidence: 0, reasoning: 0 };
  for (const item of EVIDENCE_CASES) {
    for (const kind of ["evidence", "reasoning"] as const) {
      const lengths = item[kind].map((option) => option.text.trim().split(/\s+/).length);
      const shortest = Math.min(...lengths);
      const longest = Math.max(...lengths);
      assert.ok(longest - shortest <= 3, `${item.id} ${kind} choices vary too much in length`);
      const correct = item[kind].findIndex((option) => option.id === item.answer[kind]);
      if (lengths[correct] === longest && lengths.filter((length) => length === longest).length === 1) {
        uniqueLongestCorrect[kind]++;
      }
    }
  }
  assert.deepEqual(new Set(EVIDENCE_CASES.map((item) => item.answer.evidence)), new Set(["a", "b", "c", "d"]));
  assert.deepEqual(new Set(EVIDENCE_CASES.map((item) => item.answer.reasoning)), new Set(["a", "b", "c"]));
  assert.ok(uniqueLongestCorrect.evidence < EVIDENCE_CASES.length / 2);
  assert.ok(uniqueLongestCorrect.reasoning < EVIDENCE_CASES.length / 2);
});
