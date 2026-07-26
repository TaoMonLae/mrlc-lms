import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { loadPdfLogo } from "../../pdfBranding";

test("PDF branding converts an uploaded SVG logo to an embeddable PNG", async (t) => {
  const assetDir = await fs.mkdtemp(path.join(os.tmpdir(), "mrlc-pdf-branding-"));
  t.after(() => fs.rm(assetDir, { recursive: true, force: true }));
  await fs.writeFile(
    path.join(assetDir, "school.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><circle cx="60" cy="60" r="55" fill="#6d28d9"/></svg>',
  );

  const logo = await loadPdfLogo("/uploads/branding/school.svg", assetDir);
  assert.ok(logo);
  assert.deepEqual(Array.from(logo.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
});

test("PDF branding rejects external and nested asset paths", async () => {
  assert.equal(await loadPdfLogo("https://example.com/logo.png"), null);
  assert.equal(await loadPdfLogo("/uploads/branding/../logo.png"), null);
  assert.equal(await loadPdfLogo("/uploads/branding/nested/logo.png"), null);
});

test("PDF branding falls back cleanly when the uploaded logo is missing", async () => {
  assert.equal(await loadPdfLogo("/uploads/branding/missing.png", os.tmpdir()), null);
});
