// Shared between NewsFeed.tsx and ArticleReader.tsx — builds the Homework
// creation form's pre-fill payload for "Assign as Homework" on a News
// article. Not restricted to any subject; RLA/Social Studies are just the
// natural fit for a reading-response assignment, not an enforced rule.
export function homeworkPrefillFor(article: { id: string; title: string }) {
  return {
    title: `Read & Respond: ${article.title}`,
    instructions:
      'Read the linked article, then write a short response (150-200 words) covering: what is the main idea, one thing you learned, and any questions or opinions you have about it.',
    attachmentUrl: `/news/${article.id}`,
  };
}
