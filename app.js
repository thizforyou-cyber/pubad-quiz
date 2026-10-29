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

function renderQuestion() {
  optionsList.innerHTML = "";
  feedback.textContent = "";
  feedback.className = "feedback";

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
  questionText.textContent = `Q${q.id}. ${q.question}`;
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
  }
  updateStats();
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
