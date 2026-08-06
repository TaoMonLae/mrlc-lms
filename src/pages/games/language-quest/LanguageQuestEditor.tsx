import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowDown, ArrowLeft, ArrowUp, BarChart3, CheckCircle2, ChevronDown, ChevronUp, ClipboardPaste, Clock3, Eye, GripVertical, MessageSquareWarning, Plus, Save, Send, ShieldCheck, Trash2, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiSend } from '@/src/lib/api';
import { useAuth } from '@/src/providers/AuthProvider';
import {
  LANGUAGE_QUEST_CHALLENGE_TYPES,
  normalizeLanguageQuestAuthoringOptions,
  type LanguageQuestChallengeType as EditorChallengeType,
} from '@/shared/languageQuestAuthoring';
import {
  languageQuestReviewStatusLabel,
  type LanguageQuestCourseReviewStatus,
} from '@/shared/languageQuestCourseReview';
import { LANGUAGE_QUEST_COURSE_CATEGORIES } from '@/shared/languageQuestCourseCategories';
import {
  languageQuestAnalyticsStatusLabel,
  type LanguageQuestAnalyticsStatus,
} from '@/shared/languageQuestAnalytics';

interface ChallengeAnalytics {
  attempts: number;
  correctAttempts: number;
  accuracyPercent: number | null;
  status: LanguageQuestAnalyticsStatus;
}
type ChallengeAnalyticsMap = Map<string, ChallengeAnalytics>;

function ChallengeAnalyticsBadge({ analytics }: { analytics: ChallengeAnalytics | undefined }) {
  if (!analytics || analytics.status === 'NO_DATA') return null;
  const styles: Record<LanguageQuestAnalyticsStatus, string> = {
    NO_DATA: '',
    NEEDS_REVIEW: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200',
    DEVELOPING: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200',
    SECURE: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200',
  };
  return (
    <Badge
      variant="outline"
      className={`shrink-0 ${styles[analytics.status]}`}
      title={`${analytics.correctAttempts}/${analytics.attempts} correct across all learners`}
    >
      {analytics.accuracyPercent}% · {languageQuestAnalyticsStatusLabel(analytics.status)}
    </Badge>
  );
}

interface EditorOption {
  _key: string;
  id?: string;
  text: string;
  correct: boolean;
  emoji: string;
  audioText: string;
}

interface EditorChallenge {
  _key: string;
  id?: string;
  type: EditorChallengeType;
  question: string;
  explanation: string;
  hint: string;
  options: EditorOption[];
}

interface ChallengeTypeDefinition {
  value: EditorChallengeType;
  label: string;
  description: string;
  questionLabel: string;
  questionPlaceholder: string;
}

const CHALLENGE_TYPES: ChallengeTypeDefinition[] = [
  { value: 'SELECT', label: 'Multiple choice', description: 'Choose one correct answer from a set of options.', questionLabel: 'Question', questionPlaceholder: 'What should the learner choose?' },
  { value: 'ASSIST', label: 'Translation assist', description: 'Choose the translation or phrase that best matches the prompt.', questionLabel: 'Translation prompt', questionPlaceholder: 'Choose the translation for “…”' },
  { value: 'CLOZE', label: 'Fill in the blank', description: 'Complete a sentence by choosing the missing word or phrase.', questionLabel: 'Sentence with blank', questionPlaceholder: 'I would like ___ cup of tea.' },
  { value: 'ODD_ONE_OUT', label: 'Odd one out', description: 'Identify the option that does not belong with the others.', questionLabel: 'Classification prompt', questionPlaceholder: 'Which word does not belong in this group?' },
  { value: 'REORDER', label: 'Reorder tiles', description: 'Build the correct sentence by placing word tiles in order.', questionLabel: 'Ordering instruction', questionPlaceholder: 'Put the words in the correct order.' },
  { value: 'MATCHING', label: 'Match the pairs', description: 'Connect consecutive prompt-and-answer pairs.', questionLabel: 'Matching instruction', questionPlaceholder: 'Match each phrase to its meaning.' },
  { value: 'MINIMAL_PAIR_LISTENING', label: 'Listening contrast', description: 'Distinguish between similar-sounding answer choices.', questionLabel: 'Listening instruction', questionPlaceholder: 'Listen and choose the word you hear.' },
  { value: 'DICTATION', label: 'Dictation', description: 'Listen and type one canonical word, phrase, or sentence.', questionLabel: 'Dictation instruction', questionPlaceholder: 'Listen and type the sentence you hear.' },
  { value: 'GRAMMAR_TRANSFORM', label: 'Grammar transformation', description: 'Apply a requested grammar change and choose the correct result.', questionLabel: 'Transformation instruction', questionPlaceholder: 'Change this sentence into the past tense: “…”' },
];

const challengeTypeDefinition = (type: EditorChallengeType) => CHALLENGE_TYPES.find((definition) => definition.value === type) ?? CHALLENGE_TYPES[0];

interface EditorLesson {
  _key: string;
  id?: string;
  title: string;
  description: string;
  conceptIntro: string;
  challenges: EditorChallenge[];
}

interface EditorUnit {
  _key: string;
  id?: string;
  title: string;
  description: string;
  lessons: EditorLesson[];
}

interface EditorCourse {
  title: string;
  description: string;
  language: string;
  category: string;
  imageEmoji: string;
  accentColor: string;
  published: boolean;
  retired: boolean;
  reviewRequired: boolean;
  reviewStatus: LanguageQuestCourseReviewStatus;
  reviewNote: string;
  submittedForReviewAt: string | null;
  reviewedAt: string | null;
  updatedAt: string | null;
  units: EditorUnit[];
}

interface CourseSaveResult {
  id: string;
  updatedAt: string;
  published: boolean;
  reviewRequired: boolean;
  reviewStatus: LanguageQuestCourseReviewStatus;
}

