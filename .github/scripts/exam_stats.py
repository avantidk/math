#!/usr/bin/env python3
"""Counts of past-paper questions per exam (totals, years, papers, per year, per chapter) for the public Exams menu and exam pages.
   The questions themselves are private; only these counts are written, to .github/scripts/exam-stats.json (never published as a file).
   Usage:  python3 .github/scripts/exam_stats.py <folder holding qb/data/pyq.json>"""
import json, sys, collections
root = sys.argv[1].rstrip('/')
rows = json.load(open(root + '/qb/data/pyq.json', encoding='utf-8'))
nonpyq = json.load(open(root + '/qb/data/nonpyq.json', encoding='utf-8'))
LV = ('L1', 'L2', 'L3')
def lv(rows):
    c = collections.Counter(r.get('difficulty') for r in rows)
    return {k: c.get(k, 0) for k in LV}
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
        'by_level': lv(rs),
        'chapters': {},
    }
    for code in {r.get('chapter_code') for r in rs if r.get('chapter_code')}:
        cr = [r for r in rs if r.get('chapter_code') == code]
        out[exam]['chapters'][code] = {
            'questions': len(cr),
            'by_year': dict(sorted(collections.Counter(str(r['year']) for r in cr).items())),
            'by_topic': dict(collections.Counter((r.get('topic') or 'Other') for r in cr).most_common()),
            'by_level': lv(cr),
            'topics_lv': {t: dict(n=len(tr), **lv(tr)) for t in {(r.get('topic') or 'Other') for r in cr} for tr in [[r for r in cr if (r.get('topic') or 'Other') == t]]},
        }
out['_all'] = {'pyq_questions': len(rows), 'nonpyq_questions': len(nonpyq), 'topic_levels': {tc: lv([r for r in rows if r.get('topic_code') == tc]) for tc in {r.get('topic_code') for r in rows if r.get('topic_code')}},
               'chapter_levels': {c: lv([r for r in rows if r.get('chapter_code') == c]) for c in {r.get('chapter_code') for r in rows if r.get('chapter_code')}}}
json.dump(out, open('.github/scripts/exam-stats.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False, sort_keys=True)
print({k: (v['questions'], v['first'], v['last'], v['papers']) for k, v in out.items() if k != '_all'})
