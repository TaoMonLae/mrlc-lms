import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, BookOpen, CheckCircle2, Clock3, Loader2, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ReadingBook {
  ebook: { id: string; title: string; author?: string | null; format: string };
  percent: number;
  totalReadingSeconds: number;
  openCount: number;
  completedAt: string | null;
  firstOpenedAt: string;
  lastOpenedAt: string;
}

interface StudentReadingRow {
  userId: string;
  name: string;
  email: string;
  studentCode: string | null;
  className: string;
  booksStarted: number;
  completedBooks: number;
  averagePercent: number;
  totalReadingSeconds: number;
  lastReadAt: string | null;
  books: ReadingBook[];
}

interface AnalyticsResponse {
  summary: { activeStudents: number; booksStarted: number; booksCompleted: number; totalReadingSeconds: number };
  students: StudentReadingRow[];
}

function formatReadingTime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function EbookAnalytics() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    fetch('/api/ebooks/analytics', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Could not load reading analytics');
        setData(await response.json());
      })
      .catch((error) => toast.error(error.message || 'Could not load reading analytics'))
      .finally(() => setLoading(false));
  }, []);

  const students = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return data?.students || [];
    return (data?.students || []).filter((student) =>
      [student.name, student.email, student.studentCode, student.className]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(value)),
    );
  }, [data, query]);

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading reading analytics…</div>;
  }

  const cards = [
    { label: 'Student Readers', value: data?.summary.activeStudents || 0, icon: Users },
    { label: 'Books Opened', value: data?.summary.booksStarted || 0, icon: BookOpen },
    { label: 'Books Completed (90%+)', value: data?.summary.booksCompleted || 0, icon: CheckCircle2 },
    { label: 'Total Reading Time', value: formatReadingTime(data?.summary.totalReadingSeconds || 0), icon: Clock3 },
  ];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link to="/elibrary" />} nativeButton={false}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">E-Book Reading Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">Student completion, progress, and active reading time.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-surface-raised dark:bg-surface-indigo">
            <div className="flex items-center justify-between text-slate-500"><span className="text-xs font-medium">{label}</span><Icon className="h-4 w-4" /></div>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student, code, or class…" className="pl-9" />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-surface-raised dark:bg-surface-indigo">
        {students.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">No student reading activity found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 dark:border-surface-raised dark:bg-canvas">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th><th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 text-center font-medium">Opened</th><th className="px-4 py-3 text-center font-medium">Completed</th>
                  <th className="px-4 py-3 font-medium">Average Progress</th><th className="px-4 py-3 font-medium">Reading Time</th><th className="px-4 py-3 font-medium">Last Read</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-surface-raised">
                {students.map((student) => (
                  <React.Fragment key={student.userId}>
                    <tr className="align-top">
                      <td className="px-4 py-3"><p className="font-medium text-slate-900 dark:text-white">{student.name}</p><p className="text-xs text-slate-500">{student.studentCode || student.email}</p></td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{student.className}</td>
                      <td className="px-4 py-3 text-center font-medium">{student.booksStarted}</td><td className="px-4 py-3 text-center font-medium text-emerald-600">{student.completedBooks}</td>
                      <td className="min-w-40 px-4 py-3"><div className="flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-surface-raised"><div className="h-full bg-primary" style={{ width: `${student.averagePercent}%` }} /></div><span className="w-11 text-right text-xs tabular-nums">{student.averagePercent}%</span></div></td>
                      <td className="px-4 py-3 font-medium tabular-nums">{formatReadingTime(student.totalReadingSeconds)}</td><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{formatDate(student.lastReadAt)}</td>
                    </tr>
                    <tr>
                      <td colSpan={7} className="px-4 pb-4 pt-0">
                        <details className="rounded-md bg-slate-50 px-3 py-2 dark:bg-canvas">
                          <summary className="cursor-pointer text-xs font-medium text-primary">View {student.books.length} book{student.books.length === 1 ? '' : 's'}</summary>
                          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {student.books.map((book) => (
                              <div key={book.ebook.id} className="rounded-md border border-slate-200 bg-white p-3 dark:border-surface-raised dark:bg-surface-indigo">
                                <div className="flex items-start justify-between gap-2"><div><p className="text-xs font-semibold text-slate-900 dark:text-white">{book.ebook.title}</p><p className="text-[11px] text-slate-500">{book.ebook.author || book.ebook.format}</p></div>{book.completedAt && <Badge className="border-0 bg-emerald-100 text-emerald-700">Completed</Badge>}</div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-surface-raised"><div className="h-full bg-primary" style={{ width: `${Math.min(100, book.percent)}%` }} /></div>
                                <div className="mt-2 flex justify-between text-[11px] text-slate-500"><span>{book.percent}% read</span><span>{formatReadingTime(book.totalReadingSeconds)} · {book.openCount} open{book.openCount === 1 ? '' : 's'}</span></div>
                              </div>
                            ))}
                          </div>
                        </details>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
