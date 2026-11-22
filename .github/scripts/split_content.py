#!/usr/bin/env python3
"""Split the question bank into small files, so a signed-in account downloads only what is on its screen.

    RE-RUN THIS AFTER ANYONE CHANGES qb/data/pyq.json OR qb/data/nonpyq.json IN THE BUCKET, or the dashboard shows the old
    questions (the full files are read by the admin only; everybody else reads the files made here):

        SUPABASE_URL=https://<project>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service key> \
            python3 .github/scripts/split_content.py --upload <work folder>

    Without --upload the files are only written to <work folder> (to check them first). With --from <folder> the two full
    files are read from <folder>/qb/data/ instead of being downloaded. The key is read from the environment, only ever sent
    in request headers, never printed. Nothing is deleted or renamed in the bucket: the files below are written (replaced)
    and every other object stays as it is.

What is made (bucket "content"; who may read each file is decided by public.content_allowed in supabase/schema.sql):
    index/questions.json   every question WITHOUT its text, options, answer or solution: only what the dashboard needs for
                           counts, filters, progress, tests and paper lists (signed-in accounts)
    pyq/<chapter>.json     the PYQ records of one chapter, same records as pyq.json (signed-in accounts)
    np/<chapter>.json      the practice records of one chapter, same records as nonpyq.json (Premium and Staff)
    papers/<slug>.json     the PYQ records of one past paper, grouped by the site's paper key exam|year|paper (signed-in accounts)

The index is columns + rows (see COLS); text values are numbers into the lists of "dict" (pp: [exam, year, paper, paper
file slug]; tt: [topic code without "JM-" (or "=" + the code), topic]). Columns at the end of a row that are empty are left
out. f is a set of bits: 1 practice question (else PYQ), 2 has an answer key a test can mark, 4 out of syllabus, 8 paragraph
question, 16 "mix-breed" PYQ (3 or more concept families). pg = paragraph group (same stem). These mirror the rules in
boot.js (light()); keep both in step if one changes."""
import argparse, collections, hashlib, json, os, re, ssl, sys, time, urllib.error, urllib.parse, urllib.request

BUCKET = 'content'
QB_EXAM = {'JEE Main': 'Main', 'AIEEE': 'Main', 'JEE Advanced': 'Adv', 'IIT': 'Adv', 'KCET': 'KCET', 'IAT': 'IAT', 'NDA': 'NDA', 'CBSE': 'CBSE', 'CBSE 12': 'CBSE'}
COLS = ['i', 'f', 'c', 'tt', 'd', 't', 'n', 'k', 'b', 'sec', 'pg', 'pq']
A = re.ASCII
NUM = r'-?\d+(?:\.\d+)?'
NUM_ANS = re.compile('(' + NUM + r'(\s+or\s+' + NUM + ')*|' + NUM + r'\s*to\s*' + NUM + ')', re.I | A)
KEY4, KEY5 = re.compile(r'[A-D](,[A-D])*', A), re.compile(r'[A-E](,[A-E])*', A)
PARA = re.compile(r'^\s*Para:', re.I)
MIXF = [re.compile(p, A) for p in [
    r'\\(sin|cos|tan|cot|sec|csc)\b', r'\\(log|ln)\b', r'\\int', r'\\lim', r"\\frac\{d|derivative|differentiable|f'|\\prime",
    r'matri|determinant|vmatrix|adj\b', r'\\vec|\\hat|vector|overrightarrow', r'complex|\\bar\{z\}|\|z|\\omega|\barg\b',
    r'parabola|ellipse|hyperbola|circle|focus|directrix|eccentric', r'probabilit|dice|coin|randomly',
    r'\ba\.?p\b|\bg\.?p\b|arithmetic|geometric|sequence|progression',
    r'\\binom|binomial|permutation|combination|arrange|\^\{?n\}?c|\{\}\^', r'relation|\\cup|\\cap|bijective|injective|one-one|onto',
    r'quadratic|discriminant']]


def js_str(v):
    """String(v) as JavaScript writes it (for numbers that are whole: 2 not 2.0)."""
    if v is None:
        return ''
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)


