"use client";

import type { ReactNode } from "react";
import { AlertCircle, BookOpen, CalendarRange, ChevronRight, Megaphone, TrendingUp, Users } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router";

export type SchoolDashboardStats = {
  students: number;
  classes: number;
  openCases: number;
  attendanceRate: number | null;
  attendanceRecords?: number;
};

export type SchoolDashboardAnnouncement = {
  id: string;
  title: string;
  category: string;
  pinned: boolean;
  date: string;
};

export type SchoolDashboardScheduleItem = {
  time: string;
  subject: string;
  subjectColor: string;
  class: string;
  teacher: string;
  room: string;
};

export type SchoolDashboardCase = {
  id: string;
  name: string;
  detail: string;
  status: string;
  time: string;
};

type SchoolOperationsDashboardProps = {
  actions: ReactNode;
  announcements: SchoolDashboardAnnouncement[];
  loading: boolean;
  recentCases: SchoolDashboardCase[];
  schedule: SchoolDashboardScheduleItem[];
  stats?: SchoolDashboardStats;
};

const formatDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

export default function SchoolOperationsDashboard({ actions, announcements, loading, recentCases, schedule, stats }: SchoolOperationsDashboardProps) {
  const reduceMotion = useReducedMotion();
  const today = new Date();
  const day = today.toLocaleDateString(undefined, { day: "2-digit" });
  const month = today.toLocaleDateString(undefined, { month: "short" }).toUpperCase();
  const weekday = today.toLocaleDateString(undefined, { weekday: "long" });
  const fmt = (value: number | null | undefined) => (loading ? "––" : String(value ?? 0));

  const metrics = [
    { label: "Students", value: fmt(stats?.students), detail: "Active this semester", Icon: Users },
    { label: "Classes", value: fmt(stats?.classes), detail: "GED and Pre-GED", Icon: BookOpen },
    {
      label: "Attendance",
      value: loading ? "––" : stats?.attendanceRate != null ? `${stats.attendanceRate}%` : "—",
      detail: stats?.attendanceRecords ? `${stats.attendanceRecords} records today` : "No records today",
      Icon: TrendingUp,
    },
    { label: "Open cases", value: fmt(stats?.openCases), detail: "Need review", Icon: AlertCircle, urgent: Boolean(stats?.openCases) },
  ];

  return (
    <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.22 }} className="space-y-6">
      <section className="grid overflow-hidden border border-academic-navy-deep bg-card lg:grid-cols-[minmax(0,1fr)_300px]" aria-labelledby="dashboard-heading">
        <div className="flex min-h-48 flex-col justify-between gap-8 p-5 sm:p-7 lg:p-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-academic-teal">School operations / overview</p>
            <h1 id="dashboard-heading" className="mt-3 max-w-3xl text-balance text-4xl font-semibold leading-[0.98] tracking-[-0.04em] text-academic-navy-deep sm:text-5xl">
              The school day, at a glance.
            </h1>
            <p className="mt-4 max-w-2xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
              Attendance, classes, student support and today’s timetable in one working view.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">{actions}</div>
        </div>

        <div className="flex min-h-48 flex-col justify-between bg-academic-coral p-5 text-academic-navy-deep sm:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">Today’s field note</p>
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-7xl font-semibold leading-none tracking-[-0.07em]">{day}</p>
              <p className="mt-1 text-sm font-semibold uppercase tracking-[0.16em]">{month}</p>
            </div>
            <p className="max-w-[11ch] text-right text-xl font-semibold leading-[1.05] tracking-[-0.025em]">{weekday}<br />Keep the next step clear.</p>
          </div>
        </div>
      </section>

      <section className="grid border border-border bg-card sm:grid-cols-2 xl:grid-cols-4" aria-label="School summary metrics">
        {metrics.map(({ detail, Icon, label, urgent, value }, index) => (
          <div key={label} className={`min-h-36 p-5 sm:p-6 ${index > 0 ? "border-t border-border sm:border-l sm:border-t-0" : ""}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">{label}</p>
              <Icon className={`size-4 ${urgent ? "text-academic-coral" : "text-academic-teal"}`} aria-hidden="true" />
            </div>
            <p className="mt-5 text-4xl font-semibold leading-none tracking-[-0.045em] text-foreground">{value}</p>
            <p className={`mt-3 text-xs font-medium ${urgent ? "text-destructive" : "text-muted-foreground"}`}>{detail}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="announcements-heading">
        <div className="flex items-end justify-between gap-4 border-b border-foreground pb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-academic-teal">Notice board</p>
            <h2 id="announcements-heading" className="mt-1 flex items-center gap-2 text-lg font-semibold tracking-[-0.02em]">
              <Megaphone className="size-4" aria-hidden="true" /> Important announcements
            </h2>
          </div>
          <Link to="/announcements" className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-academic-teal hover:text-foreground">
            View all <ChevronRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>

        {announcements.length === 0 ? (
          <p className="border-b border-border bg-card px-4 py-6 text-sm text-muted-foreground">{loading ? "Loading notices…" : "No active announcements."}</p>
        ) : (
          <div className="grid border-b border-l border-border bg-card md:grid-cols-3">
            {announcements.slice(0, 3).map((announcement) => (
              <Link key={announcement.id} to={`/announcements/${announcement.id}`} className="group min-h-32 border-r border-t border-border p-4 transition-colors hover:bg-accent/45 sm:p-5">
                <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  <span>{announcement.category}</span><span>{formatDate(announcement.date)}</span>
                </div>
                <h3 className="mt-5 line-clamp-2 text-base font-semibold leading-snug tracking-[-0.015em] group-hover:text-academic-teal">{announcement.title}</h3>
                {announcement.pinned && <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-academic-coral">Pinned priority</p>}
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.7fr)]">
        <section className="overflow-hidden border border-border bg-card" aria-labelledby="schedule-heading">
          <div className="flex items-center justify-between gap-4 border-b border-foreground px-4 py-4 sm:px-5">
            <h2 id="schedule-heading" className="flex items-center gap-2 text-base font-semibold tracking-[-0.015em]">
              <CalendarRange className="size-4 text-academic-teal" aria-hidden="true" /> Today’s schedule
            </h2>
            <Link to="/timetable" className="text-[10px] font-semibold uppercase tracking-[0.1em] text-academic-teal hover:text-foreground">Full timetable</Link>
          </div>

          <div className="hidden overflow-x-auto md:block" tabIndex={0} role="region" aria-label="Today's schedule table">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/55 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                <tr>{["Time", "Subject", "Class", "Teacher", "Room"].map((label) => <th key={label} className="px-5 py-3 font-semibold">{label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {schedule.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">{loading ? "Loading timetable…" : "No classes scheduled for today."}</td></tr>
                ) : schedule.map((item, index) => (
                  <tr key={`${item.time}-${item.subject}-${index}`} className="transition-colors hover:bg-accent/35">
                    <td className="px-5 py-4 font-mono text-sm font-semibold text-academic-teal">{item.time}</td>
                    <td className="px-5 py-4 font-semibold text-foreground">{item.subject}</td>
                    <td className="px-5 py-4 text-muted-foreground">{item.class}</td>
                    <td className="px-5 py-4 text-muted-foreground">{item.teacher}</td>
                    <td className="px-5 py-4"><span className="border border-border bg-muted/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]">{item.room}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {schedule.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">{loading ? "Loading timetable…" : "No classes scheduled for today."}</p>
            ) : schedule.map((item, index) => (
              <div key={`${item.time}-${item.subject}-${index}`} className="grid grid-cols-[64px_1fr] gap-3 p-4">
                <p className="font-mono text-sm font-semibold text-academic-teal">{item.time}</p>
                <div><p className="font-semibold">{item.subject}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.class} · {item.teacher} · {item.room}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-border bg-card" aria-labelledby="cases-heading">
          <div className="border-b border-foreground px-4 py-4 sm:px-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-academic-coral">Action queue</p>
            <h2 id="cases-heading" className="mt-1 text-base font-semibold tracking-[-0.015em]">Recent student cases</h2>
          </div>
          <div className="divide-y divide-border">
            {recentCases.length === 0 ? (
              <p className="p-5 text-sm leading-6 text-muted-foreground">{loading ? "Loading student support…" : "No recent cases. The queue is clear."}</p>
            ) : recentCases.slice(0, 5).map((studentCase) => (
              <Link key={studentCase.id} to={`/cases/${studentCase.id}`} className="group block p-4 transition-colors hover:bg-accent/40 sm:p-5">
                <div className="flex items-start justify-between gap-4"><p className="font-semibold group-hover:text-academic-teal">{studentCase.name}</p><span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.09em] text-academic-coral">{studentCase.status}</span></div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{studentCase.detail}</p>
                <p className="mt-3 font-mono text-[10px] text-muted-foreground">{formatDate(studentCase.time)}</p>
              </Link>
            ))}
          </div>
          <Link to="/cases" className="flex min-h-11 items-center justify-between border-t border-border px-5 text-xs font-semibold uppercase tracking-[0.08em] text-academic-teal hover:bg-muted/60 hover:text-foreground">
            Open case management <ChevronRight className="size-3.5" aria-hidden="true" />
          </Link>
        </section>
      </div>
    </motion.div>
  );
}
