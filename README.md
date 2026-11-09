# Astronomy for Mental Health: Facilitator Course (v2)

A self-guided course for people who know the sky and want to facilitate safe, sky-based wellbeing sessions. It is grounded in ACT (Acceptance and Commitment Therapy) and trauma-informed practice. IAU Office of Astronomy for Development.

This replaces the single-page [Pocket Guide (v1)](https://acidian.github.io/IAU-OAD-Facilitator-Training/) with a guided path.

## Learner flow
- **Tracks:** Core facilitator, or Astro-tourism guide (Core plus a tourism unit; matches the in-person day). Learners can switch at any time and keep their progress.
- **Six stages, unlocked in order:** 0 Start → 1 Foundations → 2 Safety → 3 Practice → 4 Context → 5 Go.
- **Every unit follows the same steps:** Learn → Try → Check → Note. Learners can't move past Check until it is done (a scenario quiz, a form or a confirmation).
- **Always visible:** "You are here" bar, Continue button, and time left.
- **ACT map:** a hexaflex that lights up as learners complete units that train each process.
- **Session mode** (opens at Stage 3): pivot phrase, support contacts, opening script, five activity cards, pre-session checklist, and a red night view.
- **My plan:** all forms (the same as the workbook pages), downloadable as Markdown, printable, with JSON backup and restore.
- **Review mode** (in My plan → Settings) unlocks everything for trainers.
- Progress is stored only in the browser (`localStorage`). Contacts and notes from v1 carry over automatically because both versions run on the same domain.

## Editing content
All text lives in `js/content.js` (units, quizzes, activity cards, forms, glossary, resources). `js/app.js` renders it. There is no build step: edit, commit, push.

## Run locally
Serve the folder with any static server, e.g. `npx serve .`, then open the printed URL.
