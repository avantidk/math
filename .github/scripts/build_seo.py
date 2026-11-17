#!/usr/bin/env python3
"""Builds the public, search-engine-readable pages from syllabus.json (public data only):
   jee-maths/index.html, jee-maths/<chapter>/index.html, robots.txt, sitemap.xml and the landing block inside index.html.
   Run from the repository root:  python3 .github/scripts/build_seo.py
   Nothing here reads the private content (questions, answers, solutions, handouts)."""
import json, html, re, os, sys, datetime

SITE = os.environ.get('SITE_URL', 'https://unkganit.com').rstrip('/')
TODAY = os.environ.get('SEO_DATE', datetime.date.today().isoformat())
VER = os.environ.get('SEO_VER', '925')
E = html.escape
D = json.load(open('syllabus.json', encoding='utf-8'))
CH = D['chapters']
Y0, Y1 = D['from'], D['to']

SLUG = {1: 'fundamentals-of-mathematics', 2: 'sets-relations-and-functions', 3: 'trigonometry', 4: 'quadratic-equations',
        5: 'complex-numbers', 6: 'sequences-and-series', 7: 'permutations-and-combinations', 8: 'binomial-theorem',
        9: 'straight-lines', 10: 'circle', 11: 'conic-sections', 12: 'statistics', 13: 'functions',
        14: 'inverse-trigonometric-functions', 15: 'matrices-and-determinants', 16: 'limits',
        17: 'continuity-and-differentiability', 18: 'application-of-derivatives', 19: 'indefinite-integration',
        20: 'definite-integration', 21: 'differential-equations', 22: 'vectors', 23: 'three-dimensional-geometry', 24: 'probability'}
# Short original introductions (what the chapter is and how it is usually tested).
INTRO = {
 1: 'The toolkit behind every other chapter: intervals, inequalities, modulus, and exponential and logarithmic functions. Quick, accurate algebra here saves time in calculus and coordinate geometry later.',
 2: 'Sets and their operations, relations and their types, and then functions: domain, range and standard graphs. Questions are usually short counting or classification problems that reward clear definitions.',
 3: 'Ratios of any angle, identities, compound and multiple angles, transformation formulae and trigonometric equations. It supports calculus, complex numbers, vectors and coordinate geometry.',
 4: 'Roots and their relation to coefficients, the nature of roots, common roots, the quadratic function and location of roots. A scoring chapter in both JEE Main and JEE Advanced.',
 5: 'The algebra and geometry of complex numbers: powers of iota, modulus and argument, polar and Euler form, De Moivre\'s theorem and roots of unity. Geometry-of-the-plane questions are common.',
 6: 'Arithmetic, geometric and harmonic progressions, the A.M.-G.M.-H.M. inequality and summation of series by sigma and by the method of difference. Heavily tested in JEE Main.',
 7: 'The counting principle, permutations, combinations, division and distribution, and derangements. Success depends on choosing the right model for the problem, not on formulas alone.',
 8: 'Binomial expansions and their coefficients, multinomial expansions, summation of series and the theorem for any index. Frequently tested with general-term and coefficient questions.',
 9: 'Distance, section and area formulae, slope, the different forms of a line, locus, images and concurrency. The foundation for circles and conic sections.',
 10: 'Equation of a circle, tangents, chords, chord of contact, family of circles, radical axis and the relative position of two circles. Often combined with straight lines and conics.',
 11: 'The parabola, ellipse and hyperbola: standard equations, tangents, normals, chords and focal properties. One of the highest-weight chapters in coordinate geometry.',
 12: 'Mean, median and mode, and the measures of dispersion: range, mean deviation, variance and standard deviation. Compact and formula-driven.',
 13: 'Domain, range, types of mappings, even and odd functions, periodicity, composition and inverse, including greatest-integer and fractional-part functions. It underpins limits, continuity and calculus.',
 14: 'Principal value branches, graphs, properties and identities of inverse trigonometric functions, with substitution-based simplification. Short, formula-based questions are typical.',
 15: 'Types and algebra of matrices, adjoint and inverse, systems of linear equations, and the properties and evaluation of determinants. A high-weight chapter in JEE Main.',
 16: 'The concept of a limit, algebraic, trigonometric, exponential and logarithmic limits, the 1-to-infinity form, series expansion and L\'Hospital\'s rule. A base for continuity and differentiation.',
 17: 'Continuity, types of discontinuity, differentiability, derivatives of standard and composite functions, and the main theorems. Greatest-integer and modulus functions appear often.',
 18: 'Rate of change, approximations, monotonicity, maxima and minima and their applications. Tangent and normal questions and optimisation problems are common.',
 19: 'Standard integrals, substitution, integration by parts, partial fractions and integrals involving quadratic and irrational functions. Fluency here drives definite integration.',
 20: 'Properties of definite integrals, odd, even and periodic functions, Leibnitz\'s rule, inequalities and the area under curves. The chapter with the most questions in this bank.',
 21: 'Forming and solving differential equations by variable separation, homogeneous and linear methods, and their applications. Short problems with predictable patterns.',
 22: 'Vector algebra: position vectors, direction cosines, dot and cross products, scalar triple product and their geometric applications. Often combined with three-dimensional geometry.',
 23: 'Direction cosines and ratios, equations of lines and planes, angles and shortest distance between lines. Vectors make many problems faster.',
 24: 'Events and their algebra, classical and axiomatic probability, conditional probability, independence, the total probability theorem and Bayes\' theorem. Careful reading of the problem is the key skill.'}

