const STORAGE_KEY = "ent-trainer-stats-v1";

const els = {
  datasetMeta: document.getElementById("datasetMeta"),
  topicSelect: document.getElementById("topicSelect"),
  btnNew: document.getElementById("btnNew"),
  qTopic: document.getElementById("qTopic"),
  qIndex: document.getElementById("qIndex"),
  qText: document.getElementById("qText"),
  options: document.getElementById("options"),
  feedback: document.getElementById("feedback"),
  btnReveal: document.getElementById("btnReveal"),
  btnNext: document.getElementById("btnNext"),
  stCorrect: document.getElementById("stCorrect"),
  stWrong: document.getElementById("stWrong"),
  stAccuracy: document.getElementById("stAccuracy"),
  btnReset: document.getElementById("btnReset"),
};

let dataset = null;
let pool = [];
let current = null;
let answered = false;

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return { correct: Number(obj.correct || 0), wrong: Number(obj.wrong || 0) };
  } catch {
    return { correct: 0, wrong: 0 };
  }
}

function saveStats(stats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function renderStats() {
  const { correct, wrong } = loadStats();
  const total = correct + wrong;
  const acc = total ? Math.round((correct / total) * 100) : 0;
  els.stCorrect.textContent = String(correct);
  els.stWrong.textContent = String(wrong);
  els.stAccuracy.textContent = `${acc}%`;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fillTopics() {
  const topics = Array.from(new Set((dataset.questions || []).map((q) => q.topic))).sort();
  els.topicSelect.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = "Все темы";
  els.topicSelect.appendChild(allOpt);
  for (const t of topics) {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    els.topicSelect.appendChild(opt);
  }
}

function buildPool() {
  const topic = els.topicSelect.value;
  const all = dataset.questions || [];
  pool = topic === "all" ? all : all.filter((q) => q.topic === topic);
  if (!pool.length) pool = all;
}

function pickQuestion() {
  if (!pool.length) return null;
  const idx = Math.floor(Math.random() * pool.length);
  return { q: pool[idx], idx, total: pool.length };
}

function lockOptions(correctIndex) {
  for (const btn of els.options.querySelectorAll(".option")) {
    btn.setAttribute("aria-disabled", "true");
    if (Number(btn.dataset.correct) === 1) btn.classList.add("option--correct");
  }
}

function updateAfterAnswer(isCorrect) {
  const stats = loadStats();
  if (isCorrect) stats.correct += 1;
  else stats.wrong += 1;
  saveStats(stats);
  renderStats();
}

function renderQuestion() {
  answered = false;
  els.btnNext.disabled = true;
  els.feedback.textContent = "Выберите вариант ответа.";
  els.options.innerHTML = "";

  current = pickQuestion();
  if (!current) {
    els.qTopic.textContent = "—";
    els.qIndex.textContent = "—";
    els.qText.textContent = "Нет вопросов.";
    return;
  }

  const { q, idx, total } = current;
  els.qTopic.textContent = q.topic || "—";
  els.qIndex.textContent = `Вопрос ${idx + 1} / ${total}`;
  els.qText.textContent = q.question || "";

  const options = shuffle(
    (q.options || []).map((text, i) => ({
      text,
      correct: i === Number(q.answerIndex),
    }))
  );

  options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option";
    btn.dataset.correct = opt.correct ? "1" : "0";
    btn.textContent = `${String.fromCharCode(65 + i)}. ${opt.text}`;
    btn.addEventListener("click", () => onAnswer(btn));
    els.options.appendChild(btn);
  });
}

function onAnswer(btn) {
  if (answered) return;
  answered = true;

  const isCorrect = btn.dataset.correct === "1";
  lockOptions();

  if (!isCorrect) btn.classList.add("option--wrong");
  if (isCorrect) btn.classList.add("option--correct");

  updateAfterAnswer(isCorrect);
  els.feedback.textContent = isCorrect
    ? "Верно!"
    : `Неверно. Правильный ответ: ${current.q.options[current.q.answerIndex]}`;

  els.btnNext.disabled = false;
}

function revealAnswer() {
  if (!current) return;
  if (answered) return;

  answered = true;
  lockOptions();
  els.feedback.textContent = `Правильный ответ: ${current.q.options[current.q.answerIndex]}`;
  els.btnNext.disabled = false;
}

function setDatasetMeta() {
  const total = (dataset.questions || []).length;
  els.datasetMeta.textContent = `${dataset.title || "ЕНТ"} • ${total} вопросов`;
}

async function init() {
  renderStats();

  try {
    const res = await fetch("./data/questions.json");
    dataset = await res.json();
  } catch {
    els.datasetMeta.textContent = "Не удалось загрузить вопросы";
    els.qText.textContent = "Запустите через локальный сервер (см. README).";
    return;
  }

  setDatasetMeta();
  fillTopics();
  buildPool();
  renderQuestion();

  els.topicSelect.addEventListener("change", () => {
    buildPool();
    renderQuestion();
  });
  els.btnNew.addEventListener("click", renderQuestion);
  els.btnNext.addEventListener("click", renderQuestion);
  els.btnReveal.addEventListener("click", revealAnswer);
  els.btnReset.addEventListener("click", () => {
    if (!confirm("Сбросить статистику?")) return;
    saveStats({ correct: 0, wrong: 0 });
    renderStats();
  });
}

init();

