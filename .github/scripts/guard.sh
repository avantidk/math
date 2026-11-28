#!/usr/bin/env bash
# Site guard: fails if the code looks like the old Claude-artifact version (or anything that would undo
# login, plans and permissions). The deploy workflow only publishes when this passes.
set -u
fail=0
bad() { echo "::error::$1"; fail=1; }

for f in index.html qbank.html dashboard.html dash.js dash-list.js dash.css chrome.js auth.js portal.js portal.css boot.js teacher.b870.js qb/qb-all.b870.js qb/qb.b525.html vendor/supabase-js-2.45.4.min.js supabase/schema.sql; do
  [ -f "$f" ] || bad "Missing $f. The site needs it for sign-in, plans or tests."
done
for f in app.js db.js teacher.js; do
  [ -f "$f" ] && bad "$f is back. It belongs to the old artifact version and must not be published."
done
if [ -f qbank.html ]; then
  for s in 'auth.js' 'portal.js' 'boot.js' 'vendor/supabase-js'; do
    grep -q "$s" qbank.html || bad "qbank.html does not load $s, so the login page would be skipped."
  done
  grep -q 'startup-patch\|tests-data' qbank.html index.html && bad "index.html or qbank.html is the old artifact page (startup-patch / tests-data)."
fi
grep -q 'dash.js' dashboard.html 2>/dev/null || bad "dashboard.html does not load dash.js (the new dashboard)."
grep -q 'auth.js' index.html 2>/dev/null && bad "index.html (the public home page) must not load the dashboard code (auth.js). The question-bank app is qbank.html."
[ -f site.js ] && [ -f site.css ] && [ -f login.js ] || bad "site.js / site.css / login.js are missing: the public home page and the Login pop-up need them."
grep -q 'id="features"' index.html 2>/dev/null || bad "index.html lost the public home page. Run python3 .github/scripts/build_seo.py."
LIVE="qbank.html dashboard.html dash.js dash-list.js chrome.js boot.js auth.js portal.js teacher.b870.js qb/qb-all.b870.js qb/qb.b525.html"
for s in 'JrF7haaQnwBT8Jh5QPCMcF' 'STUDENT_URL' 'teacher_login' 'student_login' 'renderGod' 'renderResults' 'syncStudents' "claude.use('artifact')"; do
  grep -l -F "$s" $LIVE 2>/dev/null | while read -r f; do echo "::error::$f contains '$s' from the old Tests / Results / student-dashboard code."; done
  grep -q -F "$s" $LIVE 2>/dev/null && fail=1
done
grep -q 'gatedDownloads' teacher.b870.js 2>/dev/null || bad "teacher.b870.js lost the plan checks on downloads (gatedDownloads)."
grep -q 'QBP(' qb/qb-all.b870.js 2>/dev/null || bad "qb/qb-all.b870.js lost the plan checks (QBP)."
grep -q 'my_profile' auth.js 2>/dev/null || bad "auth.js no longer reads the plan from the database."

# Private content (questions, answers, solutions, Must Solve, handouts, Word/PowerPoint code) lives only in content/ and in
# Supabase Storage. It must never be served by the website.
for f in qb/data must.json bank-meta.json handouts office.js mathdoc.js office.b9.js mathdoc.b3.js sol.json; do
  [ -e "$f" ] && bad "$f is in the website folder. Private content belongs in content/ (served from Supabase with plan checks)."
done
grep -q 'storage/v1/object/authenticated/content' boot.js 2>/dev/null || bad "boot.js no longer loads the content from Supabase Storage with the user's token."
grep -q 'Content-Security-Policy' qbank.html 2>/dev/null && grep -q 'Content-Security-Policy' index.html 2>/dev/null || bad "index.html or qbank.html lost its Content-Security-Policy."
grep -l -E 'https://(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com)' $LIVE 2>/dev/null | while read -r f; do echo "::error::$f loads code from a CDN. Libraries must be in vendor/ (the security policy blocks other sites)."; done
grep -q -E 'https://(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com)' $LIVE 2>/dev/null && fail=1
for s in 'function public.content_allowed' 'function public.approved_school' "v_keys := not v_mine or now() >= a.started_at + make_interval(mins" "source = 'avanti'"; do
  grep -q -F "$s" supabase/schema.sql || bad "supabase/schema.sql lost a security rule ($s)."
done

# Single-question pages (/q/<slug>/): one question only. They must never link to another question or list questions.
for f in q/*/index.html; do
  [ -f "$f" ] || continue
  grep -q 'http-equiv="refresh"' "$f" && continue   # a moved-address stub that only points to the new page of the same question
  grep -E -o 'href="(\.\./[a-z0-9][^"]*|[^"#]*q/[^"#]*)"' "$f" | grep -v -F "/q/$(basename "$(dirname "$f")")/" | grep -q . && bad "$f links to another question page. A /q/ page must show one question only."
  [ "$(grep -c 'class="qp-card"' "$f")" -le 3 ] || bad "$f shows more than one question card."
done

if [ "$fail" = 1 ]; then
  echo "Guard FAILED: this version is not published. See SETUP.md, section 'Protecting the live site'."
  exit 1
fi
echo "Guard passed."
