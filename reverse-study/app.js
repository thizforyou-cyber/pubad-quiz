(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const STORAGE = { papers: "paReverseStudy.papers.v1", stats: "paReverseStudy.stats.v1", saved: "paReverseStudy.saved.v1" };
  const LETTERS = ["A", "B", "C", "D", "E", "F"];
  const units = {
    1:"Introduction to Public Administration",2:"Administrative Thought",3:"Indian Administration",
    4:"State & District Administration",5:"Comparative & Development Administration",
    6:"Economic & Financial Administration",7:"Social Welfare Administration",8:"Public Policy",
    9:"Governance & Good Governance",10:"Research Methodology"
  };
  let baseQuestions = (typeof QUESTIONS !== "undefined" && Array.isArray(QUESTIONS)) ? QUESTIONS.map(q => ({...q, _source:"bank"})) : [];
  let importedQuestions = readJSON(STORAGE.papers, []);
  let stats = readJSON(STORAGE.stats, {});
  let saved = readJSON(STORAGE.saved, []);
  let current = 0, selectedAnswer = null, revealed = false, activeView = "study", deferredInstall = null;
  const normalize = (q, source) => ({
    ...q,
    id: String(q.id ?? (source + "-" + Math.random().toString(36).slice(2,8))),
    unit: Number(q.unit || 0),
    year: q.year ? Number(q.year) : null,
    options: Array.isArray(q.options) ? q.options : [],
    answer: String(q.answer || "").trim().toUpperCase(),
    _source: source
  });
  baseQuestions = baseQuestions.map(q => normalize(q, "bank"));
  importedQuestions = importedQuestions.map(q => normalize(q, "year"));
  let filtered = [];
  function readJSON(key, fallback) { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } }
  function writeJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  function escapeHTML(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function allQuestions() { return [...baseQuestions, ...importedQuestions]; }
  function lettersFor(q) { return q.options.map((_, i) => LETTERS[i]); }
  function correctIndex(q) {
    if (/^[A-F]$/.test(q.answer)) return LETTERS.indexOf(q.answer);
    if (/^\d+$/.test(q.answer)) return Number(q.answer) - 1;
    return -1;
  }
  function initFilters() {
    const unitSelects = [$("#unitFilter"), $("#yearUnitFilter")];
    unitSelects.forEach(select => {
      Object.entries(units).forEach(([n, title]) => {
        const opt = document.createElement("option"); opt.value = n; opt.textContent = "Unit " + n + " · " + title; select.appendChild(opt);
      });
    });
    refreshCounts(); applyFilters();
  }
  function refreshCounts() {
    $("#totalCount").textContent = allQuestions().length.toLocaleString();
    const attempts = Object.values(stats).filter(x => x && x.attempted).length;
    const correct = Object.values(stats).filter(x => x && x.attempted && x.correct).length;
    $("#attemptCount").textContent = attempts;
    $("#accuracy").textContent = attempts ? Math.round(correct / attempts * 100) + "%" : "—";
    const years = [...new Set(importedQuestions.map(q => q.year).filter(Boolean))].sort((a,b) => b-a);
    const yf = $("#yearFilter"); const old = yf.value;
    yf.innerHTML = '<option value="all">All years</option>';
    years.forEach(year => { const o=document.createElement("option"); o.value=String(year); o.textContent=String(year); yf.appendChild(o); });
    if (years.includes(Number(old))) yf.value = old;
  }
  function applyFilters() {
    const source = $("#sourceFilter").value;
    const unit = $("#unitFilter").value;
    const search = $("#searchInput").value.trim().toLowerCase();
    filtered = allQuestions().filter(q => {
      if (source === "bank" && q._source !== "bank") return false;
      if (source === "year" && !q.year) return false;
      if (unit !== "all" && String(q.unit) !== unit) return false;
      if (search) {
        const haystack = [q.question, ...(q.options || []), q.explanation, ...(q.relatedTopics || [])].join(" ").toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
    if (current >= filtered.length) current = Math.max(0, filtered.length - 1);
    renderQuestion();
  }
  function renderQuestion() {
    const root = $("#questionArea");
    if (!filtered.length) {
      root.innerHTML = '<div class="empty-state">No questions match these filters. Try another unit or search term.</div>';
      $("#positionLabel").textContent = "No questions"; return;
    }
    const q = filtered[current];
    selectedAnswer = null; revealed = false;
    const meta = [
      '<span class="pill">' + (q.year ? escapeHTML(q.year) + " PYQ" : "Question bank") + '</span>',
      '<span class="pill">Unit ' + (q.unit || "—") + (units[q.unit] ? " · " + escapeHTML(units[q.unit]) : "") + '</span>',
      q.exam ? '<span class="pill gold">' + escapeHTML(q.exam) + '</span>' : ''
    ].join("");
    const options = q.options.map((option, i) => '<button type="button" class="option" data-index="' + i + '"><span class="option-letter">' + LETTERS[i] + '</span><span>' + escapeHTML(option) + '</span></button>').join("");
    root.innerHTML = '<div class="question-meta">' + meta + '</div><h2 class="question-title">' + escapeHTML(q.question) + '</h2><div class="options">' + options + '</div><div class="answer-actions"><button id="revealBtn" class="btn btn-primary" type="button">Reveal answer & reverse study</button><button id="bookmarkBtn" class="btn btn-outline" type="button">' + (saved.includes(q.id) ? "★ Saved" : "☆ Save for revision") + '</button><button id="googleBtn" class="btn btn-outline" type="button">Search this question ↗</button></div><div id="explanationArea"></div>';
    root.querySelectorAll(".option").forEach(btn => btn.addEventListener("click", () => chooseAnswer(Number(btn.dataset.index))));
    $("#revealBtn").addEventListener("click", () => reveal(q));
    $("#bookmarkBtn").addEventListener("click", () => toggleSaved(q.id));
    $("#googleBtn").addEventListener("click", () => window.open("https://www.google.com/search?q=" + encodeURIComponent(q.question), "_blank", "noopener"));
    $("#positionLabel").textContent = "Question " + (current + 1) + " of " + filtered.length;
    $("#prevBtn").disabled = current === 0; $("#nextBtn").disabled = current >= filtered.length - 1;
  }
  function chooseAnswer(index) {
    if (revealed || !filtered.length) return;
    selectedAnswer = index;
    const q = filtered[current], correct = correctIndex(q);
    if (correct >= 0) {
      const result = {attempted:true, correct:index===correct, selected:LETTERS[index], answer:q.answer, time:Date.now()};
      stats[q.id] = result; writeJSON(STORAGE.stats, stats); refreshCounts();
    }
    $("#questionArea").querySelectorAll(".option").forEach(btn => {
      btn.classList.toggle("selected", Number(btn.dataset.index) === index);
    });
  }
  function optionExplanation(q, letter, index, correct) {
    const given = q.optionAnalysis || q.option_explanations || {};
    if (given[letter]) return given[letter];
    if (index === correct) return "This is marked as the correct answer in the supplied question bank. Review the concept explanation and verify against the original paper if needed.";
    return "This option may relate to another thinker, theory or concept. The source question bank does not provide a verified explanation for this distractor, so do not assume a specific connection without checking.";
  }
  function reveal(q) {
    revealed = true;
    const correct = correctIndex(q);
    $("#questionArea").querySelectorAll(".option").forEach(btn => {
      const i = Number(btn.dataset.index); btn.disabled = true;
      btn.classList.toggle("correct", correct >= 0 && i === correct);
      btn.classList.toggle("wrong", selectedAnswer === i && correct >= 0 && i !== correct);
    });
    const analysis = q.options.map((_, i) => '<div class="analysis-item"><strong>' + LETTERS[i] + (i === correct ? ' · Correct answer' : '') + '</strong>' + escapeHTML(optionExplanation(q, LETTERS[i], i, correct)) + '</div>').join("");
    const related = (q.relatedTopics || q.related_topics || []).map(t => '<span>' + escapeHTML(t) + '</span>').join("");
    const explanation = q.explanation || q.rationale || q.description || "No detailed explanation was included with this question. Use the question text and answer key as a starting point, then confirm the concept with your study notes or a reliable academic source.";
    $("#explanationArea").innerHTML = '<div class="explanation"><h3>Correct answer: ' + (correct >= 0 ? LETTERS[correct] + " — " + escapeHTML(q.options[correct] || "") : escapeHTML(q.answer || "Not supplied")) + '</h3>' + (selectedAnswer === null ? '<p>You revealed the answer without selecting an option.</p>' : '<p><strong>Your response:</strong> ' + LETTERS[selectedAnswer] + (correct >= 0 ? (selectedAnswer === correct ? ' · Correct.' : ' · Not correct.') : '') + '</p>') + '<h3>Concept explanation</h3><p>' + escapeHTML(explanation) + '</p><h3>Option-by-option analysis</h3><div class="analysis-grid">' + analysis + '</div>' + (related ? '<h3>Related topics to revise</h3><div class="related">' + related + '</div>' : '') + (q.source ? '<p class="status">Source: ' + escapeHTML(q.source) + '</p>' : '') + '<p class="status">Study note: explanations absent from the source bank are clearly marked as unprovided; confirm answer keys and facts against trusted material.</p></div>';
    $("#revealBtn").textContent = "Answer revealed";
    $("#revealBtn").disabled = true;
  }
  function toggleSaved(id) {
    saved = saved.includes(id) ? saved.filter(x => x !== id) : [...saved, id];
    writeJSON(STORAGE.saved, saved); renderQuestion();
  }
  function changeQuestion(delta) {
    if (!filtered.length) return;
    current = Math.min(filtered.length - 1, Math.max(0, current + delta));
    renderQuestion(); window.scrollTo({top:0, behavior:"smooth"});
  }
  function showView(view) {
    activeView = view;
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === view));
    ["study","years","mistakes","guide"].forEach(name => $("#" + name + "View").classList.toggle("hidden", name !== view));
    if (view === "years") renderYears();
    if (view === "mistakes") renderMistakes();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function renderYears() {
    const year = $("#yearFilter").value, unit = $("#yearUnitFilter").value;
    const list = importedQuestions.filter(q => (year === "all" || String(q.year) === year) && (unit === "all" || String(q.unit) === unit));
    const root = $("#yearList");
    if (!list.length) { root.innerHTML = '<div class="empty-state">No year-tagged questions imported yet. Open <strong>Import & Guide</strong> to add a verified paper.</div>'; return; }
    root.innerHTML = list.map(q => '<article class="list-card"><div><h3>' + escapeHTML(q.year + " · " + (q.exam || "UGC NET Public Administration")) + '</h3><p>' + escapeHTML(q.question) + '</p><p>Unit ' + (q.unit || "—") + (q.source ? " · " + escapeHTML(q.source) : "") + '</p></div><button class="btn btn-primary" data-open="' + escapeHTML(q.id) + '" type="button">Study question</button></article>').join("");
    root.querySelectorAll("[data-open]").forEach(btn => btn.addEventListener("click", () => {
      $("#sourceFilter").value = "year"; $("#unitFilter").value = "all"; $("#searchInput").value = "";
      applyFilters(); current = filtered.findIndex(q => q.id === btn.dataset.open); if (current < 0) current=0;
      showView("study"); renderQuestion();
    }));
  }
  function renderMistakes() {
    const ids = new Set([...saved, ...Object.entries(stats).filter(([,s]) => s && s.attempted && !s.correct).map(([id]) => id)]);
    const list = allQuestions().filter(q => ids.has(q.id));
    const root = $("#mistakeList");
    if (!list.length) { root.innerHTML = '<div class="empty-state">Your mistake book is empty. Save difficult questions or answer a few questions to start building your revision list.</div>'; return; }
    root.innerHTML = list.map(q => '<article class="list-card"><div><h3>' + escapeHTML(q.year ? q.year + " PYQ" : "Question bank") + ' · Unit ' + (q.unit || "—") + '</h3><p>' + escapeHTML(q.question) + '</p></div><button class="btn btn-primary" data-open="' + escapeHTML(q.id) + '" type="button">Revise</button></article>').join("");
    root.querySelectorAll("[data-open]").forEach(btn => btn.addEventListener("click", () => {
      $("#sourceFilter").value = "all"; $("#unitFilter").value = "all"; $("#searchInput").value = "";
      applyFilters(); current = filtered.findIndex(q => q.id === btn.dataset.open); if (current < 0) current=0;
      showView("study"); renderQuestion();
    }));
  }
  function importFile(file) {
    const status = $("#importStatus");
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const records = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.questions) ? parsed.questions : null);
        if (!records || !records.length) throw new Error("The file must contain a non-empty array of question objects.");
        const valid = records.filter(q => q && q.question && Array.isArray(q.options) && q.options.length >= 2 && q.answer);
        if (!valid.length) throw new Error("No valid questions found. Each question needs question, options and answer fields.");
        const cleaned = valid.map((q, i) => {
          if (!q.year || !Number.isFinite(Number(q.year))) throw new Error("Every imported year-wise question must include a valid year.");
          return normalize({...q, id:String(q.id || ("import-" + q.year + "-" + Date.now() + "-" + i)), year:Number(q.year)}, "year");
        });
        const map = new Map(importedQuestions.map(q => [q.id, q]));
        cleaned.forEach(q => map.set(q.id, q));
        importedQuestions = [...map.values()]; writeJSON(STORAGE.papers, importedQuestions);
        refreshCounts(); renderYears(); status.textContent = "Imported " + cleaned.length + " question(s). They are saved in this browser and can be found under Year-wise PYQs.";
        $("#importFile").value = "";
      } catch (error) { status.textContent = "Import failed: " + error.message; }
    };
    reader.readAsText(file);
  }
  function downloadTemplate() {
    const template = [{
      id:"2026-pa-example-1", year:2026, exam:"UGC NET Public Administration", unit:5,
      question:"Replace this with a verified question from the paper.",
      options:["Option A","Option B","Option C","Option D"], answer:"B",
      explanation:"Add a verified explanation for the correct answer.",
      optionAnalysis:{A:"Explain this option.",B:"Explain why this is correct.",C:"Explain this option.",D:"Explain this option."},
      relatedTopics:["Add related topics"], source:"Add paper name or source"
    }];
    const blob = new Blob([JSON.stringify(template,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href=url; a.download="pyq-reverse-study-template.json"; a.click(); URL.revokeObjectURL(url);
  }
  document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.view)));
  $("#sourceFilter").addEventListener("change", () => {current=0;applyFilters();});
  $("#unitFilter").addEventListener("change", () => {current=0;applyFilters();});
  $("#searchInput").addEventListener("input", () => {current=0;applyFilters();});
  $("#prevBtn").addEventListener("click", () => changeQuestion(-1));
  $("#nextBtn").addEventListener("click", () => changeQuestion(1));
  $("#randomBtn").addEventListener("click", () => { if(filtered.length){current=Math.floor(Math.random()*filtered.length);renderQuestion();window.scrollTo({top:0,behavior:"smooth"});} });
  $("#yearFilter").addEventListener("change", renderYears); $("#yearUnitFilter").addEventListener("change", renderYears);
  $("#importFile").addEventListener("change", e => importFile(e.target.files[0]));
  $("#downloadTemplate").addEventListener("click", downloadTemplate);
  $("#clearMistakesBtn").addEventListener("click", () => { if(confirm("Clear saved bookmarks and incorrect-answer history from this browser?")) { saved=[]; stats={}; writeJSON(STORAGE.saved,saved);writeJSON(STORAGE.stats,stats);refreshCounts();renderMistakes(); }});
  window.addEventListener("beforeinstallprompt", e => {e.preventDefault();deferredInstall=e;$("#installBtn").classList.remove("hidden");});
  $("#installBtn").addEventListener("click", async () => { if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("#installBtn").classList.add("hidden");});
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(()=>{}));
  initFilters();
})();