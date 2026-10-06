import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, TrendingUp, AlertTriangle, MessageSquare, Target, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiGet } from '../../lib/api';
import GedStageTracker, { type GedReadinessItem } from '@/components/ged/GedStageTracker';

const CATEGORY_LABELS: Record<string, string> = {
  ASSIGNMENT: 'Assignment', QUIZ: 'Quiz', MIDTERM: 'Midterm', FINAL: 'Final', MOCK_GED: 'Mock GED',
};
const letterColor = (l: string | null) => {
  if (!l) return 'bg-muted text-muted-foreground';
  if (l === 'A+' || l === 'A') return 'bg-emerald-100 text-emerald-700';
  if (l === 'B') return 'bg-blue-100 text-blue-700';
  if (l === 'C') return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
};

interface Progress {
  student: { id: string; name: string; code: string; className: string };
  subjects: { subjectId: string; name: string; categoryAverages: Record<string, number>; average: number | null; letter: string | null; warning: boolean }[];
  termAverage: number | null;
  letter: string | null;
  warnings: string[];
  trend: { date: string; title: string; category: string; percent: number }[];
  comments: { item: string; subject: string; comment: string }[];
  gedReadiness: GedReadinessItem[];
}

export default function StudentProgress() {
  const { studentId } = useParams();
  const [data, setData] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = studentId ? `/api/gradebook/student/${studentId}` : '/api/student/grades';
    apiGet<Progress | null>(url)
      .then((d) => setData(d))
      .catch(() => toast.error('Failed to load progress'))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-muted-foreground">Loading progress…</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        {studentId && (
          <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground" render={<Link to="/gradebook" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Gradebook
          </Button>
        )}
        <div className="bg-card border border-dashed border-border rounded-sm p-10 text-center text-muted-foreground">
          No grade data available yet.
        </div>
      </div>
    );
  }

  const maxTrend = Math.max(100, ...data.trend.map((t) => t.percent));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {studentId && (
        <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground" render={<Link to="/gradebook" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Gradebook
        </Button>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-aubergine-600" /> {studentId ? data.student.name : 'My Progress'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{data.student.className} · {data.student.code}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center px-4 py-2 rounded-sm bg-card border border-border shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Term Average</p>
            <p className="text-2xl font-bold text-foreground">{data.termAverage != null ? `${data.termAverage}%` : '—'}</p>
          </div>
          <Badge className={`${letterColor(data.letter)} border-0 text-base px-3 py-1.5`}>{data.letter || '—'}</Badge>
        </div>
      </div>

      {/* Academic warnings */}
      {data.warnings.length > 0 && (
        <div className="flex items-start gap-3 rounded-sm border border-red-200 bg-red-50 dark:bg-red-900/15 dark:border-red-900/40 p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300">
            <p className="font-bold">Academic warning</p>
            <p>Below passing in: {data.warnings.join(', ')}. Additional support is recommended.</p>
          </div>
        </div>
      )}

      {/* GED readiness */}
      <div className="bg-card border border-border rounded-sm shadow-sm p-6">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2 text-sm"><Target className="h-4 w-4 text-aubergine-600" /> GED Readiness</h3>
        <GedStageTracker readiness={data.gedReadiness} showStats={true} />
      </div>

      {/* Subject averages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.subjects.length === 0 && (
          <div className="md:col-span-2 bg-card border border-dashed border-border rounded-sm p-8 text-center text-muted-foreground">No graded subjects yet.</div>
        )}
        {data.subjects.map((s) => (
          <div key={s.subjectId} className="bg-card border border-border rounded-sm shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-foreground">{s.name}</h4>
              <div className="flex items-center gap-2">
                {s.warning && <AlertTriangle className="h-4 w-4 text-red-500" />}
                <span className="font-bold text-foreground">{s.average != null ? `${s.average}%` : '—'}</span>
                <Badge className={`${letterColor(s.letter)} border-0`}>{s.letter || '—'}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(s.categoryAverages).map(([c, v]) => (
                <span key={c} className="text-xs px-2 py-1 rounded-md bg-muted/50 text-muted-foreground">
                  {CATEGORY_LABELS[c] || c}: <span className="font-semibold">{v}%</span>
                </span>
              ))}
              {Object.keys(s.categoryAverages).length === 0 && <span className="text-xs text-muted-foreground">No marks yet</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Progress trend */}
      {data.trend.length > 0 && (
        <div className="bg-card border border-border rounded-sm shadow-sm p-6">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2 text-sm"><TrendingUp className="h-4 w-4 text-aubergine-600" /> Progress Trend</h3>
          <div className="flex items-end gap-2 h-40 overflow-x-auto">
            {data.trend.map((t, i) => (
              <div key={i} className="flex flex-col items-center gap-1 shrink-0" style={{ width: 44 }} title={`${t.title}: ${t.percent}%`}>
                <span className="text-[11px] font-semibold text-muted-foreground">{t.percent}%</span>
                <div className="w-6 rounded-t bg-aubergine-500" style={{ height: `${(t.percent / maxTrend) * 110}px` }} />
                <span className="text-[11px] text-muted-foreground truncate w-full text-center">{new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Teacher comments */}
      {data.comments.length > 0 && (
        <div className="bg-card border border-border rounded-sm shadow-sm p-6">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2 text-sm"><MessageSquare className="h-4 w-4 text-aubergine-600" /> Teacher Comments</h3>
          <div className="space-y-3">
            {data.comments.map((c, i) => (
              <div key={i} className="border-l-2 border-aubergine-300 pl-3">
                <p className="text-xs font-bold text-muted-foreground">{c.subject} · {c.item}</p>
                <p className="text-sm text-foreground">{c.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
