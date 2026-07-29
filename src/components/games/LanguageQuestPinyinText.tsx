interface LanguageQuestPinyinTextProps {
  text: string;
  pinyin: string[] | null;
  size?: 'sm' | 'lg';
}

const HAN_CHARACTER_RE = /\p{Script=Han}/u;

export function LanguageQuestPinyinText({
  text,
  pinyin,
  size = 'sm',
}: LanguageQuestPinyinTextProps) {
  const characters = Array.from(text);
  if (!pinyin || pinyin.length !== characters.length) {
    return <span className="select-text">{text}</span>;
  }

  return (
    <span
      lang="zh-Hans"
      className="flex flex-wrap items-end gap-x-0.5 gap-y-2 select-text"
      aria-label={`${text}, ${pinyin.filter((token, index) => HAN_CHARACTER_RE.test(characters[index])).join(' ')}`}
    >
      {characters.map((character, index) => (
        HAN_CHARACTER_RE.test(character) ? (
          <span
            key={`${index}-${character}`}
            className="inline-flex flex-col items-center leading-none"
            aria-hidden="true"
          >
            <span className={size === 'lg' ? 'text-3xl' : 'text-lg'}>{character}</span>
            <span
              lang="zh-Latn-pinyin"
              className={`mt-1 font-bold tracking-wide text-sky-600 dark:text-sky-300 ${
                size === 'lg' ? 'text-sm' : 'text-[0.68rem]'
              }`}
            >
              {pinyin[index]}
            </span>
          </span>
        ) : (
          <span key={`${index}-${character}`} aria-hidden="true">{character}</span>
        )
      ))}
    </span>
  );
}
