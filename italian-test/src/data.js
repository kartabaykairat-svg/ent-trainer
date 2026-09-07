/* Italian level test — data & i18n strings.
 * Loaded as a classic (non-module) script so the app also works when
 * opened directly from disk (file://), without needing a local server.
 */

/* ---------- UI strings (interface language: ru / en) ---------- */
const STRINGS = {
  ru: {
    appTitle: "Тест на уровень итальянского языка",
    appSubtitle: "A1 · A2 · B1 · B2",
    startDescription:
      "Тест займёт 5–7 минут и поможет определить ваш текущий уровень владения итальянским языком — от A1 до B2. " +
      "Вопросы идут от простого к сложному. Если тест увидит, что вопросы вам пока не по силам, он остановится раньше времени " +
      "и покажет уже достигнутый уровень — отвечать на всё подряд не придётся.",
    startBullets: [
      "40 вопросов, максимум 5–7 минут",
      "Грамматика, лексика, чтение и спряжение глаголов",
      "Адаптивная остановка при 3 ошибках подряд",
      "Результат с рекомендациями для дальнейшего изучения",
    ],
    startButton: "Начать тест",
    interfaceLanguageLabel: "Язык интерфейса",
    levelLabel: "Уровень",
    questionOfLabel: (cur, total) => `Вопрос ${cur} из ${total}`,
    typeLabels: {
      choice: "Выберите правильный вариант",
      fill: "Заполните пропуск, выбрав подходящий вариант",
      reading: "Прочитайте текст и ответьте на вопрос",
      match: "Подберите перевод к каждому слову",
      conjugate: "Выберите правильную форму глагола",
    },
    selectPlaceholder: "Выберите…",
    checkButton: "Проверить",
    nextButton: "Дальше",
    finishButton: "Завершить и посмотреть результат",
    correctFeedback: "Верно!",
    incorrectFeedback: "Неверно.",
    correctAnswerWas: "Правильный ответ:",
    stoppedNotice:
      "Тест остановлен: несколько ошибок подряд показывают, что этот уровень пока сложноват. Засчитан предыдущий уровень.",
    resultTitle: "Результат теста",
    resultLevelPrefix: "Ваш уровень:",
    belowA1: "Ниже A1",
    breakdownTitle: "Результаты по уровням",
    breakdownRow: (correct, total) => `${correct} из ${total} правильно`,
    notReached: "не пройдено",
    recommendationsTitle: "Рекомендации",
    restartButton: "Пройти тест заново",
    changeLangDuringTest: "Язык",
  },
  en: {
    appTitle: "Italian Language Level Test",
    appSubtitle: "A1 · A2 · B1 · B2",
    startDescription:
      "This test takes about 5–7 minutes and will determine your current Italian level — from A1 to B2. " +
      "Questions go from easy to difficult. If the test detects that questions are currently beyond your level, " +
      "it will stop early and show the level you've already reached — no need to struggle through everything.",
    startBullets: [
      "40 questions, 5–7 minutes",
      "Grammar, vocabulary, reading and verb conjugation",
      "Adaptive stop after 3 mistakes in a row",
      "Result with recommendations for further study",
    ],
    startButton: "Start the test",
    interfaceLanguageLabel: "Interface language",
    levelLabel: "Level",
    questionOfLabel: (cur, total) => `Question ${cur} of ${total}`,
    typeLabels: {
      choice: "Choose the correct option",
      fill: "Fill in the blank with the correct option",
      reading: "Read the text and answer the question",
      match: "Match each word with its translation",
      conjugate: "Choose the correct verb form",
    },
    selectPlaceholder: "Choose…",
    checkButton: "Check",
    nextButton: "Next",
    finishButton: "Finish and see result",
    correctFeedback: "Correct!",
    incorrectFeedback: "Not quite.",
    correctAnswerWas: "Correct answer:",
    stoppedNotice:
      "Test stopped: several mistakes in a row show this level is currently too hard. Your previous level was recorded.",
    resultTitle: "Test result",
    resultLevelPrefix: "Your level:",
    belowA1: "Below A1",
    breakdownTitle: "Results by level",
    breakdownRow: (correct, total) => `${correct} of ${total} correct`,
    notReached: "not reached",
    recommendationsTitle: "Recommendations",
    restartButton: "Retake the test",
    changeLangDuringTest: "Language",
  },
};

