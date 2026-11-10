# Astronomy for Mental Health: Facilitator Course (v3)

A self-guided course for people who know the sky and want to facilitate safe, sky-based wellbeing sessions. Grounded in ACT (Acceptance and Commitment Therapy) and trauma-informed practice. IAU Office of Astronomy for Development.

v3 is a rework of v2 for self-led learning: less reading per screen, more doing. The six stages, 21 units, forms and workbook page references are unchanged, and it reads the same saved progress.

## What changed from v2
- **One idea per screen.** Each unit plays as a run of short screens with a fixed Back / Next bar, instead of four long tabs. The progress strip shows Learn, Try, Check and Note.
- **Practice tools inside the units.** Sort actions into "in my role / outside it", read window-of-tolerance signs, spot the risks in a night plan, turn over three guests, explore the ACT map, try defusion on a thought (never stored), rehearse the hand-off and pivot while the words fade, estimate ten seconds of silence with no clock, a quiet-looking timer with a chime, edit a tour listing.
- **A branching scenario** replaces the single question in 2.2: one heavy moment played from first tears to telling your supervisor.
- **Stronger checks.** Answer order is shuffled per question (in v2 the right answer was almost always the second option), wrong answers stay crossed out, and four units gained a scenario question (2.1, 3.1, 4.1, and an ordering task in 3.6).
- **Quick recall** on the Path page: one question a day from units already finished.
- **Session mode** adds a step-by-step "run" view with large text for use in the dark, and a quiet-looking timer.
- **Navigation:** bottom tabs on phones, top nav on desktop. Light and dark follow the device; Red night view overrides both.
- **Look:** the stage paintings stay; brush fonts and black/lime are replaced by a palette taken from the paintings and three bundled open fonts.

## Fixed along the way
- Review mode no longer marks units complete (the label always said it would not).
- The completion record keeps the date you finished instead of showing today's date.
- Resetting and restoring use in-page confirmation and validation; a bad backup file can no longer set an invalid track.
- The intro text said "five stages"; there are six (0 to 5).
- Storage failures (private windows) are caught and reported instead of breaking the page.
- Sticky header offset was hard-coded and broke when the header wrapped on phones.

## Editing content
All text lives in `js/content.js`; the header comment explains the unit shape and lists the widgets. `js/app.js` renders it, `css/styles.css` styles it. No build step: edit, commit, push.

Unit ids (`1.2`) and form field ids are storage keys. Renaming them loses learners' saved work.

## Links
Pages use plain hashes: `#path`, `#u-1-2`, `#session`, `#run-landing`, `#plan`, `#library`, `#record`. Old v2 links (`#/u/1.2/check`) are redirected.

## Run locally
Serve the folder with any static server, e.g. `npx serve .`, or open `index.html` directly. Works offline.

## Still to review (content added in v3, written from the existing course text)
- The three guest vignettes in 1.1 and the scenario in 2.2 (a guest mentions a bereavement).
- New quiz items in 2.1, 3.1, 4.1; sort and spot-the-risk items in 0.1 and 1.2.
- The sample tour listing in 4.2.
- New confirm in 5.2: "I have run my Sky Mission session."

## Credits
Stage paintings in `assets/wilds/` carried over from v2. Fonts in `fonts/`, all SIL OFL 1.1: Bricolage Grotesque, Atkinson Hyperlegible (Braille Institute), Newsreader.
