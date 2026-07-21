export const cleanEbookTitle = (value: unknown): string =>
  String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ");

export const normalizeEbookTitle = (value: unknown): string =>
  cleanEbookTitle(value).toLocaleLowerCase("en-US");

// Find an existing ebook whose normalized title matches the given title.
// Uses the indexed `titleLower` column (a normalized, lowercased, whitespace-
// collapsed copy of `title`) so this is an indexed lookup, not a full-table
// scan. The column is backfilled by migration and kept in sync on every
// create/update that goes through setEbookTitleLower (server-side).
export const findDuplicateEbookTitle = async (
  prisma: any,
  title: unknown,
  excludeId?: string,
): Promise<{ id: string; title: string } | null> => {
  const normalized = normalizeEbookTitle(title);
  if (!normalized) return null;
  const ebook = await prisma.ebook.findFirst({
    where: {
      titleLower: normalized,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, title: true },
  });
  if (ebook) return ebook;
  // Fallback for rows whose titleLower hasn't been backfilled yet (e.g. a
  // partially-applied migration). Rare; avoids a silent miss.
  const ebooks = await prisma.ebook.findMany({
    where: excludeId ? { id: { not: excludeId }, titleLower: null } : { titleLower: null },
    select: { id: true, title: true },
  });
  return ebooks.find((ebook: { id: string; title: string }) => normalizeEbookTitle(ebook.title) === normalized) || null;
};

// Find an existing ebook in the same series + volume. Uses the composite
// index on (seriesNameLower, seriesNumber) — an indexed lookup rather than
// scanning every row with that volume number.
export const findDuplicateEbookSeriesVolume = async (
  prisma: any,
  seriesName: unknown,
  seriesNumber: unknown,
  excludeId?: string,
): Promise<{ id: string; title: string; seriesName: string | null; seriesNumber: number | null } | null> => {
  const normalizedSeries = normalizeEbookTitle(seriesName);
  const volume = Number(seriesNumber);
  if (!normalizedSeries || !Number.isInteger(volume) || volume < 1) return null;
  const ebook = await prisma.ebook.findFirst({
    where: {
      seriesNameLower: normalizedSeries,
      seriesNumber: volume,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, title: true, seriesName: true, seriesNumber: true },
  });
  if (ebook) return ebook;
  // Fallback for rows whose seriesNameLower hasn't been backfilled yet.
  const ebooks = await prisma.ebook.findMany({
    where: {
      seriesNumber: volume,
      seriesNameLower: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, title: true, seriesName: true, seriesNumber: true },
  });
  return ebooks.find((ebook: { seriesName: string | null }) => normalizeEbookTitle(ebook.seriesName) === normalizedSeries) || null;
};

// Compute the normalized title to persist into `titleLower` on write. Mirrors
// the migration's expression so the indexed column always matches what
// findDuplicateEbookTitle queries for.
export const normalizedTitleForColumn = (title: unknown): string =>
  normalizeEbookTitle(title);