/* ---------- Recommendations shown on the result screen ---------- */
const RECOMMENDATIONS = {
  none: {
    ru:
      "Похоже, начальный уровень пока вызывает трудности — и это совершенно нормально в начале пути. " +
      "Рекомендуем начать с базового курса итальянского для начинающих: алфавит и произношение, простые фразы " +
      "приветствия и знакомства, числа, глаголы essere и avere.",
    en:
      "It looks like even the basics are currently tricky — completely normal at the very start. " +
      "We recommend beginning with a course for absolute beginners: alphabet and pronunciation, simple greetings, " +
      "numbers, and the verbs essere and avere.",
  },
  A1: {
    ru:
      "Вы освоили базовые фразы и лексику уровня A1. Следующий шаг — уровень A2: закрепите passato prossimo, " +
      "расширьте словарный запас по повседневным темам (покупки, направления) и потренируйте предлоги.",
    en:
      "You've mastered basic A1 phrases and vocabulary. Next step — level A2: solidify passato prossimo, " +
      "expand everyday vocabulary (shopping, directions), and practice prepositions.",
  },
  A2: {
    ru:
      "Вы уверенно владеете уровнем A2. Для перехода к B1 изучите imperfetto и futuro semplice, начните читать " +
      "несложные тексты и статьи на итальянском и попробуйте условное наклонение (condizionale semplice).",
    en:
      "You have a solid grasp of A2. To move towards B1, study imperfetto and futuro semplice, start reading " +
      "simple Italian texts and articles, and try the conditional mood (condizionale semplice).",
  },
  B1: {
    ru:
      "У вас хороший уровень B1. Чтобы дойти до B2, сосредоточьтесь на congiuntivo, condizionale composto и " +
      "периодах ипотетико (se + congiuntivo/condizionale), а также больше практикуйтесь в чтении сложных текстов.",
    en:
      "You have a good B1 level. To reach B2, focus on the subjunctive (congiuntivo), the compound conditional, " +
      "and hypothetical clauses (se + congiuntivo/condizionale), and practice reading more complex texts.",
  },
  B2: {
    ru:
      "Отличный результат — уровень B2! Вы понимаете сложные грамматические конструкции, страдательный залог " +
      "и косвенную речь. Для роста к C1 рекомендуем практиковать разговорную речь, идиомы и художественную литературу.",
    en:
      "Excellent result — level B2! You understand complex grammar, the passive voice, and reported speech. " +
      "To grow towards C1, practice spoken Italian, idiomatic expressions, and literary texts.",
  },
};

/* ---------- Helpers for option shapes ----------
 * A plain string option is shown as-is (used for grammar answers, which are
 * always in Italian — the language being tested).
 * An object option { ru, en } is a translation and is localized to the
 * current interface language (used for vocabulary / meaning questions).
 */
function optionText(opt, lang) {
  if (typeof opt === "string") return opt;
  return opt[lang] || opt.en || opt.ru || "";
}

