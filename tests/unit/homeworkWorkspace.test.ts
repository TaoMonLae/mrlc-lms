import assert from "node:assert/strict";
import test from "node:test";
import {
  homeworkStage,
  isHomeworkActionable,
  homeworkReviewDraft,
  homeworkCsv,
  homeworkDraftKey,
} from "../../src/lib/homeworkWorkspace";

test("homework date buckets use calendar days, with today not overdue", () => {
  const item = { status: "OPEN", dueDate: "2026-09-14T00:00:00Z" };
  assert.equal(homeworkStage(item, "2026-09-14"), "today");
  assert.equal(homeworkStage(item, "2026-09-15"), "overdue");
  assert.equal(homeworkStage(item, "2026-09-13"), "upcoming");
});
test("closed and submitted work is never student to-do work", () => {
  for (const status of [undefined, "REDO", "MARKED", "SUBMITTED"]) {
    const stage = homeworkStage(
      {
        status: "CLOSED",
        dueDate: "2026-09-10",
        mySubmission: status ? { status } : null,
      },
      "2026-09-14",
    );
    assert.equal(isHomeworkActionable(stage), false);
  }
  assert.equal(
    homeworkStage(
      {
        status: "OPEN",
        dueDate: "2026-09-10",
        mySubmission: { status: "REDO" },
      },
      "2026-09-14",
    ),
    "redo",
  );
});
test("review without edits preserves stored feedback and zero score", () => {
  assert.deepEqual(
    homeworkReviewDraft({ score: 0, feedback: "Show your steps." }),
    { score: "0", feedback: "Show your steps." },
  );
  assert.deepEqual(homeworkReviewDraft(null), { score: "", feedback: "" });
});
test("draft storage is isolated by user, assignment, and server submission version", () => {
  const keys = [
    homeworkDraftKey("a", "1"),
    homeworkDraftKey("b", "1"),
    homeworkDraftKey("a", "2"),
    homeworkDraftKey("a", "1", "v2"),
  ];
  assert.equal(new Set(keys).size, 4);
  assert.notEqual(homeworkDraftKey("a:b", "c"), homeworkDraftKey("a", "b:c"));
});
test("marking CSV quotes delimiters, preserves Unicode, and defuses formulas", () => {
  assert.equal(
    homeworkCsv([["A, B", 'He said "yes"', "မြန်မာ", null]]),
    '\uFEFF"A, B","He said ""yes""","မြန်မာ",""',
  );
  for (const input of ["=1+2", " +1", "-1", "@SUM(A1)", "\tformula"])
    assert.ok(homeworkCsv([[input]]).startsWith("\uFEFF\"'"));
});