const key = () => crypto.randomUUID();
const newOption = (correct = false): EditorOption => ({ _key: key(), text: '', correct, emoji: '', audioText: '' });

function optionsForChallengeType(type: EditorChallengeType, source: EditorOption[]): EditorOption[] {
  return normalizeLanguageQuestAuthoringOptions(type, source, newOption);
}

function changeChallengeType(challenge: EditorChallenge, type: EditorChallengeType): EditorChallenge {
  return {
    ...challenge,
    type,
    options: optionsForChallengeType(type, challenge.options),
  };
}

const newChallenge = (): EditorChallenge => ({
  _key: key(), type: 'SELECT', question: '', explanation: '', hint: '',
  options: [newOption(true), newOption(), newOption()],
});
interface BulkVocabularyEntry {
  term: string;
  translation: string;
}

// Parses "term | translation" (or tab-separated) lines pasted by a teacher.
function parseBulkVocabularyText(text: string): BulkVocabularyEntry[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\t|\|/).map((part) => part.trim()).filter(Boolean))
    .filter((parts): parts is [string, string, ...string[]] => parts.length >= 2)
    .map(([term, translation]) => ({ term, translation }));
}

// Builds one SELECT challenge per entry, picking up to two distractor
// translations from other pasted entries -- mirrors the distractor-pool
// rotation used by the curricula/ generator scripts (see e.g.
// scripts/generate-language-quest-linguify-courses.mjs's challengeFor).
function buildBulkVocabularyChallenges(entries: BulkVocabularyEntry[]): EditorChallenge[] {
  return entries.map((entry, index) => {
    const distractors: string[] = [];
    for (let step = 1; distractors.length < 2 && step < entries.length; step += 1) {
      const candidate = entries[(index + step) % entries.length].translation;
      if (candidate !== entry.translation && !distractors.includes(candidate)) distractors.push(candidate);
    }
    const options = [newOption(true), ...distractors.map(() => newOption(false))];
    options[0].text = entry.translation;
    distractors.forEach((text, distractorIndex) => { options[distractorIndex + 1].text = text; });
    return {
      _key: key(),
      type: 'SELECT' as EditorChallengeType,
      question: `Choose the translation for “${entry.term}”.`,
      explanation: '',
      hint: '',
      options: optionsForChallengeType('SELECT', options),
    };
  });
}

const newLesson = (): EditorLesson => ({ _key: key(), title: '', description: '', conceptIntro: '', challenges: [newChallenge()] });
const newUnit = (): EditorUnit => ({ _key: key(), title: '', description: '', lessons: [newLesson()] });
const emptyCourse = (): EditorCourse => ({
  title: '', description: '', language: 'English', category: 'English Courses',
  imageEmoji: '🌍', accentColor: '#7c3aed', published: false, retired: false,
  reviewRequired: false, reviewStatus: 'DRAFT', reviewNote: '', submittedForReviewAt: null, reviewedAt: null,
  updatedAt: null,
  units: [newUnit()],
});

function hydrateCourse(raw: any): EditorCourse {
  return {
    title: raw?.title || '', description: raw?.description || '', language: raw?.language || '',
    category: raw?.category || 'Other Courses',
    imageEmoji: raw?.imageEmoji || '🌍', accentColor: raw?.accentColor || '#7c3aed', published: Boolean(raw?.published), retired: Boolean(raw?.retired),
    reviewRequired: Boolean(raw?.reviewRequired),
    reviewStatus: raw?.reviewStatus || (raw?.published ? 'APPROVED' : 'DRAFT'),
    reviewNote: raw?.reviewNote || '',
    submittedForReviewAt: raw?.submittedForReviewAt || null,
    reviewedAt: raw?.reviewedAt || null,
    updatedAt: raw?.updatedAt || null,
    units: (raw?.units || []).map((unit: any) => ({
      _key: key(), id: unit.id, title: unit.title || '', description: unit.description || '',
      lessons: (unit.lessons || []).map((lesson: any) => ({
        _key: key(), id: lesson.id, title: lesson.title || '', description: lesson.description || '',
        conceptIntro: lesson.conceptIntro || '',
        challenges: (lesson.challenges || []).map((challenge: any) => {
          // Preserve every supported stored type while normalising only the
          // invariants its learner UI and server grader already require.
          const type: EditorChallengeType = LANGUAGE_QUEST_CHALLENGE_TYPES.includes(challenge.type) ? challenge.type : 'SELECT';
          const options = (challenge.options || []).map((option: any) => ({
            _key: key(), id: option.id, text: option.text || '', correct: Boolean(option.correct), emoji: option.emoji || '', audioText: option.audioText || '',
          }));
          return {
            _key: key(),
            id: challenge.id,
            type,
            question: challenge.question || '',
            explanation: challenge.explanation || '',
            hint: challenge.hint || '',
            options: optionsForChallengeType(type, options),
          };
        }),
      })),
    })),
  };
}

function courseContentSnapshot(course: EditorCourse): string {
  return JSON.stringify({
    title: course.title,
    description: course.description,
    language: course.language,
    category: course.category,
    imageEmoji: course.imageEmoji,
    accentColor: course.accentColor,
    published: course.published,
    units: course.units,
  });
}

