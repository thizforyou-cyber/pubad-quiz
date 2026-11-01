# PYQ Reverse Study — UGC NET Public Administration

This is a separate website section inside the existing `pubad-quiz` GitHub Pages repository. It reuses the original `../questions.js` question bank without editing it.

## Live URL

After GitHub Pages publishes the latest commit, open:

https://thizforyou-cyber.github.io/pubad-quiz/reverse-study/

## Features

- Uses the existing question bank and answer keys unchanged.
- Responsive forest-green and cream design.
- Unit filtering, text search, random question, previous/next navigation.
- Answer reveal, answer-key highlighting, and available explanation fields.
- Generic option notes are explicitly labelled when the source question has no verified distractor explanations.
- Search a question on Google.
- Save difficult questions and track incorrect answers in browser local storage.
- Import verified year-tagged PYQs from JSON, separately from the existing bank.
- Year-wise archive and downloadable import template.
- Basic installable/offline PWA support on HTTPS when the browser supports it.

## Publish

1. The files live in `reverse-study/` in the existing repository.
2. Open the repository's **Settings → Pages** and confirm it publishes from the `main` branch and root folder (the existing setting).
3. Wait for the GitHub Pages deployment to finish, then open the live URL above.

No changes are made to `questions.js` or its original answer keys.

## Import year-wise PYQs

1. Open **Import & Guide** in the website.
2. Download the JSON template.
3. Replace the example with verified question records from a specific exam year.
4. Keep `year`, `question`, `options`, and `answer` for each question. Add `explanation`, `optionAnalysis`, `relatedTopics`, and `source` when verified information is available.
5. Choose the edited JSON file. It is stored in that browser only; keep your JSON file as a backup or import it on other devices.

The existing bank does not provide reliable year metadata for every question, so the site never assigns guessed years to those questions. Imported questions are local to the browser and are not committed back to GitHub.

## Important limitations

- This is a static website; it has no login or cloud sync.
- Bookmarks, statistics, and imported papers are stored in the current browser only.
- Explanations and option analyses appear only when included in the question record. Where the source bank lacks this material, the app says so instead of inventing specific facts.
