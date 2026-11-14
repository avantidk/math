# Setup: Supabase, Google sign-in and Razorpay

Do these steps once, in this order. They take about 30 minutes. You never need to put a secret key in the website or in GitHub.

Your addresses:
- Website: `https://avantidk.github.io/math/` (if your GitHub Pages address is different, use yours everywhere below)
- Supabase project: `https://usehxhvzhdbcmnmqaxoo.supabase.co`

---

## 1. Database (Supabase)

1. Open https://supabase.com/dashboard and open your project.
2. In the left menu click **SQL Editor**, then **+ New query**.
3. Open `supabase/schema.sql` from this repository, copy all of it, paste it into the editor and click **Run**.
4. It should end with "Success. No rows returned". You can run it again later; it is safe.

What it changes:
- **Dropped:** the old tables `tests` and `test_results`, and the old functions `teacher_login` and `student_login`.
- **Moved, not deleted:** the old tables `teachers`, `students` and `saved_worksheets` are moved into a private schema called `legacy`, so the website cannot see them but nothing is lost. When you are sure you do not need them, run `drop schema legacy cascade;`.
- **Added:** `profiles`, `payments`, `student_allowlist` (+ `student_allowlist_import`), `worksheets`, `tests` (with a unique share code), `attempts`, `attempt_items`, plus login-attempt and helper tables. Row-level security is on for every table.

## 2. The Avanti ID allow-list

1. Make a CSV file with these column headings exactly: `avanti_id,dob,full_name,school,class,stream,category,gender`
   Dates can be `2008-05-14` or `14-05-2008`. Category: General, EWS, OBC-NCL, SC or ST. Gender: Female, Male, Other or Prefer not to say.
   Example row: `2401234567,14-05-2008,Priya Sharma,JNV Pune,11,PCM,OBC-NCL,Female`
2. In Supabase click **Table Editor** → table **student_allowlist_import** → **Insert** → **Import data from CSV** → choose your file → **Import data**.
3. Go to **SQL Editor** → **+ New query**, paste `select public.allowlist_load_import();` and click **Run**. It shows how many students were added, stores each date of birth only as a hash, and empties the import table.
4. To add one student by hand: `select public.allowlist_add('2401234567', '14-05-2008', 'Priya Sharma', 'JNV Pune', '11', 'PCM', 'OBC-NCL', 'Female');`

Five wrong dates of birth lock that Avanti ID for 15 minutes; 20 failures from one network block it for 15 minutes.

## 3. Edge Functions (server code)

Do this twice, once for each function.

1. In Supabase click **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Name it exactly `avanti-login`. Delete the sample code, paste the whole of `supabase/functions/avanti-login/index.ts`, click **Deploy function**.
3. Open the function, click **Details**, turn **off** "Verify JWT with legacy secret" (also called "Enforce JWT verification"), click **Save**.
4. Repeat steps 1 to 3 with the name `razorpay` and the file `supabase/functions/razorpay/index.ts`.

