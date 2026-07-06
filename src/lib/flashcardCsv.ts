import Papa from 'papaparse';

export interface FlashcardCsvRow { term: string; definition: string }

/** Builds a two-column CSV (term, definition) from a deck's cards. */
export function cardsToCsv(cards: { term: string; definition: string }[]): string {
  return Papa.unparse({ fields: ['term', 'definition'], data: cards.map((c) => [c.term, c.definition]) });
}

/** Triggers a browser download of the given CSV text. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Parses a CSV/TSV file into term/definition rows. Accepts files with or
 * without a header row (Anki/Quizlet exports commonly have neither), and
 * without caring what the header is actually named -- it just uses the
 * first two columns of each data row.
 */
export function parseFlashcardCsvFile(file: File): Promise<FlashcardCsvRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data || []) as unknown as string[][];
        const looksLikeHeader = !!rows[0]?.some((c) => /term|definition|front|back|question|answer/i.test(String(c ?? '')));
        const dataRows = looksLikeHeader ? rows.slice(1) : rows;
        const cards = dataRows
          .map((r) => ({ term: (r[0] ?? '').toString().trim(), definition: (r[1] ?? '').toString().trim() }))
          .filter((c) => c.term && c.definition);
        resolve(cards);
      },
      error: (err) => reject(err),
    });
  });
}
