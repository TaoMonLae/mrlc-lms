import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { buildOddOneOut, option, tokenizeWords } from "./lib/language-quest-practice-helpers.mjs";

const outputPath = path.resolve(process.cwd(), "curricula/language-quest/malay-govinfo-guide.generated.json");
const sourceUnits = [
  {
    "level": "A1",
    "title": "Clear Sounds and Learning Phrases",
    "description": "Build clear pronunciation habits and learn the classroom phrases needed to listen, repeat, slow down, and ask for help.",
    "source": "How to Use the Records and Guide; Hints on Pronunciation; Special Points (printed pages 6-10).",
    "grammar": "polite requests with tolong and boleh; imperatives; lebih + adjective; sekali lagi.",
    "outcomes": [
      "Ask a speaker to repeat or slow down",
      "Notice common Malay sound patterns",
      "Practise short phrases with steady rhythm"
    ],
    "roleplay": "Complete a two-minute listen-and-repeat coaching exchange with a partner.",
    "vocab": [
      [
        "dengar",
        "listen"
      ],
      [
        "ulang",
        "repeat"
      ],
      [
        "sebut",
        "pronounce / say"
      ],
      [
        "jelas",
        "clear"
      ],
      [
        "perlahan",
        "slowly"
      ],
      [
        "cepat",
        "quickly"
      ],
      [
        "bunyi",
        "sound"
      ],
      [
        "suku kata",
        "syllable"
      ],
      [
        "intonasi",
        "intonation"
      ],
      [
        "latihan",
        "practice"
      ]
    ],
    "phrases": [
      [
        "Ask someone to repeat.",
        "Boleh ulang sekali lagi?"
      ],
      [
        "Ask someone to speak more slowly.",
        "Tolong cakap lebih perlahan."
      ],
      [
        "Say that you did not hear clearly.",
        "Saya tidak dengar dengan jelas."
      ],
      [
        "Ask how a word is pronounced.",
        "Bagaimana sebutan perkataan ini?"
      ],
      [
        "Ask what a word means.",
        "Apakah maksud perkataan ini?"
      ],
      [
        "Say that you understand now.",
        "Sekarang saya faham."
      ],
      [
        "Say that you need more practice.",
        "Saya perlu lebih banyak latihan."
      ],
      [
        "Ask to listen one more time.",
        "Boleh saya dengar sekali lagi?"
      ]
    ],
    "dialogues": [
      [
        "Guru: Dengar dan ulang: terima kasih.\nPelajar: ...",
        "Terima kasih."
      ],
      [
        "Pelajar: Maaf, boleh ulang sekali lagi?\nGuru: ...",
        "Boleh. Dengar baik-baik."
      ],
      [
        "Guru: Cuba sebut perkataan ini.\nPelajar: ...",
        "Baik, saya akan cuba."
      ],
      [
        "Pelajar: Adakah sebutan saya betul?\nGuru: ...",
        "Hampir betul. Cuba sekali lagi."
      ],
      [
        "Guru: Cakap dengan lebih jelas.\nPelajar: ...",
        "Baik, saya akan cakap dengan lebih jelas."
      ],
      [
        "Pelajar: Apakah maksud “perlahan”?\nGuru: ...",
        "Maksudnya tidak cepat."
      ]
    ],
    "drills": [
      [
        "Choose the best Malay sentence for “Please listen carefully.”",
        "Tolong dengar dengan teliti."
      ],
      [
        "Choose the best Malay sentence for “Say it again.”",
        "Sebut sekali lagi."
      ],
      [
        "Choose the phrase for “more slowly.”",
        "lebih perlahan"
      ],
      [
        "Choose the phrase for “clear pronunciation.”",
        "sebutan yang jelas"
      ],
      [
        "Choose the best Malay sentence for “I am learning Malay.”",
        "Saya sedang belajar bahasa Melayu."
      ],
      [
        "Choose the best Malay sentence for “This sound is difficult.”",
        "Bunyi ini sukar."
      ],
      [
        "Choose the best Malay sentence for “Let us practise together.”",
        "Mari kita berlatih bersama-sama."
      ],
      [
        "Choose the best Malay sentence for “I can say it now.”",
        "Sekarang saya boleh menyebutnya."
      ]
    ]
  },
  {
    "level": "A1",
    "title": "Greetings, Introductions and Courtesy",
    "description": "Greet people, introduce yourself, exchange names, thank others, apologise, and say goodbye naturally.",
    "source": "Greetings and General Phrases; Other Useful Phrases; Additional Expressions (printed pages 11 and 26-30).",
    "grammar": "personal pronouns; simple identity sentences; siapa and dari mana; bukan for noun negation.",
    "outcomes": [
      "Use greetings for different times",
      "Introduce yourself and ask names",
      "Use polite social expressions"
    ],
    "roleplay": "Meet a new neighbour and hold a ninety-second introductory conversation.",
    "vocab": [
      [
        "selamat pagi",
        "good morning"
      ],
      [
        "selamat petang",
        "good evening"
      ],
      [
        "apa khabar",
        "how are you"
      ],
      [
        "terima kasih",
        "thank you"
      ],
      [
        "maaf",
        "sorry / excuse me"
      ],
      [
        "tolong",
        "please / help"
      ],
      [
        "nama",
        "name"
      ],
      [
        "kawan",
        "friend"
      ],
      [
        "selamat jalan",
        "goodbye to a person leaving"
      ],
      [
        "selamat tinggal",
        "goodbye said by the person leaving"
      ]
    ],
    "phrases": [
      [
        "Greet someone in the morning.",
        "Selamat pagi."
      ],
      [
        "Ask how someone is.",
        "Apa khabar?"
      ],
      [
        "Say that you are well.",
        "Khabar baik, terima kasih."
      ],
      [
        "Ask for the person’s name.",
        "Siapa nama awak?"
      ],
      [
        "Introduce yourself as Nur.",
        "Nama saya Nur."
      ],
      [
        "Ask where the person is from.",
        "Awak berasal dari mana?"
      ],
      [
        "Say that you are pleased to meet them.",
        "Gembira berkenalan dengan awak."
      ],
      [
        "Say goodbye to someone who is leaving.",
        "Selamat jalan."
      ]
    ],
    "dialogues": [
      [
        "A: Selamat pagi. Apa khabar?\nB: ...",
        "Khabar baik, terima kasih."
      ],
      [
        "A: Siapa nama awak?\nB: ...",
        "Nama saya Hakim."
      ],
      [
        "A: Awak berasal dari mana?\nB: ...",
        "Saya berasal dari Myanmar."
      ],
      [
        "A: Ini kawan saya, Mei Ling.\nB: ...",
        "Gembira berkenalan dengan awak."
      ],
      [
        "A: Terima kasih kerana membantu saya.\nB: ...",
        "Sama-sama."
      ],
      [
        "A: Saya perlu pergi sekarang.\nB: ...",
        "Baik, selamat jalan."
      ]
    ],
    "drills": [
      [
        "Choose the best Malay sentence for “This is my friend.”",
        "Ini kawan saya."
      ],
      [
        "Choose the best Malay sentence for “I am not a teacher.”",
        "Saya bukan guru."
      ],
      [
        "Choose the best Malay sentence for “She is from Sabah.”",
        "Dia berasal dari Sabah."
      ],
      [
        "Choose the best Malay sentence for “What is his name?”",
        "Siapa nama dia?"
      ],
      [
        "Choose the polite response to “Terima kasih.”",
        "Sama-sama."
      ],
      [
        "Choose the best Malay sentence for “Please come in.”",
        "Silakan masuk."
      ],
      [
        "Choose the best Malay sentence for “Please have a seat.”",
        "Silakan duduk."
      ],
      [
        "Choose the best Malay sentence for “See you tomorrow.”",
        "Jumpa lagi esok."
      ]
    ]
  },
  {
    "level": "A1",
    "title": "Numbers, Time and Days",
    "description": "Count, ask prices and quantities, tell the time, name the days, and arrange simple appointments.",
    "source": "Numbers; Money; Time (printed pages 15-17 and 22-25).",
    "grammar": "number order; pukul for clock time; pada for scheduled time; lebih, suku, setengah, kurang.",
    "outcomes": [
      "Use numbers in everyday exchanges",
      "Tell and ask the time",
      "State days and simple schedules"
    ],
    "roleplay": "Arrange a meeting time and confirm the day, hour, and number of people.",
    "vocab": [
      [
        "satu",
        "one"
      ],
      [
        "dua",
        "two"
      ],
      [
        "tiga",
        "three"
      ],
      [
        "sepuluh",
        "ten"
      ],
      [
        "seratus",
        "one hundred"
      ],
      [
        "pukul",
        "clock-time marker"
      ],
      [
        "setengah",
        "half"
      ],
      [
        "suku",
        "quarter"
      ],
      [
        "hari",
        "day"
      ],
      [
        "sekarang",
        "now"
      ]
    ],
    "phrases": [
      [
        "Ask the current time.",
        "Pukul berapa sekarang?"
      ],
      [
        "Say that it is three o’clock.",
        "Sekarang pukul tiga."
      ],
      [
        "Say that it is half past six.",
        "Sekarang pukul setengah tujuh."
      ],
      [
        "Say that the class begins at nine.",
        "Kelas bermula pada pukul sembilan."
      ],
      [
        "Ask what day it is today.",
        "Hari ini hari apa?"
      ],
      [
        "Say that today is Wednesday.",
        "Hari ini hari Rabu."
      ],
      [
        "Ask when the train departs.",
        "Kereta api bertolak pukul berapa?"
      ],
      [
        "Say that the meeting is tomorrow.",
        "Mesyuarat itu esok."
      ]
    ],
    "dialogues": [
      [
        "A: Pukul berapa sekarang?\nB: ...",
        "Sekarang pukul dua suku."
      ],
      [
        "A: Kelas bermula pukul berapa?\nB: ...",
        "Kelas bermula pada pukul lapan setengah."
      ],
      [
        "A: Hari ini hari apa?\nB: ...",
        "Hari ini hari Isnin."
      ],
      [
        "A: Kita berjumpa bila?\nB: ...",
        "Kita berjumpa esok petang."
      ],
      [
        "A: Berapa orang akan datang?\nB: ...",
        "Lima orang akan datang."
      ],
      [
        "A: Bas bertolak pukul tujuh?\nB: ...",
        "Ya, bas bertolak tepat pada pukul tujuh."
      ]
    ],
    "drills": [
      [
        "Choose the modern Malay word for “seven.”",
        "tujuh"
      ],
      [
        "Choose the modern Malay word for “twenty.”",
        "dua puluh"
      ],
      [
        "Choose the phrase for “quarter past five.”",
        "pukul lima suku"
      ],
      [
        "Choose the phrase for “ten minutes to nine.”",
        "pukul sembilan kurang sepuluh minit"
      ],
      [
        "Choose the best Malay sentence for “It is too early.”",
        "Masih terlalu awal."
      ],
      [
        "Choose the best Malay sentence for “The train is fifteen minutes late.”",
        "Kereta api lewat lima belas minit."
      ],
      [
        "Choose the best Malay sentence for “I arrived yesterday.”",
        "Saya tiba semalam."
      ],
      [
        "Choose the best Malay sentence for “We will leave on Friday.”",
        "Kami akan bertolak pada hari Jumaat."
      ]
    ]
  },
  {
    "level": "A1",
    "title": "Objects and Simple Questions",
    "description": "Identify objects, ask what something is called, describe basic qualities, and form simple positive and negative sentences.",
    "source": "What’s This?; Asking for Things; Fill-in Sentences (printed pages 18-20 and 31-45).",
    "grammar": "apa ini/itu; demonstratives; noun possession; ada and tidak ada; adjective predicates.",
    "outcomes": [
      "Ask and answer what an object is",
      "Describe common qualities",
      "Ask whether something is available"
    ],
    "roleplay": "Identify objects in a room and ask for three items you need.",
    "vocab": [
      [
        "ini",
        "this"
      ],
      [
        "itu",
        "that"
      ],
      [
        "apa",
        "what"
      ],
      [
        "ada",
        "there is / have"
      ],
      [
        "tiada",
        "there is not / none"
      ],
      [
        "besar",
        "big"
      ],
      [
        "kecil",
        "small"
      ],
      [
        "bersih",
        "clean"
      ],
      [
        "kotor",
        "dirty"
      ],
      [
        "nama",
        "name"
      ]
    ],
    "phrases": [
      [
        "Ask what this is.",
        "Apa ini?"
      ],
      [
        "Say that this is a cup.",
        "Ini cawan."
      ],
      [
        "Ask what the object is called in Malay.",
        "Apakah nama benda ini dalam bahasa Melayu?"
      ],
      [
        "Ask whether there is a pen.",
        "Ada pen?"
      ],
      [
        "Say that you do not have a pencil.",
        "Saya tidak ada pensel."
      ],
      [
        "Say that the room is clean.",
        "Bilik ini bersih."
      ],
      [
        "Say that the bag is too big.",
        "Beg itu terlalu besar."
      ],
      [
        "Ask which one is yours.",
        "Yang mana satu kepunyaan awak?"
      ]
    ],
    "dialogues": [
      [
        "A: Apa ini?\nB: ...",
        "Ini sudu."
      ],
      [
        "A: Apakah nama benda ini dalam bahasa Melayu?\nB: ...",
        "Benda ini dipanggil payung."
      ],
      [
        "A: Ada tuala bersih?\nB: ...",
        "Ya, ada satu tuala bersih."
      ],
      [
        "A: Beg yang mana satu kepunyaan awak?\nB: ...",
        "Beg biru itu kepunyaan saya."
      ],
      [
        "A: Bilik ini terlalu panas.\nB: ...",
        "Saya akan buka tingkap."
      ],
      [
        "A: Adakah ini betul?\nB: ...",
        "Ya, ini betul."
      ]
    ],
    "drills": [
      [
        "Choose the best Malay sentence for “That is not mine.”",
        "Itu bukan kepunyaan saya."
      ],
      [
        "Choose the best Malay sentence for “This is very small.”",
        "Ini sangat kecil."
      ],
      [
        "Choose the best Malay sentence for “There is no hot water.”",
        "Tiada air panas."
      ],
      [
        "Choose the best Malay sentence for “Do you have paper?”",
        "Awak ada kertas?"
      ],
      [
        "Choose the best Malay sentence for “The glass is dirty.”",
        "Gelas itu kotor."
      ],
      [
        "Choose the best Malay sentence for “Which one is better?”",
        "Yang mana satu lebih baik?"
      ],
      [
        "Choose the best Malay sentence for “This is not expensive.”",
        "Ini tidak mahal."
      ],
      [
        "Choose the best Malay sentence for “That place is far.”",
        "Tempat itu jauh."
      ]
    ]
  },
  {
    "level": "A2",
    "title": "Food, Drink and Ordering",
    "description": "Ask for food and drink, order a meal, describe taste, request changes, and explain simple dietary needs.",
    "source": "Asking for Things; food and drink vocabulary; buying examples (printed pages 19-21 and 31-37).",
    "grammar": "mahu/hendak; classifiers secawan, segelas, sepinggan; jangan; kurang and lebih.",
    "outcomes": [
      "Order common food and drinks",
      "Use quantity expressions",
      "Make polite changes to an order"
    ],
    "roleplay": "Order a meal at a Malaysian food stall, change one item, and ask for the bill.",
    "vocab": [
      [
        "nasi",
        "rice"
      ],
      [
        "ikan",
        "fish"
      ],
      [
        "ayam",
        "chicken"
      ],
      [
        "sayur",
        "vegetables"
      ],
      [
        "buah",
        "fruit"
      ],
      [
        "air kosong",
        "plain water"
      ],
      [
        "kopi",
        "coffee"
      ],
      [
        "teh",
        "tea"
      ],
      [
        "lapar",
        "hungry"
      ],
      [
        "dahaga",
        "thirsty"
      ]
    ],
    "phrases": [
      [
        "Order rice and fish.",
        "Saya mahu nasi dan ikan."
      ],
      [
        "Ask for one glass of water.",
        "Boleh beri saya segelas air kosong?"
      ],
      [
        "Order a cup of coffee.",
        "Saya mahu secawan kopi."
      ],
      [
        "Ask for less sugar.",
        "Tolong kurangkan gula."
      ],
      [
        "Ask for the food not to be spicy.",
        "Tolong jangan pedas."
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
        "Ask for the bill.",
        "Boleh saya minta bil?"
      ]
    ],
    "dialogues": [
      [
        "Pelayan: Mahu pesan apa?\nPelanggan: ...",
        "Saya mahu nasi ayam dan air kosong."
      ],
      [
        "Pelayan: Mahu pedas?\nPelanggan: ...",
        "Sedikit pedas sahaja."
      ],
      [
        "Pelanggan: Ada makanan tanpa daging?\nPelayan: ...",
        "Ya, ada nasi goreng sayur."
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
        "Pelanggan: Berapa jumlah semuanya?\nPelayan: ...",
        "Jumlahnya dua puluh ringgit."
      ]
    ],
    "drills": [
      [
        "Choose the phrase for “a plate of rice.”",
        "sepinggan nasi"
      ],
      [
        "Choose the phrase for “a spoon.”",
        "sebatang sudu"
      ],
      [
        "Choose the best Malay sentence for “The soup is too salty.”",
        "Sup ini terlalu masin."
      ],
      [
        "Choose the best Malay sentence for “The food is delicious.”",
        "Makanan ini sedap."
      ],
      [
        "Choose the best Malay sentence for “I am allergic to peanuts.”",
        "Saya alah kepada kacang tanah."
      ],
      [
        "Choose the best Malay sentence for “Please bring two forks.”",
        "Tolong bawakan dua garpu."
      ],
      [
        "Choose the best Malay sentence for “I want boiled water.”",
        "Saya mahu air masak."
      ],
      [
        "Choose the best Malay sentence for “Do you have milk?”",
        "Ada susu?"
      ]
    ]
  },
  {
    "level": "A2",
    "title": "Shopping, Prices and Money",
    "description": "Ask prices, compare products, request sizes or quantities, negotiate politely, pay, and ask for a receipt.",
    "source": "Buying Things; Money; Fill-in Sentences and shopping vocabulary (printed pages 21-22 and 31-36).",
    "grammar": "berapa; harganya; lebih + adjective; terlalu; payment with tunai/kad; classifiers.",
    "outcomes": [
      "Ask and understand prices",
      "Compare size and quality",
      "Complete a simple purchase"
    ],
    "roleplay": "Buy clothing and personal supplies at a market using cash or card.",
    "vocab": [
      [
        "harga",
        "price"
      ],
      [
        "ringgit",
        "Malaysian ringgit"
      ],
      [
        "sen",
        "sen"
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
        "saiz",
        "size"
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
        "baki",
        "change / balance"
      ]
    ],
    "phrases": [
      [
        "Ask how much an item costs.",
        "Berapa harganya?"
      ],
      [
        "Say that the item is too expensive.",
        "Barang ini terlalu mahal."
      ],
      [
        "Ask whether there is a cheaper one.",
        "Ada yang lebih murah?"
      ],
      [
        "Ask for a larger size.",
        "Ada saiz yang lebih besar?"
      ],
      [
        "Ask for two of the items.",
        "Saya mahu dua unit."
      ],
      [
        "Politely ask for a small discount.",
        "Boleh kurang sedikit?"
      ],
      [
        "Say that you will pay by card.",
        "Saya akan bayar dengan kad."
      ],
      [
        "Ask for a receipt.",
        "Boleh saya dapatkan resit?"
      ]
    ],
    "dialogues": [
      [
        "Pelanggan: Berapa harga baju ini?\nPenjual: ...",
        "Harganya tiga puluh lima ringgit."
      ],
      [
        "Pelanggan: Ada saiz yang lebih kecil?\nPenjual: ...",
        "Ya, saya akan carikan."
      ],
      [
        "Penjual: Mahu warna apa?\nPelanggan: ...",
        "Saya mahu warna biru."
      ],
      [
        "Penjual: Bayar tunai atau kad?\nPelanggan: ...",
        "Saya bayar dengan kad."
      ],
      [
        "Pelanggan: Ini lima puluh ringgit.\nPenjual: ...",
        "Terima kasih. Bakinya lima ringgit."
      ],
      [
        "Pelanggan: Boleh saya dapatkan resit?\nPenjual: ...",
        "Boleh, ini resit anda."
      ]
    ],
    "drills": [
      [
        "Choose the best Malay sentence for “How much is one kilogram?”",
        "Berapa harga sekilogram?"
      ],
      [
        "Choose the best Malay sentence for “I only have cash.”",
        "Saya hanya ada wang tunai."
      ],
      [
        "Choose the phrase for “three ringgit fifty sen.”",
        "tiga ringgit lima puluh sen"
      ],
      [
        "Choose the best Malay sentence for “This one is better.”",
        "Yang ini lebih baik."
      ],
      [
        "Choose the best Malay sentence for “I do not need a bag.”",
        "Saya tidak perlukan beg."
      ],
      [
        "Choose the best Malay sentence for “May I try this on?”",
        "Boleh saya cuba yang ini?"
      ],
      [
        "Choose the best Malay sentence for “The price is reasonable.”",
        "Harganya berpatutan."
      ],
      [
        "Choose the best Malay sentence for “I am just looking.”",
        "Saya tengok-tengok sahaja."
      ]
    ]
  },
  {
    "level": "A2",
    "title": "Places, Distance and Directions",
    "description": "Ask where places are, understand distance, follow landmarks, and give clear walking directions.",
    "source": "Location; Directions; distance and place frames (printed pages 13-14, 29 and 39-41).",
    "grammar": "di mana; ke mana; dari sini; dekat/jauh; imperatives belok, jalan, terus.",
    "outcomes": [
      "Ask for common places",
      "Follow left/right/straight directions",
      "Describe distance and landmarks"
    ],
    "roleplay": "Ask for directions from a market to a clinic and repeat the route back.",
    "vocab": [
      [
        "di mana",
        "where"
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
        "straight"
      ],
      [
        "dekat",
        "near"
      ],
      [
        "jauh",
        "far"
      ],
      [
        "simpang",
        "junction"
      ],
      [
        "jambatan",
        "bridge"
      ],
      [
        "pasar",
        "market"
      ],
      [
        "jalan",
        "road / walk"
      ]
    ],
    "phrases": [
      [
        "Ask where the market is.",
        "Di mana pasar?"
      ],
      [
        "Ask how far the town is.",
        "Berapa jauh bandar dari sini?"
      ],
      [
        "Ask whether the clinic is near.",
        "Adakah klinik itu dekat?"
      ],
      [
        "Tell someone to go straight.",
        "Jalan terus."
      ],
      [
        "Tell someone to turn left.",
        "Belok kiri."
      ],
      [
        "Tell someone to turn right at the junction.",
        "Belok kanan di simpang."
      ],
      [
        "Say that the building is beside the bank.",
        "Bangunan itu di sebelah bank."
      ],
      [
        "Ask someone to show the place on a map.",
        "Boleh tunjukkan tempat itu pada peta?"
      ]
    ],
    "dialogues": [
      [
        "A: Tumpang tanya, di mana pasar?\nB: ...",
        "Jalan terus dan belok kiri di simpang."
      ],
      [
        "A: Adakah hospital itu jauh?\nB: ...",
        "Tidak, hospital itu berdekatan."
      ],
      [
        "A: Selepas jambatan, saya perlu ke mana?\nB: ...",
        "Belok kanan selepas jambatan."
      ],
      [
        "A: Boleh tunjukkan jalan pada peta?\nB: ...",
        "Boleh, kita berada di sini."
      ],
      [
        "A: Saya rasa saya tersesat.\nB: ...",
        "Jangan risau. Saya akan bantu."
      ],
      [
        "A: Berapa lama kalau berjalan kaki?\nB: ...",
        "Lebih kurang sepuluh minit."
      ]
    ],
    "drills": [
      [
        "Choose the correct modern spelling for the old form “djembatan.”",
        "jambatan"
      ],
      [
        "Choose the correct modern spelling for the old form “djalan.”",
        "jalan"
      ],
      [
        "Choose the best Malay sentence for “The post office is across the road.”",
        "Pejabat pos berada di seberang jalan."
      ],
      [
        "Choose the best Malay sentence for “The school is behind the mosque.”",
        "Sekolah itu di belakang masjid."
      ],
      [
        "Choose the best Malay sentence for “It is not far from here.”",
        "Tempat itu tidak jauh dari sini."
      ],
      [
        "Choose the phrase for “at the traffic light.”",
        "di lampu isyarat"
      ],
      [
        "Choose the best Malay sentence for “Take the second exit.”",
        "Ambil jalan keluar yang kedua."
      ],
      [
        "Choose the best Malay sentence for “Could you take me there?”",
        "Boleh bawa saya ke sana?"
      ]
    ]
  },
  {
    "level": "A2",
    "title": "Transport, Accommodation and Public Signs",
    "description": "Use public transport, ask departure times, check into a room, and understand common signs in modern Malaysia.",
    "source": "Time and travel expressions; place vocabulary; Important Signs (printed pages 23-25, 39-47).",
    "grammar": "akan and belum; departure/arrival verbs; location phrases; prohibitions with dilarang.",
    "outcomes": [
      "Buy and confirm transport details",
      "Handle simple accommodation needs",
      "Recognise important public signs"
    ],
    "roleplay": "Travel by train, check into a hotel, and report one room problem.",
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
        "stesen",
        "station"
      ],
      [
        "tiket",
        "ticket"
      ],
      [
        "bertolak",
        "depart"
      ],
      [
        "tiba",
        "arrive"
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
        "masuk",
        "entrance / enter"
      ],
      [
        "keluar",
        "exit / leave"
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
        "Say that the bus has not arrived yet.",
        "Bas belum tiba."
      ],
      [
        "Say that you have a hotel reservation.",
        "Saya ada tempahan hotel."
      ],
      [
        "Ask to check in.",
        "Boleh saya daftar masuk?"
      ],
      [
        "Report that there is no hot water.",
        "Tiada air panas di bilik saya."
      ],
      [
        "Ask where the exit is.",
        "Di mana jalan keluar?"
      ]
    ],
    "dialogues": [
      [
        "Penumpang: Saya mahu satu tiket ke Ipoh.\nPetugas: ...",
        "Perjalanan sehala atau pergi balik?"
      ],
      [
        "Penumpang: Kereta api bertolak pukul berapa?\nPetugas: ...",
        "Kereta api bertolak pada pukul sembilan."
      ],
      [
        "Tetamu: Saya ada tempahan atas nama Aung.\nPenyambut tetamu: ...",
        "Baik, boleh saya lihat pasport anda?"
      ],
      [
        "Tetamu: Tiada tuala di bilik saya.\nPenyambut tetamu: ...",
        "Kami akan menghantar tuala sekarang."
      ],
      [
        "A: Apakah maksud tanda “Dilarang masuk”?\nB: ...",
        "Kita tidak boleh masuk."
      ],
      [
        "A: Di mana perhentian bas?\nB: ...",
        "Perhentian bas berada di hadapan hotel."
      ]
    ],
    "drills": [
      [
        "Choose the modern sign for “STOP.”",
        "BERHENTI"
      ],
      [
        "Choose the modern sign for “NO SMOKING.”",
        "DILARANG MEROKOK"
      ],
      [
        "Choose the modern sign for “OPEN.”",
        "BUKA"
      ],
      [
        "Choose the modern sign for “CLOSED.”",
        "TUTUP"
      ],
      [
        "Choose the modern sign for “ONE WAY.”",
        "SEHALA"
      ],
      [
        "Choose the modern sign for “DEAD END.”",
        "JALAN BUNTU"
      ],
      [
        "Choose the best Malay sentence for “The train has been delayed.”",
        "Kereta api telah ditangguhkan."
      ],
      [
        "Choose the best Malay sentence for “Please wake me at six.”",
        "Tolong kejutkan saya pada pukul enam."
      ]
    ]
  },
  {
    "level": "B1",
    "title": "Personal Needs and Everyday Services",
    "description": "Ask for personal items, find services, arrange repairs, and explain practical needs at home or while travelling.",
    "source": "Fill-in Sentences: personal items, clothing, services and places (printed pages 31-41).",
    "grammar": "perlukan; di mana saya boleh; ada/tidak ada; passive and service requests with boleh dibaiki.",
    "outcomes": [
      "Request essential personal items",
      "Locate useful services",
      "Explain a repair or service problem"
    ],
    "roleplay": "Find a pharmacy, laundry, and repair shop while explaining what you need at each place.",
    "vocab": [
      [
        "tuala",
        "towel"
      ],
      [
        "bantal",
        "pillow"
      ],
      [
        "selimut",
        "blanket"
      ],
      [
        "berus gigi",
        "toothbrush"
      ],
      [
        "ubat gigi",
        "toothpaste"
      ],
      [
        "farmasi",
        "pharmacy"
      ],
      [
        "dobi",
        "laundry"
      ],
      [
        "bengkel",
        "workshop / garage"
      ],
      [
        "kedai gunting rambut",
        "barbershop / salon"
      ],
      [
        "pejabat pos",
        "post office"
      ]
    ],
    "phrases": [
      [
        "Say that you need a clean towel.",
        "Saya perlukan tuala yang bersih."
      ],
      [
        "Ask whether there is an extra blanket.",
        "Ada selimut tambahan?"
      ],
      [
        "Ask where you can buy toothpaste.",
        "Di mana saya boleh membeli ubat gigi?"
      ],
      [
        "Ask where the nearest pharmacy is.",
        "Di mana farmasi yang terdekat?"
      ],
      [
        "Ask whether the shirt can be washed today.",
        "Boleh baju ini dicuci hari ini?"
      ],
      [
        "Say that your shoe is damaged.",
        "Kasut saya rosak."
      ],
      [
        "Ask for a haircut.",
        "Saya mahu potong rambut."
      ],
      [
        "Ask where you can repair a bicycle.",
        "Di mana saya boleh membaiki basikal?"
      ]
    ],
    "dialogues": [
      [
        "Tetamu: Ada bantal tambahan?\nPekerja: ...",
        "Ya, kami akan hantarkan satu."
      ],
      [
        "Pelanggan: Bila pakaian ini siap dicuci?\nPekerja dobi: ...",
        "Pakaian ini siap petang esok."
      ],
      [
        "Pelanggan: Basikal saya rosak.\nMekanik: ...",
        "Apakah masalahnya?"
      ],
      [
        "Pelanggan: Saya mahu potong rambut pendek.\nPendandan rambut: ...",
        "Baik, pendek di bahagian tepi juga?"
      ],
      [
        "A: Di mana pejabat pos?\nB: ...",
        "Pejabat pos berada di sebelah bank."
      ],
      [
        "Pelanggan: Ada ubat gigi saiz kecil?\nPekerja: ...",
        "Ya, ada di rak sebelah kanan."
      ]
    ],
    "drills": [
      [
        "Choose the best Malay sentence for “Please bring me a pillow.”",
        "Tolong bawakan saya sebuah bantal."
      ],
      [
        "Choose the best Malay sentence for “I do not have an umbrella.”",
        "Saya tidak mempunyai payung."
      ],
      [
        "Choose the best Malay sentence for “Where can I get clean water?”",
        "Di mana saya boleh mendapatkan air bersih?"
      ],
      [
        "Choose the best Malay sentence for “Is there a mechanic nearby?”",
        "Ada mekanik berdekatan?"
      ],
      [
        "Choose the best Malay sentence for “This needs to be repaired.”",
        "Benda ini perlu dibaiki."
      ],
      [
        "Choose the best Malay sentence for “How long will it take?”",
        "Berapa lama masa yang diperlukan?"
      ],
      [
        "Choose the best Malay sentence for “I will come back tomorrow.”",
        "Saya akan datang semula esok."
      ],
      [
        "Choose the best Malay sentence for “Please write the address here.”",
        "Tolong tulis alamat di sini."
      ]
    ]
  },
  {
    "level": "B1",
    "title": "Health, Safety and Emergencies",
    "description": "Describe symptoms, ask for medical help, communicate allergies, and respond to common safety situations.",
    "source": "Additional Expressions and health/service frames (printed pages 27-30 and 36-45). Military-specific commands were removed.",
    "grammar": "sakit + body part; sejak/selama; perlu; imperative safety language; jangan and dilarang.",
    "outcomes": [
      "Describe basic symptoms",
      "Request urgent help",
      "Understand essential safety instructions"
    ],
    "roleplay": "Explain symptoms at a clinic and respond to a simple emergency outside.",
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
        "ambulans",
        "ambulance"
      ],
      [
        "bahaya",
        "danger"
      ],
      [
        "awas",
        "watch out / caution"
      ],
      [
        "bantuan",
        "help"
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
        "Say that you feel dizzy.",
        "Saya berasa pening."
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
        "Say that you need a doctor.",
        "Saya perlu berjumpa doktor."
      ],
      [
        "Ask someone to call an ambulance.",
        "Tolong panggil ambulans."
      ],
      [
        "Warn someone to be careful.",
        "Awas! Hati-hati!"
      ]
    ],
    "dialogues": [
      [
        "Doktor: Apa masalah anda?\nPesakit: ...",
        "Saya sakit perut sejak pagi tadi."
      ],
      [
        "Doktor: Ada alahan terhadap ubat?\nPesakit: ...",
        "Ya, saya alah kepada penisilin."
      ],
      [
        "Ahli farmasi: Ubat ini perlu diambil selepas makan.\nPelanggan: ...",
        "Baik, berapa kali sehari?"
      ],
      [
        "A: Kawan saya pengsan.\nB: ...",
        "Saya akan panggil ambulans."
      ],
      [
        "A: Awas, lantai basah!\nB: ...",
        "Terima kasih kerana memberitahu saya."
      ],
      [
        "Pesakit: Saya rasa lebih baik hari ini.\nDoktor: ...",
        "Bagus. Teruskan berehat."
      ]
    ],
    "drills": [
      [
        "Choose the best Malay sentence for “My arm hurts.”",
        "Lengan saya sakit."
      ],
      [
        "Choose the best Malay sentence for “I have been coughing for three days.”",
        "Saya batuk selama tiga hari."
      ],
      [
        "Choose the best Malay sentence for “I am lost and need help.”",
        "Saya sesat dan perlukan bantuan."
      ],
      [
        "Choose the best Malay sentence for “Do not touch that.”",
        "Jangan sentuh benda itu."
      ],
      [
        "Choose the best Malay sentence for “This area is dangerous.”",
        "Kawasan ini berbahaya."
      ],
      [
        "Choose the best Malay sentence for “Take this medicine twice a day.”",
        "Ambil ubat ini dua kali sehari."
      ],
      [
        "Choose the best Malay sentence for “I cannot breathe well.”",
        "Saya sukar bernafas."
      ],
      [
        "Choose the best Malay sentence for “Please contact my family.”",
        "Tolong hubungi keluarga saya."
      ]
    ]
  },
  {
    "level": "B1",
    "title": "Reusable Sentence Frames",
    "description": "Combine high-frequency frames with new nouns, verbs, places, and adjectives to create many useful sentences.",
    "source": "Fill-in Sentences (printed pages 31-45), reworked as productive modern-Malay sentence patterns.",
    "grammar": "mahu/perlu; boleh; ada; di mana; adjective predicates; negation; question formation.",
    "outcomes": [
      "Produce new sentences from flexible frames",
      "Ask for missing information",
      "Repair communication when vocabulary is limited"
    ],
    "roleplay": "Solve five unseen daily problems by adapting sentence frames without reading a script.",
    "vocab": [
      [
        "mahu",
        "want"
      ],
      [
        "perlu",
        "need"
      ],
      [
        "boleh",
        "can / may"
      ],
      [
        "mendapatkan",
        "obtain / get"
      ],
      [
        "membawa",
        "bring / carry"
      ],
      [
        "memberi",
        "give"
      ],
      [
        "mencari",
        "look for"
      ],
      [
        "mempunyai",
        "have / possess"
      ],
      [
        "terlalu",
        "too / excessively"
      ],
      [
        "barangkali",
        "perhaps"
      ]
    ],
    "phrases": [
      [
        "Use the frame “I want ...” with a ticket.",
        "Saya mahu satu tiket."
      ],
      [
        "Use the frame “I need ...” with help.",
        "Saya perlukan bantuan."
      ],
      [
        "Use the frame “Where can I get ...?” with drinking water.",
        "Di mana saya boleh mendapatkan air minuman?"
      ],
      [
        "Use the frame “Do you have ...?” with a map.",
        "Awak ada peta?"
      ],
      [
        "Use the frame “Please bring me ...” with a chair.",
        "Tolong bawakan saya sebuah kerusi."
      ],
      [
        "Use the frame “This is too ...” with hot.",
        "Ini terlalu panas."
      ],
      [
        "Use the frame “I do not have ...” with cash.",
        "Saya tidak mempunyai wang tunai."
      ],
      [
        "Use the frame “Is there ... nearby?” with a bank.",
        "Ada bank berdekatan?"
      ]
    ],
    "dialogues": [
      [
        "A: Awak perlukan apa?\nB: ...",
        "Saya perlukan pengecas telefon."
      ],
      [
        "A: Di mana saya boleh mendapatkan peta?\nB: ...",
        "Peta boleh didapati di kaunter maklumat."
      ],
      [
        "A: Ada kedai makan berdekatan?\nB: ...",
        "Ya, ada satu di hujung jalan."
      ],
      [
        "A: Boleh tolong bawakan kerusi?\nB: ...",
        "Boleh, tunggu sebentar."
      ],
      [
        "A: Bilik ini terlalu bising.\nB: ...",
        "Kami boleh pindahkan anda ke bilik lain."
      ],
      [
        "A: Barangkali saya tersalah jalan.\nB: ...",
        "Mari kita periksa peta."
      ]
    ],
    "drills": [
      [
        "Complete the frame: “Saya mahu ___.”",
        "Saya mahu membeli tiket."
      ],
      [
        "Complete the frame: “Saya perlu ___.”",
        "Saya perlu menghubungi keluarga saya."
      ],
      [
        "Complete the frame: “Di mana saya boleh ___?”",
        "Di mana saya boleh menukar wang?"
      ],
      [
        "Complete the frame: “Ada ___?”",
        "Ada tandas berdekatan?"
      ],
      [
        "Complete the frame: “Boleh tolong ___?”",
        "Boleh tolong tuliskan alamat itu?"
      ],
      [
        "Complete the frame: “Ini terlalu ___.”",
        "Ini terlalu mahal."
      ],
      [
        "Complete the frame: “Saya tidak ___.”",
        "Saya tidak memahami arahan itu."
      ],
      [
        "Complete the frame: “Berapa lama ___?”",
        "Berapa lama perjalanan ini?"
      ]
    ]
  },
  {
    "level": "B2",
    "title": "Extended Scenarios and Malay Then and Now",
    "description": "Manage longer real-life conversations and recognise how the source guide’s 1943 spelling, register, and context differ from current Malaysian Malay.",
    "source": "Important Signs and Alphabetical Word List (printed pages 46-79), plus examples throughout the guide.",
    "grammar": "register choice; discourse sequencing; explanation and clarification; old-to-modern spelling recognition.",
    "outcomes": [
      "Sustain multi-step service conversations",
      "Explain and resolve misunderstandings",
      "Recognise common historical spellings without using them as modern standards"
    ],
    "roleplay": "Complete an integrated travel day and explain three old-to-modern language changes.",
    "vocab": [
      [
        "dahulu",
        "formerly / in the past"
      ],
      [
        "sekarang",
        "now"
      ],
      [
        "ejaan",
        "spelling"
      ],
      [
        "baku",
        "standard"
      ],
      [
        "ragam bahasa",
        "language register"
      ],
      [
        "rasmi",
        "formal / official"
      ],
      [
        "santai",
        "casual"
      ],
      [
        "konteks",
        "context"
      ],
      [
        "menjelaskan",
        "explain"
      ],
      [
        "menyesuaikan",
        "adapt"
      ]
    ],
    "phrases": [
      [
        "Explain that the source uses old spelling.",
        "Sumber itu menggunakan sistem ejaan lama."
      ],
      [
        "Say that the course uses current Malaysian Malay.",
        "Kursus ini menggunakan bahasa Melayu Malaysia semasa."
      ],
      [
        "Explain that “saja” in the source is now written “saya.”",
        "Dalam sumber lama, “saja” digunakan untuk ejaan moden “saya”."
      ],
      [
        "Explain that “djalan” is now “jalan.”",
        "Ejaan lama “djalan” kini ditulis “jalan”."
      ],
      [
        "Politely clarify a misunderstanding.",
        "Maaf, maksud saya bukan begitu."
      ],
      [
        "Ask someone to explain the context.",
        "Boleh jelaskan konteksnya?"
      ],
      [
        "Say that a casual form is unsuitable for a formal letter.",
        "Bentuk santai itu tidak sesuai untuk surat rasmi."
      ],
      [
        "Summarise the practical value of the old guide.",
        "Panduan lama itu berguna sebagai rekod sejarah dan sumber tema komunikasi harian."
      ]
    ],
    "dialogues": [
      [
        "A: Mengapa ejaan dalam sumber itu berbeza?\nB: ...",
        "Sumber itu diterbitkan pada tahun 1943 dan menggunakan ejaan lama."
      ],
      [
        "A: Adakah semua frasa lama masih sesuai digunakan?\nB: ...",
        "Tidak. Kita perlu menilai ejaan, makna, konteks, dan kesopanan."
      ],
      [
        "Tetamu: Tempahan saya tidak ditemui.\nPenyambut tetamu: ...",
        "Boleh saya semak nombor pengesahan anda?"
      ],
      [
        "Pelanggan: Harga pada resit tidak sama dengan harga di rak.\nPekerja: ...",
        "Maaf, saya akan semak dan betulkan jika perlu."
      ],
      [
        "Pesakit: Saya tidak pasti cara mengambil ubat ini.\nAhli farmasi: ...",
        "Saya akan jelaskan arahan itu langkah demi langkah."
      ],
      [
        "Penumpang: Saya terlepas kereta api kerana platform berubah.\nPetugas: ...",
        "Kami boleh menukar tiket anda ke perjalanan seterusnya."
      ]
    ],
    "drills": [
      [
        "Choose the modern spelling of “Saja maoe.”",
        "Saya mahu."
      ],
      [
        "Choose the modern spelling of “Poekoel berapa sekarang?”",
        "Pukul berapa sekarang?"
      ],
      [
        "Choose the modern spelling of “Dimana roemah sakit?”",
        "Di mana hospital?"
      ],
      [
        "Choose the modern sign replacing “DILARANG MINOEM ROKOK.”",
        "DILARANG MEROKOK"
      ],
      [
        "Choose the best Malay sentence for “First I checked the schedule, then I bought the ticket.”",
        "Mula-mula saya menyemak jadual, kemudian saya membeli tiket."
      ],
      [
        "Choose the best Malay sentence for “Although the phrase is understandable, it sounds old-fashioned.”",
        "Walaupun frasa itu dapat difahami, bunyinya sudah ketinggalan zaman."
      ],
      [
        "Choose the best Malay sentence for “We should adapt the material without losing its practical purpose.”",
        "Kita patut menyesuaikan bahan itu tanpa menghilangkan tujuan praktikalnya."
      ],
      [
        "Choose the best Malay sentence for “In conclusion, context determines the most appropriate expression.”",
        "Kesimpulannya, konteks menentukan ungkapan yang paling sesuai."
      ]
    ]
  }
];
const sourceUrl = "https://www.govinfo.gov/content/pkg/GOVPUB-W-96478719d96146672c586f0d55523121/pdf/GOVPUB-W-96478719d96146672c586f0d55523121.pdf";

