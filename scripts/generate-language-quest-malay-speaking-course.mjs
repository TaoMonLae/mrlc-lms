import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { buildOddOneOut, option, tokenizeWords } from "./lib/language-quest-practice-helpers.mjs";

const outputPath = path.resolve(
  process.cwd(),
  "curricula/language-quest/malay-speaking-a1-c1.generated.json",
);

const sourceUnits = [
  {
    "level": "A1",
    "title": "Greetings and Introductions",
    "description": "Meet people, exchange basic personal information, and handle polite first conversations.",
    "grammar": "Personal pronouns; ialah/adalah avoided in simple identity sentences; question words siapa and mana; bukan for noun negation.",
    "roleplay": "Meet a new classmate and hold a 60-second introduction without reading.",
    "outcomes": [
      "Greet people at different times of day",
      "Introduce yourself and another person",
      "Ask and answer basic personal questions"
    ],
    "vocab": [
      [
        "hai",
        "hello"
      ],
      [
        "selamat pagi",
        "good morning"
      ],
      [
        "selamat tengah hari",
        "good afternoon"
      ],
      [
        "selamat petang",
        "good evening"
      ],
      [
        "selamat malam",
        "good night"
      ],
      [
        "terima kasih",
        "thank you"
      ],
      [
        "tolong",
        "please / help"
      ],
      [
        "maaf",
        "sorry"
      ],
      [
        "tumpang tanya",
        "excuse me; may I ask"
      ],
      [
        "jumpa lagi",
        "see you again"
      ]
    ],
    "phrases": [
      [
        "Ask a new friend for their name.",
        "Nama awak siapa?"
      ],
      [
        "Introduce yourself as Amina.",
        "Nama saya Amina."
      ],
      [
        "Ask how someone is.",
        "Apa khabar?"
      ],
      [
        "Say that you are well and thank the person.",
        "Khabar baik, terima kasih."
      ],
      [
        "Ask where someone is from.",
        "Awak dari mana?"
      ],
      [
        "Say that you are from Myanmar.",
        "Saya dari Myanmar."
      ],
      [
        "Say that you are pleased to meet someone.",
        "Gembira berkenalan dengan awak."
      ],
      [
        "Politely ask someone to repeat.",
        "Boleh ulang sekali lagi?"
      ]
    ],
    "dialogues": [
      [
        "A: Apa khabar?\nB: ...",
        "Khabar baik, terima kasih."
      ],
      [
        "A: Nama awak siapa?\nB: ...",
        "Nama saya Farid."
      ],
      [
        "A: Awak dari mana?\nB: ...",
        "Saya dari Yangon."
      ],
      [
        "A: Gembira berkenalan dengan awak.\nB: ...",
        "Saya pun gembira berkenalan dengan awak."
      ],
      [
        "A: Maaf, saya tidak dengar.\nB: ...",
        "Baik, saya akan ulang."
      ],
      [
        "A: Jumpa lagi esok.\nB: ...",
        "Baik, jumpa lagi."
      ]
    ],
    "drills": [
      [
        "Choose the best Malay sentence for “My name is Ali.”",
        "Nama saya Ali."
      ],
      [
        "Choose the best Malay sentence for “Are you a teacher?”",
        "Awak seorang guru?"
      ],
      [
        "Choose the best Malay sentence for “This is my friend.”",
        "Ini kawan saya."
      ],
      [
        "Choose the best Malay sentence for “What is her name?”",
        "Nama dia siapa?"
      ],
      [
        "Choose the best Malay sentence for “I am not Malaysian.”",
        "Saya bukan orang Malaysia."
      ],
      [
        "Choose the best Malay sentence for “He is from Thailand.”",
        "Dia dari Thailand."
      ],
      [
        "Choose the best Malay sentence for “We are students.”",
        "Kami pelajar."
      ],
      [
        "Choose the best Malay sentence for “Thank you very much.”",
        "Terima kasih banyak-banyak."
      ]
    ]
  },
  {
    "level": "A1",
    "title": "Family, Time and Daily Routine",
    "description": "Talk about family members, your home, the clock, weekdays, and repeated daily activities.",
    "grammar": "Possession with noun + saya; time with pada pukul; frequency with setiap and biasanya; sequence with sebelum and selepas.",
    "roleplay": "Describe your weekday routine from waking up to going to bed.",
    "outcomes": [
      "Name close family members",
      "Tell the time and day",
      "Describe a simple daily routine"
    ],
    "vocab": [
      [
        "keluarga",
        "family"
      ],
      [
        "ibu",
        "mother"
      ],
      [
        "bapa",
        "father"
      ],
      [
        "adik",
        "younger sibling"
      ],
      [
        "rumah",
        "home / house"
      ],
      [
        "bangun",
        "wake up"
      ],
      [
        "sarapan",
        "breakfast"
      ],
      [
        "bekerja",
        "work"
      ],
      [
        "pukul",
        "o'clock / time marker"
      ],
      [
        "tidur",
        "sleep"
      ]
    ],
    "phrases": [
      [
        "Say that you wake up at seven.",
        "Saya bangun pada pukul tujuh."
      ],
      [
        "Say that you live with your parents.",
        "Saya tinggal bersama ibu bapa saya."
      ],
      [
        "Say that you eat breakfast before work.",
        "Saya bersarapan sebelum pergi kerja."
      ],
      [
        "Say that you go to class every day.",
        "Saya pergi ke kelas setiap hari."
      ],
      [
        "Ask what time it is.",
        "Pukul berapa sekarang?"
      ],
      [
        "Say that it is half past two.",
        "Sekarang pukul dua setengah."
      ],
      [
        "Ask what day it is today.",
        "Hari ini hari apa?"
      ],
      [
        "Say that you usually sleep early.",
        "Saya biasanya tidur awal."
      ]
    ],
    "dialogues": [
      [
        "A: Pukul berapa awak bangun?\nB: ...",
        "Saya bangun pada pukul enam setengah."
      ],
      [
        "A: Awak tinggal dengan siapa?\nB: ...",
        "Saya tinggal bersama keluarga saya."
      ],
      [
        "A: Hari ini hari apa?\nB: ...",
        "Hari ini hari Selasa."
      ],
      [
        "A: Awak bekerja pada hari Sabtu?\nB: ...",
        "Tidak, saya bercuti pada hari Sabtu."
      ],
      [
        "A: Selepas kelas, awak buat apa?\nB: ...",
        "Saya pulang ke rumah dan berehat."
      ],
      [
        "A: Bila awak makan malam?\nB: ...",
        "Saya makan malam pada pukul tujuh."
      ]
    ],
    "drills": [
      [
        "Choose the Malay phrase for “every morning.”",
        "setiap pagi"
      ],
      [
        "Choose the Malay phrase for “my younger sibling.”",
        "adik saya"
      ],
      [
        "Choose the Malay phrase for “before dinner.”",
        "sebelum makan malam"
      ],
      [
        "Choose the Malay phrase for “after work.”",
        "selepas kerja"
      ],
      [
        "Choose the Malay phrase for “at eight o'clock.”",
        "pada pukul lapan"
      ],
      [
        "Choose the best Malay sentence for “Today is Friday.”",
        "Hari ini hari Jumaat."
      ],
      [
        "Choose the best Malay sentence for “I usually cook at home.”",
        "Saya biasanya memasak di rumah."
      ],
      [
        "Choose the best Malay sentence for “We visit our family on Sunday.”",
        "Kami melawat keluarga pada hari Ahad."
      ]
    ]
  },
  {
    "level": "A2",
    "title": "Food and Eating Out",
    "description": "Order meals, explain preferences and dietary needs, and pay at a restaurant or food stall.",
    "grammar": "Requests with mahu and boleh; negation with tidak; quantity phrases; imperatives softened with tolong and jangan.",
    "roleplay": "Order a full meal, request one change, and ask for the bill.",
    "outcomes": [
      "Name common foods and tastes",
      "Order politely",
      "Explain a dietary restriction"
    ],
    "vocab": [
      [
        "nasi",
        "rice"
      ],
      [
        "air",
        "water / drink"
      ],
      [
        "ayam",
        "chicken"
      ],
      [
        "ikan",
        "fish"
      ],
      [
        "sayur",
        "vegetables"
      ],
      [
        "pedas",
        "spicy"
      ],
      [
        "manis",
        "sweet"
      ],
      [
        "lapar",
        "hungry"
      ],
      [
        "dahaga",
        "thirsty"
      ],
      [
        "menu",
        "menu"
      ]
    ],
    "phrases": [
      [
        "Ask to see the menu.",
        "Boleh saya lihat menu?"
      ],
      [
        "Order chicken rice and water.",
        "Saya mahu nasi ayam dan air kosong."
      ],
      [
        "Ask for the food not to be too spicy.",
        "Tolong jangan terlalu pedas."
      ],
      [
        "Say that you do not eat meat.",
        "Saya tidak makan daging."
      ],
      [
        "Ask whether vegetarian food is available.",
        "Ada makanan vegetarian?"
      ],
      [
        "Ask for takeaway.",
        "Boleh bungkus?"
      ],
      [
        "Ask for the bill.",
        "Boleh saya minta bil?"
      ],
      [
        "Ask how much the total is.",
        "Berapa jumlah semuanya?"
      ]
    ],
    "dialogues": [
      [
        "Pelayan: Selamat datang. Mahu pesan apa?\nPelanggan: ...",
        "Saya mahu mi goreng dan teh ais."
      ],
      [
        "Pelayan: Mahu pedas?\nPelanggan: ...",
        "Sedikit pedas sahaja."
      ],
      [
        "Pelanggan: Ada makanan vegetarian?\nPelayan: ...",
        "Ya, kami ada nasi goreng sayur."
      ],
      [
        "Pelayan: Makan di sini atau bungkus?\nPelanggan: ...",
        "Bungkus, terima kasih."
      ],
      [
        "Pelanggan: Maaf, pesanan saya belum sampai.\nPelayan: ...",
        "Maaf, saya akan periksa sekarang."
      ],
      [
        "Pelanggan: Boleh saya minta bil?\nPelayan: ...",
        "Boleh, saya bawakan sekarang."
      ]
    ],
    "drills": [
      [
        "Choose the best phrase for “one glass of water.”",
        "segelas air"
      ],
      [
        "Choose the best phrase for “a plate of rice.”",
        "sepinggan nasi"
      ],
      [
        "Choose the best Malay sentence for “I would like less sugar.”",
        "Saya mahu kurang gula."
      ],
      [
        "Choose the best Malay sentence for “This soup is too salty.”",
        "Sup ini terlalu masin."
      ],
      [
        "Choose the best Malay sentence for “Do you have halal food?”",
        "Ada makanan halal?"
      ],
      [
        "Choose the best Malay sentence for “I am allergic to peanuts.”",
        "Saya alah kepada kacang tanah."
      ],
      [
        "Choose the best Malay sentence for “The food is delicious.”",
        "Makanan ini sedap."
      ],
      [
        "Choose the best Malay sentence for “Please bring two spoons.”",
        "Tolong bawakan dua sudu."
      ]
    ]
  },
  {
    "level": "A2",
    "title": "Shopping, Money and Directions",
    "description": "Compare products, pay for purchases, and ask for or give straightforward directions.",
    "grammar": "Demonstratives ini/itu; comparatives with lebih; location with di; movement with ke; direction verbs belok and terus.",
    "roleplay": "Buy clothing at a market, negotiate politely, then ask how to reach the bus station.",
    "outcomes": [
      "Ask prices and sizes",
      "Handle cash or card payment",
      "Follow and give basic directions"
    ],
    "vocab": [
      [
        "harga",
        "price"
      ],
      [
        "murah",
        "cheap"
      ],
      [
        "mahal",
        "expensive"
      ],
      [
        "tunai",
        "cash"
      ],
      [
        "kad",
        "card"
      ],
      [
        "resit",
        "receipt"
      ],
      [
        "kedai",
        "shop"
      ],
      [
        "kiri",
        "left"
      ],
      [
        "kanan",
        "right"
      ],
      [
        "terus",
        "straight ahead"
      ]
    ],
    "phrases": [
      [
        "Ask the price of an item.",
        "Berapa harganya?"
      ],
      [
        "Politely ask whether the price can be reduced.",
        "Boleh kurang sedikit?"
      ],
      [
        "Say that you are only looking.",
        "Saya tengok-tengok sahaja."
      ],
      [
        "Ask for a larger size.",
        "Ada saiz yang lebih besar?"
      ],
      [
        "Say that you will pay by card.",
        "Saya mahu bayar dengan kad."
      ],
      [
        "Ask where the train station is.",
        "Di mana stesen kereta api?"
      ],
      [
        "Tell someone to turn left at the traffic light.",
        "Belok kiri di lampu isyarat."
      ],
      [
        "Tell someone to go straight and then turn right.",
        "Jalan terus, kemudian belok kanan."
      ]
    ],
    "dialogues": [
      [
        "Pelanggan: Berapa harga baju ini?\nPenjual: ...",
        "Harganya empat puluh ringgit."
      ],
      [
        "Pelanggan: Ada saiz yang lebih kecil?\nPenjual: ...",
        "Ya, saya akan carikan."
      ],
      [
        "Penjual: Bayar tunai atau kad?\nPelanggan: ...",
        "Saya bayar dengan kad."
      ],
      [
        "Pelanggan: Boleh saya dapatkan resit?\nPenjual: ...",
        "Boleh, ini resit anda."
      ],
      [
        "A: Tumpang tanya, di mana bank?\nB: ...",
        "Jalan terus dan belok kiri di simpang."
      ],
      [
        "A: Jauh dari sini?\nB: ...",
        "Tidak jauh, kira-kira lima minit berjalan kaki."
      ]
    ],
    "drills": [
      [
        "Choose the Malay phrase for “this shirt.”",
        "baju ini"
      ],
      [
        "Choose the Malay phrase for “that shop.”",
        "kedai itu"
      ],
      [
        "Choose the best Malay sentence for “This one is cheaper.”",
        "Yang ini lebih murah."
      ],
      [
        "Choose the best Malay sentence for “I need a smaller size.”",
        "Saya perlukan saiz yang lebih kecil."
      ],
      [
        "Choose the best Malay sentence for “The pharmacy is next to the bank.”",
        "Farmasi di sebelah bank."
      ],
      [
        "Choose the best Malay sentence for “Cross the road carefully.”",
        "Lintas jalan dengan berhati-hati."
      ],
      [
        "Choose the best Malay sentence for “The market is opposite the school.”",
        "Pasar terletak bertentangan dengan sekolah."
      ],
      [
        "Choose the best Malay sentence for “Can I exchange this item?”",
        "Boleh saya tukar barang ini?"
      ]
    ]
  },
  {
    "level": "B1",
    "title": "Transport, Travel and Accommodation",
    "description": "Plan journeys, buy tickets, manage delays, check in, and solve common hotel problems.",
    "grammar": "Future intention with akan; completed actions with sudah; belum for not yet; polite requests with boleh and tolong.",
    "roleplay": "Travel from an airport to a hotel and resolve a room issue at reception.",
    "outcomes": [
      "Buy and confirm tickets",
      "Ask about routes and delays",
      "Check into accommodation and report a problem"
    ],
    "vocab": [
      [
        "bas",
        "bus"
      ],
      [
        "kereta api",
        "train"
      ],
      [
        "teksi",
        "taxi"
      ],
      [
        "tiket",
        "ticket"
      ],
      [
        "stesen",
        "station"
      ],
      [
        "lapangan terbang",
        "airport"
      ],
      [
        "hotel",
        "hotel"
      ],
      [
        "bilik",
        "room"
      ],
      [
        "tempahan",
        "reservation"
      ],
      [
        "lewat",
        "late"
      ]
    ],
    "phrases": [
      [
        "Buy one ticket to Kuala Lumpur.",
        "Saya mahu satu tiket ke Kuala Lumpur."
      ],
      [
        "Ask what time the train departs.",
        "Kereta api bertolak pukul berapa?"
      ],
      [
        "Ask which platform to use.",
        "Di platform mana?"
      ],
      [
        "Ask a taxi driver to take you to the hotel.",
        "Tolong hantar saya ke hotel ini."
      ],
      [
        "Say that you have a reservation under your name.",
        "Saya ada tempahan atas nama saya."
      ],
      [
        "Ask whether you can check in now.",
        "Boleh saya daftar masuk sekarang?"
      ],
      [
        "Report that the air conditioner is not working.",
        "Penghawa dingin di bilik saya tidak berfungsi."
      ],
      [
        "Say that the bus is thirty minutes late.",
        "Bas lewat tiga puluh minit."
      ]
    ],
    "dialogues": [
      [
        "Penumpang: Kereta api ke Ipoh bertolak pukul berapa?\nPetugas: ...",
        "Kereta api bertolak pada pukul sembilan pagi."
      ],
      [
        "Penumpang: Di platform mana?\nPetugas: ...",
        "Di platform tiga."
      ],
      [
        "Pemandu: Mahu pergi ke mana?\nPenumpang: ...",
        "Tolong hantar saya ke Hotel Sentral."
      ],
      [
        "Penyambut tetamu: Ada tempahan?\nTetamu: ...",
        "Ya, atas nama Nur Aisyah."
      ],
      [
        "Tetamu: Bilik saya belum dibersihkan.\nPenyambut tetamu: ...",
        "Maaf, kami akan uruskan dengan segera."
      ],
      [
        "Penyambut tetamu: Pukul berapa anda mahu daftar keluar?\nTetamu: ...",
        "Saya akan daftar keluar sebelum tengah hari."
      ]
    ],
    "drills": [
      [
        "Choose the best Malay sentence for “I have already bought the ticket.”",
        "Saya sudah membeli tiket."
      ],
      [
        "Choose the best Malay sentence for “The train has not arrived yet.”",
        "Kereta api belum tiba."
      ],
      [
        "Choose the best Malay sentence for “We will leave tomorrow morning.”",
        "Kami akan bertolak esok pagi."
      ],
      [
        "Choose the best Malay sentence for “How long is the journey?”",
        "Berapa lama perjalanan ini?"
      ],
      [
        "Choose the best Malay sentence for “Is breakfast included?”",
        "Adakah sarapan termasuk?"
      ],
      [
        "Choose the best Malay sentence for “I need an extra towel.”",
        "Saya perlukan tuala tambahan."
      ],
      [
        "Choose the best Malay sentence for “Could you call a taxi for me?”",
        "Boleh tolong panggilkan teksi untuk saya?"
      ],
      [
        "Choose the best Malay sentence for “My flight was cancelled.”",
        "Penerbangan saya dibatalkan."
      ]
    ]
  },
  {
    "level": "B1",
    "title": "Health, Pharmacy and Emergencies",
    "description": "Describe symptoms, ask for medical help, understand simple instructions, and respond in an emergency.",
    "grammar": "Body and symptom constructions with sakit; duration with sejak and selama; necessity with perlu; advice with sebaiknya.",
    "roleplay": "Explain symptoms at a clinic and understand a basic medicine schedule.",
    "outcomes": [
      "Describe common symptoms",
      "Ask for a clinic or pharmacy",
      "Communicate essential emergency information"
    ],
    "vocab": [
      [
        "sakit",
        "sick / painful"
      ],
      [
        "demam",
        "fever"
      ],
      [
        "batuk",
        "cough"
      ],
      [
        "pening",
        "dizzy"
      ],
      [
        "ubat",
        "medicine"
      ],
      [
        "doktor",
        "doctor"
      ],
      [
        "klinik",
        "clinic"
      ],
      [
        "kecemasan",
        "emergency"
      ],
      [
        "alahan",
        "allergy"
      ],
      [
        "rehat",
        "rest"
      ]
    ],
    "phrases": [
      [
        "Say that you have a headache.",
        "Saya sakit kepala."
      ],
      [
        "Say that you have had a fever since yesterday.",
        "Saya demam sejak semalam."
      ],
      [
        "Say that you are allergic to penicillin.",
        "Saya alah kepada penisilin."
      ],
      [
        "Ask where the nearest clinic is.",
        "Di mana klinik yang terdekat?"
      ],
      [
        "Say that you need to see a doctor.",
        "Saya perlu berjumpa doktor."
      ],
      [
        "Repeat an instruction to take medicine after eating.",
        "Ambil ubat ini selepas makan."
      ],
      [
        "Ask someone to call an ambulance.",
        "Tolong panggil ambulans."
      ],
      [
        "Say that you feel better today.",
        "Saya rasa lebih baik hari ini."
      ]
    ],
    "dialogues": [
      [
        "Doktor: Apa masalahnya?\nPesakit: ...",
        "Saya demam dan batuk sejak semalam."
      ],
      [
        "Doktor: Ada alahan terhadap ubat?\nPesakit: ...",
        "Ya, saya alah kepada penisilin."
      ],
      [
        "Ahli farmasi: Ubat ini perlu diambil dua kali sehari.\nPesakit: ...",
        "Perlu diambil sebelum atau selepas makan?"
      ],
      [
        "A: Awak nampak pening. Awak okey?\nB: ...",
        "Saya rasa lemah dan perlu duduk."
      ],
      [
        "A: Ini kecemasan. Apa yang berlaku?\nB: ...",
        "Kawan saya pengsan dan tidak sedarkan diri."
      ],
      [
        "Doktor: Banyakkan rehat dan minum air.\nPesakit: ...",
        "Baik, doktor. Terima kasih."
      ]
    ],
    "drills": [
      [
        "Choose the best Malay sentence for “My stomach hurts.”",
        "Perut saya sakit."
      ],
      [
        "Choose the best Malay sentence for “I have been coughing for three days.”",
        "Saya batuk selama tiga hari."
      ],
      [
        "Choose the best Malay sentence for “I feel short of breath.”",
        "Saya berasa sesak nafas."
      ],
      [
        "Choose the best Malay sentence for “Do I need a prescription?”",
        "Adakah saya perlukan preskripsi?"
      ],
      [
        "Choose the best Malay sentence for “Take one tablet every eight hours.”",
        "Ambil satu tablet setiap lapan jam."
      ],
      [
        "Choose the best Malay sentence for “You should rest at home.”",
        "Anda sebaiknya berehat di rumah."
      ],
      [
        "Choose the best Malay sentence for “Where is the emergency department?”",
        "Di mana jabatan kecemasan?"
      ],
      [
        "Choose the best Malay sentence for “Please contact my family.”",
        "Tolong hubungi keluarga saya."
      ]
    ]
  },
  {
    "level": "B1",
    "title": "School, Work and Digital Communication",
    "description": "Ask for clarification, discuss deadlines, participate in meetings, and solve common technology problems.",
    "grammar": "Requests with boleh; obligation with mesti/perlu; future and promises with akan; purpose with untuk; relative yang.",
    "roleplay": "Ask a teacher or colleague for clarification and agree on a deadline.",
    "outcomes": [
      "Ask for academic or workplace help",
      "Discuss tasks and deadlines",
      "Handle simple email, file, and internet issues"
    ],
    "vocab": [
      [
        "kelas",
        "class"
      ],
      [
        "guru",
        "teacher"
      ],
      [
        "tugasan",
        "assignment / task"
      ],
      [
        "mesyuarat",
        "meeting"
      ],
      [
        "pejabat",
        "office"
      ],
      [
        "komputer",
        "computer"
      ],
      [
        "e-mel",
        "email"
      ],
      [
        "fail",
        "file"
      ],
      [
        "tarikh akhir",
        "deadline"
      ],
      [
        "bantuan",
        "help / assistance"
      ]
    ],
    "phrases": [
      [
        "Say that you do not understand the question.",
        "Saya tidak faham soalan ini."
      ],
      [
        "Ask for another explanation.",
        "Boleh terangkan sekali lagi?"
      ],
      [
        "Ask when the deadline is.",
        "Bila tarikh akhir tugasan ini?"
      ],
      [
        "Say that you will send an email this afternoon.",
        "Saya akan hantar e-mel petang ini."
      ],
      [
        "Say that the meeting starts at ten.",
        "Mesyuarat bermula pada pukul sepuluh."
      ],
      [
        "Ask someone to share the file.",
        "Boleh kongsi fail itu dengan saya?"
      ],
      [
        "Report that the internet is not working.",
        "Sambungan internet tidak berfungsi."
      ],
      [
        "Invite the group to work together.",
        "Mari kita bekerjasama."
      ]
    ],
    "dialogues": [
      [
        "Pelajar: Cikgu, saya tidak faham bahagian ini.\nGuru: ...",
        "Baik, saya akan terangkan dengan contoh lain."
      ],
      [
        "Pelajar: Bila tarikh akhir tugasan?\nGuru: ...",
        "Tarikh akhirnya pada hari Jumaat."
      ],
      [
        "Penyelia: Boleh hantar laporan hari ini?\nPekerja: ...",
        "Saya boleh hantar sebelum pukul lima."
      ],
      [
        "Rakan sekerja: Awak sudah terima e-mel saya?\nAnda: ...",
        "Belum, boleh hantar sekali lagi?"
      ],
      [
        "A: Saya tidak dapat membuka fail ini.\nB: ...",
        "Saya akan hantarkan fail dalam format PDF."
      ],
      [
        "Ketua: Siapa boleh bentangkan kemajuan projek?\nAnda: ...",
        "Saya boleh berikan kemas kini ringkas."
      ]
    ],
    "drills": [
      [
        "Choose the best Malay sentence for “I must finish this today.”",
        "Saya mesti siapkan perkara ini hari ini."
      ],
      [
        "Choose the best Malay sentence for “This document is for the meeting.”",
        "Dokumen ini untuk mesyuarat."
      ],
      [
        "Choose the best Malay sentence for “The colleague who called me is absent.”",
        "Rakan sekerja yang menelefon saya tidak hadir."
      ],
      [
        "Choose the best Malay sentence for “Please attach the file.”",
        "Sila lampirkan fail itu."
      ],
      [
        "Choose the best Malay sentence for “Can we move the meeting?”",
        "Boleh kita tunda mesyuarat?"
      ],
      [
        "Choose the best Malay sentence for “I need more time.”",
        "Saya perlukan lebih banyak masa."
      ],
      [
        "Choose the best Malay sentence for “The password is incorrect.”",
        "Kata laluan itu tidak betul."
      ],
      [
        "Choose the best Malay sentence for “I will update you tomorrow.”",
        "Saya akan berikan perkembangan terkini esok."
      ]
    ]
  },
  {
    "level": "B2",
    "title": "Social Life, Culture and Community",
    "description": "Give and respond to invitations, discuss customs respectfully, and participate in neighbourhood or community activities.",
    "grammar": "Polite acceptance and refusal; sebab/kerana; conditionals with kalau; reciprocal and inclusive forms with kita.",
    "roleplay": "Invite a neighbour to a celebration, explain a custom, and respond to a dietary question.",
    "outcomes": [
      "Accept or decline invitations naturally",
      "Ask respectful questions about customs",
      "Discuss community participation"
    ],
    "vocab": [
      [
        "jemputan",
        "invitation"
      ],
      [
        "majlis",
        "event / ceremony"
      ],
      [
        "jiran",
        "neighbour"
      ],
      [
        "komuniti",
        "community"
      ],
      [
        "perayaan",
        "celebration / festival"
      ],
      [
        "hadiah",
        "gift"
      ],
      [
        "tradisi",
        "tradition"
      ],
      [
        "sopan",
        "polite"
      ],
      [
        "berkongsi",
        "share"
      ],
      [
        "sukarelawan",
        "volunteer"
      ]
    ],
    "phrases": [
      [
        "Accept an invitation warmly.",
        "Terima kasih atas jemputan. Saya akan datang."
      ],
      [
        "Decline politely because you already have plans.",
        "Maaf, saya sudah ada rancangan pada hari itu."
      ],
      [
        "Ask what you should bring.",
        "Apa yang patut saya bawa?"
      ],
      [
        "Say that you brought a small gift.",
        "Saya membawa sedikit hadiah untuk tuan rumah."
      ],
      [
        "Ask whether there is a custom you should know.",
        "Ada adat yang perlu saya tahu?"
      ],
      [
        "Explain that guests normally remove their shoes.",
        "Biasanya tetamu menanggalkan kasut sebelum masuk."
      ],
      [
        "Invite someone to join a community activity.",
        "Mari sertai aktiviti komuniti bersama-sama."
      ],
      [
        "Say that you would like to volunteer.",
        "Saya ingin menjadi sukarelawan."
      ]
    ],
    "dialogues": [
      [
        "A: Kami mengadakan rumah terbuka hari Ahad. Sudi datang?\nB: ...",
        "Terima kasih atas jemputan. Saya akan datang."
      ],
      [
        "A: Apa yang patut saya bawa?\nB: ...",
        "Tidak perlu bawa apa-apa, datang sahaja."
      ],
      [
        "A: Perlu tanggalkan kasut?\nB: ...",
        "Ya, letakkan kasut di luar pintu."
      ],
      [
        "A: Saya tidak makan daging. Ada pilihan lain?\nB: ...",
        "Ya, kami sediakan beberapa hidangan vegetarian."
      ],
      [
        "A: Komuniti kita akan membersihkan taman esok.\nB: ...",
        "Baik, saya mahu membantu sebagai sukarelawan."
      ],
      [
        "A: Terima kasih kerana datang ke majlis kami.\nB: ...",
        "Sama-sama. Saya sangat gembira dapat hadir."
      ]
    ],
    "drills": [
      [
        "Choose the best Malay sentence for “If I am free, I will come.”",
        "Kalau saya lapang, saya akan datang."
      ],
      [
        "Choose the best Malay sentence for “We should respect local customs.”",
        "Kita harus menghormati adat tempatan."
      ],
      [
        "Choose the best Malay sentence for “I cannot come because I am working.”",
        "Saya tidak dapat datang kerana saya bekerja."
      ],
      [
        "Choose the best Malay sentence for “Let us share the food.”",
        "Mari kita berkongsi makanan."
      ],
      [
        "Choose the best Malay sentence for “Thank you for welcoming me.”",
        "Terima kasih kerana menyambut saya."
      ],
      [
        "Choose the best Malay sentence for “What is this celebration about?”",
        "Perayaan ini disambut untuk apa?"
      ],
      [
        "Choose the best Malay sentence for “Is this gift appropriate?”",
        "Adakah hadiah ini sesuai?"
      ],
      [
        "Choose the best Malay sentence for “Everyone is welcome.”",
        "Semua orang dialu-alukan."
      ]
    ]
  },
  {
    "level": "B2",
    "title": "Opinions, Plans and Problem-Solving",
    "description": "Express and qualify opinions, compare options, suggest solutions, and reach a shared decision.",
    "grammar": "Opinion frames; agreement and soft disagreement; conditionals; sebab-akibat; modal language mungkin, boleh, patut, perlu.",
    "roleplay": "Discuss a group problem, compare two solutions, and agree on an action plan.",
    "outcomes": [
      "Give reasons for an opinion",
      "Disagree without sounding rude",
      "Propose and evaluate solutions"
    ],
    "vocab": [
      [
        "pendapat",
        "opinion"
      ],
      [
        "setuju",
        "agree"
      ],
      [
        "tidak setuju",
        "disagree"
      ],
      [
        "cadangan",
        "suggestion"
      ],
      [
        "rancangan",
        "plan"
      ],
      [
        "masalah",
        "problem"
      ],
      [
        "penyelesaian",
        "solution"
      ],
      [
        "mungkin",
        "maybe / possibly"
      ],
      [
        "sebab",
        "reason"
      ],
      [
        "keputusan",
        "decision"
      ]
    ],
    "phrases": [
      [
        "Introduce your opinion.",
        "Pada pendapat saya, pilihan ini lebih praktikal."
      ],
      [
        "Agree and give a reason.",
        "Saya setuju kerana kosnya lebih rendah."
      ],
      [
        "Disagree gently.",
        "Saya kurang bersetuju dengan cadangan itu."
      ],
      [
        "Suggest a different approach.",
        "Apa kata kita cuba cara yang lain?"
      ],
      [
        "Offer a conditional solution.",
        "Jika masa tidak cukup, kita boleh kurangkan skop."
      ],
      [
        "Say that one factor needs consideration.",
        "Kita perlu mempertimbangkan kesannya kepada pelajar."
      ],
      [
        "Invite the group to decide.",
        "Mari kita buat keputusan bersama-sama."
      ],
      [
        "Explain that the plan has changed.",
        "Rancangan itu berubah kerana cuaca buruk."
      ]
    ],
    "dialogues": [
      [
        "A: Saya rasa kita patut adakan acara pada hari Sabtu.\nB: ...",
        "Saya setuju kerana lebih ramai orang boleh hadir."
      ],
      [
        "A: Kita perlu membeli peralatan baharu.\nB: ...",
        "Saya kurang bersetuju kerana bajet kita terhad."
      ],
      [
        "A: Jadi, apa cadangan awak?\nB: ...",
        "Apa kata kita menyewa peralatan dahulu?"
      ],
      [
        "A: Masa kita sangat singkat.\nB: ...",
        "Jika begitu, kita perlu utamakan tugas yang paling penting."
      ],
      [
        "A: Dua pilihan ini sama-sama baik.\nB: ...",
        "Mari kita bandingkan kos dan manfaatnya."
      ],
      [
        "A: Adakah semua orang bersetuju?\nB: ...",
        "Ya, kita boleh teruskan dengan rancangan ini."
      ]
    ],
    "drills": [
      [
        "Choose the best Malay sentence for “In my view, this is fair.”",
        "Pada pandangan saya, perkara ini adil."
      ],
      [
        "Choose the best Malay sentence for “I understand your point, but I have a concern.”",
        "Saya faham pandangan awak, tetapi saya ada satu kebimbangan."
      ],
      [
        "Choose the best Malay sentence for “This option is cheaper but slower.”",
        "Pilihan ini lebih murah tetapi lebih lambat."
      ],
      [
        "Choose the best Malay sentence for “The main reason is safety.”",
        "Sebab utama ialah keselamatan."
      ],
      [
        "Choose the best Malay sentence for “What are the advantages and disadvantages?”",
        "Apakah kelebihan dan kekurangannya?"
      ],
      [
        "Choose the best Malay sentence for “We may need a backup plan.”",
        "Kita mungkin memerlukan rancangan sandaran."
      ],
      [
        "Choose the best Malay sentence for “Let us review the facts first.”",
        "Mari kita semak fakta terlebih dahulu."
      ],
      [
        "Choose the best Malay sentence for “We reached a decision after discussing it.”",
        "Kami mencapai keputusan selepas berbincang."
      ]
    ]
  },
  {
    "level": "C1",
    "title": "Meetings, Presentations and Negotiation",
    "description": "Lead structured discussions, present evidence, clarify positions, negotiate constraints, and confirm next actions.",
    "grammar": "Formal discourse markers; passive constructions; nominalisation; diplomatic requests and concessions.",
    "roleplay": "Lead a five-minute project meeting and negotiate a revised deadline with clear action items.",
    "outcomes": [
      "Open and structure a meeting",
      "Present and interpret evidence",
      "Negotiate while preserving cooperation"
    ],
    "vocab": [
      [
        "agenda",
        "agenda"
      ],
      [
        "objektif",
        "objective"
      ],
      [
        "pembentangan",
        "presentation"
      ],
      [
        "data",
        "data"
      ],
      [
        "kemajuan",
        "progress"
      ],
      [
        "cabaran",
        "challenge"
      ],
      [
        "bajet",
        "budget"
      ],
      [
        "rundingan",
        "negotiation"
      ],
      [
        "kompromi",
        "compromise"
      ],
      [
        "tindakan",
        "action"
      ]
    ],
    "phrases": [
      [
        "Open a meeting and state the objective.",
        "Terima kasih kerana hadir. Objektif mesyuarat hari ini ialah menyemak kemajuan projek."
      ],
      [
        "Move to the first agenda item.",
        "Mari kita mulakan dengan perkara pertama dalam agenda."
      ],
      [
        "Present a key data finding.",
        "Berdasarkan data terkini, kadar penyertaan meningkat sebanyak dua puluh peratus."
      ],
      [
        "Ask a speaker to clarify a point.",
        "Boleh jelaskan bagaimana angka itu dikira?"
      ],
      [
        "Acknowledge a challenge without stopping the plan.",
        "Walaupun terdapat beberapa cabaran, projek masih berada di landasan yang betul."
      ],
      [
        "Negotiate additional time.",
        "Kami mencadangkan lanjutan satu minggu agar kualiti hasil dapat dikekalkan."
      ],
      [
        "Offer a compromise.",
        "Sebagai kompromi, kami boleh menyerahkan bahagian pertama pada hari Jumaat."
      ],
      [
        "Close with action items.",
        "Sebelum kita tamat, mari kita sahkan tindakan dan pihak yang bertanggungjawab."
      ]
    ],
    "dialogues": [
      [
        "Pengerusi: Adakah semua orang bersedia untuk perkara pertama?\nAhli: ...",
        "Ya, sila teruskan dengan kemas kini projek."
      ],
      [
        "Pembentang: Kadar penyertaan meningkat dua puluh peratus.\nAhli: ...",
        "Boleh jelaskan faktor utama yang mendorong peningkatan itu?"
      ],
      [
        "Pengurus: Tarikh akhir tidak boleh diubah.\nKetua projek: ...",
        "Bolehkah kita bincangkan penyerahan secara berperingkat sebagai kompromi?"
      ],
      [
        "Klien: Bajet kami terhad.\nWakil: ...",
        "Kami boleh menyesuaikan skop tanpa menjejaskan objektif utama."
      ],
      [
        "Pengerusi: Siapa akan menyediakan laporan akhir?\nAhli: ...",
        "Saya akan menyediakannya dan menghantar draf pada hari Rabu."
      ],
      [
        "Pengerusi: Ada perkara lain sebelum kita tamat?\nAhli: ...",
        "Tiada. Semua tindakan dan tarikh akhir sudah jelas."
      ]
    ],
    "drills": [
      [
        "Choose the most formal Malay sentence for “The proposal will be reviewed.”",
        "Cadangan tersebut akan dikaji semula."
      ],
      [
        "Choose the best Malay sentence for “We need to identify the root cause.”",
        "Kita perlu mengenal pasti punca utama."
      ],
      [
        "Choose the best Malay sentence for “The results support our recommendation.”",
        "Dapatan tersebut menyokong syor kami."
      ],
      [
        "Choose the best Malay sentence for “Could we return to the main issue?”",
        "Bolehkah kita kembali kepada isu utama?"
      ],
      [
        "Choose the best Malay sentence for “I would like to raise one concern.”",
        "Saya ingin membangkitkan satu kebimbangan."
      ],
      [
        "Choose the best Malay sentence for “This decision requires further approval.”",
        "Keputusan ini memerlukan kelulusan lanjut."
      ],
      [
        "Choose the best Malay sentence for “We are prepared to reconsider the price.”",
        "Kami bersedia untuk mempertimbangkan semula harga tersebut."
      ],
      [
        "Choose the best Malay sentence for “The next step is to confirm the schedule.”",
        "Langkah seterusnya ialah mengesahkan jadual."
      ]
    ]
  },
  {
    "level": "C1",
    "title": "News, Society and the Environment",
    "description": "Discuss public issues, distinguish claims from evidence, explain consequences, and propose balanced responses.",
    "grammar": "Cause and effect; hedging; evidence frames; passive voice; complex connectors such as sehubungan dengan itu and walau bagaimanapun.",
    "roleplay": "Summarise a news report, evaluate its evidence, and discuss one policy response.",
    "outcomes": [
      "Summarise a public issue",
      "Evaluate evidence and source reliability",
      "Explain social or environmental trade-offs"
    ],
    "vocab": [
      [
        "berita",
        "news"
      ],
      [
        "masyarakat",
        "society"
      ],
      [
        "ekonomi",
        "economy"
      ],
      [
        "pendidikan",
        "education"
      ],
      [
        "kesihatan awam",
        "public health"
      ],
      [
        "alam sekitar",
        "environment"
      ],
      [
        "pencemaran",
        "pollution"
      ],
      [
        "perubahan iklim",
        "climate change"
      ],
      [
        "sumber",
        "source / resource"
      ],
      [
        "dasar",
        "policy"
      ]
    ],
    "phrases": [
      [
        "Introduce the main point of a report.",
        "Laporan ini menumpukan kesan kenaikan kos terhadap keluarga berpendapatan rendah."
      ],
      [
        "Question the reliability of a source.",
        "Kita perlu menilai sama ada sumber tersebut boleh dipercayai."
      ],
      [
        "Refer to supporting evidence.",
        "Dakwaan itu disokong oleh data daripada beberapa kajian bebas."
      ],
      [
        "Explain a consequence.",
        "Pencemaran udara boleh menjejaskan kesihatan awam dalam jangka panjang."
      ],
      [
        "Qualify a claim.",
        "Walaupun trend ini membimbangkan, datanya masih terhad."
      ],
      [
        "Present another perspective.",
        "Dari sudut ekonomi, langkah itu mungkin meningkatkan kos dalam jangka pendek."
      ],
      [
        "Propose a policy response.",
        "Kerajaan boleh memperluas pengangkutan awam dan menggalakkan penggunaan tenaga bersih."
      ],
      [
        "Link the evidence to a conclusion.",
        "Sehubungan dengan itu, tindakan pencegahan perlu dilaksanakan dengan segera."
      ]
    ],
    "dialogues": [
      [
        "A: Apakah isu utama dalam berita ini?\nB: ...",
        "Isu utamanya ialah peningkatan kos sara hidup."
      ],
      [
        "A: Adakah sumber itu boleh dipercayai?\nB: ...",
        "Nampaknya boleh, tetapi kita perlu menyemak kaedah pengumpulan datanya."
      ],
      [
        "A: Apakah kesan pencemaran terhadap masyarakat?\nB: ...",
        "Ia boleh meningkatkan masalah pernafasan dan kos kesihatan."
      ],
      [
        "A: Patutkah dasar itu dilaksanakan segera?\nB: ...",
        "Ya, tetapi bantuan peralihan perlu diberikan kepada kumpulan yang terjejas."
      ],
      [
        "A: Ada pandangan lain?\nB: ...",
        "Dari sudut lain, dasar itu boleh mewujudkan peluang pekerjaan baharu."
      ],
      [
        "A: Apakah kesimpulan awak?\nB: ...",
        "Penyelesaian yang seimbang perlu mengambil kira alam sekitar dan ekonomi."
      ]
    ],
    "drills": [
      [
        "Choose the best Malay sentence for “The policy was introduced last year.”",
        "Dasar itu diperkenalkan pada tahun lalu."
      ],
      [
        "Choose the best Malay sentence for “There is insufficient evidence to reach a conclusion.”",
        "Bukti yang ada belum mencukupi untuk membuat kesimpulan."
      ],
      [
        "Choose the best Malay sentence for “The issue affects different groups differently.”",
        "Isu ini memberi kesan yang berbeza kepada setiap kumpulan."
      ],
      [
        "Choose the best Malay sentence for “In the long term, prevention is less costly.”",
        "Dalam jangka panjang, pencegahan melibatkan kos yang lebih rendah."
      ],
      [
        "Choose the best Malay sentence for “This claim should be verified.”",
        "Dakwaan ini perlu disahkan."
      ],
      [
        "Choose the best Malay sentence for “Public awareness has increased.”",
        "Kesedaran masyarakat telah meningkat."
      ],
      [
        "Choose the best Malay sentence for “Not only is the air polluted, the river is also affected.”",
        "Bukan sahaja udara tercemar, malah sungai turut terjejas."
      ],
      [
        "Choose the best Malay sentence for “The solution requires cooperation from all parties.”",
        "Penyelesaian itu memerlukan kerjasama semua pihak."
      ]
    ]
  },
  {
    "level": "C1+",
    "title": "Nuance, Idioms, Debate and Storytelling",
    "description": "Sound more natural, recognise common idioms, organise persuasive arguments, and tell coherent personal or professional stories.",
    "grammar": "Register shifts; idiomatic meaning; concession; emphasis; narrative sequencing; stance and rebuttal.",
    "roleplay": "Tell a three-minute story, then defend a position in a respectful mini-debate.",
    "outcomes": [
      "Use common idioms appropriately",
      "Clarify nuanced meaning",
      "Build and rebut an argument",
      "Tell a well-sequenced story"
    ],
    "vocab": [
      [
        "ambil berat",
        "care about / show concern"
      ],
      [
        "ringan tulang",
        "hardworking and helpful"
      ],
      [
        "buah tangan",
        "souvenir / gift from a trip"
      ],
      [
        "makan angin",
        "take a leisure trip"
      ],
      [
        "besar hati",
        "pleased / honoured"
      ],
      [
        "kecil hati",
        "hurt or offended"
      ],
      [
        "naik angin",
        "become angry"
      ],
      [
        "bagai aur dengan tebing",
        "support one another"
      ],
      [
        "pendirian",
        "stance / position"
      ],
      [
        "kesimpulan",
        "conclusion"
      ]
    ],
    "phrases": [
      [
        "Clarify your real meaning.",
        "Apa yang saya maksudkan ialah kita perlu lebih berhati-hati."
      ],
      [
        "Make a candid but respectful comment.",
        "Sejujurnya, saya kurang yakin bahawa rancangan itu realistik."
      ],
      [
        "Introduce a concession.",
        "Walaupun cadangan itu mempunyai kelemahan, manfaatnya masih ketara."
      ],
      [
        "Present another angle.",
        "Dari sudut yang lain, perubahan ini boleh membuka peluang baharu."
      ],
      [
        "Introduce an example.",
        "Izinkan saya memberikan satu contoh yang berkaitan."
      ],
      [
        "Acknowledge and rebut an argument.",
        "Saya faham hujah itu, tetapi bukti yang ada menunjukkan sebaliknya."
      ],
      [
        "State a conclusion.",
        "Kesimpulannya, penyelesaian terbaik ialah pendekatan yang berperingkat."
      ],
      [
        "Sequence a story.",
        "Pada mulanya saya ragu-ragu, kemudian saya mencuba, dan akhirnya saya berjaya."
      ]
    ],
    "dialogues": [
      [
        "A: Dia selalu membantu jiran tanpa diminta.\nB: ...",
        "Memang betul, dia seorang yang ringan tulang."
      ],
      [
        "A: Saya bawa sesuatu dari Melaka untuk awak.\nB: ...",
        "Terima kasih atas buah tangan ini."
      ],
      [
        "A: Jangan kecil hati, saya cuma mahu memberi cadangan.\nB: ...",
        "Baik, saya faham maksud awak."
      ],
      [
        "A: Saya setuju bahawa kos penting.\nB: ...",
        "Namun begitu, keselamatan tidak patut dikompromikan."
      ],
      [
        "A: Apakah bukti yang menyokong pendirian awak?\nB: ...",
        "Saya merujuk kepada dua kajian dan data penggunaan sebenar."
      ],
      [
        "A: Bagaimana cerita itu berakhir?\nB: ...",
        "Akhirnya, kami menyelesaikan masalah itu melalui kerjasama."
      ]
    ],
    "drills": [
      [
        "Choose the idiom that means “to care about someone.”",
        "ambil berat"
      ],
      [
        "Choose the idiom for “a souvenir brought home from a trip.”",
        "buah tangan"
      ],
      [
        "Choose the best Malay sentence for “Although I disagree, I respect your stance.”",
        "Walaupun saya tidak bersetuju, saya menghormati pendirian awak."
      ],
      [
        "Choose the best Malay sentence for “What matters is not speed, but accuracy.”",
        "Yang penting bukanlah kepantasan, tetapi ketepatan."
      ],
      [
        "Choose the best Malay sentence for “Let me rephrase that more clearly.”",
        "Izinkan saya menyatakannya semula dengan lebih jelas."
      ],
      [
        "Choose the best Malay sentence for “The argument sounds convincing, yet it overlooks one issue.”",
        "Hujah itu kedengaran meyakinkan, namun mengabaikan satu isu."
      ],
      [
        "Choose the best Malay sentence for “At first everything went smoothly, but then a problem arose.”",
        "Pada mulanya semuanya berjalan lancar, tetapi kemudian timbul satu masalah."
      ],
      [
        "Choose the best Malay sentence for “In conclusion, cooperation is the key.”",
        "Kesimpulannya, kerjasama ialah kuncinya."
      ]
    ]
  }
];

