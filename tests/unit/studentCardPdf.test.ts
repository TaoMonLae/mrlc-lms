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
    identityNumber: "UNHCR-12345678",
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

test("long school details stay on the card back without creating an overflow page", async () => {
  const pdf = await renderStudentCardPdf({
    documentNumber: "MRLC--ID-20260807030043962-298945",
    status: "ACTIVE",
    studentName: "Min Khant Aung",
    studentCode: "STD-2024-001",
    identityNumber: "MY-IDENTITY-2026-00001234",
    className: "GED",
    academicYear: "2026-2027",
    issueDate: "2026-08-07",
    expiryDate: "2027-07-31T15:59:59.999Z",
    schoolName: "Mon Refugee Learning Centre - GED School",
    schoolPhone: "+60 12-345-6789",
    verifyUrl: "http://localhost:8000/verify/44f334419371cd48fb29aacde867e1fc",
    logo: null,
    photo: null,
    qr: null,
  });

  const source = pdf.toString("latin1");
  assert.equal((source.match(/\/Type \/Page\b/g) || []).length, 2);
});
