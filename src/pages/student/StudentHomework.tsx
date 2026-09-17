import { useEffect, useRef, useState } from "react";
import { HomeworkFileLink } from "../../components/homework/HomeworkFileLink";
import AnimatedContent from "../../components/react-bits/AnimatedContent";
import { Link, useSearchParams } from "react-router";
import {
  BookOpen,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Newspaper,
  Paperclip,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "../../providers/AuthProvider";
import {
  HomeworkFocus,
  HomeworkMasthead,
} from "../../components/homework/HomeworkWorkspace";
import {
  homeworkDraftKey,
  homeworkStage,
  isHomeworkActionable,
  type HomeworkStage,
} from "../../lib/homeworkWorkspace";
import { apiGet, apiSend } from "../../lib/api";
import { formatDateOnly, localToday } from "../../lib/dates";
import {
  HOMEWORK_FILE_ACCEPT,
  HOMEWORK_SUBMISSION_FILE_LIMIT,
  formatHomeworkFileSize,
  removeUnusedHomeworkMedia,
  uploadHomeworkFile,
  validateHomeworkFile,
  type HomeworkUploadedFile,
} from "../../lib/homeworkMedia";

type SubmissionFile = HomeworkUploadedFile & { legacy?: boolean };

interface MySubmission {
  id: string;
  text?: string | null;
  attachmentUrl?: string | null;
  submittedAt: string;
  status: "SUBMITTED" | "MARKED" | "REDO";
  score?: number | null;
  feedback?: string | null;
  attachments?: HomeworkUploadedFile[];
}

interface HomeworkItem {
  id: string;
  title: string;
  instructions?: string | null;
  attachmentUrl?: string | null;
  subjectName?: string | null;
  teacherName?: string | null;
  dueDate: string;
  maxMarks: number | null;
  status: string;
  mySubmission: MySubmission | null;
}

export default function StudentHomework() {
  const [searchParams, setSearchParams] = useSearchParams();
  const focusedAssignment = searchParams.get("assignment");
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("all");
  const [view, setView] = useState<HomeworkStage | "all">(
    focusedAssignment ? "all" : "todo",
  );
  const [draftSaved, setDraftSaved] = useState(false);
  const [items, setItems] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<SubmissionFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragging, setDragging] = useState(false);
  const uploadLock = useRef(false);
  const submitLock = useRef(false);
  const mounted = useRef(true);
  const stagedUploads = useRef<string[]>([]);

  const load = () => {
    setLoading(true);
    setLoadError("");
    apiGet<HomeworkItem[]>("/api/student/homework")
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch((e: any) => {
        const message = e?.message || "Failed to load homework";
        setItems([]);
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
      if (!submitLock.current) for (const url of stagedUploads.current) void removeUnusedHomeworkMedia(url).catch(() => {});
    };
  }, []);

  const filesForSubmission = (
    submission: MySubmission | null,
  ): SubmissionFile[] => {
    if (!submission) return [];
    const files: SubmissionFile[] = [...(submission.attachments ?? [])];
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
        legacy: true,
      });
    }
    return files;
  };

  const startSubmit = (item: HomeworkItem) => {
    if (uploading || submitting) return;
    for (const url of stagedUploads.current) {
      void removeUnusedHomeworkMedia(url).catch(() => {});
    }
    stagedUploads.current = [];
    setOpenId(item.id);
    setUploadError("");
    let recovered: string | null = null;
    try {
      if (user)
        recovered = sessionStorage.getItem(
          homeworkDraftKey(user.id, item.id, item.mySubmission?.submittedAt),
        );
    } catch {
      /* Private browsing may disable storage. */
    }
    setText(recovered ?? item.mySubmission?.text ?? "");
    setDraftSaved(recovered !== null);
    setAttachments(filesForSubmission(item.mySubmission));
  };

  const upload = async (files: File[]) => {
    if (uploadLock.current || submitting || !openId || !files.length) return;
    setUploadError("");
    if (attachments.length + files.length > HOMEWORK_SUBMISSION_FILE_LIMIT) {
      setUploadError(`Attach up to ${HOMEWORK_SUBMISSION_FILE_LIMIT} files. Remove a file before adding more.`);
      return;
    }
    const invalid = files.map(file => { const error = validateHomeworkFile(file); return error ? `${file.name}: ${error}` : null; }).find(Boolean);
    if (invalid) { setUploadError(invalid); return; }
    uploadLock.current = true;
    setUploading(true);
    let uploadedCount = 0;
    try {
      for (const file of files) {
        const result = await uploadHomeworkFile(file);
        if (!mounted.current) { await removeUnusedHomeworkMedia(result.url).catch(() => {}); break; }
        stagedUploads.current.push(result.url);
        setAttachments((current) => [...current, result]);
        uploadedCount += 1;
      }
      toast.success(
        `${uploadedCount} ${uploadedCount === 1 ? "file" : "files"} attached`,
      );
    } catch (e: any) {
      if (uploadedCount > 0)
        toast.info(
          `${uploadedCount} file${uploadedCount === 1 ? "" : "s"} attached before the upload stopped`,
        );
      toast.error(e.message || "Upload failed");
      if (mounted.current) setUploadError(e.message || "Upload failed. Your attached files have been kept; try again.");
    } finally {
      uploadLock.current = false;
      if (mounted.current) setUploading(false);
    }
  };

  const removeAttachment = async (file: SubmissionFile) => {
    setAttachments((current) =>
      current.filter((item) => item.url !== file.url),
    );
    if (stagedUploads.current.includes(file.url)) {
      stagedUploads.current = stagedUploads.current.filter(
        (url) => url !== file.url,
      );
      await removeUnusedHomeworkMedia(file.url).catch(() => {});
    }
  };

  const cancelSubmit = () => {
    if (uploading || submitting) return;
    for (const url of stagedUploads.current) {
      void removeUnusedHomeworkMedia(url).catch(() => {});
    }
    stagedUploads.current = [];
    setAttachments([]);
    setUploadError("");
    setOpenId(null);
    setText("");
  };

  const submit = async (id: string) => {
    if (submitLock.current || uploadLock.current) return;
    if (!text.trim() && attachments.length === 0) {
      toast.error("Write something or attach your work");
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    try {
      await apiSend(`/api/homework/${id}/submit`, "POST", {
        text: text.trim() || null,
        attachmentUrl: attachments[0]?.url ?? null,
        attachments: attachments.filter((file) => !file.legacy),
      });
      stagedUploads.current = [];
      const item = items.find((item) => item.id === id);
      try {
        if (user)
          sessionStorage.removeItem(
            homeworkDraftKey(user.id, id, item?.mySubmission?.submittedAt),
          );
      } catch {
        /* Submission still succeeded. */
      }
      toast.success("Homework submitted!");
      setOpenId(null);
      setAttachments([]);
      load();
    } catch (e: any) {
      if (!mounted.current) for (const url of stagedUploads.current) void removeUnusedHomeworkMedia(url).catch(() => {});
      toast.error(e.message || "Failed to submit");
    } finally {
      submitLock.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  const stateBadge = (item: HomeworkItem) => {
    const s = item.mySubmission;
    // Compare calendar dates, not instants — otherwise a homework due
    // "today" shows as overdue starting at UTC midnight, which is still
    // mid-afternoon the day before in Myanmar (UTC+6:30).
    const overdue = item.dueDate.slice(0, 10) < localToday();
    if (s?.status === "MARKED")
      return (
        <Badge className="bg-emerald-500 text-white">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Marked
          {s.score != null && item.maxMarks != null
            ? ` ${s.score}/${item.maxMarks}`
            : ""}
        </Badge>
      );
    if (s?.status === "SUBMITTED")
      return <Badge variant="secondary">Submitted</Badge>;
    if (item.status === "CLOSED")
      return <Badge variant="outline">Closed</Badge>;
    if (s?.status === "REDO")
      return (
        <Badge className="bg-amber-500 text-white">
          <RotateCcw className="mr-1 h-3 w-3" /> Redo requested
        </Badge>
      );
    if (overdue)
      return <Badge className="bg-rose-500 text-white">Overdue</Badge>;
    return <Badge variant="outline">To do</Badge>;
  };

  const today = localToday();
  const pending = items.filter((i) =>
    isHomeworkActionable(homeworkStage(i, today)),
  );
  const tabs: { key: HomeworkStage | "all"; label: string }[] = [
    { key: "todo", label: "To do" },
    { key: "today", label: "Due today" },
    { key: "overdue", label: "Overdue" },
    { key: "redo", label: "Changes requested" },
    { key: "submitted", label: "Submitted" },
    { key: "marked", label: "Marked" },
    { key: "all", label: "All work" },
  ];
  const matchesView = (item: HomeworkItem, selected: typeof view) =>
    selected === "all" ||
    (selected === "todo"
      ? isHomeworkActionable(homeworkStage(item, today))
      : homeworkStage(item, today) === selected);
  const visible = items
    .filter((item) => !focusedAssignment || item.id === focusedAssignment)
    .filter(
      (item) =>
        (focusedAssignment || matchesView(item, view)) &&
        (subject === "all" || item.subjectName === subject) &&
        `${item.title} ${item.subjectName ?? ""} ${item.teacherName ?? ""}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const nextDue = [...pending].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate),
  )[0];

  const renderCard = (item: HomeworkItem) => {
    const canSubmit =
      item.status === "OPEN" && item.mySubmission?.status !== "MARKED";
    const isOpen = openId === item.id;
    return (
      <article key={item.id} className="hw-student-card">
        <p className="hw-eyebrow mb-3">
          {item.subjectName || "Independent learning"} / Due{" "}
          {formatDateOnly(item.dueDate)}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-white">
                {item.title}
              </h3>
              {stateBadge(item)}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
              {item.subjectName && <span>{item.subjectName}</span>}
              {item.teacherName && <span>· {item.teacherName}</span>}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> due {formatDateOnly(item.dueDate)}
              </span>
              {item.maxMarks != null && <span>· out of {item.maxMarks}</span>}
            </p>
            {item.instructions && (
              <details open={focusedAssignment === item.id ? true : undefined}>
                <summary>Assignment brief</summary>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                  {item.instructions}
                </p>
              </details>
            )}
            {item.attachmentUrl && (
              <HomeworkFileLink
                href={item.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-aubergine-600 underline"
              >
                {item.attachmentUrl.startsWith("/news/") ? (
                  <>
                    <Newspaper className="h-3 w-3" /> Read the article
                  </>
                ) : item.attachmentUrl.startsWith("/elibrary/") ? (
                  <>
                    <BookOpen className="h-3 w-3" /> Read the book
                  </>
                ) : (
                  <>
                    <Paperclip className="h-3 w-3" /> Worksheet
                  </>
                )}
              </HomeworkFileLink>
            )}
            {item.mySubmission?.feedback && (
              <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600 dark:bg-surface-raised dark:text-slate-300">
                <span className="font-semibold">Teacher feedback:</span>{" "}
                {item.mySubmission.feedback}
              </p>
            )}
            {!isOpen && filesForSubmission(item.mySubmission).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {filesForSubmission(item.mySubmission).map((file) => (
                  <HomeworkFileLink
                    key={file.url}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-aubergine-700 hover:underline dark:bg-surface-raised dark:text-aubergine-300"
                  >
                    <Paperclip className="h-3 w-3 shrink-0" />
                    <span className="truncate">{file.originalName}</span>
                  </HomeworkFileLink>
                ))}
              </div>
            )}
            {item.mySubmission && (
              <p className="mt-2 text-[11px] text-slate-400">
                Submitted{" "}
                {new Date(item.mySubmission.submittedAt).toLocaleString()}
              </p>
            )}
          </div>
          {canSubmit && !isOpen && (
            <Button
              className="hw-primary"
              size="sm"
              onClick={() => startSubmit(item)}
              disabled={submitting || uploading || openId !== null}
            >
              <Send className="mr-2 h-3.5 w-3.5" />{" "}
              {item.mySubmission ? "Edit submission" : "Open workspace"}
            </Button>
          )}
        </div>

        {isOpen && (
          <AnimatedContent className="hw-answer mt-5 space-y-3">
            <div className="flex flex-wrap justify-between gap-2">
              <h4 className="font-semibold">Your submission</h4>
              <span className="text-xs text-slate-500">
                {text.trim() ? text.trim().split(/\s+/).length : 0} words ·{" "}
                {text.length}/20,000
              </span>
            </div>
            <Textarea
              aria-label="Your answer"
              rows={6}
              disabled={submitting}
              maxLength={20000}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                try {
                  if (user) {
                    sessionStorage.setItem(
                      homeworkDraftKey(
                        user.id,
                        item.id,
                        item.mySubmission?.submittedAt,
                      ),
                      e.target.value,
                    );
                    setDraftSaved(true);
                  }
                } catch {
                  setDraftSaved(false);
                }
              }}
              placeholder="Type your answer, or add a note about your attached work…"
            />
            <p className="text-xs text-slate-500" role="status">
              {draftSaved
                ? "Text draft saved in this tab."
                : "Text drafts stay in this tab when storage is available."}{" "}
              Unsubmitted attachments are removed when you close the workspace.
            </p>
            <div className="space-y-2" onDragOver={event => { event.preventDefault(); if (!uploading && !submitting) setDragging(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={event => { event.preventDefault(); setDragging(false); void upload(Array.from(event.dataTransfer.files)); }}>
              <label
                className={`hw-upload-zone ${dragging ? 'is-dragging' : ''} ${
                  uploading ||
                  attachments.length >= HOMEWORK_SUBMISSION_FILE_LIMIT
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer hover:bg-slate-50 dark:hover:bg-surface-raised"
                }`}
              >
                <Paperclip className="h-5 w-5" />
                {uploading
                  ? "Uploading…"
                  : `Drop files here or browse (${attachments.length}/${HOMEWORK_SUBMISSION_FILE_LIMIT})`}
                <input
                  aria-label="Attach homework files"
                  type="file"
                  multiple
                  accept={HOMEWORK_FILE_ACCEPT}
                  className="sr-only"
                  disabled={
                    submitting ||
                    uploading ||
                    attachments.length >= HOMEWORK_SUBMISSION_FILE_LIMIT
                  }
                  onChange={(e) => {
                    const selected = Array.from(e.target.files ?? []);
                    e.currentTarget.value = "";
                    if (selected.length) void upload(selected);
                  }}
                />
              </label>
              {uploadError && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{uploadError}</p>}
              <p className="text-[11px] text-slate-400">
                Up to 5 files, 10 MB each. Images, PDF, Word, PowerPoint, Excel,
                text and OpenDocument are accepted.
              </p>
              {attachments.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {attachments.map((file) => (
                    <div
                      key={file.url}
                      className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-surface-raised"
                    >
                      <Paperclip className="h-4 w-4 shrink-0 text-aubergine-600" />
                      <HomeworkFileLink
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1 text-xs text-slate-700 hover:underline dark:text-slate-200"
                      >
                        <span className="block truncate font-medium">
                          {file.originalName}
                        </span>
                        {file.size > 0 && (
                          <span className="text-[10px] text-slate-400">
                            {formatHomeworkFileSize(file.size)}
                          </span>
                        )}
                      </HomeworkFileLink>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 shrink-0 p-0"
                        onClick={() => void removeAttachment(file)}
                        disabled={uploading || submitting}
                        aria-label={`Remove ${file.originalName}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm" role="status">{attachments.length} {attachments.length === 1 ? 'file' : 'files'} attached{text.trim() ? ' + written answer' : ''}. Files are sent to your teacher only when you turn in.</p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={cancelSubmit}
                disabled={submitting || uploading}
              >
                Close workspace
              </Button>
              <Button
                className="hw-primary"
                size="sm"
                onClick={() => submit(item.id)}
                disabled={
                  submitting ||
                  uploading ||
                  (!text.trim() && !attachments.length)
                }
              >
                {submitting ? "Submitting…" : "Turn in"}
              </Button>
            </div>
          </AnimatedContent>
        )}
      </article>
    );
  };

  return (
    <div className="hw-workspace">
      <HomeworkMasthead
        audience="Student desk"
        title="A little progress, every day."
        description="Your assignments, next steps, and teacher feedback — together in one place."
      />
      {focusedAssignment && (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link to="/classwork" className="text-blue-600">
            ← Classwork
          </Link>
          <span>Opened from your class learning desk</span>
          <Button
            variant="outline"
            size="sm"
            disabled={openId !== null}
            onClick={() => {
              setSearchParams({});
              setView("all");
              setQuery("");
              setSubject("all");
            }}
          >
            View all homework
          </Button>
        </div>
      )}
      {!loading && !loadError && (
        <HomeworkFocus
          eyebrow="Where to begin"
          title={nextDue?.title || "You’re up to date."}
        >
          <div>
            <strong>{pending.length}</strong>Assignments to work on
          </div>
          <p>
            {nextDue ? (
              <>
                {nextDue.dueDate.slice(0, 10) < today
                  ? "Overdue since"
                  : "Next deadline"}
                <br />
                <b>{formatDateOnly(nextDue.dueDate)}</b>
              </>
            ) : (
              "New assignments will appear here when your teacher posts them."
            )}
          </p>
        </HomeworkFocus>
      )}
      <nav className="hw-tabs" aria-label="Homework status">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            disabled={openId !== null}
            aria-pressed={view === tab.key}
            onClick={() => {
              setSearchParams({});
              setView(tab.key);
            }}
          >
            {tab.label}{" "}
            <span className="ml-1 opacity-60">
              {items.filter((item) => matchesView(item, tab.key)).length}
            </span>
          </button>
        ))}
      </nav>
      <div className="hw-toolbar">
        <Input
          aria-label="Search your homework"
          placeholder="Find an assignment, subject or teacher…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={openId !== null}
        />
        <select
          aria-label="Filter by subject"
          value={subject}
          disabled={openId !== null}
          onChange={(e) => setSubject(e.target.value)}
        >
          <option value="all">All subjects</option>
          {Array.from(
            new Set(items.map((i) => i.subjectName).filter(Boolean)),
          ).map((name) => (
            <option key={name} value={name!}>
              {name}
            </option>
          ))}
        </select>
      </div>
      {openId && (
        <p className="text-xs text-slate-500">
          Close your workspace to browse other assignments.
        </p>
      )}

      {loading ? (
        <p className="py-14 text-center text-sm text-slate-500">Loading…</p>
      ) : loadError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-10 text-center dark:border-rose-900/50 dark:bg-rose-950/20">
          <p className="text-sm text-rose-700 dark:text-rose-300">
            {loadError}
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={load}>
            Try again
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400 dark:border-surface-raised">
          No homework yet. Enjoy the free time!
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="hw-eyebrow">
              {tabs.find((tab) => tab.key === view)?.label} / {visible.length}{" "}
              {visible.length === 1 ? "assignment" : "assignments"}
            </h2>
            <span className="text-xs text-slate-500">
              Earliest deadline first
            </span>
          </div>
          <section>{visible.map(renderCard)}</section>
          {!visible.length && (
            <div className="py-10 text-center">
              <p>No assignments in this view.</p>
              <Button
                className="mt-3"
                variant="outline"
                onClick={() => {
                  setSearchParams({});
                  setView("all");
                  setSubject("all");
                  setQuery("");
                }}
              >
                See all work
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