function rotateOptions(items, index, vocabularyMode = false) {
  const answer = items[index];
  const distractorIndexes = [];
  for (let step = 1; step < items.length && distractorIndexes.length < 2; step += 1) {
    const candidate = (index + step) % items.length;
    if (candidate !== index && !distractorIndexes.includes(candidate)) distractorIndexes.push(candidate);
  }
  const indexes = [index, ...distractorIndexes];
  const options = indexes.map((itemIndex) => {
    const item = items[itemIndex];
    const text = vocabularyMode ? item[0] : item[1];
    return {
      text,
      correct: itemIndex === index,
      emoji: null,
      audioText: text,
    };
  });
  const shift = index % options.length;
  return [...options.slice(shift), ...options.slice(0, shift)];
}

// Pairs up to 4 of a unit's own vocab entries (Malay word <-> English
// meaning) into one MATCHING challenge (2 tiles per pair, positionally
// paired -- see matchingChallengeIsCorrect in shared/languageQuest.ts).
function vocabMatchingChallenge(unit) {
  const pairs = unit.vocab.slice(0, 4);
  const options = [];
  for (const entry of pairs) {
    options.push({ text: entry[0], correct: true, emoji: null, audioText: entry[0] });
    options.push({ text: entry[1], correct: true, emoji: null, audioText: entry[1] });
  }
  return {
    type: "MATCHING",
    question: "Match each Malay word or phrase to its English meaning.",
    options,
  };
}