def options(r):
    o = r.get('options') or []
    if isinstance(o, str):
        try:
            o = json.loads(o)
        except ValueError:
            o = []
    return o if isinstance(o, list) else []


def gradable(r):
    a = js_str(r.get('answer')).strip()
    if not a:
        return 0
    if r.get('type') == 'Numerical':
        return 1 if NUM_ANS.fullmatch(a) else 0
    n = len(options(r))
    return 1 if n > 0 and (KEY5 if n >= 5 else KEY4).fullmatch(re.sub(r'\s+', '', a)) else 0


def is_para(r):
    return r.get('type') == 'Comprehension' or (r.get('type') == 'Numerical' and bool(PARA.match(r.get('question') or '')))


def para_group(r):
    t = js_str(r.get('question'))
    k = t[:max(0, t.rfind('\n'))] or t
    return hashlib.sha1(k.encode('utf-8')).hexdigest()[:10]


def mix(r):
    t = (js_str(r.get('question')) + ' ' + ' '.join(js_str(x) for x in options(r))).lower()
    return 1 if sum(1 for f in MIXF if f.search(t)) >= 3 else 0


def year_of(r):
    y = r.get('year')
    if y in (None, ''):
        return None
    try:
        return int(float(y))
    except (TypeError, ValueError):
        return None


def paper_key(r):
    """portal.js paperKey: compact exam | year | paper (only PYQs with a paper and a known exam are in papers)."""
    e = QB_EXAM.get(r.get('exam'))
    if not e or r.get('source') != 'PYQ' or not r.get('paper'):
        return None
    y = year_of(r)
    return e + '|' + (str(y) if y else '') + '|' + str(r['paper'])


def slug_of(key):
    s = re.sub(r'[^A-Za-z0-9]+', '-', key).strip('-')[:60]
    return s + '-' + hashlib.sha1(key.encode('utf-8')).hexdigest()[:6]


def safe(name):
    return re.sub(r'[^A-Za-z0-9._-]', '_', str(name or 'other'))


def build(pyq, nonpyq):
    files = {}
    by_ch = collections.defaultdict(list)
    for r in pyq:
        by_ch['pyq/' + safe(r.get('chapter_code')) + '.json'].append(r)
    for r in nonpyq:
        by_ch['np/' + safe(r.get('chapter_code')) + '.json'].append(r)
    files.update(by_ch)
    papers = collections.OrderedDict()
    for r in pyq:
        k = paper_key(r)
        if k:
            papers.setdefault(k, []).append(r)
    slugs = {k: slug_of(k) for k in papers}
    assert len(set(slugs.values())) == len(slugs), 'two papers got the same file name'
    for k, rs in papers.items():
        files['papers/' + slugs[k] + '.json'] = rs

    dicts = {k: [] for k in ('c', 'tt', 'pp', 't', 'd', 'b', 'sec')}
    pos = {k: {} for k in dicts}

    def ref(k, v):
        key = json.dumps(v, ensure_ascii=False)
        if key not in pos[k]:
            pos[k][key] = len(dicts[k])
            dicts[k].append(v)
        return pos[k][key]
    ref('b', '')
    ref('sec', '')   # number 0 of these two lists is "none"

    rows = []
    for src, recs in (('P', pyq), ('N', nonpyq)):
        for r in recs:
            P = src == 'P'
            tc = js_str(r.get('topic_code'))
            k = paper_key(r) if P else None
            para = is_para(r)
            v = {
                'i': js_str(r['id']),
                'f': (0 if P else 1) | (2 if gradable(r) else 0) | (4 if r.get('oos') else 0) | (8 if para else 0) | (16 if P and mix(r) else 0),
                'c': ref('c', js_str(r.get('chapter_code'))),
                'tt': ref('tt', [tc[3:] if tc.startswith('JM-') else '=' + tc, js_str(r.get('topic'))]),
                'd': ref('d', js_str(r.get('difficulty'))), 't': ref('t', js_str(r.get('type'))), 'n': js_str(r.get('qno')),
                'k': ref('pp', [js_str(r.get('exam')), (year_of(r) or 0) if P else 0, js_str(r.get('paper')), slugs[k] if k else '']),
                'b': 0 if P else ref('b', js_str(r.get('publisher') or r.get('book'))), 'sec': ref('sec', js_str(r.get('section'))),
                'pg': para_group(r) if para else '', 'pq': js_str(r.get('pyq_ref')) if (not P and r.get('pyq')) else ''}
            row = [v[c] for c in COLS]
            while row and row[-1] in (0, ''):
                row.pop()
            rows.append(row)
    index = {'v': 1, 'cols': COLS, 'dict': dicts, 'rows': rows,
             'note': 'Question ids and metadata only (no text, options, answers or solutions). Made by .github/scripts/split_content.py.'}
    return files, index