function rotateOptions(items, index, vocab = false) {
  const picks = [index];
  for (let step = 1; picks.length < 3; step += 1) {
    const candidate = (index + step) % items.length;
    if (!picks.includes(candidate)) picks.push(candidate);
  }
  const options = picks.map((itemIndex) => {
    const item = items[itemIndex];
    const text = vocab ? item[0] : item[1];
    return { text, correct: itemIndex === index, emoji: (vocab ? item[2] : null) ?? null, audioText: text };
  });
  const shift = index % 3;
  return [...options.slice(shift), ...options.slice(0, shift)];
}

// Pairs up to 4 of a unit's own vocab entries (Malay word <-> English
// meaning) into one MATCHING challenge (2 tiles per pair, positionally
// paired -- see matchingChallengeIsCorrect in shared/languageQuest.ts).
function vocabMatchingChallenge(vocab) {
  const pairs = vocab.slice(0, 4);
  const options = [];
  for (const entry of pairs) {
    options.push({ text: entry[0], correct: true, emoji: entry[2] ?? null, audioText: entry[0] });
    options.push({ text: entry[1], correct: true, emoji: null, audioText: entry[1] });
  }
  return {
    type: "MATCHING",
    question: "Match each modern Malay word or phrase to its English meaning.",
    options,
  };
}

