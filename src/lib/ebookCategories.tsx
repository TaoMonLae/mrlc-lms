export const EBOOK_CATEGORIES = [
  'Fiction',
  'Literature',
  'Children',
  'History',
  'Science',
  'Science Fiction',
  'Fantasy',
  'Biography',
  'Reference',
  'Education',
  'Language',
  'Religion',
  'Philosophy',
  'Poetry',
  'Drama',
  'Adventure',
  'Mystery',
  'Public Domain',
  'Math',
  'GED',
] as const;

export const EBOOK_CATEGORY_DATALIST_ID = 'ebook-category-options';

export function EbookCategoryOptions() {
  return (
    <datalist id={EBOOK_CATEGORY_DATALIST_ID}>
      {EBOOK_CATEGORIES.map((category) => (
        <option key={category} value={category} />
      ))}
    </datalist>
  );
}