function ChoiceOptionEditor({ option, index, canRemove, correctLabel, onChange, onRemove, onCorrect }: {
  option: EditorOption; index: number; canRemove: boolean; correctLabel: string;
  onChange: (next: EditorOption) => void; onRemove: () => void; onCorrect: () => void;
}) {
  return (
    <div className={`grid gap-2 rounded-xl border p-3 sm:grid-cols-[44px_1fr_1fr_auto] ${option.correct ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-surface-raised'}`}>
      <button
        type="button"
        onClick={onCorrect}
        className={`grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-black ${option.correct ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-slate-400 dark:border-slate-600'}`}
        aria-label={`${correctLabel} ${index + 1}`}
        title={correctLabel}
      >
        {option.correct ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
      </button>
      <div className="flex gap-2">
        <Input className="w-14 shrink-0 text-center text-lg" value={option.emoji} maxLength={16} placeholder="🌟" onChange={(event) => onChange({ ...option, emoji: event.target.value })} aria-label={`Option ${index + 1} emoji`} />
        <Input value={option.text} maxLength={500} placeholder={`Answer option ${index + 1}`} onChange={(event) => onChange({ ...option, text: event.target.value })} aria-label={`Option ${index + 1} text`} />
      </div>
      <div className="relative">
        <Volume2 className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-slate-400" />
        <Input className="pl-8" value={option.audioText} maxLength={500} placeholder="Spoken text (optional)" onChange={(event) => onChange({ ...option, audioText: event.target.value })} aria-label={`Option ${index + 1} spoken text`} />
      </div>
      <Button type="button" variant="ghost" size="icon" disabled={!canRemove} className="text-rose-500" onClick={onRemove} aria-label={`Remove option ${index + 1}`}><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}

function ReorderOptionsEditor({ options, onChange }: { options: EditorOption[]; onChange: (next: EditorOption[]) => void }) {
  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= options.length) return;
    const next = [...options];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {options.map((option, optionIndex) => (
        <div key={option._key} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[48px_1fr_1fr_auto] dark:border-surface-raised dark:bg-surface-indigo">
          <div className="flex items-center gap-1 text-slate-400"><GripVertical className="h-4 w-4" /><span className="text-xs font-black">{optionIndex + 1}</span></div>
          <div className="flex gap-2">
            <Input className="w-14 shrink-0 text-center text-lg" value={option.emoji} maxLength={16} placeholder="✨" onChange={(event) => onChange(options.map((item) => item._key === option._key ? { ...item, emoji: event.target.value } : item))} aria-label={`Tile ${optionIndex + 1} emoji`} />
            <Input value={option.text} maxLength={500} placeholder={`Tile ${optionIndex + 1}`} onChange={(event) => onChange(options.map((item) => item._key === option._key ? { ...item, text: event.target.value } : item))} aria-label={`Tile ${optionIndex + 1} text`} />
          </div>
          <div className="relative">
            <Volume2 className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-slate-400" />
            <Input className="pl-8" value={option.audioText} maxLength={500} placeholder="Spoken tile text (optional)" onChange={(event) => onChange(options.map((item) => item._key === option._key ? { ...item, audioText: event.target.value } : item))} aria-label={`Tile ${optionIndex + 1} spoken text`} />
          </div>
          <div className="flex items-center">
            <Button type="button" variant="ghost" size="icon" disabled={optionIndex === 0} onClick={() => move(optionIndex, -1)} aria-label={`Move tile ${optionIndex + 1} up`}><ArrowUp className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" disabled={optionIndex === options.length - 1} onClick={() => move(optionIndex, 1)} aria-label={`Move tile ${optionIndex + 1} down`}><ArrowDown className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" disabled={options.length <= 2} className="text-rose-500" onClick={() => onChange(options.filter((item) => item._key !== option._key))} aria-label={`Remove tile ${optionIndex + 1}`}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => onChange([...options, newOption(true)])}><Plus className="mr-1 h-3.5 w-3.5" /> Tile</Button>
    </div>
  );
}

function MatchingTileEditor({ option, label, onChange }: { option: EditorOption; label: string; onChange: (next: EditorOption) => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-surface-raised dark:bg-surface-indigo">
      <Label className="text-xs uppercase tracking-wide text-slate-500">{label}</Label>
      <div className="mt-2 flex gap-2">
        <Input className="w-14 shrink-0 text-center text-lg" value={option.emoji} maxLength={16} placeholder="🌟" onChange={(event) => onChange({ ...option, emoji: event.target.value })} aria-label={`${label} emoji`} />
        <Input value={option.text} maxLength={500} placeholder={label} onChange={(event) => onChange({ ...option, text: event.target.value })} aria-label={`${label} text`} />
      </div>
      <div className="relative mt-2">
        <Volume2 className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-slate-400" />
        <Input className="pl-8" value={option.audioText} maxLength={500} placeholder="Spoken text (optional)" onChange={(event) => onChange({ ...option, audioText: event.target.value })} aria-label={`${label} spoken text`} />
      </div>
    </div>
  );
}

function MatchingOptionsEditor({ options, onChange }: { options: EditorOption[]; onChange: (next: EditorOption[]) => void }) {
  const update = (optionKey: string, next: EditorOption) => onChange(options.map((option) => option._key === optionKey ? { ...next, correct: true } : option));
  const pairCount = options.length / 2;
  return (
    <div className="space-y-3">
      {Array.from({ length: pairCount }, (_, pairIndex) => {
        const left = options[pairIndex * 2];
        const right = options[pairIndex * 2 + 1];
        return (
          <div key={`${left._key}-${right._key}`} className="rounded-2xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-500/20 dark:bg-violet-500/5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">Pair {pairIndex + 1}</p>
              <Button type="button" variant="ghost" size="sm" disabled={pairCount <= 1} className="text-rose-500" onClick={() => onChange(options.filter((_, index) => index !== pairIndex * 2 && index !== pairIndex * 2 + 1))}><Trash2 className="mr-1 h-3.5 w-3.5" /> Remove pair</Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <MatchingTileEditor option={left} label="Prompt tile" onChange={(next) => update(left._key, next)} />
              <MatchingTileEditor option={right} label="Matching tile" onChange={(next) => update(right._key, next)} />
            </div>
          </div>
        );
      })}
      <Button type="button" size="sm" variant="outline" disabled={options.length >= 12} onClick={() => onChange([...options, newOption(true), newOption(true)])}><Plus className="mr-1 h-3.5 w-3.5" /> Pair</Button>
    </div>
  );
}

function DictationOptionEditor({ option, onChange }: { option: EditorOption; onChange: (next: EditorOption) => void }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:grid-cols-2 dark:border-amber-500/20 dark:bg-amber-500/5">
      <div className="space-y-1.5">
        <Label htmlFor={`dictation-answer-${option._key}`}>Canonical transcript</Label>
        <Input id={`dictation-answer-${option._key}`} value={option.text} maxLength={500} placeholder="The exact word or sentence learners should type" onChange={(event) => onChange({ ...option, text: event.target.value, correct: true })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`dictation-audio-${option._key}`}>Spoken text <span className="font-normal text-slate-400">(optional)</span></Label>
        <div className="relative">
          <Volume2 className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-slate-400" />
          <Input id={`dictation-audio-${option._key}`} className="pl-8" value={option.audioText} maxLength={500} placeholder="Defaults to the transcript" onChange={(event) => onChange({ ...option, audioText: event.target.value, correct: true })} />
        </div>
      </div>
    </div>
  );
}

function ChallengeEditor({ challenge, index, analytics, onChange, onRemove }: {
  challenge: EditorChallenge; index: number; analytics: ChallengeAnalytics | undefined; onChange: (next: EditorChallenge) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(!challenge.id);
  const definition = challengeTypeDefinition(challenge.type);
  const updateOptions = (options: EditorOption[]) => onChange({ ...challenge, options: optionsForChallengeType(challenge.type, options) });
  const updateOption = (optionKey: string, next: EditorOption) => updateOptions(challenge.options.map((option) => option._key === optionKey ? next : option));
  const markCorrect = (optionKey: string) => onChange({ ...challenge, options: challenge.options.map((option) => ({ ...option, correct: option._key === optionKey })) });
  const removeChoiceOption = (optionKey: string) => updateOptions(challenge.options.filter((option) => option._key !== optionKey));
  const correctLabel = challenge.type === 'ODD_ONE_OUT'
    ? 'Mark as the odd one out'
    : challenge.type === 'MINIMAL_PAIR_LISTENING'
      ? 'Mark as the target sound'
      : 'Mark as correct option';

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 dark:border-surface-raised dark:bg-surface-raised/20">
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" className="grid h-7 w-7 place-items-center rounded-lg bg-violet-100 text-xs font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" onClick={() => setOpen((value) => !value)}>{index + 1}</button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{challenge.question || `New challenge ${index + 1}`}</p>
          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">{definition.label}</p>
        </div>
        <ChallengeAnalyticsBadge analytics={analytics} />
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Collapse challenge' : 'Expand challenge'}>{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={onRemove} aria-label="Remove challenge"><Trash2 className="h-4 w-4" /></Button>
      </div>
      {open && (
        <div className="space-y-4 border-t border-slate-200 p-4 dark:border-surface-raised">
          <div className="grid gap-3 sm:grid-cols-[minmax(220px,0.7fr)_1.3fr]">
            <div className="space-y-1.5">
              <Label htmlFor={`challenge-type-${challenge._key}`}>Activity type</Label>
              <select
                id={`challenge-type-${challenge._key}`}
                value={challenge.type}
                onChange={(event) => onChange(changeChallengeType(challenge, event.target.value as EditorChallengeType))}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 dark:border-surface-raised dark:bg-surface-indigo dark:text-white"
              >
                {CHALLENGE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </div>
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm leading-6 text-violet-900 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200">
              <strong>{definition.label}:</strong> {definition.description}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`challenge-${challenge._key}`}>{definition.questionLabel}</Label>
            <Textarea id={`challenge-${challenge._key}`} value={challenge.question} maxLength={1000} rows={2} placeholder={definition.questionPlaceholder} onChange={(event) => onChange({ ...challenge, question: event.target.value })} />
            {challenge.type === 'CLOZE' && challenge.question && !challenge.question.includes('___') && (
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-300">Tip: add ___ where the answer should appear.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`challenge-explanation-${challenge._key}`}>Teaching explanation <span className="font-normal text-slate-400">(optional)</span></Label>
            <Textarea
              id={`challenge-explanation-${challenge._key}`}
              value={challenge.explanation}
              maxLength={1600}
              rows={3}
              placeholder="Explain why the answer is correct, or clarify the pattern learners should notice."
              onChange={(event) => onChange({ ...challenge, explanation: event.target.value })}
            />
            <p className="text-xs text-slate-400">Shown only after the learner checks an answer.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`challenge-hint-${challenge._key}`}>Hint <span className="font-normal text-slate-400">(optional)</span></Label>
            <Textarea
              id={`challenge-hint-${challenge._key}`}
              value={challenge.hint}
              maxLength={800}
              rows={2}
              placeholder="A nudge toward the strategy, without giving the answer away."
              onChange={(event) => onChange({ ...challenge, hint: event.target.value })}
            />
            <p className="text-xs text-slate-400">Learners can reveal this before answering, with a "Get a hint" button.</p>
          </div>

          {challenge.type === 'REORDER' ? (
            <div className="space-y-2">
              <div><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Correct tile order</p><p className="text-xs text-slate-400">Enter tiles in the finished sentence order; learners will receive them shuffled.</p></div>
              <ReorderOptionsEditor options={challenge.options} onChange={updateOptions} />
            </div>
          ) : challenge.type === 'MATCHING' ? (
            <div className="space-y-2">
              <div><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Matching pairs</p><p className="text-xs text-slate-400">Each left tile is stored directly beside its correct partner.</p></div>
              <MatchingOptionsEditor options={challenge.options} onChange={updateOptions} />
            </div>
          ) : challenge.type === 'DICTATION' ? (
            <div className="space-y-2">
              <div><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Dictation answer</p><p className="text-xs text-slate-400">Learners hear the spoken text and type the canonical transcript.</p></div>
              <DictationOptionEditor option={challenge.options[0]} onChange={(next) => updateOptions([next])} />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{challenge.type === 'MINIMAL_PAIR_LISTENING' ? 'Sound choices' : 'Answer options'}</p>
                  <p className="text-xs text-slate-400">{challenge.type === 'MINIMAL_PAIR_LISTENING' ? 'Add spoken text for each choice and mark the target sound.' : 'Select the circle beside the correct answer.'}</p>
                </div>
                <Button type="button" size="sm" variant="outline" disabled={challenge.options.length >= 6} onClick={() => updateOptions([...challenge.options, newOption()])}><Plus className="mr-1 h-3.5 w-3.5" /> Option</Button>
              </div>
              <div className="space-y-2">
                {challenge.options.map((option, optionIndex) => (
                  <ChoiceOptionEditor key={option._key} option={option} index={optionIndex} canRemove={challenge.options.length > 2} correctLabel={correctLabel} onChange={(next) => updateOption(option._key, next)} onRemove={() => removeChoiceOption(option._key)} onCorrect={() => markCorrect(option._key)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function challengePreviewHint(type: EditorChallengeType): string | null {
  switch (type) {
    case 'REORDER': return 'Learners drag these tiles into this exact order.';
    case 'MATCHING': return 'Learners match consecutive pairs (tile 1↔2, 3↔4, and so on).';
    case 'DICTATION': return 'Learners hear this read aloud and must type it exactly.';
    default: return null;
  }
}

function LessonPreviewDialog({ lesson, open, onOpenChange }: {
  lesson: EditorLesson; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lesson.title || 'Untitled lesson'} — preview</DialogTitle>
          <DialogDescription>How each challenge will appear to a learner. Read-only — nothing here is saved.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {lesson.conceptIntro && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-500/20 dark:bg-sky-500/10">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Shown first: concept introduction</p>
              <p className="whitespace-pre-line text-sm leading-6 text-sky-950 dark:text-sky-100">{lesson.conceptIntro}</p>
            </div>
          )}
          {lesson.challenges.length === 0 && <p className="text-sm text-slate-400">This lesson has no challenges yet.</p>}
          {lesson.challenges.map((challenge, challengeIndex) => {
            const definition = challengeTypeDefinition(challenge.type);
            const mechanicsHint = challengePreviewHint(challenge.type);
            return (
              <div key={challenge._key} className="rounded-xl border border-slate-200 p-3 dark:border-surface-raised">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Challenge {challengeIndex + 1} · {definition.label}</p>
                <p className="mb-2 font-medium text-slate-900 dark:text-white">{challenge.question || <span className="italic text-slate-400">No question text yet</span>}</p>
                {mechanicsHint && <p className="mb-2 text-xs text-slate-400">{mechanicsHint}</p>}
                {challenge.hint && <p className="mb-2 text-xs text-amber-600 dark:text-amber-300">Hint available: {challenge.hint}</p>}
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {challenge.options.map((option) => (
                    <div
                      key={option._key}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${option.correct ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200' : 'border-slate-200 text-slate-600 dark:border-surface-raised dark:text-slate-300'}`}
                    >
                      {option.text || <span className="italic text-slate-400">Empty option</span>}
                      {option.emoji ? ` ${option.emoji}` : ''}
                    </div>
                  ))}
                </div>
                {challenge.explanation && <p className="mt-2 text-xs text-slate-400">Explanation: {challenge.explanation}</p>}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LessonEditor({ lesson, index, isFirst, isLast, analytics, onChange, onRemove, onMoveUp, onMoveDown }: {
  lesson: EditorLesson; index: number; isFirst: boolean; isLast: boolean; analytics: ChallengeAnalyticsMap; onChange: (next: EditorLesson) => void; onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const [open, setOpen] = useState(!lesson.id);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const updateChallenge = (challengeKey: string, next: EditorChallenge) => onChange({ ...lesson, challenges: lesson.challenges.map((challenge) => challenge._key === challengeKey ? next : challenge) });
  const addBulkChallenges = () => {
    const entries = parseBulkVocabularyText(bulkText);
    if (!entries.length) {
      toast.error('Paste at least one line as "term | translation".');
      return;
    }
    const challenges = buildBulkVocabularyChallenges(entries);
    onChange({ ...lesson, challenges: [...lesson.challenges, ...challenges] });
    toast.success(`Added ${challenges.length} challenge${challenges.length === 1 ? '' : 's'} from pasted vocabulary.`);
    setBulkText('');
    setBulkOpen(false);
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-surface-raised dark:bg-surface-indigo">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-xs font-black text-slate-600 dark:bg-surface-raised dark:text-slate-200">{index + 1}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900 dark:text-white">{lesson.title || `New lesson ${index + 1}`}</p>
          <p className="text-xs text-slate-400">{lesson.challenges.length} challenge{lesson.challenges.length === 1 ? '' : 's'}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={isFirst} onClick={onMoveUp} aria-label={`Move lesson ${index + 1} up`}><ArrowUp className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={isLast} onClick={onMoveDown} aria-label={`Move lesson ${index + 1} down`}><ArrowDown className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewOpen(true)} aria-label={`Preview lesson ${index + 1}`} title="Preview as a learner"><Eye className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen((value) => !value)}>{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
      </div>
      <LessonPreviewDialog lesson={lesson} open={previewOpen} onOpenChange={setPreviewOpen} />
      {open && (
        <div className="space-y-4 border-t border-slate-100 p-4 dark:border-surface-raised">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Lesson title</Label><Input value={lesson.title} maxLength={160} placeholder="e.g. Friendly greetings" onChange={(event) => onChange({ ...lesson, title: event.target.value })} /></div>
            <div className="space-y-1.5"><Label>Short description</Label><Input value={lesson.description} maxLength={500} placeholder="What learners will practise" onChange={(event) => onChange({ ...lesson, description: event.target.value })} /></div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`lesson-concept-${lesson._key}`}>Concept introduction <span className="font-normal text-slate-400">(optional)</span></Label>
            <Textarea
              id={`lesson-concept-${lesson._key}`}
              value={lesson.conceptIntro}
              maxLength={4000}
              rows={4}
              placeholder="The key idea, formula, vocabulary, or a worked example -- shown once before the learner's first challenge in this lesson."
              onChange={(event) => onChange({ ...lesson, conceptIntro: event.target.value })}
            />
            <p className="text-xs text-slate-400">Separate paragraphs with a blank line. Leave empty to skip straight to practice, as before.</p>
          </div>
          <div className="space-y-3">
            {lesson.challenges.map((challenge, challengeIndex) => (
              <ChallengeEditor
                key={challenge._key}
                challenge={challenge}
                index={challengeIndex}
                analytics={challenge.id ? analytics.get(challenge.id) : undefined}
                onChange={(next) => updateChallenge(challenge._key, next)}
                onRemove={() => onChange({ ...lesson, challenges: lesson.challenges.filter((item) => item._key !== challenge._key) })}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => onChange({ ...lesson, challenges: [...lesson.challenges, newChallenge()] })}><Plus className="mr-2 h-4 w-4" /> Add challenge</Button>
            <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => setBulkOpen((value) => !value)}><ClipboardPaste className="mr-2 h-4 w-4" /> Bulk add vocabulary</Button>
          </div>
          {bulkOpen && (
            <div className="space-y-2 rounded-xl border border-dashed border-slate-300 p-3 dark:border-surface-raised">
              <Label>Paste vocabulary (one pair per line: term | translation)</Label>
              <Textarea
                value={bulkText}
                rows={5}
                placeholder={'bonjour | hello\nmerci | thank you\nau revoir | goodbye'}
                onChange={(event) => setBulkText(event.target.value)}
              />
              <p className="text-xs text-slate-400">Each line becomes a multiple-choice challenge. Distractor options are picked automatically from the other pasted lines, so paste at least three pairs for the best variety.</p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => { setBulkOpen(false); setBulkText(''); }}>Cancel</Button>
                <Button type="button" size="sm" onClick={addBulkChallenges}>Add challenges</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UnitEditor({ unit, index, isFirst, isLast, analytics, onChange, onRemove, onMoveUp, onMoveDown }: {
  unit: EditorUnit; index: number; isFirst: boolean; isLast: boolean; analytics: ChallengeAnalyticsMap; onChange: (next: EditorUnit) => void; onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const [open, setOpen] = useState(true);
  const updateLesson = (lessonKey: string, next: EditorLesson) => onChange({ ...unit, lessons: unit.lessons.map((lesson) => lesson._key === lessonKey ? next : lesson) });
  const moveLesson = (lessonIndex: number, offset: number) => {
    const target = lessonIndex + offset;
    if (target < 0 || target >= unit.lessons.length) return;
    const lessons = [...unit.lessons];
    [lessons[lessonIndex], lessons[target]] = [lessons[target], lessons[lessonIndex]];
    onChange({ ...unit, lessons });
  };
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm dark:border-surface-raised dark:bg-surface-raised/20">
      <header className="flex items-center gap-3 p-4 sm:p-5">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-600 font-black text-white">{index + 1}</div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-bold text-slate-900 dark:text-white">{unit.title || `New unit ${index + 1}`}</h2>
          <p className="text-xs text-slate-400">{unit.lessons.length} lesson{unit.lessons.length === 1 ? '' : 's'}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" disabled={isFirst} onClick={onMoveUp} aria-label={`Move unit ${index + 1} up`}><ArrowUp className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" disabled={isLast} onClick={onMoveDown} aria-label={`Move unit ${index + 1} down`}><ArrowDown className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => setOpen((value) => !value)}>{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>
        <Button type="button" variant="ghost" size="icon" className="text-rose-500" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
      </header>
      {open && (
        <div className="space-y-4 border-t border-slate-200 p-4 sm:p-5 dark:border-surface-raised">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Unit title</Label><Input value={unit.title} maxLength={160} placeholder="e.g. Everyday Basics" onChange={(event) => onChange({ ...unit, title: event.target.value })} /></div>
            <div className="space-y-1.5"><Label>Short description</Label><Input value={unit.description} maxLength={500} placeholder="What this unit covers" onChange={(event) => onChange({ ...unit, description: event.target.value })} /></div>
          </div>
          <div className="space-y-3">
            {unit.lessons.map((lesson, lessonIndex) => (
              <LessonEditor
                key={lesson._key}
                lesson={lesson}
                index={lessonIndex}
                isFirst={lessonIndex === 0}
                isLast={lessonIndex === unit.lessons.length - 1}
                analytics={analytics}
                onChange={(next) => updateLesson(lesson._key, next)}
                onRemove={() => onChange({ ...unit, lessons: unit.lessons.filter((item) => item._key !== lesson._key) })}
                onMoveUp={() => moveLesson(lessonIndex, -1)}
                onMoveDown={() => moveLesson(lessonIndex, 1)}
              />
            ))}
          </div>
          <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => onChange({ ...unit, lessons: [...unit.lessons, newLesson()] })}><Plus className="mr-2 h-4 w-4" /> Add lesson</Button>
        </div>
      )}
    </section>
  );
}

export default function LanguageQuestEditor() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [course, setCourse] = useState<EditorCourse>(emptyCourse);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(isEdit ? null : courseContentSnapshot(course));
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [analytics, setAnalytics] = useState<ChallengeAnalyticsMap>(new Map());
  const dirty = savedSnapshot !== null && savedSnapshot !== courseContentSnapshot(course);

  const reviewRequired = course.reviewRequired || (!isEdit && user?.role === 'TEACHER');
  const canSubmitForReview = isEdit
    && reviewRequired
    && !isAdmin
    && (course.reviewStatus === 'DRAFT' || course.reviewStatus === 'CHANGES_REQUESTED')
    && !course.retired;

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    apiGet(`/api/language-quest/manage/courses/${id}`, { signal: controller.signal })
      .then((payload) => {
        const hydrated = hydrateCourse(payload);
        setCourse(hydrated);
        setSavedSnapshot(courseContentSnapshot(hydrated));
      })
      .catch((error: any) => {
        if (error?.name !== 'AbortError') toast.error(error?.message || 'Could not load the course');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    // Best-effort: a teacher's own course may have no attempt data yet, and
    // this view shouldn't block editing if the analytics call fails.
    apiGet<{ questions: Array<{ challengeId: string; attempts: number; correctAttempts: number; accuracyPercent: number | null; status: LanguageQuestAnalyticsStatus }> }>(
      `/api/language-quest/analytics?courseId=${id}`,
      { signal: controller.signal },
    )
      .then((payload) => {
        const next: ChallengeAnalyticsMap = new Map();
        for (const question of payload?.questions || []) {
          next.set(question.challengeId, {
            attempts: question.attempts,
            correctAttempts: question.correctAttempts,
            accuracyPercent: question.accuracyPercent,
            status: question.status,
          });
        }
        setAnalytics(next);
      })
      .catch(() => { /* Non-blocking: leave analytics empty on failure. */ });
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

  const updateUnit = (unitKey: string, next: EditorUnit) => setCourse((current) => ({ ...current, units: current.units.map((unit) => unit._key === unitKey ? next : unit) }));
  const moveUnit = (unitIndex: number, offset: number) => setCourse((current) => {
    const target = unitIndex + offset;
    if (target < 0 || target >= current.units.length) return current;
    const units = [...current.units];
    [units[unitIndex], units[target]] = [units[target], units[unitIndex]];
    return { ...current, units };
  });

  const save = async (): Promise<boolean> => {
    if (!course.title.trim()) { toast.error('Give the course a title'); return false; }
    if (!course.language.trim()) { toast.error('Enter the language being taught'); return false; }
    setSaving(true);
    try {
      if (isEdit) {
        const submittedCourse = course;
        const result = await apiSend<CourseSaveResult>(`/api/language-quest/manage/courses/${id}`, 'PUT', course);
        setCourse((current) => ({
          ...current,
          published: result.published,
          reviewRequired: result.reviewRequired,
          reviewStatus: result.reviewStatus,
          reviewNote: result.reviewStatus === 'DRAFT' ? '' : current.reviewNote,
          submittedForReviewAt: result.reviewStatus === 'DRAFT' ? null : current.submittedForReviewAt,
          reviewedAt: result.reviewStatus === 'DRAFT' ? null : current.reviewedAt,
          updatedAt: result.updatedAt,
        }));
        setSavedSnapshot(courseContentSnapshot({
          ...submittedCourse,
          published: result.published,
          reviewRequired: result.reviewRequired,
          reviewStatus: result.reviewStatus,
          reviewNote: result.reviewStatus === 'DRAFT' ? '' : submittedCourse.reviewNote,
          submittedForReviewAt: result.reviewStatus === 'DRAFT' ? null : submittedCourse.submittedForReviewAt,
          reviewedAt: result.reviewStatus === 'DRAFT' ? null : submittedCourse.reviewedAt,
          updatedAt: result.updatedAt,
        }));
        toast.success(result.published ? 'Course saved and published' : 'Draft saved');
      } else {
        const result = await apiSend<CourseSaveResult>('/api/language-quest/manage/courses', 'POST', course);
        toast.success(result.published ? 'Course created and published' : 'Course draft created');
        navigate(`/games/language-quest/manage/${result.id}`, { replace: true });
      }
      return true;
    } catch (error: any) {
      toast.error(error?.message || 'Could not save the course');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const confirmLeave = (event: React.MouseEvent) => {
    if (dirty && !window.confirm('Discard your unsaved Course Studio changes?')) event.preventDefault();
  };

  const submitForReview = async () => {
    if (!id || !canSubmitForReview) return;
    setSubmitting(true);
    try {
      const saved = await save();
      if (!saved) return;
      const result = await apiSend<{ reviewStatus: LanguageQuestCourseReviewStatus; published: boolean; updatedAt: string }>(`/api/language-quest/manage/courses/${id}/submit-review`, 'POST');
      setCourse((current) => ({
        ...current,
        reviewStatus: result.reviewStatus,
        published: result.published,
        reviewNote: '',
        submittedForReviewAt: new Date().toISOString(),
        reviewedAt: null,
        updatedAt: result.updatedAt,
      }));
      toast.success('Course submitted for administrator review');
    } catch (error: any) {
      toast.error(error?.message || 'Could not submit the course for review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="grid min-h-[420px] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={confirmLeave} render={<Link to="/games/language-quest/manage" />} nativeButton={false}><ArrowLeft className="h-4 w-4" /></Button>
          <div><h1 className="text-2xl font-black text-slate-900 dark:text-white">{isEdit ? 'Edit Course' : 'New Course'}</h1><p className="text-sm text-slate-500">Build from units → lessons → challenges.</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {dirty && <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">Unsaved changes</Badge>}
          {isEdit && (
            <Button variant="outline" render={<Link to={`/games/language-quest/analytics?courseId=${id}`} />} nativeButton={false}>
              <BarChart3 className="mr-2 h-4 w-4" /> View analytics
            </Button>
          )}
          {canSubmitForReview && (
            <Button variant="outline" onClick={submitForReview} disabled={saving || submitting}>
              <Send className="mr-2 h-4 w-4" /> {submitting ? 'Submitting…' : 'Save & submit'}
            </Button>
          )}
          <Button onClick={() => void save()} disabled={saving || submitting}><Save className="mr-2 h-4 w-4" /> {saving ? 'Saving…' : 'Save course'}</Button>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-surface-raised dark:bg-surface-indigo">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_90px_90px]">
          <div className="space-y-1.5"><Label htmlFor="course-title">Course title</Label><Input id="course-title" value={course.title} maxLength={120} placeholder="Everyday English" onChange={(event) => setCourse({ ...course, title: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="course-language">Language</Label><Input id="course-language" value={course.language} maxLength={80} placeholder="English" onChange={(event) => setCourse({ ...course, language: event.target.value })} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="course-category">Category</Label>
            <select
              id="course-category"
              value={course.category}
              onChange={(event) => setCourse({ ...course, category: event.target.value })}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 dark:border-surface-raised dark:bg-surface-indigo dark:text-white"
            >
              {/* Preserve an existing custom category (set outside Course Studio, e.g. by a generator script) as its own option rather than silently overwriting it. */}
              {!LANGUAGE_QUEST_COURSE_CATEGORIES.includes(course.category as any) && course.category && (
                <option value={course.category}>{course.category} (custom)</option>
              )}
              {LANGUAGE_QUEST_COURSE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="course-emoji">Icon</Label><Input id="course-emoji" className="text-center text-xl" value={course.imageEmoji} maxLength={16} onChange={(event) => setCourse({ ...course, imageEmoji: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="course-color">Colour</Label><Input id="course-color" type="color" className="h-8 p-1" value={course.accentColor} onChange={(event) => setCourse({ ...course, accentColor: event.target.value })} /></div>
        </div>
        <div className="mt-4 space-y-1.5"><Label htmlFor="course-description">Description</Label><Textarea id="course-description" value={course.description} maxLength={1000} rows={2} placeholder="What will people learn in this course?" onChange={(event) => setCourse({ ...course, description: event.target.value })} /></div>
        {reviewRequired ? (
          <div className={`mt-5 rounded-2xl border p-4 ${course.reviewStatus === 'CHANGES_REQUESTED' ? 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10' : course.reviewStatus === 'PENDING' ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10' : course.reviewStatus === 'APPROVED' ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10' : 'border-violet-200 bg-violet-50 dark:border-violet-500/30 dark:bg-violet-500/10'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/80 text-violet-700 shadow-sm dark:bg-surface-indigo dark:text-violet-300">
                  {course.reviewStatus === 'PENDING' ? <Clock3 className="h-5 w-5" /> : course.reviewStatus === 'CHANGES_REQUESTED' ? <MessageSquareWarning className="h-5 w-5" /> : course.reviewStatus === 'APPROVED' ? <CheckCircle2 className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">Administrator approval</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {!isEdit
                      ? 'Save the course first. You can submit it once it contains at least one challenge.'
                      : course.reviewStatus === 'PENDING'
                        ? 'This course is private while an administrator reviews it. Saving further edits returns it to draft.'
                        : course.reviewStatus === 'APPROVED'
                          ? 'This course is approved and live. Any teacher edit returns it to draft for a fresh review.'
                          : course.reviewStatus === 'CHANGES_REQUESTED'
                            ? 'Update the course using the feedback below, then save and submit it again.'
                            : 'Save your work, then submit the finished course for administrator review.'}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-white/70 dark:bg-surface-indigo">
                {languageQuestReviewStatusLabel(course.reviewStatus)}
              </Badge>
            </div>
            {course.reviewStatus === 'CHANGES_REQUESTED' && course.reviewNote && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-white/70 p-3 dark:border-rose-500/30 dark:bg-surface-indigo/70">
                <p className="text-xs font-black uppercase tracking-wide text-rose-700 dark:text-rose-200">Reviewer feedback</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{course.reviewNote}</p>
              </div>
            )}
            {canSubmitForReview && (
              <Button className="mt-4" onClick={submitForReview} disabled={saving || submitting}>
                <Send className="mr-2 h-4 w-4" /> {submitting ? 'Submitting…' : 'Save & submit for review'}
              </Button>
            )}
            {isAdmin && course.reviewStatus === 'PENDING' && (
              <Button className="mt-4" variant="outline" onClick={confirmLeave} render={<Link to="/games/language-quest/manage" />} nativeButton={false}>
                <ShieldCheck className="mr-2 h-4 w-4" /> Return to review queue
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-5 flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-surface-raised dark:bg-surface-raised/30">
            <div>
              <Label htmlFor="course-published" className="text-sm font-semibold">Published for everyone</Label>
              <p className="mt-0.5 text-xs text-slate-500">
                {course.retired
                  ? 'This legacy course is retired. Existing learner records are preserved, but the course cannot return to the public catalog.'
                  : 'Administrator and official courses can be published directly when the lessons are ready.'}
              </p>
            </div>
            <Switch id="course-published" checked={course.published} disabled={course.retired} onCheckedChange={(checked) => setCourse({ ...course, published: checked })} />
          </div>
        )}
      </section>

      <div className="space-y-5">
        {course.units.map((unit, unitIndex) => (
          <UnitEditor
            key={unit._key}
            unit={unit}
            index={unitIndex}
            isFirst={unitIndex === 0}
            isLast={unitIndex === course.units.length - 1}
            analytics={analytics}
            onChange={(next) => updateUnit(unit._key, next)}
            onRemove={() => setCourse((current) => ({ ...current, units: current.units.filter((item) => item._key !== unit._key) }))}
            onMoveUp={() => moveUnit(unitIndex, -1)}
            onMoveDown={() => moveUnit(unitIndex, 1)}
          />
        ))}
      </div>

      <Button type="button" variant="outline" className="w-full border-2 border-dashed py-6" onClick={() => setCourse((current) => ({ ...current, units: [...current.units, newUnit()] }))}><Plus className="mr-2 h-4 w-4" /> Add unit</Button>

      <div className="fixed bottom-4 right-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur dark:border-surface-raised dark:bg-surface-indigo/95">
        <Button onClick={() => void save()} disabled={saving || submitting}><Save className="mr-2 h-4 w-4" /> {saving ? 'Saving…' : reviewRequired ? 'Save draft' : course.published ? 'Save & publish' : 'Save draft'}</Button>
      </div>
    </div>
  );
}
