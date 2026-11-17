#!/usr/bin/env python3
"""Counts of past-paper questions per exam (totals, years, papers, per year, per chapter) for the public Exams menu and exam pages.
   The questions themselves are private; only these counts are written, to .github/scripts/exam-stats.json (never published as a file).
   Usage:  python3 .github/scripts/exam_stats.py <folder holding qb/data/pyq.json>"""
import json, sys, collections
root = sys.argv[1].rstrip('/')
rows = json.load(open(root + '/qb/data/pyq.json', encoding='utf-8'))
by = collections.defaultdict(list)
for r in rows: by[r['exam']].append(r)
out = {}
for exam, rs in by.items():
    years = [int(r['year']) for r in rs]
    out[exam] = {
        'questions': len(rs), 'first': min(years), 'last': max(years),
        'papers': len({(r['year'], r.get('session'), r.get('paper')) for r in rs}),
        'by_year': dict(sorted(collections.Counter(str(r['year']) for r in rs).items())),
        'by_chapter': dict(collections.Counter(r.get('chapter_code') for r in rs).most_common()),
    }
json.dump(out, open('.github/scripts/exam-stats.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False, sort_keys=True)
print({k: (v['questions'], v['first'], v['last'], v['papers']) for k, v in out.items()})
