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
- `index.html` loads `vendor/supabase-js`, `boot.js`, `portal.js`, `auth.js`. Nothing shows before sign-in.
- `auth.js`: sign-in, plan permissions (read from the database via `my_profile`), profile menu.
- `portal.js`, `portal.css`: profile, membership, tests, results, students, approvals, help.
- `teacher.b531.js`, `qb/qb-all.b537.js`, `qb/qb.b525.html`: Question Bank, DPPs, PYQs, Must Solve, Handouts (with plan checks).
- `supabase/schema.sql`: the whole database; safe to run again. `supabase/functions/`: Edge Functions.
- `.github/scripts/guard.sh`: run it before every merge (`bash .github/scripts/guard.sh`). The deploy workflow refuses to
  publish when it fails.
- On every release: bump `BUILD` and `RELEASED` in `boot.js` and the `?v=` numbers in `index.html`, and add an entry at the top of
  `changelog.json` (plain-language list of what changed). The footer shows "Website vBUILD · RELEASED"; clicking it shows the changelog.
