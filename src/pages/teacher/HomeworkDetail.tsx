import { useEffect, useState } from "react";
import { authHeaders } from "../../lib/api";
import { HomeworkFileLink } from "../../components/homework/HomeworkFileLink";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Lock,
  LockOpen,
  Newspaper,
  Paperclip,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiGet, apiSend } from "../../lib/api";
import { formatDateOnly, toLocalDateString } from "../../lib/dates";
import {
  formatHomeworkFileSize,
  isHomeworkImage,
  type HomeworkUploadedFile,
} from "../../lib/homeworkMedia";
import { homeworkCsv, homeworkReviewDraft } from "../../lib/homeworkWorkspace";
import {
  HOMEWORK_MAX_MARKS,
  parseHomeworkMaxMarks,
} from "../../../shared/homework";
import { HomeworkMasthead } from "../../components/homework/HomeworkWorkspace";

interface Submission {
  id: string;
  studentId: string;
  text?: string | null;
  attachmentUrl?: string | null;
  submittedAt: string;
  status: "SUBMITTED" | "MARKED" | "REDO";
  score?: number | null;
  feedback?: string | null;
  attachments?: HomeworkUploadedFile[];
}

interface Detail {
  id: string;
  title: string;
  instructions?: string | null;
  attachmentUrl?: string | null;
  dueDate: string;
  maxMarks: number | null;
  status: string;
  gradeItemId?: string | null;
  subject?: { id: string; name: string } | null;
  class: {
    id: string;
    name: string;
    students: {
      id: string;
      studentCode: string;
      user?: { firstName?: string; lastName?: string } | null;
    }[];
  };
  submissions: Submission[];
}

function filesForSubmission(
  submission: Submission | null,
): HomeworkUploadedFile[] {
  if (!submission) return [];
  const files = [...(submission.attachments ?? [])];
  if (
    submission.attachmentUrl &&
    !files.some((file) => file.url === submission.attachmentUrl)
  ) {
    files.unshift({
      url: submission.attachmentUrl,
      originalName:
        submission.attachmentUrl.split("/").pop() || "Submitted attachment",
      mimeType: "",
      size: 0,
    });
  }
  return files;
}

