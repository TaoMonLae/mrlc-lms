import assert from "node:assert/strict";
import test from "node:test";
import { EVIDENCE_CASES, gradeEvidence, publicEvidenceCase } from "../../evidenceCases";

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
  }
});
