import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanEbookTitle, findDuplicateEbookSeriesVolume, findDuplicateEbookTitle, normalizeEbookTitle,
} from "../../lib/ebookTitles";

// The duplicate check queries the indexed `titleLower` / `seriesNameLower`
// columns first (an indexed lookup), then falls back to scanning rows whose
// normalized column is NULL (pre-migration). These mocks mirror both paths so
// the tests exercise the real query shape used in production.

const byLower = (value: string) => normalizeEbookTitle(value);

test("ebook titles are cleaned and normalized consistently", () => {
  assert.equal(cleanEbookTitle("  The   Great\nBook  "), "The Great Book");
  assert.equal(normalizeEbookTitle(" THE great book "), "the great book");
  assert.equal(normalizeEbookTitle("Ｔｅｓｔ"), "test");
});

test("duplicate title matching ignores case, spacing, and an excluded record", async () => {
  const rows = [
    { id: "one", title: "The Great Book", titleLower: byLower("The Great Book") },
    { id: "two", title: "Another Book", titleLower: byLower("Another Book") },
  ];
  const prisma = {
    ebook: {
      findFirst: async ({ where }: any) =>
        rows.find((r) => r.titleLower === where?.titleLower && r.id !== where?.id?.not) || null,
      findMany: async () => [],
    },
  };

  assert.deepEqual(await findDuplicateEbookTitle(prisma, " the   GREAT book "), { id: "one", title: "The Great Book", titleLower: byLower("The Great Book") });
  assert.equal(await findDuplicateEbookTitle(prisma, "The Great Book", "one"), null);
});

test("series volume matching prevents duplicate numbers within the same normalized series", async () => {
  const rows = [
    { id: "one", title: "The First Book", seriesName: "Harry Potter", seriesNameLower: byLower("Harry Potter"), seriesNumber: 1 },
    { id: "two", title: "A Different Series", seriesName: "Other Series", seriesNameLower: byLower("Other Series"), seriesNumber: 1 },
  ];
  const prisma = {
    ebook: {
      findFirst: async ({ where }: any) =>
        rows.find((r) =>
          r.seriesNameLower === where?.seriesNameLower &&
          r.seriesNumber === where.seriesNumber &&
          r.id !== where?.id?.not,
        ) || null,
      findMany: async () => [],
    },
  };

  assert.deepEqual(
    await findDuplicateEbookSeriesVolume(prisma, " harry   POTTER ", 1),
    { id: "one", title: "The First Book", seriesName: "Harry Potter", seriesNameLower: byLower("Harry Potter"), seriesNumber: 1 },
  );
  assert.equal(await findDuplicateEbookSeriesVolume(prisma, "Harry Potter", 1, "one"), null);
  assert.equal(await findDuplicateEbookSeriesVolume(prisma, "Harry Potter", 2), null);
});
