import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import MathText from '../../components/MathText';

type TakeQuestion = {
  id: string;
  type: string;
  questionText: string;
  choices?: string[];
  points: number;
};

const isMultipleChoice = (q: TakeQuestion) =>
  Array.isArray(q.choices) && q.choices.length > 0;

export default function ExamTake() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<TakeQuestion[]>([]);
  const [isMathExam, setIsMathExam] = useState(false);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(60); // minutes
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(60 * 60);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchExam = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch(`/api/exams/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const mapped: TakeQuestion[] = (data.questions || []).map((q: any) => {
          const opts = Array.isArray(q.options) ? q.options : [];
          return {
            id: q.id,
            type: q.type,
            questionText: q.text || '',
            choices: opts.map((o: any) => (typeof o === 'string' ? o : o?.text ?? String(o))),
            points: q.points || 0,
          };
        });
        setQuestions(mapped);
        setIsMathExam(/math/i.test(data.subject?.name ?? ''));
        if (data.durationMinutes) {
          setDuration(data.durationMinutes);
          setTimeLeft(data.durationMinutes * 60);
        }
      } catch (error) {
        console.error('Error fetching exam:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [id]);

  const question = questions[currentIdx];

  // ─── Timer: pure countdown, no side-effects inside the setter ───────────────
  useEffect(() => {
    if (submitted || loading || questions.length === 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted, loading, questions.length]);

  // Auto-submit when the clock hits zero
  useEffect(() => {
    if (timeLeft === 0 && !submitted) {
      setSubmitted(true);
    }
  }, [timeLeft, submitted]);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (value: string) => {
    setAnswers({ ...answers, [question.id]: value });
  };

  const handleExamSubmit = () => {
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-slate-500">Loading exam...</span>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-8 max-w-md w-full text-center shadow-sm">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Exam unavailable</h2>
          <p className="text-sm text-slate-500 mb-6">This exam has no questions yet.</p>
          <Button variant="outline" className="w-full" onClick={() => navigate('/exams')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Exam Submitted!</h2>
          <p className="text-slate-500 mb-6">Your answers have been saved successfully.</p>
          <div className="bg-slate-50 dark:bg-surface-raised/50 p-4 rounded-lg text-sm text-slate-600 dark:text-slate-300 mb-8 space-y-2">
            <div className="flex justify-between">
              <span>Time Taken:</span>
              <span className="font-medium text-slate-900 dark:text-white">{formatTime(3600 - timeLeft)}</span>
            </div>
            <div className="flex justify-between">
              <span>Questions Answered:</span>
              <span className="font-medium text-slate-900 dark:text-white">{Object.keys(answers).length} / {questions.length}</span>
            </div>
          </div>
          <Button className="w-full bg-slate-900 text-white" onClick={() => navigate('/exams')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto min-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-surface-indigo border-b border-slate-200 dark:border-surface-raised p-4 rounded-t-xl flex justify-between items-center shadow-sm">
        <div>
          <h1 className="font-bold text-slate-900 dark:text-white">Exam Preview</h1>
          <p className="text-xs text-slate-500">Student preview mode</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-lg font-bold ${
          timeLeft < 300 ? 'bg-red-100 text-red-600' : 'bg-slate-100 dark:bg-surface-raised text-slate-700 dark:text-slate-300'
        }`}>
          <Clock className="w-5 h-5" />
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 p-6 bg-slate-50 dark:bg-[#09090b]">
        {/* Main QA Area */}
        <div className="flex-1 flex flex-col">
          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm flex-1">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-surface-raised pb-4">
              <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Question {currentIdx + 1} of {questions.length}</h2>
              <span className="text-sm font-medium bg-slate-100 dark:bg-surface-raised px-3 py-1 rounded-full text-slate-600 dark:text-slate-300">
                {question.points} Points
              </span>
            </div>
            
            <div className="prose dark:prose-invert max-w-none mb-8">
              <p className="text-xl font-medium text-slate-900 dark:text-white leading-relaxed">
                {isMathExam ? <MathText>{question.questionText}</MathText> : question.questionText}
              </p>
            </div>

            <div className="mt-8">
              {isMultipleChoice(question) ? (
                <RadioGroup 
                  value={answers[question.id] || ''} 
                  onValueChange={handleAnswerChange}
                  className="space-y-3"
                >
                  {question.choices?.map((choice, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center space-x-3 border p-4 rounded-lg cursor-pointer transition-colors ${
                        answers[question.id] === choice 
                          ? 'border-aubergine-600 bg-aubergine-50 dark:bg-aubergine-900/10' 
                          : 'border-slate-200 dark:border-surface-raised hover:border-slate-300'
                      }`}
                      onClick={() => handleAnswerChange(choice)}
                    >
                      <RadioGroupItem value={choice} id={`choice-${idx}`} className="text-aubergine-600" />
                      <Label htmlFor={`choice-${idx}`} className="flex-1 cursor-pointer text-base font-normal">
                        {isMathExam ? <MathText>{choice}</MathText> : choice}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-4">
                  <Textarea 
                    placeholder="Type your answer here..." 
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    className="min-h-[200px] resize-y text-base p-4"
                  />
                  <p className="text-sm text-slate-500 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> This question requires manual grading.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-between items-center">
            <Button 
              variant="outline" 
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="py-6 px-6"
            >
              <ChevronLeft className="mr-2 h-5 w-5" /> Previous
            </Button>

            {currentIdx === questions.length - 1 ? (
              <Button onClick={handleExamSubmit} className="bg-primary hover:bg-primary/90 text-primary-foreground py-6 px-10 text-lg">
                Submit Exam
              </Button>
            ) : (
              <Button 
                onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                className="bg-slate-900 text-white hover:bg-slate-800 py-6 px-8"
              >
                Next <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 flex flex-col gap-4">
          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Questions</h3>
            <div className="grid grid-cols-5 md:grid-cols-4 gap-2">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-10 w-10 rounded-md font-medium text-sm transition-colors flex items-center justify-center ${
                    currentIdx === idx 
                      ? 'ring-2 ring-aubergine-600 ring-offset-2 dark:ring-offset-slate-900 bg-aubergine-100 text-aubergine-700 font-bold' 
                      : answers[q.id] 
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' 
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-surface-raised dark:hover:bg-slate-700'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            
            <div className="mt-8 space-y-3 border-t border-slate-100 dark:border-surface-raised pt-4">
              <div className="flex items-center text-sm gap-2 text-slate-600">
                <div className="w-4 h-4 rounded-sm bg-slate-800"></div> Answered
              </div>
              <div className="flex items-center text-sm gap-2 text-slate-600">
                <div className="w-4 h-4 rounded-sm bg-slate-100 border border-slate-200"></div> Unanswered
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
