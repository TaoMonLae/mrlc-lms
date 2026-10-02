export type ReleaseHighlight = {
  eyebrow: string;
  title: string;
  description: string;
  details: string[];
  accent: 'blue' | 'mint' | 'coral';
  icon: 'sparkles' | 'cursor' | 'map';
};

export type AppRelease = {
  id: string;
  version: string;
  releasedAt: string;
  title: string;
  summary: string;
  highlights: ReleaseHighlight[];
};

/**
 * Update this record whenever a new app release ships. Changing `id` makes
 * the What's New screen appear once for every signed-in user on each device.
 */
export const CURRENT_RELEASE: AppRelease = {
  id: '2026-10-02-exam-studio-and-student-experience',
  version: 'October 2026 · Exams',
  releasedAt: '2026-10-02T00:00:00.000Z',
  title: 'Clearer exams, from first question to final review',
  summary: 'Build exams in a focused Studio, find teacher tools in grouped menus and give students a clearer question paper with a review step before submission.',
  highlights: [
    {
      eyebrow: 'For students',
      title: 'A question paper that is easier to follow',
      description: 'A focused reading area keeps questions and answers together, with a precise timer and clear progress through the exam.',
      details: [
        'Numbered navigation distinguishes answered, unanswered and flagged questions.',
        'Reading passages sit beside questions on larger screens and stack on mobile.',
        'Answer controls and navigation use a consistent layout in preview and live exams.',
      ],
      accent: 'mint',
      icon: 'map',
    },
    {
      eyebrow: 'Before you submit',
      title: 'Review your answers with confidence',
      description: 'Open the review screen to check your progress and return to any question before making your final submission.',
      details: [
        'See how many questions are answered and flagged for another look.',
        'Move between questions without losing the answers you have entered.',
        'Teacher previews let you try the full flow without submitting a student attempt.',
      ],
      accent: 'blue',
      icon: 'cursor',
    },
    {
      eyebrow: 'For teachers',
      title: 'A focused Exam Studio',
      description: 'Move through details, questions, scheduling and grading settings with a dedicated question outline and an interactive student preview.',
      details: [
        'Choose from eight question types and organize questions from the outline.',
        'Collapse the preview or change its width while editing.',
        'Keep drafts while switching setup steps, with clear save and retry messages.',
      ],
      accent: 'coral',
      icon: 'sparkles',
    },
    {
      eyebrow: 'Exam management',
      title: 'The right tools, grouped together',
      description: 'The exam overview gives the title more room and organizes teacher actions into compact menus.',
      details: [
        'Manage exam groups authoring, scheduling, printing and archive actions.',
        'Responses groups monitoring, grading and gradebook synchronization.',
        'Open in Studio and Preview remain directly accessible.',
      ],
      accent: 'mint',
      icon: 'map',
    },
  ],
};
