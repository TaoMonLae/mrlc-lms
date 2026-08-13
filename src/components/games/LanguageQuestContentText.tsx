import { MathText } from '@/src/components/MathText';
import { languageQuestCourseMode } from '@/shared/languageQuest';
import { LanguageQuestPinyinText } from '@/src/components/games/LanguageQuestPinyinText';

interface LanguageQuestContentTextProps {
  language: string;
  text: string;
  pinyin?: string[] | null;
  className?: string;
}

/** Renders mathematical notation with KaTeX and language content with Pinyin support. */
export function LanguageQuestContentText({ language, text, pinyin, className }: LanguageQuestContentTextProps) {
  if (languageQuestCourseMode(language) === 'mathematics') {
    return <MathText className={className}>{text}</MathText>;
  }
  return <span className={className}><LanguageQuestPinyinText text={text} pinyin={pinyin ?? null} /></span>;
}
