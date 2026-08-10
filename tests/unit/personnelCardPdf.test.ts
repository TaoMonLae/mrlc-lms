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

test("personnel card PDF renders for every status value, including EXPIRED", async () => {
  // Server-side, `status` now always arrives pre-derived by
  // shared/studentCardValidity.ts's personnelCardStatus() — which can
  // produce "EXPIRED" (see tests/unit/studentCardValidity.test.ts, which is
  // the real regression test for that bug: the PDF used to re-derive its own
  // ACTIVE/EXPIRED badge and print a green "ACTIVE" badge on expired cards).
  // This just confirms the renderer itself accepts every status value for
  // every card kind without throwing, since it used to only ever see
  // ACTIVE/INACTIVE.
  for (const status of ["ACTIVE", "INACTIVE", "EXPIRED"]) {
    for (const kind of ["TEACHER", "STAFF"] as const) {
      const pdf = await renderPersonnelCardPdf({
        kind,
        cardNumber: `${kind}-000001`,
        holderName: "Test Holder",
        roleTitle: "Role",
        organizationUnit: "Unit",
        employmentType: "FULL_TIME",
        status,
        issueDate: "2020-01-01",
        expiryDate: "2021-01-01",
        schoolName: "Test School",
        schoolPhone: null,
        verifyUrl: "https://example.test/verify/personnel/token",
        logo: null,
        photo: null,
        qr: null,
      });
      assert.ok(pdf.length > 0, `expected a non-empty PDF for ${kind}/${status}`);
    }
  }
});

test("personnel card print assets meet 300 DPI CR80 dimensions", () => {
  assert.equal(PERSONNEL_CARD_PRINT_DPI, 300);
  assert.ok(PERSONNEL_CARD_RASTER_WIDTH_PX >= 638);
  assert.ok(PERSONNEL_CARD_RASTER_HEIGHT_PX >= 1011);
});
