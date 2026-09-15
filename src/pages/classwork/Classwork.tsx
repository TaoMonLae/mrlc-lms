import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  ArrowUpRight,
  BookOpen,
  ClipboardCheck,
  FileText,
  FolderPlus,
  GraduationCap,
  Layers,
  Pin,
  Plus,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import AnimatedContent from "@/components/AnimatedContent";
import { apiGet, apiSend } from "../../lib/api";
import { formatDateOnly } from "../../lib/dates";
import {
  filterClasswork,
  resolveClassworkSelection,
  sortClasswork,
  type ClassworkClass,
  type ClassworkItem,
  type ClassworkPayload,
} from "../../../shared/classwork";
import "./classwork.css";
import ClassworkResourcePicker from "./ClassworkResourcePicker";

const kinds = [
  { id: "ALL", label: "Everything", icon: Layers },
  { id: "HOMEWORK", label: "Homework", icon: ClipboardCheck },
  { id: "EXAM", label: "Quizzes & exams", icon: FileText },
  { id: "READING", label: "Readings", icon: BookOpen },
  { id: "ACTIVITY", label: "Language Quest", icon: GraduationCap },
];
const statusText: Record<string, string> = {
  OPEN: "To do",
  CLOSED: "Closed",
  SUBMITTED: "Submitted",
  MARKED: "Marked",
  REDO: "Changes requested",
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ACTIVE: "Open",
  SCHEDULED: "Scheduled",
  UPCOMING: "Opens later",
  IN_PROGRESS: "In progress",
  RETAKE_AVAILABLE: "Another attempt available",
  NO_ATTEMPTS: "No attempts left",
  RESOURCE: "Learning resource",
  UNAVAILABLE: "Resource unavailable",
};