def cls(c): return '11' if int(c['no']) <= 12 else '12'
def slug(c): return SLUG[int(c['no'])]
def url(c): return f"{SITE}/jee-maths/{slug(c)}/"
def short(c): return c['name']
LEVEL = {'High': 'High', 'Medium': 'Medium', 'Low': 'Low', 'None': 'Rare'}

HEAD_FONTS = ''
def page(title, desc, canon, body, depth, jsonld=None, og_title=None):
    up = '../' * depth
    ld = ''.join(f'<script type="application/ld+json">{json.dumps(j, ensure_ascii=False, separators=(",", ":"))}</script>\n' for j in (jsonld or []))
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; font-src 'self'; img-src 'self' data:; base-uri 'self'; form-action 'none'">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{E(canon)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#0c1a3d">
<meta property="og:type" content="website">
<meta property="og:site_name" content="अंक-IT Mathematics Dashboard">
<meta property="og:title" content="{E(og_title or title)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{E(canon)}">
<meta property="og:image" content="{SITE}/img/og-share.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{E(og_title or title)}">
<meta name="twitter:description" content="{E(desc)}">
<meta name="twitter:image" content="{SITE}/img/og-share.png">
<link rel="icon" type="image/png" sizes="32x32" href="{up}img/icon/icon-32.png?v={VER}">
<link rel="apple-touch-icon" sizes="180x180" href="{up}img/icon/icon-180.png?v={VER}">
<link rel="preload" href="{up}vendor/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{up}landing.css?v={VER}">
{ld}</head>
<body class="pg">
{body}
</body>
</html>
'''

def nav(depth, crumbs):
    up = '../' * depth
    return f'''<header class="pg-top"><a class="pg-brand" href="{up}" aria-label="अंक-IT Mathematics Dashboard home"><img src="{up}img/ankit-logo-dark-sm.png?v={VER}" alt="अंक-IT" width="139" height="52"></a>
