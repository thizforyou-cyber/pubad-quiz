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
    return matchesUnit && (!term || haystack.includes(term));
  });
  currentIndex = 0;
  renderQuestion();
}


function cleanPromptText(text) {
  return text
    .replace(/\s*:\s*/g, ": ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

function extractMatchItems(text) {
  const marker = /(?:^|\s)([A-D])\.\s*|(?:^|\s)(iv|iii|ii|i|v)\.\s*/g;
  const matches = [...text.matchAll(marker)];
  const items = { left: [], right: [] };
  if (matches.length < 4) return null;

  matches.forEach((match, index) => {
    const label = match[1] || match[2];
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
    let value = text.slice(start, end)
      .replace(/\b(?:List\s*[-–]?\s*[I1]|List\s*[-–]?\s*II|Authors?|Books?|Codes?)\b/gi, "")
      .replace(/^\s*[:.)-]+|\s*[:.)-]+$/g, "")
      .trim();
    if (!value) return;
    if (/^[A-D]$/.test(label)) items.left.push({ label, value });
    else items.right.push({ label: label.toLowerCase(), value });
  });
  return items.left.length >= 2 && items.right.length >= 2 ? items : null;
}

function renderQuestionPrompt(question) {
  questionText.innerHTML = "";
  const questionLabel = document.createElement("span");
  questionLabel.className = "question-number";
  questionLabel.textContent = `Q${question.id}. `;

  const raw = String(question.question || "");
  if (/match\s+list|match\s+the\s+following/i.test(raw) && /list\s*[-–]?\s*i\b/i.test(raw) && /list\s*[-–]?\s*ii\b/i.test(raw)) {
    const items = extractMatchItems(raw);
    if (items) {
      const intro = raw.slice(0, Math.max(0, raw.search(/list\s*[-–]?\s*i\b/i)))
        .replace(/match\s+list\s*[-–]?\s*i\s+with\s+list\s*[-–]?\s*ii\.?/i, "Match List I with List II.")
        .replace(/^.*?(Match List I with List II\.?)/i, "$1");
      const heading = document.createElement("div");
      heading.className = "question-intro";
      heading.append(questionLabel, document.createTextNode(cleanPromptText(intro) || "Match the following."));
      questionText.appendChild(heading);

      const grid = document.createElement("div");
      grid.className = "match-grid";
      [["List I", items.left], ["List II", items.right]].forEach(([title, list]) => {
        const column = document.createElement("section");
        column.className = "match-column";
        const columnTitle = document.createElement("h3");
        columnTitle.textContent = title;
        column.appendChild(columnTitle);
        const listEl = document.createElement("ol");
        listEl.className = "match-items";
        list.forEach(item => {
          const li = document.createElement("li");
          const label = document.createElement("strong");
          label.textContent = item.label + ". ";
          li.append(label, document.createTextNode(cleanPromptText(item.value)));
          listEl.appendChild(li);
        });
        column.appendChild(listEl);
        grid.appendChild(column);
      });
      questionText.appendChild(grid);
      return;
    }
  }

  const statementPattern = /(?:^|\s)(i{1,3}|iv|v)\.\s+/g;
  const statements = [...raw.matchAll(statementPattern)];
  if (/select\s+the\s+correct|which\s+of\s+the\s+following/i.test(raw) && statements.length >= 2) {
    const first = statements[0].index;
    const introText = cleanPromptText(raw.slice(0, first));
    const intro = document.createElement("div");
    intro.className = "question-intro";
    intro.append(questionLabel, document.createTextNode(introText));
    questionText.appendChild(intro);

    const list = document.createElement("div");
    list.className = "statement-list";
    statements.forEach((match, index) => {
      const start = match.index + match[0].length;
      const end = index + 1 < statements.length ? statements[index + 1].index : raw.length;
      const value = cleanPromptText(raw.slice(start, end).replace(/\bSelect the correct answer[\s\S]*$/i, "").replace(/\bCodes?\s*:?\s*$/i, ""));
      if (!value) return;
      const line = document.createElement("div");
      line.className = "statement-line";
      const marker = document.createElement("strong");
      marker.textContent = match[1].toLowerCase() + ". ";
      line.append(marker, document.createTextNode(value));
      list.appendChild(line);
    });
    questionText.appendChild(list);
    const tail = raw.slice(statements[statements.length - 1].index).match(/Select the correct answer[\s\S]*$/i);
    if (tail) {
      const note = document.createElement("div");
      note.className = "question-instruction";
      note.textContent = cleanPromptText(tail[0]);
      questionText.appendChild(note);
    }
    return;
  }

  const normal = document.createElement("div");
  normal.className = "question-normal";
  normal.append(questionLabel, document.createTextNode(cleanPromptText(raw)));
  questionText.appendChild(normal);
}

