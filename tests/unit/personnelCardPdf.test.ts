import assert from "node:assert/strict";
import test from "node:test";
import {
  PERSONNEL_CARD_HEIGHT_PT,
  PERSONNEL_CARD_PRINT_DPI,
  PERSONNEL_CARD_RASTER_HEIGHT_PX,
  PERSONNEL_CARD_RASTER_WIDTH_PX,
  PERSONNEL_CARD_WIDTH_PT,
  renderPersonnelCardPdf,
} from "../../personnelCardPdf";

test("personnel card PDF contains exactly two portrait CR80 pages", async () => {
  const pdf = await renderPersonnelCardPdf({
    kind: "TEACHER",
    cardNumber: "TCH-706047",
    holderName: "Tao Mon Lae",
    roleTitle: "English, Reasoning Through Language Arts",
    organizationUnit: "GED Academic Faculty",
    employmentType: "FULL TIME",
    status: "ACTIVE",
    issueDate: "2026-08-07",
    expiryDate: "2029-08-07",
    schoolName: "Mon Refugee Learning Centre - GED School",
    schoolPhone: "+60 12-345-6789",
    verifyUrl: "https://example.test/verify/personnel/secure-token",
    logo: null,
    photo: null,
    qr: null,
  });

  const source = pdf.toString("latin1");
  assert.equal((source.match(/\/Type \/Page\b/g) || []).length, 2);
  const mediaBox = source.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
  assert.ok(mediaBox);
  assert.ok(Math.abs(Number(mediaBox[1]) - PERSONNEL_CARD_WIDTH_PT) < 0.001);
  assert.ok(Math.abs(Number(mediaBox[2]) - PERSONNEL_CARD_HEIGHT_PT) < 0.001);
});

test("personnel card print assets meet 300 DPI CR80 dimensions", () => {
  assert.equal(PERSONNEL_CARD_PRINT_DPI, 300);
  assert.ok(PERSONNEL_CARD_RASTER_WIDTH_PX >= 638);
  assert.ok(PERSONNEL_CARD_RASTER_HEIGHT_PX >= 1011);
});