/* ---------- The 40 questions: 10 per level, easy → hard ---------- */
const QUESTIONS = [
  // ============================= A1 (1-10) =============================
  {
    id: "q1",
    level: "A1",
    type: "choice",
    topic: { ru: "Приветствия", en: "Greetings" },
    question: "Come si risponde a “Buongiorno”?",
    options: ["Buongiorno!", "Arrivederci", "Per favore", "Grazie mille"],
    answerIndex: 0,
  },
  {
    id: "q2",
    level: "A1",
    type: "match",
    topic: { ru: "Лексика", en: "Vocabulary" },
    pairs: [
      { it: "ciao", ru: "привет", en: "hi" },
      { it: "grazie", ru: "спасибо", en: "thank you" },
      { it: "per favore", ru: "пожалуйста", en: "please" },
      { it: "scusa", ru: "извини", en: "sorry" },
    ],
  },
  {
    id: "q3",
    level: "A1",
    type: "choice",
    topic: { ru: "Числа", en: "Numbers" },
    question: "Quanto fa “sette più tre”?",
    options: ["Dieci", "Nove", "Undici", "Otto"],
    answerIndex: 0,
  },
  {
    id: "q4",
    level: "A1",
    type: "fill",
    topic: { ru: "Глагол essere", en: "Verb essere" },
    question: "Io ___ italiano.",
    options: ["sono", "sei", "è", "siamo"],
    answerIndex: 0,
  },
  {
    id: "q5",
    level: "A1",
    type: "fill",
    topic: { ru: "Глагол avere", en: "Verb avere" },
    question: "Tu ___ un fratello?",
    options: ["ha", "hai", "abbiamo", "hanno"],
    answerIndex: 1,
  },
  {
    id: "q6",
    level: "A1",
    type: "choice",
    topic: { ru: "Семья", en: "Family" },
    question: "Che cosa significa “sorella”?",
    options: [
      { ru: "сестра", en: "sister" },
      { ru: "брат", en: "brother" },
      { ru: "мать", en: "mother" },
      { ru: "дочь", en: "daughter" },
    ],
    answerIndex: 0,
  },
  {
    id: "q7",
    level: "A1",
    type: "match",
    topic: { ru: "Еда", en: "Food" },
    pairs: [
      { it: "pane", ru: "хлеб", en: "bread" },
      { it: "acqua", ru: "вода", en: "water" },
      { it: "mela", ru: "яблоко", en: "apple" },
      { it: "latte", ru: "молоко", en: "milk" },
    ],
  },
  {
    id: "q8",
    level: "A1",
    type: "fill",
    topic: { ru: "Артикли", en: "Articles" },
    question: "___ casa è grande.",
    options: ["La", "Il", "Lo", "I"],
    answerIndex: 0,
  },
  {
    id: "q9",
    level: "A1",
    type: "choice",
    topic: { ru: "Артикли", en: "Articles" },
    question: "Ho ___ amico simpatico.",
    options: ["un", "una", "uno", "dei"],
    answerIndex: 0,
  },
  {
    id: "q10",
    level: "A1",
    type: "conjugate",
    topic: { ru: "Essere / Avere", en: "Essere / Avere" },
    question: "Noi ___ studenti.",
    options: ["siamo", "sono", "è", "sei"],
    answerIndex: 0,
  },

  // ============================= A2 (11-20) =============================
  {
    id: "q11",
    level: "A2",
    type: "fill",
    topic: { ru: "Passato prossimo", en: "Passato prossimo" },
    question: "Ieri io ___ un film.",
    options: ["ho guardato", "ho guardati", "sono guardato", "guardavo"],
    answerIndex: 0,
  },
  {
    id: "q12",
    level: "A2",
    type: "fill",
    topic: { ru: "Passato prossimo", en: "Passato prossimo" },
    question: "Maria ___ a casa alle otto.",
    options: ["è andata", "ha andato", "è andato", "hanno andato"],
    answerIndex: 0,
  },
  {
    id: "q13",
    level: "A2",
    type: "choice",
    topic: { ru: "Направления", en: "Directions" },
    question: "Quale frase si usa per chiedere indicazioni stradali?",
    options: [
      "Dov'è la stazione, per favore?",
      "Quanto costa questo?",
      "Che ore sono?",
      "Come ti chiami?",
    ],
    answerIndex: 0,
  },
  {
    id: "q14",
    level: "A2",
    type: "match",
    topic: { ru: "Покупки", en: "Shopping" },
    pairs: [
      { it: "negozio", ru: "магазин", en: "shop" },
      { it: "prezzo", ru: "цена", en: "price" },
      { it: "cassa", ru: "касса", en: "cash desk" },
      { it: "sconto", ru: "скидка", en: "discount" },
    ],
  },
  {
    id: "q15",
    level: "A2",
    type: "conjugate",
    topic: { ru: "Passato prossimo", en: "Passato prossimo" },
    question: "Loro ___ un viaggio l'anno scorso. (fare)",
    options: ["hanno fatto", "hanno facevano", "sono fatti", "hanno fare"],
    answerIndex: 0,
  },
  {
    id: "q16",
    level: "A2",
    type: "choice",
    topic: { ru: "Предлоги", en: "Prepositions" },
    question: "Vado ___ scuola ogni giorno.",
    options: ["a", "di", "su", "per"],
    answerIndex: 0,
  },
  {
    id: "q17",
    level: "A2",
    type: "fill",
    topic: { ru: "Сравнения", en: "Comparatives" },
    question: "Il treno è ___ veloce della macchina.",
    options: ["più", "tanto", "molto", "così"],
    answerIndex: 0,
  },
  {
    id: "q18",
    level: "A2",
    type: "choice",
    topic: { ru: "Повседневная лексика", en: "Everyday vocabulary" },
    question: "Che cosa significa “presto”?",
    options: [
      { ru: "скоро / рано", en: "soon / early" },
      { ru: "поздно", en: "late" },
      { ru: "никогда", en: "never" },
      { ru: "всегда", en: "always" },
    ],
    answerIndex: 0,
  },
  {
    id: "q19",
    level: "A2",
    type: "match",
    topic: { ru: "Повседневные глаголы", en: "Everyday verbs" },
    pairs: [
      { it: "comprare", ru: "покупать", en: "to buy" },
      { it: "vendere", ru: "продавать", en: "to sell" },
      { it: "cercare", ru: "искать", en: "to look for" },
      { it: "trovare", ru: "находить", en: "to find" },
    ],
  },
  {
    id: "q20",
    level: "A2",
    type: "conjugate",
    topic: { ru: "Возвратные глаголы", en: "Reflexive verbs" },
    question: "Lei ___ alle sette. (svegliarsi)",
    options: ["si è svegliata", "si ha svegliato", "è svegliata", "ha svegliato"],
    answerIndex: 0,
  },

  // ============================= B1 (21-30) =============================
  {
    id: "q21",
    level: "B1",
    type: "fill",
    topic: { ru: "Imperfetto", en: "Imperfetto" },
    question: "Da bambino, io ___ sempre in campagna.",
    options: ["abitavo", "ho abitato", "abiterò", "abiti"],
    answerIndex: 0,
  },
  {
    id: "q22",
    level: "B1",
    type: "choice",
    topic: { ru: "Imperfetto vs Passato prossimo", en: "Imperfetto vs Passato prossimo" },
    question: "Mentre ___, ha squillato il telefono.",
    options: ["studiavo", "ho studiato", "studierò", "studi"],
    answerIndex: 0,
  },
  {
    id: "q23",
    level: "B1",
    type: "fill",
    topic: { ru: "Futuro semplice", en: "Futuro semplice" },
    question: "Domani noi ___ al mare.",
    options: ["andremo", "andiamo", "andavamo", "siamo andati"],
    answerIndex: 0,
  },
  {
    id: "q24",
    level: "B1",
    type: "conjugate",
    topic: { ru: "Futuro semplice", en: "Futuro semplice" },
    question: "Tu ___ venire alla festa? (potere)",
    options: ["potrai", "poterai", "puoi", "potresti"],
    answerIndex: 0,
  },
  {
    id: "q25",
    level: "B1",
    type: "fill",
    topic: { ru: "Condizionale semplice", en: "Condizionale semplice" },
    question: "Io ___ un caffè, grazie.",
    options: ["vorrei", "voglio", "volevo", "vorrò"],
    answerIndex: 0,
  },
  {
    id: "q26",
    level: "B1",
    type: "choice",
    topic: { ru: "Относительные местоимения", en: "Relative pronouns" },
    question: "Il libro ___ ho comprato è molto interessante.",
    options: ["che", "chi", "cui", "dove"],
    answerIndex: 0,
  },
  {
    id: "q27",
    level: "B1",
    type: "reading",
    topic: { ru: "Чтение", en: "Reading" },
    passage:
      "Marco lavora in un ufficio in centro città. Ogni mattina prende l'autobus alle otto e arriva al lavoro " +
      "alle otto e mezza. Dopo il lavoro, gli piace fare una passeggiata nel parco prima di tornare a casa.",
    question: "A che ora arriva Marco al lavoro?",
    options: ["Alle otto e mezza", "Alle otto", "Alle nove", "Alle sette"],
    answerIndex: 0,
  },
  {
    id: "q28",
    level: "B1",
    type: "reading",
    topic: { ru: "Чтение", en: "Reading" },
    passage: "Anna voleva andare al mare, tuttavia ha deciso di rimanere a casa perché pioveva.",
    question: "Perché Anna è rimasta a casa?",
    options: ["Perché pioveva", "Perché era stanca", "Perché doveva lavorare", "Perché non aveva soldi"],
    answerIndex: 0,
  },
  {
    id: "q29",
    level: "B1",
    type: "choice",
    topic: { ru: "Союзы", en: "Connectors" },
    question: "Non sono uscito ___ pioveva molto.",
    options: ["perché", "però", "quindi", "mentre"],
    answerIndex: 0,
  },
  {
    id: "q30",
    level: "B1",
    type: "conjugate",
    topic: { ru: "Imperfetto", en: "Imperfetto" },
    question: "Quando ero piccolo, ___ spesso con i miei amici. (giocare)",
    options: ["giocavo", "ho giocato", "giocherò", "gioco"],
    answerIndex: 0,
  },

  // ============================= B2 (31-40) =============================
  {
    id: "q31",
    level: "B2",
    type: "fill",
    topic: { ru: "Congiuntivo presente", en: "Congiuntivo presente" },
    question: "Penso che lui ___ ragione.",
    options: ["abbia", "ha", "avrà", "aveva"],
    answerIndex: 0,
  },
  {
    id: "q32",
    level: "B2",
    type: "fill",
    topic: { ru: "Congiuntivo imperfetto", en: "Congiuntivo imperfetto" },
    question: "Sebbene ___ stanco, ha finito il lavoro.",
    options: ["fosse", "era", "sarà", "è"],
    answerIndex: 0,
  },
  {
    id: "q33",
    level: "B2",
    type: "conjugate",
    topic: { ru: "Congiuntivo passato", en: "Congiuntivo passato" },
    question: "Credo che loro ___ già. (partire)",
    options: ["siano già partiti", "sono già partiti", "erano già partiti", "saranno già partiti"],
    answerIndex: 0,
  },
  {
    id: "q34",
    level: "B2",
    type: "fill",
    topic: { ru: "Condizionale composto / Periodo ipotetico", en: "Compound conditional / Hypotheticals" },
    question: "Se avessi saputo, ti ___.",
    options: ["avrei chiamato", "chiamerei", "chiamavo", "ho chiamato"],
    answerIndex: 0,
  },
  {
    id: "q35",
    level: "B2",
    type: "choice",
    topic: { ru: "Periodo ipotetico", en: "Hypothetical clauses" },
    question: "Se fossi in te, non ___ quella scelta.",
    options: ["farei", "faccio", "ho fatto", "farò"],
    answerIndex: 0,
  },
  {
    id: "q36",
    level: "B2",
    type: "fill",
    topic: { ru: "Форма пассива", en: "Passive voice" },
    question: "Il romanzo ___ da un autore famoso.",
    options: ["è stato scritto", "ha scritto", "scriveva", "si scrive"],
    answerIndex: 0,
  },
  {
    id: "q37",
    level: "B2",
    type: "choice",
    topic: { ru: "Косвенная речь", en: "Reported speech" },
    question: "Lui ha detto che ___ presto. (“Arriverò presto”)",
    options: ["sarebbe arrivato", "arriverà", "arriva", "arrivava"],
    answerIndex: 0,
  },
  {
    id: "q38",
    level: "B2",
    type: "reading",
    topic: { ru: "Чтение", en: "Reading" },
    passage:
      "Nonostante le difficoltà economiche, l'azienda è riuscita a rimanere in piedi grazie a un'attenta gestione " +
      "delle risorse. Molti dipendenti, però, temono che la situazione possa peggiorare nei prossimi mesi.",
    question: "Che cosa temono i dipendenti?",
    options: [
      "Che la situazione peggiori",
      "Che l'azienda chiuda subito",
      "Che i prezzi aumentino",
      "Che i clienti se ne vadano",
    ],
    answerIndex: 0,
  },
  {
    id: "q39",
    level: "B2",
    type: "choice",
    topic: { ru: "Идиомы", en: "Idioms" },
    question: "Che cosa significa l'espressione “in bocca al lupo”?",
    options: [
      { ru: "пожелание удачи", en: "a wish of good luck" },
      { ru: "плохие новости", en: "bad news" },
      { ru: "опасная ситуация", en: "a dangerous situation" },
      { ru: "голодный человек", en: "a hungry person" },
    ],
    answerIndex: 0,
  },
  {
    id: "q40",
    level: "B2",
    type: "fill",
    topic: { ru: "Союзы + congiuntivo", en: "Connectors + congiuntivo" },
    question: "___ le previsioni fossero negative, il concerto si è svolto regolarmente.",
    options: ["Nonostante", "Perché", "Quindi", "Siccome"],
    answerIndex: 0,
  },
];

const LEVELS = ["A1", "A2", "B1", "B2"];
