import { createContext, useContext, useMemo, useState } from 'react';
import { Languages } from 'lucide-react';

export type ExplanationLanguage = 'en' | 'my';

const STORAGE_KEY = 'mrlc-language-quest-explanation-language';

const copy = {
  en: {
    explanation: 'Explanation',
    journeySummary: 'Build useful language skills through quick lessons, friendly challenges, streaks, and school-wide competition.',
    sentenceFeatureTitle: 'New: remember vocabulary before spelling',
    sentenceFeatureBody: 'Lessons now give every word or phrase two multiple-choice recognition rounds before spelling and sentence writing. Mistakes are retried without costing hearts, so learners build memory before the scored quiz.',
    progressSaved: 'Your progress is saved automatically.',
    lessonGuideTitle: 'How each lesson works',
    lessonGuideBody: 'Each lesson adapts to its content: useful words move through listening, recognition, spelling, and sentence recall, while matching and word-order activities use their own focused interaction before the scored check.',
    learnTitle: '1. Learn',
    learnBody: 'Listen and connect the phrase to its situation.',
    vocabularyTitle: '2. Pick',
    vocabularyBody: 'Match every word or phrase to its meaning twice before typing it.',
    spellTitle: '3. Spell',
    spellBody: 'Listen without seeing the answer, then type what you hear.',
    buildTitle: '4. Build',
    buildBody: 'Type complete sentences from memory.',
    checkTitle: '5. Check',
    checkBody: 'Answer a clue-safe quiz and use corrections to retry.',
    whenToUse: 'When to use it',
    listenSay: 'Listen, say it aloud, then move on when the meaning feels clear.',
    burmesePromptFallback: '',
    sentenceHeading: 'Type the complete phrase from memory.',
    situation: 'Situation',
    sentenceHelp: 'Capital letters and punctuation do not affect the check. Press Enter when ready.',
    sentenceHelpChinese: 'No Chinese keyboard? Type pinyin (with or without tone marks, like "ni3 hao3", "nǐ hǎo", or "ni hao") or the Hanzi characters — either is accepted.',
    incorrectTitle: 'Almost there — compare and try once more.',
    incorrectHelp: 'Focus on the missing or changed word; spelling matters, punctuation does not.',
    correctTitle: 'That sentence works!',
    correctHelp: 'You recalled the complete phrase. Say it once aloud before continuing.',
    spellingHeading: 'Listen and spell what you hear.',
    spellingInstruction: 'The written answer is hidden. Replay the audio, then type the word or phrase from memory.',
    spellingLabel: 'Your spelling',
    spellingPlaceholder: 'Type what you hear…',
    spellingHelp: 'Capital letters and light punctuation do not affect the check. The letters and words still need to match.',
    spellingHelpChinese: 'No Chinese keyboard? Type pinyin (with or without tone marks, like "ni3 hao3", "nǐ hǎo", or "ni hao") or the Hanzi characters — either is accepted.',
    spellingIncorrectTitle: 'Listen again and check each sound.',
    spellingIncorrectHelp: 'The answer stays hidden so you can try again from memory.',
    spellingCorrectTitle: 'Spelling complete!',
    spellingCorrectHelp: 'You matched the word or phrase you heard.',
    vocabularyHeading: 'Choose the word or phrase that matches.',
    vocabularyInstruction: 'Every vocabulary item appears in two recognition rounds. Correct each mistake before spelling begins.',
    vocabularyCorrectTitle: 'Good recognition!',
    vocabularyCorrectHelp: 'You connected the meaning to the right word. Say it aloud once before continuing.',
    vocabularyIncorrectTitle: 'Look again and retry this word.',
    vocabularyIncorrectHelp: 'This practice does not cost a heart. Compare the choices, then answer the same item again.',
    skipVocabulary: 'Skip vocabulary practice',
    checkVocabulary: 'Check choice',
    retryVocabulary: 'Try this word again',
    nextVocabulary: 'Next choice',
    startSpelling: 'Start spelling',
    skipSpelling: 'Skip spelling practice',
    checkSpelling: 'Check spelling',
    nextSpelling: 'Next spelling',
    startSentencePractice: 'Start sentence practice',
    startQuiz: 'Start quiz',
    outOfHeartsHelp: "No worries — take a short Heart Refill Quiz now, replay a finished lesson, or wait for the daily refill.",
    completeHelp: 'Replay lessons to practise and refill hearts.',
  },
  my: {
    explanation: 'ရှင်းလင်းချက်',
    journeySummary: 'တိုတောင်းသော သင်ခန်းစာများ၊ လေ့ကျင့်ခန်းများနှင့် နေ့စဉ်ဆက်တိုက် လေ့လာမှုတို့မှတစ်ဆင့် အသုံးဝင်သော ဘာသာစကားစွမ်းရည်များကို တိုးတက်စေပါလိမ့်မည်။',
    sentenceFeatureTitle: 'အသစ် — စာလုံးမပေါင်းမီ ဝေါဟာရကို မှတ်သားပါ',
    sentenceFeatureBody: 'စာလုံး သို့မဟုတ် စကားစုတစ်ခုစီကို စာလုံးပေါင်းခြင်းနှင့် ဝါကျရေးခြင်းမပြုမီ ရွေးချယ်မေးခွန်း နှစ်ပတ်ဖြင့် လေ့ကျင့်ရမည်။ မှားသည့်အဖြေကို နှလုံးမလျော့ဘဲ ပြန်လေ့ကျင့်နိုင်သဖြင့် အမှတ်ပေးမေးခွန်းမစမီ ပိုမိုမှတ်မိစေသည်။',
    progressSaved: 'သင်၏ လေ့လာမှုတိုးတက်မှုကို အလိုအလျောက် သိမ်းဆည်းပေးထားသည်။',
    lessonGuideTitle: 'သင်ခန်းစာတစ်ခုစီကို လေ့လာပုံ',
    lessonGuideBody: 'သင်ခန်းစာအကြောင်းအရာအလိုက် လေ့ကျင့်ပုံကို ချိန်ညှိပေးမည်။ အသုံးဝင်သော စကားလုံးများကို နားထောင်ခြင်း၊ ရွေးချယ်မှတ်သားခြင်း၊ စာလုံးပေါင်းခြင်းနှင့် ဝါကျပြန်လည်ရေးခြင်းဖြင့် လေ့ကျင့်ပြီး တွဲဖက်ခြင်းနှင့် စကားလုံးအစီအစဉ်ချခြင်းတို့ကို သီးခြားလေ့ကျင့်ပုံဖြင့် စစ်ဆေးမည်။',
    learnTitle: '၁။ လေ့လာပါ',
    learnBody: 'အသံကို နားထောင်ပြီး စကားလုံး သို့မဟုတ် ဝါကျကို သက်ဆိုင်ရာ အခြေအနေနှင့် ဆက်စပ်စဉ်းစားပါ။',
    vocabularyTitle: '၂။ ရွေးချယ်ပါ',
    vocabularyBody: 'စာမရိုက်မီ စကားလုံး သို့မဟုတ် စကားစုတစ်ခုစီကို အဓိပ္ပာယ်နှင့် နှစ်ကြိမ် ဆက်စပ်ရွေးချယ်ပါ။',
    spellTitle: '၃။ စာလုံးပေါင်းပါ',
    spellBody: 'အဖြေကို မကြည့်ဘဲ အသံနားထောင်ပြီး ကြားသည့်အတိုင်း ရေးပါ။',
    buildTitle: '၄။ ဝါကျတည်ဆောက်ပါ',
    buildBody: 'မှတ်ဉာဏ်ဖြင့် ဝါကျအပြည့်အစုံကို ရေးပါ။',
    checkTitle: '၅။ စစ်ဆေးပါ',
    checkBody: 'အဖြေဖော်ပြမထားသော မေးခွန်းကို ဖြေပြီး မှားယွင်းချက်ရှင်းလင်းချက်ကို ကြည့်ကာ ထပ်မံကြိုးစားပါ။',
    whenToUse: 'ဘယ်အချိန်မှာ သုံးမလဲ',
    listenSay: 'အသံကို နားထောင်ပါ၊ အသံထွက်ပြောပါ၊ အဓိပ္ပာယ်နားလည်သွားသောအခါ နောက်တစ်ဆင့်သို့ ဆက်ပါ။',
    burmesePromptFallback: 'အပေါ်တွင် ဖော်ပြထားသော အခြေအနေကို ဖတ်ပြီး မှန်ကန်သော စကားလုံး သို့မဟုတ် ဝါကျကို အသံထွက်ကာ မှတ်သားပါ။',
    sentenceHeading: 'မှတ်မိသည့်အတိုင်း ဝါကျအပြည့်အစုံကို ရေးပါ။',
    situation: 'အသုံးပြုရမည့် အခြေအနေ',
    sentenceHelp: 'စာလုံးအကြီးအသေးနှင့် သတ်ပုံအမှတ်များကို ထည့်မတွက်ပါ။ အဆင်သင့်ဖြစ်လျှင် Enter ကို နှိပ်ပါ။',
    sentenceHelpChinese: 'တရုတ်ကီးဘုတ် မရှိဘူးလား? Pinyin ကို အသံအမှတ်ပါ (ဥပမာ "nǐ hǎo") သို့မဟုတ် အသံအမှတ်မပါ (ဥပမာ "ni3 hao3" သို့မဟုတ် "ni hao") ရိုက်ထည့်နိုင်သလို၊ တရုတ်စာလုံးများ ရိုက်ထည့်လည်း ရပါသည်။',
    incorrectTitle: 'နီးစပ်ပါပြီ — နှိုင်းယှဉ်ကြည့်ပြီး ထပ်မံကြိုးစားပါ။',
    incorrectHelp: 'ပျောက်နေသော သို့မဟုတ် ပြောင်းလဲနေသော စကားလုံးကို အာရုံစိုက်ပါ။ စာလုံးပေါင်းမှန်ရန် လိုသော်လည်း သတ်ပုံအမှတ် မလိုပါ။',
    correctTitle: 'ဝါကျမှန်ကန်ပါသည်!',
    correctHelp: 'ဝါကျအပြည့်အစုံကို မှတ်မိနိုင်ခဲ့သည်။ ဆက်မသွားမီ အသံထွက်တစ်ကြိမ် ပြောကြည့်ပါ။',
    spellingHeading: 'အသံကို နားထောင်ပြီး ကြားသည့်အတိုင်း စာလုံးပေါင်းပါ။',
    spellingInstruction: 'ရေးသားထားသော အဖြေကို ဖုံးထားသည်။ အသံကို ထပ်နားထောင်ပြီး စကားလုံး သို့မဟုတ် ဝါကျကို မှတ်မိသည့်အတိုင်း ရေးပါ။',
    spellingLabel: 'သင်၏ စာလုံးပေါင်း',
    spellingPlaceholder: 'ကြားသည့်အတိုင်း ရေးပါ…',
    spellingHelp: 'စာလုံးအကြီးအသေးနှင့် သတ်ပုံအမှတ်အနည်းငယ်ကို ထည့်မတွက်ပါ။ စာလုံးနှင့် စကားလုံးများတော့ မှန်ကန်ရမည်။',
    spellingHelpChinese: 'တရုတ်ကီးဘုတ် မရှိဘူးလား? Pinyin ကို အသံအမှတ်ပါ (ဥပမာ "nǐ hǎo") သို့မဟုတ် အသံအမှတ်မပါ (ဥပမာ "ni3 hao3" သို့မဟုတ် "ni hao") ရိုက်ထည့်နိုင်သလို၊ တရုတ်စာလုံးများ ရိုက်ထည့်လည်း ရပါသည်။',
    spellingIncorrectTitle: 'အသံကို ထပ်နားထောင်ပြီး အသံတစ်ခုစီကို စစ်ဆေးပါ။',
    spellingIncorrectHelp: 'မှတ်ဉာဏ်ဖြင့် ထပ်ကြိုးစားနိုင်ရန် အဖြေကို ဖုံးထားဆဲဖြစ်သည်။',
    spellingCorrectTitle: 'စာလုံးပေါင်းမှန်ကန်ပါသည်!',
    spellingCorrectHelp: 'ကြားခဲ့သည့် စကားလုံး သို့မဟုတ် ဝါကျနှင့် ကိုက်ညီပါသည်။',
    vocabularyHeading: 'အဓိပ္ပာယ်နှင့် ကိုက်ညီသော စကားလုံး သို့မဟုတ် စကားစုကို ရွေးပါ။',
    vocabularyInstruction: 'ဝေါဟာရတစ်ခုစီကို ရွေးချယ်မေးခွန်း နှစ်ပတ်ဖြင့် လေ့ကျင့်မည်။ စာလုံးပေါင်းမစမီ မှားသည့်အဖြေတိုင်းကို မှန်အောင် ပြန်ဖြေပါ။',
    vocabularyCorrectTitle: 'ကောင်းစွာ မှတ်မိပါသည်!',
    vocabularyCorrectHelp: 'အဓိပ္ပာယ်နှင့် မှန်ကန်သော စကားလုံးကို ဆက်စပ်နိုင်ခဲ့သည်။ ဆက်မသွားမီ အသံထွက်တစ်ကြိမ် ပြောပါ။',
    vocabularyIncorrectTitle: 'ထပ်မံကြည့်ပြီး ဤစကားလုံးကို ပြန်ဖြေပါ။',
    vocabularyIncorrectHelp: 'ဤလေ့ကျင့်မှုတွင် နှလုံးမလျော့ပါ။ ရွေးချယ်စရာများကို နှိုင်းယှဉ်ပြီး တူညီသောမေးခွန်းကို ထပ်ဖြေပါ။',
    skipVocabulary: 'ဝေါဟာရလေ့ကျင့်မှု ကျော်မည်',
    checkVocabulary: 'ရွေးချယ်မှု စစ်မည်',
    retryVocabulary: 'ဤစကားလုံးကို ပြန်ကြိုးစားမည်',
    nextVocabulary: 'နောက်ရွေးချယ်မှု',
    startSpelling: 'စာလုံးပေါင်း စမည်',
    skipSpelling: 'စာလုံးပေါင်းလေ့ကျင့်မှု ကျော်မည်',
    checkSpelling: 'စာလုံးပေါင်း စစ်မည်',
    nextSpelling: 'နောက်စာလုံးပေါင်း',
    startSentencePractice: 'ဝါကျလေ့ကျင့်မှု စမည်',
    startQuiz: 'မေးခွန်း စမည်',
    outOfHeartsHelp: 'စိတ်မပူပါနှင့် — Heart Refill Quiz အတိုကို ဖြေဆိုပါ၊ ပြီးဆုံးထားသော သင်ခန်းစာကို ပြန်လေ့ကျင့်ပါ၊ သို့မဟုတ် နေ့စဉ် ပြန်ဖြည့်ချိန်ကို စောင့်ပါ။',
    completeHelp: 'သင်ခန်းစာများကို ပြန်လေ့ကျင့်ပြီး နှလုံးများ ပြန်ဖြည့်နိုင်သည်။',
  },
} as const;