const SPEAKING_QUESTION_FRAMING = {
  SELECT: "Choose the best modern Malay response, then say it aloud.",
  ASSIST: "Choose the best modern Malay response, then say it aloud.",
  CLOZE: "Complete the exchange with the correct modern Malay wording, then say it aloud.",
  GRAMMAR_TRANSFORM: "Choose the grammatically correct modern Malay sentence, then say it aloud.",
};

function speakingChallenges(items, label, typeCycle = ["SELECT", "ASSIST"]) {
  return items.map((entry, index) => {
    const type = typeCycle[index % typeCycle.length];
    return {
      type,
      question: `${label}\n${entry[0]}\n${SPEAKING_QUESTION_FRAMING[type]}`,
      options: rotateOptions(items, index, false),
    };
  });
}

// Rebuilds one of this unit's own real drill sentences, word by word --
// always available since every unit has at least one multi-word drill
// answer sentence (see sourceUnits above).
function unitReorderChallenge(unit) {
  let best = null;
  for (const [, answer] of unit.drills) {
    const tokens = tokenizeWords(answer);
    if (tokens && (!best || tokens.length > best.tokens.length)) best = { answer, tokens };
  }
  if (!best) return null;
  return {
    type: "REORDER",
    question: `Put this modern Malay sentence back in the correct order.`,
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
    "Which modern Malay word or phrase does not belong with the others?",
    inGroup,
    oddWord,
    oddWord ? `“${oddWord}” is from a different unit; the rest of this set is ${inGroup.map((word) => `“${word}”`).join(", ")}.` : undefined,
  );
}