function vocabChallenges(unit) {
  return unit.vocab.map((entry, index) => ({
    type: index % 4 === 3 ? "ASSIST" : "SELECT",
    question: `Which Malay word or phrase means “${entry[1]}”? Listen, choose, and say it aloud.`,
    options: rotateOptions(unit.vocab, index, true),
  }));
}

const SPEAKING_QUESTION_FRAMING = {
  SELECT: "Choose the best Malay response, then say it aloud.",
  ASSIST: "Choose the best Malay response, then say it aloud.",
  CLOZE: "Complete the exchange with the correct Malay wording, then say it aloud.",
  GRAMMAR_TRANSFORM: "Choose the grammatically correct Malay sentence, then say it aloud.",
};

function speakingChallenges(items, label, typeCycle = ["SELECT", "ASSIST"]) {
  return items.map((entry, index) => {
    const type = typeCycle[index % typeCycle.length];
    return {
      type,
      question: `${label}
${entry[0]}
${SPEAKING_QUESTION_FRAMING[type]}`,
      options: rotateOptions(items, index, false),
    };
  });
}

// Rebuilds one of this unit's own real drill sentences, word by word --
// always available since every unit has at least one multi-word drill
// answer sentence.
function unitReorderChallenge(unit) {
  let best = null;
  for (const [, answer] of unit.drills) {
    const tokens = tokenizeWords(answer);
    if (tokens && (!best || tokens.length > best.tokens.length)) best = { tokens };
  }
  if (!best) return null;
  return {
    type: "REORDER",
    question: "Put this Malay sentence back in the correct order.",
    options: best.tokens.map((token) => option(token, true)),
  };
}