export default function Classwork() {
  const [params, setParams] = useSearchParams();
  const [classes, setClasses] = useState<ClassworkClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [data, setData] = useState<ClassworkPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("ALL");
  const [topic, setTopic] = useState("all");
  const [grouping, setGrouping] = useState<"topic" | "deadline">("topic");
  const [composer, setComposer] = useState<"topic" | "resource" | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [resourceTopic, setResourceTopic] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const requestId = useRef(0);
  const writePending = useRef(false);
  const requestedClass = params.get("class");
  const selected = resolveClassworkSelection(requestedClass, classes);
  const currentClass = classes.find((c) => c.id === selected);

  useEffect(() => {
    const controller = new AbortController();
    setClassesLoading(true);
    setError("");
    apiGet<ClassworkClass[]>("/api/classwork/classes", {
      signal: controller.signal,
    })
      .then(setClasses)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setClassesLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    if (!classesLoading && selected && requestedClass !== selected)
      setParams({ class: selected }, { replace: true });
  }, [classesLoading, requestedClass, selected, setParams]);
  useEffect(() => {
    const version = ++requestId.current;
    writePending.current = false;
    setBusy(false);
    if (!selected || !currentClass) return;
    const controller = new AbortController();
    setLoading(true);
    setData(null);
    setError("");
    setQuery("");
    setKind("ALL");
    setTopic("all");
    setComposer(null);
    apiGet<ClassworkPayload>(`/api/classwork/classes/${selected}`, {
      signal: controller.signal,
    })
      .then((value) => {
        if (version === requestId.current) setData(value);
      })
      .catch((e) => {
        if (e.name !== "AbortError" && version === requestId.current)
          setError(e.message);
      })
      .finally(() => {
        if (version === requestId.current && !controller.signal.aborted)
          setLoading(false);
      });
    return () => {
      controller.abort();
      ++requestId.current;
    };
  }, [selected, currentClass?.id, retry]);

  const refresh = async (version: number) => {
    const value = await apiGet<ClassworkPayload>(
      `/api/classwork/classes/${selected}`,
    );
    if (version === requestId.current) setData(value);
  };
  const write = async (
    action: () => Promise<unknown>,
    message: string,
    close = false,
  ) => {
    if (writePending.current) return;
    writePending.current = true;
    const version = requestId.current;
    setBusy(true);
    try {
      await action();
      if (close && version === requestId.current) setComposer(null);
      toast.success(message);
      try {
        await refresh(version);
      } catch {
        if (version === requestId.current)
          setError(
            "Your change was saved, but the list could not refresh. Reload to see the latest classwork.",
          );
      }
    } catch (e: any) {
      toast.error(e.message || "Could not save. Your changes are still here.");
    } finally {
      if (version === requestId.current) {
        writePending.current = false;
        setBusy(false);
      }
    }
  };
  const startComposer = (type: "topic" | "resource") => {
    setTitle("");
    setDescription("");
    setUrl("");
    setRenameId(null);
    setResourceTopic(topic === "all" || topic === "unfiled" ? "" : topic);
    setComposer(type);
  };
  const place = (
    item: ClassworkItem,
    patch: { pinned?: boolean; topicId?: string | null },
  ) =>
    write(
      () =>
        apiSend(`/api/classwork/classes/${selected}/placement`, "PUT", {
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          ...patch,
        }),
      "Classwork updated",
    );
  const items = data?.items ?? [];
  const visible = sortClasswork(
    filterClasswork(items, query, kind, topic),
    grouping,
  );
  const sections =
    grouping === "topic"
      ? [
          ...(data?.topics ?? []).map((t) => ({ id: t.id, title: t.title })),
          { id: "unfiled", title: "Not filed in a topic" },
        ]
      : [{ id: "deadline", title: "Deadline order" }];
  const filteredSections = sections.filter(
    (section) =>
      visible.some(
        (item) =>
          grouping === "deadline" || (item.topicId ?? "unfiled") === section.id,
      ) ||
      (!query &&
        kind === "ALL" &&
        grouping === "topic" &&
        section.id !== "unfiled" &&
        (topic === "all" || topic === section.id)),
  );
  const busyBrowsing = busy || composer !== null;
  const renderItem = (item: ClassworkItem) => {
    const Icon = kinds.find((k) => k.id === item.kind)?.icon ?? BookOpen;
    const external = item.href.startsWith("https://");
    const action =
      item.sourceType === "HOMEWORK"
        ? data?.canManage
          ? "Review work"
          : "View homework"
        : item.sourceType === "EXAM"
          ? data?.canManage
            ? "Manage exam"
            : item.status === "SUBMITTED"
              ? "View result"
              : "View exam"
          : item.kind === "ACTIVITY"
            ? "Open course"
            : "Open reading";
    return (
      <article key={item.id} className="cw-item">
        <div className="cw-item-icon">
          <Icon size={19} />
        </div>
        <div className="cw-item-body">
          <div className="cw-item-kicker">
            {kinds.find((k) => k.id === item.kind)?.label}
            {item.subject && ` / ${item.subject}`}
            {item.pinned && (
              <span>
                <Pin size={11} />
                Pinned
              </span>
            )}
          </div>
          <h3>{item.title}</h3>
          <div className="cw-item-meta">
            <span>{statusText[item.status] ?? item.status}</span>
            <span>
              {item.dueDate
                ? `Due ${item.kind === "EXAM" ? new Date(item.dueDate).toLocaleString() : formatDateOnly(item.dueDate)}`
                : "No deadline"}
            </span>
          </div>
          {item.description && (
            <details>
              <summary>View brief</summary>
              <p>{item.description}</p>
            </details>
          )}
          {data?.canManage && (
            <div className="cw-item-manage">
              <select
                aria-label={`Topic for ${item.title}`}
                value={item.topicId ?? ""}
                disabled={busy}
                onChange={(e) =>
                  place(item, { topicId: e.target.value || null })
                }
              >
                <option value="">Not filed</option>
                {data.topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy}
                aria-pressed={item.pinned}
                aria-label={`${item.pinned ? "Unpin" : "Pin"} ${item.title}`}
                onClick={() => place(item, { pinned: !item.pinned })}
              >
                <Pin size={14} />
                {item.pinned ? "Unpin" : "Pin"}
              </button>
              {item.sourceType === "RESOURCE" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Remove “${item.title}” from this class? The original resource is not deleted.`,
                      )
                    )
                      void write(
                        () =>
                          apiSend(
                            `/api/classwork/classes/${selected}/resources/${item.sourceId}`,
                            "DELETE",
                          ),
                        "Resource removed from class",
                      );
                  }}
                >
                  Remove link
                </button>
              )}
            </div>
          )}
        </div>
        <div className="cw-item-action">
          {item.href &&
            (external ? (
              <a href={item.href} target="_blank" rel="noopener noreferrer">
                {action}
                <ArrowUpRight size={15} />
                <span className="sr-only">
                  {" "}
                  (external website, opens in new tab)
                </span>
              </a>
            ) : (
              <Link to={item.href}>
                {action}
                <ArrowUpRight size={15} />
              </Link>
            ))}
          {external && <small>External website</small>}
        </div>
      </article>
    );
  };

  return (
    <div className="cw-workspace">
      <header className="cw-header">
        <div>
          <p className="cw-eyebrow">MRLC / The learning desk</p>
          <h1>Classwork</h1>
          <p>One class. Every learning moment.</p>
        </div>
        <label className="cw-class-picker">
          Your classroom
          <select
            aria-label="Choose classroom"
            disabled={classesLoading || busyBrowsing}
            value={selected}
            onChange={(e) => setParams({ class: e.target.value })}
          >
            {!classes.length && <option value="">No classroom</option>}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </header>
      {currentClass && (
        <div className="cw-classline">
          <span>
            {currentClass.level} / {currentClass.academicYear}
          </span>
          {data?.canManage && (
            <Link to={`/teacher/classes/${selected}`}>
              Class details <ArrowUpRight size={13} />
            </Link>
          )}
        </div>
      )}
      {error && (
        <div className="cw-message" role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setRetry((n) => n + 1)}
            disabled={busy}
          >
            Try again
          </button>
        </div>
      )}
      {classesLoading || loading ? (
        <p className="cw-empty" role="status">
          Opening your learning desk…
        </p>
      ) : !classes.length && !error ? (
        <div className="cw-empty">
          <h2>No classroom yet</h2>
          <p>
            Your classwork appears here once you have been assigned to a school
            class.
          </p>
        </div>
      ) : !currentClass && !error ? (
        <div className="cw-message">
          This classroom is not available to your account.
        </div>
      ) : (
        data && (
          <>
            <div className="cw-toolbar">
              <div className="cw-search">
                <Search size={17} />
                <input
                  aria-label="Search classwork"
                  value={query}
                  placeholder="Find a brief, reading or activity…"
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <select
                aria-label="Organize classwork view"
                value={grouping}
                onChange={(e) => setGrouping(e.target.value as typeof grouping)}
              >
                <option value="topic">By topic</option>
                <option value="deadline">By deadline</option>
              </select>
              {data.canManage && (
                <>
                  <button
                    className="cw-button"
                    disabled={busyBrowsing}
                    onClick={() => startComposer("resource")}
                  >
                    <Plus size={16} />
                    Add resource
                  </button>
                  <Link
                    className="cw-button cw-button-primary"
                    to="/teacher/homework"
                    state={{ classId: selected, openComposer: true }}
                  >
                    <Plus size={16} />
                    New homework
                  </Link>
                </>
              )}
            </div>
            {composer && (
              <section
                className="cw-composer"
                aria-label={
                  composer === "topic" ? "Topic editor" : "Resource editor"
                }
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void write(
                      () =>
                        apiSend(
                          `/api/classwork/classes/${selected}/${composer === "topic" ? `topics${renameId ? `/${renameId}` : ""}` : "resources"}`,
                          renameId ? "PATCH" : "POST",
                          composer === "topic"
                            ? { title }
                            : {
                                title,
                                url,
                                description,
                                topicId: resourceTopic || null,
                              },
                        ),
                      composer === "topic" ? "Topic saved" : "Resource added",
                      true,
                    );
                  }}
                >
                  <div className="cw-section-heading">
                    <div>
                      <p className="cw-eyebrow">
                        {composer === "topic"
                          ? "Organize learning"
                          : "Add to this class"}
                      </p>
                      <h2>
                        {composer === "topic"
                          ? renameId
                            ? "Rename topic"
                            : "Create a topic"
                          : "A reading or a Language Quest course"}
                      </h2>
                    </div>
                    <button
                      type="button"
                      aria-label="Close editor"
                      disabled={busy}
                      onClick={() => setComposer(null)}
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <fieldset disabled={busy}>
                    <label>
                      Title
                      <input
                        required
                        maxLength={composer === "topic" ? 100 : 200}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={
                          composer === "topic"
                            ? "e.g. Week 01 · Understanding our world"
                            : "Give students a clear starting point"
                        }
                      />
                    </label>
                    {composer === "resource" && (
                      <>
                        <ClassworkResourcePicker
                          classId={selected}
                          disabled={busy}
                          onChoose={(item) => {
                            setTitle(item.title);
                            setUrl(item.url);
                          }}
                        />
                        <label>
                          Resource link
                          <input
                            required
                            maxLength={2000}
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://… or /elibrary/…/read"
                          />
                        </label>
                        <p className="cw-hint">
                          Paste an MRLC News article, E-library reader, Language
                          Quest course path, or an external HTTPS link. Courses
                          must be published and books available to students.
                        </p>
                        <label>
                          What should students focus on?
                          <textarea
                            rows={3}
                            maxLength={5000}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                          />
                        </label>
                        <label>
                          Topic
                          <select
                            value={resourceTopic}
                            onChange={(e) => setResourceTopic(e.target.value)}
                          >
                            <option value="">Not filed in a topic</option>
                            {data.topics.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <p className="cw-hint">
                          This adds a learning resource, not a graded
                          assignment. To collect work, create homework instead.
                        </p>
                      </>
                    )}
                    <div className="cw-form-actions">
                      <button
                        type="button"
                        className="cw-button"
                        onClick={() => setComposer(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="cw-button cw-button-primary"
                        type="submit"
                      >
                        {busy
                          ? "Saving…"
                          : composer === "topic"
                            ? "Save topic"
                            : "Add to classwork"}
                      </button>
                    </div>
                  </fieldset>
                </form>
              </section>
            )}
            <div className="cw-layout">
              <aside className="cw-topic-index">
                <div className="cw-section-heading">
                  <h2>Learning topics</h2>
                  {data.canManage && (
                    <button
                      aria-label="Create topic"
                      disabled={busyBrowsing}
                      onClick={() => startComposer("topic")}
                    >
                      <FolderPlus size={18} />
                    </button>
                  )}
                </div>
                <nav aria-label="Learning topics">
                  <button
                    aria-pressed={topic === "all"}
                    onClick={() => setTopic("all")}
                  >
                    All classwork <span>{items.length}</span>
                  </button>
                  {data.topics.map((t, index) => (
                    <button
                      key={t.id}
                      aria-pressed={topic === t.id}
                      onClick={() => setTopic(t.id)}
                    >
                      <span className="cw-topic-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="cw-topic-name">{t.title}</span>
                      <span>
                        {items.filter((i) => i.topicId === t.id).length}
                      </span>
                    </button>
                  ))}
                  <button
                    aria-pressed={topic === "unfiled"}
                    onClick={() => setTopic("unfiled")}
                  >
                    Not filed{" "}
                    <span>{items.filter((i) => !i.topicId).length}</span>
                  </button>
                </nav>
                <div className="cw-index-note">
                  <BookOpen size={20} />
                  <p>
                    Homework and exams appear automatically. Readings and
                    courses stay alongside the work they support.
                  </p>
                </div>
              </aside>
              <div className="cw-learning-list">
                <nav className="cw-kind-tabs" aria-label="Classwork type">
                  {kinds.map((k) => (
                    <button
                      key={k.id}
                      aria-pressed={kind === k.id}
                      onClick={() => setKind(k.id)}
                    >
                      {k.label}
                    </button>
                  ))}
                </nav>
                <div className="cw-list-caption">
                  <span>
                    {visible.length} learning{" "}
                    {visible.length === 1 ? "item" : "items"}
                  </span>
                  <span>
                    {grouping === "topic"
                      ? "Newest first · pinned items lead each topic"
                      : "Pinned first · then earliest deadline"}
                  </span>
                </div>
                <AnimatedContent
                  container="main"
                  distance={10}
                  duration={0.35}
                  threshold={0}
                >
                  <div>
                    {filteredSections.map((section) => (
                      <section key={section.id} className="cw-topic-section">
                        <div className="cw-section-heading">
                          <h2>{section.title}</h2>
                          {data.canManage &&
                            grouping === "topic" &&
                            section.id !== "unfiled" && (
                              <button
                                className="cw-text-button"
                                disabled={busyBrowsing}
                                onClick={() => {
                                  setRenameId(section.id);
                                  setTitle(section.title);
                                  setComposer("topic");
                                }}
                              >
                                Rename
                              </button>
                            )}
                        </div>
                        {visible
                          .filter(
                            (item) =>
                              grouping === "deadline" ||
                              (item.topicId ?? "unfiled") === section.id,
                          )
                          .map(renderItem)}
                        {!visible.some(
                          (item) => (item.topicId ?? "unfiled") === section.id,
                        ) &&
                          grouping === "topic" && (
                            <p className="cw-topic-empty">
                              {data.canManage
                                ? "Use an item’s topic menu to file it here, or add a resource."
                                : "Your teacher will add learning materials here."}
                            </p>
                          )}
                      </section>
                    ))}
                    {!filteredSections.length && (
                      <div className="cw-empty">
                        <Layers size={28} />
                        <h2>
                          {items.length
                            ? "Nothing matches this view"
                            : "Your classwork starts here"}
                        </h2>
                        <p>
                          {items.length
                            ? "Try another topic, type, or search."
                            : data.canManage
                              ? "Create homework or add a reading. Existing class exams will appear here too."
                              : "Your teacher has not added any classwork yet."}
                        </p>
                        {items.length > 0 && (
                          <button
                            className="cw-button"
                            onClick={() => {
                              setQuery("");
                              setKind("ALL");
                              setTopic("all");
                            }}
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </AnimatedContent>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