export default function HomeworkDetail() {
  const { id, studentId: routeStudentId } = useParams();
  const reviewing = Boolean(routeStudentId);
  const navigate = useNavigate();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [drafts, setDrafts] = useState<
    Record<string, { score: string; feedback: string }>
  >({});
  const [busy, setBusy] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState<
    "status" | "sync" | "delete" | null
  >(null);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState<
    "all" | "submitted" | "marked" | "redo" | "missing"
  >("all");
  const reviewStudentId = routeStudentId ?? null;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState("");
  useEffect(() => { setPreviewUrl(null); document.getElementById('main-content')?.scrollTo(0, 0); }, [routeStudentId]);
  const [editForm, setEditForm] = useState({
    title: "",
    subjectId: "",
    dueDate: "",
    maxMarks: "",
    instructions: "",
  });

  const load = () => {
    setLoading(true);
    setLoadError("");
    apiGet<Detail>(`/api/homework/${id}`)
      .then(setData)
      .catch((e: any) => {
        const message = e?.message || "Failed to load homework";
        setLoadError(message);
        setData(null);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [id]);
  useEffect(() => {
    apiGet<any[]>("/api/subjects")
      .then((d) =>
        setSubjects((d || []).map((s: any) => ({ id: s.id, name: s.name }))),
      )
      .catch((e: any) => toast.error(e?.message || "Failed to load subjects"));
  }, []);

  const startEdit = () => {
    if (!data) return;
    setEditForm({
      title: data.title,
      subjectId: data.subject?.id ?? "",
      dueDate: data.dueDate.slice(0, 10),
      maxMarks: data.maxMarks != null ? String(data.maxMarks) : "",
      instructions: data.instructions ?? "",
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!editForm.title.trim() || !editForm.dueDate) {
      toast.error("Title and due date are required");
      return;
    }
    if (parseHomeworkMaxMarks(editForm.maxMarks) === undefined) {
      toast.error(
        `Max marks must be greater than 0 and no more than ${HOMEWORK_MAX_MARKS.toLocaleString()}`,
      );
      return;
    }
    if (data?.gradeItemId && editForm.maxMarks === "") {
      toast.error("Max marks cannot be removed after syncing to the gradebook");
      return;
    }
    setSaving(true);
    try {
      await apiSend(`/api/homework/${id}`, "PUT", {
        title: editForm.title,
        subjectId: editForm.subjectId || null,
        dueDate: editForm.dueDate,
        maxMarks: editForm.maxMarks === "" ? null : editForm.maxMarks,
        instructions: editForm.instructions || null,
      });
      toast.success("Homework updated");
      setEditing(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to update homework");
    } finally {
      setSaving(false);
    }
  };

  const subFor = (studentId: string) =>
    data?.submissions.find((s) => s.studentId === studentId) ?? null;

  const openReview = (studentId: string) => {
    if (reviewStudentId && drafts[reviewStudentId] && !confirm("Leave without saving your feedback changes?")) return;
    navigate(`/teacher/homework/${id}/review/${studentId}`);
  };

  const mark = async (
    studentId: string,
    status: "MARKED" | "REDO",
    advance = false,
  ) => {
    const d = drafts[studentId] ?? homeworkReviewDraft(subFor(studentId));
    const nextStudent = data?.class.students.find(
      (student) =>
        student.id !== studentId && subFor(student.id)?.status === "SUBMITTED",
    );
    if (status === "REDO" && !d.feedback.trim()) {
      toast.error("Add feedback explaining what the student should change");
      return;
    }
    if (status === "MARKED" && d.score !== "") {
      const score = Number(d.score);
      if (!Number.isFinite(score) || score < 0) {
        toast.error("Enter a valid score of 0 or more");
        return;
      }
      if (data?.maxMarks != null && score > data.maxMarks) {
        toast.error(`Score cannot exceed ${data.maxMarks}`);
        return;
      }
    }
    setBusy(studentId);
    try {
      await apiSend(`/api/homework/${id}/mark`, "POST", {
        studentId,
        status,
        score: status === "MARKED" && d.score !== "" ? Number(d.score) : null,
        feedback: d.feedback || null,
      });
      toast.success(status === "MARKED" ? "Marked" : "Sent back for redo");
      setDrafts((current) => {
        const next = { ...current };
        delete next[studentId];
        return next;
      });
      if (advance) {
        if (nextStudent) navigate(`/teacher/homework/${id}/review/${nextStudent.id}`);
        else {
          navigate(`/teacher/homework/${id}`);
          toast.success("Review queue complete");
        }
      }
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to mark");
    } finally {
      setBusy(null);
    }
  };

  const toggleClosed = async () => {
    if (!data) return;
    setActionBusy("status");
    try {
      await apiSend(`/api/homework/${id}`, "PUT", {
        status: data.status === "CLOSED" ? "OPEN" : "CLOSED",
      });
      toast.success(
        data.status === "CLOSED"
          ? "Reopened for submissions"
          : "Closed to new submissions",
      );
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setActionBusy(null);
    }
  };

  const syncGradebook = async () => {
    setActionBusy("sync");
    try {
      const r = await apiSend<{ count: number }>(
        `/api/homework/${id}/sync-gradebook`,
        "POST",
      );
      toast.success(`${r.count} score(s) synced to the gradebook`);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to sync");
    } finally {
      setActionBusy(null);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this homework and all its submissions?")) return;
    setActionBusy("delete");
    try {
      await apiSend(`/api/homework/${id}`, "DELETE");
      toast.success("Homework deleted");
      navigate("/teacher/homework");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
      setActionBusy(null);
    }
  };

  const selectedSubmission = data?.submissions.find(sub => sub.studentId === routeStudentId) ?? null;
  const selectedFiles = filesForSubmission(selectedSubmission);
  const selectedFile = selectedFiles.find(file => file.url === previewUrl) ?? selectedFiles[0];
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setPreviewBlob(null); setPreviewError("");
    if (selectedFile) {
      fetch(selectedFile.url, { headers: authHeaders(), signal: controller.signal }).then(async response => {
        if (!response.ok) throw new Error('Could not load this document. Try downloading it instead.');
        return response.blob();
      }).then(blob => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob); setPreviewBlob(objectUrl);
      }).catch(error => { if (!controller.signal.aborted) setPreviewError(error.message); });
    }
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [selectedFile?.url]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (reviewStudentId && drafts[reviewStudentId]) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [drafts, reviewStudentId]);

  if (loading)
    return <p role="status" className="py-14 text-center text-sm text-muted-foreground">Loading homework…</p>;
  if (!data)
    return (
      <div className="py-14 text-center text-sm text-muted-foreground">
        <p role="alert">{loadError || "Homework not found."}</p>
        <Link to="/teacher/homework" className="mt-3 inline-block underline">Back to Homework</Link>
        {loadError && (
          <Button variant="outline" size="sm" className="mt-3" onClick={load}>
            Try again
          </Button>
        )}
      </div>
    );

  const scoredCount = data.submissions.filter(
    (s) => s.status === "MARKED" && s.score != null,
  ).length;
  const submittedCount = data.submissions.filter(
    (s) => s.status === "SUBMITTED",
  ).length;
  const markedCount = data.submissions.filter(
    (s) => s.status === "MARKED",
  ).length;
  const redoCount = data.submissions.filter((s) => s.status === "REDO").length;
  const filteredStudents = data.class.students.filter((student) => {
    const submission = subFor(student.id);
    const name =
      `${student.user?.firstName ?? ""} ${student.user?.lastName ?? ""} ${student.studentCode}`.toLowerCase();
    if (
      studentQuery.trim() &&
      !name.includes(studentQuery.trim().toLowerCase())
    )
      return false;
    if (studentFilter === "missing") return !submission;
    if (studentFilter !== "all")
      return submission?.status.toLowerCase() === studentFilter;
    return true;
  });
  const reviewStudents = data.class.students;
  const reviewIndex = reviewStudents.findIndex(
    (student) => student.id === reviewStudentId,
  );
  const reviewStudent = reviewIndex >= 0 ? reviewStudents[reviewIndex] : null;
  const reviewSubmission = reviewStudent ? subFor(reviewStudent.id) : null;
  const reviewFiles = filesForSubmission(reviewSubmission);
  const reviewFile =
    reviewFiles.find((file) => file.url === previewUrl) ??
    reviewFiles[0] ??
    null;
  const reviewDraft = reviewStudent
    ? (drafts[reviewStudent.id] ?? {
        score:
          reviewSubmission?.score != null ? String(reviewSubmission.score) : "",
        feedback: reviewSubmission?.feedback ?? "",
      })
    : { score: "", feedback: "" };

  const moveReview = (direction: -1 | 1) => {
    if (!reviewStudents.length) return;
    const nextIndex =
      reviewIndex < 0
        ? 0
        : (reviewIndex + direction + reviewStudents.length) %
          reviewStudents.length;
    openReview(reviewStudents[nextIndex].id);
  };

  return (
    <div className="hw-workspace hw-detail">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 mb-2 text-muted-foreground"
          role="link"
          render={<Link to={reviewing ? `/teacher/homework/${id}` : "/teacher/homework"} onClick={event => { if (reviewStudentId && drafts[reviewStudentId] && !confirm('Leave without saving feedback changes?')) event.preventDefault(); }} />}
          nativeButton={false}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> {reviewing ? "Back to assignment" : "All Homework"}
        </Button>
        {editing ? (
          <div className="space-y-4 rounded-sm border border-border bg-card p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-homework-title">Title *</Label>
                <Input
                  id="edit-homework-title"
                  maxLength={200}
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-homework-subject">Subject</Label>
                <Select
                  value={editForm.subjectId || "none"}
                  onValueChange={(v) =>
                    setEditForm({
                      ...editForm,
                      subjectId: v === "none" ? "" : v,
                    })
                  }
                >
                  <SelectTrigger id="edit-homework-subject" className="w-full">
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No subject</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-homework-due">Due date *</Label>
                <Input
                  id="edit-homework-due"
                  type="date"
                  value={editForm.dueDate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, dueDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-homework-marks">
                  Max marks{" "}
                  <span className="text-xs text-muted-foreground">
                    (leave blank for check-off only)
                  </span>
                </Label>
                <Input
                  id="edit-homework-marks"
                  type="number"
                  min="1"
                  max={HOMEWORK_MAX_MARKS}
                  step="any"
                  value={editForm.maxMarks}
                  onChange={(e) =>
                    setEditForm({ ...editForm, maxMarks: e.target.value })
                  }
                  placeholder="e.g. 20"
                />
                {data.gradeItemId && (
                  <p className="text-xs text-muted-foreground">
                    Required because this homework is linked to the gradebook.
                  </p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-homework-instructions">Instructions</Label>
                <Textarea
                  id="edit-homework-instructions"
                  rows={3}
                  maxLength={20000}
                  value={editForm.instructions}
                  onChange={(e) =>
                    setEditForm({ ...editForm, instructions: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button size="sm" onClick={saveEdit} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <HomeworkMasthead
                audience={reviewing ? "Submission review" : "Assignment overview"}
                title={data.title}
                description={
                  data.status === "CLOSED"
                    ? "Closed to new submissions. You can still review and return feedback."
                    : "Review submitted work and return private feedback to your students."
                }
              />
              <p className="mt-1 text-sm text-muted-foreground">
                {data.class.name}
                {data.subject ? ` · ${data.subject.name}` : ""} · due{" "}
                {formatDateOnly(data.dueDate)}
                {data.maxMarks != null
                  ? ` · out of ${data.maxMarks}`
                  : " · check-off (no marks)"}
              </p>
              {!reviewing && data.instructions && (
                <details className="hw-brief"><summary>Assignment instructions</summary><p>{data.instructions}</p></details>
              )}
              {data.attachmentUrl && (
                <HomeworkFileLink
                  href={data.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-aubergine-600 underline"
                >
                  {data.attachmentUrl.startsWith("/news/") ? (
                    <>
                      <Newspaper className="h-3.5 w-3.5" /> Linked News article
                    </>
                  ) : data.attachmentUrl.startsWith("/elibrary/") ? (
                    <>
                      <BookOpen className="h-3.5 w-3.5" /> Linked E-Book
                    </>
                  ) : (
                    <>
                      <Paperclip className="h-3.5 w-3.5" /> Worksheet attachment
                    </>
                  )}
                </HomeworkFileLink>
              )}
            </div>
            {!reviewing && <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={startEdit}
                disabled={actionBusy !== null}
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleClosed}
                disabled={actionBusy !== null}
              >
                {data.status === "CLOSED" ? (
                  <>
                    <LockOpen className="mr-2 h-4 w-4" /> Reopen
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" /> Close
                  </>
                )}
              </Button>
              {data.maxMarks != null && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncGradebook}
                  disabled={
                    (scoredCount === 0 && !data.gradeItemId) ||
                    actionBusy !== null
                  }
                  title={
                    scoredCount === 0 && !data.gradeItemId
                      ? "Mark some submissions with scores first"
                      : undefined
                  }
                >
                  <ClipboardList className="mr-2 h-4 w-4" />{" "}
                  {actionBusy === "sync"
                    ? "Syncing…"
                    : `Sync to Gradebook${data.gradeItemId ? " ✓" : ""}`}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-rose-600"
                onClick={remove}
                disabled={actionBusy !== null}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </div>}
          </div>
        )}
      </div>

      {!reviewing && <>
      <nav className="hw-status-strip" aria-label="Filter submissions">
        {([
          ["all", "All students", data.class.students.length],
          ["submitted", "Needs review", submittedCount],
          ["marked", "Marked", markedCount],
          ["redo", "Changes requested", redoCount],
          ["missing", "Missing", data.class.students.filter(student => !subFor(student.id)).length],
        ] as const).map(([key, label, count]) => (
          <button key={key} type="button" aria-pressed={studentFilter === key} onClick={() => setStudentFilter(key)}>
            <span>{label}</span><strong>{count}</strong>
          </button>
        ))}
      </nav>
      <div className="hw-toolbar">
        <Button
          className="hw-primary"
          disabled={busy !== null || !submittedCount}
          onClick={() => {
            const next = data.class.students.find(
              (student) => subFor(student.id)?.status === "SUBMITTED",
            );
            if (next) openReview(next.id);
          }}
        >
          Start review queue →
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const csv = homeworkCsv([
              [
                "Student code",
                "Student",
                "Status",
                "Score",
                "Max marks",
                "Feedback",
                "Submitted at",
              ],
              ...data.class.students.map((student) => {
                const sub = subFor(student.id);
                return [
                  student.studentCode,
                  `${student.user?.firstName ?? ""} ${student.user?.lastName ?? ""}`.trim(),
                  sub?.status ?? "MISSING",
                  sub?.score,
                  data.maxMarks,
                  sub?.feedback,
                  sub?.submittedAt,
                ];
              }),
            ]);
            const url = URL.createObjectURL(
              new Blob([csv], { type: "text/csv;charset=utf-8" }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = `homework-${data.id}-marking.csv`;
            a.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          <Download className="mr-2 h-4 w-4" /> Export marking sheet
        </Button>
        <span className="text-xs text-muted-foreground">
          Exports saved grades for the full class.
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          aria-label="Search students"
          className="flex-1"
          value={studentQuery}
          onChange={(e) => setStudentQuery(e.target.value)}
          placeholder="Search student name or code"
        />
        <p className="hw-roster-count" role="status">{filteredStudents.length} of {data.class.students.length} students</p>
      </div>

      </>}
      {reviewing && !reviewStudent && <section className="hw-review p-8"><h2>Student not found</h2><p className="hw-description">This student is not in the assignment roster.</p><Link to={`/teacher/homework/${id}`}>Back to assignment</Link></section>}
      {reviewing && reviewStudent && (
        <section className="hw-review">
          <div className="flex flex-col gap-3 border-b border-border bg-muted/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">
                  Review:{" "}
                  {`${reviewStudent.user?.firstName ?? ""} ${reviewStudent.user?.lastName ?? ""}`.trim() ||
                    reviewStudent.studentCode}
                </h2>
                {reviewSubmission?.status === "SUBMITTED" && (
                  <Badge variant="secondary">Needs review</Badge>
                )}
                {reviewSubmission?.status === "MARKED" && (
                  <Badge className="bg-emerald-500 text-white">Marked</Badge>
                )}
                {reviewSubmission?.status === "REDO" && (
                  <Badge className="bg-amber-500 text-white">
                    Changes requested
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {reviewStudent.studentCode} · {reviewSubmission ? `Submitted ${new Date(reviewSubmission.submittedAt).toLocaleString()}` : "No online submission · record paper work here"} ·{" "}
                {reviewFiles.length}{" "}
                {reviewFiles.length === 1 ? "document" : "documents"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => moveReview(-1)}
                disabled={reviewStudents.length < 2}
                aria-label="Previous submission"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-1 text-xs text-muted-foreground">
                {reviewIndex + 1}/{reviewStudents.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => moveReview(1)}
                disabled={reviewStudents.length < 2}
                aria-label="Next submission"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="ml-2 h-8 w-8 p-0"
                onClick={() => {
                  if (!drafts[reviewStudent.id] || confirm('Leave without saving feedback changes?')) navigate(`/teacher/homework/${id}`);
                }}
                aria-label="Close review"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="hw-review-layout">
            <div className="space-y-4 p-5 lg:border-r lg:border-border">
              {reviewSubmission?.text && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Student answer
                  </p>
                  <p className="whitespace-pre-wrap break-words rounded-lg bg-muted/50 p-3 text-sm text-foreground">
                    {reviewSubmission?.text}
                  </p>
                </div>
              )}

              {reviewFiles.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Submitted documents
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {reviewFiles.map((file) => (
                      <button
                        key={file.url}
                        type="button"
                        onClick={() => setPreviewUrl(file.url)}
                        className={`flex max-w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                          reviewFile?.url === file.url
                            ? "border-aubergine-500 bg-aubergine-50 text-aubergine-800 dark:bg-aubergine-950/30 dark:text-aubergine-200"
                            : "border-border text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="min-w-0">
                          <span className="block max-w-52 truncate font-medium">
                            {file.originalName}
                          </span>
                          {file.size > 0 && (
                            <span className="text-[11px] opacity-70">
                              {formatHomeworkFileSize(file.size)}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>

                  {reviewFile && (
                    <div className="overflow-hidden rounded-sm border border-border bg-muted">
                      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-3 py-2">
                        <p className="min-w-0 truncate text-xs font-medium text-foreground">
                          {reviewFile.originalName}
                        </p>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            render={
                              <a
                                href={previewBlob || undefined}
                                target="_blank"
                                rel="noreferrer"
                              />
                            }
                            nativeButton={false}
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" /> Open
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            render={
                              <HomeworkFileLink
                                href={reviewFile.url}
                                download={reviewFile.originalName}
                              />
                            }
                            nativeButton={false}
                          >
                            <Download className="mr-1 h-3.5 w-3.5" /> Download
                          </Button>
                        </div>
                      </div>
                      {previewError ? <p role="alert" className="p-6 text-sm text-rose-600">{previewError}</p> : !previewBlob ? <p role="status" className="p-6 text-sm">Loading document…</p> : isHomeworkImage(reviewFile) ? (
                        <div className="flex min-h-64 items-center justify-center p-3">
                          <img
                            src={previewBlob}
                            alt={reviewFile.originalName}
                            className="max-h-[560px] max-w-full rounded object-contain"
                          />
                        </div>
                      ) : reviewFile.mimeType === "application/pdf" ||
                        /\.pdf$/i.test(reviewFile.url) ? (
                        <iframe
                          src={previewBlob}
                          title={reviewFile.originalName}
                          className="h-[520px] w-full bg-white"
                        />
                      ) : (
                        <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center">
                          <FileText className="h-12 w-12 text-muted-foreground" />
                          <p className="max-w-sm text-sm text-muted-foreground">
                            This document opens in its compatible viewer. Use
                            Open to inspect it or Download to save a copy.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : !reviewSubmission?.text ? (
                <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  {reviewSubmission ? "This submission was recorded as handed in on paper." : "No online submission yet. If this student handed in work on paper, enter a score or feedback and mark it reviewed."}
                </p>
              ) : null}
            </div>

            <div className="hw-feedback-panel space-y-4 p-5">
              <div>
                <h3 className="font-bold text-foreground">
                  Teacher feedback
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Give clear next steps. Feedback is required when requesting
                  changes.
                </p>
              </div>
              {data.maxMarks != null && (
                <div className="space-y-2">
                  <Label htmlFor="review-score">
                    Score out of {data.maxMarks}
                  </Label>
                  <Input
                    id="review-score"
                    disabled={busy !== null}
                    type="number"
                    min="0"
                    max={data.maxMarks}
                    step="any"
                    value={reviewDraft.score}
                    placeholder="Optional"
                    onChange={(e) =>
                      setDrafts((current) => ({
                        ...current,
                        [reviewStudent.id]: {
                          ...reviewDraft,
                          score: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="review-feedback">Feedback</Label>
                <div
                  className="flex flex-wrap gap-2"
                  aria-label="Feedback starters"
                >
                  {[
                    "Clear explanation.",
                    "Please show your working.",
                    "Support your answer with an example.",
                  ].map((snippet) => (
                    <button
                      key={snippet}
                      className="rounded-full border border-input px-3 py-1.5 text-left text-xs"
                      disabled={busy !== null}
                      onClick={() =>
                        setDrafts((current) => ({
                          ...current,
                          [reviewStudent.id]: {
                            ...reviewDraft,
                            feedback: [reviewDraft.feedback, snippet]
                              .filter(Boolean)
                              .join("\n")
                              .slice(0, 5000),
                          },
                        }))
                      }
                    >
                      {snippet}
                    </button>
                  ))}
                </div>
                <Textarea
                  id="review-feedback"
                  disabled={busy !== null}
                  rows={8}
                  maxLength={5000}
                  value={reviewDraft.feedback}
                  placeholder="What was done well? What should the student improve?"
                  onChange={(e) =>
                    setDrafts((current) => ({
                      ...current,
                      [reviewStudent.id]: {
                        ...reviewDraft,
                        feedback: e.target.value,
                      },
                    }))
                  }
                />
                <p className="text-right text-[11px] text-muted-foreground">
                  {reviewDraft.feedback.length}/5000
                </p>
              </div>
              <div className="grid gap-2">
                <Button
                  className="hw-primary"
                  onClick={() => mark(reviewStudent.id, "MARKED", true)}
                  disabled={busy !== null}
                >
                  Mark &amp; next pending{" "}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => mark(reviewStudent.id, "MARKED")}
                  disabled={busy !== null}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />{" "}
                  {busy === reviewStudent.id ? "Saving…" : "Mark reviewed"}
                </Button>
                <Button
                  variant="outline"
                  className="text-amber-700 dark:text-amber-300"
                  onClick={() => mark(reviewStudent.id, "REDO")}
                  disabled={busy !== null || !reviewSubmission}
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Request changes
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {!reviewing && <section className="hw-roster" aria-label="Student submissions">
        <div className="hw-roster-heading" aria-hidden="true"><span>Student</span><span>Submission</span><span>Score</span><span>Review</span></div>
        {filteredStudents.map(st => {
          const sub = subFor(st.id);
          const files = filesForSubmission(sub);
          const name = `${st.user?.firstName ?? ""} ${st.user?.lastName ?? ""}`.trim() || st.studentCode;
          const late = sub && toLocalDateString(new Date(sub.submittedAt)) > data.dueDate.slice(0, 10);
          const status = sub?.status ?? "MISSING";
          return <article className="hw-roster-row" key={st.id}>
            <div className="hw-roster-identity">
              <span className="hw-initials" aria-hidden="true">{name.split(/\s+/).map(part => part[0]).slice(0, 2).join('')}</span>
              <div><h2>{name}</h2><span className="hw-student-code">{st.studentCode}</span></div>
            </div>
            <div className="hw-roster-submission">
              <span className="hw-status" data-status={status}>{status === "SUBMITTED" ? "Needs review" : status === "MARKED" ? "Marked" : status === "REDO" ? "Changes requested" : "Missing"}{late && status === "SUBMITTED" ? " · late" : ""}</span>
              <p className="hw-submission-excerpt">{sub?.text || (files.length ? `${files.length} attached document${files.length === 1 ? '' : 's'}` : sub ? "Handed in on paper" : "No online submission")}</p>
              {sub && <small>{formatDateOnly(sub.submittedAt)}{files.length > 0 && sub.text ? ` · ${files.length} attachment${files.length === 1 ? '' : 's'}` : ''}</small>}
            </div>
            <div className="hw-roster-score"><span className="hw-mobile-label">Score </span>{sub?.score != null ? <><strong>{sub.score}</strong><span> / {data.maxMarks ?? '—'}</span></> : <span>{data.maxMarks == null ? 'Check-off' : 'Not scored'}</span>}</div>
            <Button size="sm" variant="outline" className="hw-roster-action" render={<Link to={`/teacher/homework/${id}/review/${st.id}`} />} role="link" nativeButton={false}>
              {sub ? <><Eye className="mr-1 h-3.5 w-3.5" /> Review</> : <><Pencil className="mr-1 h-3.5 w-3.5" /> Record paper work</>}
            </Button>
          </article>;
        })}
        {!filteredStudents.length && <div className="hw-roster-empty"><p>{data.class.students.length ? "No students match these filters." : "No students in this class."}</p>{data.class.students.length > 0 && <Button variant="ghost" onClick={() => { setStudentQuery(''); setStudentFilter('all'); }}>Clear filters</Button>}</div>}
      </section>}
    </div>
  );
}