<nav class="pg-nav" aria-label="Main"><a href="{up}jee-maths/">JEE Maths chapters</a><a class="pg-cta" href="{up}">Sign in</a></nav></header>
<nav class="pg-crumbs" aria-label="Breadcrumb">{crumbs}</nav>'''

def cta(depth, text):
    up = '../' * depth
    return f'''<section class="pg-signin"><h2>Practise this free</h2><p>{E(text)}</p><a class="pg-btn" href="{up}">Sign in to start practising</a><p class="pg-fine">Sign in with Google, or with your Student ID if you are an Avanti student. Starting is free.</p></section>'''

def chapter_page(i, c):
    n = int(c['no']); prev = CH[i - 1] if i > 0 else None; nxt = CH[i + 1] if i < len(CH) - 1 else None
    name = short(c); cl = cls(c)
    title = f'JEE Maths {name}: Chapter Guide, PYQs & Practice | अंक-IT'
    if len(title) > 70: title = f'JEE Maths {name}: PYQs & Practice | अंक-IT'
    desc = (f'JEE Maths {name} (Class {cl}): {len(c["subs"])} subtopics, {c["m"]} JEE Main and {c["a"]} JEE Advanced previous-year questions '
            f'tagged {Y0}–{Y1}, importance by subtopic and free practice on अंक-IT.')
    rows = ''.join(
        f'<tr><td>{E(s["name"])}</td><td class="num">{s["m"]}</td><td class="num">{s["a"]}</td>'
        f'<td><span class="lv lv-{LEVEL[s["mt"]].lower()}">{LEVEL[s["mt"]]}</span></td><td><span class="lv lv-{LEVEL[s["at"]].lower()}">{LEVEL[s["at"]]}</span></td></tr>'
        for s in c['subs'])
    yrs = [str(y) for y in range(Y0, Y1 + 1)]
    yrow = ''.join(f'<tr><th scope="row">{y}</th><td class="num">{c["ym"].get(y, 0)}</td><td class="num">{c["ya"].get(y, 0)}</td></tr>' for y in reversed(yrs))
    top = sorted(c['subs'], key=lambda s: -(s['m'] + s['a']))[:3]
    top = [s for s in top if s['m'] + s['a'] > 0]
    focus = ''
    if top:
        focus = '<p>Most-tested subtopics in our previous-year data: ' + ', '.join(f'<b>{E(s["name"])}</b> ({s["m"]} Main, {s["a"]} Advanced)' for s in top) + '.</p>'
    links = ''
    if prev: links += f'<a class="pg-prev" href="../{slug(prev)}/">&larr; {E(short(prev))}</a>'
    if nxt: links += f'<a class="pg-next" href="../{slug(nxt)}/">{E(short(nxt))} &rarr;</a>'
    crumbs = f'<a href="../../">Home</a> &rsaquo; <a href="../">JEE Maths</a> &rsaquo; <span aria-current="page">{E(name)}</span>'
    body = f'''{nav(2, crumbs)}
