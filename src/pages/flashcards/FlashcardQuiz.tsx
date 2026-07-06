import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Brain, CheckCircle2, XCircle, RotateCw, Grid3x3 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { apiGet } from '../../lib/api';

interface CardT { id: string; term: string; definition: string }
interface DeckDetail { id: string; title: string; cards: CardT[] }
interface Question { cardId: string; term: string; correct: string; choices: string[] }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestions(cards: CardT[]): Question[] {
  const pool = shuffle(cards);
  return pool.map((card) => {
    const others = cards.filter((c) => c.id !== card.id).map((c) => c.definition);
    const distractors = shuffle(others).slice(0, 3);
    return { cardId: card.id, term: card.term, correct: card.definition, choices: shuffle([card.definition, ...distractors]) };
  });
}

export default function FlashcardQuiz() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isStudentRoute = location.pathname.startsWith('/student/');
  const listUrl = isStudentRoute ? '/student/flashcards' : '/flashcards';
  const studyUrl = isStudentRoute ? `/student/flashcards/${id}` : `/flashcards/${id}/study`;
  const matchUrl = isStudentRoute ? `/student/flashcards/${id}/match` : `/flashcards/${id}/match`;

  const [deck, setDeck] = useState<DeckDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ term: string; correct: string; picked: string }[]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiGet<DeckDetail>(`/api/flashcards/decks/${id}`)
      .then((d) => { setDeck(d); setQuestions(buildQuestions(d.cards || [])); })
      .catch((e: any) => toast.error(e?.message || 'Failed to load deck'))
      .finally(() => setLoading(false));
  }, [id]);

  const current = questions[index];
  const score = useMemo(() => answers.filter((a) => a.picked === a.correct).length, [answers]);

  const pickAnswer = (choice: string) => {
    if (selected) return; // already answered this question
    setSelected(choice);
    setAnswers((prev) => [...prev, { term: current.term, correct: current.correct, picked: choice }]);
  };

  const next = () => {
    if (index + 1 >= questions.length) { setFinished(true); return; }
    setIndex((i) => i + 1);
    setSelected(null);
  };

  const restart = () => {
    if (!deck) return;
    setQuestions(buildQuestions(deck.cards));
    setIndex(0); setSelected(null); setAnswers([]); setFinished(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="animate-spin rounded-full h-6 w-6 border-2 border-aubergine-600 border-t-transparent mr-2"></span>
        <span className="text-slate-500">Loading quiz…</span>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>Deck not found, or it isn't assigned to your class.</p>
        <Button variant="outline" className="mt-4" render={<Link to={listUrl} />}>Back to Flashcards</Button>
      </div>
    );
  }

  if (deck.cards.length < 2) {
    return (
      <div className="max-w-xl mx-auto text-center py-12 text-slate-500 space-y-4">
        <Brain className="h-10 w-10 mx-auto text-slate-300" />
        <p>Quiz mode needs at least 2 cards in this deck.</p>
        <Button variant="outline" render={<Link to={listUrl} />}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Flashcards</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" render={<Link to={listUrl} />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-[160px]">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Brain className="h-5 w-5 text-aubergine-600" /> {deck.title} — Quiz
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" render={<Link to={studyUrl} />}>Study</Button>
          <Button size="sm" variant="outline" render={<Link to={matchUrl} />}><Grid3x3 className="mr-1.5 h-3.5 w-3.5" /> Match</Button>
        </div>
      </div>

      {finished ? (
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-8 text-center space-y-4">
          <p className="text-sm text-slate-500 uppercase tracking-widest font-semibold">Quiz Complete</p>
          <p className="text-4xl font-bold text-aubergine-600">{score} / {questions.length}</p>
          <p className="text-sm text-slate-500">{Math.round((score / questions.length) * 100)}% correct</p>

          {answers.some((a) => a.picked !== a.correct) && (
            <div className="text-left mt-6 space-y-2">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Review missed questions</p>
              {answers.filter((a) => a.picked !== a.correct).map((a, i) => (
                <div key={i} className="rounded-lg border border-rose-200 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-900/10 p-3 text-sm">
                  <p className="font-medium text-slate-800 dark:text-slate-200">{a.term}</p>
                  <p className="text-rose-600">Your answer: {a.picked}</p>
                  <p className="text-emerald-600">Correct: {a.correct}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" onClick={restart}><RotateCw className="mr-2 h-4 w-4" /> Retake Quiz</Button>
            <Button render={<Link to={listUrl} />}>Back to Flashcards</Button>
          </div>
        </div>
      ) : current ? (
        <>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-surface-raised rounded-full overflow-hidden">
            <div className="h-full bg-aubergine-500 rounded-full transition-all" style={{ width: `${Math.round(((index) / questions.length) * 100)}%` }} />
          </div>
          <p className="text-center text-sm text-slate-500">Question {index + 1} of {questions.length}</p>

          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-8">
            <p className="text-lg font-semibold text-slate-900 dark:text-white text-center mb-6">{current.term}</p>
            <div className="grid grid-cols-1 gap-3">
              {current.choices.map((choice) => {
                const isPicked = selected === choice;
                const isCorrect = choice === current.correct;
                const showState = !!selected;
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => pickAnswer(choice)}
                    disabled={!!selected}
                    className={`text-left rounded-lg border px-4 py-3 text-sm transition-colors ${
                      showState && isCorrect ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-800 dark:text-emerald-300' :
                      showState && isPicked && !isCorrect ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-300' :
                      'border-slate-200 dark:border-surface-raised hover:border-aubergine-300 hover:bg-slate-50 dark:hover:bg-surface-raised/50 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      {choice}
                      {showState && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
                      {showState && isPicked && !isCorrect && <XCircle className="h-4 w-4 shrink-0 text-rose-600" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={next} disabled={!selected}>
              {index + 1 >= questions.length ? 'Finish' : 'Next Question'}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
