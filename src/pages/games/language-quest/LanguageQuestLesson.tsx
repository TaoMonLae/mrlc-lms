import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { ArrowLeft, BookA, Flame, Heart, Lightbulb, Mic, PartyPopper, PencilLine, SpellCheck2, Square, Star, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ApiError, apiGet, apiSend } from '@/src/lib/api';
import type { LanguageQuestLessonPayload, LanguageQuestLessonPreview, LanguageQuestProfile } from '@/src/types/languageQuest';
import { isChineseLanguage, languageQuestAnswerMatches } from '@/shared/languageQuestPinyin';
import { useLanguageQuestSupport } from '@/src/components/games/LanguageQuestSupport';
import { LanguageQuestPinyinText } from '@/src/components/games/LanguageQuestPinyinText';
import { LanguageQuestPhaseStepper } from '@/src/components/games/LanguageQuestPhaseStepper';
import { LanguageQuestCompanion } from '@/src/components/games/LanguageQuestCompanion';
import { LanguageQuestRewardReveal } from '@/src/components/games/LanguageQuestRewards';
import { useLanguageQuestPreferences } from '@/src/components/games/LanguageQuestPreferences';
import { playLanguageQuestSuccessSound } from '@/src/lib/languageQuestAudio';
import {
  cancelLanguageQuestVoice,
  speakLanguageQuestVoice,
} from '@/src/lib/languageQuestVoice';
import {
  languageQuestSpeechInputSupported,
  languageQuestSpeechLocale,
  listenForLanguageQuestSpeech,
  type LanguageQuestSpeechSession,
} from '@/src/lib/languageQuestSpeechInput';

