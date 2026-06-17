import React from 'react';
import { 
  GraduationCap, 
  BarChart3, 
  Trophy, 
  MessageSquare, 
  CheckCircle2, 
  FileText,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

export default function StudentResults() {
  const results = [
    { 
      id: '1', 
      title: 'Term 1 Mid-term Examination', 
      subject: 'Mathematics', 
      score: 92, 
      total: 100, 
      grade: 'A', 
      date: '2024-05-10',
      feedback: 'Excellent problem-solving skills shown in the geometry section. Keep practicing calculus.',
      classAverage: 78
    },
    { 
      id: '2', 
      title: 'Physics Chapter 1 Quiz', 
      subject: 'Physics', 
      score: 18, 
      total: 20, 
      grade: 'A', 
      date: '2024-05-12',
      feedback: 'Great understanding of kinematic equations. Small error in unit conversion in the last question.',
      classAverage: 15
    },
    { 
      id: '3', 
      title: 'History Essay Assessment', 
      subject: 'History', 
      score: 75, 
      total: 100, 
      grade: 'B+', 
      date: '2024-05-05',
      feedback: 'Strong arguments, but needs more citations for primary sources.',
      classAverage: 72
    }
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-emerald-600" />
            My Results & Performance
          </h1>
          <p className="text-sm text-slate-500 mt-1">Review your scores and academic feedback from teachers.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Download Transcript
          </Button>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-slate-200 dark:border-surface-raised shadow-sm bg-white dark:bg-surface-indigo overflow-hidden">
          <CardHeader className="bg-slate-50 dark:bg-surface-raised/50 border-b border-slate-100 dark:border-surface-raised/50">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-600" /> Performance Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="relative h-32 w-32 shrink-0">
                <svg className="h-full w-full transform -rotate-90">
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray="364.4" strokeDashoffset={364.4 * (1 - 0.85)} strokeLinecap="round" className="text-emerald-500" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">85%</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">AVG</span>
                </div>
              </div>
              <div className="flex-1 w-full space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100/50 dark:border-emerald-900/50">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">GPA Equivalent</p>
                      <TrendingUp className="h-3 w-3 text-emerald-600" />
                    </div>
                    <p className="text-lg font-black text-emerald-900 dark:text-white">3.85 / 4.0</p>
                  </div>
                  <div className="p-3 bg-aubergine-50 dark:bg-aubergine-900/20 rounded-xl border border-aubergine-100/50 dark:border-aubergine-900/50">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-bold text-aubergine-700 dark:text-aubergine-400 uppercase tracking-widest">Credits Earned</p>
                      <Trophy className="h-3 w-3 text-aubergine-600" />
                    </div>
                    <p className="text-lg font-black text-aubergine-900 dark:text-white">18.0</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your performance has improved by <span className="font-bold text-emerald-600">4.2%</span> compared to the last term. You are performing particularly well in STEM subjects.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 dark:bg-surface-raised/50 border-b border-slate-100 dark:border-surface-raised/50">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" /> Achievement Highlights
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Math Olympiad Qualifier</p>
                <p className="text-[10px] text-slate-500">Ranked in top 5% of class</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-slate-100 dark:border-surface-raised pt-4">
              <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Perfect Science Quiz</p>
                <p className="text-[10px] text-slate-500">Scored 20/20 in Chapter 3</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results List */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Recent Graded Assessments</h3>
        {results.map((result) => (
          <Card key={result.id} className="border-slate-200 dark:border-surface-raised hover:shadow-md transition-all overflow-hidden bg-white dark:bg-surface-indigo">
            <div className="flex flex-col md:flex-row">
              {/* Left Score Box */}
              <div className="md:w-48 bg-slate-50 dark:bg-surface-raised/50 border-b md:border-b-0 md:border-r border-slate-100 dark:border-surface-raised p-6 flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 rounded-full bg-white dark:bg-surface-raised border-4 border-emerald-500 flex items-center justify-center mb-3 shadow-sm">
                  <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{result.grade}</span>
                </div>
                <p className="text-lg font-black text-slate-900 dark:text-white">{result.score} <span className="text-slate-400 font-normal text-sm">/ {result.total}</span></p>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Pass - {Math.round((result.score/result.total)*100)}%</p>
              </div>

              {/* Main Content Info */}
              <div className="flex-1 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-aubergine-50 text-aubergine-700 dark:bg-aubergine-900/30 dark:text-aubergine-400 uppercase font-bold text-[9px] tracking-widest border-none">
                        {result.subject}
                      </Badge>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Released {result.date}</span>
                    </div>
                    <CardTitle className="text-lg text-slate-900 dark:text-white font-bold">{result.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-surface-raised/50 px-4 py-2 rounded-xl">
                    <div className="text-center">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Class Avg</p>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-300">{result.classAverage}</p>
                    </div>
                    <Separator orientation="vertical" className="h-8" />
                    <div className="text-center">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Position</p>
                      <p className="text-xs font-bold text-emerald-600">Top 10%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-xl border border-dashed border-amber-200 dark:border-amber-900/30">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">Teacher's Feedback</p>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed">"{result.feedback}"</p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-2 text-slate-600 border-slate-200 dark:border-surface-raised">
                    <FileText className="h-3.5 w-3.5" /> View Full Paper
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-aubergine-600 uppercase tracking-widest hover:bg-aubergine-50">
                    Analysis Report <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
