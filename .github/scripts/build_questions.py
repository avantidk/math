#!/usr/bin/env python3
"""Single-question public pages: /q/<question id>/ (PILOT).

One page = one question (text, options, answer, solution) for a visitor who arrives from a search engine. A page never links to
another question and never lists questions; "practice more" / "next" lead to the Login pop-up or the signed-in dashboard.

    python3 .github/scripts/build_questions.py <work folder> <question id> [<question id> ...]

<work folder> holds the private files exactly as they are in the bucket (pyq/<chapter>.json, sol/<chapter>.json, np/..., sol-np/...);
it is never committed. Only the generated q/<slug>/index.html (+ the figure) and sitemap-q.xml are.
The address is q/<first words>-<last words>-<6 letters of the id's hash>/ (owner's choice); NOINDEX=1 makes a page noindex."""
import hashlib, json, os, re, subprocess, sys, html
sys.path.insert(0, os.path.dirname(__file__))
import build_seo as B

E = html.escape
INDEX = os.environ.get('NOINDEX') != '1'
CHAPTERS = {c['code']: c for c in B.CH} if 'code' in B.CH[0] else None


def chapter_of(code):
    no = int(re.sub(r'^\d+M', '', code))
    return next(c for c in B.CH if int(c['no']) == no)


def load(work, qid):
    for q_dir, s_dir in (('pyq', 'sol'), ('np', 'sol-np')):
        d = os.path.join(work, q_dir)
        for fn in sorted(os.listdir(d)) if os.path.isdir(d) else []:
            rows = json.load(open(os.path.join(d, fn), encoding='utf-8'))
            for r in rows:
                if r['id'] == qid:
                    sp = os.path.join(work, s_dir, fn)
                    sol = json.load(open(sp, encoding='utf-8')).get(qid, '') if os.path.exists(sp) else ''
                    return r, sol
    raise SystemExit(f'question {qid} not found in {work}')



def words_of(text):
    """Plain prose words of a question (maths left out), lower-case ASCII."""
    t = re.sub(r'\\\(.*?\\\)|\\\[.*?\\\]|\{\{.*?\}\}', ' ', text, flags=re.S)
    return re.findall(r"[a-z]{2,}", t.lower())


def make_slug(qid, r):
    w = words_of(r['question'])
    if len(w) < 4: w = words_of(r.get('topic') or '') + w
    head, tail = (w[:6], w[-3:]) if len(w) > 9 else (w, [])
    parts = head + tail
    slug = '-'.join(parts)
    while len(slug) > 64 and len(parts) > 3: parts.pop(len(head) - 1 if len(parts) > len(tail) + 3 else -1); slug = '-'.join(parts)
    return (slug + '-' if slug else '') + hashlib.sha1(qid.encode()).hexdigest()[:6]


def figure_of(work, key):
    for fn in ('figures.json', 'figures-np.json'):
        p = os.path.join(work, 'qb', 'data', fn)
        if os.path.exists(p):
            d = json.load(open(p, encoding='utf-8'))
            if key in d and d[key].get('svg'): return d[key]['svg']
    return None


def katex(strings):
    p = subprocess.run(['node', os.path.join(os.path.dirname(__file__), 'katex_render.js')], input=json.dumps(strings), capture_output=True, text=True, check=True)
    return json.loads(p.stdout)


def plain(t):
    t = re.sub(r'\\\(|\\\)|\\\[|\\\]', '', t)
    t = re.sub(r'\\(left|right|mathbb|mathrm|text|operatorname)\b', '', t)
    t = re.sub(r'\\([a-zA-Z]+)', r'\1', t)
    return re.sub(r'\s+', ' ', re.sub(r'[{}^_]', '', t)).strip()


def opt_mode(opts):
    """Same rule as opts.js (which refines it in the browser): 4 short = 1 row, any very long = 4 rows, else 2x2. Never 3 rows."""
    n = [len(plain(o)) for o in opts]
    if len(opts) == 4 and max(n) <= 14: return 'opts-1row'
    if max(n) > 48 or len(opts) != 4: return 'opts-4row'
    return 'opts-2x2'


def paper_label(r):
    if r.get('source') == 'PYQ' or r.get('year'):
        return f"{r['exam']} {r['year']}", f"{r['paper']}, Q{r['qno']}"
    return 'Practice question', f"{r.get('section') or r.get('book', '')}, Q{r['qno']}"


