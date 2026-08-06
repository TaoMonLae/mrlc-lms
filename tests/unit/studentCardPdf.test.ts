import assert from "node:assert/strict";
import test from "node:test";
import {
  renderStudentCardPdf,
  STUDENT_CARD_HEIGHT_PT,
  STUDENT_CARD_WIDTH_PT,
} from "../../studentCardPdf";

test("student card PDF contains exactly two portrait CR80 pages", async () => {
  const pdf = await renderStudentCardPdf({
    documentNumber: "TEST-ID-001",
    status: "ACTIVE",
    studentName: "Test Learner",
    studentCode: "ST-001",
    className: "GED",
    academicYear: "2026-2027",
    issueDate: "2026-08-06",
    expiryDate: "2027-07-31T15:59:59.999Z",
    schoolName: "Test School",
    schoolPhone: null,
    verifyUrl: "https://example.test/verify/card",
    logo: null,
    photo: null,
    qr: null,
  });

  const source = pdf.toString("latin1");
  assert.equal((source.match(/\/Type \/Page\b/g) || []).length, 2);
  const mediaBox = source.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
  assert.ok(mediaBox);
  assert.ok(Math.abs(Number(mediaBox[1]) - STUDENT_CARD_WIDTH_PT) < 0.001);
  assert.ok(Math.abs(Number(mediaBox[2]) - STUDENT_CARD_HEIGHT_PT) < 0.001);
});
