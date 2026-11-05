# Math Teacher Dashboard

Source files of the Math Teacher Dashboard artifact (https://claude.ai/artifact/UgXUYU8es1bDbPrckV3Cn8): JEE Maths question bank, DPP library, test maker and handouts.

- `index.html`: the page
- `teacher.js`, `app.js`, `app.css`: dashboard code and styles
- `qb/`: question bank page, code and data (PYQ, non-PYQ, solutions, figures)
- `handouts/`: chapter handout PDFs
- `*.bNNN.js` / `*.bNNN.html`: build versions. Only the ones the page loads are in git (`teacher.b507.js`, `qb/qb-all.b509.js`, `qb/qb.b492.html`, plus fallbacks `qb/qb.b491.html`, `qb/qb-all.b491.js`, `office.b4.js`, `mathdoc.b3.js`). Older builds stay in the artifact but are ignored by `.gitignore`.

Some features (sign-in, saving tests, the shared database) use the Claude artifact runtime and only work when the page runs as a claude.ai artifact.