(Verify JWT must be off: Razorpay cannot send a Supabase login, and the website's publishable key is not a JWT. Both functions check the user themselves.)

## 4. Google sign-in

Google is already switched on in your Supabase project. Check that it has your own Google keys and the right addresses:

**In Google Cloud** (https://console.cloud.google.com, signed in with the Avanti account that should own this):
1. Pick or create a project at the top. Click **APIs & Services** → **OAuth consent screen** (also called **Google Auth Platform → Branding**). Fill in the app name "Mathematics Dashboard", your support email, and save. Under **Audience**, choose **External** and click **Publish app** so anyone with Gmail can sign in.
2. Click **Clients** (or **Credentials** → **+ Create credentials** → **OAuth client ID**). Application type: **Web application**.
3. **Authorized JavaScript origins:** add `https://avantidk.github.io`
4. **Authorized redirect URIs:** add `https://usehxhvzhdbcmnmqaxoo.supabase.co/auth/v1/callback`
5. Click **Create**. Copy the **Client ID** and **Client secret**.

**In Supabase:**
1. **Authentication** → **Sign In / Providers** → **Google** → turn it on, paste the Client ID and Client secret → **Save**.
2. **Authentication** → **URL Configuration**: set **Site URL** to `https://avantidk.github.io/math/`. Under **Redirect URLs** click **Add URL** and add `https://avantidk.github.io/math/**`. Click **Save**.
3. Leave the **Email** provider on (the Avanti ID login uses it inside the server). The database refuses every email/password sign-up, so only Google and Avanti ID accounts can be created.

Staff: anyone who signs in with a verified Google account ending in `@avantifellows.org` becomes Staff (full access) automatically.

## 5. Razorpay (Premium for one year: students Rs. 299, teachers Rs. 599)

Razorpay is the simplest choice for Indian payments (UPI, cards, net banking). Cashfree works the same way if you prefer it, but the code here is for Razorpay.

1. Sign up at https://dashboard.razorpay.com. Start in **Test Mode** (toggle at the top).
2. **Account & Settings** → **API Keys** → **Generate Key**. Copy the **Key Id** and **Key Secret**.
3. In Supabase: **Edge Functions** → **Secrets** (or **Manage secrets**) → add:
   - `RAZORPAY_KEY_ID` = your Key Id
   - `RAZORPAY_KEY_SECRET` = your Key Secret
   - `RAZORPAY_WEBHOOK_SECRET` = make up a long password (letters and numbers) and keep it for the next step
   - (optional) `PRICE_STUDENT_PAISE` = `29900` (Rs. 299) and `PRICE_TEACHER_PAISE` = `59900` (Rs. 599). Leave them out to use these prices.
4. In Razorpay: **Account & Settings** → **Webhooks** → **+ Add New Webhook**:
   - Webhook URL: `https://usehxhvzhdbcmnmqaxoo.supabase.co/functions/v1/razorpay`
   - Secret: the same made-up password as `RAZORPAY_WEBHOOK_SECRET`
   - Active events: tick `payment.captured`, `payment.failed` and `order.paid`
   - Click **Create Webhook**.
5. Test: sign in as a normal Gmail user, open the profile icon → **Purchase membership** → pay with Razorpay's test card or test UPI (`success@razorpay`). The menu should change to Premium within a few seconds.
6. To take real money: complete Razorpay's activation (KYC), switch to **Live Mode**, generate Live keys, put them into the same two Supabase secrets, and add the same webhook again in Live Mode.

Premium is given only after the server checks Razorpay's signature (and the signed webhook). A failed or abandoned payment leaves the user on Free. When the year ends, the account drops to Free by itself.

## 6. Check it works

1. Open the website in a private window: only the login page shows.
2. Sign in with an `@avantifellows.org` Google account: profile menu shows **Staff**; Create Test, My Tests and Results, Saved worksheets are there; Question Bank shows the Attention filter.
3. Sign in with a normal Gmail as Teacher: plan is Free; Must Solve opens without download buttons; in Handouts only the first chapter of each class has View (the rest show Premium).
4. Sign in with an Avanti ID from the allow-list: Available tests and My Reports are in the menu.

## Good to know

- School dropdowns (Edit profile, Create Test) list every school on the Avanti allow-list. To add a school, add its students to the list.
- Students who sign in with Avanti ID cannot edit their details: name, school, class, stream, category and gender come from the allow-list and are refreshed at every sign-in (and whenever the list is loaded again).
- Google-sign-in students must fill in name, school, class, stream, category and gender before using the site; category and gender appear in test results and the CSV.
- Plans, roles, tests and results are enforced by the database. The question files (`qb/data/*.json`) and handout PDFs are public files on GitHub Pages: the site hides and blocks downloads for Free users, but someone who knows the file address could still open it. To lock those too, they would need to move into Supabase Storage.
- A user's Teacher/Student choice is saved at their first sign-in. To change it later: SQL Editor → `update public.profiles set role = 'teacher' where email = 'name@gmail.com';`
- Give someone Premium by hand: `update public.profiles set premium_until = now() + interval '1 year', plan = 'premium' where email = 'name@gmail.com';`

## Google sign-in screen shows the Supabase address

Google shows "Sign in to usehxhvzhdbcmnmqaxoo.supabase.co" because that is where Google sends people back after sign-in. To show "Sign in to Math Dashboard" instead, Google needs a sign-in address on a domain Avanti owns, and a verified app brand:
1. Supabase → **Project Settings** → **Custom Domains** (needs the paid Pro plan plus the custom-domain add-on): add e.g. `auth.avantifellows.org`, add the DNS records it shows, and activate it.
2. In Google Cloud → **Google Auth Platform** → **Branding**: App name "Math Dashboard", add the logo, add `avantifellows.org` under **Authorized domains**, then **Verify branding**. In **Clients**, add `https://auth.avantifellows.org/auth/v1/callback` as a redirect URI.
3. Tell Claude the new address so the website uses it.

## Plans

| | Free | Premium (paid, 1 year) |
|---|---|---|
| Students | View everything, take their school's tests, report with their school rank | Rs. 299: + PDF downloads, rank among all students |
| Teachers | View everything, create tests for their school, add students one by one, results of their own tests | Rs. 599: + PDF downloads, saved worksheets, My Students (list by class/batch with performance), bulk upload from Excel/CSV, edit students, CSV export |

- Students on the Avanti list (Avanti ID login) are Premium automatically. Students a teacher adds are Free unless they pay.
- Avanti teachers (@avantifellows.org Google accounts) have full access to everything.
- A teacher's tests are only for students of the teacher's school. The school cannot be changed after it is set (Staff can change it in the SQL Editor: `update public.profiles set school = 'New School' where email = 'name@gmail.com';`).
- Students added by teachers sign in with "Login with Avanti ID / Student ID" using their Student ID and date of birth.

## Teacher school approval

- New teachers choose their school, then wait for approval. Until then they can do everything except edit existing students.
- Approve them in the profile menu → **Teacher approvals** (only for admins: verified @avantifellows.org accounts in the `app_admins` table; `ankitkamboj@avantifellows.org` is added by schema.sql). To add another admin: `insert into public.app_admins (email) values ('name@avantifellows.org');`
- "Not approve" asks the teacher to choose the school again and shows them your message.
- Students added by an Avanti teacher (@avantifellows.org) are Premium; students added by any other teacher are Free.

## Help & Support contact

Shown in the profile menu → **Help & Support** and on the login page. Change it any time in the SQL Editor:
`update public.app_settings set value = '+91 98765 43210' where key = 'support_phone';`
`update public.app_settings set value = 'name@avantifellows.org' where key = 'support_email';`

## Protecting the live site (do this once)

The old Claude artifact is retired. Its page only says the dashboard has moved. Three layers stop old code reaching the live site:

1. **CLAUDE.md** tells every Claude session never to sync from the old artifact, and to push to `main` only after the guard passes.
2. **The guard** (`.github/scripts/guard.sh`) runs on every push. It fails if the code looks like the old artifact version.
3. **Deploy only through the guard:** GitHub → repository **Settings** → **Pages** → *Build and deployment* → **Source: GitHub Actions**.
   From then on the site is published by the "Deploy site" workflow, which stops if the guard fails.
4. **Optional, protect main from being wiped:** GitHub → **Settings** → **Rules** → **Rulesets** → **New branch ruleset**:
   name `Protect main`, Enforcement **Active**, Target branches → **Include default branch**, tick **Restrict deletions** and
   **Block force pushes** → **Create**. Direct pushes stay allowed; anything that fails the guard is simply never published.

## Classes, streams and sessions

- Classes: 11, 12, Dropper. Streams: JEE, NEET, KCET (PCM), KCET (PCB). Uploads also accept 11th, XI, 12th, XII, PCM (= JEE), PCB (= NEET).
- Session is filled from the class for the academic year starting in April: Class 11 → 2026-28, Class 12 and Dropper → 2026-27.
- A test is open only to the school, classes and streams the teacher chose. Only the admin can make a test for another school or all schools.
- The admin (`ankitkamboj@avantifellows.org`) sees every school's students, every test and every report. Other Avanti teachers see only their own school.
