# अंक-IT Mathematics Dashboard

**Free-to-start math practice for Class 11 and 12 and for JEE, KCET, NDA and IAT.**
Question bank, previous-year papers (PYQs), DPPs, handwritten handouts and NTA-style online tests, all with full solutions.

**Website: [unkganit.com](https://unkganit.com)**

---

## What you can do here

| Feature | What it gives you |
|---|---|
| **Question Bank** | 16,000+ math questions tagged by chapter, subtopic and level (L1 easy, L2 medium, L3 hard), with full solutions |
| **PYQs** | Past papers from 2000 to 2026: JEE Main, JEE Advanced, AIEEE, IIT-JEE, KCET, IAT and NDA, shift by shift |
| **DPPs** | Ready-made daily practice problems for every subtopic, or build your own by chapter, source, level and question type |
| **Must Solve** | The questions that matter most in each chapter |
| **Handouts** | Handwritten-style revision notes for every chapter |
| **Online tests** | NTA-style exam window, instant results and ranks |
| **For teachers** | Create tests for your school, share one link with the class, see ranked reports and question-wise analysis |

### Free pages anyone can read (no login)

- [Math chapters](https://unkganit.com/maths/): all 24 chapters with subtopics and question counts
- [Exams](https://unkganit.com/exams/): JEE Main, JEE Advanced, IIT-JEE, AIEEE, KCET, NDA and IAT, with chapter-wise and year-wise counts
- Exam guides, for example [JEE Main](https://unkganit.com/exams/jee-main/about/): paper pattern, fees, cutoffs, seats and colleges
- [Syllabus priority](https://unkganit.com/syllabus-priority/), [question counts](https://unkganit.com/question-counts/), [chapter-wise count](https://unkganit.com/chapter-wise-count/) and [chapter weightage](https://unkganit.com/chapter-weightage/)

The public pages show numbers only. The questions and solutions are inside the dashboard after you sign in.

---

## How to start

1. Open **[unkganit.com](https://unkganit.com)** and click **Login**.
2. Sign in with **Google**, or with your **Student ID** if you are an Avanti student.
3. Choose whether you are a **Student** or a **Teacher** (this is saved once and cannot be changed later).
4. Fill in your profile. The dashboard opens at [unkganit.com/dashboard](https://unkganit.com/dashboard).

## Plans

| Plan | Price | Who it is for |
|---|---|---|
| **Free** | ₹0 | Everyone: question bank, DPPs, PYQs, Must Solve and online tests |
| **Premium (students)** | ₹299 a year | Adds PDF downloads and printing, all handouts and all-India ranks |
| **Premium (teachers)** | ₹599 a year | Adds PDF downloads and printing, saved worksheets, My Students and bulk upload |
| **Avanti** | Free | Avanti students and teachers get Premium at no cost |

---

## Help and contact

- Email: **unkganit@gmail.com**
- Contact page: [unkganit.com/contact](https://unkganit.com/contact/)
- Found a wrong question or solution? Email us the question ID or a screenshot.

---

## For developers

This repository is the public website. Hosting is **GitHub Pages**; sign-in, plans, tests and results run on **Supabase**.

| Path | What it is |
|---|---|
| `index.html` | The public home page (generated) |
| `dashboard.html` | The dashboard app (`/dashboard`, not indexed by search engines) |
| `auth.js`, `boot.js`, `portal.js` | Sign-in and plan permissions, loader, profile / tests / results |
| `teacher.b870.js`, `qb/` | Question Bank, DPPs, PYQs, Must Solve and Handouts |
| `site.js`, `site.css`, `login.js`, `weightage.js` | Header, footer and Login pop-up for the public pages |
| `.github/scripts/build_seo.py` | Generates the home page, chapter and exam pages, sitemap and `robots.txt`. Edit this script, not the generated pages |
| `.github/scripts/guard.sh` | Safety check that must pass before every release |
| `supabase/schema.sql` | The whole database (safe to run again) |
| `supabase/functions/` | Edge Functions (`avanti-login`, `razorpay`) |
| `SETUP.md` | Step-by-step setup for Supabase, Google sign-in and Razorpay |
| `CLAUDE.md` | Rules for anyone changing this repository |

Questions, answers, solutions and handouts are **not** in this repository. They live in a private Supabase Storage bucket and are served only to signed-in users, according to their plan.

To rebuild the public pages after a change:

```bash
SEO_VER=<build number> python3 .github/scripts/build_seo.py
bash .github/scripts/guard.sh
```

Only the public publishable key is in this repository. Never commit the Supabase service role key, the database password or Razorpay secrets.

---

© अंक-IT Mathematics Dashboard
