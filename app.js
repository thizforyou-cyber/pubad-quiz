const unitSelect = document.getElementById("unit-select");
const searchInput = document.getElementById("search-input");
const questionText = document.getElementById("question-text");
const optionsList = document.getElementById("options-list");
const feedback = document.getElementById("feedback");
const questionCounter = document.getElementById("question-counter");
const unitLabel = document.getElementById("unit-label");
const progressBar = document.getElementById("progress-bar");
const scoreNumber = document.getElementById("score-number");
const attemptedCount = document.getElementById("attempted-count");
const accuracyCount = document.getElementById("accuracy-count");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const resetBtn = document.getElementById("reset-btn");
const googleQuestionLink = document.getElementById("google-question-link");
const learningPanel = document.getElementById("learning-panel");
const showLearningBtn = document.getElementById("show-learning-btn");
const bookmarkBtn = document.getElementById("bookmark-btn");
const allQuestionsBtn = document.getElementById("all-questions-btn");
const wrongReviewBtn = document.getElementById("wrong-review-btn");
const bookmarksReviewBtn = document.getElementById("bookmarks-review-btn");

let reviewMode = "all";
let bookmarkedIds = [];
try {
  const storedBookmarks = JSON.parse(localStorage.getItem("pa-net-quiz-bookmarks") || "[]");
  if (Array.isArray(storedBookmarks)) bookmarkedIds = storedBookmarks.map(String);
} catch (_) { bookmarkedIds = []; }

function saveBookmarks() {
  try { localStorage.setItem("pa-net-quiz-bookmarks", JSON.stringify(bookmarkedIds)); } catch (_) {}
}

