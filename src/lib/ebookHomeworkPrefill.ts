// Shared between EbookList.tsx and EbookReader.tsx — builds the Homework
// creation form's pre-fill payload for "Assign as Homework" on an E-Library
// book. Mirrors newsHomeworkPrefill.ts: the book itself isn't duplicated
// anywhere, HomeworkList's form just stores a link to it (the reader page)
// as the homework's attachmentUrl, the same trick used for linking a News
// article.
export function ebookHomeworkPrefill(ebook: { id: string; title: string; author?: string | null }) {
  return {
    title: `Read: ${ebook.title}`,
    instructions:
      `Read "${ebook.title}"${ebook.author ? ` by ${ebook.author}` : ''} in the E-Library, then be ready to discuss or write a short summary of what you read.`,
    attachmentUrl: `/elibrary/${ebook.id}/read`,
  };
}