<main class="pg-main">
<h1>JEE Maths: {E(name)}</h1>
<p class="pg-lead">Class {cl} · Chapter {n} of {len(CH)} · {len(c["subs"])} subtopics</p>
<p>{E(INTRO[n])}</p>
<ul class="pg-stats"><li><b>{c["m"]}</b><span>JEE Main questions tagged ({Y0}–{Y1})</span></li><li><b>{c["a"]}</b><span>JEE Advanced questions tagged</span></li><li><b>{len(c["subs"])}</b><span>subtopics</span></li></ul>
{focus}
<h2>Subtopics and how important each one is</h2>
<p>Counts are the previous-year questions tagged to each subtopic in the अंक-IT question bank. Importance reflects how often the subtopic is asked: High, Medium, Low, or Rare when it has hardly appeared.</p>
<div class="pg-table"><table><thead><tr><th scope="col">Subtopic</th><th scope="col" class="num">Main Qs</th><th scope="col" class="num">Adv. Qs</th><th scope="col">Main</th><th scope="col">Adv.</th></tr></thead><tbody>{rows}</tbody></table></div>
<h2>Year-wise trend</h2>
<p>Number of previous-year questions from this chapter, by exam year.</p>
<div class="pg-table pg-narrow"><table><thead><tr><th scope="col">Year</th><th scope="col" class="num">JEE Main</th><th scope="col" class="num">JEE Advanced</th></tr></thead><tbody>{yrow}</tbody></table></div>
{cta(2, f"Solve {name} questions chapter-wise with full solutions, take NTA-style online tests and see your rank. The question bank, previous-year papers, DPPs and handouts are inside after you sign in.")}
<nav class="pg-pn" aria-label="Chapters">{links}</nav>
</main>
{foot(2)}'''
    ld = [{'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'JEE Maths', 'item': SITE + '/jee-maths/'},
            {'@type': 'ListItem', 'position': 3, 'name': name, 'item': url(c)}]},
          {'@context': 'https://schema.org', '@type': 'WebPage', 'name': f'JEE Maths {name}', 'description': desc, 'url': url(c),
           'inLanguage': 'en-IN', 'isPartOf': {'@type': 'WebSite', 'name': 'अंक-IT Mathematics Dashboard', 'url': SITE + '/'}}]
    return page(title, desc, url(c), body, 2, ld)

def foot(depth):
    up = '../' * depth
    return f'''<footer class="pg-foot"><p>अंक-IT Mathematics Dashboard · JEE Main, JEE Advanced, KCET, NDA and IAT maths practice.</p><p><a href="{up}">Home and sign in</a> · <a href="{up}jee-maths/">All JEE Maths chapters</a></p></footer>'''

def chapter_list(prefix, with_stats=False):
    out = ''
    for label, sel in (('Class 11', lambda c: cls(c) == '11'), ('Class 12', lambda c: cls(c) == '12')):
        items = ''.join(
            f'<li><a href="{prefix}{slug(c)}/">{E(short(c))}</a>' + (f'<span>{len(c["subs"])} subtopics · {c["m"]} Main · {c["a"]} Adv.</span>' if with_stats else '') + '</li>'
            for c in CH if sel(c))
        out += f'<h3>{label}</h3><ul class="pg-chlist">{items}</ul>'
    return out

def hub_page():
    title = 'JEE Maths Chapters: Class 11 & 12 Syllabus, PYQs & Practice | अंक-IT'
    desc = (f'All {len(CH)} JEE Maths chapters and {D["tot_sub"]} subtopics for Class 11 and 12, with previous-year question counts for JEE Main and '
            f'JEE Advanced ({Y0}–{Y1}). Practise free on अंक-IT.')
    crumbs = '<a href="../">Home</a> &rsaquo; <span aria-current="page">JEE Maths</span>'
    body = f'''{nav(1, crumbs)}
<main class="pg-main">
<h1>JEE Maths: all chapters</h1>
<p class="pg-lead">{len(CH)} chapters · {D["tot_sub"]} subtopics · Class 11 and Class 12</p>
<p>The JEE Maths syllabus split into chapters and subtopics. Open a chapter to see its subtopics, how often each one was asked in JEE Main and JEE Advanced, and the year-wise trend, then sign in to practise the questions with full solutions.</p>
{chapter_list('', True)}
{cta(1, "Choose a chapter, practise previous-year questions with solutions, and take online tests. Starting is free.")}
</main>
{foot(1)}'''
    ld = [{'@context': 'https://schema.org', '@type': 'ItemList', 'name': 'JEE Maths chapters', 'itemListElement': [
            {'@type': 'ListItem', 'position': k + 1, 'name': short(c), 'url': url(c)} for k, c in enumerate(CH)]}]
    return page(title, desc, f'{SITE}/jee-maths/', body, 1, ld)

FAQ = [
 ('Is the Mathematics Dashboard free?', 'Yes, you can start free. Sign in with Google to use the question bank with solutions, online tests and your reports. Premium adds PDF downloads and printing, all-India ranks, comparison with all students and handouts.'),
 ('Who is it for?', 'Students of Class 11, Class 12 and droppers preparing JEE Maths (JEE Main and JEE Advanced), and also KCET, NDA, IAT and similar exams. Teachers can use it to make tests and track their students.'),
 ('How much does Premium cost?', 'Premium is ₹299 a year for students and ₹599 a year for teachers. Avanti students get Premium free.'),
 ('What is in the question bank?', 'JEE Maths questions filtered by chapter, topic, level, exam and year, with solutions, plus previous-year papers, daily practice problems (DPPs), Must Solve lists and revision handouts.'),
 ('How do I sign in?', 'Use your Google account. Avanti students can sign in with their Student ID instead. You choose Student or Teacher the first time.'),
 ('Can teachers create tests?', 'Yes. Teachers whose school has been approved can build an online test from the question bank, share one link with their students and see results and ranks.'),
]

def landing_block():
    c11 = [c for c in CH if cls(c) == '11']; c12 = [c for c in CH if cls(c) == '12']
    faq = ''.join(f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q, a in FAQ)
    return f'''<!--LANDING:START (generated by .github/scripts/build_seo.py; edit that script, not this block)-->