export type LanguageQuestCopyKey = keyof typeof copy.en;

interface SupportContextValue {
  explanationLanguage: ExplanationLanguage;
  setExplanationLanguage: (language: ExplanationLanguage) => void;
  lq: (key: LanguageQuestCopyKey) => string;
}

const SupportContext = createContext<SupportContextValue | null>(null);

export function LanguageQuestSupportProvider({ children }: { children: React.ReactNode }) {
  const [explanationLanguage, setLanguage] = useState<ExplanationLanguage>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'my') {
        return stored;
      }
    } catch {
      // Browsers with restricted storage fall back to the default below.
    }
    return 'en';
  });

  // This preference is intentionally scoped to Language Quest only and must
  // never drive the app-wide language (useI18n's setLang). See bug report:
  // toggling this used to relocalize the entire LMS (admin, finance, etc.)
  // for the user's whole session.
  const setExplanationLanguage = (language: ExplanationLanguage) => {
    setLanguage(language);
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Browsers with restricted storage can still use the setting this visit.
    }
  };

  const value = useMemo<SupportContextValue>(() => ({
    explanationLanguage,
    setExplanationLanguage,
    lq: (key) => copy[explanationLanguage][key],
  }), [explanationLanguage]);

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
}

export function useLanguageQuestSupport(): SupportContextValue {
  const context = useContext(SupportContext);
  if (!context) {
    return {
      explanationLanguage: 'en',
      setExplanationLanguage: () => undefined,
      lq: (key) => copy.en[key],
    };
  }
  return context;
}

export function LanguageQuestExplanationToggle() {
  const { explanationLanguage, setExplanationLanguage, lq } = useLanguageQuestSupport();

  return (
    <div
      className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      aria-label={lq('explanation')}
      title={lq('explanation')}
    >
      <Languages className="mx-1 hidden h-4 w-4 text-violet-600 min-[520px]:block dark:text-violet-300" aria-hidden="true" />
      <button
        type="button"
        onClick={() => setExplanationLanguage('en')}
        className={`rounded-lg px-2 py-1 text-[11px] font-black transition ${explanationLanguage === 'en' ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}
        aria-pressed={explanationLanguage === 'en'}
      >
        EN
      </button>
      <button
        type="button"
        lang="my"
        onClick={() => setExplanationLanguage('my')}
        className={`rounded-lg px-2 py-1 text-[11px] font-black transition ${explanationLanguage === 'my' ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}
        aria-pressed={explanationLanguage === 'my'}
      >
        မြန်မာ
      </button>
    </div>
  );
}
