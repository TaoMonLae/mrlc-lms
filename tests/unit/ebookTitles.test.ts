import assert from "node:assert/strict";
import test from "node:test";
import { cleanEbookTitle, findDuplicateEbookTitle, normalizeEbookTitle } from "../../lib/ebookTitles";

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
