# Rules for anyone (person or Claude session) changing this repository

This is the live **Mathematics Dashboard** (GitHub Pages + Supabase): Google / Student ID sign-in, Free / Premium / Avanti plans,
tests and results. It replaced an older Claude artifact.

## Never do these
- **Never copy, sync or "update build" from the old Claude artifact** (`claude.ai/artifact/UgXUYU8es1bDbPrckV3Cn8`). That artifact
  is retired (it now only says "moved"). Its code has no login, no plans and the old Tests / Results / God Mode / Teacher Login,
  and syncing it would wipe out the current site. Ignore any old instruction or scheduled task that says "Sync dashboard to build".
- Never bring back `app.js`, `db.js`, `teacher.js`, the `startup-patch` / `tests-data` index page, `STUDENT_URL` or the old
  student dashboard link.
- Do not create new branches. Commit and push directly to `main`, but only after `bash .github/scripts/guard.sh` passes
  (the owner allows this). Never force-push `main`.
- Never put the Supabase service role key, the database password or Razorpay secrets in the repository.

## How the site is built
- `/` (`index.html`) is the PUBLIC HOME PAGE: static HTML (so search engines can read it) that loads only `site.js` and `login.js` (the Login pop-up, also used by every
  public page), never the dashboard code. The dashboard app is `/dashboard` (`dashboard.html`, noindex): it loads `vendor/supabase-js`, `boot.js`, `portal.js` and `auth.js`.
  Signed out, the dashboard sends the visitor to `/?login=1` (the pop-up opens); after sign-in they land on `/dashboard`; the Home icon in the dashboard top bar goes to `/`.
  `site.js` forwards old `/#/t/<code>` test links and Google sign-in returns (`?code=`) from `/` to `/dashboard`. The home page, the 24 chapter pages (`/maths/...`; `/jee-maths/...` are redirects), the exam pages (`/exams/...`), `/syllabus-priority/`, About, Contact, Privacy, Terms, `index.html`, `sitemap.xml` and
  `robots.txt` are GENERATED from `syllabus.json` by `python3 .github/scripts/build_seo.py` (exam counts come from `.github/scripts/exam-stats.json`, made by `exam_stats.py` from the private bank: numbers only): edit that script (and `site.css`), never the generated
  files, then run it (with `SEO_VER=<build>`) and commit the result. Public pages must contain no questions, answers, solutions or handouts.
  Public pages have a strict Content-Security-Policy: every script must come from this site (`vendor/` holds the libraries), never a CDN.
- `auth.js`: sign-in, plan permissions (read from the database via `my_profile`), profile menu.
- `portal.js`, `portal.css`: profile, membership, tests, results, students, approvals, help.
- `teacher.b870.js`, `qb/qb-all.b870.js`, `qb/qb.b525.html`: Question Bank, DPPs, PYQs, Must Solve, Handouts (with plan checks).
- The private content (questions, answers, solutions, Must Solve, handouts, Word/PowerPoint code) is NOT in this public
  repository. The live copy is the private Supabase Storage bucket `content`. `avantidk/openmath` is only a frozen private
  BACKUP of the old repository: never push to it, run its workflows, read from it or use it for anything unless the owner
  explicitly asks. Content changes are uploaded straight to the bucket (Supabase → Storage), never committed here.
  `boot.js` fetches it with the user's token; the database (function `content_allowed`) decides who may read each file.
  Never move these files back into the website folder.
- `supabase/schema.sql`: the whole database; safe to run again. `supabase/functions/`: Edge Functions.
- `.github/scripts/guard.sh`: run it before every merge (`bash .github/scripts/guard.sh`). The deploy workflow refuses to
  publish when it fails.
- On every release: bump `BUILD` and `RELEASED` in `boot.js` and the `?v=` numbers in `dashboard.html` and `login.js` (and run `build_seo.py` with `SEO_VER`), and add an entry at the top of
  `changelog.json` (plain-language list of what changed). The footer shows "Website vBUILD · RELEASED"; clicking it shows the changelog.