function updateReviewButtons() {
  [[allQuestionsBtn,"all"],[wrongReviewBtn,"wrong"],[bookmarksReviewBtn,"bookmarks"]].forEach(([button,mode]) => {
    const active = reviewMode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function updateBookmarkButton(question) {
  if (!question) {
    bookmarkBtn.disabled = true;
    bookmarkBtn.textContent = "☆ Bookmark question";
    bookmarkBtn.setAttribute("aria-pressed", "false");
    return;
  }
  bookmarkBtn.disabled = false;
  const isSaved = bookmarkedIds.includes(String(question.id));
  bookmarkBtn.textContent = isSaved ? "★ Bookmarked" : "☆ Bookmark question";
  bookmarkBtn.setAttribute("aria-pressed", String(isSaved));
}

let filteredQuestions = [...QUESTIONS];
let currentIndex = 0;
let responses = {};

document.getElementById("total-count").textContent = QUESTIONS.length.toLocaleString();

for (let unit = 1; unit <= 10; unit++) {
  const option = document.createElement("option");
  option.value = String(unit);
  option.textContent = `Unit ${unit} — ${UNIT_TITLES[unit]}`;
  unitSelect.appendChild(option);
}

function applyFilters() {
  const selectedUnit = unitSelect.value;
  const term = searchInput.value.trim().toLowerCase();
  filteredQuestions = QUESTIONS.filter(q => {
    const matchesUnit = selectedUnit === "all" || q.unit === Number(selectedUnit);
    const haystack = `${q.question} ${q.options.join(" ")}`.toLowerCase();
    const response = responses[q.id];
    const matchesReview = reviewMode === "all"
      || (reviewMode === "wrong" && response && !response.correct)
      || (reviewMode === "bookmarks" && bookmarkedIds.includes(String(q.id)));
    return matchesUnit && (!term || haystack.includes(term)) && matchesReview;
  });
  currentIndex = 0;
  updateReviewButtons();
  renderQuestion();
}


function cleanPromptText(text) {
  return text
    .replace(/[ \t]*:[ \t]*/g, ": ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([,.;:])/g, "$1")
    .trim();
}

function extractMatchItems(text) {
  // Match labels are interleaved in the source: A. item, i. item, B. item, ii. item.
  // Accept both A-D / i-iv and (a)-(d) / (i)-(iv) label styles.
  const marker = /(?:\((?<letterParen>[A-Da-d])\)|(?<![A-Za-z])(?<letterPlain>[A-Da-d])\.)|(?:\((?<romanParen>iv|iii|ii|i|v)\)|(?<![A-Za-z])(?<romanPlain>iv|iii|ii|i|v)\.)/gi;
  const matches = [...text.matchAll(marker)];
  const items = { left: [], right: [] };
  if (matches.length < 4) return null;

  matches.forEach((match, index) => {
    const letter = match.groups.letterParen || match.groups.letterPlain;
    const roman = match.groups.romanParen || match.groups.romanPlain;
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
    const value = cleanPromptText(text.slice(start, end)
      .replace(/^\s*[\(:.-]+|\s*[\):.-]+$/g, ""));
    if (!value) return;
    if (letter) items.left.push({ label: letter.toLowerCase(), value });
    else if (roman) items.right.push({ label: roman.toLowerCase(), value });
  });
  return items.left.length >= 2 && items.right.length >= 2 ? items : null;
}

function renderQuestionPrompt(question) {
  // This function controls only the question prompt. Options, answers, scoring,
  // navigation, explanations, and the rest of the page are deliberately untouched.
  questionText.innerHTML = "";
  const raw = String(question.question || "").replace(/\s+/g, " ").trim();
  const label = document.createElement("span");
  label.className = "question-number";
  label.textContent = "Q" + question.id + ". ";

  function addIntro(text) {
    const intro = document.createElement("div");
    intro.className = "question-intro";
    intro.append(label, document.createTextNode(cleanPromptText(text)));
    questionText.appendChild(intro);
  }

  function addInstruction(text) {
    const cleaned = cleanPromptText(text);
    if (!cleaned) return;
    const note = document.createElement("div");
    note.className = "question-instruction";
    note.textContent = cleaned;
    questionText.appendChild(note);
  }

  // Match-the-following: show the two lists as aligned, readable columns.
  const isMatchQuestion = /match\s+(?:list|the\s+following)/i.test(raw)
    && /list\s*[-–]?\s*I\b/i.test(raw)
    && /list\s*[-–]?\s*II\b/i.test(raw);
  if (isMatchQuestion) {
    const items = extractMatchItems(raw);
    if (items) {
      const listOneMatches = [...raw.matchAll(/List\s*[-–]?\s*I\b/gi)];
      const listOne = listOneMatches[listOneMatches.length - 1];
      const introText = raw.slice(0, listOne.index)
        .replace(/match\s+(?:list\s*[-–]?\s*I\s+with\s+list\s*[-–]?\s*II|the\s+following)[\s\S]*$/i, "Match List I with List II.");
      addIntro(introText || "Match List I with List II.");

      const grid = document.createElement("div");
      grid.className = "match-grid";
      [["List I", items.left], ["List II", items.right]].forEach(([title, list]) => {
        const column = document.createElement("section");
        column.className = "match-column";
        const heading = document.createElement("h3");
        heading.textContent = title;
        column.appendChild(heading);
        const listEl = document.createElement("ol");
        listEl.className = "match-items";
        list.forEach(item => {
          const li = document.createElement("li");
          const marker = document.createElement("strong");
          marker.textContent = item.label + ". ";
          li.append(marker, document.createTextNode(item.value));
          listEl.appendChild(li);
        });
        column.appendChild(listEl);
        grid.appendChild(column);
      });
      questionText.appendChild(grid);
      const codeAt = raw.search(/\bCodes?\s*:/i);
      if (codeAt >= 0) addInstruction(raw.slice(codeAt));
      return;
    }
  }

  // Statement lists in all common exam formats: i./ii., (i)/(ii),
  // (a)/(b), A./B., and (1)/(2). Require multiple explicit markers.
  const markerPattern = /(?:\((?<romanParen>iv|iii|ii|i|v)\)|(?<![A-Za-z])(?<romanPlain>iv|iii|ii|i|v)\.\.?|\((?<letterParen>[a-d])\)|(?<![A-Za-z])(?<letterPlain>[a-d])\.\s*|\((?<numberParen>\d{1,2})\)|(?<!\d)(?<numberPlain>\d{1,2})[.)]\s*)/gi;
  const markers = [...raw.matchAll(markerPattern)];
  const validGroups = [
    ["romanParen", "romanPlain"],
    ["letterParen", "letterPlain"],
    ["numberParen", "numberPlain"]
  ];
  let selected = null;
  for (const group of validGroups) {
    const found = markers.filter(m => group.some(k => m.groups[k]));
    if (found.length >= 2) { selected = found; break; }
  }

  if (selected) {
    const first = selected[0].index;
    addIntro(raw.slice(0, first));
    const list = document.createElement("div");
    list.className = "statement-list";
    selected.forEach((match, index) => {
      const from = match.index + match[0].length;
      const to = index + 1 < selected.length ? selected[index + 1].index : raw.length;
      let value = raw.slice(from, to);
      value = value.replace(/\b(?:Select|Choose) the (?:most appropriate |correct )?answer[\s\S]*$/i, "");
      value = value.replace(/\bCodes?\s*:?\s*$/i, "");
      value = cleanPromptText(value);
      if (!value) return;
      const row = document.createElement("div");
      row.className = "statement-line";
      const marker = document.createElement("strong");
      const markerValue = match.groups.romanParen || match.groups.romanPlain ||
        match.groups.letterParen || match.groups.letterPlain ||
        match.groups.numberParen || match.groups.numberPlain;
      marker.textContent = markerValue.toLowerCase() + ". ";
      row.append(marker, document.createTextNode(value));
      list.appendChild(row);
    });
    questionText.appendChild(list);
    const instructionAt = raw.search(/\b(?:Select|Choose) the (?:most appropriate |correct )?answer/i);
    if (instructionAt >= 0) addInstruction(raw.slice(instructionAt));
    return;
  }

  // Assertion/reason questions: keep both parts visually distinct.
  const assertion = /Assertion\s*\(\s*A\s*\)\s*:/i.exec(raw);
  const reason = /Reason\s*\(\s*R\s*\)\s*:/i.exec(raw);
  if (assertion && reason && reason.index > assertion.index) {
    addIntro(raw.slice(0, assertion.index));
    const parts = [
      ["Assertion (A)", raw.slice(assertion.index + assertion[0].length, reason.index)],
      ["Reason (R)", raw.slice(reason.index + reason[0].length).replace(/\bCodes?\s*:?\s*$/i, "")]
    ];
    parts.forEach(([heading, value]) => {
      const row = document.createElement("div");
      row.className = "statement-line";
      const strong = document.createElement("strong");
      strong.textContent = heading + ": ";
      row.append(strong, document.createTextNode(cleanPromptText(value)));
      questionText.appendChild(row);
    });
    if (/\bCodes?\s*:/i.test(raw)) addInstruction("Choose the correct answer from the codes.");
    return;
  }

  // Ordinary questions remain verbatim in meaning, but are spaced and wrapped
  // cleanly inside the question area.
  const normal = document.createElement("div");
  normal.className = "question-normal";
  normal.append(label, document.createTextNode(cleanPromptText(raw)));
  questionText.appendChild(normal);
}

function renderQuestion() {
  optionsList.innerHTML = "";
  feedback.textContent = "";
  feedback.className = "feedback";
  learningPanel.hidden = true;
  showLearningBtn.hidden = true;
  showLearningBtn.setAttribute("aria-expanded", "false");
  learningPanel.innerHTML = "";
  googleQuestionLink.href = "#";

  if (!filteredQuestions.length) {
    updateBookmarkButton(null);
    unitLabel.textContent = "No matches";
    questionCounter.textContent = "0 questions";
    questionText.textContent = reviewMode === "wrong"
      ? "No incorrect answers to review yet. Answer some questions and your mistakes will appear here."
      : reviewMode === "bookmarks"
        ? "No bookmarked questions yet. Use ☆ Bookmark question while practising to save questions for revision."
        : "No questions match your search. Try another keyword or select a different unit.";
    progressBar.style.width = "0%";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    updateStats();
    return;
  }

  const q = filteredQuestions[currentIndex];
  const saved = responses[q.id];
  updateBookmarkButton(q);
  unitLabel.textContent = `Unit ${q.unit} · ${UNIT_TITLES[q.unit]}`;
  questionCounter.textContent = `Question ${currentIndex + 1} of ${filteredQuestions.length}`;
  renderQuestionPrompt(q);
  googleQuestionLink.href = googleSearchUrl(`${q.question} ${q.options.join(" ")} UGC NET Public Administration answer explanation`);
  progressBar.style.width = `${((currentIndex + 1) / filteredQuestions.length) * 100}%`;
  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === filteredQuestions.length - 1;
  const labels = ["A", "B", "C", "D"];

  q.options.forEach((optionText, index) => {
    const letter = labels[index];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option";
    const letterEl = document.createElement("span");
    letterEl.className = "option-letter";
    letterEl.textContent = letter;
    const textEl = document.createElement("span");
    textEl.textContent = optionText;
    button.append(letterEl, textEl);

    if (saved) {
      button.disabled = true;
      if (letter === q.answer) button.classList.add("correct");
      if (letter === saved.selected && saved.selected !== q.answer) button.classList.add("incorrect");
    } else {
      button.addEventListener("click", () => chooseAnswer(q, letter));
    }
    optionsList.appendChild(button);
  });

  if (saved) {
    const isCorrect = saved.selected === q.answer;
    feedback.textContent = isCorrect ? "Correct! Nice work." : `Not quite. Correct answer: ${q.answer}.`;
    feedback.classList.add(isCorrect ? "good" : "bad");
    renderLearningPanel(q, saved);
  }
  updateStats();
}


function googleSearchUrl(query) {
  return "https://www.google.com/search?q=" + encodeURIComponent(query);
}

function renderLearningPanel(question, response) {
  learningPanel.innerHTML = "";
  learningPanel.hidden = false;
  showLearningBtn.hidden = true;
  showLearningBtn.setAttribute("aria-expanded", "true");

  const explanation = (typeof QUESTION_EXPLANATIONS !== "undefined" && QUESTION_EXPLANATIONS[question.id])
    ? QUESTION_EXPLANATIONS[question.id]
    : null;

  const heading = document.createElement("h3");
  heading.className = "learning-title";
  heading.textContent = explanation ? "Learn from this question" : "Answer review";
  const headingRow = document.createElement("div");
  headingRow.className = "learning-heading-row";
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "learning-close-btn";
  closeButton.textContent = "Close ×";
  closeButton.setAttribute("aria-label", "Close answer explanation");
  closeButton.addEventListener("click", () => {
    learningPanel.hidden = true;
    showLearningBtn.hidden = false;
    showLearningBtn.setAttribute("aria-expanded", "false");
  });
  headingRow.append(heading, closeButton);
  learningPanel.appendChild(headingRow);

  const correctIndex = ["A", "B", "C", "D"].indexOf(question.answer);
  const correctText = question.options[correctIndex] || "Answer listed in the source key";
  const answerBox = document.createElement("div");
  answerBox.className = "learning-answer";
  const answerHeading = document.createElement("strong");
  answerHeading.textContent = `Correct answer: ${question.answer}. `;
  answerBox.append(answerHeading, document.createTextNode(correctText));
  learningPanel.appendChild(answerBox);

  if (!explanation) {
    const pending = document.createElement("div");
    pending.className = "explanation-pending";
    const pendingTitle = document.createElement("strong");
    pendingTitle.textContent = "Detailed explanation not yet available for this question";
    const pendingText = document.createElement("p");
    pendingText.textContent = "I won't invent reasons for the options. This answer letter comes from the uploaded PDF's answer key; it has not been independently verified here. Use the question link below to cross-check it. The curated explanation bank is being built separately so the original questions and keys stay unchanged.";
    pending.append(pendingTitle, pendingText);
    learningPanel.appendChild(pending);
  } else {
    const topic = document.createElement("p");
    topic.className = "learning-topic";
    topic.textContent = `Topic: ${explanation.topic}`;
    learningPanel.appendChild(topic);

    const conceptCard = document.createElement("section");
    conceptCard.className = "explanation-section";
    const conceptTitle = document.createElement("h4");
    conceptTitle.textContent = "Concept you need to know";
    const conceptText = document.createElement("p");
    conceptText.textContent = explanation.concept;
    conceptCard.append(conceptTitle, conceptText);
    learningPanel.appendChild(conceptCard);

    const correctCard = document.createElement("section");
    correctCard.className = "explanation-section explanation-correct";
    const correctTitle = document.createElement("h4");
    correctTitle.textContent = "Why this answer is correct";
    const correctReason = document.createElement("p");
    correctReason.textContent = explanation.whyCorrect;
    correctCard.append(correctTitle, correctReason);
    learningPanel.appendChild(correctCard);
  }

  const listHeading = document.createElement("h4");
  listHeading.className = "option-review-heading";
  listHeading.textContent = "Why each option is right or wrong";
  learningPanel.appendChild(listHeading);

  const list = document.createElement("div");
  list.className = "option-review-list";
  ["A", "B", "C", "D"].forEach((letter, index) => {
    const optionText = question.options[index] || "";
    const isCorrect = letter === question.answer;
    const row = document.createElement("div");
    row.className = "option-review" + (isCorrect ? " option-review-correct" : "");

    const copy = document.createElement("div");
    copy.className = "option-review-copy";
    const title = document.createElement("strong");
    title.textContent = `${letter}. ${optionText}`;
    const detail = document.createElement("p");
    if (explanation && explanation.options && explanation.options[letter]) {
      detail.textContent = explanation.options[letter];
    } else {
      detail.textContent = isCorrect
        ? "This is the option marked correct in the uploaded answer key. A question-specific rationale has not yet been added, so cross-check the key before memorising it."
        : "A question-specific reason this distractor is wrong has not yet been added. Compare it with the concept and verify it rather than relying on a generic explanation.";
    }
    copy.append(title, detail);

    const search = document.createElement("a");
    search.className = "option-search-link";
    search.target = "_blank";
    search.rel = "noopener noreferrer";
    search.textContent = isCorrect ? "Verify answer ↗" : "Check option ↗";
    search.href = googleSearchUrl(`"${optionText}" "${question.question}" Public Administration explanation`);

    row.append(copy, search);
    list.appendChild(row);
  });
  learningPanel.appendChild(list);

  if (explanation) {
    const tip = document.createElement("section");
    tip.className = "explanation-section exam-tip";
    const tipTitle = document.createElement("h4");
    tipTitle.textContent = "UGC NET exam trick";
    const tipText = document.createElement("p");
    tipText.textContent = explanation.examTip;
    tip.append(tipTitle, tipText);
    learningPanel.appendChild(tip);

    const related = document.createElement("section");
    related.className = "explanation-section";
    const relatedTitle = document.createElement("h4");
    relatedTitle.textContent = "Related concepts to revise";
    const relatedText = document.createElement("p");
    relatedText.textContent = explanation.related;
    related.append(relatedTitle, relatedText);
    learningPanel.appendChild(related);
  }

  const topicLink = document.createElement("a");
  topicLink.className = "topic-search-link";
  topicLink.target = "_blank";
  topicLink.rel = "noopener noreferrer";
  topicLink.href = googleSearchUrl(`${question.question} ${question.options.join(" ")} Public Administration UGC NET explanation`);
  topicLink.textContent = "Verify this question and explore the topic on Google ↗";
  learningPanel.appendChild(topicLink);

  if (response.selected !== question.answer) {
    const reminder = document.createElement("p");
    reminder.className = "learning-reminder";
    reminder.textContent = `You selected ${response.selected}. Compare it with ${question.answer}, then review each option before moving on.`;
    learningPanel.appendChild(reminder);
  }
}

function chooseAnswer(question, selected) {
  if (responses[question.id]) return;
  responses[question.id] = { selected, correct: selected === question.answer };
  renderQuestion();
}

function updateStats() {
  const answered = Object.values(responses);
  const correct = answered.filter(item => item.correct).length;
  scoreNumber.textContent = correct;
  attemptedCount.textContent = answered.length;
  accuracyCount.textContent = answered.length ? `${Math.round((correct / answered.length) * 100)}%` : "0%";
}

function moveToQuestion(index) {
  currentIndex = index;
  renderQuestion();
  // Keep the new question visible instead of leaving the reader at the bottom of the page.
  requestAnimationFrame(() => {
    const target = document.querySelector(".quiz-card");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

showLearningBtn.addEventListener("click", () => {
  learningPanel.hidden = false;
  showLearningBtn.hidden = true;
  showLearningBtn.setAttribute("aria-expanded", "true");
  learningPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

prevBtn.addEventListener("click", () => {
  if (currentIndex > 0) moveToQuestion(currentIndex - 1);
});
nextBtn.addEventListener("click", () => {
  if (currentIndex < filteredQuestions.length - 1) moveToQuestion(currentIndex + 1);
});
bookmarkBtn.addEventListener("click", () => {
  const question = filteredQuestions[currentIndex];
  if (!question) return;
  const id = String(question.id);
  if (bookmarkedIds.includes(id)) bookmarkedIds = bookmarkedIds.filter(savedId => savedId !== id);
  else bookmarkedIds.push(id);
  saveBookmarks();
  updateBookmarkButton(question);
  if (reviewMode === "bookmarks" && !bookmarkedIds.includes(id)) applyFilters();
});
allQuestionsBtn.addEventListener("click", () => { reviewMode = "all"; applyFilters(); });
wrongReviewBtn.addEventListener("click", () => { reviewMode = "wrong"; applyFilters(); });
bookmarksReviewBtn.addEventListener("click", () => { reviewMode = "bookmarks"; applyFilters(); });

unitSelect.addEventListener("change", applyFilters);
searchInput.addEventListener("input", applyFilters);
resetBtn.addEventListener("click", () => {
  responses = {};
  reviewMode = "all";
  currentIndex = 0;
  applyFilters();
});

renderQuestion();


const installButton = document.getElementById("install-app-btn");
const installHelp = document.getElementById("install-help");
let deferredInstallPrompt = null;

function showInstallHelp(message) {
  installHelp.textContent = message;
  installHelp.hidden = false;
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.textContent = "Install app";
  installButton.disabled = false;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  installButton.textContent = "Installed";
  installButton.disabled = true;
  showInstallHelp("The quiz has been installed. Look for its icon on your Home Screen or app list.");
});

installButton.addEventListener("click", async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice && choice.outcome === "accepted") {
      showInstallHelp("Installation accepted. Finish any confirmation shown by your browser.");
    } else {
      showInstallHelp("Installation was cancelled. You can try again whenever you're ready.");
    }
    deferredInstallPrompt = null;
    return;
  }

  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (isStandalone) {
    showInstallHelp("The quiz is already running as an installed app.");
  } else if (isIOS) {
    showInstallHelp("On iPhone/iPad: open this page in Safari, tap Share, then choose “Add to Home Screen” and tap Add.");
  } else {
    showInstallHelp("If your browser supports installation, open its menu (⋮) and choose “Install app” or “Add to Home screen”. If you don't see that option, open this site in Chrome and try again.");
  }
});
