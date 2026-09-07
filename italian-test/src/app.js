/* Italian level test — application logic. Classic script (no bundler),
 * relies on globals defined in data.js: STRINGS, RECOMMENDATIONS, QUESTIONS,
 * LEVELS, optionText.
 */
(function () {
  "use strict";

  const TOTAL_QUESTIONS = QUESTIONS.length;
  const CONSECUTIVE_WRONG_LIMIT = 3;

  const state = {
    lang: "ru",
    index: 0,
    consecutiveWrong: 0,
    levelStats: { A1: { correct: 0, total: 0 }, A2: { correct: 0, total: 0 }, B1: { correct: 0, total: 0 }, B2: { correct: 0, total: 0 } },
    answeredCurrent: false,
    stoppedAtLevel: null, // set when the 3-in-a-row limit is hit
    shuffledMatchPool: null, // per-question shuffled translation options
    matchSelections: null,
  };

  /* ---------- DOM refs ---------- */
  const el = (id) => document.getElementById(id);

  const screens = {
    start: el("screen-start"),
    quiz: el("screen-quiz"),
    result: el("screen-result"),
  };

  const dom = {
    langBtnRu: el("langBtnRu"),
    langBtnEn: el("langBtnEn"),
    appTitle: el("appTitle"),
    appSubtitle: el("appSubtitle"),
    startDescription: el("startDescription"),
    startBullets: el("startBullets"),
    btnStart: el("btnStart"),

    progressFill: el("progressFill"),
    levelBadge: el("levelBadge"),
    questionOfLabel: el("questionOfLabel"),
    topicPill: el("topicPill"),
    typeLabel: el("typeLabel"),
    passageBlock: el("passageBlock"),
    passageText: el("passageText"),
    questionText: el("questionText"),
    optionsBlock: el("optionsBlock"),
    matchBlock: el("matchBlock"),
    matchRows: el("matchRows"),
    btnCheckMatch: el("btnCheckMatch"),
    feedbackBlock: el("feedbackBlock"),
    feedbackText: el("feedbackText"),
    btnNext: el("btnNext"),

    resultTitle: el("resultTitle"),
    resultLevelPrefix: el("resultLevelPrefix"),
    resultLevelValue: el("resultLevelValue"),
    stoppedNotice: el("stoppedNotice"),
    breakdownTitle: el("breakdownTitle"),
    breakdownList: el("breakdownList"),
    recommendationsTitle: el("recommendationsTitle"),
    recommendationsText: el("recommendationsText"),
    btnRestart: el("btnRestart"),
  };

  function t() {
    return STRINGS[state.lang];
  }

  function showScreen(name) {
    Object.keys(screens).forEach((key) => {
      screens[key].hidden = key !== name;
    });
  }

  /* ---------- language ---------- */
  function setLang(lang) {
    state.lang = lang;
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === lang);
    });
    renderStaticText();
    if (!screens.quiz.hidden) renderQuestion();
    if (!screens.result.hidden) renderResult();
  }

  function renderStaticText() {
    const s = t();
    dom.appTitle.textContent = s.appTitle;
    dom.appSubtitle.textContent = s.appSubtitle;
    dom.startDescription.textContent = s.startDescription;
    dom.startBullets.innerHTML = "";
    s.startBullets.forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      dom.startBullets.appendChild(li);
    });
    dom.btnStart.textContent = s.startButton;
    dom.btnCheckMatch.textContent = s.checkButton;
    dom.resultTitle.textContent = s.resultTitle;
    dom.resultLevelPrefix.textContent = s.resultLevelPrefix;
    dom.breakdownTitle.textContent = s.breakdownTitle;
    dom.recommendationsTitle.textContent = s.recommendationsTitle;
    dom.btnRestart.textContent = s.restartButton;
  }

  /* ---------- start ---------- */
  function resetState() {
    state.index = 0;
    state.consecutiveWrong = 0;
    state.stoppedAtLevel = null;
    state.answeredCurrent = false;
    LEVELS.forEach((lv) => {
      state.levelStats[lv] = { correct: 0, total: 0 };
    });
  }

  function startTest() {
    resetState();
    showScreen("quiz");
    renderQuestion();
  }

  /* ---------- quiz rendering ---------- */
  function currentQuestion() {
    return QUESTIONS[state.index];
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function renderQuestion() {
    const s = t();
    const q = currentQuestion();
    state.answeredCurrent = false;

    dom.progressFill.style.width = `${(state.index / TOTAL_QUESTIONS) * 100}%`;
    dom.levelBadge.textContent = q.level;
    dom.questionOfLabel.textContent = s.questionOfLabel(state.index + 1, TOTAL_QUESTIONS);
    dom.topicPill.textContent = q.topic ? q.topic[state.lang] || q.topic.en : q.level;
    dom.typeLabel.textContent = s.typeLabels[q.type] || "";

    if (q.passage) {
      dom.passageBlock.hidden = false;
      dom.passageText.textContent = q.passage;
    } else {
      dom.passageBlock.hidden = true;
      dom.passageText.textContent = "";
    }

    dom.questionText.textContent = q.question || "";

    dom.feedbackBlock.hidden = true;
    dom.feedbackBlock.classList.remove("is-correct", "is-incorrect");
    dom.feedbackText.innerHTML = "";

    dom.btnNext.disabled = true;
    dom.btnNext.textContent = state.index === TOTAL_QUESTIONS - 1 ? s.finishButton : s.nextButton;

    if (q.type === "match") {
      dom.optionsBlock.hidden = true;
      dom.matchBlock.hidden = false;
      renderMatchQuestion(q);
    } else {
      dom.matchBlock.hidden = true;
      dom.optionsBlock.hidden = false;
      renderChoiceQuestion(q);
    }
  }

  function renderChoiceQuestion(q) {
    dom.optionsBlock.innerHTML = "";
    q.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn";
      btn.textContent = optionText(opt, state.lang);
      btn.addEventListener("click", () => onChoiceSelected(i, btn));
      dom.optionsBlock.appendChild(btn);
    });
  }

  function onChoiceSelected(selectedIndex, btnEl) {
    if (state.answeredCurrent) return;
    state.answeredCurrent = true;
    const q = currentQuestion();
    const correct = selectedIndex === q.answerIndex;

    const buttons = Array.from(dom.optionsBlock.children);
    buttons.forEach((b, i) => {
      b.disabled = true;
      if (i === q.answerIndex) b.classList.add("correct");
      if (i === selectedIndex && !correct) b.classList.add("incorrect");
    });
    btnEl.classList.add("selected");

    applyAnswerResult(correct, q);
  }

  function renderMatchQuestion(q) {
    const lang = state.lang;
    state.shuffledMatchPool = shuffle(q.pairs.map((p) => p[lang]));
    state.matchSelections = new Array(q.pairs.length).fill("");

    dom.matchRows.innerHTML = "";
    dom.btnCheckMatch.disabled = false;
    dom.btnCheckMatch.hidden = false;
    dom.btnCheckMatch.onclick = () => checkMatchAnswer(q);

    q.pairs.forEach((pair, rowIndex) => {
      const row = document.createElement("div");
      row.className = "match-row";

      const word = document.createElement("div");
      word.className = "match-row__word";
      word.textContent = pair.it;

      const select = document.createElement("select");
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = t().selectPlaceholder;
      select.appendChild(placeholder);

      state.shuffledMatchPool.forEach((translation) => {
        const opt = document.createElement("option");
        opt.value = translation;
        opt.textContent = translation;
        select.appendChild(opt);
      });

      select.addEventListener("change", () => {
        state.matchSelections[rowIndex] = select.value;
      });

      row.appendChild(word);
      row.appendChild(select);
      dom.matchRows.appendChild(row);
    });
  }

  function checkMatchAnswer(q) {
    if (state.answeredCurrent) return;
    const lang = state.lang;
    const rows = Array.from(dom.matchRows.children);
    let allCorrect = true;

    q.pairs.forEach((pair, i) => {
      const isRowCorrect = state.matchSelections[i] === pair[lang];
      if (!isRowCorrect) allCorrect = false;
      rows[i].classList.add(isRowCorrect ? "correct" : "incorrect");
      rows[i].querySelector("select").disabled = true;
    });

    state.answeredCurrent = true;
    dom.btnCheckMatch.disabled = true;
    applyAnswerResult(allCorrect, q);
  }

  function applyAnswerResult(correct, q) {
    const s = t();
    const stats = state.levelStats[q.level];
    stats.total += 1;
    if (correct) {
      stats.correct += 1;
      state.consecutiveWrong = 0;
    } else {
      state.consecutiveWrong += 1;
    }

    dom.feedbackBlock.hidden = false;
    dom.feedbackBlock.classList.add(correct ? "is-correct" : "is-incorrect");
    if (correct) {
      dom.feedbackText.textContent = s.correctFeedback;
    } else {
      let answerLine = "";
      if (q.type === "match") {
        answerLine = q.pairs.map((p) => `${p.it} — ${p[state.lang]}`).join(", ");
      } else {
        answerLine = optionText(q.options[q.answerIndex], state.lang);
      }
      dom.feedbackText.innerHTML =
        `${s.incorrectFeedback}<span class="correct-answer-line">${s.correctAnswerWas} ${escapeHtml(answerLine)}</span>`;
    }

    if (state.consecutiveWrong >= CONSECUTIVE_WRONG_LIMIT) {
      state.stoppedAtLevel = q.level;
    }

    dom.btnNext.disabled = false;
    const isLast = state.index === TOTAL_QUESTIONS - 1;
    dom.btnNext.textContent = state.stoppedAtLevel || isLast ? s.finishButton : s.nextButton;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function onNext() {
    if (state.stoppedAtLevel || state.index === TOTAL_QUESTIONS - 1) {
      finishTest();
      return;
    }
    state.index += 1;
    renderQuestion();
  }

  /* ---------- result ---------- */
  function computeAchievedLevel() {
    let achieved = null;
    for (const level of LEVELS) {
      const stats = state.levelStats[level];
      if (stats.total === 0) break; // level never reached
      if (stats.total < 10) break; // stopped mid-level (adaptive stop)
      if (stats.correct / stats.total >= 0.5) {
        achieved = level;
      } else {
        break; // completed level but performance too weak to award it
      }
    }
    return achieved;
  }

  function finishTest() {
    dom.progressFill.style.width = "100%";
    showScreen("result");
    renderResult();
  }

  function renderResult() {
    const s = t();
    const achieved = computeAchievedLevel();

    dom.resultLevelValue.textContent = achieved || s.belowA1;

    if (state.stoppedAtLevel) {
      dom.stoppedNotice.hidden = false;
      dom.stoppedNotice.textContent = s.stoppedNotice;
    } else {
      dom.stoppedNotice.hidden = true;
    }

    dom.breakdownList.innerHTML = "";
    LEVELS.forEach((level) => {
      const stats = state.levelStats[level];
      const row = document.createElement("div");
      const reached = stats.total > 0;
      row.className = "breakdown-row" + (reached ? "" : " not-reached");

      const levelSpan = document.createElement("span");
      levelSpan.className = "breakdown-row__level";
      levelSpan.textContent = level;

      const valueSpan = document.createElement("span");
      valueSpan.textContent = reached ? s.breakdownRow(stats.correct, stats.total) : s.notReached;

      row.appendChild(levelSpan);
      row.appendChild(valueSpan);
      dom.breakdownList.appendChild(row);
    });

    const recKey = achieved || "none";
    dom.recommendationsText.textContent = RECOMMENDATIONS[recKey][state.lang];
  }

  function restartTest() {
    showScreen("start");
  }

  /* ---------- wiring ---------- */
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });

  dom.btnStart.addEventListener("click", startTest);
  dom.btnNext.addEventListener("click", onNext);
  dom.btnRestart.addEventListener("click", restartTest);

  /* ---------- init ---------- */
  setLang("ru");
  showScreen("start");
})();
