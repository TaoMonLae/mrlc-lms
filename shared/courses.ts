import { z } from 'zod';

export const COURSE_SUBJECTS = ['Mathematical Reasoning', 'Reasoning Through Language Arts', 'Science', 'Social Studies', 'Other'] as const;
export const COURSE_KINDS = ['TEXT', 'QUIZ', 'VIDEO_LINK', 'VIDEO', 'EBOOK', 'PRACTICE', 'HOMEWORK', 'EXAM', 'LINK'] as const;
export const COURSE_KIND_LABELS: Record<CourseKind, string> = { TEXT: 'Written lesson', QUIZ: 'Course unit test', VIDEO_LINK: 'Video in course', VIDEO: 'Uploaded video lesson', EBOOK: 'E-book', PRACTICE: 'Optional Learning Quest practice', HOMEWORK: 'Homework', EXAM: 'Linked exam', LINK: 'External reading' };
export const COURSE_STATUS_LABELS: Record<string, string> = { DRAFT: 'Draft', IN_REVIEW: 'Awaiting review', CHANGES_REQUESTED: 'Changes requested', PUBLISHED: 'Published', ARCHIVED: 'Archived' };
const id = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
export const courseQuestionSchema = z.object({
  id, kind: z.enum(['CHOICE', 'NUMERIC']), prompt: z.string().trim().min(10).max(3000),
  passage: z.string().trim().max(4000).default(''), options: z.array(z.string().trim().min(1).max(500)).max(5).default([]),
  answer: z.string().trim().min(1).max(500), explanation: z.string().trim().min(10).max(2000),
}).superRefine((question, ctx) => {
  if (question.kind === 'CHOICE' && (question.options.length !== 4 || new Set(question.options).size !== 4 || !question.options.includes(question.answer))) ctx.addIssue({ code: 'custom', message: 'A choice question needs four distinct options and one matching answer.' });
  if (question.kind === 'NUMERIC' && (question.options.length || !Number.isFinite(Number(question.answer)))) ctx.addIssue({ code: 'custom', message: 'A numeric question needs a numeric answer and no choices.' });
});
export function courseExternalUrl(value: string): string | null {
  if (/[\s\\\u0000-\u001f]/.test(value)) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function courseVideoEmbedUrl(value: string): string | null {
  const safe = courseExternalUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  let videoId: string | null = null;
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) videoId = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})$/)?.[1] ?? null;
  if (url.hostname === 'youtu.be') videoId = url.pathname.match(/^\/([\w-]{11})$/)?.[1] ?? null;
  if (videoId && /^[\w-]{11}$/.test(videoId)) return `https://www.youtube-nocookie.com/embed/${videoId}`;
  videoId = null;
  if (['vimeo.com', 'www.vimeo.com'].includes(url.hostname)) videoId = url.pathname.match(/^\/(\d+)$/)?.[1] ?? null;
  if (url.hostname === 'player.vimeo.com') videoId = url.pathname.match(/^\/video\/(\d+)$/)?.[1] ?? null;
  return videoId && /^\d+$/.test(videoId) ? `https://player.vimeo.com/video/${videoId}` : null;
}
export const courseItemSchema = z.object({
  id, title: z.string().trim().min(1).max(160), kind: z.enum(COURSE_KINDS),
  content: z.string().trim().max(30000).default(''), resourceId: z.string().max(100).regex(/^[a-zA-Z0-9_-]*$/).default(''),
  url: z.string().trim().max(2000).default(''), source: z.string().trim().max(1000).default(''),
  minutes: z.number().int().min(1).max(600).default(15),
  optional: z.boolean().optional(),
  questions: z.array(courseQuestionSchema).max(30).optional(), passingPercent: z.number().int().min(1).max(100).optional(),
});
export const courseDraftSchema = z.object({
  title: z.string().trim().min(1).max(160), subject: z.enum(COURSE_SUBJECTS),
  level: z.enum(['Foundation', 'Pre-GED', 'GED']), language: z.enum(['English', 'Burmese', 'Mon', 'Multilingual']),
  summary: z.string().trim().max(3000).default(''), objectives: z.string().trim().max(4000).default(''),
  modules: z.array(z.object({ id, studyChapter: z.string().max(160).optional(), title: z.string().trim().min(1).max(160), outcomes: z.string().trim().max(2000).default(''), items: z.array(courseItemSchema).max(30) })).max(30),
}).superRefine((draft, ctx) => {
  const ids = [...draft.modules.map(m => m.id), ...draft.modules.flatMap(m => m.items.map(i => i.id))];
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'Each module and lesson needs a unique ID.' });
  if (draft.modules.flatMap(m => m.items).length > 200) ctx.addIssue({ code: 'custom', message: 'A course can contain up to 200 lessons.' });
  for (const item of draft.modules.flatMap(m => m.items)) {
    if (item.url && !courseExternalUrl(item.url)) ctx.addIssue({ code: 'custom', message: `${item.title}: use a full HTTPS link without login credentials.` });
    if (item.kind === 'VIDEO_LINK' && !courseVideoEmbedUrl(item.url)) ctx.addIssue({ code: 'custom', message: `${item.title}: use a supported YouTube or Vimeo video URL.` });
    if (item.kind === 'QUIZ' && (!item.questions || item.questions.length < 3 || new Set(item.questions.map(q => q.id)).size !== item.questions.length)) ctx.addIssue({ code: 'custom', message: `${item.title}: add at least three uniquely identified questions.` });
  }
});
export type CourseKind = typeof COURSE_KINDS[number];
export type CourseDraft = z.infer<typeof courseDraftSchema>;
export type CourseItem = z.infer<typeof courseItemSchema>;
export type CourseQuestion = z.infer<typeof courseQuestionSchema>;
export type CourseStatus = 'DRAFT' | 'IN_REVIEW' | 'CHANGES_REQUESTED' | 'PUBLISHED' | 'ARCHIVED';
export function courseReadiness(draft: CourseDraft): string[] {
  const issues: string[] = [];
  if (!draft.summary) issues.push('Add a course summary.');
  if (!draft.objectives) issues.push('Describe what students will learn.');
  if (!draft.modules.length) issues.push('Add at least one module.');
  draft.modules.forEach((module, index) => {
    if (!module.outcomes) issues.push(`Module ${index + 1}: add a learning outcome.`);
    if (!module.items.length) issues.push(`Module ${index + 1}: add at least one lesson.`);
    module.items.forEach(item => {
      if (item.kind === 'TEXT' && !item.content) issues.push(`${item.title}: write the lesson content.`);
      if (!['TEXT', 'LINK', 'QUIZ', 'VIDEO_LINK'].includes(item.kind) && !item.resourceId) issues.push(`${item.title}: choose a learning resource.`);
      if (item.kind === 'LINK' && (!courseExternalUrl(item.url) || !item.source)) issues.push(`${item.title}: add a valid HTTPS link and source attribution.`);
      if (item.kind === 'VIDEO_LINK' && (!courseVideoEmbedUrl(item.url) || !item.source)) issues.push(`${item.title}: add a supported video link and source attribution.`);
    });
  });
  return issues;
}
export function courseTotals(draft: CourseDraft) {
  const items = draft.modules.flatMap(m => m.items);
  return { modules: draft.modules.length, lessons: items.length, minutes: items.reduce((n, item) => n + item.minutes, 0) };
}
export function courseProgress(draft: CourseDraft, completedIds: string[]) {
  const completed = new Set(completedIds);
  const items = draft.modules.flatMap(m => m.items).filter(item => !(item.kind === 'PRACTICE' && item.optional));
  const count = items.filter(item => completed.has(item.id)).length;
  return { completed: count, total: items.length, percent: items.length ? Math.round(count / items.length * 100) : 0, nextId: items.find(item => !completed.has(item.id))?.id ?? null };
}
export function courseResourceHref(item: CourseItem): string | null {
  const resource = encodeURIComponent(item.resourceId);
  if (item.kind === 'LINK') return courseExternalUrl(item.url);
  if (!item.resourceId) return null;
  return ({ VIDEO: `/videos/${resource}`, EBOOK: `/elibrary/${resource}/read`, PRACTICE: `/games/language-quest/lessons/${resource}`, HOMEWORK: `/student/homework?assignment=${resource}`, EXAM: `/exam2/resume?exam=${resource}` } as Partial<Record<CourseKind, string>>)[item.kind] ?? null;
}
export interface CourseRecord {
  id: string; ownerId: string; ownerName: string; status: CourseStatus; revision: number; draft: CourseDraft;
  reviewNote: string | null; updatedAt: string; publishedVersion: number | null; enrollmentCount: number;
}
export interface CourseEnrollmentRecord {
  id: string; courseId: string; className: string; version: number; syllabus: CourseDraft;
  completedIds: string[]; assignedAt: string; quizResults?: { itemId: string; score: number; total: number; passed: boolean; submittedAt: string }[];
}
export function studentCourseDraft(draft: CourseDraft): CourseDraft {
  return { ...draft, modules: draft.modules.map(module => ({
    ...module, items: module.items.map(({ questions: _questions, ...item }) => item),
  })) };
}
export interface CourseResource { id: string; title: string; classId?: string | null; }
export const GED_COURSE_TEMPLATES = [
  { key: 'math', subject: 'Mathematical Reasoning', title: 'GED Mathematical Reasoning', summary: 'Build quantitative and algebraic reasoning through worked examples, problem solving and review.', objectives: 'Interpret a problem, choose a strategy, show the reasoning and check whether the answer makes sense.', modules: [
    ['Number sense and problem solving', 'Compare numbers, carry out operations and translate word problems into a plan.'],
    ['Decimals and fractions', 'Represent, compare and calculate with fractions and decimals.'],
    ['Ratio, proportion and percent', 'Solve proportional, percent change and simple interest problems in context.'],
    ['Data, statistics and probability', 'Interpret tables and graphs, summarize data and reason about probability.'],
    ['Algebra basics, expressions and polynomials', 'Apply number properties and simplify algebraic expressions.'],
    ['Equations, inequalities and functions', 'Solve and graph relationships, and interpret functions in context.'],
    ['Geometry', 'Use measurements, formulas and spatial reasoning to solve geometry problems.'],
  ] },
  { key: 'rla', subject: 'Reasoning Through Language Arts', title: 'GED Reasoning Through Language Arts', summary: 'Read closely, evaluate evidence, edit in context and develop a source-based argument.', objectives: 'Support interpretations with textual evidence, compare arguments and revise clear, organized writing.', modules: [
    ['Interpreting nonfiction and informational text', 'Find central ideas, relationships, tone and evidence in informational reading.'],
    ['Analyzing nonfiction and informational text', 'Evaluate purpose, arguments and related texts or graphics.'],
    ['Interpreting fiction', 'Explain plot, character, theme, inference and literary language.'],
    ['Writing effective sentences', 'Build clear sentences and repair common structural errors.'],
    ['Connecting ideas', 'Organize relevant ideas and connect sentences and paragraphs logically.'],
    ['Writing about text', 'Plan, draft and revise a response that evaluates source arguments and evidence.'],
    ['Polishing your writing', 'Improve sentence clarity, organization and word choice.'],
    ['Using grammar correctly', 'Edit agreement, verb forms and tense in context.'],
    ['Using writing mechanics', 'Edit punctuation, capitalization and commonly confused forms.'],
  ] },
  { key: 'science', subject: 'Science', title: 'GED Science', summary: 'Apply scientific reasoning to life, physical, and Earth and space science contexts.', objectives: 'Interpret scientific information, evaluate an investigation and use data to justify a conclusion.', modules: [
    ['Science practices', 'Interpret scientific presentations, experiments, statistics and formulas.'],
    ['Life science', 'Use evidence to reason about cells, body systems, heredity and ecosystems.'],
    ['Earth and space science', 'Interpret evidence about Earth systems, climate and space.'],
    ['Physical science', 'Use models and data to reason about matter, energy, motion and forces.'],
  ] },
  { key: 'social-studies', subject: 'Social Studies', title: 'GED Social Studies', summary: 'Interpret historical and civic sources, examine arguments and reason with quantitative evidence.', objectives: 'Distinguish claim from evidence, compare perspectives and draw supported conclusions from sources and data.', modules: [
    ['Social studies practices', 'Analyze sources, reasoning, perspective and quantitative evidence.'],
    ['U.S. history', 'Use historical sources to explain sequence, change and cause.'],
    ['Civics and government', 'Interpret civic documents, government structures and citizen roles.'],
    ['Economics', 'Use economic concepts and data to interpret real situations.'],
    ['Geography and the world', 'Interpret maps, resources and relationships between people and place.'],
  ] },
] as const;
export function newCourseDraft(templateKey?: string, makeId: () => string = () => crypto.randomUUID()): CourseDraft {
  const template = GED_COURSE_TEMPLATES.find(t => t.key === templateKey);
  return {
    title: template?.title ?? 'Untitled course', subject: template?.subject ?? 'Other', level: 'GED', language: 'English',
    summary: template?.summary ?? '', objectives: template?.objectives ?? '',
    modules: template?.modules.map(([title, outcomes]) => ({ id: makeId(), title, outcomes, items: [] })) ?? [],
  };
}
