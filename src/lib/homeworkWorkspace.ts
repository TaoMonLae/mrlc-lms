export type HomeworkStage =
  | "todo"
  | "overdue"
  | "today"
  | "upcoming"
  | "redo"
  | "submitted"
  | "marked"
  | "closed";

export function homeworkStage(
  item: {
    status: string;
    dueDate: string;
    mySubmission?: { status: string } | null;
  },
  today: string,
): HomeworkStage {
  if (item.mySubmission?.status === "MARKED") return "marked";
  if (item.mySubmission?.status === "SUBMITTED") return "submitted";
  if (item.status !== "OPEN") return "closed";
  if (item.mySubmission?.status === "REDO") return "redo";
  const due = item.dueDate.slice(0, 10);
  return due < today ? "overdue" : due === today ? "today" : "upcoming";
}

export function isHomeworkActionable(stage: HomeworkStage) {
  return ["overdue", "today", "upcoming", "redo"].includes(stage);
}

export function homeworkReviewDraft(
  saved?: { score?: number | null; feedback?: string | null } | null,
) {
  return {
    score: saved?.score != null ? String(saved.score) : "",
    feedback: saved?.feedback ?? "",
  };
}

export function homeworkDraftKey(
  userId: string,
  homeworkId: string,
  submittedAt?: string,
) {
  return `homework-draft:${encodeURIComponent(userId)}:${encodeURIComponent(homeworkId)}:${encodeURIComponent(submittedAt ?? "new")}`;
}

export function homeworkCsv(rows: unknown[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let cell = String(value ?? "");
            // Prevent spreadsheet programs interpreting user-provided content as formulas.
            if (/^[\s]*[=+@-]|^[\t\r\n]/.test(cell)) cell = "'" + cell;
            return '"' + cell.replace(/"/g, '""') + '"';
          })
          .join(","),
      )
      .join("\r\n")
  );
}
