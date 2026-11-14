# Mathematics Dashboard (Avanti Fellows)

JEE Maths question bank, DPPs, PYQs, Must Solve, handouts, and online tests with results. Hosted on GitHub Pages; sign-in, plans, tests and results run on Supabase.

- `index.html`: the page. Shows only the login page until the user is signed in.
- `auth.js`: Supabase sign-in (Google, and "Login with Avanti ID"), plan permissions, profile menu.
- `portal.js`, `portal.css`: Edit profile, Membership (Razorpay), Create Test, My Tests and Results, Saved worksheets, Available tests, the exam window, My Reports.
- `boot.js`: loads the dashboard after sign-in (with a browser cache; bump `BUILD` on every release).
- `teacher.b531.js`, `app.css`, `skin.b3.css`: Question Bank, DPPs, PYQs, Must Solve and Handouts.
- `qb/`: question bank page, code and data. `handouts/`: handout PDFs.
- `vendor/supabase-js-2.45.4.min.js`: Supabase client (MIT licence).
- `supabase/schema.sql`: the database (paste into the Supabase SQL Editor).
- `supabase/functions/`: Edge Functions `avanti-login` and `razorpay`.
- `SETUP.md`: step-by-step setup for Supabase, Google sign-in and Razorpay.

Only the public publishable key is in this repository. Never commit the service role key, the database password or Razorpay secrets.