// A quick-access mute toggle repeated in every lesson-phase header, right
// next to the exit button, so sound can be turned off mid-lesson without a
// trip to the Profile preferences page.
function SoundToggleButton({ soundEnabled, onToggle }: { soundEnabled: boolean; onToggle: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-label={soundEnabled ? 'Mute lesson sounds' : 'Unmute lesson sounds'}
      title={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
      className="text-slate-400 hover:text-slate-600"
    >
      {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </Button>
  );
}

interface AnswerResult {
  correct: boolean;
  correctOptionId: string;
  correctAnswer: string;
  pointsAwarded: number;
  profile: LanguageQuestProfile;
  unlockedRewardIds: string[];
}

export default function LanguageQuestLesson() {
  const { explanationLanguage, lq } = useLanguageQuestSupport();
  const { soundEnabled, setSoundEnabled, reducedMotion, voiceProvider } = useLanguageQuestPreferences();
  const { lessonId } = useParams<{ lessonId: string }>();
  const [lesson, setLesson] = useState<LanguageQuestLessonPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answer, setAnswer] = useState<AnswerResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [profile, setProfile] = useState<LanguageQuestProfile | null>(null);
  const [phase, setPhase] = useState<'learn' | 'spelling' | 'sentence' | 'quiz'>('learn');
  const [preview, setPreview] = useState<LanguageQuestLessonPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [combo, setCombo] = useState(0);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [sentenceInput, setSentenceInput] = useState('');
  const [sentenceFeedback, setSentenceFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [spellingIndex, setSpellingIndex] = useState(0);
  const [spellingInput, setSpellingInput] = useState('');
  const [spellingFeedback, setSpellingFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [listening, setListening] = useState(false);
  const speechSessionRef = useRef<LanguageQuestSpeechSession | null>(null);
  const [unlockedRewardId, setUnlockedRewardId] = useState<string | null>(null);
  const [rewardRevealOpen, setRewardRevealOpen] = useState(false);
  const speak = (value: string, language: string) => {
    void speakLanguageQuestVoice(value, language, voiceProvider).then((result) => {
      if (result === 'unavailable') toast.info('Speech is not supported by this browser');
    });
  };

  useEffect(() => {
    if (!lessonId) return;
    setPhase('learn');
    setPreviewIndex(0);
    setIndex(0);
    setSelectedId(null);
    setAnswer(null);
    setSessionPoints(0);
    setCombo(0);
    setSentenceIndex(0);
    setSentenceInput('');
    setSentenceFeedback(null);
    setSpellingIndex(0);
    setSpellingInput('');
    setSpellingFeedback(null);
    setUnlockedRewardId(null);
    setRewardRevealOpen(false);
    speechSessionRef.current?.stop();
    setListening(false);

    apiGet<LanguageQuestLessonPayload>(`/api/language-quest/lessons/${lessonId}`)
      .then((payload) => { setLesson(payload); setProfile(payload.profile); })
      .catch((error: any) => toast.error(error?.message || 'Could not load the lesson'))
      .finally(() => setLoading(false));

    setPreviewLoading(true);
    apiGet<LanguageQuestLessonPreview>(`/api/language-quest/lessons/${lessonId}/preview`)
      .then(setPreview)
      .catch(() => setPreview(null))
      .finally(() => setPreviewLoading(false));

    return () => {
      cancelLanguageQuestVoice();
      speechSessionRef.current?.stop();
    };
  }, [lessonId]);

  // Nothing to teach (or the preview failed to load) — go straight to the quiz.
  useEffect(() => {
    if (phase === 'learn' && !previewLoading && (!preview || preview.cards.length === 0)) {
      setPhase('quiz');
    }
  }, [phase, previewLoading, preview]);

  const challenge = lesson?.challenges[index];
  const progressPercent = lesson ? Math.round((Math.min(index, lesson.challenges.length) / lesson.challenges.length) * 100) : 0;
  const finished = Boolean(lesson && index >= lesson.challenges.length);
  const cards = preview?.cards ?? [];
  const card = cards[previewIndex];
  const sentenceCards = useMemo(
    () => cards.filter((candidate) => candidate.text.trim().split(/\s+/).length >= 2),
    [cards],
  );
  const spellingCards = useMemo(
    () => cards.filter((candidate) => candidate.text.trim().length > 0),
    [cards],
  );
  const sentenceCard = sentenceCards[sentenceIndex];
  const spellingCard = spellingCards[spellingIndex];
  // Practising an already-completed challenge is how hearts get refilled, so
  // only gate challenges the learner hasn't cleared yet (matches the server
  // check in the answer endpoint).
  const outOfHearts = Boolean(challenge && !challenge.completed && (profile?.hearts ?? 1) <= 0);

  const optionLetters = useMemo(() => ['A', 'B', 'C', 'D', 'E', 'F'], []);
  const speechSupported = useMemo(() => languageQuestSpeechInputSupported(), []);
  const celebrate = (options: Parameters<typeof confetti>[0]) => {
    if (!reducedMotion) void confetti(options);
  };

  const startPractice = () => {
    celebrate({ particleCount: 60, spread: 65, origin: { y: 0.7 }, colors: [lesson?.course.accentColor || '#7c3aed', '#ffffff'] });
    setPhase(spellingCards.length ? 'spelling' : sentenceCards.length ? 'sentence' : 'quiz');
    const firstSpellingCard = spellingCards[0];
    if (firstSpellingCard && lesson) {
      speak(firstSpellingCard.audioText || firstSpellingCard.text, lesson.course.language);
    }
  };

  const continueAfterSpelling = () => {
    setPhase(sentenceCards.length ? 'sentence' : 'quiz');
  };

  // Optional spoken-answer input: the recognized transcript just gets typed
  // into the same spelling input, so it's graded by the exact same
  // pinyin/Hanzi-aware matching -- no separate speech-scoring path to keep
  // in sync with checkSpelling().
  const toggleSpellingListening = () => {
    if (listening) {
      speechSessionRef.current?.stop();
      return;
    }
    if (!lesson) return;
    const session = listenForLanguageQuestSpeech(languageQuestSpeechLocale(lesson.course.language), {
      onResult: (transcript) => {
        if (transcript.trim()) {
          setSpellingInput(transcript.trim());
          setSpellingFeedback(null);
        }
      },
      onEnd: () => setListening(false),
      onError: (message) => {
        toast.error(message);
        setListening(false);
      },
    });
    if (!session) {
      toast.info('Voice input is not supported by this browser');
      return;
    }
    speechSessionRef.current = session;
    setListening(true);
  };

  const checkSpelling = () => {
    if (!spellingCard || !spellingInput.trim()) return;
    const correct = languageQuestAnswerMatches(spellingInput, spellingCard.text);
    setSpellingFeedback(correct ? 'correct' : 'incorrect');
    if (correct) {
      if (soundEnabled) playLanguageQuestSuccessSound();
      celebrate({ particleCount: 30, spread: 48, origin: { y: 0.72 }, scalar: 0.72, colors: [lesson?.course.accentColor || '#7c3aed', '#f59e0b'] });
    }
  };

  const continueSpelling = () => {
    if (spellingFeedback !== 'correct') return;
    if (spellingIndex + 1 < spellingCards.length) {
      const nextIndex = spellingIndex + 1;
      setSpellingIndex(nextIndex);
      setSpellingInput('');
      setSpellingFeedback(null);
      const nextCard = spellingCards[nextIndex];
      if (nextCard && lesson) speak(nextCard.audioText || nextCard.text, lesson.course.language);
      return;
    }
    continueAfterSpelling();
  };

  const checkSentence = () => {
    if (!sentenceCard || !sentenceInput.trim()) return;
    const correct = languageQuestAnswerMatches(sentenceInput, sentenceCard.text);
    setSentenceFeedback(correct ? 'correct' : 'incorrect');
    if (correct) {
      if (soundEnabled) playLanguageQuestSuccessSound();
      celebrate({ particleCount: 28, spread: 45, origin: { y: 0.72 }, scalar: 0.7, colors: [lesson?.course.accentColor || '#7c3aed'] });
    }
  };

  const continueSentence = () => {
    if (sentenceFeedback !== 'correct') return;
    if (sentenceIndex + 1 < sentenceCards.length) {
      setSentenceIndex((current) => current + 1);
      setSentenceInput('');
      setSentenceFeedback(null);
      return;
    }
    setPhase('quiz');
  };

  const checkAnswer = async () => {
    if (!challenge || !selectedId || checking || answer) return;
    setChecking(true);
    try {
      const result = await apiSend<AnswerResult>(`/api/language-quest/challenges/${challenge.id}/answer`, 'POST', { optionId: selectedId });
      setAnswer(result);
      setProfile(result.profile);
      if (result.correct) {
        if (soundEnabled) playLanguageQuestSuccessSound();
        setSessionPoints((current) => current + result.pointsAwarded);
        setCombo((current) => current + 1);
        celebrate({ particleCount: 40, spread: 55, origin: { y: 0.65 }, scalar: 0.8, colors: [lesson?.course.accentColor || '#7c3aed'] });
        const newestRewardId = result.unlockedRewardIds.at(-1);
        if (newestRewardId) {
          setUnlockedRewardId(newestRewardId);
          setRewardRevealOpen(true);
          celebrate({
            particleCount: 150,
            spread: 95,
            origin: { y: 0.58 },
            colors: ['#fbbf24', '#a855f7', '#22d3ee', '#f472b6'],
          });
        }
      } else {
        setCombo(0);
      }
    } catch (error: any) {
      if (error instanceof ApiError && error.code === 'OUT_OF_HEARTS') {
        if (error.data?.profile) setProfile(error.data.profile);
        toast.error(error.message);
      } else {
        toast.error(error?.message || 'Could not check that answer');
      }
    } finally {
      setChecking(false);
    }
  };

  const continueLesson = () => {
    if (!answer) return;
    if (answer.correct) setIndex((current) => current + 1);
    setSelectedId(null);
    setAnswer(null);
  };

  // Re-fetch the lesson before replaying it: the local `lesson.challenges[].completed`
  // flags and `profile.hearts` were only ever set on the initial page load and never
  // updated as challenges were answered in this session, so without a refetch they'd
  // stay stale (e.g. still reporting `completed: false` for challenges just cleared).
  // That stale state feeds `outOfHearts` below and can misjudge whether a replay
  // should be allowed, diverging from the server's authoritative state.
  const practiseAgain = async () => {
    if (!lessonId) return;
    try {
      const payload = await apiGet<LanguageQuestLessonPayload>(`/api/language-quest/lessons/${lessonId}`);
      setLesson(payload);
      setProfile(payload.profile);
    } catch (error: any) {
      toast.error(error?.message || 'Could not refresh the lesson');
    }
    setIndex(0);
    setSessionPoints(0);
    setSelectedId(null);
    setAnswer(null);
    setCombo(0);
    setUnlockedRewardId(null);
    setRewardRevealOpen(false);
  };

  // Celebrate finishing the lesson with a bigger burst.
  useEffect(() => {
    if (!finished) return;
    celebrate({ particleCount: 140, spread: 90, origin: { y: 0.6 }, colors: [lesson?.course.accentColor || '#7c3aed', '#f59e0b', '#10b981'] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  // Keyboard shortcuts: arrows/space to browse flashcards in learn mode,
  // number or letter keys to pick an answer and Enter to confirm/continue
  // in quiz mode. Keeps the pace up for learners who'd rather not reach for
  // the mouse every time.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      if (loading || !lesson) return;

      if (phase === 'learn') {
        if (event.key === 'ArrowRight' || event.key === 'Enter') {
          event.preventDefault();
          if (previewIndex + 1 < cards.length) setPreviewIndex((current) => current + 1);
          else if (cards.length) startPractice();
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          setPreviewIndex((current) => Math.max(0, current - 1));
        } else if (event.key === ' ' && card) {
          event.preventDefault();
          speak(card.audioText || card.text, lesson.course.language);
        }
        return;
      }

      if (phase === 'sentence' && event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (sentenceFeedback === 'correct') continueSentence();
        else checkSentence();
        return;
      }

      if (phase === 'spelling' && event.key === ' ' && spellingCard) {
        event.preventDefault();
        speak(spellingCard.audioText || spellingCard.text, lesson.course.language);
        return;
      }

      if (phase === 'quiz' && challenge && !finished && !outOfHearts) {
        const letterIndex = optionLetters.indexOf(event.key.toUpperCase());
        const numberIndex = Number(event.key) - 1;
        const optionIndex = letterIndex >= 0 ? letterIndex : numberIndex;
        if (!answer && optionIndex >= 0 && optionIndex < challenge.options.length) {
          event.preventDefault();
          setSelectedId(challenge.options[optionIndex].id);
          return;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          if (answer) continueLesson();
          else if (selectedId && !checking) checkAnswer();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, loading, lesson, previewIndex, cards.length, card, challenge, answer, selectedId, finished, outOfHearts, optionLetters, checking, sentenceFeedback, sentenceInput, sentenceCard, sentenceCards.length, sentenceIndex, spellingCard]);

  if (loading) {
    return <div className="grid min-h-[520px] place-items-center"><div className="h-11 w-11 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" /></div>;
  }

  if (!lesson) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-surface-raised dark:bg-surface-indigo">
        <p className="font-semibold text-slate-900 dark:text-white">This lesson is unavailable.</p>
        <Button className="mt-4" variant="outline" render={<Link to="/games/language-quest" />} nativeButton={false}>Back to Language Quest</Button>
      </div>
    );
  }

  if (phase === 'learn') {
    const learnProgress = cards.length ? Math.round((previewIndex / cards.length) * 100) : 0;
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-3xl flex-col pb-6">
        <header className="flex items-center gap-3 py-2 sm:gap-5">
          <Button variant="ghost" size="icon" aria-label="Exit lesson" render={<Link to={`/games/language-quest/courses/${lesson.course.id}`} />} nativeButton={false}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <SoundToggleButton soundEnabled={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} />
          <Progress value={learnProgress} className="flex-1 [&_[data-slot=progress-track]]:h-3 [&_[data-slot=progress-indicator]]:bg-sky-500" />
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600" onClick={startPractice}>Skip learning</Button>
        </header>
        <LanguageQuestPhaseStepper phase="learn" hasSpelling={spellingCards.length > 0} hasSentence={sentenceCards.length > 0} accentColor={lesson.course.accentColor} />

        <main className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          {previewLoading || !card ? (
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" />
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">Learn • {previewIndex + 1} of {cards.length}</p>
              <button
                type="button"
                onClick={() => speak(card.audioText || card.text, lesson.course.language)}
                className="mt-8 flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl border-2 border-slate-200 bg-white px-10 py-12 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md dark:border-surface-raised dark:bg-surface-indigo"
              >
                {card.emoji && <span className="text-6xl" aria-hidden="true">{card.emoji}</span>}
                <span className="font-black text-slate-900 dark:text-white">
                  <LanguageQuestPinyinText text={card.text} pinyin={card.pinyin} size="lg" />
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-sky-600"><Volume2 className="h-3.5 w-3.5" /> Tap to listen</span>
              </button>
              <div className="mt-6 max-w-lg rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4 text-left dark:border-sky-500/20 dark:bg-sky-500/10">
                <p lang={explanationLanguage} className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-300"><Lightbulb className="h-4 w-4" /> {lq('whenToUse')}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{card.prompt}</p>
                {explanationLanguage === 'my' && (
                  <p lang="my" className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-sm leading-7 text-slate-700 dark:bg-slate-950/35 dark:text-slate-200">{lq('burmesePromptFallback')}</p>
                )}
                <p lang={explanationLanguage} className="mt-2 text-xs text-slate-500 dark:text-slate-400">{lq('listenSay')}</p>
              </div>
            </>
          )}
        </main>

        <footer className="-mx-4 mt-auto border-t border-slate-200 px-4 py-4 sm:-mx-6 sm:px-6 dark:border-surface-raised">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <Button variant="outline" onClick={() => setPreviewIndex((current) => Math.max(0, current - 1))} disabled={previewIndex === 0}>
              Back
            </Button>
            {previewIndex + 1 < cards.length ? (
              <Button style={{ backgroundColor: lesson.course.accentColor }} onClick={() => setPreviewIndex((current) => current + 1)} disabled={!card}>
                Next
              </Button>
            ) : (
              <Button style={{ backgroundColor: lesson.course.accentColor }} onClick={startPractice} disabled={!card}>
                Start practice
              </Button>
            )}
          </div>
        </footer>
      </div>
    );
  }

  if (phase === 'spelling' && spellingCard) {
    const spellingProgress = Math.round((spellingIndex / spellingCards.length) * 100);
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-3xl flex-col pb-6">
        <header className="flex items-center gap-3 py-2 sm:gap-5">
          <Button variant="ghost" size="icon" aria-label="Exit lesson" render={<Link to={`/games/language-quest/courses/${lesson.course.id}`} />} nativeButton={false}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <SoundToggleButton soundEnabled={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} />
          <Progress value={spellingProgress} className="flex-1 [&_[data-slot=progress-track]]:h-3 [&_[data-slot=progress-indicator]]:bg-amber-500" />
          <span className="text-xs font-bold text-slate-500">{spellingIndex + 1}/{spellingCards.length}</span>
        </header>
        <LanguageQuestPhaseStepper phase="spelling" hasSpelling={spellingCards.length > 0} hasSentence={sentenceCards.length > 0} accentColor={lesson.course.accentColor} />

        <main className="flex flex-1 flex-col justify-center py-8">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
            <SpellCheck2 className="h-4 w-4" /> {lq('spellTitle')}
          </p>
          <h1 lang={explanationLanguage} className="mt-4 text-2xl font-black leading-tight text-slate-900 dark:text-white sm:text-3xl">{lq('spellingHeading')}</h1>
          <p lang={explanationLanguage} className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-300">{lq('spellingInstruction')}</p>

          <div className="mt-6 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 dark:border-amber-500/20 dark:from-amber-950/20 dark:to-orange-950/15">
            <p lang={explanationLanguage} className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">{lq('situation')}</p>
            <p className="mt-2 text-base leading-7 text-slate-700 dark:text-slate-200">{spellingCard.practicePrompt}</p>
            <Button
              type="button"
              className="mt-5 rounded-2xl bg-amber-500 text-amber-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400"
              onClick={() => speak(spellingCard.audioText || spellingCard.text, lesson.course.language)}
            >
              <Volume2 className="mr-2 h-5 w-5" /> Listen again
            </Button>
          </div>

          <label htmlFor="spelling-answer" lang={explanationLanguage} className="mt-6 text-sm font-bold text-slate-700 dark:text-slate-200">{lq('spellingLabel')}</label>
          <div className="relative">
            <input
              id="spelling-answer"
              autoFocus
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={spellingInput}
              onChange={(event) => {
                setSpellingInput(event.target.value);
                if (spellingFeedback) setSpellingFeedback(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (spellingFeedback === 'correct') continueSpelling();
                  else checkSpelling();
                }
              }}
              placeholder={lq('spellingPlaceholder')}
              className={`mt-2 h-16 w-full rounded-2xl border-2 bg-white px-5 text-xl font-semibold text-slate-900 outline-none transition focus:ring-4 dark:bg-surface-indigo dark:text-white ${
                isChineseLanguage(lesson.course.language) && speechSupported ? 'pr-14' : ''
              } ${
                spellingFeedback === 'correct'
                  ? 'border-emerald-500 focus:ring-emerald-100'
                  : spellingFeedback === 'incorrect'
                    ? `border-rose-400 focus:ring-rose-100 ${reducedMotion ? '' : 'lq-shake'}`
                    : 'border-slate-200 focus:border-amber-500 focus:ring-amber-100 dark:border-surface-raised'
              }`}
            />
            {isChineseLanguage(lesson.course.language) && speechSupported && (
              <button
                type="button"
                onClick={toggleSpellingListening}
                aria-label={listening ? 'Stop voice input' : 'Answer by speaking'}
                title={listening ? 'Stop voice input' : 'Answer by speaking'}
                className={`absolute right-3 top-1/2 mt-1 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full transition ${
                  listening ? 'animate-pulse bg-rose-500 text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-amber-600 dark:hover:bg-surface-raised'
                }`}
              >
                {listening ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
          </div>
          <p lang={explanationLanguage} className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-300">{lq('spellingHelp')}</p>
          {isChineseLanguage(lesson.course.language) && (
            <p lang={explanationLanguage} className="mt-1 text-xs leading-6 text-amber-600 dark:text-amber-300">
              {lq('spellingHelpChinese')}
              {speechSupported && ' You can also tap the microphone and say your answer.'}
            </p>
          )}

          {spellingFeedback === 'incorrect' && (
            <div className={`mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 ${reducedMotion ? '' : 'lq-shake'}`}>
              <p lang={explanationLanguage} className="font-black">{lq('spellingIncorrectTitle')}</p>
              <p lang={explanationLanguage} className="mt-1 text-sm leading-6 opacity-80">{lq('spellingIncorrectHelp')}</p>
            </div>
          )}
          {spellingFeedback === 'correct' && (
            <div className={`mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 ${reducedMotion ? '' : 'lq-cheer'}`}>
              <p lang={explanationLanguage} className="font-black">{lq('spellingCorrectTitle')}</p>
              <p lang={explanationLanguage} className="mt-1 text-sm leading-6">{lq('spellingCorrectHelp')}</p>
              <div className="mt-2 font-black">
                <LanguageQuestPinyinText text={spellingCard.text} pinyin={spellingCard.pinyin} />
              </div>
            </div>
          )}
        </main>

        <footer className="-mx-4 mt-auto border-t border-slate-200 px-4 py-4 sm:-mx-6 sm:px-6 dark:border-surface-raised">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <Button variant="ghost" onClick={continueAfterSpelling}>{lq('skipSpelling')}</Button>
            {spellingFeedback === 'correct' ? (
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={continueSpelling}>
                {spellingIndex + 1 < spellingCards.length
                  ? lq('nextSpelling')
                  : sentenceCards.length
                    ? lq('startSentencePractice')
                    : lq('startQuiz')}
              </Button>
            ) : (
              <Button onClick={checkSpelling} disabled={!spellingInput.trim()} style={spellingInput.trim() ? { backgroundColor: lesson.course.accentColor } : undefined}>
                {lq('checkSpelling')}
              </Button>
            )}
          </div>
        </footer>
      </div>
    );
  }

  if (phase === 'sentence' && sentenceCard) {
    const sentenceProgress = Math.round((sentenceIndex / sentenceCards.length) * 100);
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-3xl flex-col pb-6">
        <header className="flex items-center gap-3 py-2 sm:gap-5">
          <Button variant="ghost" size="icon" aria-label="Exit lesson" render={<Link to={`/games/language-quest/courses/${lesson.course.id}`} />} nativeButton={false}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <SoundToggleButton soundEnabled={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} />
          <Progress value={sentenceProgress} className="flex-1 [&_[data-slot=progress-track]]:h-3 [&_[data-slot=progress-indicator]]:bg-fuchsia-600" />
          <span className="text-xs font-bold text-slate-500">{sentenceIndex + 1}/{sentenceCards.length}</span>
        </header>
        <LanguageQuestPhaseStepper phase="sentence" hasSpelling={spellingCards.length > 0} hasSentence={sentenceCards.length > 0} accentColor={lesson.course.accentColor} />

        <main className="flex flex-1 flex-col justify-center py-8">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-700">
            <PencilLine className="h-4 w-4" /> Build the sentence
          </p>
          <h1 lang={explanationLanguage} className="mt-4 text-2xl font-black leading-tight text-slate-900 dark:text-white sm:text-3xl">{lq('sentenceHeading')}</h1>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-surface-raised dark:bg-surface-indigo">
            <p lang={explanationLanguage} className="text-xs font-black uppercase tracking-wider text-slate-400">{lq('situation')}</p>
            <p className="mt-2 text-base leading-7 text-slate-700 dark:text-slate-200">{sentenceCard.practicePrompt}</p>
            <Button variant="ghost" size="sm" className="-ml-2 mt-2 text-violet-700" onClick={() => speak(sentenceCard.audioText || sentenceCard.text, lesson.course.language)}>
              <Volume2 className="mr-2 h-4 w-4" /> Listen again
            </Button>
          </div>
          <label htmlFor="sentence-answer" className="mt-6 text-sm font-bold text-slate-700 dark:text-slate-200">Your sentence</label>
          <textarea
            id="sentence-answer"
            autoFocus
            value={sentenceInput}
            onChange={(event) => {
              setSentenceInput(event.target.value);
              if (sentenceFeedback) setSentenceFeedback(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (sentenceFeedback === 'correct') continueSentence();
                else checkSentence();
              }
            }}
            placeholder="Write the phrase here…"
            className={`mt-2 min-h-28 w-full resize-none rounded-2xl border-2 bg-white p-4 text-lg font-semibold text-slate-900 outline-none transition focus:ring-4 dark:bg-surface-indigo dark:text-white ${
              sentenceFeedback === 'correct'
                ? 'border-emerald-500 focus:ring-emerald-100'
                : sentenceFeedback === 'incorrect'
                  ? `border-rose-400 focus:ring-rose-100 ${reducedMotion ? '' : 'lq-shake'}`
                  : 'border-slate-200 focus:border-fuchsia-500 focus:ring-fuchsia-100 dark:border-surface-raised'
            }`}
          />
          <p lang={explanationLanguage} className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-300">{lq('sentenceHelp')}</p>
          {isChineseLanguage(lesson.course.language) && (
            <p lang={explanationLanguage} className="mt-1 text-xs leading-6 text-fuchsia-600 dark:text-fuchsia-300">{lq('sentenceHelpChinese')}</p>
          )}

          {sentenceFeedback === 'incorrect' && (
            <div className={`mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 ${reducedMotion ? '' : 'lq-shake'}`}>
              <p lang={explanationLanguage} className="font-black">{lq('incorrectTitle')}</p>
              <div className="mt-2 flex items-end gap-2 text-sm">
                <span>Model sentence:</span>
                <strong><LanguageQuestPinyinText text={sentenceCard.text} pinyin={sentenceCard.pinyin} /></strong>
              </div>
              <p lang={explanationLanguage} className="mt-1 text-xs leading-6 opacity-80">{lq('incorrectHelp')}</p>
            </div>
          )}
          {sentenceFeedback === 'correct' && (
            <div className={`mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 ${reducedMotion ? '' : 'lq-cheer'}`}>
              <p lang={explanationLanguage} className="font-black">{lq('correctTitle')}</p>
              <p lang={explanationLanguage} className="mt-1 text-sm leading-6">{lq('correctHelp')}</p>
            </div>
          )}
        </main>

        <footer className="-mx-4 mt-auto border-t border-slate-200 px-4 py-4 sm:-mx-6 sm:px-6 dark:border-surface-raised">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <Button variant="ghost" onClick={() => setPhase('quiz')}>Skip sentence practice</Button>
            {sentenceFeedback === 'correct' ? (
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={continueSentence}>
                {sentenceIndex + 1 < sentenceCards.length ? 'Next sentence' : 'Start quiz'}
              </Button>
            ) : (
              <Button onClick={checkSentence} disabled={!sentenceInput.trim()} style={sentenceInput.trim() ? { backgroundColor: lesson.course.accentColor } : undefined}>Check sentence</Button>
            )}
          </div>
        </footer>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="mx-auto flex min-h-[560px] max-w-2xl flex-col items-center justify-center text-center">
        <div className="relative grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-xl">
          <PartyPopper className="h-12 w-12" />
          <span className="absolute -right-2 top-2 text-3xl">✨</span>
          <span className="absolute -left-3 bottom-3 text-2xl">⭐</span>
          <div className="absolute -bottom-2 -right-2">
            <LanguageQuestCompanion rewards={profile?.rewards} reaction="correct" reducedMotion={reducedMotion} size="sm" />
          </div>
        </div>
        <h1 className="mt-7 text-3xl font-black text-slate-900 dark:text-white">Lesson complete!</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-300">You finished <strong>{lesson.title}</strong>. Great work!</p>
        <div className="mt-7 grid w-full grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 sm:p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <Star className="mx-auto h-6 w-6 fill-amber-500 text-amber-500" />
            <p className="mt-2 text-xl font-black text-amber-700 sm:text-2xl dark:text-amber-400">+{sessionPoints}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600/70 sm:text-xs">XP earned</p>
          </div>
          <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-3 sm:p-4 dark:border-sky-500/20 dark:bg-sky-500/10">
            <BookA className="mx-auto h-6 w-6 text-sky-600" />
            <p className="mt-2 text-xl font-black text-sky-700 sm:text-2xl dark:text-sky-400">{cards.length}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-600/70 sm:text-xs">Words learned</p>
          </div>
          <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-3 sm:p-4 dark:border-orange-500/20 dark:bg-orange-500/10">
            <Flame className={`mx-auto h-6 w-6 fill-orange-500 text-orange-500 ${reducedMotion ? '' : 'animate-pulse'}`} />
            <p className="mt-2 text-xl font-black text-orange-700 sm:text-2xl dark:text-orange-400">{profile?.currentStreak ?? 0}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-600/70 sm:text-xs">Day streak</p>
          </div>
        </div>
        {profile?.rewards && (
          <div className="mt-4 w-full rounded-2xl border border-violet-200 bg-violet-50 p-4 text-left dark:border-violet-500/20 dark:bg-violet-500/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-violet-600 dark:text-violet-300">Quest level</p>
                <p className="mt-1 font-black text-slate-900 dark:text-white">Level {profile.rewards.level} • {profile.rewards.title}</p>
              </div>
              <span className="rounded-xl bg-white px-3 py-2 text-sm font-black text-violet-700 shadow-sm dark:bg-slate-950 dark:text-violet-300">{profile.rewards.xp} XP</span>
            </div>
          </div>
        )}
        <div className="mt-7 flex w-full flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={practiseAgain}>
            Practise again
          </Button>
          <Button className="flex-1" style={{ backgroundColor: lesson.course.accentColor }} render={<Link to={`/games/language-quest/courses/${lesson.course.id}`} />} nativeButton={false}>
            Continue the path
          </Button>
        </div>
      </div>
    );
  }

  if (!challenge) return null;

  if (outOfHearts) {
    return (
      <div className="mx-auto flex min-h-[560px] max-w-2xl flex-col items-center justify-center text-center">
        <div className="grid h-24 w-24 place-items-center rounded-full bg-rose-100 text-rose-500 dark:bg-rose-500/10">
          <Heart className="h-10 w-10" />
        </div>
        <h1 className="mt-6 text-2xl font-black text-slate-900 dark:text-white">Out of hearts for now</h1>
        <p lang={explanationLanguage} className="mt-2 max-w-sm leading-7 text-slate-500 dark:text-slate-300">
          {lq('outOfHeartsHelp')}
        </p>
        <div className="mt-7 w-full">
          <Button className="w-full" style={{ backgroundColor: lesson.course.accentColor }} render={<Link to={`/games/language-quest/courses/${lesson.course.id}`} />} nativeButton={false}>
            Back to course
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-3xl flex-col pb-6">
      <header className="flex items-center gap-3 py-2 sm:gap-5">
        <Button variant="ghost" size="icon" aria-label="Exit lesson" render={<Link to={`/games/language-quest/courses/${lesson.course.id}`} />} nativeButton={false}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <SoundToggleButton soundEnabled={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} />
        <Progress value={progressPercent} className="flex-1 [&_[data-slot=progress-track]]:h-3 [&_[data-slot=progress-indicator]]:bg-violet-600" />
        {combo >= 2 && (
          <div className="hidden items-center gap-1 text-sm font-black text-orange-500 sm:flex" title={`${combo} in a row`}>
            <Flame className="h-5 w-5 fill-current" /> {combo}
          </div>
        )}
        <div className="flex items-center gap-1 text-sm font-black text-rose-500"><Heart className="h-5 w-5 fill-current" /> {profile?.hearts ?? 0}</div>
        <div className="hidden items-center gap-1 text-sm font-black text-amber-500 sm:flex" title={`Level ${profile?.rewards.level ?? 1}`}><Star className="h-5 w-5 fill-current" /> {profile?.points ?? 0} XP</div>
      </header>
      <LanguageQuestPhaseStepper phase="quiz" hasSpelling={spellingCards.length > 0} hasSentence={sentenceCards.length > 0} accentColor={lesson.course.accentColor} />

      <main className="flex flex-1 flex-col justify-center py-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">{lesson.title} • {index + 1} of {lesson.challenges.length}</p>
        <div className="mt-3 flex items-start justify-between gap-4">
          <h1 className="max-w-2xl text-2xl font-black leading-tight text-slate-900 dark:text-white sm:text-3xl">{challenge.question}</h1>
          <Button variant="outline" size="icon" className="shrink-0 rounded-full" onClick={() => speak(challenge.question, lesson.course.language)} aria-label="Read question aloud">
            <Volume2 className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-300">
          <BookA className="h-3.5 w-3.5" />
          Highlight an unfamiliar word to check the dictionary.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {challenge.options.map((option, optionIndex) => {
            const selected = selectedId === option.id;
            const isCorrect = Boolean(answer && option.id === answer.correctOptionId);
            const isWrongSelection = Boolean(answer && selected && !answer.correct);
            return (
              <div key={option.id} className="relative">
                <button
                  type="button"
                  disabled={Boolean(answer)}
                  onClick={() => {
                    if (window.getSelection()?.toString().trim()) return;
                    setSelectedId(option.id);
                  }}
                  className={`group flex min-h-24 w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-default ${option.audioText ? 'pr-14' : ''} ${
                    isCorrect
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                      : isWrongSelection
                        ? `border-rose-500 bg-rose-50 dark:bg-rose-500/10 ${reducedMotion ? '' : 'lq-shake'}`
                        : selected
                          ? 'border-violet-500 bg-violet-50 shadow-sm dark:bg-violet-500/10'
                          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md dark:border-surface-raised dark:bg-surface-indigo'
                  }`}
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black ${selected ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-surface-raised dark:text-slate-300'}`}>{optionLetters[optionIndex]}</span>
                  {option.emoji && <span className="text-3xl" aria-hidden="true">{option.emoji}</span>}
                  <span className="min-w-0 flex-1 font-semibold text-slate-800 dark:text-white">
                    <LanguageQuestPinyinText text={option.text} pinyin={option.pinyin} />
                  </span>
                </button>
                {option.audioText && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-violet-600 dark:hover:bg-surface-raised"
                    onClick={() => speak(option.audioText || option.text, lesson.course.language)}
                    aria-label={`Listen to ${option.text}`}
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <footer className={`-mx-4 mt-auto border-t px-4 py-4 sm:-mx-6 sm:px-6 ${answer?.correct ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10' : answer ? 'border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10' : 'border-slate-200 dark:border-surface-raised'}`}>
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="min-h-12">
            {answer?.correct && (
              <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                <LanguageQuestCompanion rewards={profile?.rewards} reaction="correct" reducedMotion={reducedMotion} size="sm" />
                <div>
                  <p className="font-black">Excellent — that meaning fits.</p>
                  <div className="mt-1 flex flex-wrap items-end gap-1 text-xs">
                    <LanguageQuestPinyinText
                      text={answer.correctAnswer}
                      pinyin={challenge.options.find((option) => option.id === answer.correctOptionId)?.pinyin ?? null}
                    />
                    <span>is the best response here. +{answer.pointsAwarded} XP</span>
                  </div>
                </div>
              </div>
            )}
            {answer && !answer.correct && (
              <div className="flex items-center gap-3 text-rose-700 dark:text-rose-400">
                <LanguageQuestCompanion rewards={profile?.rewards} reaction="incorrect" reducedMotion={reducedMotion} size="sm" />
                <div>
                  <p className="font-black">Not quite — compare the meaning and retry.</p>
                  <div className="mt-1 flex flex-wrap items-end gap-1 text-xs">
                    <span>Best answer:</span>
                    <LanguageQuestPinyinText
                      text={answer.correctAnswer}
                      pinyin={challenge.options.find((option) => option.id === answer.correctOptionId)?.pinyin ?? null}
                    />
                    <span>Look for the option that responds directly to the situation.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          {answer ? (
            <Button onClick={continueLesson} className={answer.correct ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}>
              {answer.correct ? 'Continue' : 'Try again'}
            </Button>
          ) : (
            <Button onClick={checkAnswer} disabled={!selectedId || checking} style={selectedId ? { backgroundColor: lesson.course.accentColor } : undefined}>
              {checking ? 'Checking…' : 'Check answer'}
            </Button>
          )}
        </div>
      </footer>
    </div>
    <LanguageQuestRewardReveal
      cardId={unlockedRewardId}
      open={rewardRevealOpen}
      onOpenChange={setRewardRevealOpen}
    />
    </>
  );
}
