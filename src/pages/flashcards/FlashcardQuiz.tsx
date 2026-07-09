import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Brain, CheckCircle2, XCircle, RotateCw, Grid3x3, SpellCheck, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { apiGet, apiSend } from '../../lib/api';
import { MathText } from '@/src/components/MathText';

type QType = 'MC' | 'TF' | 'FILL';

interface CardT { id: string; term: string; definition: string; imageUrl?: string | null }
interface DeckDetail { id: string; title: string; cards: CardT[] }
interface Question {
  cardId: string;
  type: QType;
  term: string;
  definition: string;
  imageUrl?: string | null;
  candidateDefinition?: string; // TF only -- the definition being tested
  isMatchTrue?: boolean;        // TF only -- whether candidateDefinition is actually correct
  choices?: string[];           // MC: shuffled definitions; TF: ['True', 'False']
}
interface AnsweredRecord { type: QType; term: string; correct: string; picked: string; isCorrect: boolean }

const TYPE_OPTIONS: { key: QType; label: string; desc: string }[] = [
  { key: 'MC', label: 'Multiple Choice', desc: 'Pick the correct definition from four options' },
  { key: 'TF', label: 'True / False', desc: 'Say whether the shown definition matches the term' },
  { key: 'FILL', label: 'Fill in the Blank', desc: 'Type the term from its definition' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Loose-but-meaningful equality for the Fill-in-the-Blank type, same rule as Spelling mode.
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function correctAnswerFor(q: Question): string {
  if (q.type === 'MC') return q.definition;
  if (q.type === 'TF') return q.isMatchTrue ? 'True' : 'False';
  return q.term;
}

function buildQuestions(cards: CardT[], types: QType[]): Question[] {
  const pool = shuffle(cards);
  return pool.map((card) => {
    const type = types[Math.floor(Math.random() * types.length)];
    if (type === 'MC') {
      const others = cards.filter((c) => c.id !== card.id).map((c) => c.definition);
      const distractors = shuffle(others).slice(0, 3);
      return {
        cardId: card.id, type, term: card.term, definition: card.definition, imageUrl: card.imageUrl,
        choices: shuffle([card.definition, ...distractors]),
      };
    }
    if (type === 'TF') {
      const others = cards.filter((c) => c.id !== card.id);
      const isMatchTrue = others.length === 0 ? true : Math.random() < 0.5;
      const candidateDefinition = isMatchTrue ? card.definition : others[Math.floor(Math.random() * others.length)].definition;
      return {
        cardId: card.id, type, term: card.term, definition: card.definition, imageUrl: card.imageUrl,
        candidateDefinition, isMatchTrue, choices: ['True', 'False'],
      };
    }
    return { cardId: card.id, type: 'FILL' as const, term: card.term, definition: card.definition, imageUrl: card.imageUrl };
  });
}

export default function FlashcardQuiz() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isStudentRoute = location.pathname.startsWith('/student/');
  const listUrl = isStudentRoute ? '/student/flashcards' : '/flashcards';
  const studyUrl = isStudentRoute ? `/student/flashcards/${id}` : `/flashcards/${id}/study`;
  const matchUrl = isStudentRoute ? `/student/flashcards/${id}/match` : `/flashcards/${id}/match`;
  const spellUrl = isStudentRoute ? `/student/flashcards/${id}/spell` : `/flashcards/${id}/spell`;

  const [deck, setDeck] = useState<DeckDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabledTypes, setEnabledTypes] = useState<QType[]>(['MC', 'TF', 'FILL']);
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState<{ value: string; isCorrect: boolean } | null>(null);
  const [textDraft, setTextDraft] = useState('');
  const [answers, setAnswers] = useState<AnsweredRecord[]>([]);
  const [finished, setFinished] = useState(false);
  const [bestScore, setBestScore] = useState<{ score: number; total: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    apiGet<DeckDetail>(`/api/flashcards/decks/${id}`)
      .then((d) => setDeck(d))
      .catch((e: any) => toast.error(e?.message || 'Failed to load deck'))
      .finally(() => setLoading(false));
    if (isStudentRoute) loadBest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadBest = () => {
    if (!id) return;
    apiGet<{ bestByMode: Record<string, { score: number; total: number }> }>(`/api/flashcards/decks/${id}/attempts`)
      .then((r) => setBestScore(r?.bestByMode?.QUIZ ? { score: r.bestByMode.QUIZ.score, total: r.bestByMode.QUIZ.total } : null))
      .catch(() => {});
  };

  const toggleType = (t: QType) => {
    setEnabledTypes((prev) => (prev.includes(t) ? (prev.length > 1 ? prev.filter((x) => x !== t) : prev) : [...prev, t]));
  };

  const startQuiz = () => {
    if (!deck) return;
    setQuestions(buildQuestions(deck.cards, enabledTypes));
    setIndex(0); setAnswered(null); setTextDraft(''); setAnswers([]); setFinished(false);
    setStarted(true);
  };

  const current = questions[index];
  const score = useMemo(() => answers.filter((a) => a.isCorrect).length, [answers]);

  const submitChoice = (value: string) => {
    if (answered || !current) return;
    const correct = correctAnswerFor(current);
    const isCorrect = value === correct;
    setAnswered({ value, isCorrect });
    setAnswers((prev) => [...prev, { type: current.type, term: current.term, correct, picked: value, isCorrect }]);
  };

  const submitFill = () => {
    if (answered || !current || !textDraft.trim()) return;
    const correct = correctAnswerFor(current);
    const isCorrect = normalize(textDraft) === normalize(correct);
    setAnswered({ value: textDraft, isCorrect });
    setAnswers((prev) => [...prev, { type: current.type, term: current.term, correct, picked: textDraft, isCorrect }]);
  };

  const next = () => {
    setAnswered(null); setTextDraft('');
    if (index + 1 >= questions.length) {
      const finalScore = answers.filter((a) => a.isCorrect).length;
      setFinished(true);
      if (isStudentRoute && id) {
        apiSend(`/api/flashcards/decks/${id}/attempts`, 'POST', { mode: 'QUIZ', score: finalScore, total: questions.length })
          .then(loadBest)
          .catch(() => {});
      }
      return;
    }
    setIndex((i) => i + 1);
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
          <Button size="sm" variant="outline" render={<Link to={spellUrl} />}><SpellCheck className="mr-1.5 h-3.5 w-3.5" /> Spell</Button>
        </div>
      </div>

      {!started ? (
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-aubergine-600" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Question types</h2>
          </div>
          <div className="space-y-2">
            {TYPE_OPTIONS.map((opt) => (
              <label key={opt.key} className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-surface-raised px-3 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-surface-raised/50">
                <Checkbox checked={enabledTypes.includes(opt.key)} onCheckedChange={() => toggleType(opt.key)} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{opt.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-400">Each of the deck's {deck.cards.length} cards becomes one question, randomly using one of the types you've checked.</p>
          <Button onClick={startQuiz} className="w-full">Start Quiz</Button>
        </div>
      ) : finished ? (
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-8 text-center space-y-4">
          <p className="text-sm text-slate-500 uppercase tracking-widest font-semibold">Quiz Complete</p>
          <p className="text-4xl font-bold text-aubergine-600">{score} / {questions.length}</p>
          <p className="text-sm text-slate-500">{Math.round((score / questions.length) * 100)}% correct</p>
          {isStudentRoute && bestScore && (
            <p className="text-xs text-slate-400">Personal best: {bestScore.score} / {bestScore.total} ({Math.round((bestScore.score / bestScore.total) * 100)}%)</p>
          )}

          {answers.some((a) => !a.isCorrect) && (
            <div className="text-left mt-6 space-y-2">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Review missed questions</p>
              {answers.filter((a) => !a.isCorrect).map((a, i) => (
                <div key={i} className="rounded-lg border border-rose-200 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-900/10 p-3 text-sm">
                  <p className="font-medium text-slate-800 dark:text-slate-200">{a.term}</p>
                  <p className="text-rose-600">Your answer: {a.picked || '(nothing)'}</p>
                  <p className="text-emerald-600">Correct: {a.correct}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => setStarted(false)}><Settings2 className="mr-2 h-4 w-4" /> Change Types</Button>
            <Button variant="outline" onClick={startQuiz}><RotateCw className="mr-2 h-4 w-4" /> Retake Quiz</Button>
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
            {current.imageUrl && (
              <img src={current.imageUrl} alt="" className="max-h-32 mx-auto mb-4 rounded-lg object-contain" />
            )}

            {current.type === 'MC' && (
              <>
                <p className="text-lg font-semibold text-slate-900 dark:text-white text-center mb-6"><MathText>{current.term}</MathText></p>
                <div className="grid grid-cols-1 gap-3">
                  {(current.choices ?? []).map((choice) => {
                    const isPicked = answered?.value === choice;
                    const isCorrect = choice === current.definition;
                    const showState = !!answered;
                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => submitChoice(choice)}
                        disabled={!!answered}
                        className={`text-left rounded-lg border px-4 py-3 text-sm transition-colors ${
                          showState && isCorrect ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-800 dark:text-emerald-300' :
                          showState && isPicked && !isCorrect ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-300' :
                          'border-slate-200 dark:border-surface-raised hover:border-aubergine-300 hover:bg-slate-50 dark:hover:bg-surface-raised/50 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <MathText>{choice}</MathText>
                          {showState && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
                          {showState && isPicked && !isCorrect && <XCircle className="h-4 w-4 shrink-0 text-rose-600" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {current.type === 'TF' && (
              <>
                <p className="text-xs uppercase tracking-widest text-slate-400 text-center mb-2">Does this definition match the term?</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white text-center mb-2"><MathText>{current.term}</MathText></p>
                <p className="text-slate-600 dark:text-slate-300 text-center mb-6"><MathText>{current.candidateDefinition ?? ''}</MathText></p>
                <div className="grid grid-cols-2 gap-3">
                  {(current.choices ?? []).map((choice) => {
                    const isPicked = answered?.value === choice;
                    const isCorrect = choice === correctAnswerFor(current);
                    const showState = !!answered;
                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => submitChoice(choice)}
                        disabled={!!answered}
                        className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                          showState && isCorrect ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-800 dark:text-emerald-300' :
                          showState && isPicked && !isCorrect ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-300' :
                          'border-slate-200 dark:border-surface-raised hover:border-aubergine-300 hover:bg-slate-50 dark:hover:bg-surface-raised/50 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {current.type === 'FILL' && (
              <>
                <p className="text-xs uppercase tracking-widest text-slate-400 text-center mb-2">Type the term for this definition</p>
                <p className="text-slate-700 dark:text-slate-200 text-center mb-6"><MathText>{current.definition}</MathText></p>
                <Input
                  value={textDraft}
                  onChange={(e) => setTextDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { answered ? next() : submitFill(); } }}
                  placeholder="Type your answer…"
                  disabled={!!answered}
                  className={`text-center text-lg ${answered ? (answered.isCorrect ? 'border-emerald-400' : 'border-rose-400') : ''}`}
                  autoComplete="off"
                />
                {answered && (
                  <p className={`text-center text-sm font-medium mt-3 flex items-center justify-center gap-1.5 ${answered.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {answered.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {answered.isCorrect ? 'Correct!' : `Correct answer: ${current.term}`}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end">
            {current.type === 'FILL' && !answered ? (
              <Button onClick={submitFill} disabled={!textDraft.trim()}>Check Answer</Button>
            ) : (
              <Button onClick={next} disabled={!answered}>
                {index + 1 >= questions.length ? 'Finish' : 'Next Question'}
              </Button>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
