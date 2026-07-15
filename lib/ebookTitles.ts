export const cleanEbookTitle = (value: unknown): string =>
  String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ");

export const normalizeEbookTitle = (value: unknown): string =>
  cleanEbookTitle(value).toLocaleLowerCase("en-US");

export const findDuplicateEbookTitle = async (
  prisma: any,
  title: unknown,
  excludeId?: string,
): Promise<{ id: string; title: string } | null> => {
  const normalized = normalizeEbookTitle(title);
  if (!normalized) return null;
  const ebooks = await prisma.ebook.findMany({
    where: excludeId ? { id: { not: excludeId } } : undefined,
    select: { id: true, title: true },
  });
  return ebooks.find((ebook: { id: string; title: string }) => normalizeEbookTitle(ebook.title) === normalized) || null;
};