const course = {
  code: "MRLC-MALAY-GOVINFO-GUIDE-V1",
  title: "Modern Spoken Malay: Source-Guided Course",
  description: `A 12-unit speaking course newly written from the practical sequence of the 1943 War Department publication Malay: A Guide to the Spoken Language (TM 30-339). Historical spelling, dated claims, and military material are replaced with current standard Malaysian Malay and civilian daily-life scenarios. Primary source: ${sourceUrl}`,
  language: "Malay",
  category: "Malay Courses",
  imageEmoji: "",
  accentColor: "#b91c1c",
  // Imported as an unpublished draft, consistent with the rest of the Malay
  // catalog -- publish from the Language Quest course editor after review.
  published: false,
  units: sourceUnits.map((unit, unitIndex) => ({
    title: `${unit.level} · Unit ${unitIndex + 1}: ${unit.title}`,
    description: `${unit.description} Grammar focus: ${unit.grammar} Source anchor: ${unit.source}`,
    lessons: [
      {
        title: "Vocabulary and Audio",
        description: "Learn ten current Malaysian Malay words or expressions, repeat each answer aloud, and complete an ordering, odd-one-out, and matching review.",
        challenges: [
          ...unit.vocab.map((entry, index) => ({ type: index % 4 === 3 ? "ASSIST" : "SELECT", question: `Which modern Malay word or phrase means “${entry[1]}”? Listen, choose, and say it aloud.`, options: rotateOptions(unit.vocab, index, true) })),
          unitReorderChallenge(unit),
          unitOddOneOutChallenge(unit, unitIndex, sourceUnits),
          vocabMatchingChallenge(unit.vocab),
        ].filter(Boolean),
      },
      { title: "Daily Speaking", description: "Use source-inspired communication goals in modern civilian situations.", challenges: speakingChallenges(unit.phrases, "DAILY SPEAKING") },
      { title: "Scenario Practice", description: "Complete realistic dialogues and practise both roles with a partner.", challenges: speakingChallenges(unit.dialogues, "SCENARIO DIALOGUE") },
      { title: "Sentence and Source Workshop", description: "Build sentences, strengthen grammar, and distinguish current forms from obsolete source spellings where relevant.", challenges: speakingChallenges(unit.drills, "SENTENCE PRACTICE", ["SELECT", "ASSIST", "GRAMMAR_TRANSFORM", "CLOZE"]) },
    ],
  })),
};