def build(work, qid):
    r, sol = load(work, qid)
    c = chapter_of(r['chapter_code'])
    is_pyq = bool(r.get('year'))
    exam_h, where = paper_label(r)
    opts = r.get('options') or []
    slug = make_slug(qid, r)
    qh, sh, *oh = katex([r['question'], sol] + opts)
    # figures: the question's own figure goes where the text says {{figure}} (else under the text); a solution figure where it says {{solfig}}
    figs = {}
    for key, tag in ((qid, 'fig'), (qid + '#sol', 'solfig')):
        svg = figure_of(work, key)
        if svg:
            fn = 'fig.svg' if tag == 'fig' else 'solfig.svg'
            B.write(f'q/{slug}/{fn}', svg)
            figs[tag] = f'<img class="qp-fig" src="{fn}" alt="Figure for this question" loading="lazy">' if tag == 'fig' else f'<img class="qp-fig" src="{fn}" alt="Figure for the solution" loading="lazy">'
    if '{{figure}}' in qh: qh = qh.replace('{{figure}}', figs.get('fig', ''))
    elif 'fig' in figs: qh += figs['fig']
    sh = sh.replace('{{solfig}}', figs.get('solfig', ''))
    letters = 'ABCDE'
    opt_html = ''.join(f'<div class="qp-opt"><b>{letters[i]}</b><span>{oh[i]}</span></div>' for i in range(len(opts)))
    ans = (r.get('answer') or '').strip()
    topic = r.get('topic') or ''
    short = B.CH_SHORT.get(c['code'], c['name'])
    h1 = f"{exam_h} {c['name']} question" if is_pyq else f"{c['name']} practice question"
    if is_pyq:
        title = B.pick_title(f"{exam_h} {short} Q{r['qno']} Solution", f"{exam_h} {short} Question", f"{exam_h} {short}")
        desc = B.compose(f"{exam_h} math question ({r['paper']}, Q{r['qno']}) on {topic or c['name']}, with the answer and a step-by-step solution.",
                         f"Practise {c['name']} PYQs free on अंक-IT.")
    else:
        title = B.pick_title(f"{short}: {topic} Practice Question" if topic else f"{short} Practice Question", f"{short} Practice Question Solution", f"{short} Practice Question")
        desc = B.compose(f"{c['name']} practice question on {topic or c['name']} ({r.get('difficulty', '')}) with the answer and a step-by-step solution.",
                         f"Practise {c['name']} questions free on अंक-IT.")
    cu = f"{B.SITE}/q/{slug}/"
    crumbs = f'<a href="../../">Home</a> &rsaquo; <a href="../../maths/">Maths</a> &rsaquo; <a href="../../maths/{B.slug(c)}/">{E(c["name"])}</a>'
    dash_label = 'Open this exact question in your dashboard'
    dash_btns = (f'<a class="sb sb-gold sb-lg when-in" href="../../dashboard#d/q/{E(qid)}">{dash_label}</a>'
                 f'<a class="sb sb-gold sb-lg when-out" data-login data-next="#d/q/{E(qid)}" href="../../?login=1" rel="nofollow">{dash_label}</a>')
    side = f'''<aside class="qp-side" aria-label="About this question"><div class="qp-card qp-sidecard"><h2 class="qp-h">This question</h2>
<dl class="qp-dl"><dt>{"Exam" if is_pyq else "Type"}</dt><dd>{E(exam_h)}</dd><dt>{"Paper" if is_pyq else "Source"}</dt><dd>{E(where)}</dd><dt>Chapter</dt><dd>{E(c["name"])}</dd>{f"<dt>Topic</dt><dd>{E(topic)}</dd>" if topic else ""}<dt>Level</dt><dd>{E(r.get("difficulty", ""))}</dd></dl>
{dash_btns}
<p class="qp-note">See other students' solutions and comments, bookmark it and practise more.</p></div></aside>'''
    body = f'''<section class="pg-hero"><div class="swrap"><nav class="pg-crumbs" aria-label="Breadcrumb">{crumbs}</nav><h1>{E(h1)}</h1>
<p class="qp-meta">{E(exam_h)} &middot; {E(where)} &middot; {E(topic or c["name"])} &middot; Level {E(r.get("difficulty", ""))}</p></div></section>
<div class="swrap qp-wrap"><main id="main" class="qp-main">
<article class="qp-card"><h2 class="qp-h">Question</h2><div class="qp-q">{qh}</div>
<div class="qp-opts {opt_mode(opts)}" data-opts style="--opts-n:{len(opts)}">{opt_html}</div></article>
<article class="qp-card qp-sol"><h2 class="qp-h">Answer and solution</h2><p class="qp-ans">Correct answer: <b>{E(ans)}</b></p><div class="qp-s">{sh}</div></article>
<section class="qp-cta"><h2>Want more questions like this?</h2><p>Practise this chapter with full solutions, DPPs and online tests. Your progress is saved when you sign in.</p>
<p><a class="sb sb-gold sb-lg when-out" data-login href="../../?login=1" rel="nofollow">Login to practise more</a><a class="sb sb-gold sb-lg when-in" href="../../dashboard">Open your dashboard</a>
<a class="sb sb-pri sb-lg qp-alt" href="../../maths/{B.slug(c)}/">{E(c["name"])}: chapter guide</a></p></section>
</main>{side}</div>
<script src="../../opts.js?v={B.VER}" defer></script>'''
    ld = [{'@context': 'https://schema.org', '@type': 'WebPage', 'name': title, 'url': cu, 'description': desc, 'inLanguage': B.LANG, 'isPartOf': {'@type': 'WebSite', 'name': 'अंक-IT Mathematics Dashboard', 'url': B.SITE + '/'}},
          {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': u} for i, (n, u) in enumerate(
              [('Home', B.SITE + '/'), ('Maths', B.SITE + '/maths/'), (c['name'], B.url(c)), (f'{exam_h} Q{r["qno"]}', cu)])]}]
    out = B.page(title, desc, cu, body, 2, ld, noindex=not INDEX)
    out = out.replace("style-src 'self';", "style-src 'self' 'unsafe-inline';").replace("font-src 'self';", "font-src 'self' data:;")   # KaTeX draws with inline styles
    out = out.replace('<link rel="stylesheet" href="../../site.css', '<link rel="stylesheet" href="../../katex.css?v=' + B.VER + '">\n<link rel="stylesheet" href="../../site.css', 1)
    B.write(f'q/{slug}/index.html', out)
    print('wrote', f'q/{slug}/index.html', '|', title, '|', len(desc), 'char description', '| figures:', ', '.join(figs) or 'none')
    return slug


def sitemap(slugs):
    body = ''.join(f'<url><loc>{B.SITE}/q/{x}/</loc><priority>0.5</priority></url>\n' for x in sorted(slugs))
    B.write('sitemap-q.xml', f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}</urlset>\n')


if __name__ == '__main__':
    work, ids = sys.argv[1], sys.argv[2:]
    sitemap([build(work, i) for i in ids])
    if B.ERRORS: raise SystemExit('\n'.join(B.ERRORS))
