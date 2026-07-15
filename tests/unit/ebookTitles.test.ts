import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanEbookTitle, findDuplicateEbookSeriesVolume, findDuplicateEbookTitle, normalizeEbookTitle,
} from "../../lib/ebookTitles";

test("ebook titles are cleaned and normalized consistently", () => {
  assert.equal(cleanEbookTitle("  The   Great\nBook  "), "The Great Book");
  assert.equal(normalizeEbookTitle(" THE great book "), "the great book");
  assert.equal(normalizeEbookTitle("Ｔｅｓｔ"), "test");
});

test("duplicate title matching ignores case, spacing, and an excluded record", async () => {
  const prisma = {
    ebook: {
      findMany: async ({ where }: any) => [
        { id: "one", title: "The Great Book" },
        { id: "two", title: "Another Book" },
      ].filter((ebook) => ebook.id !== where?.id?.not),
    },
  };

  assert.deepEqual(await findDuplicateEbookTitle(prisma, " the   GREAT book "), { id: "one", title: "The Great Book" });
  assert.equal(await findDuplicateEbookTitle(prisma, "The Great Book", "one"), null);
});

test("series volume matching prevents duplicate numbers within the same normalized series", async () => {
  const prisma = {
    ebook: {
      findMany: async ({ where }: any) => [
        { id: "one", title: "The First Book", seriesName: "Harry Potter", seriesNumber: 1 },
        { id: "two", title: "A Different Series", seriesName: "Other Series", seriesNumber: 1 },
      ].filter((ebook) => ebook.seriesNumber === where.seriesNumber && ebook.id !== where?.id?.not),
    },
  };

  assert.deepEqual(
    await findDuplicateEbookSeriesVolume(prisma, " harry   POTTER ", 1),
    { id: "one", title: "The First Book", seriesName: "Harry Potter", seriesNumber: 1 },
  );
  assert.equal(await findDuplicateEbookSeriesVolume(prisma, "Harry Potter", 1, "one"), null);
  assert.equal(await findDuplicateEbookSeriesVolume(prisma, "Harry Potter", 2), null);
});