function renderQuestion() {
  optionsList.innerHTML = "";
  feedback.textContent = "";
  feedback.className = "feedback";
  learningPanel.hidden = true;
  learningPanel.innerHTML = "";
  googleQuestionLink.href = "#";

  if (!filteredQuestions.length) {
    unitLabel.textContent = "No matches";
    questionCounter.textContent = "0 questions";
    questionText.textContent = "No questions match your search. Try another keyword or select a different unit.";
    progressBar.style.width = "0%";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    updateStats();
    return;
  }

  const q = filteredQuestions[currentIndex];
  const saved = responses[q.id];
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

  const heading = document.createElement("h3");
  heading.className = "learning-title";
  heading.textContent = "Learn from this question";
  learningPanel.appendChild(heading);

  const correctIndex = ["A", "B", "C", "D"].indexOf(question.answer);
  const correctText = question.options[correctIndex] || "Answer listed in the source key";
  const answerBox = document.createElement("div");
  answerBox.className = "learning-answer";
  const answerHeading = document.createElement("strong");
  answerHeading.textContent = `Correct answer: ${question.answer}. `;
  answerBox.append(answerHeading, document.createTextNode(correctText));
  learningPanel.appendChild(answerBox);

  const note = document.createElement("p");
  note.className = "learning-note";
  note.textContent = "The uploaded question bank provides the answer key but does not include a verified explanation for every option. Use the searches below to check the concept and avoid memorising an unsupported explanation.";
  learningPanel.appendChild(note);

  const listHeading = document.createElement("h4");
  listHeading.textContent = "Option-by-option review";
  learningPanel.appendChild(listHeading);

  const list = document.createElement("div");
  list.className = "option-review-list";
  ["A", "B", "C", "D"].forEach((letter, index) => {
    const optionText = question.options[index] || "";
    const isCorrect = letter === question.answer;
    const row = document.createElement("div");
    row.className = "option-review" + (isCorrect ? " option-review-correct" : "");

    const label = document.createElement("div");
    label.className = "option-review-copy";
    const title = document.createElement("strong");
    title.textContent = `${letter}. ${optionText}`;
    const detail = document.createElement("p");
    detail.textContent = isCorrect
      ? "Marked correct in the uploaded answer key. Verify the concept and why it fits the question."
      : "Distractor option. Check the concept and why it does not best answer this specific question.";
    label.append(title, detail);

    const search = document.createElement("a");
    search.className = "option-search-link";
    search.target = "_blank";
    search.rel = "noopener noreferrer";
    search.textContent = isCorrect ? "Why correct? ↗" : "Why not? ↗";
    search.href = googleSearchUrl(`"${optionText}" "${question.question}" Public Administration explanation`);

    row.append(label, search);
    list.appendChild(row);
  });
  learningPanel.appendChild(list);

  const topicLink = document.createElement("a");
  topicLink.className = "topic-search-link";
  topicLink.target = "_blank";
  topicLink.rel = "noopener noreferrer";
  topicLink.href = googleSearchUrl(`${question.question} Public Administration concept thinkers theory UGC NET`);
  topicLink.textContent = "Explore the related topic on Google ↗";
  learningPanel.appendChild(topicLink);

  if (response.selected !== question.answer) {
    const reminder = document.createElement("p");
    reminder.className = "learning-reminder";
    reminder.textContent = `You selected ${response.selected}. Compare it with ${question.answer}, then review the reasoning before moving on.`;
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

prevBtn.addEventListener("click", () => {
  if (currentIndex > 0) { currentIndex--; renderQuestion(); }
});
nextBtn.addEventListener("click", () => {
  if (currentIndex < filteredQuestions.length - 1) { currentIndex++; renderQuestion(); }
});
unitSelect.addEventListener("change", applyFilters);
searchInput.addEventListener("input", applyFilters);
resetBtn.addEventListener("click", () => {
  responses = {};
  currentIndex = 0;
  renderQuestion();
});

renderQuestion();