// Three of this unit's own vocabulary words/phrases plus one "ringer" word
// borrowed from a different unit -- always available and always genuinely
// different, since every unit has its own distinct vocab list.
function unitOddOneOutChallenge(unit, unitIndex, allUnits) {
  if (unit.vocab.length < 3) return null;
  const inGroup = unit.vocab.slice(0, 3).map(([word]) => word);
  const ringerUnit = allUnits[(unitIndex + 1) % allUnits.length];
  const oddWord = ringerUnit.vocab[0]?.[0];
  return buildOddOneOut(
    "Which Malay word or phrase does not belong with the others?",
    inGroup,
    oddWord,
    oddWord ? `“${oddWord}” is from a different unit; the rest of this set is ${inGroup.map((word) => `“${word}”`).join(", ")}.` : undefined,
  );
}

const course = {
  code: "MRLC-MALAY-SPEAKING-A1-C1-V1",
  title: "Malay Speaking: Beginner to Advanced",
  description: "A 12-unit, speaking-first Bahasa Melayu course for daily life, study, work, travel, community participation, professional communication, debate, and storytelling. Early practical themes are informed by the 1943 TM 30-339 Malay guide, fully rewritten in current Malaysian Malay; advanced units are newly authored.",
  language: "Malay",
  category: "Malay Courses",
  imageEmoji: "",
  accentColor: "#dc2626",
  // Imported as an unpublished draft, consistent with the rest of the Malay
  // catalog -- publish from the Learning Quest course editor after review.
  published: false,
  units: sourceUnits.map((unit, unitIndex) => ({
    title: `${unit.level} · Unit ${unitIndex + 1}: ${unit.title}`,
    description: `${unit.description} Grammar focus: ${unit.grammar}`,
    lessons: [
      {
        title: "Vocabulary Sprint",
        description: "Learn ten high-frequency words or expressions, listen and repeat, then complete an ordering, odd-one-out, and matching review.",
        challenges: [
          ...vocabChallenges(unit),
          unitReorderChallenge(unit),
          unitOddOneOutChallenge(unit, unitIndex, sourceUnits),
          vocabMatchingChallenge(unit),
        ].filter(Boolean),
      },
      {
        title: "Daily Speaking Sentences",
        description: "Choose practical sentences for real situations, then repeat them with natural rhythm.",
        challenges: speakingChallenges(unit.phrases, "SPEAKING SCENARIO"),
      },
      {
        title: "Scenario Dialogue",
        description: "Complete mini-dialogues from daily, academic, community, or professional life.",
        challenges: speakingChallenges(unit.dialogues, "COMPLETE THE DIALOGUE"),
      },
      {
        title: "Sentence Workshop",
        description: "Strengthen grammar, word order, register, and sentence-building through spoken translation, completion, and grammar practice.",
        challenges: speakingChallenges(unit.drills, "SENTENCE PRACTICE", ["SELECT", "ASSIST", "GRAMMAR_TRANSFORM", "CLOZE"]),
      },
    ],
  })),
};

