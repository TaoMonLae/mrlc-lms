import { createContext, useContext, useMemo, useState } from 'react';
import { Languages } from 'lucide-react';

export type ExplanationLanguage = 'en' | 'my';

const STORAGE_KEY = 'mrlc-language-quest-explanation-language';

const copy = {
  en: {
    explanation: 'Explanation',
    journeySummary: 'Build useful language skills through quick lessons, friendly challenges, streaks, and school-wide competition.',
    sentenceFeatureTitle: 'New: practise complete sentences',
    sentenceFeatureBody: 'Lessons guide you from listening to writing before the quiz. Capital letters and punctuation are flexible, so you can focus on choosing the right words.',
    progressSaved: 'Your progress is saved automatically.',
    lessonGuideTitle: 'How each lesson works',
    lessonGuideBody: 'Take your time. The same three-step routine helps you understand a phrase before you are asked to remember it.',
    learnTitle: '1. Learn',
    learnBody: 'Listen and connect the phrase to its situation.',
    buildTitle: '2. Build',
    buildBody: 'Type complete sentences from memory.',
    checkTitle: '3. Check',
    checkBody: 'Answer the quiz and use corrections to retry.',
    whenToUse: 'When to use it',
    listenSay: 'Listen, say it aloud, then move on when the meaning feels clear.',
    burmesePromptFallback: '',
    sentenceHeading: 'Type the complete phrase from memory.',
    situation: 'Situation',
    sentenceHelp: 'Capital letters and punctuation do not affect the check. Press Enter when ready.',
    incorrectTitle: 'Almost there — compare and try once more.',
    incorrectHelp: 'Focus on the missing or changed word; spelling matters, punctuation does not.',
    correctTitle: 'That sentence works!',
    correctHelp: 'You recalled the complete phrase. Say it once aloud before continuing.',
    outOfHeartsHelp: "No worries — hearts refill every day. In the meantime, replay a lesson you've already finished to earn some back.",
    completeHelp: 'Replay lessons to practise and refill hearts.',
  },
  my: {
    explanation: 'ရှင်းလင်းချက်',
    journeySummary: 'တိုတောင်းသော သင်ခန်းစာများ၊ လေ့ကျင့်ခန်းများနှင့် နေ့စဉ်ဆက်တိုက် လေ့လာမှုတို့မှတစ်ဆင့် အသုံးဝင်သော ဘာသာစကားစွမ်းရည်များကို တိုးတက်စေပါလိမ့်မည်။',
    sentenceFeatureTitle: 'အသစ် — ဝါကျအပြည့်အစုံ လေ့ကျင့်ပါ',
    sentenceFeatureBody: 'မေးခွန်းမဖြေမီ နားထောင်ခြင်းမှ စာရေးခြင်းအထိ အဆင့်လိုက် လေ့ကျင့်ရမည်။ စာလုံးအကြီးအသေးနှင့် သတ်ပုံအမှတ်များကို လျော့ပေါ့စစ်ဆေးပေးသဖြင့် မှန်ကန်သော စကားလုံးများကို ရွေးချယ်ရန် အာရုံစိုက်နိုင်သည်။',
    progressSaved: 'သင်၏ လေ့လာမှုတိုးတက်မှုကို အလိုအလျောက် သိမ်းဆည်းပေးထားသည်။',
    lessonGuideTitle: 'သင်ခန်းစာတစ်ခုစီကို လေ့လာပုံ',
    lessonGuideBody: 'အလျင်မလိုပါ။ စကားလုံး သို့မဟုတ် ဝါကျကို မှတ်မိရန် မတိုင်မီ နားလည်စေရန် အဆင့်သုံးဆင့်ဖြင့် လေ့ကျင့်ပေးမည်။',
    learnTitle: '၁။ လေ့လာပါ',
    learnBody: 'အသံကို နားထောင်ပြီး စကားလုံး သို့မဟုတ် ဝါကျကို သက်ဆိုင်ရာ အခြေအနေနှင့် ဆက်စပ်စဉ်းစားပါ။',
    buildTitle: '၂။ ဝါကျတည်ဆောက်ပါ',
    buildBody: 'မှတ်ဉာဏ်ဖြင့် ဝါကျအပြည့်အစုံကို ရေးပါ။',
    checkTitle: '၃။ စစ်ဆေးပါ',
    checkBody: 'မေးခွန်းကို ဖြေပြီး မှားယွင်းချက်ရှင်းလင်းချက်ကို ကြည့်ကာ ထပ်မံကြိုးစားပါ။',
    whenToUse: 'ဘယ်အချိန်မှာ သုံးမလဲ',
    listenSay: 'အသံကို နားထောင်ပါ၊ အသံထွက်ပြောပါ၊ အဓိပ္ပာယ်နားလည်သွားသောအခါ နောက်တစ်ဆင့်သို့ ဆက်ပါ။',
    burmesePromptFallback: 'အပေါ်တွင် ဖော်ပြထားသော အခြေအနေကို ဖတ်ပြီး မှန်ကန်သော စကားလုံး သို့မဟုတ် ဝါကျကို အသံထွက်ကာ မှတ်သားပါ။',
    sentenceHeading: 'မှတ်မိသည့်အတိုင်း ဝါကျအပြည့်အစုံကို ရေးပါ။',
    situation: 'အသုံးပြုရမည့် အခြေအနေ',
    sentenceHelp: 'စာလုံးအကြီးအသေးနှင့် သတ်ပုံအမှတ်များကို ထည့်မတွက်ပါ။ အဆင်သင့်ဖြစ်လျှင် Enter ကို နှိပ်ပါ။',
    incorrectTitle: 'နီးစပ်ပါပြီ — နှိုင်းယှဉ်ကြည့်ပြီး ထပ်မံကြိုးစားပါ။',
    incorrectHelp: 'ပျောက်နေသော သို့မဟုတ် ပြောင်းလဲနေသော စကားလုံးကို အာရုံစိုက်ပါ။ စာလုံးပေါင်းမှန်ရန် လိုသော်လည်း သတ်ပုံအမှတ် မလိုပါ။',
    correctTitle: 'ဝါကျမှန်ကန်ပါသည်!',
    correctHelp: 'ဝါကျအပြည့်အစုံကို မှတ်မိနိုင်ခဲ့သည်။ ဆက်မသွားမီ အသံထွက်တစ်ကြိမ် ပြောကြည့်ပါ။',
    outOfHeartsHelp: 'စိတ်မပူပါနှင့် — နှလုံးများကို နေ့စဉ် ပြန်ဖြည့်ပေးသည်။ စောင့်နေစဉ် ပြီးဆုံးထားသော သင်ခန်းစာကို ပြန်လေ့ကျင့်ပြီး နှလုံးပြန်ရယူနိုင်သည်။',
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
