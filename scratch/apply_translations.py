import os
import re

my_po_path = '/Users/taomonlae/Downloads/mrlc-lms/src/i18n/locales/my.po'
mnw_po_path = '/Users/taomonlae/Downloads/mrlc-lms/src/i18n/locales/mnw.po'

TRANSLATIONS = {
    "my": {
        "Certificate rule updated": "လက်မှတ်စည်းမျဉ်းကို အပ်ဒိတ်လုပ်ထားသည်",
        "Course-completion certificates issued by the old automatic rule are withdrawn. Complete the course, then pass its monitored final exam with at least 80% to unlock a new verified certificate.": "ယခင် အလိုအလျောက် စည်းမျဉ်းဖြင့် ထုတ်ပေးထားသော သင်တန်းဆင်းလက်မှတ်များကို ပြန်လည်ရုပ်သိမ်းလိုက်သည်။ လက်မှတ်အသစ်ကို ရယူရန် သင်တန်းပြီးဆုံးအောင် လေ့လာပြီးနောက် စောင့်ကြည့်စစ်ဆေးသည့် နောက်ဆုံးစာမေးပွဲတွင် အနည်းဆုံး ၈၀% ဖြင့် အောင်မြင်ရပါမည်။",
        "Take final exam": "နောက်ဆုံး စာမေးပွဲ ဖြေဆိုရန်",
        "Exam setup required": "စာမေးပွဲ ပြင်ဆင်ရန် လိုအပ်သည်",
        "Finish a course and pass its final exam to unlock a verified certificate.": "လက်မှတ်ကို ရယူရန် သင်တန်းပြီးဆုံးအောင် လေ့လာပြီးနောက် စာမေးပွဲကို အောင်မြင်အောင် ဖြေဆိုပါ။",
        "Preview of your print-ready Learning Quest certificate.": "ပုံနှိပ်ရန် အဆင်သင့်ဖြစ်သော သင်၏ Learning Quest လက်မှတ်၏ အစမ်းကြည့်ရှုမှု။",
        "Subject albums": "ဘာသာရပ် အယ်လ်ဘမ်များ",
        "A card journey for every subject": "ဘာသာရပ်တိုင်းအတွက် ကတ်ခရီးစဉ်",
        "Each completed challenge fills that subject’s album. No purchases or random packs.": "အောင်မြင်ပြီးမြောက်သော စိန်ခေါ်မှုတိုင်းသည် ထိုဘာသာရပ်၏ အယ်လ်ဘမ်ကို ပြည့်စေသည်။ ဝယ်ယူရန် သို့မဟုတ် ကျပန်းအထုပ်များ မလိုအပ်ပါ။",
        "Image saved": "ပုံရိပ် သိမ်းဆည်းပြီးပြီ",
        "Tap to view, save, or share": "ကြည့်ရှုရန်၊ သိမ်းဆည်းရန် သို့မဟုတ် မျှဝေရန် နှိပ်ပါ",
        "Journey progress keepsake": "ခရီးစဉ်တိုးတက်မှု အမှတ်တရ",
        "Learning Quest progress keepsake": "Learning Quest တိုးတက်မှု အမှတ်တရ",
        "My learned words": "ကျွန်ုပ် လေ့လာပြီးသော စကားလုံးများ",
        "My Words": "ကျွန်ုပ်၏ စကားလုံးများ",
        "Unique": "ထူးခြားသော",
        "Special power": "အထူးစွမ်းအား",
        "Secret collection": "လျှို့ဝှက်စုဆောင်းမှု",
        "Surprise Heart Cards": "အံ့အားသင့်ဖွယ် နှလုံးသားကတ်များ",
        "Your first successful Heart Refill Quiz each day reveals one card you do not own yet.": "နေ့စဉ် သင်၏ ပထမဆုံး အောင်မြင်သော နှလုံးသားဖြည့်မေးခွန်းသည် သင့်ထံတွင် မရှိသေးသော ကတ်တစ်ခုကို ဖော်ပြပေးမည်။",
        "Mystery card": "လျှို့ဝှက်ဆန်းကြယ်ကတ်",
        "Pass a refill quiz to reveal it": "၎င်းကို ဖော်ပြရန် နှလုံးသားဖြည့်မေးခွန်းကို အောင်မြင်အောင် ဖြေဆိုပါ",
        "Billing month": "ငွေတောင်းခံလွှာ လ",
        "All Months": "လအားလုံး",
        "Classroom name updated": "စာသင်ခန်းအမည်ကို အပ်ဒိတ်လုပ်ပြီးပါပြီ",
        "Classroom invite link copied": "စာသင်ခန်း ဖိတ်ကြားချက်လင့်ခ်ကို ကူးယူပြီးပါပြီ",
        "Invite learners at ${inviteUrl}": "သင်ယူသူများကို ${inviteUrl} တွင် ဖိတ်ကြားပါ",
        "Cancel renaming": "အမည်ပြောင်းလဲခြင်းကို ပယ်ဖျက်ပါ",
        "Rename classroom": "စာသင်ခန်းအမည်ပြောင်းပါ",
        "Explain what the class is working toward.": "အတန်းက မည်သည့်အရာအတွက် လုပ်ဆောင်နေသည်ကို ရှင်းပြပါ။",
        "Search learners…": "သင်ယူသူများကို ရှာဖွေပါ…",
        "member.focusProgressPercent": "member.focusProgressPercent",
        "We could not load your classrooms": "သင်၏ စာသင်ခန်းများကို မဖွင့်နိုင်ပါ",
        "Copy code": "ကုဒ်ကို ကူးယူပါ",
        "Copy invite link": "ဖိတ်ကြားချက်လင့်ခ်ကို ကူးယူပါ",
        "The invite opens the learner classroom tab with this code ready to join.": "ဖိတ်ကြားချက်သည် သင်ယူသူ၏ စာသင်ခန်း တက်ဘ်ကို ဖွင့်ပေးမည်ဖြစ်ပြီး ဤကုဒ်ဖြင့် ပူးပေါင်းရန် အဆင်သင့်ဖြစ်လိမ့်မည်။",
        "This assigned course is in draft. Joined learners keep access while it is reviewed.": "ဤသတ်မှတ်ထားသော သင်တန်းသည် မူကြမ်းအဆင့်တွင် ရှိနေသည်။ ပူးပေါင်းထားသော သင်ယူသူများသည် ၎င်းကို ပြန်လည်သုံးသပ်နေစဉ်အတွင်း ဝင်ရောက်ကြည့်ရှုနိုင်ဆဲဖြစ်သည်။",
        "Open focus course": "သတ်မှတ်ထားသော သင်တန်းကို ဖွင့်ပါ",
        "Choose a course to give joined learners a direct classroom course link.": "ပူးပေါင်းထားသော သင်ယူသူများကို စာသင်ခန်းသင်တန်း၏ တိုက်ရိုက်လင့်ခ် ပေးရန် သင်တန်းတစ်ခုကို ရွေးချယ်ပါ။",
        "Active accounts": "အသုံးပြုနေသော အကောင့်များ",
        "Average progress": "ပျမ်းမျှ တိုးတက်မှု",
        "Below 50%": "၅၀% အောက်",
        "Sort learners": "သင်ယူသူများကို စီစဉ်ပါ",
        "Name A–Z": "နာမည် က မှ ဟ အထိ",
        "Review learned words": "လေ့လာပြီးသော စကားလုံးများကို ပြန်လည်သုံးသပ်ပါ",
        "Words learned in this course": "ဤသင်တန်းတွင် လေ့လာခဲ့သော စကားလုံးများ",
        "Completed vocabulary practices are saved in your personal word bank for review.": "ပြီးစီးသွားသော ဝေါဟာရလေ့ကျင့်မှုများကို ပြန်လည်သုံးသပ်ရန် သင်၏ ကိုယ်ပိုင်စကားလုံးဘဏ်တွင် သိမ်းဆည်းထားသည်။",
        "Certificate requirement": "လက်မှတ်အတွက် လိုအပ်ချက်",
        "Monitored Final Exam": "စောင့်ကြည့်စစ်ဆေးသော နောက်ဆုံးစာမေးပွဲ",
        "Locked": "သော့ခတ်ထားသည်",
        "Final challenge": "နောက်ဆုံး စိန်ခေါ်မှု",
        "Continue course": "သင်တန်းကို ဆက်လက်လေ့လာပါ",
        "How maths practice works": "သင်္ချာလေ့ကျင့်ခန်း လုပ်ဆောင်ပုံ",
        "Each lesson opens directly on six guided problems. Work out each answer first, then use the explanation to correct mistakes and strengthen the method.": "သင်ခန်းစာတစ်ခုစီသည် လမ်းညွှန်ထားသော ပုစ္ဆာ ၆ ခုကို တိုက်ရိုက်ဖွင့်ပေးသည်။ ဦးစွာ အဖြေတစ်ခုစီကို တွက်ချက်ပါ၊ ထို့နောက် အမှားများကို ပြင်ဆင်ရန်နှင့် နည်းလမ်းကို ပိုမိုနားလည်စေရန် ရှင်းလင်းချက်ကို အသုံးပြုပါ။",
        "Understand": "နားလည်အောင်လုပ်ပါ",
        "Read the problem and identify what it asks.": "ပုစ္ဆာကို ဖတ်ပြီး ၎င်းက မည်သည့်အရာကို တောင်းဆိုသည်ကို ဖော်ထုတ်ပါ။",
        "Solve": "ဖြေရှင်းပါ",
        "Work it out before selecting or arranging.": "မရွေးချယ်မီ သို့မဟုတ် မစီစဉ်မီ တွက်ချက်ပါ။",
        "Use instant feedback and the worked explanation.": "ချက်ချင်းတုံ့ပြန်ချက်နှင့် တွက်ချက်ပြသထားသော ရှင်းလင်းချက်ကို အသုံးပြုပါ။",
        "Retry": "ပြန်လည်ကြိုးစားပါ",
        "Paste at least one line as \"term | translation\".": "အနည်းဆုံး စာကြောင်းတစ်ကြောင်းကို \"term | translation\" အဖြစ် ကူးထည့်ပါ။",
        "Added ${challenges.length} challenge${challenges.length === 1 ? '' : 's'} from pasted vocabulary.": "ကူးထည့်ထားသော ဝေါဟာရမှ စိန်ခေါ်မှု ${challenges.length} ခုကို ပေါင်းထည့်ပြီးပါပြီ။",
        "Discard your unsaved Course Studio changes?": "သင်၏ မသိမ်းဆည်းရသေးသော Course Studio အပြောင်းအလဲများကို စွန့်ပစ်မလား။",
        "Preview as a learner": "သင်ယူသူအနေဖြင့် အစမ်းကြည့်ရှုပါ",
        "How each challenge will appear to a learner. Read-only — nothing here is saved.": "စိန်ခေါ်မှုတစ်ခုစီသည် သင်ယူသူထံ မည်သို့ပေါ်လာမည်နည်း။ ဖတ်ရန်သာ — မည်သည့်အရာကိုမျှ ဤနေရာတွင် သိမ်းဆည်းမည်မဟုတ်ပါ။",
        "No question text yet": "မေးခွန်းစာသား မရှိသေးပါ",
        "Empty option": "ရွေးချယ်စရာ မရှိပါ",
        "Bulk add vocabulary": "ဝေါဟာရများကို အစုလိုက် ပေါင်းထည့်ပါ",
        "Each line becomes a multiple-choice challenge. Distractor options are picked automatically from the other pasted lines, so paste at least three pairs for the best variety.": "စာကြောင်းတစ်ခုစီသည် ရွေးချယ်စရာမေးခွန်းတစ်ခု ဖြစ်လာသည်။ အခြားကူးထည့်ထားသော စာကြောင်းများမှ မှားယွင်းသောရွေးချယ်စရာများကို အလိုအလျောက်ရွေးချယ်ပေးမည်ဖြစ်သဖြင့် အကောင်းဆုံးအမျိုးအစားစုံလင်မှုအတွက် အနည်းဆုံး သုံးတွဲ ကူးထည့်ပါ။",
        "Add challenges": "စိန်ခေါ်မှုများ ထည့်ပါ",
        "Unsaved changes": "မသိမ်းဆည်းရသေးသော အပြောင်းအလဲများ",
        "View analytics": "ပိုင်းခြားစိတ်ဖြာချက်ကို ကြည့်ပါ",
        "Full-screen permission is required to start this exam.": "ဤစာမေးပွဲကို စတင်ရန် မျက်နှာပြင်အပြည့် ခွင့်ပြုချက် လိုအပ်သည်။",
        "Secure spelling audio is unavailable. Ask your teacher before continuing.": "လုံခြုံသော စာလုံးပေါင်းအသံ မရနိုင်ပါ။ မဆက်မီ သင့်ဆရာကို မေးမြန်းပါ။",
        "Enter your spelling": "သင်၏ စာလုံးပေါင်းကို ရိုက်ထည့်ပါ",
        "Final exam unavailable": "နောက်ဆုံး စာမေးပွဲ မရနိုင်ပါ",
        "Monitored final exam": "စောင့်ကြည့်စစ်ဆေးသော နောက်ဆုံးစာမေးပွဲ",
        "Time remaining": "ကျန်ရှိသောအချိန်",
        "Answers are locked after Continue. Leaving, hiding, switching, or closing this screen terminates the attempt.": "Continue နှိပ်ပြီးနောက် အဖြေများကို ပိတ်ပါမည်။ ဤမျက်နှာပြင်မှ ထွက်ခွာခြင်း၊ ဝှက်ထားခြင်း၊ ပြောင်းလဲခြင်း သို့မဟုတ် ပိတ်ခြင်းတို့သည် စာမေးပွဲဖြေဆိုမှုကို ရပ်စဲစေမည်။",
        "Listen to the word or phrase": "စကားလုံး သို့မဟုတ် စကားစုကို နားထောင်ပါ",
        "Type exactly what you hear": "ကြားရသည့်အတိုင်း တိကျစွာ ရိုက်ထည့်ပါ",
        "You may replay the audio. Browser spelling suggestions are disabled, and your answer is checked using this course’s language rules.": "အသံကို ပြန်ဖွင့်နိုင်သည်။ ဘရောက်ဆာ၏ စာလုံးပေါင်းအကြံပြုချက်များကို ပိတ်ထားပြီး သင့်အဖြေကို ဤသင်တန်း၏ ဘာသာစကားစည်းမျဉ်းများ သုံး၍ စစ်ဆေးမည်ဖြစ်သည်။",
        "Exam attempt terminated": "စာမေးပွဲ ဖြေဆိုမှု ရပ်စဲခံရသည်",
        "A 15-minute review break applies before another attempt.": "အခြားတစ်ကြိမ် ထပ်မံဖြေဆိုရန် ၁၅ မိနစ်ကြာ ပြန်လည်လေ့လာရေးနားချိန် သတ်မှတ်ထားသည်။",
        "Final exam result": "နောက်ဆုံး စာမေးပွဲ ရလဒ်",
        "Review course": "သင်တန်းကို ပြန်လည်သုံးသပ်ပါ",
        "Question report": "မေးခွန်း အစီရင်ခံစာ",
        "Use this to identify which course topics to revisit. Answer keys are not shown.": "မည်သည့် သင်တန်းအကြောင်းအရာများကို ပြန်လည်လေ့လာရမည်ကို ဖော်ထုတ်ရန် ၎င်းကို အသုံးပြုပါ။ အဖြေမှန်များကို ပြသမည်မဟုတ်ပါ။",
        "Certificate final exam": "လက်မှတ်အတွက် နောက်ဆုံးစာမေးပွဲ",
        "Pass this monitored assessment to unlock the course certificate.": "သင်တန်းဆင်းလက်မှတ်ကို ရယူရန် ဤစောင့်ကြည့်စစ်ဆေးသော အကဲဖြတ်မှုကို အောင်မြင်အောင် ဖြေဆိုပါ။",
        "Certificate already unlocked": "လက်မှတ်ကို ဖွင့်ပြီးပါပြီ",
        "Finish the course first": "သင်တန်းကို အရင်ဆုံး ပြီးဆုံးအောင် လေ့လာပါ",
        "Every scored practice must be completed before the final exam unlocks.": "နောက်ဆုံးစာမေးပွဲ မပွင့်မီ ရမှတ်ရှိသော လေ့ကျင့်ခန်းအားလုံးကို ပြီးစီးအောင် ပြုလုပ်ရမည်။",
        "required to pass": "အောင်မြင်ရန် လိုအပ်သည်",
        "hard time limit": "တင်းကျပ်သော အချိန်ကန့်သတ်ချက်",
        "Read before starting": "မစတင်မီ ဖတ်ရှုပါ",
        "• The exam enters secure full-screen mode when your browser supports it.": "• သင့်ဘရောက်ဆာက ပံ့ပိုးပေးပါက စာမေးပွဲသည် လုံခြုံသော မျက်နှာပြင်အပြည့် မုဒ်သို့ ဝင်ရောက်မည်ဖြစ်သည်။",
        "• Do not switch tabs, swap apps/screens, swipe away, close, reload, or leave full screen.": "• တက်ဘ်များကို မပြောင်းပါနှင့်၊ အက်ပ်/မျက်နှာပြင်များကို မလဲလှယ်ပါနှင့်၊ ပိတ်ခြင်း၊ ပြန်ဖွင့်ခြင်း သို့မဟုတ် မျက်နှာပြင်အပြည့်မှ မထွက်ပါနှင့်။",
        "• Hiding or leaving the exam terminates the attempt and records the integrity reason.": "• စာမေးပွဲကို ဝှက်ထားခြင်း သို့မဟုတ် ထွက်ခွာခြင်းသည် ဖြေဆိုမှုကို ရပ်စဲစေပြီး အကြောင်းရင်းကို မှတ်တမ်းတင်လိမ့်မည်။",
        "• Courses with dictation include listen-and-type spelling questions.": "• စာစီစာကုံးပါသော သင်တန်းများတွင် နားထောင်ပြီး ရိုက်ထည့်ရသော စာလုံးပေါင်းမေးခွန်းများ ပါဝင်သည်။",
        "• Failed or terminated attempts require a 15-minute review break.": "• ကျရှုံးခြင်း သို့မဟုတ် ရပ်စဲခံရသော ဖြေဆိုမှုများသည် ၁၅ မိနစ်ကြာ ပြန်လည်သုံးသပ်ရေး နားချိန်လိုအပ်သည်။",
        "I understand the exam rules, have a stable connection, and am ready to stay on this screen until I submit.": "ကျွန်ုပ်သည် စာမေးပွဲစည်းမျဉ်းများကို နားလည်ပြီး၊ တည်ငြိမ်သောချိတ်ဆက်မှုရှိကာ မတင်ပြမီအထိ ဤမျက်နှာပြင်ပေါ်တွင် ရှိနေရန် အဆင်သင့်ရှိပါသည်။",
        "Start final exam": "နောက်ဆုံး စာမေးပွဲ စတင်ရန်",
        "Leave refill quiz": "နှလုံးသားဖြည့်မေးခွန်းမှ ထွက်ပါ",
        "Answer choices": "အဖြေရွေးချယ်စရာများ",
        "Daily surprise": "နေ့စဉ် အံ့အားသင့်ဖွယ်",
        "A new unique card found!": "ထူးခြားသော ကတ်အသစ်တစ်ခုကို တွေ့ရှိပါသည်!",
        "View my cards": "ကျွန်ုပ်၏ ကတ်များကို ကြည့်ပါ",
        "Quiz review": "မေးခွန်း ပြန်လည်သုံးသပ်ခြင်း",
        "Try another quiz": "အခြားမေးခွန်းတစ်ခုကို စမ်းကြည့်ပါ",
        "Refill another heart": "အခြားနှလုံးသားတစ်ခု ဖြည့်ပါ",
        "Back to courses": "သင်တန်းများသို့ ပြန်သွားရန်",
        "Comeback challenge": "ပြန်လည်စိန်ခေါ်မှု",
        "Heart Refill Quiz": "နှလုံးသားဖြည့် မေးခွန်းလွှာ",
        "Answer a five-question review and pass at least 70% to restore one heart. Your first successful refill today also reveals a random card you have never received before.": "နှလုံးသားတစ်ခု ပြန်လည်ရရှိရန် မေးခွန်း ၅ ခုပါဝင်သော ပြန်လည်သုံးသပ်မှုကို ဖြေဆိုပြီး အနည်းဆုံး ၇၀% ဖြင့် အောင်မြင်ပါစေ။ ယနေ့တွင် သင်၏ ပထမဆုံး အောင်မြင်သော နှလုံးသားဖြည့်တင်းမှုသည် သင်တစ်ခါမှမရဖူးသော ကျပန်းကတ်တစ်ခုကိုလည်း ဖော်ပြပေးလိမ့်မည်။",
        "Server graded": "ဆာဗာက စစ်ဆေးသည်",
        "Answers stay fair and secure.": "အဖြေများ မျှတပြီး လုံခြုံမှုရှိသည်။",
        "+1 heart": "+၁ နှလုံးသား",
        "No XP is farmed here.": "ဤနေရာတွင် XP ရယူ၍မရပါ",
        "No duplicates": "ထပ်နေခြင်းမရှိပါ",
        "Daily reveals are always new.": "နေ့စဉ်ဖော်ပြမှုများသည် အမြဲတမ်း အသစ်များဖြစ်သည်။",
        "My Learned Words": "ကျွန်ုပ် လေ့လာပြီးသော စကားလုံးများ",
        "Comeback corner": "ပြန်လာရမည့် ထောင့်",
        "Refill hearts. Reveal unique cards.": "နှလုံးသားဖြည့်ပါ။ ထူးခြားသောကတ်များကို ဖော်ပြပါ။",
        "Learned words": "လေ့လာပြီးသော စကားလုံးများ",
        "Take a Heart Refill Quiz": "နှလုံးသားဖြည့်မေးခွန်းကို ဖြေဆိုပါ",
        "Duplicated as \"${course.title} (Copy)\"": "`${course.title} (ကူးယူချက်)` အဖြစ် ထပ်ပွားပြီးပြီ",
        "Duplicate as a new draft": "မူကြမ်းအသစ်အဖြစ် ထပ်ပွားပါ",
        "A teacher can share an eight-character code. Joining lets that teacher see your Learning Quest points, streak, activity date, progress, and learned words in the class focus course. Learning from other courses stays private.": "ဆရာက ၈ လုံးပါသော ကုဒ်ကို မျှဝေနိုင်သည်။ ပူးပေါင်းခြင်းဖြင့် ထိုဆရာသည် သင်၏ Learning Quest ရမှတ်များ၊ နေ့စဉ်ဆက်တိုက်မှတ်တမ်း၊ လှုပ်ရှားမှုရက်စွဲ၊ တိုးတက်မှုနှင့် အတန်း၏အဓိကသင်တန်းတွင် လေ့လာခဲ့သောစကားလုံးများကို မြင်နိုင်မည်ဖြစ်သည်။ အခြားသင်တန်းများမှ လေ့လာမှုများသည် လျှို့ဝှက်အဖြစ် ဆက်လက်ရှိနေမည်ဖြစ်သည်။",
        "Open course": "သင်တန်းကို ဖွင့်ပါ",
        "Browse courses": "သင်တန်းများကို လေ့လာပါ",
        "Guided learning for real life": "လက်တွေ့ဘဝအတွက် လမ်းညွှန်သင်ယူမှု",
        "Learn the idea.": "အယူအဆကို လေ့လာပါ။",
        "Build the skill.": "စွမ်းရည်ကို တည်ဆောက်ပါ။",
        "Grow with confidence.": "ယုံကြည်မှုရှိရှိ ကြီးထွားပါ။",
        "Short guided courses combine languages, K–12 mathematics, worked feedback, and friendly scored practice. Learn at your own pace and keep every achievement in one free account.": "တိုတောင်းသော လမ်းညွှန်သင်တန်းများသည် ဘာသာစကားများ၊ K-12 သင်္ချာ၊ တုံ့ပြန်ချက်များနှင့် ဖော်ရွေသော ရမှတ်ရှိလေ့ကျင့်ခန်းများကို ပေါင်းစပ်ထားသည်။ မိမိစိတ်ကြိုက်အရှိန်ဖြင့် လေ့လာပြီး အောင်မြင်မှုအားလုံးကို အခမဲ့အကောင့်တစ်ခုတည်းတွင် သိမ်းဆည်းထားပါ။",
        "🧮 Solve": "🧮 တွက်ချက်ပါ",
        "Loading course previews…": "သင်တန်း အစမ်းကြည့်ရှုမှုများကို ဖွင့်နေသည်…",
        "We could not load the course library.": "သင်တန်းစာကြည့်တိုက်ကို မဖွင့်နိုင်ပါ",
        "Check your connection and try again.": "သင်၏ ချိတ်ဆက်မှုကို စစ်ဆေးပြီး ထပ်မံကြိုးစားပါ။",
        "No courses are published yet.": "မည်သည့်သင်တန်းကိုမျှ ထုတ်ဝေခြင်းမရှိသေးပါ",
        "Search words, meanings, lessons…": "စကားလုံးများ၊ အဓိပ္ပာယ်များနှင့် သင်ခန်းစာများကို ရှာဖွေပါ…",
        "Learned words pages": "လေ့လာပြီးသော စကားလုံးများ စာမျက်နှာ",
        "Learned words are unavailable": "လေ့လာပြီးသော စကားလုံးများ မရရှိနိုင်ပါ",
        "Search learned words": "လေ့လာပြီးသော စကားလုံးများကို ရှာဖွေပါ",
        "Filter by learning status": "လေ့လာမှုအခြေအနေအရ စစ်ထုတ်ပါ",
        "Secure": "လုံခြုံသော",
        "Think of the word…": "စကားလုံးကို စဉ်းစားပါ…",
        "Meaning or practice clue": "အဓိပ္ပါယ် သို့မဟုတ် လေ့ကျင့်ခန်းအညွှန်း",
        "This review is limited to": "ဤပြန်လည်သုံးသပ်မှုကို ကန့်သတ်ထားသည်မှာ",
        "All years": "နှစ်အားလုံး",
        "All months": "လအားလုံး",
        "No payroll runs match these filters.": "ဤစစ်ထုတ်မှုများနှင့် ကိုက်ညီသော လစာပေးချေမှု မရှိပါ။",
        "Billing Month": "ငွေတောင်းခံလွှာ လ",
        "English, Burmese & Mon guidance": "အင်္ဂလိပ်၊ မြန်မာ နှင့် မွန် လမ်းညွှန်",
        "Everyday English": "နေ့စဉ်သုံး အင်္ဂလိပ်စာ",
        "Short, practical lessons for friendly conversations and school life.": "မိတ်ဆွေဖြစ် ပြောဆိုဆက်ဆံမှုနှင့် ကျောင်းဘဝအတွက် တိုတောင်းပြီး လက်တွေ့ကျသော သင်ခန်းစာများ။",
        "Spanish Foundations": "စပိန်ဘာသာစကား အခြေခံ",
        "A Spanish vocabulary path adapted from the linked Lingo course, with visual choices and speech-assisted practice.": "ရုပ်ပုံရွေးချယ်မှုများနှင့် အသံအကူအညီဖြင့် လေ့ကျင့်မှုများ ပါဝင်သော၊ ချိတ်ဆက်ထားသည့် Lingo သင်ခန်းစာမှ ပြုပြင်ဆီလျော်အောင် ဖန်တီးထားသည့် စပိန်ဝေါဟာရ လေ့လာမှုလမ်းကြောင်း။",
        "Mandarin Foundations": "မန်ဒရင် တရုတ်ဘာသာစကား အခြေခံ",
        "Original beginner Mandarin lessons for greetings, people, numbers, food, daily activities, places, questions, and directions.": "နှုတ်ခွန်းဆက်ခြင်း၊ လူပုဂ္ဂိုလ်များ၊ ကိန်းဂဏန်းများ၊ အစားအစာ၊ နေ့စဉ်လှုပ်ရှားမှုများ၊ နေရာများ၊ မေးခွန်းများနှင့် လမ်းညွှန်ချက်များအတွက် မူလအခြေခံ မန်ဒရင်သင်ခန်းစာများ။",
        "Mandarin Complete Course": "မန်ဒရင် တရုတ်ဘာသာစကား သင်တန်းအပြည့်အစုံ",
        "A comprehensive Mandarin path with 70 progressive topics and 1,870 translation challenges generated from the school-provided curriculum file.": "ကျောင်းမှ ပံ့ပိုးပေးထားသော သင်ရိုးညွှန်းတမ်း ဖိုင်မှ ထုတ်လုပ်ထားသည့် တိုးတက်မှုအဆင့်ဆင့်ပြောင်းလဲသော အကြောင်းအရာ ၇၀ နှင့် ဘာသာပြန်စိန်ခေါ်မှု ၁,၈၇၀ ခု ပါဝင်သော ပြည့်စုံသော မန်ဒရင်လေ့လာမှုလမ်းကြောင်း။",
        "Everyday English Word Quest": "နေ့စဉ်သုံး အင်္ဂလိပ်စကားလုံး ရှာဖွေစူးစမ်းမှု",
        "Build practical vocabulary for school, home, food, feelings, actions, and places.": "ကျောင်း၊ အိမ်၊ အစားအစာ၊ ခံစားချက်များ၊ လုပ်ဆောင်ချက်များနှင့် နေရာများအတွက် လက်တွေ့ကျသော ဝေါဟာရများကို တည်ဆောက်ပါ။",
        "Academic English Word Quest": "ပညာရပ်ဆိုင်ရာ အင်္ဂလိပ်စကားလုံး ရှာဖွေစူးစမ်းမှု",
        "Practise high-value words used in research, writing, science, mathematics, and society.": "သုတေသန၊ စာရေးသားခြင်း၊ သိပ္ပံ၊ သင်္ချာနှင့် လူ့အဖွဲ့အစည်းတို့တွင် အသုံးပြုသော တန်ဖိုးရှိစကားလုံးများကို လေ့ကျင့်ပါ။",
        "English Word Power": "အင်္ဂလိပ်စကားလုံး စွမ်းအား",
        "Strengthen advanced vocabulary for communication, problem-solving, change, and the wider world.": "ပြောဆိုဆက်ဆံရေး၊ ပြဿနာဖြေရှင်းခြင်း၊ ပြောင်းလဲမှုနှင့် ပိုမိုကျယ်ပြန့်သော ကမ္ဘာကြီးအတွက် အဆင့်မြင့်ဝေါဟာရများကို အားဖြည့်ပါ။",
        "Advanced English: Core": "အဆင့်မြင့်အင်္ဂလိပ်စာ - အဓိက",
        "High-value advanced words that appear across many respected vocabulary lists.": "လေးစားဖွယ်ကောင်းသော ဝေါဟာရစာရင်းများစွာတွင် ပါဝင်လေ့ရှိသည့် အဆင့်မြင့် တန်ဖိုးရှိ စကားလုံးများ။",
        "Advanced English: Mastery": "အဆင့်မြင့်အင်္ဂလိပ်စာ - ကျွမ်းကျင်မှု",
        "A deeper ranked vocabulary path for precise reading, writing, and discussion.": "တိကျသော ဖတ်ရှုခြင်း၊ ရေးသားခြင်းနှင့် ဆွေးနွေးခြင်းတို့အတွက် ပိုမိုနက်ရှိုင်းသောအဆင့်သတ်မှတ်ထားသည့် ဝေါဟာရလမ်းကြောင်း။",
        "Advanced English: Expert": "အဆင့်မြင့်အင်္ဂလိပ်စာ - ပါရဂူ",
        "Challenging, lower-frequency words for ambitious readers and exam preparation.": "ရည်မှန်းချက်ကြီးမားသော စာဖတ်သူများနှင့် စာမေးပွဲပြင်ဆင်မှုတို့အတွက် စိန်ခေါ်မှုရှိပြီး အသုံးနည်းသော စကားလုံးများ။",
        "English Vocabulary A1: Foundations": "အင်္ဂလိပ်ဝေါဟာရ A1 - အခြေခံများ",
        "Begin with practical words for daily life, greetings, food, and drink.": "နေ့စဉ်ဘဝ၊ နှုတ်ခွန်းဆက်ခြင်း၊ အစားအစာနှင့် သောက်စရာများအတွက် လက်တွေ့ကျသောစကားလုံးများဖြင့် စတင်ပါ။",
        "English Vocabulary A2: Everyday Independence": "အင်္ဂလိပ်ဝေါဟာရ A2 - နေ့စဉ် အမှီအခိုကင်းမှု",
        "Build confidence with travel, shopping, money, weather, and nature.": "ခရီးသွားခြင်း၊ ဈေးဝယ်ခြင်း၊ ငွေကြေး၊ ရာသီဥတုနှင့် သဘာဝတရားတို့ဖြင့် ကိုယ့်ကိုယ်ကိုယ်ယုံကြည်မှု တည်ဆောက်ပါ။",
        "English Vocabulary B1: Life and Learning": "အင်္ဂလိပ်ဝေါဟာရ B1 - လူနေမှုဘဝနှင့် လေ့လာသင်ယူမှု",
        "Strengthen intermediate vocabulary for work, health, and education.": "အလုပ်အကိုင်၊ ကျန်းမာရေးနှင့် ပညာရေးတို့အတွက် အလယ်အလတ်အဆင့် ဝေါဟာရများကို အားဖြည့်ပါ။",
        "English Vocabulary B2: The Wider World": "အင်္ဂလိပ်ဝေါဟာရ B2 - ပိုမိုကျယ်ပြန့်သော ကမ္ဘာကြီး",
        "Explore upper-intermediate language for technology, climate, and media.": "နည်းပညာ၊ ရာသီဥတုနှင့် မီဒီယာတို့အတွက် အထက်အလယ်အလတ်တန်းစား ဘာသာစကားကို လေ့လာစူးစမ်းပါ။",
        "English Vocabulary C1: Advanced Ideas": "အင်္ဂလိပ်ဝေါဟာရ C1 - အဆင့်မြင့် အတွေးအမြင်များ",
        "Develop precise language for politics, science, research, arts, and culture.": "နိုင်ငံရေး၊ သိပ္ပံ၊ သုတေသန၊ အနုပညာနှင့် ယဉ်ကျေးမှုတို့အတွက် တိကျသောဘာသာစကားကို တိုးတက်အောင်လုပ်ဆောင်ပါ။",
        "English Vocabulary C2: Mastery": "အင်္ဂလိပ်ဝေါဟာရ C2 - ကျွမ်းကျင်မှုအဆင့်",
        "Master nuanced language for philosophy, ethics, law, justice, and idioms.": "ဒဿနိကဗေဒ၊ ကျင့်ဝတ်သိက္ခာ၊ ဥပဒေ၊ တရားမျှတမှုနှင့် အသုံးအနှုန်းများအတွက် နက်နဲသိမ်မွေ့သော ဘာသာစကားကို ကျွမ်းကျင်စွာ တတ်မြောက်ပါ။",
        "Kindergarten Mathematics": "မူကြို သင်္ချာ",
        "Grade 1 Mathematics": "ပထမတန်း သင်္ချာ",
        "Grade 2 Mathematics": "ဒုတိယတန်း သင်္ချာ",
        "Grade 3 Mathematics": "တတိယတန်း သင်္ချာ",
        "Grade 4 Mathematics": "စတုတ္ထတန်း သင်္ချာ",
        "Grade 5 Mathematics": "ပဉ္စမတန်း သင်္ချာ",
        "Grade 6 Mathematics": "ဆဋ္ဌမတန်း သင်္ချာ",
        "Grade 7 Mathematics": "သတ္တမတန်း သင်္ချာ",
        "Grade 8 Mathematics": "အဋ္ဌမတန်း သင်္ချာ",
        "Grade 9 Mathematics: Algebra I": "နဝမတန်း သင်္ချာ - အက္ခရာသင်္ချာ ၁",
        "Grade 10 Mathematics: Geometry": "ဒသမတန်း သင်္ချာ - ဂျီဩမေထရီ",
        "Grade 11 Mathematics: Algebra II": "ဧကဒသမတန်း သင်္ချာ - အက္ခရာသင်္ချာ ၂",
        "Grade 12 Mathematics: Precalculus": "ဒွါဒသမတန်း သင်္ချာ - ပရီကလကုလပ်"
    },
    "mnw": {
        "Certificate rule updated": "စရၚ်ဒတန်ထပ်ပလေဝ်လဝ်တုဲ",
        "Course-completion certificates issued by the old automatic rule are withdrawn. Complete the course, then pass its monitored final exam with at least 80% to unlock a new verified certificate.": "လိက်သက်သဳမကဵုလဝ်နကဵုစရၚ်ဒတန်တြေံတအ် ပဲါကၠေံတုဲရ။ သွက်ဂွံပံက်လိက်သက်သဳတၟိမာန် သင်ခန်းစာသီုဖအိုတ် ညံၚ်ဂွံတုဲဒှ် ကေုာံ သွဟ်စမ်ၜတ်လိက်အဆံၚ်တုဲ ကေတ်စၟတ်အောန်အိုတ် ၈၀% ညိ။",
        "Take final exam": "သွဟ်စမ်ၜတ်လိက်လက္ကရဴအိုတ်",
        "Exam setup required": "နွံပၟိက်ပလေဝ်ပလေတ်စမ်ၜတ်လိက်",
        "Finish a course and pass its final exam to unlock a verified certificate.": "သွက်ဂွံပံက်လိက်သက်သဳ ကၠောန်တုဲသင်တန်း ကေုာံ သွဟ်အံၚ်စမ်ၜတ်လိက်လက္ကရဴညိ။",
        "Preview of your print-ready Learning Quest certificate.": "ဗဵုစမ်ၜတ်လိက်သက်သဳ Learning Quest မဆိုက်ပ္တိတ်။",
        "Subject albums": "အေလ်ဗမ်ဘာသာလ္ၚတ်ဂမၠိုၚ်",
        "A card journey for every subject": "တရဴကတ် သွက်ဘာသာလ္ၚတ်အရိုဟ်တ္ၚဲ",
        "Each completed challenge fills that subject’s album. No purchases or random packs.": "ပရေၚ်စမ်ၜတ်ဒုၚ်သဇိုၚ်မတုဲဒှ်အရိုဟ်တ္ၚဲ ထပ်စုတ်ပ္ဍဲအေလ်ဗမ်ဘာသာလ္ၚတ်ဏံရ။ ဟွံဒးရာန် သို့မဟုတ် ဟွံဒးကေတ်ကတ်ကျပန်းရ။",
        "Image saved": "ဂိုၚ်ဒေပ်ဗီုတုဲဒှ်",
        "Tap to view, save, or share": "ဍဵုသွက်ဂွံရံၚ်၊ ဂိုၚ်ဒေပ် သို့မဟုတ် တြး",
        "Journey progress keepsake": "တၚ်စမ္တီပရေၚ်ဇၞော်မောဝ်တရဴ",
        "Learning Quest progress keepsake": "တၚ်စမ္တီပရေၚ်ဇၞော်မောဝ် Learning Quest",
        "My learned words": "မလိက်အဲမလ္ၚတ်လဝ်ဂမၠိုၚ်",
        "My Words": "မလိက်အဲဂမၠိုၚ်",
        "Unique": "တၟေၚ်",
        "Special power": "စွမ်းအားတၟေၚ်",
        "Secret collection": "ပရေၚ်ဂိုၚ်စွံဓမံက်",
        "Surprise Heart Cards": "ကတ်ဖ္ဍိုက်စိုတ်ကောန်စိုတ်ဂမၠိုၚ်",
        "Your first successful Heart Refill Quiz each day reveals one card you do not own yet.": "သွဟ်အံၚ် Heart Refill Quiz ကၠာအိုတ်အရိုဟ်တ္ၚဲ ဓမံက်ထ္ၜးကတ်ကျပန်း မၞးဟွံကေၚ်ဆဵုဏီရ။",
        "Mystery card": "ကတ်ဓမံက်",
        "Pass a refill quiz to reveal it": "သွဟ်အံၚ်စမ်ၜတ်လိက် ညံၚ်ဂွံဓမံက်ညိ",
        "Billing month": "ဂိတုကေတ်သြန်",
        "All Months": "ဂိတုသီုဖအိုတ်",
        "Classroom name updated": "ယၟုခန်ဘာထပ်ပလေဝ်တုဲ",
        "Classroom invite link copied": "ကူဆာဲလေန်ခ်ဘိက်ခန်ဘာတုဲ",
        "Invite learners at ${inviteUrl}": "ဘိက်ညးလ္ၚတ်ပ္ဍဲ ${inviteUrl}",
        "Cancel renaming": "တးပါဲပြံၚ်ယၟု",
        "Rename classroom": "ပြံၚ်ယၟုခန်ဘာ",
        "Explain what the class is working toward.": "သောၚ်ကၠးခန်ဘာမကၠောန်ဒၟံၚ်ညိ။",
        "Search learners…": "ဂၠာဲညးလ္ၚတ်ဂမၠိုၚ်…",
        "member.focusProgressPercent": "member.focusProgressPercent",
        "We could not load your classrooms": "ပံက်ခန်ဘာမၞးဟွံမွဲဏီရ",
        "Copy code": "ကူဆာဲကုဒ်",
        "Copy invite link": "ကူဆာဲလေန်ခ်ဘိက်",
        "The invite opens the learner classroom tab with this code ready to join.": "လိက်ဘိက်ဏံ ပံက်ကဵုခန်ဘာညးလ္ၚတ်တုဲ ကုဒ်ဏံအဆင်သင့်လုပ်ကဵုသွက်ဂွံပူးပေါင်းရ။",
        "This assigned course is in draft. Joined learners keep access while it is reviewed.": "သင်တန်းခွဲဝေလဝ်ဏံ နွံပ္ဍဲမူအပြောံဖိုဟ်ရ။ ညးလ္ၚတ်လုပ်လဝ်တအ် ဆက်ရပ်စပ်မာန်ဖိုဟ် ပ္ဍဲအခိၚ်စၟဳစၟတ်ရံၚ်။",
        "Open focus course": "ပံက်သင်တန်းမကၠောန်ဒၟံၚ်",
        "Choose a course to give joined learners a direct classroom course link.": "ရုဲစှ်သင်တန်း သွက်ဂွံကဵုလေန်ခ်တိုက်ရိုက်ကုညးလ္ၚတ်လုပ်လဝ်တအ်ညိ။",
        "Active accounts": "အကံက်ရပ်စပ်ဒၟံၚ်ဂမၠိုၚ်",
        "Average progress": "ပရေၚ်ဇၞော်မောဝ်အပြောံ",
        "Below 50%": "၅၀% သၟဝ်",
        "Sort learners": "စီစဥ်ညးလ္ၚတ်ဂမၠိုၚ်",
        "Name A–Z": "ယၟု က-ဟ",
        "Review learned words": "ပြန်စၟဳစၟတ်မလိက်မလ္ၚတ်လဝ်",
        "Words learned in this course": "မလိက်လ္ၚတ်လဝ်ပ္ဍဲသင်တန်းဏံ",
        "Completed vocabulary practices are saved in your personal word bank for review.": "ပရေၚ်လ္ၚတ်ဝေါဟာရမတုဲဒှ်တအ် ဂိုၚ်ဒေပ်လဝ်ပ္ဍဲတိုက်မလိက်မၞး သွက်ဂွံပြန်စၟဳစၟတ်ရ။",
        "Certificate requirement": "ပၟိက်လိက်သက်သဳ",
        "Monitored Final Exam": "သွဟ်စမ်ၜတ်လိက်လက္ကရဴမစၟဳစၟတ်လဝ်",
        "Locked": "ကၟာတ်လဝ်",
        "Final challenge": "စမ်ၜတ်လက္ကရဴအိုတ်",
        "Continue course": "ဆက်အာသင်တန်း",
        "How maths practice works": "ဗီုပြၚ်လ္ၚတ်ဂၞန်ကၠောန်ကမၠောန်",
        "Each lesson opens directly on six guided problems. Work out each answer first, then use the explanation to correct mistakes and strengthen the method.": "သင်ခန်းစာတစ်ခုစီ ပံက်တိုက်ရိုက်ကုသၟာန်ဂၞန် ၆ မရ။ သွဟ်ကၠာအိုတ်ညိ၊ တုဲမ္ဂး သုၚ်စောဲတၚ်သောၚ်ကၠးသွက်ဂွံပလေဝ်တၚ်ယောၚ် ကေုာံ ခိုင်က္ညပ်နဲကဲညိ။",
        "Understand": "ကၠိုဟ်ညိ",
        "Read the problem and identify what it asks.": "ဗှ်သၟာန်တုဲ စၟတ်သမ္တီတၚ်နွံပၟိက်ညိ။",
        "Solve": "သောၚ်ကၠးညိ",
        "Work it out before selecting or arranging.": "ကၠောန်ကၠာဟွံဂွံရုဲ သို့မဟုတ် စီစဥ်ညိ။",
        "Use instant feedback and the worked explanation.": "သုၚ်စောဲတၚ်သွဟ်ချက်ချင်း ကေုာံ တၚ်သောၚ်ကၠးမကၠောန်လဝ်ညိ။",
        "Retry": "ဂ္စာန်မွဲဝါပၠန်ညိ",
        "Paste at least one line as \"term | translation\".": "ကပ်အောန်အိုတ်မွဲမလိက် နကဵု \"term | translation\" ညိ။",
        "Added ${challenges.length} challenge${challenges.length === 1 ? '' : 's'} from pasted vocabulary.": "ထပ်စုတ် ${challenges.length} challenge${challenges.length === 1 ? '' : 's'} နကဵုဝေါဟာရကပ်လဝ်တုဲ။",
        "Discard your unsaved Course Studio changes?": "တးပါဲပရေၚ်ပြံၚ်သၠာဲ Course Studio မဟွံဂိုၚ်ဒေပ်လဝ်ဟာ။",
        "Preview as a learner": "ဗဵုစမ်ၜတ်နကဵုညးလ္ၚတ်",
        "How each challenge will appear to a learner. Read-only — nothing here is saved.": "ဗီုပြင်ပရေၚ်စမ်ၜတ်ဒုၚ်သဇိုၚ်ဂမၠိုၚ် ဓမံက်ထ္ၜးကုညးလ္ၚတ်။ ရံၚ်ဟေၚ် — ဟွံဂိုၚ်ဒေပ်လဝ်မွဲသာ်ရ။",
        "No question text yet": "ဟွံမွဲမလိက်သၟာန်ဏီ",
        "Empty option": "အကာဲအရာဟွံမွဲ",
        "Bulk add vocabulary": "ထပ်ဝေါဟာရအစုလိုက်",
        "Each line becomes a multiple-choice challenge. Distractor options are picked automatically from the other pasted lines, so paste at least three pairs for the best variety.": "မလိက်အရိုဟ်တ္ၚဲ ဒှ်ကၠုၚ်ပရေၚ်စမ်ၜတ်ရုဲစှ်။ သွဟ်တၞဟ်တအ် ရုဲစှ်အလိုအလျောက် နကဵုမလိက်ကပ်လဝ်တၞဟ်တအ်ရ၊ ဟိုတ်ဒှ်သာ်ဂှ်ရ ကပ်အောန်အိုတ် ပိတွဲ ညံၚ်ဂွံတၟေၚ်အိုတ်ညိ။",
        "Add challenges": "ထပ်ပရေၚ်စမ်ၜတ်",
        "Unsaved changes": "ပရေၚ်ပြံၚ်သၠာဲဟွံဂိုၚ်ဒေပ်လဝ်ဂမၠိုၚ်",
        "View analytics": "ရံၚ်စရၚ်စၟဳစၟတ်",
        "Full-screen permission is required to start this exam.": "နွံပၟိက်အခေါၚ်မျက်နှာပြင်အပြည့် သွက်ဂွံစစမ်ၜတ်လိက်ဏံရ။",
        "Secure spelling audio is unavailable. Ask your teacher before continuing.": "ရမျာၚ်စပ်စာလုံးလုံခြုံဟွံမွဲရ။ သၟာန်အာစာမၞး ကၠာဟွံဂွံဆက်အာညိ။",
        "Enter your spelling": "တက်စုတ်စပ်စာလုံးမၞး",
        "Final exam unavailable": "သွဟ်စမ်ၜတ်လိက်လက္ကရဴဟွံမွဲရ",
        "Monitored final exam": "သွဟ်စမ်ၜတ်လိက်လက္ကရဴမစၟဳစၟတ်လဝ်",
        "Time remaining": "အခိၚ်သၟေဟ်",
        "Answers are locked after Continue. Leaving, hiding, switching, or closing this screen terminates the attempt.": "သွဟ်တအ် ကၟာတ်လဝ်တုဲ ကြဴနကဵု ဆက်အာ။ ပဲါကၠေံ၊ ကၟာတ် သို့မဟုတ် ပြံၚ်မျက်နှာပြင်ဏံမ္ဂး ပလီုပရေၚ်သွဟ်ရ။",
        "Listen to the word or phrase": "က္တောဝ်ကၠေၚ်မလိက် သို့မဟုတ် ဝါကျညိ",
        "Type exactly what you hear": "တက်စုတ် အတိုၚ်မက္တောဝ်ကၠေၚ်ညိ",
        "You may replay the audio. Browser spelling suggestions are disabled, and your answer is checked using this course’s language rules.": "ဖွင့်ရမျာၚ်မွဲဝါပၠန်ဂွံရ။ တၚ်ထ္ၜးစပ်စာလုံးဘရောက်ဆာ ကၟာတ်လဝ်တုဲ သွဟ်မၞး စၟဳစၟတ်နကဵုသၞောဝ်ဘာသာလ္ၚတ်သင်တန်းဏံရ။",
        "Exam attempt terminated": "ပလီုပရေၚ်စမ်ၜတ်လိက်တုဲ",
        "A 15-minute review break applies before another attempt.": "ဒးဝေၚ်နား ၁၅ မိနစ် သွက်ဂွံစစမ်ၜတ်မွဲဝါပၠန်။",
        "Final exam result": "သွဟ်စမ်ၜတ်လိက်လက္ကရဴအိုတ်",
        "Review course": "ပြန်စၟဳစၟတ်သင်တန်း",
        "Question report": "လိက်ဒုၚ်စဳရေၚ်သၟာန်",
        "Use this to identify which course topics to revisit. Answer keys are not shown.": "သုၚ်စောဲဏံ သွက်ဂွံစၟတ်သမ္တီ ကဏ္ဍသင်တန်းလဵု ဒးပြန်လ္ၚတ်။ သွဟ်မှန်တအ် ဟွံထ္ၜးကဵုရ။",
        "Certificate final exam": "သွဟ်စမ်ၜတ်လိက်လက္ကရဴသွက်လိက်သက်သဳ",
        "Pass this monitored assessment to unlock the course certificate.": "သွဟ်အံၚ်စမ်ၜတ်လိက်မစၟဳစၟတ်ဏံ သွက်ဂွံပံက်လိက်သက်သဳသင်တန်းညိ။",
        "Certificate already unlocked": "လိက်သက်သဳပံက်တုဲဒှ်",
        "Finish the course first": "ညံၚ်ဂွံတုဲဒှ်သင်တန်းကၠာညိ",
        "Every scored practice must be completed before the final exam unlocks.": "ကၠာဟွံဂွံပံက်စမ်ၜတ်လက္ကရဴ ပရေၚ်လ္ၚတ်နွံစၟတ်သီုဖအိုတ် ဒးတုဲဒှ်ကၠာရ။",
        "required to pass": "နွံပၟိက်ညံၚ်ဂွံအံၚ်",
        "hard time limit": "အခိၚ်သတ်မှတ်လဝ်ခိုၚ်က္ညပ်",
        "Read before starting": "ဗှ်ကၠာဟွံဂွံစညိ",
        "• The exam enters secure full-screen mode when your browser supports it.": "• စမ်ၜတ်လိက်ဏံ လုပ်အာမျက်နှာပြင်အပြည့်အခိၚ်ဘရောက်ဆာမၞးပံ့ပိုး။",
        "• Do not switch tabs, swap apps/screens, swipe away, close, reload, or leave full screen.": "• လ္ပပြံၚ်တက်ဘ်၊ လ္ပလဲမျက်နှာပြင်၊ လ္ပကၟာတ်၊ လ္ပပြန်ပံက် သို့မဟုတ် လ္ပပဲါကၠေံမျက်နှာပြင်အပြည့်ညိ။",
        "• Hiding or leaving the exam terminates the attempt and records the integrity reason.": "• ပွမကၟာတ် သို့မဟုတ် ပဲါကၠေံစမ်ၜတ်လိက်ဏံ ပလီုပရေၚ်စမ်ၜတ်တုဲ စၟတ်သမ္တီဟိုတ်ဂှ်ရ။",
        "• Courses with dictation include listen-and-type spelling questions.": "• သင်တန်းနွံကဵုစပ်စာလုံး ပါဝင်သၟာန်နားထောင်တုဲတက်စုတ်။",
        "• Failed or terminated attempts require a 15-minute review break.": "• ပရေၚ်စမ်ၜတ်ဟွံအံၚ် သို့မဟုတ် ပလီုတအ် နွံပၟိက်အခိၚ်ဝေၚ်နား ၁၅ မိနစ်ရ။",
        "I understand the exam rules, have a stable connection, and am ready to stay on this screen until I submit.": "အဲကၠိုဟ်သၞောဝ်စမ်ၜတ်လိက်တုဲ၊ နွံချိတ်ဆက်မခိုင်က္ညပ်၊ ကေုာံ အဆင်သင့်နွံပ္ဍဲမျက်နှာပြင်ဏံ စဵုကဵုအပ်သွဟ်ရ။",
        "Start final exam": "စသွဟ်စမ်ၜတ်လိက်လက္ကရဴ",
        "Leave refill quiz": "ပဲါကၠေံစမ်ၜတ်လိက်ဖ္ဍိုက်စိုတ်",
        "Answer choices": "သွဟ်ရုဲစှ်ဂမၠိုၚ်",
        "Daily surprise": "ပရေၚ်ဖ္ဍိုက်စိုတ်အရိုဟ်တ္ၚဲ",
        "A new unique card found!": "ဆဵုကတ်တၟေၚ်တၟိမွဲရ!",
        "View my cards": "ရံၚ်ကတ်အဲဂမၠိုၚ်",
        "Quiz review": "ပြန်စၟဳစၟတ်စမ်ၜတ်လိက်",
        "Try another quiz": "စမ်းကြည့်စမ်ၜတ်လိက်တၞဟ်ညိ",
        "Refill another heart": "ဖ္ဍိုက်စိုတ်ကောန်စိုတ်တၞဟ်ညိ",
        "Back to courses": "ပြန်အာသင်တန်းဂမၠိုၚ်",
        "Comeback challenge": "ပရေၚ်စမ်ၜတ်က္လေၚ်ကၠုၚ်",
        "Heart Refill Quiz": "စမ်ၜတ်လိက်ဖ္ဍိုက်စိုတ်",
        "Answer a five-question review and pass at least 70% to restore one heart. Your first successful refill today also reveals a random card you have never received before.": "သွဟ်စမ်ၜတ်လိက် ၅ သၟာန် ကေုာံ အံၚ်အောန်အိုတ် ၇၀% သွက်ဂွံဖ္ဍိုက်စိုတ်မွဲကောန်စိုတ်ညိ။ သွဟ်အံၚ်ကၠာအိုတ်အရိုဟ်တ္ၚဲ ဓမံက်ထ္ၜးကတ်ကျပန်း မၞးဟွံကေၚ်ဆဵုဏီရ။",
        "Server graded": "ဆာဗာကစၟတ်ကဵု",
        "Answers stay fair and secure.": "သွဟ်တအ် မျှတ ကေုာံ လုံခြုံရ။",
        "+1 heart": "+၁ ကောန်စိုတ်",
        "No XP is farmed here.": "ဟွံမွဲပွမကေတ် XP ပ္ဍဲဏံ။",
        "No duplicates": "ဟွံမွဲတူတူ",
        "Daily reveals are always new.": "ဓမံက်ထ္ၜးအရိုဟ်တ္ၚဲ အမြဲတၟိရ။",
        "My Learned Words": "မလိက်အဲမလ္ၚတ်လဝ်ဂမၠိုၚ်",
        "Comeback corner": "ကဏ္ဍက္လေၚ်ကၠုၚ်",
        "Refill hearts. Reveal unique cards.": "ဖ္ဍိုက်ကောန်စိုတ်ညိ။ ဓမံက်ကတ်တၟေၚ်ညိ။",
        "Learned words": "မလိက်မလ္ၚတ်လဝ်ဂမၠိုၚ်",
        "Take a Heart Refill Quiz": "သွဟ်စမ်ၜတ်လိက်ဖ္ဍိုက်စိုတ်ညိ",
        "Duplicated as \"${course.title} (Copy)\"": "ထပ်ပွားနကဵု `${course.title} (ကူဆာဲ)`",
        "Duplicate as a new draft": "ထပ်ပွားနကဵုမူအပြောံတၟိ",
        "A teacher can share an eight-character code. Joining lets that teacher see your Learning Quest points, streak, activity date, progress, and learned words in the class focus course. Learning from other courses stays private.": "အာစာမၞး မျှဝေကုဒ် ၈ မလိက်မာန်ရ။ လုပ်ပူးပေါင်းမ္ဂး အာစာဂှ် ဆဵုစၟတ် Learning Quest၊ စနောမ်သတ္တဟ၊ စၟတ်တ္ၚဲချဳဒရာၚ်၊ ပရေၚ်ဇၞော်မောဝ် ကေုာံ မလိက်လ္ၚတ်လဝ်ပ္ဍဲသင်တန်းခန်ဘာမာန်ရ။ ပရေၚ်လ္ၚတ်နူသင်တန်းတၞဟ်တအ် ဓမံက်စွံလဝ်အပြောံ။",
        "Open course": "ပံက်သင်တန်း",
        "Browse courses": "လ္ၚတ်သင်တန်းဂမၠိုၚ်",
        "Guided learning for real life": "ပရေၚ်လ္ၚတ်မနွံလမ်းညွှန်သွက်လမျီုတိုက်ရိုက်",
        "Learn the idea.": "လ္ၚတ်တၚ်ချပ်ညိ။",
        "Build the skill.": "သိုၚ်ခၞံစနောမ်ညိ။",
        "Grow with confidence.": "ဇၞော်မောဝ်နကဵုယုံကြည်မှုညိ။",
        "Short guided courses combine languages, K–12 mathematics, worked feedback, and friendly scored practice. Learn at your own pace and keep every achievement in one free account.": "သင်တန်းတိုမနွံလမ်းညွှန်တအ် ပေါင်းစပ်ဘာသာစကားဂမၠိုၚ်၊ K-12 ဂၞန်၊ တၚ်သွဟ် ကေုာံ ပရေၚ်လ္ၚတ်နွံစၟတ်ရ။ လ္ၚတ်အတိုၚ်စိုတ်မၞးတုဲ ဂိုၚ်ဒေပ်ပရေၚ်အံၚ်ဇၞးသီုဖအိုတ် ပ္ဍဲအကံက်အခမဲ့မွဲညိ။",
        "🧮 Solve": "🧮 သောၚ်ကၠး",
        "Loading course previews…": "ပံက်စမ်ၜတ်သင်တန်းဂမၠိုၚ်…",
        "We could not load the course library.": "ပံက်တိုက်သင်တန်းဟွံမွဲဏီရ",
        "Check your connection and try again.": "စၟဳစၟတ်ချိတ်ဆက်မၞးတုဲ ဂ္စာန်မွဲဝါပၠန်ညိ။",
        "No courses are published yet.": "ဟွံမွဲသင်တန်းတြးတုဲဏီရ",
        "Search words, meanings, lessons…": "ဂၠာဲမလိက်၊ အဓိပ္ပါယ် ကေုာံ သင်ခန်းစာဂမၠိုၚ်…",
        "Learned words pages": "မုက်လိက်မလိက်လ္ၚတ်လဝ်ဂမၠိုၚ်",
        "Learned words are unavailable": "မလိက်လ္ၚတ်လဝ်ဟွံမွဲရ",
        "Search learned words": "ဂၠာဲမလိက်လ္ၚတ်လဝ်",
        "Filter by learning status": "စစ်ထုတ်နကဵုအကာဲအရာလ္ၚတ်",
        "Secure": "လုံခြုံ",
        "Think of the word…": "ချပ်မလိက်ညိ…",
        "Meaning or practice clue": "အဓိပ္ပါယ် သို့မဟုတ် တၚ်ထ္ၜးလ္ၚတ်",
        "This review is limited to": "ပရေၚ်ပြန်စၟဳစၟတ်ဏံကန့်သတ်လဝ်ကု",
        "All years": "သၞာံသီုဖအိုတ်",
        "All months": "ဂိတုသီုဖအိုတ်",
        "No payroll runs match these filters.": "ဟွံမွဲစရၚ်သြန်လစာကိုက်ညီကဵုတၚ်စစ်ထုတ်ဏံ။",
        "Billing Month": "ဂိတုကေတ်သြန်",
        "English, Burmese & Mon guidance": "လမ်းညွှန်အၚ်္ဂလိက်၊ ဗမာ ကေုာံ မန်",
        "Everyday English": "အရေဝ်အၚ််္ဂလိက်အရိုဟ်တ္ၚဲ",
        "Short, practical lessons for friendly conversations and school life.": "သင်ခန်းစာတိုတို သီုမဒှ်ဖဵု သွက်ဝိုၚ်ဟီုအရေဝ် ကေုာံ လမျီုဘာဂမၠိုၚ်။",
        "Spanish Foundations": "သဇိုၚ်အရေဝ်သပိန်",
        "A Spanish vocabulary path adapted from the linked Lingo course, with visual choices and speech-assisted practice.": "ဂၠောၚ်မလိက်သပိန် ကၠောန်ဗဒှ်လဝ်နူသင်တန်း Lingo၊ သီုနွံပရေၚ်ရုဲစှ်ဗီု ကေုာံ ပရေၚ်လ္ၚတ်ကေတ်ရမျာၚ်ရ။",
        "Mandarin Foundations": "သဇိုၚ်အရေဝ်မိန်ဒရင်",
        "Original beginner Mandarin lessons for greetings, people, numbers, food, daily activities, places, questions, and directions.": "သင်ခန်းစာမိန်ဒရင်တမ် သွက်ပွမနှုတ်ခွန်းဆက်၊ မၞိဟ်ဂမၠိုၚ်၊ ဂၞန်ဂမၠိုၚ်၊ စၞစ၊ ကမၠောန်အရိုဟ်တ္ၚဲ၊ ဒေသ၊ သၟာန် ကေုာံ လမ်းညွှန်ဂမၠိုၚ်။",
        "Mandarin Complete Course": "သင်တန်းမိန်ဒရင်အပြည့်အစုံ",
        "A comprehensive Mandarin path with 70 progressive topics and 1,870 translation challenges generated from the school-provided curriculum file.": "ဂၠောၚ်မိန်ဒရင်အပြည့်အစုံ နွံ ၇၀ ကဏ္ဍဇၞော်မောဝ် ကေုာံ ၁,၈၇၀ ပရေၚ်စမ်ၜတ်ဘာသာပြန် ကၠောန်ပ္တိတ်နူဖိုင်သင်ရိုးဘာပံ့ပိုးလဝ်ညိ။",
        "Everyday English Word Quest": "လ္ၚတ်မလိက်အၚ်္ဂလိက်အရိုဟ်တ္ၚဲ",
        "Build practical vocabulary for school, home, food, feelings, actions, and places.": "သိုၚ်ခၞံဝေါဟာရမဒှ်ဖဵု သွက်ဘာ၊ သ္ၚိ၊ စၞစ၊ စိုတ်၊ ကမၠောန် ကေုာံ ဒေသဂမၠိုၚ်ညိ။",
        "Academic English Word Quest": "လ္ၚတ်မလိက်အၚ်္ဂလိက်ပညာရပ်ဆိုင်ရာ",
        "Practise high-value words used in research, writing, science, mathematics, and society.": "လ္ၚတ်မလိက်နွံၚုဟ်မးဇၞော် သုၚ်စောဲပ္ဍဲပွမသုတေသန၊ ချူ၊ သိပ္ပံ၊ ဂၞန် ကေုာံ လူ့အဖွဲ့အစည်းညိ။",
        "English Word Power": "သတ္တိမလိက်အၚ်္ဂလိက်",
        "Strengthen advanced vocabulary for communication, problem-solving, change, and the wider world.": "ခိုင်က္ညပ်ဝေါဟာရအဆံၚ်သၠုၚ် သွက်ပွမဟီုအရေဝ်၊ သောၚ်ကၠးပြဿနာ၊ ပွမပြံၚ်သၠာဲ ကေုာံ ဂၠးတိမဇၞော်တြးညိ။",
        "Advanced English: Core": "အရေဝ်အၚ်္ဂလိက်အဆံၚ်သၠုၚ် - သဇိုၚ်",
        "High-value advanced words that appear across many respected vocabulary lists.": "မလိက်အဆံၚ်သၠုၚ်နွံၚုဟ်မးဇၞော် ဓမံက်ထ္ၜးပ္ဍဲစရၚ်ဝေါဟာရမရှ်ေသှ်ေဂမၠိုၚ်။",
        "Advanced English: Mastery": "အရေဝ်အၚ်္ဂလိက်အဆံၚ်သၠုၚ် - စုက်ယှက်",
        "A deeper ranked vocabulary path for precise reading, writing, and discussion.": "ဂၠောၚ်ဝေါဟာရနက်နဲ သွက်ပွမဗှ်၊ ချူ ကေုာံ သဳကၠဳမတိုက်ရိုက်ညိ။",
        "Advanced English: Expert": "အရေဝ်အၚ်္ဂလိက်အဆံၚ်သၠုၚ် - အာစာ",
        "Challenging, lower-frequency words for ambitious readers and exam preparation.": "မလိက်စမ်ၜတ်ဒုၚ်သဇိုၚ် သုၚ်စောဲအောန် သွက်ညးဗှ်နွံပၟိက်ဇၞော် ကေုာံ ပွမပလေဝ်စမ်ၜတ်ညိ။",
        "English Vocabulary A1: Foundations": "ဝေါဟာရအၚ်္ဂလိက် A1 - သဇိုၚ်ဂမၠိုၚ်",
        "Begin with practical words for daily life, greetings, food, and drink.": "စနကဵုမလိက်မဒှ်ဖဵု သွက်လမျီုအရိုဟ်တ္ၚဲ၊ ပွမနှုတ်ခွန်းဆက်၊ စၞစ ကေုာံ သောက်စရာညိ။",
        "English Vocabulary A2: Everyday Independence": "ဝေါဟာရအၚ်္ဂလိက် A2 - သၠးပွးအရိုဟ်တ္ၚဲ",
        "Build confidence with travel, shopping, money, weather, and nature.": "သိုၚ်ခၞံယုံကြည်မှု နကဵုပွမအာတရဴ, ရာန်စၞ, သြန်, ရာသီဥတု ကေုာံ သဘာဝညိ။",
        "English Vocabulary B1: Life and Learning": "ဝေါဟာရအၚ်္ဂလိက် B1 - လမျီု ကေုာံ ပွမလ္ၚတ်",
        "Strengthen intermediate vocabulary for work, health, and education.": "ခိုင်က္ညပ်ဝေါဟာရအလယ်အလတ် သွက်ကမၠောန်၊ ပရေၚ်ထတ်စုတ် ကေုာံ ပညာရပ်ညိ။",
        "English Vocabulary B2: The Wider World": "ဝေါဟာရအၚ်္ဂလိက် B2 - ဂၠးတိမဇၞော်တြး",
        "Explore upper-intermediate language for technology, climate, and media.": "လ္ၚတ်အရေဝ်အဆံၚ်သၠုၚ်အလယ်အလတ် သွက်နည်းပညာ၊ ရာသီဥတု ကေုာံ မီဒီယာညိ။",
        "English Vocabulary C1: Advanced Ideas": "ဝေါဟာရအၚ်္ဂလိက် C1 - တၚ်ချပ်အဆံၚ်သၠုၚ်",
        "Develop precise language for politics, science, research, arts, and culture.": "သိုၚ်ခၞံအရေဝ်မတိုက်ရိုက် သွက်ပရေၚ်ဍုၚ်ကွာန်၊ သိပ္ပံ၊ သုတေသန၊ အနုပညာ ကေုာံ ယဉ်ကျေးမှုညိ။",
        "English Vocabulary C2: Mastery": "ဝေါဟာရအၚ်္ဂလိက် C2 - အဆံၚ်စုက်ယှက်",
        "Master nuanced language for philosophy, ethics, law, justice, and idioms.": "ဒှ်အာစာအရေဝ်နက်နဲ သွက်ဒဿနိကဗေဒ၊ သၞောဝ်၊ တရားမျှတမှု ကေုာံ မလိက်အပြောံညိ။",
        "Kindergarten Mathematics": "ဂၞန်မူလဘာ",
        "Grade 1 Mathematics": "ဂၞန်တန်ပထမ",
        "Grade 2 Mathematics": "ဂၞန်တန်ဒုတိယ",
        "Grade 3 Mathematics": "ဂၞန်တန်တတိယ",
        "Grade 4 Mathematics": "ဂၞန်တန်စတုတ္ထ",
        "Grade 5 Mathematics": "ဂၞန်တန်ပဉ္စမ",
        "Grade 6 Mathematics": "ဂၞန်တန်ဆဋ္ဌမ",
        "Grade 7 Mathematics": "ဂၞန်တန်သတ္တမ",
        "Grade 8 Mathematics": "ဂၞန်တန်အဋ္ဌမ",
        "Grade 9 Mathematics: Algebra I": "ဂၞန်တန်နဝမ - အက္ခရာဂၞန် ၁",
        "Grade 10 Mathematics: Geometry": "ဂၞန်တန်ဒသမ - ဂျဳဩမေထရဳ",
        "Grade 11 Mathematics: Algebra II": "ဂၞန်တန်ဧကဒသမ - အက္ခရာဂၞန် ၂",
        "Grade 12 Mathematics: Precalculus": "ဂၞန်တန်ဒွါဒသမ - ပရဳကလကုလပ်"
    }
}

