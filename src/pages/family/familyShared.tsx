import type { ReactNode } from "react";

export type Learner = { id: string; name: string; className: string | null; level: string | null; profilePhotoUrl: string | null; unreadReplies: number };
export type AttendanceRecord = { id: string; date: string; status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; remarks: string | null };
export type Homework = { id: string; title: string; dueDate: string; status: string; subject: string | null; submission: { status: string; score: number | null; feedback: string | null; markedAt: string | null } | null };
export type Grade = { id: string; title: string; subject: string | null; marks: number; maxMarks: number; comment: string | null; date: string };
export type Fee = { id: string; description: string; amount: number; paidAmount: number; balance: number; status: string; dueDate: string; paidDate: string | null; receiptNumber: string | null; currency: string };
export type Announcement = { id: string; title: string; body: string; pinned: boolean; createdAt: string; audience: string; className: string | null };
export type Readiness = { subject: GedSubject; status: ReadinessStatus; note: string | null; updatedAt: string };
export type ExamResult = { id: string; title: string; type: string; subject: string | null; score: number; totalMarks: number; percent: number; passed: boolean | null; completedAt: string | null };
export type TimetableSlot = { id: string; day: string; start: string; end: string; subject: string | null; teacher: string | null; substituted: boolean; room: string | null };
export type SchoolEvent = { id: string; title: string; eventType: string; startDate: string; endDate: string | null; location: string | null; notes: string | null };
export type Teacher = { id: string; name: string; subjects: string[] };
export type StudyDay = { day: string; lessons: number; videos: number; homework: number };
export type AbsenceNotice = { id: string; type: string; startDate: string; endDate: string; reason: string; status: "SUBMITTED" | "ACKNOWLEDGED" | "CANCELLED"; staffNote: string | null; acknowledgedByName: string | null; acknowledgedAt: string | null; createdAt: string };
export type FamilyMessage = { id: string; topic: string; body: string; reply: string | null; status: string; repliedByName: string | null; repliedAt: string | null; guardianReadAt: string | null; createdAt: string };
export type Scope = "LEARNING" | "ATTENDANCE" | "FEES";
export type Access = { basis: "MINOR" | "AGE_UNKNOWN" | "ADULT_CONSENT" | "ADULT_NO_CONSENT"; scopes: Scope[]; adultFrom: string | null };
export type Overview = {
  student: { id: string; name: string; studentCode: string; className: string | null; level: string | null; boarding: boolean; hasLmsAccount: boolean };
  access: Access; alerts: { emailEnabled: boolean; email: string | null };
  asOf: string; today: string;
  attendance: AttendanceRecord[]; homework: Homework[]; grades: Grade[]; readiness: Readiness[]; examResults: ExamResult[];
  timetable: TimetableSlot[]; events: SchoolEvent[]; teachers: Teacher[]; studyDays: StudyDay[]; absences: AbsenceNotice[];
  fees: Fee[]; announcements: Announcement[]; unreadReplies: number;
};

export type GedSubject = "RLA" | "MATH" | "SCIENCE" | "SOCIAL_STUDIES";
export type ReadinessStatus = "NOT_READY" | "DEVELOPING" | "NEAR_READY" | "READY" | "TEST_SCHEDULED" | "PASSED";

export const views = [
  { key: "today", label: "Today" },
  { key: "progress", label: "Progress" },
  { key: "attendance", label: "Attendance" },
  { key: "schedule", label: "Schedule" },
  { key: "fees", label: "Fees" },
  { key: "messages", label: "Messages" },
] as const;
export type ViewKey = typeof views[number]["key"];

export const gedSubjects: { key: GedSubject; label: string; short: string }[] = [
  { key: "RLA", label: "Reasoning Through Language Arts", short: "Language Arts" },
  { key: "MATH", label: "Mathematical Reasoning", short: "Math" },
  { key: "SCIENCE", label: "Science", short: "Science" },
  { key: "SOCIAL_STUDIES", label: "Social Studies", short: "Social Studies" },
];

export const readinessSteps: { key: ReadinessStatus; label: string; meaning: string }[] = [
  { key: "NOT_READY", label: "Building skills", meaning: "Still learning the basics for this test." },
  { key: "DEVELOPING", label: "Developing", meaning: "Making progress. Regular practice is needed." },
  { key: "NEAR_READY", label: "Nearly ready", meaning: "Close to test level. A practice test will confirm." },
  { key: "READY", label: "Ready to test", meaning: "The teacher judges this subject ready to book." },
  { key: "TEST_SCHEDULED", label: "Test booked", meaning: "An official GED test date is booked." },
  { key: "PASSED", label: "Passed", meaning: "This GED subject test is passed." },
];