<div id="landing" class="ld">
<section class="ld-sec">
<h1>अंक-IT Mathematics Dashboard: JEE Maths practice for Class 11 and 12</h1>
<p class="ld-lead">A question bank with solutions, previous-year papers, DPPs, handouts and NTA-style online tests for JEE Main, JEE Advanced, KCET, NDA and IAT mathematics. Start free.</p>
<p><a class="ld-btn" href="#auth">Sign in to start</a></p>
</section>
<section class="ld-sec"><h2>Who is it for?</h2>
<p>Students of Class 11 and Class 12 and droppers preparing for JEE Maths, and the teachers who coach them. Practise chapter by chapter, take full tests in an exam-like screen and see where you stand.</p></section>
<section class="ld-sec"><h2>Free, Premium and Avanti</h2>
<div class="ld-plans">
<div><h3>Free</h3><p>Question bank with solutions, previous-year questions, online tests and your own reports. Sign in with Google.</p></div>
<div><h3>Premium</h3><p>₹299 a year for students, ₹599 for teachers. Adds PDF downloads and printing, all-India ranks, comparison with all students and handouts. Teachers also get a student list and bulk upload.</p></div>
<div><h3>Avanti</h3><p>Avanti students get Premium free and sign in with their Student ID. Avanti teachers get full teaching tools.</p></div>
</div></section>
<section class="ld-sec"><h2>JEE Maths chapters</h2>
<p>{len(CH)} chapters and {D["tot_sub"]} subtopics. Open a chapter to see its subtopics and how often each was asked in JEE Main and JEE Advanced.</p>
{chapter_list('jee-maths/')}
<p><a href="jee-maths/">See all chapters with question counts</a></p></section>
<section class="ld-sec"><h2>Frequently asked questions</h2>
<div class="ld-faq">{faq}</div></section>
<footer class="ld-foot"><p>अंक-IT Mathematics Dashboard · JEE, CET, NDA, IAT · PYQs, DPPs, handouts and tests.</p></footer>
</div>
<!--LANDING:END-->'''

def sitemap():
    urls = [(SITE + '/', '1.0'), (SITE + '/jee-maths/', '0.9')] + [(url(c), '0.8') for c in CH]
    body = ''.join(f'<url><loc>{u}</loc><lastmod>{TODAY}</lastmod><priority>{p}</priority></url>\n' for u, p in urls)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}</urlset>\n'

def write(path, text):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    open(path, 'w', encoding='utf-8').write(text)

def main():
    for i, c in enumerate(CH): write(f'jee-maths/{slug(c)}/index.html', chapter_page(i, c))
    write('jee-maths/index.html', hub_page())
    write('sitemap.xml', sitemap())
    write('robots.txt', f'User-agent: *\nAllow: /\nDisallow: /qb/\n\nSitemap: {SITE}/sitemap.xml\n')
    s = open('index.html', encoding='utf-8').read()
    blk = landing_block()
    if '<!--LANDING:START' in s:
        s = re.sub(r'<!--LANDING:START.*?<!--LANDING:END-->', lambda m: blk, s, flags=re.S)
    else:
        s = s.replace('<noscript>', blk + '\n<noscript>', 1)
    write('index.html', s)
    print('built', len(CH), 'chapter pages + hub + sitemap + robots +', 'landing in index.html')

if __name__ == '__main__':
    main()
