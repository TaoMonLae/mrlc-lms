import { languageQuestAssessmentPrompt, languageQuestPracticePrompt } from './languageQuest';
import { LANGUAGE_QUEST_STORIES } from './languageQuestStory';
import { normalizeLanguageQuestLanguage, normalizeLanguageQuestSpeechText } from './languageQuestVoice';

export interface AudioCourse {
  code: string;
  title: string;
  language: string;
  challenges: Array<{ type: string; question: string; options: Array<{ text: string; audioText?: string | null; correct: boolean }> }>;
}
export interface CourseAudioText { text: string; language: string; courses: string[]; priority: number }
export const ELEVENLABS_COURSE_LANGUAGES: Record<string, string> = {
  english: 'en', malay: 'ms', 'bahasa melayu': 'ms', chinese: 'zh', mandarin: 'zh', 'mandarin chinese': 'zh',
  spanish: 'es', french: 'fr', italian: 'it', japanese: 'ja',
};

/** Covers study cards, option buttons, dictation, spoken prompts and story lines. */
export function buildCourseAudioPlan(courses: AudioCourse[], options: { vocabularyOnly?: boolean } = {}) {
  const clips = new Map<string, CourseAudioText>();
  const skipped: Array<{ course: string; reason: string }> = [];
  function add(value: string, course: AudioCourse, priority: number) {
    const text = normalizeLanguageQuestSpeechText(value);
    if (!text) { skipped.push({ course: course.code, reason: 'Empty or over 500 characters' }); return; }
    const language = normalizeLanguageQuestLanguage(course.language);
    const key = JSON.stringify([language, text]);
    const existing = clips.get(key);
    if (existing) {
      if (!existing.courses.includes(course.code)) existing.courses.push(course.code);
      existing.priority = Math.min(existing.priority, priority);
    } else clips.set(key, { text, language, courses: [course.code], priority });
  }
  for (const course of courses) {
    if (!ELEVENLABS_COURSE_LANGUAGES[normalizeLanguageQuestLanguage(course.language)]) {
      skipped.push({ course: course.code, reason: 'Unsupported course language' });
      continue;
    }
    for (const challenge of course.challenges) {
      for (const option of challenge.options) {
        if (option.audioText || option.correct) add(option.audioText || option.text, course, 0);
        // The protected final-exam route speaks the answer itself.
        if (challenge.type === 'DICTATION' && option.correct) add(option.text, course, 0);
      }
      if (options.vocabularyOnly) continue;
      add(languageQuestPracticePrompt(challenge.question), course, 1);
      add(languageQuestAssessmentPrompt(challenge.question, challenge.type, challenge.options.map((option) => option.text)), course, 1);
    }
    if (options.vocabularyOnly) continue;
    for (const story of LANGUAGE_QUEST_STORIES.filter((story) => normalizeLanguageQuestLanguage(story.language) === normalizeLanguageQuestLanguage(course.language))) {
      for (const node of Object.values(story.nodes)) add(node.audioText || node.line, course, 0);
    }
  }
  const ordered: CourseAudioText[] = [];
  for (const priority of [0, 1]) {
    const byLanguage = new Map<string, CourseAudioText[]>();
    for (const clip of clips.values()) {
      if (clip.priority !== priority) continue;
      const group = byLanguage.get(clip.language) || [];
      group.push(clip);
      byLanguage.set(clip.language, group);
    }
    const groups = [...byLanguage.values()];
    for (let position = 0; position < Math.max(0, ...groups.map((group) => group.length)); position++) {
      for (const group of groups) if (group[position]) ordered.push(group[position]);
    }
  }
  return { clips: ordered, skipped };
}