def dump(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


# ---------- Supabase Storage ----------
def session():
    url = os.environ.get('SUPABASE_URL', 'https://usehxhvzhdbcmnmqaxoo.supabase.co').rstrip('/')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
    ctx = ssl.create_default_context(cafile=os.environ.get('SSL_CERT_FILE') or None)

    def call(method, path, body=None, extra=None, tries=4):
        h = dict(extra or {})
        if key:
            h['apikey'] = key
            if not key.startswith('sb_secret_'):
                h['Authorization'] = 'Bearer ' + key
        for t in range(tries):
            req = urllib.request.Request(url + path, data=body, method=method, headers=h)
            try:
                with urllib.request.urlopen(req, timeout=120, context=ctx) as r:
                    return r.status, r.read()
            except urllib.error.HTTPError as e:
                if e.code < 500 or t == tries - 1:
                    return e.code, e.read()
            except urllib.error.URLError:
                if t == tries - 1:
                    raise
            time.sleep(3 * (t + 1))
    return call


def quote(p):
    return '/'.join(urllib.parse.quote(x) for x in p.split('/'))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('out', help='work folder: the split files are written here')
    ap.add_argument('--from', dest='src', help='folder holding qb/data/pyq.json and qb/data/nonpyq.json (default: download them)')
    ap.add_argument('--upload', action='store_true', help='upload the split files to the bucket (adds or replaces only these files)')
    a = ap.parse_args()
    call = session() if (a.upload or not a.src) else None
    full = {}
    for n in ('pyq', 'nonpyq'):
        if a.src:
            with open(os.path.join(a.src, 'qb', 'data', n + '.json'), encoding='utf-8') as f:
                full[n] = json.load(f)
        else:
            st, body = call('GET', f'/storage/v1/object/authenticated/{BUCKET}/qb/data/{n}.json')
            if st != 200:
                sys.exit(f'Could not download qb/data/{n}.json (HTTP {st})')
            full[n] = json.loads(body)
    files, index = build(full['pyq'], full['nonpyq'])
    out = {p: dump(v) for p, v in files.items()}
    out['index/questions.json'] = dump(index)
    for p, b in out.items():
        fp = os.path.join(a.out, *p.split('/'))
        os.makedirs(os.path.dirname(fp), exist_ok=True)
        with open(fp, 'wb') as f:
            f.write(b)
    big = max((p for p in out if p != 'index/questions.json'), key=lambda p: len(out[p]))
    print(f"{len(out)} files: {sum(1 for p in out if p.startswith('pyq/'))} pyq, {sum(1 for p in out if p.startswith('np/'))} np, "
          f"{sum(1 for p in out if p.startswith('papers/'))} papers; index {len(out['index/questions.json']) // 1024} KB; largest {big} {len(out[big]) // 1024} KB")
    if not a.upload:
        return
    bad = 0
    for p, b in sorted(out.items()):
        st, body = call('POST', f'/storage/v1/object/{BUCKET}/{quote(p)}', b,
                        {'Content-Type': 'application/json', 'x-upsert': 'true', 'cache-control': 'no-cache'})
        if st not in (200, 201):
            bad += 1
            print(f'  FAILED {p}: HTTP {st} {body[:160]!r}')
    print('Uploaded.' if not bad else f'{bad} file(s) failed.')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
