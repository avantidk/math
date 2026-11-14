#!/usr/bin/env bash
# Site guard: fails if the code looks like the old Claude-artifact version (or anything that would undo
# login, plans and permissions). The deploy workflow only publishes when this passes.
set -u
fail=0
bad() { echo "::error::$1"; fail=1; }

for f in index.html auth.js portal.js portal.css boot.js teacher.b531.js qb/qb-all.b537.js qb/qb.b525.html vendor/supabase-js-2.45.4.min.js supabase/schema.sql; do
  [ -f "$f" ] || bad "Missing $f. The site needs it for sign-in, plans or tests."
done
for f in app.js db.js teacher.js; do
  [ -f "$f" ] && bad "$f is back. It belongs to the old artifact version and must not be published."
done
if [ -f index.html ]; then
  for s in 'auth.js' 'portal.js' 'boot.js' 'vendor/supabase-js'; do
    grep -q "$s" index.html || bad "index.html does not load $s, so the login page would be skipped."
  done
  grep -q 'startup-patch\|tests-data' index.html && bad "index.html is the old artifact page (startup-patch / tests-data)."
fi
LIVE="index.html boot.js auth.js portal.js teacher.b531.js qb/qb-all.b537.js qb/qb.b525.html"
for s in 'JrF7haaQnwBT8Jh5QPCMcF' 'STUDENT_URL' 'teacher_login' 'student_login' 'renderGod' 'renderResults' 'syncStudents' "claude.use('artifact')"; do
  grep -l -F "$s" $LIVE 2>/dev/null | while read -r f; do echo "::error::$f contains '$s' from the old Tests / Results / student-dashboard code."; done
  grep -q -F "$s" $LIVE 2>/dev/null && fail=1
done
grep -q 'gatedDownloads' teacher.b531.js 2>/dev/null || bad "teacher.b531.js lost the plan checks on downloads (gatedDownloads)."
grep -q 'QBP(' qb/qb-all.b537.js 2>/dev/null || bad "qb/qb-all.b537.js lost the plan checks (QBP)."
grep -q 'my_profile' auth.js 2>/dev/null || bad "auth.js no longer reads the plan from the database."

if [ "$fail" = 1 ]; then
  echo "Guard FAILED: this version is not published. See SETUP.md, section 'Protecting the live site'."
  exit 1
fi
echo "Guard passed."