const lessons = course.units.flatMap((unit) => unit.lessons);
const allChallenges = lessons.flatMap((lesson) => lesson.challenges);
const matchingChallenges = allChallenges.filter((challenge) => challenge.type === "MATCHING");
const reorderChallenges = allChallenges.filter((challenge) => challenge.type === "REORDER");
const oddOneOutChallenges = allChallenges.filter((challenge) => challenge.type === "ODD_ONE_OUT");
const challenges = allChallenges.filter((challenge) => !["MATCHING", "REORDER", "ODD_ONE_OUT"].includes(challenge.type));
if (course.units.length !== 12 || lessons.length !== 48 || challenges.length !== 384) throw new Error("Unexpected course size");
for (const challenge of challenges) {
  if (challenge.options.length !== 3) throw new Error("Every challenge needs three options");
  if (challenge.options.filter((option) => option.correct).length !== 1) throw new Error("Every challenge needs one correct option");
  if (challenge.options.some((option) => !option.text || option.audioText !== option.text)) throw new Error("Every option needs matching audio text");
}
{
  const typeCounts = new Map();
  for (const challenge of challenges) typeCounts.set(challenge.type, (typeCounts.get(challenge.type) || 0) + 1);
  for (const requiredType of ["SELECT", "ASSIST", "CLOZE", "GRAMMAR_TRANSFORM"]) {
    if (!typeCounts.get(requiredType)) throw new Error(`Generated Malay guide course is missing ${requiredType} challenges`);
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
await writeFile(outputPath, `${JSON.stringify(course, null, 2)}\n`, "utf8");
console.log(`Generated source-guided Malay course with ${course.units.length} units, ${lessons.length} lessons, and ${challenges.length} challenges`);
