export type ClassworkKind = "HOMEWORK" | "EXAM" | "READING" | "ACTIVITY";
export type ClassworkSource = "HOMEWORK" | "EXAM" | "RESOURCE";
export interface ClassworkItem {
  id: string;
  sourceType: ClassworkSource;
  sourceId: string;
  kind: ClassworkKind;
  title: string;
  description: string | null;
  subject: string | null;
  dueDate: string | null;
  createdAt: string;
  href: string;
  status: string;
  topicId: string | null;
  pinned: boolean;
  actionable: boolean;
}
export interface ClassworkClass {
  id: string;
  name: string;
  level: string;
  academicYear: string;
}
export interface ClassworkPayload {
  class: ClassworkClass;
  canManage: boolean;
  topics: { id: string; title: string }[];
  items: ClassworkItem[];
}

export function classworkResourceTarget(raw: unknown): {
  type: "NEWS" | "EBOOK" | "COURSE" | "EXTERNAL";
  id?: string;
  url: string;
} | null {
  if (typeof raw !== "string") return null;
  const url = raw.trim();
  if (!url || url.length > 2000 || /[\s\\\u0000-\u001f]/.test(url)) return null;
  const news = url.match(/^\/news\/([a-zA-Z0-9_-]+)$/);
  if (news) return { type: "NEWS", id: news[1], url };
  const book = url.match(/^\/elibrary\/([a-zA-Z0-9_-]+)\/read$/);
  if (book) return { type: "EBOOK", id: book[1], url };
  const course = url.match(
    /^\/games\/language-quest\/courses\/([a-zA-Z0-9_-]+)$/,
  );
  if (course) return { type: "COURSE", id: course[1], url };
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" && !parsed.username && !parsed.password)
      return { type: "EXTERNAL", url: parsed.href };
  } catch {
    /* Only explicitly supported local reader paths are allowed. */
  }
  return null;
}

export function studentCanSeeClassworkExam(exam: {
  status: string;
  assignmentCount: number;
  assignedToStudent: boolean;
  completed: boolean;
}) {
  if (["DRAFT", "ARCHIVED"].includes(exam.status)) return false;
  if (exam.assignmentCount > 0 && !exam.assignedToStudent) return false;
  return (
    ["PUBLISHED", "ACTIVE", "SCHEDULED"].includes(exam.status) ||
    (exam.status === "CLOSED" && exam.completed)
  );
}

export function filterClasswork(
  items: ClassworkItem[],
  query: string,
  kind: string,
  topic: string,
) {
  const needle = query.trim().toLocaleLowerCase();
  return items.filter(
    (item) =>
      (!needle ||
        `${item.title} ${item.description ?? ""} ${item.subject ?? ""}`
          .toLocaleLowerCase()
          .includes(needle)) &&
      (kind === "ALL" || item.kind === kind) &&
      (topic === "all" ||
        (topic === "unfiled" ? !item.topicId : item.topicId === topic)),
  );
}

export function sortClasswork(
  items: ClassworkItem[],
  mode: "topic" | "deadline",
) {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (mode === "deadline")
      return (
        (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
        a.title.localeCompare(b.title)
      );
    return (
      b.createdAt.localeCompare(a.createdAt) || a.title.localeCompare(b.title)
    );
  });
}