def unescape_po(s):
    return (s.replace('\\"', '"')
             .replace('\\n', '\n')
             .replace('\\r', '\r')
             .replace('\\t', '\t')
             .replace('\\\\', '\\'))

def escape_po(s):
    return (s.replace('\\', '\\\\')
             .replace('"', '\\"')
             .replace('\n', '\\n')
             .replace('\r', '\\r')
             .replace('\t', '\\t'))

def unquote(raw):
    start = raw.find('"')
    end = raw.rfind('"')
    if start == -1 or end <= start:
        return ""
    return unescape_po(raw[start+1:end])

def update_po_file(po_path, lang):
    if not os.path.exists(po_path):
        print(f"File not found: {po_path}")
        return

    print(f"Processing {po_path} for language {lang}...")
    with open(po_path, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.splitlines()
    output = []

    msgid = None
    msgid_lines = []
    msgstr_start_idx = -1

    i = 0
    while i < len(lines):
        line = lines[i]
        trimmed = line.strip()

        if trimmed.startswith('msgid'):
            msgid_lines = [unquote(trimmed[5:])]
            j = i + 1
            while j < len(lines) and lines[j].strip().startswith('"'):
                msgid_lines.append(unquote(lines[j].strip()))
                j += 1
            msgid = "".join(msgid_lines)

            # Find corresponding msgstr
            k = j
            while k < len(lines) and not lines[k].strip().startswith('msgstr'):
                k += 1

            if k < len(lines):
                msgstr_line = lines[k].strip()
                msgstr_val = unquote(re.sub(r'^msgstr(\[\d+\])?', '', msgstr_line))

                # Check if we have a translation for this msgid and if the current msgstr is empty
                key = msgid.replace('\n', ' ').replace('\r', '').replace('\t', ' ')
                key = re.sub(r'\s+', ' ', key).strip()

                if key in TRANSLATIONS[lang] and (msgstr_val == "" or msgstr_val == msgid):
                    translated = TRANSLATIONS[lang][key]
                    lines[k] = f'msgstr "{escape_po(translated)}"'
                    # If there were multi-line msgstrs, clear them
                    idx = k + 1
                    while idx < len(lines) and lines[idx].strip().startswith('"'):
                        lines[idx] = ""
                        idx += 1
                    print(f"  Translated: '{key}' -> '{translated}'")

            i = j - 1

        i += 1

    # Write back clean file (remove empty lines that were cleared multi-line strings)
    cleaned_lines = [ln for ln in lines if ln != ""]

    # Write back
    with open(po_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(cleaned_lines) + "\n")
    print(f"Finished {po_path}.")

def main():
    update_po_file(my_po_path, 'my')
    update_po_file(mnw_po_path, 'mnw')

if __name__ == '__main__':
    main()
