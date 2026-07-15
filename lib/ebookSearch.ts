export interface SearchableEbook {
  title?: string | null;
  author?: string | null;
  description?: string | null;
  category?: string | null;
  seriesName?: string | null;
  language?: string | null;
  format?: string | null;
}

export const normalizeEbookSearchText = (value: unknown) => String(value ?? '')
  .normalize('NFKC')
  .toLocaleLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

export const ebookMatchesSearch = (book: SearchableEbook, query: string) => {
  const terms = normalizeEbookSearchText(query).split(' ').filter(Boolean);
  if (terms.length === 0) return true;

  const searchableText = normalizeEbookSearchText([
    book.title,
    book.author,
    book.description,
    book.category,
    book.seriesName,
    book.language,
    book.format,
  ].filter(Boolean).join(' '));

  return terms.every((term) => searchableText.includes(term));
};