export const absenceTypes = [
  { key: "ILLNESS", label: "Illness" },
  { key: "MEDICAL", label: "Medical appointment" },
  { key: "FAMILY", label: "Family matter" },
  { key: "TRAVEL", label: "Travel" },
  { key: "HOME_VISIT", label: "Home visit" },
  { key: "OTHER", label: "Other" },
] as const;

export const messageTopics = [
  { key: "LEARNING", label: "Learning" },
  { key: "ATTENDANCE", label: "Attendance" },
  { key: "WELLBEING", label: "Wellbeing" },
  { key: "FEES", label: "Fees" },
  { key: "OTHER", label: "Other" },
] as const;

export const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const KL = "Asia/Kuala_Lumpur";
export const dateLabel = (date: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  new Intl.DateTimeFormat("en-MY", { timeZone: KL, ...options }).format(new Date(date));
export const plainDateLabel = (date: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  new Intl.DateTimeFormat("en-MY", { timeZone: "UTC", ...options }).format(new Date(date));
export const money = (amount: number, currency = "MYR") => new Intl.NumberFormat("en-MY", { style: "currency", currency }).format(amount);
export const dayKey = (date: Date | string) => new Intl.DateTimeFormat("en-CA", { timeZone: KL, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
export const keyToUtc = (key: string) => { const [y, m, d] = key.split("-").map(Number); return Date.UTC(y, m - 1, d); };
export const daysBetween = (fromKey: string, toKey: string) => Math.round((keyToUtc(toKey) - keyToUtc(fromKey)) / 86_400_000);
export const addDays = (key: string, days: number) => new Date(keyToUtc(key) + days * 86_400_000).toISOString().slice(0, 10);
export const weekdayOf = (key: string) => weekdays[(new Date(keyToUtc(key)).getUTCDay() + 6) % 7];
export const labelOf = <T extends { key: string; label: string }>(list: readonly T[], key: string) => list.find((item) => item.key === key)?.label || key;

export function attendanceStats(records: AttendanceRecord[]) {
  const count = (status: AttendanceRecord["status"]) => records.filter((record) => record.status === status).length;
  const present = count("PRESENT"), late = count("LATE"), absent = count("ABSENT"), excused = count("EXCUSED");
  const counted = present + late + absent;
  return { present, late, absent, excused, total: records.length, rate: counted ? Math.round(((present + late) / counted) * 100) : null };
}

export function Panel({ title, action, children, className = "", id }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return <section aria-labelledby={id} className={`rounded-lg border border-border bg-card ${className}`}>
    {title && <div className="flex min-h-14 items-center justify-between gap-4 border-b border-border px-5 py-2 sm:px-6">
      <h2 id={id} className="text-base font-semibold text-foreground">{title}</h2>
      {action}
    </div>}
    {children}
  </section>;
}

export function ViewHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h2 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">{title}</h2>
      {description && <p className="mt-1.5 max-w-[62ch] text-sm leading-6 text-muted-foreground">{description}</p>}
    </div>
    {action}
  </div>;
}

export const can = (overview: Overview, scope: Scope) => overview.access.scopes.includes(scope);
const scopeWords: Record<Scope, string> = { LEARNING: "learning progress and results", ATTENDANCE: "attendance records", FEES: "fee records" };

export function SharingNotice({ overview, scope }: { overview: Overview; scope: Scope }) {
  const name = overview.student.name;
  const chose = overview.access.basis === "ADULT_CONSENT";
  return <section className="rounded-lg border border-border bg-card px-5 py-6 sm:px-6">
    <h2 className="text-base font-semibold text-foreground">{chose ? `${name} has not shared ${scopeWords[scope]}` : `${name} decides what the family can see`}</h2>
    <p className="mt-2 max-w-[62ch] text-sm leading-6 text-muted-foreground">{chose
      ? `${name} is 18 or older and chose what to share with family. ${scopeWords[scope][0].toUpperCase()}${scopeWords[scope].slice(1)} are not part of that choice. They can change it at any time at the MRLC office.`
      : `${name} is 18 or older, so the school asks them before showing their ${scopeWords[scope]} to family. They have not given an answer yet. If they agree, they can tell the MRLC office and staff will update it.`}</p>
    <p className="mt-2 max-w-[62ch] text-sm leading-6 text-muted-foreground">You can still read school updates, see the schedule, send messages and report an absence.</p>
  </section>;
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="px-5 py-6 text-sm leading-6 text-muted-foreground sm:px-6">{children}</p>;
}

export const linkButton = "inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const primaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
export const fieldClass = "mt-1.5 block min-h-11 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
