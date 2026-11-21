#!/usr/bin/env python3
"""Counts of past-paper questions per exam (totals, years, papers, per year, per chapter) for the public Exams menu and exam pages.
   The questions themselves are private; only these counts are written, to .github/scripts/exam-stats.json (never published as a file).
   Usage:  python3 .github/scripts/exam_stats.py <folder holding qb/data/pyq.json>"""
import json, sys, collections
root = sys.argv[1].rstrip('/')
rows = json.load(open(root + '/qb/data/pyq.json', encoding='utf-8'))
nonpyq = json.load(open(root + '/qb/data/nonpyq.json', encoding='utf-8'))
LV = ('L1', 'L2', 'L3')
def ylv(rows):   # per year: questions and L1/L2/L3
    ys = collections.defaultdict(list)
    for r in rows: ys[str(r['year'])].append(r)
    return {y: dict(n=len(v), **lv(v)) for y, v in sorted(ys.items())}
def lv(rows):
    c = collections.Counter(r.get('difficulty') for r in rows)
    return {k: c.get(k, 0) for k in LV}
def paper_list(rs):   # one entry per paper (year, session, paper): size, levels, types and the chapters it leaned on
    ps = collections.defaultdict(list)
    for r in rs: ps[(r['year'], r.get('session'), r.get('paper'))].append(r)
    out = []
    for (y, ses, pp), v in ps.items():
        ch = collections.Counter(r.get('chapter_code') for r in v if r.get('chapter_code'))
        out.append({'year': int(y), 'paper': pp, 'date': max((r.get('sort_date') or '') for r in v), 'n': len(v), **lv(v),
                    'types': dict(collections.Counter(r.get('type') for r in v)), 'chapters': len(ch), 'top': ch.most_common(3)})
    return sorted(out, key=lambda x: (x['date'], x['paper'] or ''), reverse=True)
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
        'by_year_lv': ylv(rs),
        'chapters': {},
        'paper_list': paper_list(rs),
    }
    for code in {r.get('chapter_code') for r in rs if r.get('chapter_code')}:
        cr = [r for r in rs if r.get('chapter_code') == code]
        out[exam]['chapters'][code] = {
            'questions': len(cr),
            'by_year': dict(sorted(collections.Counter(str(r['year']) for r in cr).items())),
            'by_topic': dict(collections.Counter((r.get('topic') or 'Other') for r in cr).most_common()),
            'by_level': lv(cr),
            'by_year_lv': ylv(cr),
            'topics_lv': {t: dict(n=len(tr), **lv(tr)) for t in {(r.get('topic') or 'Other') for r in cr} for tr in [[r for r in cr if (r.get('topic') or 'Other') == t]]},
        }
out['_all'] = {'pyq_questions': len(rows), 'nonpyq_questions': len(nonpyq), 'topic_levels': {tc: lv([r for r in rows if r.get('topic_code') == tc]) for tc in {r.get('topic_code') for r in rows if r.get('topic_code')}},
               'chapter_levels': {c: lv([r for r in rows if r.get('chapter_code') == c]) for c in {r.get('chapter_code') for r in rows if r.get('chapter_code')}}}
# public count pages (/question-counts/, /chapter-wise-count/, /chapter-weightage/): numbers only
codes = sorted({r.get('chapter_code') for r in rows + nonpyq if r.get('chapter_code')})
def cnt(rs, f): return dict(collections.Counter(f(r) for r in rs))
out['_all']['by_source'] = cnt(nonpyq, lambda r: r.get('book') or 'Other')
out['_all']['oos_by_exam'] = cnt([r for r in rows if r.get('oos')], lambda r: r['exam'])
out['_all']['chapter_table'] = {c: {'exams': cnt([r for r in rows if r.get('chapter_code') == c], lambda r: r['exam']),
                                    'src': cnt([r for r in nonpyq if r.get('chapter_code') == c], lambda r: r.get('book') or 'Other'),
                                    'oos': sum(1 for r in rows if r.get('chapter_code') == c and r.get('oos'))} for c in codes}
GRP = {'JEE Main': 'main', 'AIEEE': 'main', 'JEE Advanced': 'adv', 'IIT': 'adv'}
out['_all']['wchart'] = {c: {g: cnt([r for r in rows if r.get('chapter_code') == c and GRP.get(r['exam']) == g and r.get('year')], lambda r: str(r['year'])) for g in ('main', 'adv')} for c in codes}
json.dump(out, open('.github/scripts/exam-stats.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False, sort_keys=True)
print({k: (v['questions'], v['first'], v['last'], v['papers']) for k, v in out.items() if k != '_all'})