const lessons = course.units.flatMap((unit) => unit.lessons);
const allChallenges = lessons.flatMap((lesson) => lesson.challenges);
const matchingChallenges = allChallenges.filter((challenge) => challenge.type === "MATCHING");
const reorderChallenges = allChallenges.filter((challenge) => challenge.type === "REORDER");
const oddOneOutChallenges = allChallenges.filter((challenge) => challenge.type === "ODD_ONE_OUT");
const challenges = allChallenges.filter((challenge) => !["MATCHING", "REORDER", "ODD_ONE_OUT"].includes(challenge.type));
if (course.units.length !== 12 || lessons.length !== 48 || challenges.length !== 384) {
  throw new Error(`Unexpected curriculum size: ${course.units.length} units, ${lessons.length} lessons, ${challenges.length} challenges`);
}
for (const challenge of challenges) {
  if (challenge.options.length !== 3) throw new Error("Every challenge must have exactly three options");
  if (challenge.options.filter((option) => option.correct).length !== 1) throw new Error("Every challenge must have exactly one correct answer");
  if (challenge.options.some((option) => !option.text || option.audioText !== option.text)) throw new Error("Every option must have matching speakable text");
}
{
  const typeCounts = new Map();
  for (const challenge of challenges) typeCounts.set(challenge.type, (typeCounts.get(challenge.type) || 0) + 1);
  for (const requiredType of ["SELECT", "ASSIST", "CLOZE", "GRAMMAR_TRANSFORM"]) {
    if (!typeCounts.get(requiredType)) throw new Error(`Generated Malay speaking course is missing ${requiredType} challenges`);
  }
}
if (reorderChallenges.length !== course.units.length) {
  throw new Error(`Expected one REORDER challenge per unit (${course.units.length}), found ${reorderChallenges.length}`);
}
for (const challenge of reorderChallenges) {
  if (challenge.options.length < 2 || challenge.options.some((option) => !option.correct || !option.text || option.audioText !== option.text)) {
    throw new Error("Every REORDER challenge must have at least two tokens, all marked correct with matching audio text");
  }
}
if (oddOneOutChallenges.length !== course.units.length) {
  throw new Error(`Expected one ODD_ONE_OUT challenge per unit (${course.units.length}), found ${oddOneOutChallenges.length}`);
}
for (const challenge of oddOneOutChallenges) {
  if (challenge.options.length !== 4 || challenge.options.filter((option) => option.correct).length !== 1 || challenge.options.some((option) => !option.text || option.audioText !== option.text)) {
    throw new Error("Every ODD_ONE_OUT challenge must have four options and exactly one odd-one-out answer with matching audio text");
  }
}
if (matchingChallenges.length !== course.units.length) {
  throw new Error(`Expected one MATCHING challenge per unit (${course.units.length}), found ${matchingChallenges.length}`);
}
for (const challenge of matchingChallenges) {
  if (challenge.options.length !== 8 || challenge.options.some((option) => !option.correct || !option.text || option.audioText !== option.text)) {
    throw new Error("Every generated MATCHING challenge must have 4 pairs (8 tiles), all marked correct with matching audio text");
  }
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(course, null, 2)}
`, "utf8");
console.log(`Generated Malay course with ${course.units.length} units, ${lessons.length} lessons, and ${challenges.length} challenges`);
