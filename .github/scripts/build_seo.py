#!/usr/bin/env python3
"""Builds the public, search-engine-readable pages from syllabus.json (public data only):
   the home page (inside index.html), maths/index.html, maths/<chapter>/index.html, about/, contact/, privacy/, terms/,
   robots.txt and sitemap.xml. Run from the repository root:  python3 .github/scripts/build_seo.py
   Nothing here reads the private content (questions, answers, solutions, handouts)."""
import json, html, re, os, datetime

SITE = os.environ.get('SITE_URL', 'https://unkganit.com').rstrip('/')
SITE_NAME = 'अंक-IT Mathematics'
TODAY = os.environ.get('SEO_DATE', datetime.date.today().isoformat())
VER = os.environ.get('SEO_VER', '927')
E = html.escape
D = json.load(open('syllabus.json', encoding='utf-8'))
CH = D['chapters']
Y0, Y1 = D['from'], D['to']
# Chapters that are no longer in the JEE syllabus. They are listed (not given pages of their own: there is no syllabus data for them).
OOS = [('12M25', 'Linear Programming Problem'), ('12M26', 'Mathematical Reasoning'), ('12M27', 'Solution of Triangle'), ('12M28', 'Height and Distance')]
CONTACT_EMAIL = os.environ.get('CONTACT_EMAIL', 'unkganit@gmail.com')   # public contact address shown on the Contact, Privacy and Terms pages
UPDATED = '21 November 2026'

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
def url(c): return f"{SITE}/maths/{slug(c)}/"
def short(c): return c['name']
LEVEL = {'High': 'High', 'Medium': 'Medium', 'Low': 'Low', 'None': 'Rare'}

def svg(d, w=24, extra=''):
    return f'<svg viewBox="0 0 24 24" width="{w}" height="{w}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"{extra}>{d}</svg>'
BOOK = svg('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5zM19 19v2H6M9 8h6M9 12h6"/>', 20)
ARROW = svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 20)
CHECK = svg('<path d="M20 6 9 17l-5-5"/>', 20)


# ---------- exams (counts come from .github/scripts/exam-stats.json, made by exam_stats.py; only numbers, no questions) ----------
STATS = json.load(open('.github/scripts/exam-stats.json', encoding='utf-8'))
GUIDES = json.load(open('.github/scripts/exam-guides.json', encoding='utf-8')) if os.path.exists('.github/scripts/exam-guides.json') else {}   # text of the exam guides (guides_from_pdf.py)
# The size of the bank in words ("16,700+"): the real total, rounded down to a hundred, so the pages never overstate it.
BANK_N = f"{(STATS['_all']['pyq_questions'] + STATS['_all']['nonpyq_questions']) // 100 * 100:,}+"
CH_NAME = {c['code']: c['name'] for c in CH}
CH_NAME.update({code: n for code, n in OOS})
CH_SLUG = {c['code']: slug(c) for c in CH}
OOS_SLUG = {'12M25': 'linear-programming-problem', '12M26': 'mathematical-reasoning', '12M27': 'solution-of-triangle', '12M28': 'height-and-distance'}
ANY_SLUG = dict(CH_SLUG); ANY_SLUG.update(OOS_SLUG)
LOGO = 'img/ankit-logo-light.png'
EXAMS = [   # (key in the stats, name shown, url slug, short line, about)
 ('JEE Main', 'JEE Main', 'jee-main', 'Engineering entrance for NITs, IIITs and other institutes; the qualifier for JEE Advanced.',
  'JEE Main is the national-level engineering entrance examination conducted by the National Testing Agency (NTA). It is used for admission to NITs, IIITs and other centrally funded technical institutions, and its rank list decides who may appear for JEE Advanced. Mathematics is one of the three subjects.'),
 ('JEE Advanced', 'JEE Advanced', 'jee-advanced', 'The entrance examination for admission to the IITs.',
  'JEE Advanced is held for admission to the Indian Institutes of Technology (IITs). It is conducted each year by one of the IITs on rotation, and candidates qualify through JEE Main. Its mathematics papers are known for multi-concept problems and a mix of question types.'),
 ('IIT', 'IIT-JEE', 'iit-jee', 'The IIT entrance examination until 2012; continued as JEE Advanced.',
  'IIT-JEE, the Joint Entrance Examination, was the entrance examination for the IITs until 2012. From 2013 it continued as JEE Advanced. These older papers remain valuable for concept-heavy practice.'),
 ('AIEEE', 'AIEEE', 'aieee', 'The all-India engineering entrance until 2012; replaced by JEE Main.',
  'AIEEE, the All India Engineering Entrance Examination, was conducted by the CBSE until 2012 for admission to NITs, IIITs and other institutions. From 2013 it was replaced by JEE Main.'),
 ('KCET', 'KCET', 'kcet', 'Karnataka\'s common entrance test for professional courses.',
  'KCET, the Karnataka Common Entrance Test, is conducted by the Karnataka Examinations Authority (KEA) for admission to professional courses in Karnataka. Mathematics is one of its subjects.'),
 ('NDA', 'NDA', 'nda', 'The UPSC entrance for the National Defence Academy: the Mathematics paper.',
  'The National Defence Academy (NDA) examination is conducted by the Union Public Service Commission (UPSC). Its Mathematics paper tests Class 11 and 12 topics, and this bank covers the questions of that paper.'),
 ('IAT', 'IAT', 'iat', 'The IISER Aptitude Test for the BS-MS programmes.',
  'The IISER Aptitude Test (IAT) is the entrance test for the BS-MS programmes of the Indian Institutes of Science Education and Research (IISERs). Mathematics is one of its sections.'),
]

# CUET UG has a guide and score tables but no questions in the bank yet, so it is kept apart from EXAMS (which need question counts).
CUET = ('CUET', 'CUET UG', 'cuet', 'The Common University Entrance Test for DU, BHU and other central universities.',
  'CUET UG, the Common University Entrance Test (UG), is conducted by the National Testing Agency (NTA) for admission to undergraduate programmes of the University of Delhi, BHU, JNU, Allahabad University and many other central, state and private universities. Mathematics is one of its domain subjects.')
ALL_EXAMS = EXAMS + [CUET]
COMP = GUIDES.get('compendium'); IMPORTANT = GUIDES.get('important')
COMP_SEC = {'jee-main': 0, 'jee-advanced': 1, 'kcet': 2, 'iat': 3, 'nda': 4, 'cuet': 5}   # which section of the cutoff compendium belongs to which exam

# Plain facts for the exam pages. Patterns change, so the pages tell readers to check the official notification.
FACTS = {
 'JEE Main': [('Full name', 'Joint Entrance Examination (Main)'), ('Conducted by', 'National Testing Agency (NTA)'),
   ('Held for', 'Admission to B.E. / B.Tech at NITs, IIITs and other centrally funded institutions; also the qualifying round for JEE Advanced'),
   ('Who can appear', 'Students who have passed, or are appearing in, Class 12'), ('Mode', 'Computer-based test'),
   ('How often', 'Twice a year (January and April sessions), held in several shifts'), ('Subjects', 'Physics, Chemistry and Mathematics'),
   ('Math in the paper', 'Multiple-choice and numerical-answer questions. Recent shift papers have 25 math questions (20 multiple-choice and 5 numerical).')],
 'JEE Advanced': [('Full name', 'Joint Entrance Examination (Advanced)'), ('Conducted by', 'One of the IITs, chosen by rotation each year'),
   ('Held for', 'Admission to the undergraduate programmes of the IITs'), ('Who can appear', 'Top candidates who qualify through JEE Main'),
   ('Mode', 'Computer-based test'), ('How often', 'Once a year, in two papers (Paper 1 and Paper 2)'), ('Subjects', 'Physics, Chemistry and Mathematics in each paper'),
   ('Math in the paper', 'A mix of question types (single correct, multiple correct, numerical and matching). The pattern can change from year to year.')],
 'IIT': [('Full name', 'Joint Entrance Examination for the IITs'), ('Conducted by', 'The IITs (one IIT organised it each year)'),
   ('Held for', 'Admission to the IITs'), ('Who can appear', 'Students who had passed, or were appearing in, Class 12'), ('Mode', 'Pen and paper'),
   ('How often', 'Once a year until 2012. From 2013 it continued as JEE Advanced.'), ('Subjects', 'Physics, Chemistry and Mathematics'),
   ('Math in the paper', 'Question styles changed over the years and included single-correct, multiple-correct, integer-answer and matching questions.')],
 'AIEEE': [('Full name', 'All India Engineering Entrance Examination'), ('Conducted by', 'Central Board of Secondary Education (CBSE)'),
   ('Held for', 'Admission to B.E. / B.Tech and B.Arch at NITs, IIITs and other institutions'), ('Who can appear', 'Students who had passed, or were appearing in, Class 12'),
   ('Mode', 'Mainly pen and paper, with an online option in later years'), ('How often', 'Once a year from 2002 to 2012. From 2013 it was replaced by JEE Main.'),
   ('Subjects', 'Physics, Chemistry and Mathematics'), ('Math in the paper', 'Multiple-choice questions on the Class 11 and 12 syllabus')],
 'KCET': [('Full name', 'Karnataka Common Entrance Test'), ('Conducted by', 'Karnataka Examinations Authority (KEA)'),
   ('Held for', 'Admission to engineering, pharmacy, farm science and other professional courses in Karnataka'), ('Who can appear', 'Students who have passed, or are appearing in, Class 12 (II PUC)'),
   ('Mode', 'Pen and paper (OMR answer sheet)'), ('How often', 'Once a year'), ('Subjects', 'Physics, Chemistry, Mathematics and Biology (engineering uses Physics, Chemistry and Mathematics)'),
   ('Math in the paper', 'Multiple-choice questions based on the Class 11 and 12 (PUC) syllabus')],
 'NDA': [('Full name', 'National Defence Academy and Naval Academy Examination'), ('Conducted by', 'Union Public Service Commission (UPSC)'),
   ('Held for', 'Entry to the Army, Navy and Air Force wings of the National Defence Academy and to the Indian Naval Academy'),
   ('Who can appear', 'Candidates who have passed, or are appearing in, Class 12 and meet the age limits'), ('Mode', 'Pen and paper (OMR answer sheet)'),
   ('How often', 'Twice a year (NDA I and NDA II)'), ('Written test', 'Mathematics paper (300 marks, 2.5 hours) and General Ability Test (600 marks)'),
   ('Math in the paper', 'Objective questions on algebra, matrices, trigonometry, analytical geometry, calculus, vectors, statistics and probability')],
 'IAT': [('Full name', 'IISER Aptitude Test'), ('Conducted by', 'The Indian Institutes of Science Education and Research (organised by one IISER)'),
   ('Held for', 'Admission to the BS-MS dual degree programmes of the IISERs'), ('Who can appear', 'Students who have passed, or are appearing in, Class 12'),
   ('Mode', 'Computer-based test'), ('How often', 'Once a year'), ('Subjects', 'Physics, Chemistry, Mathematics and Biology'),
   ('Math in the paper', 'Multiple-choice questions at Class 11 and 12 level')],
}
SHORT = {'JEE Main': ('NTA', 'NITs, IIITs and other institutes; qualifier for JEE Advanced', 'Computer-based'),
         'JEE Advanced': ('One of the IITs (rotating)', 'The IITs', 'Computer-based'),
         'IIT': ('The IITs', 'The IITs (until 2012)', 'Pen and paper'),
         'AIEEE': ('CBSE', 'NITs, IIITs and other institutes (until 2012)', 'Pen and paper / online'),
         'KCET': ('KEA, Karnataka', 'Professional courses in Karnataka', 'Pen and paper (OMR)'),
         'NDA': ('UPSC', 'National Defence Academy and Naval Academy', 'Pen and paper (OMR)'),
         'IAT': ('IISERs', 'BS-MS programmes of the IISERs', 'Computer-based'),
         'CUET': ('NTA', 'Central universities (DU, BHU, JNU and more)', 'Computer-based')}
def exam_logo(e, size=44):
    return f'<img class="exlogo" src="{{up}}img/exams/{e[2]}.svg" alt="" width="{size}" height="{size}" loading="lazy">'
def exam_url(e): return f"{SITE}/exams/{e[2]}/"
def exam_meta(e):
    if e[0] not in STATS: return 'Guide, dates and safe scores · questions coming soon'
    s = STATS[e[0]]
    return f"{s['questions']:,} questions · {s['first']}–{s['last']} · {s['papers']} papers"

# ---------- shared pieces ----------
def head(title, desc, canon, depth, jsonld=None, og_title=None, index=False):
    up = '../' * depth
    ld = ''.join(f'<script type="application/ld+json">{json.dumps(j, ensure_ascii=False, separators=(",", ":"))}</script>\n' for j in (jsonld or []))
    canon_tag = f'<link rel="canonical" href="{E(canon)}">\n' if canon else ''
    return f'''<meta name="description" content="{E(desc)}">
{canon_tag}<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:site_name" content="अंक-IT Mathematics Dashboard">
<meta property="og:title" content="{E(og_title or title)}">
<meta property="og:description" content="{E(desc)}">
{f'<meta property="og:url" content="{E(canon)}">' + chr(10) if canon else ''}<meta property="og:image" content="{SITE}/img/og-share.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{E(og_title or title)}">
<meta name="twitter:description" content="{E(desc)}">
<meta name="twitter:image" content="{SITE}/img/og-share.png">
{ld}'''

BRAND = ' | अंक-IT'   # the one brand suffix every page title ends with
TITLE_MAX, DESC_MIN, DESC_MAX = 60, 120, 155
LANG = 'en-IN'      # <html lang> and JSON-LD inLanguage use the same value
ERRORS = []         # titles or descriptions that break the rules; the build fails at the end and lists them all

def pick_title(*cands):
    """The first candidate (brand added) that fits in TITLE_MAX characters. Titles are never cut: add a shorter candidate instead."""
    for t in cands:
        t = t if t.endswith(BRAND) else t + BRAND
        if len(t) <= TITLE_MAX: return t
    ERRORS.append(f'no title fits {TITLE_MAX} characters: {cands!r}'); return t

def compose(*parts, hi=DESC_MAX):
    """A description made of whole sentences: the first part, then each later part that still fits. Nothing is cut mid-phrase."""
    out = parts[0]
    for p in parts[1:]:
        if p and len(out) + 1 + len(p) <= hi: out += ' ' + p
    return out

# Shorter chapter names, used only where the full name would make a title or description too long.
CH_SHORT = {'11M1': 'Fundamentals of Maths', '11M2': 'Sets, Relations & Functions', '11M6': 'Sequences & Series', '11M7': 'Permutations & Combinations',
            '12M14': 'Inverse Trig Functions', '12M15': 'Matrices & Determinants', '12M17': 'Continuity & Differentiability',
            '12M20': 'Definite Integration & Area', '12M23': '3D Geometry', '12M25': 'Linear Programming'}

def page(title, desc, canon, body, depth, jsonld=None, og_title=None, up=None, noindex=False, raw=False):
    up = '../' * depth if up is None else up
    if len(title) > TITLE_MAX or not title.endswith(BRAND): ERRORS.append(f'title must end with "{BRAND}" and fit {TITLE_MAX} characters: {title!r}')
    if '…' in title + desc or len(desc) > DESC_MAX: ERRORS.append(f'description longer than {DESC_MAX} characters or cut short ({len(desc)}): {desc!r}')
    if len(desc) < DESC_MIN: print(f'build_seo: note, short description ({len(desc)}): {canon}')
    body = re.sub(r'<div class="pg-table', '<div tabindex="0" role="group" aria-label="Table (scrolls sideways on small screens)" class="pg-table', body) if isinstance(body, str) else body
    return f'''<!doctype html>
<html lang="{LANG}"{' data-page="index"' if raw else ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<title>{E(title)}</title>
{head(title, desc, canon, depth, jsonld, og_title).replace('index, follow, max-image-preview:large', 'noindex, follow') if noindex else head(title, desc, canon, depth, jsonld, og_title)}<meta name="theme-color" content="#0c1a3d">
<link rel="icon" type="image/png" sizes="32x32" href="{up}img/icon/icon-32.png?v={VER}">
<link rel="apple-touch-icon" sizes="180x180" href="{up}img/icon/pwa-180.png?v={VER}">
<link rel="manifest" href="{up}manifest.json?v={VER}">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="अंक-IT">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="preload" href="{up}vendor/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{up}vendor/fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{up}site.css?v={VER}">
<link rel="stylesheet" href="{up}pwa.css?v={VER}">
<script src="{up}site.js?v={VER}"></script>
<script src="{up}pwa.js?v={VER}" defer></script>
<script src="{up}login.js?v={VER}" defer></script>
</head>
<body class="{'site' if raw else 'pg'}">
{body if raw else header(depth, up) + chr(10) + body + chr(10) + footer(depth, up)}
</body>
</html>
'''


OOS_INTRO = {'12M25': 'Forming linear constraints, drawing the feasible region and finding the best value of an objective function. These problems are no longer part of the current JEE syllabus.',
             '12M26': 'Statements, logical connectives, truth tables, tautologies and contradictions. This chapter is no longer part of the current JEE syllabus.',
             '12M27': 'Sine and cosine rules, area, half-angle formulae and the circles related to a triangle. This chapter is no longer part of the current JEE syllabus.',
             '12M28': 'Angles of elevation and depression, and finding heights and distances with trigonometry. This chapter is no longer part of the current JEE syllabus.'}


LV = ('L1', 'L2', 'L3')
LVH = ''.join(f'<th scope="col" class="num lh l{k[1]}" title="Level {k[1]}">{k}</th>' for k in LV)
def lvcells(d):
    return ''.join(f'<td class="num lc l{k[1]}">{d.get(k, 0)}</td>' for k in LV)

def heat(rows, y0, y1, label='Exam'):
    """Compact year strip: one row per series, one small coloured cell per year (instead of a tall one-row-per-year table)."""
    years = list(range(y0, y1 + 1))
    th = ''.join(f'<th scope="col" title="{y}">&rsquo;{str(y)[2:]}</th>' for y in years)
    body = ''
    for lab, by in rows:
        vals = [int(by.get(str(y), 0)) for y in years]; mx = max(vals) or 1
        tds = ''.join(f'<td class="h{0 if v == 0 else min(4, 1 + int(3.999 * v / mx))}" title="{y}: {v}">{v if v else "&middot;"}</td>' for y, v in zip(years, vals))
        body += f'<tr><th scope="row" class="exn">{lab}</th>{tds}<td class="tot">{sum(vals)}</td></tr>'
    return f'<div class="pg-table yr"><table class="heat"><thead><tr><th scope="col">{label}</th>{th}<th scope="col" class="tot">Total</th></tr></thead><tbody>{body}</tbody></table></div>'

def yrtbl(byl, y0, y1):
    """Year-wise table, newest year first, one year per row: questions and L1/L2/L3."""
    rows, tot = '', {'n': 0, 'L1': 0, 'L2': 0, 'L3': 0}
    for y in range(y1, y0 - 1, -1):
        d = byl.get(str(y), {}); 
        for k in tot: tot[k] += d.get(k if k != 'n' else 'n', 0)
        rows += f'<tr><th scope="row">{y}</th><td class="num">{d.get("n", 0)}</td>{lvcells(d)}</tr>'
    rows += f'<tr class="tot-row"><th scope="row">Total</th><td class="num">{tot["n"]}</td>{lvcells(tot)}</tr>'
    return tbl(['Year', 'Questions', LVH], rows, 'pg-narrow yrl', (1,))

def spark(by_year, last, n=5):
    """Small dot graph of the last n years (same look as the dashboard's Syllabus Priority trend)."""
    ys = [last - n + 1 + i for i in range(n)]; vals = [int(by_year.get(str(y), 0)) for y in ys]; mx = max(vals) or 1
    W, H, P = 92, 28, 5
    pts = [(P + i * (W - 2 * P) / (n - 1), H - P - (v / mx) * (H - 2 * P)) for i, v in enumerate(vals)]
    line = ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts)
    dots = ''.join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{3.3 if i == n - 1 else 2.5}" class="sp-dot"/>' for i, (x, y) in enumerate(pts))
    tip = ', '.join(f'{y}: {v}' for y, v in zip(ys, vals))
    return f'<svg class="spark" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Questions per year, {tip}"><title>{tip}</title><polyline points="{line}" class="sp-line"/>{dots}</svg>'

def trend_svg(c, TM, TA):
    """Both exams over all years, each as a share of its own total (like the dashboard)."""
    years = list(range(Y0, Y1 + 1)); n = len(years); W, H, P = 150, 36, 5
    def share(by, tot): return [int(by.get(str(y), 0)) / max(1, tot) for y in years]
    sm, sa = share(c['ym'], TM), share(c['ya'], TA); mx = max(sm + sa + [1e-9])
    def line(vals, cls):
        pts = [(P + i * (W - 2 * P) / (n - 1), H - P - v / mx * (H - 2 * P)) for i, v in enumerate(vals)]
        return f'<polyline points="{" ".join(f"{x:.1f},{y:.1f}" for x, y in pts)}" class="{cls}"/>' + ''.join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="2" class="{cls}-d"/>' for x, y in pts[-1:])
    return f'<svg class="spark wide" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="{E(c["name"])} questions per year {Y0} to {Y1}, JEE Main and JEE Advanced">{line(sm, "tr-m")}{line(sa, "tr-a")}</svg>'

SHARE_FOOT = '<div class="sf-share"><span>Share अंक-IT</span><div class="share share-dark" data-share></div></div>'

def exlogo(e, up, size=40):
    return f'<img class="exlogo" src="{up}img/exams/{e[2]}.webp?v={VER}" alt="{E(e[1])} exam logo" width="{size}" height="{size}" loading="lazy">'

STAT_MENU = [('question-counts/', 'Mathematics Bank: Question Counts'), ('chapter-wise-count/', 'Chapter-wise Count'), ('syllabus-priority/', 'Syllabus Priority'), ('chapter-weightage/', 'Chapter Weightage')]

def header(depth, up=None):
    up = '../' * depth if up is None else up
    home = up or './'
    chev = svg('<path d="m6 9 6 6 6-6"/>', 16)
    grid_ico = svg('<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>', 20)
    def dd(label, href, panel, cls=''):
        return f'<div class="sh-dd {cls}"><a class="sh-ddb" href="{href}" aria-haspopup="true" aria-expanded="false">{label} {chev}</a>{panel}</div>'
    def item(href, title, sub):
        return f'<a role="menuitem" href="{up}{href}"><b>{E(title)}</b><small>{E(sub)}</small></a>'
    cards = ''.join(f'<div class="mega-card" role="none">{exlogo(e, up, 44)}<span class="mc-body"><a class="stretch" role="menuitem" href="{up}exams/{e[2]}/">{E(e[1])}</a><span class="mc-tag">{E(e[3])}</span><span class="mc-meta">{E(exam_meta(e))}</span></span></div>' for e in ALL_EXAMS)
    exams_panel = (f'<div class="sh-mega" role="menu"><div class="mega-in"><p class="mega-h">Exams we cover <span>previous-year math questions, dates and safe scores</span></p><div class="mega-grid">{cards}</div>'
                   f'<div class="mega-foot"><a class="mega-all" href="{up}exams/">View all exams &rarr;</a></div></div></div>')
    res_panel = ('<div class="sh-panel sh-panel-w" role="menu"><div class="pn-in pn-2"><div class="pn-col"><p class="pn-h">Analysis</p>'
                 + item('resources/questions-analysis/', 'Questions Analysis', 'Math PYQs and DPPs analysis for every exam')
                 + item('resources/paper-wise-analysis/', 'Paper Wise Analysis', 'Every paper: levels and toughness')
                 + item('syllabus-priority/', 'Syllabus priority', 'Which chapters are asked the most')
                 + item('chapter-weightage/', 'Chapter weightage', 'Weightage by exam and year')
                 + item('chapter-wise-count/', 'Chapter-wise count', 'Questions in every chapter')
                 + item('question-counts/', 'Question counts', 'The numbers behind the bank')
                 + '</div><div class="pn-col"><p class="pn-h">Maths and planning</p>'
                 + item('maths/', f'All {len(CH)} maths chapters', 'Topics, subtopics and question counts')
                 + item('resources/important-exams/', 'Important exams after Class 12', 'A roadmap of every maths-based exam') + '</div></div></div>')
    nav = (f'<a class="sh-dash" href="{up}dashboard">{grid_ico}<span>Dashboard</span></a>'
           + dd('Exams', f'{up}exams/', exams_panel) + dd('Resources', f'{up}resources/questions-analysis/', res_panel, 'rel')
           + f'<a href="{up}#plans">Plans</a><a href="{up}contact/">Help</a>')
    login = f'<a class="sb sb-pri when-out" data-login href="{up}?login=1" rel="nofollow">Login</a>'
    user = (f'<div class="sh-user when-in"><div class="sh-pf"><a class="sh-av" data-av data-profile href="{up}dashboard#/profile" aria-label="Your account" aria-haspopup="true" aria-expanded="false">&nbsp;</a><div class="pfm" role="menu"></div></div></div>')
    burger = svg('<path d="M4 7h16M4 12h16M4 17h16"/>', 22)
    return f"""<a class="skip" href="#main">Skip to content</a>
<header class="sh"><div class="swrap sh-in">
<a class="sh-logo" href="{home}" aria-label="अंक-IT Mathematics Dashboard, home"><img src="{up}{LOGO}?v={VER}" alt="अंक-IT Mathematics Dashboard logo" width="220" height="81"></a>
<nav class="sh-nav" aria-label="Main">{nav}</nav>
<div class="sh-end">{login}{user}
<details class="sh-menu"><summary aria-label="Menu">{burger}</summary><nav aria-label="Menu" data-built="js"></nav></details></div>
</div></header>"""

def footer(depth, up=None, share=False):
    up = '../' * depth if up is None else up
    a = lambda frag: up + frag
    ex = ''.join(f'<li><a href="{up}exams/{e[2]}/">{E(e[1])}</a></li>' for e in EXAMS[:4])
    return f"""<footer class="sf"><div class="swrap">
<div class="sf-grid">
<div><img src="{up}img/ankit-logo-dark-sm.png?v={VER}" alt="अंक-IT Mathematics Dashboard logo" width="139" height="52"><p>Math practice for Class 11 and 12 and for JEE, KCET, NDA and IAT: a {BANK_N} question bank with full solutions, past papers from 2000, DPPs, handwritten handouts and NTA-style online tests.</p>{SHARE_FOOT if share else ''}</div>
<div><p class="sf-h">Explore</p><ul><li><a href="{up}maths/">Math chapters</a></li><li><a href="{up}syllabus-priority/">Syllabus priority</a></li><li><a href="{up}exams/">All exams</a></li><li><a href="{up}resources/questions-analysis/">Questions analysis</a></li><li><a href="{up}resources/paper-wise-analysis/">Paper wise analysis</a></li><li><a href="{up}resources/important-exams/">Important exams after Class 12</a></li><li><a href="{a("#features")}">Feature overview</a></li><li><a href="{a("#plans")}">Plans and pricing</a></li><li><a href="{a("#faq")}">Common questions</a></li></ul></div>
<div><p class="sf-h">Company</p><ul><li><a href="{up}about/">About us</a></li><li><a href="{up}contact/">Contact us</a></li><li><a href="{up}privacy/">Privacy policy</a></li><li><a href="{up}terms/">Terms of use</a></li><li><a href="{up}refund-policy/">Refund policy</a></li></ul></div>
</div>
<div class="sf-base"><span>&copy; 2026 अंक-IT Mathematics Dashboard</span><span>JEE Main · JEE Advanced · KCET · NDA · IAT · CUET UG</span></div>
</div></footer>"""

def aside(depth, current=None, up=None):
    up = '../' * depth if up is None else up
    cur = ' aria-current="page"'
    ex = ''.join(f'<li><a href="{up}exams/{e[2]}/"{cur if e[2] == current else ""}>{exlogo(e, up, 34)}<span><b>{E(e[1])}</b><small>{STATS[e[0]]["questions"]:,} questions</small></span></a></li>' for e in EXAMS) + f'<li><a href="{up}exams/cuet/"{cur if current == "cuet" else ""}>{exlogo(CUET, up, 34)}<span><b>CUET UG</b><small>Guide and safe scores</small></span></a></li>'
    pop = sorted(CH, key=lambda c: -c['m'])[:8]
    chs = ''.join(f'<li><a href="{up}maths/{slug(c)}/"><span>{E(short(c))}</span><small>{c["m"]} Main</small></a></li>' for c in pop)
    return (f'<aside class="pg-side" aria-label="Sidebar"><div class="side-box side-share"><p class="side-title">Share this page</p><div class="share" data-share></div></div><div class="side-cta"><p class="side-title">Practise free</p><p>Question bank, DPPs, past papers and tests, with full solutions.</p>'
            f'<a class="sb sb-gold when-out" data-login href="{up}?login=1" rel="nofollow">Login or register</a><a class="sb sb-gold when-in" href="{up}dashboard">Open your dashboard</a></div>'
            f'<div class="side-box"><p class="side-title">Exams</p><ul class="side-list">{ex}</ul></div>'
            f'<div class="side-box"><p class="side-title">Popular chapters</p><ul class="side-list side-ch">{chs}</ul><a class="side-more" href="{up}maths/">All chapters &rarr;</a></div>'
            f'<div class="side-box side-help"><p class="side-title">Need help?</p><p>Questions about signing in, plans or a question in the bank?</p><a href="{up}contact/">Contact us &rarr;</a></div></aside>')

def grid(main_html, depth, current=None, cls_='', up=None):
    return f'<div class="swrap pg-grid"><main id="main" class="pg-main {cls_}">{main_html}</main>{aside(depth, current, up)}</div>'

def tbl(head, rows, cls_='', nums=()):
    th = ''.join(h if h.startswith('<th') else f'<th scope="col"{" class=\"num\"" if i in nums else ""}>{h}</th>' for i, h in enumerate(head))
    return f'<div class="pg-table {cls_}"><table><thead><tr>{th}</tr></thead><tbody>{rows}</tbody></table></div>'

def band(crumbs, h1):
    return f'<section class="pg-hero"><div class="swrap"><nav class="pg-crumbs" aria-label="Breadcrumb">{crumbs}</nav><h1>{h1}</h1></div></section>'

def cta(depth, text, cur=None, exam=None):
    """'Recommended Reading': four page cards at the bottom of every public page (the page itself is left out)."""
    up = '../' * depth
    pool = []
    if exam:
        pool.append((f'exams/{exam[2]}/', f'{exam[1]}: everything you should know', 'Dates, countdown, safe scores, pattern, fees and colleges.', 'book'))
        if exam[0] in STATS: pool.append((f'resources/questions-analysis/{exam[2]}/', f'{exam[1]}: math PYQs analysis', 'Chapter-wise and year-wise counts with levels.', 'chart'))
    pool += [('syllabus-priority/', 'Syllabus priority', 'Which chapters and subtopics are asked the most.', 'chart'),
             ('maths/', 'All math chapters', f'{len(CH)} chapters and {D["tot_sub"]} subtopics, with question counts.', 'list'),
             ('exams/', 'All exams we cover', 'JEE Main, JEE Advanced, KCET, NDA, IAT and more.', 'cap'),
             ('exams/jee-main/', 'JEE Main: everything you should know', 'Dates, safe scores, pattern, fees, seats and colleges.', 'book'),
             ('exams/kcet/', 'KCET: everything you should know', 'Dates, safe scores, pattern, seat matrix and colleges.', 'book'),
             ('exams/nda/', 'NDA: everything you should know', 'Written paper, SSB interview, vacancies and salary.', 'book'),
             ('resources/questions-analysis/', 'Questions analysis', 'Math PYQs and DPPs analysis for every exam.', 'chart'),
             ('resources/paper-wise-analysis/', 'Paper wise analysis', 'Every paper: L1, L2, L3 and overall toughness.', 'chart'),
             ('resources/important-exams/', 'Important exams after Class 12', 'Every major mathematics-based entrance exam in one roadmap.', 'cap')]
    seen, picks = set(), []
    for path, t, b, ic in pool:
        if path == cur or path in seen: continue
        seen.add(path); picks.append((path, t, b, ic))
    icons = {'book': BOOK, 'chart': svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', 22), 'list': svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', 22), 'cap': svg('<path d="M12 3l9 5-9 5-9-5 9-5zM7 12v5c0 1 2.2 3 5 3s5-2 5-3v-5"/>', 22)}
    cards = ''.join(f'<li class="rr-card"><span class="rr-ico">{icons[ic]}</span><span class="rr-body"><a class="stretch" href="{up}{path}">{E(t)}</a><small>{E(b)}</small></span><i class="rr-go" aria-hidden="true">&rarr;</i></li>' for path, t, b, ic in picks[:4])
    return f'<section class="rr"><h2>Recommended Reading</h2><ul class="rr-grid">{cards}</ul></section>'

# ---------- chapter pages ----------
def chapter_page(i, c):
    n = int(c['no']); prev = CH[i - 1] if i > 0 else None; nxt = CH[i + 1] if i < len(CH) - 1 else None
    name = short(c); cl = cls(c)
    sh = CH_SHORT.get(c['code'], name)
    title = pick_title(f'{name}: Math Chapter Guide, PYQs & Practice', f'{name}: Math PYQs & Practice', f'{sh}: Math PYQs & Practice', f'{name}: PYQs & Practice', f'{sh}: PYQs & Practice')
    lead = lambda n_: f'{n_} (Class {cl} math): {len(c["subs"])} subtopics, with {c["m"]} JEE Main and {c["a"]} JEE Advanced previous-year questions tagged {Y0}–{Y1}.'
    desc = compose(lead(name) if len(lead(name)) <= 125 else lead(sh), 'Levels for every exam.', 'Practise free on अंक-IT.')
    tl = STATS['_all']['topic_levels']
    rows = ''.join(
        f'<tr><td>{E(s["name"])}</td><td class="num">{s["m"]}</td><td class="num">{s["a"]}</td>'
        f'<td><span class="lv lv-{LEVEL[s["mt"]].lower()}">{LEVEL[s["mt"]]}</span></td><td><span class="lv lv-{LEVEL[s["at"]].lower()}">{LEVEL[s["at"]]}</span></td>{lvcells(tl.get(s["code"], {}))}</tr>'
        for s in c['subs'])
    top = [s for s in sorted(c['subs'], key=lambda s: -(s['m'] + s['a']))[:3] if s['m'] + s['a'] > 0]
    focus = ''
    if top:
        focus = '<p>Most-tested subtopics in our previous-year data: ' + ', '.join(f'<b>{E(s["name"])}</b> ({s["m"]} Main, {s["a"]} Advanced)' for s in top) + '.</p>'
    links = ''
    if prev: links += f'<a class="pg-prev" href="../{slug(prev)}/">&larr; {E(short(prev))}</a>'
    if nxt: links += f'<a class="pg-next" href="../{slug(nxt)}/">{E(short(nxt))} &rarr;</a>'
    have = [e for e in EXAMS if c['code'] in STATS[e[0]]['chapters']]
    ex_rows = ''
    for e in have:
        d = STATS[e[0]]['chapters'][c['code']]; ys = sorted(int(y) for y in d['by_year'])
        ex_rows += f'<tr><td class="exn">{exlogo(e, "../../", 32)}<a href="../../resources/questions-analysis/{e[2]}/{slug(c)}/">{E(e[1])}</a></td><td class="num">{d["questions"]}</td>{lvcells(d["by_level"])}<td>{ys[0]}–{ys[-1]}</td></tr>'
    by_exam = ('<h2>Questions by exam</h2><p>How many previous-year questions of this chapter each exam has asked, split by level (L1 easy, L2 medium, L3 hard). Open an exam to see its topic-wise and year-wise counts for this chapter.</p>'
               + tbl(['Exam', 'Questions', LVH, 'Years'], ex_rows, 'pg-narrow', (1,))) if ex_rows else ''
    modern = [(f'{exlogo(e, "../../", 24)}{E(e[1])}', STATS[e[0]]['chapters'][c['code']]['by_year']) for e in have if STATS[e[0]]['last'] >= 2013]
    legacy = [(f'{exlogo(e, "../../", 24)}{E(e[1])}', STATS[e[0]]['chapters'][c['code']]['by_year']) for e in have if STATS[e[0]]['last'] < 2013]
    trend = '<h2>Year-wise trend</h2><p>Questions per year from this chapter in every exam. Darker cells mean more questions that year.</p>' + (heat(modern, 2013, Y1) if modern else '')
    if legacy: trend += '<p class="pg-fine">Earlier exams, before 2013:</p>' + heat(legacy, 2000, 2012)
    crumbs = f'<a href="../../">Home</a> &rsaquo; <a href="../">Math</a> &rsaquo; <span aria-current="page">{E(name)}</span>'
    main = f"""<p class="pg-lead">Class {cl} · Chapter {n} of {len(CH)} · {len(c["subs"])} subtopics</p>
<p>{E(INTRO[n])}</p>
<ul class="pg-stats"><li><b>{c["m"]}</b><span>JEE Main questions tagged ({Y0}–{Y1})</span></li><li><b>{c["a"]}</b><span>JEE Advanced questions tagged</span></li><li><b>{len(c["subs"])}</b><span>subtopics</span></li></ul>
{focus}
<h2>Subtopics and how important each one is</h2>
<p>Counts are the previous-year questions tagged to each subtopic in the अंक-IT question bank. Importance reflects how often the subtopic is asked: High, Medium, Low, or Rare when it has hardly appeared. L1, L2 and L3 show the level of the questions (all exams together).</p>
{tbl(['Subtopic', 'Main Qs', 'Adv. Qs', 'Main', 'Adv.', LVH], rows, '', (1, 2))}
{by_exam}
{related('../../', ('resources/questions-analysis/jee-main/', 'JEE Main chapter-wise analysis'), ('resources/paper-wise-analysis/', 'Paper wise analysis'), ('syllabus-priority/', 'Syllabus priority'), ('chapter-weightage/', 'Chapter weightage'), ('exams/jee-main/', 'JEE Main: everything you should know'))}
{trend}
{cta(2, f"Solve {name} questions chapter-wise with full solutions, take NTA-style online tests and see your rank. The question bank, previous-year papers, DPPs and handouts are inside after you sign in.")}
<nav class="pg-pn" aria-label="Chapters">{links}</nav>"""
    body = band(crumbs, "Math: " + E(name)) + '\n' + grid(main, 2)
    ld = [{'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Math', 'item': SITE + '/maths/'},
            {'@type': 'ListItem', 'position': 3, 'name': name, 'item': url(c)}]},
          {'@context': 'https://schema.org', '@type': 'WebPage', 'name': f'Math: {name}', 'description': desc, 'url': url(c),
           'inLanguage': LANG, 'isPartOf': {'@type': 'WebSite', 'name': 'अंक-IT Mathematics Dashboard', 'url': SITE + '/'}}]
    return page(title, desc, url(c), body, 2, ld)

def chapter_list(prefix, with_stats=False):
    out = ''
    for label, sel in (('Class 11', lambda c: cls(c) == '11'), ('Class 12', lambda c: cls(c) == '12')):
        items = ''.join(
            f'<li><a href="{prefix}{slug(c)}/">{E(short(c))}</a>' + (f'<span>{len(c["subs"])} subtopics · {c["m"]} Main · {c["a"]} Adv.</span>' if with_stats else '') + '</li>'
            for c in CH if sel(c))
        out += f'<h2>{label}</h2><ul class="pg-chlist">{items}</ul>'
    oos = ''.join(f'<li><span class="pg-oos">{E(n)}</span><span>Out of syllabus · {code}</span></li>' for code, n in OOS)
    out += f'<h2>Out of syllabus</h2><p class="pg-fine">These chapters are no longer part of the current JEE syllabus. Their questions are still in the question bank and are marked <b>Out of Syllabus</b>, so you can include or leave them out.</p><ul class="pg-chlist">{oos}</ul>'
    return out

def hub_page():
    title = pick_title('Math Chapters: Class 11 & 12 Syllabus and PYQs')
    desc = compose(f'All {len(CH)} math chapters and {D["tot_sub"]} subtopics for Class 11 and 12, with JEE Main and JEE Advanced previous-year question counts ({Y0}–{Y1}).',
                   'Practise free on अंक-IT.')
    crumbs = '<a href="../">Home</a> &rsaquo; <span aria-current="page">Math</span>'
    main = f"""<p class="pg-lead">{len(CH)} chapters in the syllabus · {D["tot_sub"]} subtopics · plus {len(OOS)} out-of-syllabus chapters</p>
<p>The math syllabus split into chapters and subtopics. Open a chapter to see its subtopics, how often each one was asked in JEE Main and JEE Advanced, and the year-wise trend, then sign in to practise the questions with full solutions.</p>
{chapter_list('', True)}
{cta(1, "Choose a chapter, practise previous-year questions with solutions, and take online tests. Starting is free.", cur='maths/')}"""
    body = band(crumbs, "Math: all chapters") + '\n' + grid(main, 1)
    ld = [{'@context': 'https://schema.org', '@type': 'ItemList', 'name': 'Math chapters', 'itemListElement': [
            {'@type': 'ListItem', 'position': k + 1, 'name': short(c), 'url': url(c)} for k, c in enumerate(CH)]}]
    return page(title, desc, f'{SITE}/maths/', body, 1, ld)

# ---------- exam pages ----------
# ---------- exam guide pages: /exams/<exam>/about/ ----------
def gd_cell(c):
    if isinstance(c, dict): return '<ul class="gd-ul">' + ''.join(f'<li>{E(x)}</li>' for x in c['list']) + '</ul>'
    return E(c)

def gd_table(t):
    head, rows = t[0], t[1:]
    span = {}   # an empty cell continues the cell above it (merged cells in the PDF)
    last = {}
    for ri, r in enumerate(rows):
        for ci, c in enumerate(r):
            if c == '' and ci in last: span[last[ci]] = span.get(last[ci], 1) + 1; r[ci] = None
            else: last[ci] = (ri, ci)
    th = ''.join(f'<th scope="col">{gd_cell(h)}</th>' for h in head)
    body = ''
    for ri, r in enumerate(rows):
        tds = ''
        for ci, c in enumerate(r):
            if c is None: continue
            rs = span.get((ri, ci), 1); at = f' rowspan="{rs}"' if rs > 1 else ''
            tds += (f'<th scope="row"{at}>{gd_cell(c)}</th>' if ci == 0 else f'<td{at}>{gd_cell(c)}</td>')
        body += f'<tr>{tds}</tr>'
    short = all(isinstance(r[0], str) and len(r[0]) <= 10 for r in rows)   # a narrow first column (#, Step, Day) stays narrow
    return f'<div class="pg-table gd-tbl{" gd-n1" if short else ""}"><table><thead><tr>{th}</tr></thead><tbody>{body}</tbody></table></div>'

def gd_blocks(blocks):
    return ''.join(f'<p>{E(b["p"])}</p>' if 'p' in b else gd_table(b['table']) for b in blocks)

GD_ICONS = ['<path d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>', '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', '<path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>', '<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/>', '<path d="M12 3l9 5-9 5-9-5 9-5zM7 12v5c0 1 2.2 3 5 3s5-2 5-3v-5"/>', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', '<path d="M4 4h16v16H4zM4 10h16M10 4v16"/>']

OFFICIAL = {'jee-main': [('NTA JEE Main (official site)', 'https://jeemain.nta.nic.in/'), ('JoSAA counselling', 'https://josaa.nic.in/')],
            'jee-advanced': [('JEE Advanced (official site)', 'https://jeeadv.ac.in/'), ('JoSAA counselling', 'https://josaa.nic.in/')],
            'nda': [('UPSC (official site)', 'https://upsc.gov.in/')],
            'kcet': [('Karnataka Examinations Authority (official site)', 'https://cetonline.karnataka.gov.in/kea/')],
            'iat': [('IISER admissions (official site)', 'https://iiseradmission.in/')]}

# Important dates. Only dates the owner supplied are shown; every other exam says the date is not announced yet.
DATES = {'jee-main': {
    'title': 'JEE Main 2027: important dates (NTA schedule)', 'cols': ['Event', 'Session 1 (January 2027)', 'Session 2 (April 2027)'], 'bold': ('Dates of examination',),
    'rows': [('Online submission of application form', '24 October 2026 to 22 November 2026 (up to 11:50 P.M.)', '05 January 2027 to 03 February 2027 (up to 11:50 P.M.)'),
             ('Last date for successful transaction of the prescribed application fee', '22 November 2026 (up to 11:50 P.M.)', '03 February 2027 (up to 11:50 P.M.)'),
             ('Submission of the online application form with late fee', '23 November 2026 to 26 November 2026 (up to 11:50 P.M.). (An additional late fee of Rs. 500 is payable over and above the applicable category-wise examination fee. The late fee shall be uniform for all categories of candidates, irrespective of the examination fee applicable to their respective categories.)', '04 February 2027 to 07 February 2027 (up to 11:50 P.M.). (An additional late fee of Rs. 500 is payable over and above the applicable category-wise examination fee. The late fee shall be uniform for all categories of candidates, irrespective of the examination fee applicable to their respective categories.)'),
             ('Correction in particulars of the online application form', '27 November 2026 to 29 November 2026 (up to 11:50 P.M.)', '08 February 2027 to 10 February 2027 (up to 11:50 P.M.)'),
             ('City intimation slip', '30 December 2026', '12 March 2027'),
             ('Downloading admit cards from the NTA website', '13 January 2027', '25 March 2027'),
             ('Dates of examination', '20, 21, 22, 23, 24 and 28 January 2027', '2, 3, 4, 5, 6 and 7 April 2027'),
             ('Display of the question paper attempted by the candidate and answer keys for inviting challenges', 'Will be displayed on the NTA website', 'Will be displayed on the NTA website')],
    'note': 'This is the schedule published by NTA for JEE Main 2027. Dates can change, so confirm on the official website.'}}
NEXT_DATE = {'jee-main': ('2027-01-20', 'JEE Main 2027 · Session 1', 'Wednesday, 20 January 2027'),
             'jee-advanced': ('2027-05-23', 'JEE Advanced 2027', 'Sunday, 23 May 2027')}   # exam day (Indian time)
BULLETIN = {'jee-main': ('NTA JEE Main', 'https://jeemain.nta.nic.in/'), 'jee-advanced': ('JEE Advanced', 'https://jeeadv.ac.in/'),
            'kcet': ('Karnataka Examinations Authority', 'https://cetonline.karnataka.gov.in/kea/'), 'nda': ('UPSC', 'https://upsc.gov.in/'),
            'iat': ('IISER admissions', 'https://iiseradmission.in/'), 'cuet': ('NTA CUET UG', 'https://cuet.nta.nic.in/')}
OFFICIAL['cuet'] = [('NTA CUET UG (official site)', 'https://cuet.nta.nic.in/')]
PDF_ICO = svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 14h6M9 17h4"/>', 20)

def countdown(e):
    key, name, sl = e[0], e[1], e[2]
    if sl in NEXT_DATE:
        iso, label, nice = NEXT_DATE[sl]
        return (f'<div class="cd" data-cd="{iso}" role="timer" aria-label="Countdown to {E(label)}"><p class="cd-t"><b>{E(label)}</b> &middot; {E(nice)}</p>'
                '<div class="cd-n"><div><b data-u="d">&ndash;</b><span>days</span></div><div><b data-u="h">&ndash;</b><span>hours</span></div><div><b data-u="m">&ndash;</b><span>minutes</span></div><div><b data-u="s">&ndash;</b><span>seconds</span></div></div>'
                f'<p class="cd-fine">Counting down to {E(nice)}. Dates can change: confirm on the official website.</p></div>')
    who = SHORT.get(key, ('the conducting body',))[0] if key in SHORT else 'the conducting body'
    return (f'<div class="cd cd-tba"><p class="cd-t"><b>Next {E(name)} exam</b></p><p class="cd-wait">Date to be announced by {E(who)}.</p>'
            '<p class="cd-fine">A live countdown appears here as soon as the exam date is published.</p></div>')

def dates_block(e, cd=True):
    key, name, sl = e[0], e[1], e[2]
    if sl in ('aieee', 'iit-jee'): return ''
    out = (f'<h2 id="dates">{E(name)}: exam date and countdown</h2>' + countdown(e)) if cd else f'<h2>{E(name)}: important dates</h2>'
    d = DATES.get(sl)
    if d:
        th = ''.join(f'<th scope="col">{E(c)}</th>' for c in d['cols'])
        rows = ''
        for r in d['rows']:
            b = r[0] in d['bold']
            rows += f'<tr><th scope="row">{E(r[0])}</th>' + ''.join(f'<td>{"<b>" + E(c) + "</b>" if b else E(c)}</td>' for c in r[1:]) + '</tr>'
        out += f'<h3 class="dt-h">{E(d["title"])}</h3><div class="pg-table gd-tbl dt-tbl"><table><thead><tr>{th}</tr></thead><tbody>{rows}</tbody></table></div><p class="pg-fine">{E(d["note"])}</p>'
    bl = BULLETIN.get(sl)
    if bl:
        out += (f'<p class="bulletin"><a class="bl-btn" href="{bl[1]}" target="_blank" rel="noopener noreferrer">{PDF_ICO}<span>Official information bulletin<small>{E(bl[0])}: the original bulletin (PDF) is published here</small></span></a></p>')
    return out

def rank_range(txt, vmax):
    nums = [float(x.replace(',', '')) for x in re.findall(r'\d[\d,]*(?:\.\d+)?', txt or '')]
    if not nums: return None
    lo = nums[0]; hi = nums[1] if len(nums) > 1 else (vmax if '+' in (txt or '') else lo)
    return min(lo, hi), max(lo, hi)

def rank_chart(table, vcol, rcol, vmax, caption, prefix='', unit='marks'):
    items = ''
    for r in table[1:]:
        rg = rank_range(r[vcol] if isinstance(r[vcol], str) else '', vmax)
        if not rg: continue
        lo, hi = rg; o = max(0, min(100, round(100 * lo / vmax))); w = max(2, min(100 - o, round(100 * (hi - lo) / vmax)))
        r_txt = r[rcol] if isinstance(r[rcol], str) else ''
        items += f'<li><span class="rk-v">{E(r[vcol])}</span><span class="rk-track"><i class="o{o} w{w}"></i></span><span class="rk-r">{E(prefix + r_txt)}</span></li>'
    if not items: return ''
    return (f'<figure class="rk"><figcaption>{E(caption)}</figcaption><ol class="rk-list">{items}</ol><p class="rk-ax"><span>0</span><span>{vmax:g} {unit}</span></p></figure>')

# (sub-section number, column of the score, column of the rank, highest score, caption, text before the rank)
RK_CHART = {'jee-main': (1, 0, 2, 300, 'Raw marks (out of 300) and the approximate All India Rank', 'AIR '),
            'jee-advanced': (0, 1, 2, 360, 'Marks (equivalent out of 360) and the Common Rank List range', 'CRL '),
            'kcet': (0, 0, 3, 180, 'KCET score (out of 180) and the engineering merit rank', 'Rank '),
            'iat': (0, 0, 1, 240, 'IAT score (out of 240) and the approximate general-category rank', 'AIR '),
            'cuet': (0, 1, 0, 200, 'Domain subject score (out of 200) and the percentile', '')}

def safe_block(e, h2=True, hid=True, lead=True):
    key, name, sl = e[0], e[1], e[2]
    if not COMP or sl not in COMP_SEC: return ''
    sec = COMP['sections'][COMP_SEC[sl]]
    out = (f'<h2{" id=\"safe-scores\"" if hid else ""}>{E(name)}: safe scores and 10-year marks vs rank</h2>' if h2 else '')
    out += gd_blocks(sec['blocks'] if lead or any('table' in b for b in sec['blocks']) else [])
    for i, sb in enumerate(sec['subs']):
        out += f'<div class="gd-sub"><h3>{E(sb["h"])}</h3>{gd_blocks(sb["blocks"])}'
        c = RK_CHART.get(sl)
        if c and c[0] == i:
            tb = next((b['table'] for b in sb['blocks'] if 'table' in b), None)
            if tb: out += rank_chart(tb, c[1], c[2], c[3], c[4], c[5])
        out += '</div>'
    return out + '<p class="pg-fine">Compiled from published cutoffs and public reports for 2015&ndash;2026. These are approximate: they move every year with paper difficulty, the number of candidates, category and counselling round. Use them to plan, and always check the official results.</p>'

ANA = 'resources/questions-analysis'

EXAM_LINKS = [('JEE Advanced', 'jee-advanced'), ('JEE Main', 'jee-main'), ('KCET', 'kcet'), ('NDA', 'nda'), ('IAT', 'iat'), ('CUET UG', 'cuet')]
def autolink(html_, up, skip=''):
    """Link the first mention of each exam name in running text to that exam's page (never inside links, headings, buttons or table headers)."""
    done = {skip}; out = []; blocked = 0
    for part in re.split(r'(<[^>]+>)', html_):
        if part.startswith('<'):
            m = re.match(r'<(/?)(a|h[1-6]|button|th|summary|script|style)\b', part, re.I)
            if m: blocked += -1 if m.group(1) else 1; blocked = max(blocked, 0)
            out.append(part); continue
        if not blocked and part.strip():
            for nm, sl in EXAM_LINKS:
                if sl in done: continue
                m = re.search(r'(?<![\w/-])' + re.escape(nm) + r'(?![\w-])', part)
                if m:
                    part = part[:m.start()] + f'<a class="xl" href="{up}exams/{sl}/">{nm}</a>' + part[m.end():]; done.add(sl)
        out.append(part)
    return ''.join(out)
def related(up, *links):
    return '<p class="relb"><b>Related:</b> ' + ' &middot; '.join(f'<a href="{up}{h}">{E(t)}</a>' for h, t in links) + '</p>'

# parts of the guide that say the same thing as another part of the page, and are therefore left out
GUIDE_DROP = {'jee-main': ['Recent JEE Main Qualifying Cutoff Percentiles (Paper 1)'], 'iat': ['Safe Target Scores & Expected Rank Range (Out of 240 Marks)']}
COMP_DROP_LEAD = {'jee-main'}   # the short opening paragraph of the safe-scores block repeats the pattern section

def exam_page(e):
    """/exams/<exam>/ : everything about the exam in one place, in the order a student reads it:
    countdown, overview, paper pattern, important dates, step-by-step timeline, safe scores, numbers, fees, seats, colleges."""
    key, name, sl, tag, about = e
    g = GUIDES.get(sl); s = STATS.get(key)
    title = pick_title(f'{name}: Everything You Should Know')
    intro = (g['intro'].split('. ', 1)[1] if '. ' in g['intro'] else g['intro']) if g else tag
    first = intro.split('. ')[0].rstrip('.') + '.'
    desc = compose(f'{name}: exam date and countdown, pattern, fees, safe scores and cutoffs, seats and colleges, all in one place.', first if g else '', tag,
                   f'Conducted by {SHORT[key][0]}.' if key in SHORT else '', f'{s["questions"]:,} past math questions analysed.' if s else '')
    has_dates = sl not in ('aieee', 'iit-jee')
    drop = set(GUIDE_DROP.get(sl, []))
    def gsec(sec):
        subs = ''.join(f'<div class="gd-sub"><h3>{E(sb["h"])}</h3>{gd_blocks(sb["blocks"])}</div>' for sb in sec['subs'] if sb['h'] not in drop)
        return gd_blocks(sec['blocks']) + subs
    items = []   # (title, body html)
    if g:
        secs = g['sections']
        pi = next((i for i, x in enumerate(secs) if re.search(r'pattern|structure', x['h'], re.I)), min(1, len(secs) - 1))
        tl = [x for x in secs if re.search(r'timeline', x['h'], re.I)]
        head_secs = secs[:pi + 1]; rest = [x for x in secs[pi + 1:] if x not in tl]
        items += [(x['h'], gsec(x)) for x in head_secs]
        if items: items[-1] = (items[-1][0], items[-1][1] + related('../../', *([(f'{ANA}/{sl}/', f'{name}: chapter-wise analysis')] if s else []) + ([(f'resources/paper-wise-analysis/{sl}/', f'{name}: paper wise analysis')] if s else []) + [('syllabus-priority/', 'Syllabus priority'), ('maths/', 'All maths chapters')]))
        d = dates_block(e, cd=False) if has_dates else ''
        if d and ('<table' in d or 'bulletin' in d): items.append((f'{name}: important dates', d.split('</h2>', 1)[1]))
        items += [(x['h'], gsec(x)) for x in tl]
        sb_html = safe_block(e, h2=False, lead=(sl not in COMP_DROP_LEAD))
        if sb_html: items.append((f'Safe scores and 10-year marks vs rank', sb_html))
        items += [(x['h'], gsec(x)) for x in rest]
    else:
        d = dates_block(e, cd=False) if has_dates else ''
        if d and ('<table' in d or 'bulletin' in d): items.append((f'{name}: important dates', d.split('</h2>', 1)[1]))
        sb_html = safe_block(e, h2=False)
        if sb_html: items.append(('Safe scores and 10-year marks vs rank', sb_html))
    toc = ''; secs_html = ''
    for i, (h2, body) in enumerate(items, 1):
        sid = f'sec{i}'
        toc += f'<a href="#{sid}"><b>{i}</b>{E(h2)}</a>'
        secs_html += (f'<section class="gd-sec" id="{sid}"><h2><span class="gd-ico">{svg(GD_ICONS[(i - 1) % len(GD_ICONS)], 22)}</span><span class="gd-t"><small>Section {i}</small>{E(h2)}</span></h2>{autolink(body, "../../", sl)}</section>')
    facts = ''
    if not g and key in FACTS:
        facts = f'<h2 id="glance">{E(name)} at a glance</h2><div class="pg-table pg-facts"><table><tbody>' + ''.join(f'<tr><th scope="row">{E(k)}</th><td>{E(v)}</td></tr>' for k, v in FACTS[key]) + '</tbody></table></div>'
    if s:
        nyr = s['last'] - s['first'] + 1
        qline = (f'<div class="know"><div><b>{E(name)} math questions: {s["questions"]:,} in our bank</b><span>{s["first"]}&ndash;{s["last"]} ({nyr} years, {s["papers"]} papers). Chapter-wise and year-wise analysis, with levels.</span></div>'
                 f'<a class="know-btn" href="../../{ANA}/{sl}/">{BOOK}{E(name)}: Math PYQs, DPPs Analysis{ARROW}</a></div>')
    else:
        qline = '<div class="soon"><b>Math questions for this exam are coming.</b><span>Practise the Class 12 chapters from the dashboard until then.</span></div>' if sl == 'cuet' else ''
    others = ''.join(f'<li><a href="../{x[2]}/">{exlogo(x, "../../", 32)}<span>{E(x[1])}: everything you should know</span></a></li>' for x in ALL_EXAMS if x[2] != sl and (x[2] in GUIDES))
    official = ('<p class="gd-off"><b>Official websites (the exam\'s information bulletin is published there):</b> ' + ' &middot; '.join(f'<a href="{u}" target="_blank" rel="noopener">{E(t)}</a>' for t, u in OFFICIAL[sl]) + '</p>') if sl in OFFICIAL else ''
    cd_top = f'<div id="dates">{countdown(e)}</div>' if has_dates else ''
    lead = f'<p class="pg-lead">{E(about)}</p>' if g else f'<p class="pg-lead">{E(tag)}</p><p>{E(about)}</p>'
    main = f"""{cd_top}
{lead}
{('<nav class="gd-toc" aria-label="On this page"><p class="gd-toc-h">On this page</p><div>' + toc + '</div></nav>') if toc else ''}
{facts}
{secs_html}
{official}<p class="pg-fine">The figures here are rounded or approximate and are compiled from the official notifications and public reports. They change from year to year, so always confirm the latest rules, dates and fees on the official website of the exam.</p>
{qline}
{('<h2 class="gd-more-h">Other exams</h2><ul class="side-list gd-more">' + others + '</ul>') if others else ''}
{cta(2, f"Practise {name} math questions chapter-wise with full solutions, build DPPs and open whole papers. Everything is inside after you sign in.", cur=f'exams/{sl}/', exam=e)}"""
    crumbs = f'<a href="../../">Home</a> &rsaquo; <a href="../">Exams</a> &rsaquo; <span aria-current="page">{E(name)}</span>'
    body = band(crumbs, f'{exlogo(e, "../../", 44)} {E(name)}: Everything you should know') + '\n' + grid(main, 2, sl)
    ld = [{'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Exams', 'item': SITE + '/exams/'},
            {'@type': 'ListItem', 'position': 3, 'name': name, 'item': exam_url(e)}]}]
    return page(title, desc, exam_url(e), body, 2, ld)

def analysis_page(e):
    """/resources/questions-analysis/<exam>/ : how many questions of the exam, by chapter and by year, with levels."""
    key, name, sl, tag, about = e
    s = STATS[key]
    title = pick_title(f'{name}: Math PYQs, DPPs Analysis {s["first"]}–{s["last"]}', f'{name} Math PYQ Analysis {s["first"]}–{s["last"]}')
    desc = compose(f'{name} math analysis: {s["questions"]:,} previous-year questions from {s["first"]} to {s["last"]}, with chapter-wise and year-wise counts and levels (L1, L2, L3).',
                   'Practise free on अंक-IT.')
    ins = sum(n for c, n in s['by_chapter'].items() if c in CH_SLUG); outs = s['questions'] - ins
    split = f' ({ins:,} in the {len(CH)} syllabus chapters and {outs:,} in out-of-syllabus chapters)' if outs else f' (all in the {len(CH)} syllabus chapters)'
    glance = (f'<tr><th scope="row">Math questions in this bank</th><td>{s["questions"]:,}{split}</td></tr><tr><th scope="row">Years covered</th><td>{s["first"]}–{s["last"]}</td></tr>'
              f'<tr><th scope="row">Papers (shifts and sessions)</th><td>{s["papers"]}</td></tr>')
    lvd = s['by_level']; lvt = sum(lvd.values()) or 1
    glance += f'<tr><th scope="row">Question levels</th><td>L1 {lvd["L1"]:,} ({round(100 * lvd["L1"] / lvt)}%) · L2 {lvd["L2"]:,} ({round(100 * lvd["L2"] / lvt)}%) · L3 {lvd["L3"]:,} ({round(100 * lvd["L3"] / lvt)}%)</td></tr>'
    def chrow(code, d):
        nm = E(CH_NAME.get(code, code))
        label = f'<a href="{ANY_SLUG[code]}/">{nm}</a>' + ('' if code in CH_SLUG else ' <span class="lv">out of syllabus</span>')
        return f'<tr><td>{label}</td><td class="num">{d["questions"]}</td>{lvcells(d["by_level"])}<td class="sp">{spark(d["by_year"], s["last"])}</td></tr>'
    crows = ''.join(chrow(c, d) for c, d in sorted(s['chapters'].items(), key=lambda kv: (-kv[1]['questions'], kv[0])))
    yr_strip = yrtbl(s['by_year_lv'], s['first'], s['last'])
    nyr = s['last'] - s['first'] + 1
    basis = f'These counts use all {E(name)} papers in this bank: {nyr} years ({s["first"]}&ndash;{s["last"]}), {s["papers"]} papers and {s["questions"]:,} questions.'
    know = (f'<div class="know"><div><b>Want the dates, safe scores and pattern of {E(name)}?</b><span>Countdown, cutoffs, fees, seats, top colleges and the timeline are all on the exam page.</span></div>'
            f'<a class="know-btn" href="../../../exams/{sl}/">{BOOK}{E(name)}: Everything you should know{ARROW}</a></div>')
    crumbs = f'<a href="../../../">Home</a> &rsaquo; <a href="../">Questions Analysis</a> &rsaquo; <span aria-current="page">{E(name)}</span>'
    main = f"""<p class="pg-lead">{E(tag)}</p>
<nav class="qlinks" aria-label="On this page"><a href="#glance">In this question bank</a><a href="#chapters">Chapter-wise questions</a><a href="#years">Year-wise</a></nav>
<h2 id="glance">{E(name)} in this question bank</h2>
<div class="pg-table pg-facts"><table><tbody>{glance}</tbody></table></div>
<h2 id="chapters">Chapter-wise questions</h2>
<p>How many {E(name)} math questions come from each chapter. Open a chapter to see its topic-wise and year-wise counts for {E(name)}.</p>
<p class="pg-fine">{basis} L1 easy, L2 medium, L3 hard. The dot graph shows the last five years of the exam, from the oldest on the left.</p>
{tbl(['Chapter', 'Questions', LVH, 'Last 5 years'], crows, '', (1,))}
<h2 id="years">Year-wise questions</h2>
<p class="pg-fine">Each row is one year of {E(name)}: how many questions were asked and their level (L1 easy, L2 medium, L3 hard).</p>
{yr_strip}
{know}
{related('../../../', (f'resources/paper-wise-analysis/{sl}/', f'{name} paper wise analysis'), ('syllabus-priority/', 'Syllabus priority'), ('chapter-weightage/', 'Chapter weightage'), (f'exams/{sl}/#dates', f'{name} dates and countdown'), ('resources/important-exams/', 'Important exams after Class 12'))}
{cta(3, f"Practise {name} questions chapter-wise with full solutions, build DPPs and open whole papers in exam format. Everything is inside after you sign in.", cur=f'{ANA}/{sl}/', exam=e)}"""
    body = band(crumbs, f'{exlogo(e, "../../../", 44)} {E(name)}: Math PYQs, DPPs Analysis') + '\n' + grid(main, 3, sl)
    u = f'{SITE}/{ANA}/{sl}/'
    ld = [{'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Questions Analysis', 'item': f'{SITE}/{ANA}/'},
            {'@type': 'ListItem', 'position': 3, 'name': name, 'item': u}]}]
    return page(title, desc, u, body, 3, ld)

def tough_score(p): return (p['L1'] + 2 * p['L2'] + 3 * p['L3']) / max(1, p['n'])

def paper_wise_page(e):
    name = e[1]; sl = e[2]
    papers = STATS[e[0]]['paper_list']
    sc = sorted(tough_score(p) for p in papers)
    def label(v):   # relative to all JEE Main papers in the bank: bottom fifth easy ... top fifth very tough
        r = sum(1 for x in sc if x < v) / len(sc)
        return ('Easy', 'e') if r < .2 else ('Moderately easy', 'me') if r < .4 else ('Moderate', 'm') if r < .6 else ('Tough', 't') if r < .8 else ('Very tough', 'vt')
    title = pick_title(f'{name} Paper Wise Analysis: Levels & Toughness', f'{name} Paper Wise Analysis & Toughness', f'{name} Paper Wise Analysis')
    desc = compose(f'{name} math, paper by paper: the L1, L2 and L3 questions in each of the {len(papers)} papers from {papers[-1]["year"]} to {papers[0]["year"]}, and how tough each one was.',
                   'Year-wise averages too.', 'Free on अंक-IT.')
    tot = sum(p['n'] for p in papers); t1 = sum(p['L1'] for p in papers); t2 = sum(p['L2'] for p in papers); t3 = sum(p['L3'] for p in papers)
    avg = sum(tough_score(p) for p in papers) / len(papers)
    hardest = max(papers, key=tough_score); easiest = min(papers, key=tough_score)
    def bar(p):
        n = max(1, p['n']); w = lambda k: round(100 * p[k] / n)
        return f'<span class="lvbar" aria-hidden="true"><i class="l1 w{w("L1")}"></i><i class="l2 w{w("L2")}"></i><i class="l3 w{w("L3")}"></i></span>'   # the L1/L2/L3 columns carry the same numbers
    def tough_cell(p):
        v = tough_score(p); lb, k = label(v)
        return f'<td><span class="tg tg-{k}">{lb}</span> <small class="tg-v">{v:.2f}/3</small></td>'
    def top_ch(p): return ', '.join(f'{E(CH_NAME.get(c, c))} ({n})' for c, n in p['top'])
    def row(p):
        short = p['paper'] or f'{p["year"]} paper'
        # compact rows (this page lists every paper): number alignment and column widths come from .pw-t in site.css, not per-cell classes
        return (f'<tr><td><b>{E(short)}</b></td><td>{p["n"]}</td><td>{p["L1"]}</td><td>{p["L2"]}</td><td>{p["L3"]}</td><td>{bar(p)}</td>{tough_cell(p)}<td>{top_ch(p)}</td></tr>')
    head = '<thead><tr><th scope="col">Paper</th><th scope="col" class="num">Qs</th><th scope="col" class="num lh l1">L1</th><th scope="col" class="num lh l2">L2</th><th scope="col" class="num lh l3">L3</th><th scope="col">Mix</th><th scope="col">Toughness</th><th scope="col">Most-asked chapters</th></tr></thead>'
    by_year = {}
    for p in papers: by_year.setdefault(p['year'], []).append(p)
    yrows = ''
    for y in sorted(by_year, reverse=True):
        ps = by_year[y]; n = sum(p['n'] for p in ps); a1, a2, a3 = (sum(p[k] for p in ps) for k in LV)
        v = sum(tough_score(p) for p in ps) / len(ps); lb, k = label(v)
        yrows += (f'<tr><td><a href="#y{y}"><b>{y}</b></a></td><td class="num">{len(ps)}</td><td class="num">{n:,}</td><td class="num">{round(100 * a1 / n)}%</td><td class="num">{round(100 * a2 / n)}%</td><td class="num">{round(100 * a3 / n)}%</td>'
                  f'<td><span class="tg tg-{k}">{lb}</span> <small class="tg-v">{v:.2f}/3</small></td></tr>')
    secs = ''
    for i, y in enumerate(sorted(by_year, reverse=True)):
        ps = by_year[y]
        secs += (f'<details class="pw-y" id="y{y}"{" open" if i == 0 else ""}><summary><h2>{y}<small>{len(ps)} paper{"s" if len(ps) != 1 else ""} · {sum(p["n"] for p in ps)} questions</small></h2></summary>'
                 f'<div class="pg-table pw-t"><table>{head}<tbody>{"".join(row(p) for p in ps)}</tbody></table></div></details>')
    top5 = lambda lst: ''.join(f'<li><b>{E(p["paper"] or p["year"])}</b><span>{p["L1"]} L1 · {p["L2"]} L2 · {p["L3"]} L3</span><em>{tough_score(p):.2f}</em></li>' for p in lst)
    tough_l = sorted(papers, key=tough_score, reverse=True)[:5]; easy_l = sorted(papers, key=tough_score)[:5]
    tiles = (f'<div class="gd-tiles"><div><b>{len(papers)}</b><span>papers analysed</span></div><div><b>{tot:,}</b><span>questions</span></div>'
             f'<div><b>{round(100 * t1 / tot)}% · {round(100 * t2 / tot)}% · {round(100 * t3 / tot)}%</b><span>overall L1 · L2 · L3</span></div><div><b>{avg:.2f}/3</b><span>average toughness</span></div></div>')
    crumbs = f'<a href="../../../">Home</a> &rsaquo; <a href="../">Paper Wise Analysis</a> &rsaquo; <span aria-current="page">{E(name)}</span>'
    main = f"""<p class="pg-lead">Every {name} paper in the bank, one by one: how many easy (L1), medium (L2) and hard (L3) math questions it had, and how tough it was overall.</p>
{tiles}
<div class="know"><div><b>How to read the toughness</b><span>Toughness is the average level of a paper's questions on a scale of 1 (all L1) to 3 (all L3). The label compares a paper with all {len(papers)} {name} papers here: the easiest fifth are Easy, the toughest fifth are Very tough. Tap a year to open or close its papers.</span></div></div>
<nav class="qlinks" aria-label="On this page"><a href="#years">Year-wise</a><a href="#extremes">Toughest and easiest</a>{''.join(f'<a href="#y{y}">{y}</a>' for y in sorted(by_year, reverse=True))}</nav>
<h2 id="years">Year-wise averages</h2>
<p class="pg-fine">Share of L1, L2 and L3 questions across all the papers of each year. See the <a href="../../questions-analysis/{sl}/">chapter-wise analysis of {name}</a> for the topics behind these numbers.</p>
<div class="pg-table"><table><thead><tr><th scope="col">Year</th><th scope="col" class="num">Papers</th><th scope="col" class="num">Questions</th><th scope="col" class="num lh l1">L1</th><th scope="col" class="num lh l2">L2</th><th scope="col" class="num lh l3">L3</th><th scope="col">Toughness</th></tr></thead><tbody>{yrows}</tbody></table></div>
<h2 id="extremes">Toughest and easiest papers</h2>
<div class="pw-two"><div><h3>Toughest 5</h3><ol class="pw-list">{top5(tough_l)}</ol></div><div><h3>Easiest 5</h3><ol class="pw-list">{top5(easy_l)}</ol></div></div>
<p class="pg-fine">Planning your preparation? See the <a href="../../../syllabus-priority/">syllabus priority</a> to know which chapters to start with, and the <a href="../../../exams/{sl}/">{E(name)} exam page</a> for dates, safe scores and the paper pattern.</p>
<h2>All papers</h2>
{secs}
{cta(3, "Practise any of these papers in exam format, with the real time and marking, and see your own analysis. Starting is free.", cur=f'resources/paper-wise-analysis/{sl}/', exam=e)}"""
    body = band(crumbs, f'{exlogo(e, "../../../", 44)} {name}: Paper Wise Analysis') + '\n' + grid(main, 3, sl)
    ld = [{'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Paper Wise Analysis', 'item': f'{SITE}/resources/paper-wise-analysis/'}, {'@type': 'ListItem', 'position': 3, 'name': name, 'item': f'{SITE}/resources/paper-wise-analysis/{sl}/'}]}]
    return page(title, desc, f'{SITE}/resources/paper-wise-analysis/{sl}/', body, 3, ld)


def paper_wise_hub():
    title = pick_title('Paper Wise Analysis of JEE, KCET, NDA & IAT Papers')
    desc = 'Paper by paper math analysis for JEE Main, JEE Advanced, IIT-JEE, AIEEE, KCET, NDA and IAT: the L1, L2 and L3 questions in every paper and its toughness.'
    rows = ''; cards = ''
    for e in ALL_EXAMS:
        if e[0] not in STATS: continue
        ps = STATS[e[0]]['paper_list']; avg = sum(tough_score(p) for p in ps) / len(ps); n = sum(p['n'] for p in ps)
        rows += (f'<tr><td class="exn">{exlogo(e, "../../", 38)}<a href="{e[2]}/">{E(e[1])}</a></td><td class="num">{len(ps)}</td><td class="num">{n:,}</td>'
                 f'<td class="num">{round(100 * sum(p["L1"] for p in ps) / n)}%</td><td class="num">{round(100 * sum(p["L2"] for p in ps) / n)}%</td><td class="num">{round(100 * sum(p["L3"] for p in ps) / n)}%</td><td class="num">{avg:.2f}/3</td></tr>')
        cards += f'<li><a href="{e[2]}/">{E(e[1])}: Paper Wise Analysis</a><span>{len(ps)} papers · {ps[-1]["year"]}–{ps[0]["year"]}</span></li>'
    crumbs = '<a href="../../">Home</a> &rsaquo; <span>Resources</span> &rsaquo; <span aria-current="page">Paper Wise Analysis</span>'
    main = f"""<p class="pg-lead">Every paper of every exam in the bank, one by one: how many easy (L1), medium (L2) and hard (L3) math questions it had, and how tough it was overall.</p>
<h2>Exams at a glance</h2>
<div class="pg-table"><table class="wide"><thead><tr><th scope="col">Exam</th><th scope="col" class="num">Papers</th><th scope="col" class="num">Questions</th><th scope="col" class="num lh l1">L1</th><th scope="col" class="num lh l2">L2</th><th scope="col" class="num lh l3">L3</th><th scope="col" class="num">Avg. toughness</th></tr></thead><tbody>{rows}</tbody></table></div>
<p class="pg-fine">Toughness is the average level of a paper's questions, from 1 (all L1) to 3 (all L3). For the chapters behind these numbers see the <a href="../questions-analysis/">questions analysis</a>; for what to study first, the <a href="../../syllabus-priority/">syllabus priority</a>.</p>
<h2>Open an exam</h2>
<ul class="pg-chlist exam-list">{cards}</ul>
{cta(2, "Practise any paper in exam format, with the real time and marking, and see your own analysis. Starting is free.", cur='resources/paper-wise-analysis/')}"""
    body = band(crumbs, 'Paper Wise Analysis') + '\n' + grid(main, 2)
    ld = [{'@context': 'https://schema.org', '@type': 'ItemList', 'name': 'Paper Wise Analysis', 'itemListElement': [{'@type': 'ListItem', 'position': k + 1, 'name': e[1] + ': Paper Wise Analysis', 'url': f'{SITE}/resources/paper-wise-analysis/{e[2]}/'} for k, e in enumerate([x for x in ALL_EXAMS if x[0] in STATS])]}]
    return page(title, desc, f'{SITE}/resources/paper-wise-analysis/', body, 2, ld)

def analysis_hub():
    total = sum(STATS[e[0]]['questions'] for e in EXAMS)
    title = pick_title('Questions Analysis: JEE, KCET, NDA, IAT Math PYQs')
    desc = compose(f'Math previous-year question analysis for JEE Main, JEE Advanced, IIT-JEE, AIEEE, KCET, NDA and IAT: {total:,} questions, counted by chapter, year and level.',
                   'Free on अंक-IT.')
    rows = ''.join(f'<tr><td class="exn">{exlogo(e, "../../", 38)}<a href="{e[2]}/">{E(e[1])}</a></td><td class="num">{STATS[e[0]]["questions"]:,}</td><td>{STATS[e[0]]["first"]}–{STATS[e[0]]["last"]}</td><td class="num">{STATS[e[0]]["papers"]}</td></tr>' for e in EXAMS)
    cards = ''.join(f'<li><a href="{e[2]}/">{E(e[1])}: Math PYQs, DPPs Analysis</a><span>{E(exam_meta(e))}</span></li>' for e in EXAMS)
    more = ('<ul class="pg-chlist exam-list"><li><a href="../../syllabus-priority/">Syllabus priority</a><span>Which chapters are asked the most in JEE Main and JEE Advanced.</span></li>'
            '<li><a href="../../chapter-weightage/">Chapter weightage</a><span>Weightage of every chapter, by exam and year.</span></li>'
            '<li><a href="../../chapter-wise-count/">Chapter-wise count</a><span>Questions in every chapter of the bank.</span></li>'
            '<li><a href="../../question-counts/">Question counts</a><span>The numbers behind the question bank.</span></li></ul>')
    crumbs = '<a href="../../">Home</a> &rsaquo; <span aria-current="page">Questions Analysis</span>'
    main = f"""<p class="pg-lead">{len(EXAMS)} exams · {total:,} previous-year math questions</p>
<p>Pick an exam to see its math questions chapter by chapter and year by year, with the level of every question. For dates, countdowns, safe scores and the exam pattern, open the exam from the Exams menu.</p>
<h2>Exams analysed</h2>
<div class="pg-table"><table class="wide"><thead><tr><th scope="col">Exam</th><th scope="col" class="num">Questions</th><th scope="col">Years</th><th scope="col" class="num">Papers</th></tr></thead><tbody>{rows}</tbody></table></div>
<ul class="pg-chlist exam-list">{cards}</ul>
<h2>More analysis</h2>
{more}
{cta(2, "Practise chapter by chapter with full solutions, build DPPs and open whole papers. Starting is free.", cur=f'{ANA}/')}"""
    body = band(crumbs, 'Questions Analysis') + '\n' + grid(main, 2)
    ld = [{'@context': 'https://schema.org', '@type': 'ItemList', 'name': 'Questions Analysis', 'itemListElement': [
            {'@type': 'ListItem', 'position': k + 1, 'name': e[1] + ': Math PYQs, DPPs Analysis', 'url': f'{SITE}/{ANA}/{e[2]}/'} for k, e in enumerate(EXAMS)]}]
    return page(title, desc, f'{SITE}/{ANA}/', body, 2, ld)

def doc_sections(g):
    secs = ''; toc = ''
    for i, sec in enumerate(g['sections'], 1):
        sid = f'sec{i}'
        toc += f'<a href="#{sid}"><b>{i}</b>{E(sec["h"])}</a>'
        subs = ''.join(f'<div class="gd-sub"><h3>{E(sb["h"])}</h3>{gd_blocks(sb["blocks"])}</div>' for sb in sec['subs'])
        secs += (f'<section class="gd-sec" id="{sid}"><h2><span class="gd-ico">{svg(GD_ICONS[(i - 1) % len(GD_ICONS)], 22)}</span><span class="gd-t"><small>Section {i}</small>{E(sec["h"])}</span></h2>'
                 f'{gd_blocks(sec["blocks"])}{subs}</section>')
    return toc, secs

def important_page():
    g = IMPORTANT; toc, secs = doc_sections(g)
    title = pick_title('Maths Exams After Class 12: Complete Roadmap')
    desc = 'Every major maths-based entrance exam after Class 12: research, engineering, state exams, management, architecture and defence, with a calendar.'
    crumbs = '<a href="../../">Home</a> &rsaquo; <span>Resources</span> &rsaquo; <span aria-current="page">Important exams after Class 12</span>'
    main = f"""<p class="gd-kick">{E(g["kicker"].title())}</p>
<p class="pg-lead">{E(g["intro"])}</p>
<nav class="gd-toc" aria-label="On this page"><p class="gd-toc-h">On this page</p><div>{toc}</div></nav>
{autolink(secs, '../../')}
<p class="pg-fine">Dates, fees and patterns change every year. Always confirm them on the official website of each exam.</p>
{cta(2, "Practise mathematics chapter by chapter for JEE, KCET, NDA, IAT and more, with full solutions. Starting is free.", cur='resources/important-exams/')}"""
    body = band(crumbs, 'Important Mathematics Exams After Class 12') + '\n' + grid(main, 2)
    ld = [{'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'}, {'@type': 'ListItem', 'position': 2, 'name': 'Important exams after Class 12', 'item': SITE + '/resources/important-exams/'}]}]
    return page(title, desc, SITE + '/resources/important-exams/', body, 2, ld)

THIN = 10   # an exam-chapter page with fewer questions than this is kept for visitors but not offered to search engines
def thin(d): return d['questions'] < THIN

def exam_chapter_page(e, code):
    key, name, sl, tag, about = e
    d = STATS[key]['chapters'][code]; ch = CH_NAME[code]; cs = ANY_SLUG[code]
    ys = sorted(int(y) for y in d['by_year'])
    sh = CH_SHORT.get(code, ch); nq = d['questions']
    title = pick_title(*[t for n_ in (ch, sh) for t in (f'{name} {n_} PYQ Count & Topic Analysis',)] + [f'{name} {n_}: PYQ Count & Topics' for n_ in (ch, sh)] + [f'{name} {n_} PYQ Analysis' for n_ in (ch, sh)] + [f'{name} {sh} PYQs'])
    yrs = f'in {ys[0]}' if ys[0] == ys[-1] else f'from {ys[0]} to {ys[-1]}'
    desc = compose(f'{name} {ch}: {nq} previous-year math question{"s" if nq != 1 else ""} {yrs}, counted by topic, by year and by level (L1, L2, L3).' if len(ch) < 30 else
                   f'{name} {sh}: {nq} previous-year math question{"s" if nq != 1 else ""} {yrs}, counted by topic, by year and by level (L1, L2, L3).',
                   'See which topics are asked most.', 'Practise free on अंक-IT.')
    total = STATS[key]['questions']; share = round(100 * d['questions'] / total, 1)
    rank = 1 + sum(1 for k, v in STATS[key]['by_chapter'].items() if v > d['questions'])
    lvd = d['by_level']
    topics = ''.join(f'<tr><td>{E(t)}</td><td class="num">{v["n"]}</td>{lvcells(v)}</tr>' for t, v in sorted(d['topics_lv'].items(), key=lambda kv: (-kv[1]['n'], kv[0])))
    intro = INTRO[int([c for c in CH if c['code'] == code][0]['no'])] if code in CH_SLUG else OOS_INTRO[code]
    others = ''
    for x in EXAMS:
        dd = STATS[x[0]]['chapters'].get(code)
        if dd and x[2] != sl:
            others += f'<tr><td class="exn">{exlogo(x, "../../../../", 32)}<a href="../../{x[2]}/{cs}/">{E(x[1])}</a></td><td class="num">{dd["questions"]}</td>{lvcells(dd["by_level"])}</tr>'
    general = (f'<p>See the full chapter guide with subtopics and JEE Main / Advanced counts: <a href="../../../../maths/{cs}/">{E(ch)}</a>.</p>' if code in CH_SLUG else '')
    crumbs = f'<a href="../../../../">Home</a> &rsaquo; <a href="../../">Questions Analysis</a> &rsaquo; <a href="../">{E(name)}</a> &rsaquo; <span aria-current="page">{E(ch)}</span>'
    main = f"""<p class="pg-lead">{d["questions"]} questions · {ys[0]}–{ys[-1]} · L1 {lvd["L1"]} · L2 {lvd["L2"]} · L3 {lvd["L3"]}</p>
<p>{E(intro)}</p>
<ul class="pg-stats"><li><b>{d["questions"]}</b><span>{E(name)} questions from this chapter</span></li><li><b>{share}%</b><span>of all {E(name)} math questions</span></li><li><b>#{rank}</b><span>rank among {E(name)} chapters</span></li></ul>
<h2>Year-wise questions</h2>
<p class="pg-fine">{E(name)} {STATS[key]['first']}&ndash;{STATS[key]['last']} ({STATS[key]['last'] - STATS[key]['first'] + 1} years): the questions of this chapter in each year, with their level (L1 easy, L2 medium, L3 hard).</p>
{yrtbl(d['by_year_lv'], STATS[key]['first'], STATS[key]['last'])}
<h2>Topic-wise questions in {E(name)}</h2>
<p>The topics of {E(ch)} that {E(name)} has asked, with the number of questions for each and their level (L1 easy, L2 medium, L3 hard).</p>
{tbl(['Topic', 'Questions', LVH], topics, 'pg-narrow', (1,))}
{('<h2>The same chapter in other exams</h2>' + tbl(['Exam', 'Questions', LVH], others, 'pg-narrow', (1,))) if others else ''}
{general}
{related('../../../../', (f'exams/{sl}/', f'{name}: everything you should know'), (f'{ANA}/{sl}/', f'{name} chapter-wise analysis'), ('syllabus-priority/', 'Syllabus priority'), (f'resources/paper-wise-analysis/{sl}/', f'{name} paper wise analysis'))}
{cta(4, f"Practise {name} {ch} questions with full solutions, build a DPP for this chapter and open whole papers. Everything is inside after you sign in.", exam=e)}"""
    body = band(crumbs, f'{exlogo(e, "../../../../", 40)} {E(name)}: {E(ch)}') + '\n' + grid(main, 4, sl)
    url_ = f'{SITE}/{ANA}/{sl}/{cs}/'
    ld = [{'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'}, {'@type': 'ListItem', 'position': 2, 'name': 'Questions Analysis', 'item': f'{SITE}/{ANA}/'},
            {'@type': 'ListItem', 'position': 3, 'name': name, 'item': f'{SITE}/{ANA}/{sl}/'}, {'@type': 'ListItem', 'position': 4, 'name': ch, 'item': url_}]}]
    return page(title, desc, url_, body, 4, ld, noindex=thin(d))

def priority_page():
    TM = D.get('tm') or sum(c['m'] for c in CH); TA = D.get('ta') or sum(c['a'] for c in CH)
    tm, ta = D['tiers']['m'], D['tiers']['a']
    rk = lambda key: {c['code']: i + 1 for i, c in enumerate(sorted(CH, key=lambda c: -c[key]))}
    rm, ra = rk('m'), rk('a')
    def focus(c):
        gap = c['a'] / TA * 100 - c['m'] / TM * 100
        return ('Same in both', 'same') if abs(gap) < 1.5 else (('Advanced leans', 'adv') if gap > 0 else ('Main leans', 'main'))
    rows = ''
    for c in sorted(CH, key=lambda c: -c['m']):
        f = focus(c)
        rows += (f'<tr><td><span class="chc-code">{c["code"]}</span> <a href="../maths/{slug(c)}/">{E(short(c))}</a></td><td class="num">{c["m"]}</td><td class="num">{round(100 * c["m"] / TM, 1)}%</td><td class="num">#{rm[c["code"]]}</td>'
                 f'<td class="num">{c["a"]}</td><td class="num">{round(100 * c["a"] / TA, 1)}%</td><td class="num">#{ra[c["code"]]}</td><td><span class="fc fc-{f[1]}">{f[0]}</span></td><td class="sp">{trend_svg(c, TM, TA)}</td></tr>')
    subs = sorted(((s, c) for c in CH for s in c['subs']), key=lambda t: -(t[0]['m'] + t[0]['a']))[:20]
    srows = ''.join(f'<tr><td>{E(s["name"])}<br><small><a href="../maths/{slug(c)}/">{E(short(c))}</a></small></td><td class="num">{s["m"]}</td><td><span class="lv lv-{LEVEL[s["mt"]].lower()}">{LEVEL[s["mt"]]}</span></td><td class="num">{s["a"]}</td><td><span class="lv lv-{LEVEL[s["at"]].lower()}">{LEVEL[s["at"]]}</span></td></tr>' for s, c in subs)
    title = pick_title('Syllabus Priority: Most Asked JEE Math Chapters')
    desc = f'Chapter-wise priority for JEE math: how many JEE Main and JEE Advanced questions each chapter has had from {Y0} to {Y1}, with its share, rank and trend.'
    crumbs = '<a href="../">Home</a> &rsaquo; <span aria-current="page">Syllabus priority</span>'
    main = f"""<p class="pg-lead">{len(CH)} chapters · {TM:,} JEE Main and {TA} JEE Advanced questions, {Y0}–{Y1}</p>
<p class="pg-fine">These counts are for the {len(CH)} chapters in the current syllabus. The <a href="../resources/questions-analysis/jee-main/">JEE Main analysis page</a> also counts the questions of the {len(OOS)} out-of-syllabus chapters ({STATS["JEE Main"]["questions"]:,} in total).</p>
<p>Use this to decide what to study first. Each chapter is ranked by the number of previous-year questions it has had in JEE Main and in JEE Advanced, with its share of all questions and its yearly trend. The same view is inside the dashboard.</p>
<h2>Chapters by priority</h2>
<div class="pg-table"><table class="prio"><thead><tr><th scope="col">Chapter</th><th scope="col" class="num">Main Qs</th><th scope="col" class="num">Share</th><th scope="col" class="num">Rank</th><th scope="col" class="num">Adv. Qs</th><th scope="col" class="num">Share</th><th scope="col" class="num">Rank</th><th scope="col">Leans</th><th scope="col">Trend</th></tr></thead><tbody>{rows}</tbody></table></div>
<p class="pg-fine">Trend lines show questions per year as a share of each exam's total (blue: JEE Main, orange: JEE Advanced). Importance tiers: JEE Main {tm[0]}+ questions is High and {tm[1]}+ is Medium; JEE Advanced {ta[0]}+ is High and {ta[1]}+ is Medium; anything lower is Low.</p>
<p class="pg-fine">To see how each year's papers were set, open the <a href="../resources/paper-wise-analysis/">paper wise analysis</a>; for the numbers per exam, see the <a href="../resources/questions-analysis/">questions analysis</a> and the <a href="../chapter-weightage/">chapter weightage</a>.</p>
<h2>The 20 most-asked subtopics</h2>
<div class="pg-table"><table><thead><tr><th scope="col">Subtopic</th><th scope="col" class="num">Main Qs</th><th scope="col">Main</th><th scope="col" class="num">Adv. Qs</th><th scope="col">Adv.</th></tr></thead><tbody>{srows}</tbody></table></div>
{cta(1, "See the priority of every subtopic, then practise those questions with full solutions. Starting is free.", cur='syllabus-priority/')}"""
    body = band(crumbs, "Syllabus priority") + '\n' + grid(main, 1)
    ld = [{'@context': 'https://schema.org', '@type': 'WebPage', 'name': 'Syllabus priority', 'url': f'{SITE}/syllabus-priority/', 'description': desc, 'inLanguage': LANG,
           'isPartOf': {'@type': 'WebSite', 'name': 'अंक-IT Mathematics Dashboard', 'url': SITE + '/'}}]
    return page(title, desc, f'{SITE}/syllabus-priority/', body, 1, ld)

CSP = "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src https://usehxhvzhdbcmnmqaxoo.supabase.co; manifest-src 'self'; worker-src 'self'; base-uri 'self'; form-action 'none'"

def redirect_page(to, depth, name, alt=None):
    """An old address (for example /jee-maths/..., /exams/<exam>/<chapter>/, /exams/<exam>/about/). It sends the visitor on at once,
    its canonical is the new page, and it is noindex and left out of the sitemap, so only the new page is indexed."""
    up = '../' * depth; target = f'{SITE}/{to}'
    title = pick_title(f'Moved: {name}', *([f'Moved: {alt}'] if alt else []), f'Moved: {name.split(":")[0]}')
    return f'''<!doctype html>
<html lang="{LANG}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<meta http-equiv="refresh" content="0;url={E(target)}">
<title>{E(title)}</title>
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="{E(target)}">
<link rel="icon" type="image/png" sizes="32x32" href="{up}img/icon/icon-32.png?v={VER}">
<link rel="stylesheet" href="{up}site.css?v={VER}">
</head>
<body class="pg">
<main id="main" class="pg-moved"><h1>This page has moved</h1><p>This page has moved to <a href="{up}{to}">{E(name)}</a>.</p><p class="pg-fine">If you are not taken there automatically, use the link above.</p></main>
</body>
</html>
'''

def exams_hub():
    total = sum(STATS[e[0]]['questions'] for e in EXAMS)
    title = pick_title('Exams: JEE Main, JEE Advanced, KCET, NDA, IAT, CUET UG', 'Exams: JEE Main, Advanced, KCET, NDA, IAT, CUET UG')
    desc = compose('Compare JEE Main, JEE Advanced, IIT-JEE, AIEEE, KCET, NDA, IAT and CUET UG: who conducts each exam, what it is for and the mode.',
                   f'{total:,} past math questions.', 'Free on अंक-IT.')
    rows = ''.join(f'<tr><td class="exn">{exlogo(e, "../", 38)}<a href="{e[2]}/">{E(e[1])}</a></td><td>{E(SHORT[e[0]][0])}</td><td>{E(SHORT[e[0]][1])}</td><td>{E(SHORT[e[0]][2])}</td>'
                   f'<td class="num">{STATS[e[0]]["questions"]:,}</td><td>{STATS[e[0]]["first"]}–{STATS[e[0]]["last"]}</td></tr>' for e in EXAMS)
    rows += f'<tr><td class="exn">{exlogo(CUET, "../", 38)}<a href="cuet/">{E(CUET[1])}</a></td><td>{E(SHORT["CUET"][0])}</td><td>{E(SHORT["CUET"][1])}</td><td>{E(SHORT["CUET"][2])}</td><td class="num">Soon</td><td>&ndash;</td></tr>'
    cards = ''.join(f'<li><a href="{e[2]}/">{E(e[1])}</a><span>{E(e[3])}</span><span>{E(exam_meta(e))}</span></li>' for e in ALL_EXAMS)
    cds = ''.join(f'<div class="cd-card"><h3><a href="{e[2]}/#dates">{exlogo(e, "../", 30)} {E(e[1])}</a></h3>{countdown(e)}</div>' for e in ALL_EXAMS if e[2] not in ('aieee', 'iit-jee'))
    crumbs = '<a href="../">Home</a> &rsaquo; <span aria-current="page">Exams</span>'
    main = f"""<p class="pg-lead">{len(ALL_EXAMS)} exams · {total:,} previous-year math questions</p>
<p>Every previous-year math question in the bank, grouped by exam. The table compares the exams at a glance. Open an exam for its date and countdown, safe scores, pattern, fees, seats and colleges.</p>
<h2>Exams compared</h2>
<div class="pg-table"><table class="wide"><thead><tr><th scope="col">Exam</th><th scope="col">Conducted by</th><th scope="col">For admission to</th><th scope="col">Mode</th><th scope="col" class="num">Questions</th><th scope="col">Years</th></tr></thead><tbody>{rows}</tbody></table></div>
<p class="pg-fine">Exam patterns change from year to year. Always check the official notification for the latest rules and dates.</p>
<h2 id="dates">Exam dates and countdown</h2>
<p>The next exam of each entrance test. A live countdown appears for every exam whose date has been announced.</p>
<div class="cd-grid">{cds}</div>
<h2>Open an exam</h2>
<ul class="pg-chlist exam-list">{cards}</ul>
{cta(1, "Pick an exam, open its papers shift by shift and practise with full solutions. Starting is free.", cur='exams/')}"""
    body = band(crumbs, "Exams we cover") + '\n' + grid(main, 1)
    ld = [{'@context': 'https://schema.org', '@type': 'ItemList', 'name': 'Exams', 'itemListElement': [
            {'@type': 'ListItem', 'position': k + 1, 'name': e[1], 'url': exam_url(e)} for k, e in enumerate(ALL_EXAMS)]}]
    return page(title, desc, f'{SITE}/exams/', body, 1, ld)

# ---------- About, Contact, Privacy, Terms ----------
def info_page(slug_, title, h1, desc, inner, ptype='WebPage'):
    crumbs = f'<a href="../">Home</a> &rsaquo; <span aria-current="page">{E(h1)}</span>'
    body = band(crumbs, E(h1)) + '\n' + grid(inner + cta(1, '', cur=slug_ + '/'), 1, cls_='pg-text')
    canon = f'{SITE}/{slug_}/'
    ld = [{'@context': 'https://schema.org', '@type': ptype, 'name': h1, 'url': canon, 'description': desc, 'inLanguage': LANG,
           'isPartOf': {'@type': 'WebSite', 'name': 'अंक-IT Mathematics Dashboard', 'url': SITE + '/'}}]
    return page(title, desc, canon, body, 1, ld)

MAIL = f'<a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>'

def about_page():
    A = STATS['_all']
    nprac = A['nonpyq_questions']
    I = lambda d, w=26: svg(d, w)
    offer = [
     ('i-green', '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>', 'Question bank', f'More than {BANK_N[:-1]} questions, filtered by chapter, topic, level, exam and year, each with its answer and a full solution.'),
     ('i-purple', '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M8 7h8M8 11h6"/>', 'Past papers, 2000 to 2026', 'JEE Main, JEE Advanced, KCET, NDA, IAT and the older IIT-JEE and AIEEE, shift by shift and chapter by chapter.'),
     ('i-rose', '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>', 'DPPs and handouts', 'Ready-to-print practice sheets and handwritten revision notes for every chapter.'),
     ('i-gold', '<path d="M12 3 3 8l9 5 9-5z"/><path d="M5 11v5c0 1.5 3 3 7 3s7-1.5 7-3v-5"/>', 'Handwritten handouts', 'Neat revision notes for every chapter of Class 11 and Class 12.'),
     ('i-blue', '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 9h4M7 12h7"/>', 'Online tests and reports', 'An exam-like screen with a timer and question palette, then your score, rank and weak topics.'),
     ('i-teal', '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3 3 0 0 1 0 5.6M18 19a5 5 0 0 0-2.5-4.3"/>', 'Tools for teachers', 'Build a test, share one link, and follow every student of your school.')]
    offer_html = ''.join(f'<article class="ab-card"><span class="ico {c}">{I(d)}</span><h3>{E(t)}</h3><p>{E(x)}</p></article>' for c, d, t, x in offer)
    steps = [('Sign in free', 'Use Google, or your Student ID if you are an Avanti student. Choose Student or Teacher once.'),
             ('Practise by chapter', 'Open the question bank, DPPs, past papers and handouts, and check every answer against its full solution.'),
             ('Test and improve', 'Take timed tests, read your report, and go back to the topics where marks were lost.')]
    steps_html = ''.join(f'<li class="ab-step"><b>{i + 1}</b><div><h3>{E(t)}</h3><p>{E(x)}</p></div></li>' for i, (t, x) in enumerate(steps))
    who = [('Students', 'Class 11, Class 12 and droppers preparing for JEE Main and JEE Advanced, and also KCET, NDA and IAT.', '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/>'),
           ('Teachers', 'Teachers who want ready questions, printable sheets and online tests for their classes, with results in one place.', '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/>'),
           ('Avanti Fellows learners', 'Students and teachers of Avanti Fellows get Premium free and sign in with their Student ID.', '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>')]
    who_html = ''.join(f'<article class="ab-who"><span class="ab-wi">{I(d, 22)}</span><div><h3>{E(t)}</h3><p>{E(x)}</p></div></article>' for t, x, d in who)
    vals = [('Accuracy first', 'Every question has an answer and a worked solution. If something looks wrong, tell us and we correct it.'),
            ('Clear, not clever', 'Solutions are written to be followed step by step, in the order a student would think.'),
            ('Free to start', 'You can begin without paying. Premium adds extras such as PDFs, handouts and all-India ranks.')]
    vals_html = ''.join(f'<div class="ab-val"><h3>{E(t)}</h3><p>{E(x)}</p></div>' for t, x in vals)
    inner = f"""<p class="ab-lead">अंक-IT Mathematics Dashboard exists to make serious JEE-level math practice <b>free to start</b> and easy to follow, for every student and for the teachers who coach them.</p>
<ul class="pg-stats ab-stats"><li><b>{BANK_N}</b><span>questions in the bank</span></li><li><b>{nprac:,}</b><span>Non-PYQ practice questions</span></li><li><b>{len(CH)} + {len(OOS)}</b><span>chapters in the syllabus, plus out-of-syllabus</span></li><li><b>{len(EXAMS)}</b><span>exams, with papers from 2000 to 2026</span></li></ul>
<h2>What you get</h2>
<div class="ab-grid">{offer_html}</div>
<h2>How it works</h2>
<ol class="ab-steps">{steps_html}</ol>
<h2>Who it is for</h2>
<div class="ab-whos">{who_html}</div>
<h2>What we believe</h2>
<div class="ab-vals">{vals_html}</div>
<h2>The person behind it</h2>
<div class="ab-person"><span class="ab-av" aria-hidden="true">AK</span><div><h3>Ankit Kamboj</h3><p>Ankit is a math teacher and the creator of अंक-IT. He builds and maintains the dashboard so that students can practise the questions that matter for each chapter, and teachers can set tests and see results without extra tools.</p><p><a class="sb sb-pri" href="../contact/">Get in touch</a></p></div></div>
"""
    return info_page('about', 'About Us: Free-to-Start JEE Math Practice | अंक-IT', 'About us', 'About अंक-IT Mathematics Dashboard: a free-to-start JEE math question bank with past papers, DPPs, handouts and online tests, built by Ankit Kamboj.', inner, 'AboutPage')

def contact_page():
    from urllib.parse import quote
    def mt(subject, body):
        return E(f'mailto:{CONTACT_EMAIL}?subject={quote(subject, safe="")}&body={quote(body, safe="")}')
    I = lambda d, w=24: svg(d, w)
    topics = [
     ('i-blue', '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', 'Trouble signing in', 'Google or Student ID sign-in is not working, or you chose the wrong role.', 'Help with signing in', 'Hello,\n\nMy name: \nThe email or Student ID I use: \nWhat happens when I try to sign in: \n\nThank you'),
     ('i-gold', '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>', 'Premium and payments', 'A payment was taken but Premium is not showing, or you were charged by mistake.', 'Premium or payment problem', 'Hello,\n\nMy name: \nThe email or Student ID I use: \nPayment date and Razorpay reference: \nWhat went wrong: \n\nThank you'),
     ('i-rose', '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>', 'A mistake in a question', 'Found a wrong answer, a typo or an unclear solution? We want to fix it.', 'Mistake in a question', 'Hello,\n\nQuestion ID (shown on the question): \nWhat is wrong: \nWhat you think is correct: \n\nThank you'),
     ('i-teal', '<path d="M3 10 12 5l9 5-9 5z"/><path d="M7 12.5V17c0 1 2.2 2 5 2s5-1 5-2v-4.5"/>', 'Teachers and schools', 'School approval, your plan, or creating a test.', 'Teacher or school help', 'Hello,\n\nMy name: \nMy school: \nWhat I need help with: \n\nThank you'),
     ('i-purple', '<path d="M12 3 4 6v6c0 4.5 3.2 7.5 8 9 4.8-1.5 8-4.5 8-9V6z"/>', 'Your personal data', 'Ask what we hold about you, correct it, or delete your account.', 'Request about my personal data', 'Hello,\n\nI would like to: (see my data / correct my data / delete my account)\nThe email or Student ID I use: \n\nThank you'),
     ('i-green', '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>', 'Ideas and suggestions', 'A feature you would like, a chapter we should add, or feedback on the site.', 'Suggestion for the dashboard', 'Hello,\n\nMy suggestion: \n\nThank you')]
    cards = ''.join(f'<article class="ct-card"><span class="ico {c}">{I(d)}</span><h3>{E(t)}</h3><p>{E(x)}</p><a class="sb sb-line" href="{mt(sub, body)}">Email about this</a></article>' for c, d, t, x, sub, body in topics)
    faqs = [('I cannot sign in. What should I check?', 'Make sure you picked the right option: Google for most users, and your Avanti ID with date of birth only if you are an Avanti student. If it still fails, use the Help & Support button in the Login window or write to us.'),
            ('I paid for Premium but it is not showing.', 'Sign out and sign in again first. If it still shows Free, write to us with the payment date and the Razorpay payment reference so we can check it.'),
            ('I chose the wrong role (Teacher or Student).', 'The role is saved the first time you sign in. Write to us from the email you used and we will help change it.'),
            ('How do I delete my account?', 'Write to us from the email or Student ID you use, with the subject "Request about my personal data", and tell us you want your account deleted.')]
    faq_html = ''.join(f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q, a in faqs)
    check = ['Your name', 'The email or Student ID you sign in with', 'What you were doing and what went wrong', 'A screenshot, if it helps', 'The question ID, for a mistake in a question']
    check_html = ''.join(f'<li>{CHECK}<span>{E(c)}</span></li>' for c in check)
    inner = f"""<p class="ab-lead">We read every message about the dashboard. Pick the topic that fits best and we will open an email that is ready to fill in.</p>
<div class="ct-main"><span class="ct-ic">{I('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', 30)}</span><div><p class="ct-k">Write to us</p><p class="ct-mail">{MAIL}</p><p class="pg-fine">Replies come from this same address. Please check your spam folder if you are waiting for one.</p></div></div>
<h2>How can we help?</h2>
<div class="ct-grid">{cards}</div>
<div class="ct-two"><div><h2>Before you write</h2><p>A few details help us answer you faster:</p><ul class="ticks">{check_html}</ul></div>
<div><h2>Quick answers</h2><div class="faq faq-s">{faq_html}</div></div></div>
<p class="pg-fine">You can also open <b>Help &amp; Support</b> in the Login window. Read how we handle your information in the <a href="../privacy/">privacy policy</a>.</p>"""
    return info_page('contact', 'Contact Us: Help With Sign-in, Plans & Questions | अंक-IT', 'Contact us', 'Contact अंक-IT Mathematics Dashboard for help with sign-in, Premium and payments, a mistake in a question, teacher and school help, or your personal data.', inner, 'ContactPage')

def not_found_page():
    I = '/'
    cards = [('Home', 'The home page', I), ('Exams', 'JEE Main, JEE Advanced, KCET, NDA, IAT and more', I + 'exams/'), ('Math chapters', 'All chapters with question counts', I + 'maths/'),
             ('Syllabus priority', 'Which chapters are asked most', I + 'syllabus-priority/'), ('Contact us', 'Tell us what you were looking for', I + 'contact/')]
    items = ''.join(f'<li><a href="{h}">{E(t)}</a><span>{E(d)}</span></li>' for t, d, h in cards)
    main = f"""<p class="pg-lead">The page you opened does not exist, or it has moved.</p><p>Try one of these instead:</p><ul class="pg-chlist exam-list">{items}</ul>"""
    body = band('<a href="/">Home</a> &rsaquo; <span aria-current="page">Page not found</span>', 'Page not found') + '\n' + grid(main, 0, up=I)
    return page('Page not found | अंक-IT', 'This page does not exist or has moved. Try the home page, the exams, the math chapters or the syllabus priority on अंक-IT instead.', None, body, 0, up=I, noindex=True)

def privacy_page():
    inner = f'''<p class="pg-lead">Last updated: {UPDATED}</p>
<p>This policy explains what information अंक-IT Mathematics Dashboard (“we”, “the website”) collects, why, and the choices you have. It applies to this website and the services behind it.</p>
<h2>Information we collect</h2>
<ul>
<li><b>Account details:</b> your name and email from Google sign-in, or your Student ID if you are an Avanti student, and whether you are a teacher or a student.</li>
<li><b>Profile details:</b> school, class, stream, batch, category and gender, where you or your school give them. Teachers add these for their students.</li>
<li><b>Practice and test data:</b> the tests you attempt, your answers, scores, time taken, ranks and reports, and worksheets that teachers save.</li>
<li><b>Payment records:</b> for Premium, the order and payment reference, the amount and the status. Card, UPI and bank details are entered on Razorpay’s payment window and are never seen or stored by us.</li>
<li><b>Security information:</b> the IP address and time of Student ID sign-in attempts, used to block guessing of IDs. For Student ID sign-in we check the date of birth you enter against the school record; we do not display it.</li>
<li><b>Browser storage:</b> your sign-in session, your light or dark theme choice and a copy of question files so the site opens faster. These stay on your device and are cleared when you sign out where possible.</li>
</ul>
<h2>How we use it</h2>
<ul><li>To sign you in, give you the right plan and show your own results.</li>
<li>To let teachers see the results of students in their approved school, and to let Avanti administrators approve schools and manage accounts.</li>
<li>To take and confirm payments for Premium.</li>
<li>To keep the service secure, fix problems and answer your messages.</li></ul>
<p>We do not sell your personal information.</p>
<h2>Who can see it</h2>
<ul><li><b>You</b> can see your own profile, results and payments.</li>
<li><b>Teachers</b> approved for a school can see the details and results of students of that school.</li>
<li><b>Administrators</b> of the dashboard can see account details needed to run the service.</li>
<li><b>Other students and the public</b> cannot see your results. Ranks compare scores without showing other students’ names.</li></ul>
<h2>Services we rely on</h2>
<p>We use <b>Google</b> for sign-in, <b>Supabase</b> to store accounts and results and to serve the question files, <b>Razorpay</b> to process payments and <b>GitHub Pages</b> to host the website. These providers process data as needed to provide their service and under their own privacy policies.</p>
<h2>Cookies and similar technologies</h2>
<p>The website uses browser storage to keep you signed in and to remember your settings. It does not use advertising or tracking cookies at the moment. If that changes, this page will be updated first.</p>
<h2>How long we keep data</h2>
<p>We keep your account and results while your account is active, and payment records as long as needed for accounting. Sign-in attempt records are kept for a limited time for security.</p>
<h2>Children</h2>
<p>The dashboard is used by school students, many of them under 18. Students usually join through their school or teacher. If you are a parent or guardian and have a concern, contact us.</p>
<h2>Your choices</h2>
<p>You can ask us to correct or delete your account and data, or ask what we hold about you, by writing to {MAIL} from the email or Student ID you use. We will respond as soon as we reasonably can.</p>
<h2>Changes</h2>
<p>If we change this policy we will update the date above. Questions? See the <a href="../contact/">contact page</a>.</p>'''
    return info_page('privacy', 'Privacy Policy | अंक-IT', 'Privacy policy', 'How अंक-IT Mathematics Dashboard collects, uses and protects your information, including sign-in, test results and payments.', inner)

def terms_page():
    inner = f'''<p class="pg-lead">Last updated: {UPDATED}</p>
<p>By signing in to or using अंक-IT Mathematics Dashboard (“the website”) you agree to these terms. If you do not agree, please do not use it.</p>
<h2>Using the website</h2>
<ul><li>Sign in with your own account and keep it secure. Do not share your account.</li>
<li>Give correct details. Teachers must use the school they actually teach at; the school is approved by an administrator.</li>
<li>Use the website for learning and teaching. Do not try to break, overload or bypass its security or plan limits, and do not use automated tools to copy the question bank.</li></ul>
<h2>Plans and payments</h2>
<ul><li><b>Free:</b> available to anyone who signs in.</li>
<li><b>Premium:</b> a paid membership for one year from purchase. The price shown at checkout applies (currently ₹299 for students and ₹599 for teachers) and payment is handled by Razorpay.</li>
<li><b>Avanti:</b> Avanti Fellows students and staff get access as part of their programme.</li>
<li>All payments are final: please read the <a href="../refund-policy/">refund policy</a>. If a payment itself went wrong (for example money was deducted but your plan did not start), <a href="../contact/">contact us</a> and we will look into it.</li></ul>
<h2>Content and copyright</h2>
<p>The questions, solutions, handouts, tests and design of the website are provided for your own study and teaching. You may not copy, resell, republish or share paid content, or share your Premium account. Previous-year questions come from the examinations of their respective conducting bodies and are included for practice.</p>
<h2>Tests and results</h2>
<p>Tests, scores and ranks are for practice and self-assessment. We work to keep questions and answers correct, but mistakes can happen. Please report them. We do not guarantee any result in an examination.</p>
<h2>Availability</h2>
<p>We try to keep the website available but it may sometimes be unavailable for maintenance or because of problems outside our control. Features and plans may change over time.</p>
<h2>Ending access</h2>
<p>We may suspend or close accounts that break these terms. You can stop using the website at any time and ask us to delete your account.</p>
<h2>Limits of responsibility</h2>
<p>The website is provided “as is”. To the extent the law allows, we are not responsible for losses that come from using it, such as a result in an examination.</p>
<h2>Governing law</h2>
<p>These terms are governed by the laws of India.</p>
<h2>Changes and contact</h2>
<p>We may update these terms and will change the date above when we do. Questions? Write to {MAIL} or see the <a href="../contact/">contact page</a>. Our <a href="../privacy/">privacy policy</a> explains how we handle your information.</p>'''
    return info_page('terms', 'Terms of Use | अंक-IT', 'Terms of use', 'Terms of use for अंक-IT Mathematics Dashboard: your account, the Free and Premium plans, payments, tests and results, content and acceptable use.', inner)

def refund_page():
    inner = f'''<p class="pg-lead">Last updated: {UPDATED}</p>
<div class="know"><div><b>No refund once paid</b><span>When you buy a Premium membership and the payment goes through, the amount is not returned. Please decide before you pay.</span></div></div>
<h2>What this means</h2>
<ul><li>Every payment for a plan on अंक-IT Mathematics Dashboard is final. We do not refund it, wholly or in part, whether you used the plan a lot, a little or not at all.</li>
<li>We also do not refund if you change your mind, buy the wrong plan, forget to use it, or lose access because you broke the <a href="../terms/">terms of use</a>.</li>
<li>A plan is not paused, cancelled early for money back, or moved to another person.</li></ul>
<h2>Why we work this way</h2>
<p>A Premium membership gives you full access the moment it starts: the whole question bank, solutions, handouts and tests. Digital content cannot be handed back, so we keep the rule simple and the price low.</p>
<h2>Try before you pay</h2>
<p>The Free plan is open to everyone who signs in, and the previous-year questions stay free. Use it first, look at the <a href="../#plans">plans and prices</a>, and buy Premium only when you are sure it is what you want.</p>
<h2>When a payment itself goes wrong</h2>
<p>This is not a refund: it is fixing a mistake in the payment. If money left your account but your Premium did not start, write to us with the date, the amount and the payment reference you got from your bank or UPI app, and we will check it and set it right. Payments that fail are returned to your account by your bank or payment provider on their own schedule.</p>
<h2>Contact</h2>
<p>Questions about a payment? Write to {MAIL} or use the <a href="../contact/">contact page</a>. See also our <a href="../terms/">terms of use</a> and <a href="../privacy/">privacy policy</a>.</p>'''
    return info_page('refund-policy', 'Refund Policy | अंक-IT', 'Refund Policy', 'Refund policy of अंक-IT Mathematics Dashboard: once a Premium payment goes through it is not refunded, so try the free plan first. Help if a payment fails.', inner)

FAQ = [
 ('Is the Mathematics Dashboard free?', 'Yes, you can start free. Sign in with Google to practise every previous year question with its answer and solution, sit past papers and mock tests, and see your reports. Premium adds the practice (Non-PYQ) questions, DPPs and the Own DPP Maker, all handouts, PDF downloads and printing, and your rank among all students.'),
 ('Who is it for?', 'Students of Class 11, Class 12 and droppers preparing for math in JEE Main, JEE Advanced, KCET, NDA, IAT and similar exams. Teachers can use it to make tests and track their students.'),
 ('What is in the Free plan and what is in Premium?', 'Free: all previous year questions with solutions, PYQ PDFs, past papers, chapter-wise and full-length mocks made from PYQs, your own tests, reports with your school rank, and the first Class 11 and Class 12 handouts. Premium adds Non-PYQ practice questions, DPPs, the Own DPP Maker, mocks with a PYQ, practice or mixed source, all handouts, PDF download and printing, and all-India ranks.'),
 ('How much does Premium cost?', 'Premium is ₹299 a year for students and ₹599 a year for teachers. Avanti students get Premium free. A payment is not refunded once made, so try the Free plan first.'),
 ('What tests can I take?', 'Previous year papers shift by shift, chapter-wise mocks, must-solve repeated questions, full-length mocks with the official duration and marking (JEE Main, JEE Advanced Paper 1 and Paper 2, KCET, NDA, IAT), and your own tests with the chapters, difficulty and time you choose.'),
 ('When do I see the correct answers after a test?', 'You see your score, ranks, right and wrong answers, marks and topic analysis as soon as you submit. The correct answers open when the time of the paper is over, for example 3 hours after you started a 3-hour paper, even if you submitted early, so answers cannot be passed on while others are still writing.'),
 ('What if my internet or power goes during a test?', 'The timer pauses by itself while your internet or power is gone and carries on from where it stopped when you open the test again. Your saved answers stay in your account. Switching tabs or apps is different: it is a warning, and the third warning submits the test.'),
 ('How do I sign in?', 'Use your Google account. Avanti students can sign in with their Student ID instead. You choose Student or Teacher the first time, and your account works on one device at a time.'),
 ('Can teachers create tests?', 'Yes. Teachers whose school has been approved can build an online test from the questions, share one link with their students and see results and ranks.'),
]


def clock_strip():
    """The countdown to JEE Main and JEE Advanced, at the very top of the home page."""
    cards = ''
    for sl in ('jee-main', 'jee-advanced'):
        e = next(x for x in EXAMS if x[2] == sl); iso, label, nice = NEXT_DATE[sl]
        cards += (f'<article class="clk clk-{sl}" data-cd="{iso}" role="timer" aria-label="Countdown to {E(label)}"><div class="clk-top">{exlogo(e, "", 52).replace(' loading="lazy"', '')}'
                  f'<div><p class="clk-n">{E(label)}</p><p class="clk-d">{E(nice)}</p></div></div>'
                  '<div class="cd-n clk-t"><div><b data-u="d">&ndash;</b><span>days</span></div><div><b data-u="h">&ndash;</b><span>hours</span></div><div><b data-u="m">&ndash;</b><span>minutes</span></div><div><b data-u="s">&ndash;</b><span>seconds</span></div></div>'
                  f'<a class="clk-go" href="exams/{sl}/">Dates, safe scores and pattern &rarr;</a></article>')
    return ('<section class="clock" aria-label="Countdown to JEE Main and JEE Advanced"><div class="swrap"><div class="clock-head">'
            '<p class="clock-kick">Want to explore IIT (GTA campus), Practice More, Work Hard.</p>'
            '<p class="clock-h">Your exams are coming. Make every day count.</p></div>'
            f'<div class="clock-grid">{cards}</div><p class="clock-fine">Dates can change: always confirm on the official website.</p></div></section>')

# ---------- the home page (goes inside index.html) ----------
def home_block():
    feats = [
     ('i-blue', svg('<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 9h4M7 12h7"/>'), 'NTA-style online tests', 'A full-screen test with timer, question palette, mark for review and auto-submit. Past papers, chapter-wise and full-length mocks, or a test of your own. The timer pauses if your internet or power goes.'),
     ('i-gold', svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'), 'Instant reports and ranks', 'Score, accuracy, rank in your school and among all students, topic-wise analysis and time per question. Correct answers open when the paper time is over.'),
     ('i-green', svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'), f'{BANK_N} question bank', 'Filter by chapter, topic, level, exam and year. Every question comes with its answer and a full solution.'),
     ('i-purple', svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M8 7h8M8 11h6"/>'), 'Past papers 2000–2026', 'JEE Main, JEE Advanced and more, paper by paper and chapter by chapter, with answer keys.'),
     ('i-rose', svg('<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>'), 'DPPs and handouts', 'Daily practice sheets and handwritten revision notes for every chapter.'),
     ('i-teal', svg('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3 3 0 0 1 0 5.6M18 19a5 5 0 0 0-2.5-4.3"/>'), 'Built for teachers', 'Make a test in minutes, share one link with your class and see every student\'s result.')]
    feat_html = ''.join(f'<article class="fcard"><span class="ico {c}">{i}</span><p class="hd">{E(t)}</p><p>{E(d)}</p></article>' for c, i, t, d in feats)
    def frame(src, alt, first=False):
        load = 'fetchpriority="high"' if first else 'loading="lazy"'
        return (f'<div class="frame"><div class="frame-bar"><i></i><i></i><i></i><span>unkganit.com</span></div>'
                f'<img src="img/shots/{src}.webp" width="1366" height="800" alt="{E(alt)}" {load} decoding="async"></div>')
    hero_shot = (f'<div class="hero-shot">{frame("dashboard-home", "The अंक-IT dashboard: exam countdowns, practice cards for PYQs, DPPs and tests, and your progress", True)}'
                 f'<div class="mock-float"><span class="ic">{svg("<circle cx=\'11\' cy=\'11\' r=\'7\'/><path d=\'M21 21l-4.3-4.3\'/>", 22)}</span><div><small>Dashboard</small><b>{BANK_N} questions</b><em>with full solutions</em></div></div></div>')
    pts = ''.join(f'<li>{CHECK}{t}</li>' for t in ['Free to start', 'Questions with full solutions', 'Made for JEE Main and Advanced', 'Works on phone and laptop'])
    # ----- real dashboard screens in a swipeable carousel (script adds the arrows, tabs and dots; without it the slides still swipe/scroll) -----
    shots = [('dashboard-home', 'Dashboard', 'Everything you practise, in one place', 'Your home screen: PYQs, practice questions, DPPs, tests and handouts, the countdown to JEE Main and JEE Advanced, and your own progress.', 'The अंक-IT dashboard home with the exam countdowns, practice cards and a progress panel'),
             ('pyq-overview', 'PYQs', 'Every chapter, understood at a glance', 'See how many questions each chapter had, which subtopics matter most in the last 5 years, the year-wise graph and your own progress, then practise by level, topic or year.', 'A chapter overview with progress, difficulty split, year-wise graph and the 5 most important subtopics'),
             ('mock-tests', 'Mock Tests', 'Five ways to be tested', 'Past papers shift by shift, chapter-wise mocks, must-solve repeated questions, full-length mocks with the official timing and marking, and tests you design yourself.', 'The Tests page with previous year papers, chapter wise mock, full length mock and a practice test builder'),
             ('own-test', 'Your Own Test', 'Design the exact test you need', 'Choose PYQ, practice or a mix, the chapters, a difficulty slider, the number of questions and the time. JEE Advanced Paper 1 and Paper 2 patterns are built in.', 'The practice test builder with source, chapters, difficulty and time'),
             ('dpp-maker', 'Own DPP Maker', 'A ready-to-print DPP in one click', 'Pick chapters and subtopics, set the toughness and the mix of previous-year and practice questions, and get a clean practice sheet with answer key and explanations.', 'The Own DPP Maker with toughness and source sliders'),
             ('handouts', 'Handouts', 'Handwritten revision notes for every chapter', 'Neatly handwritten notes for all chapters of Class 11 and 12. Read them in the built-in viewer, or download them to revise offline.', 'The Handouts page with a note for every chapter'),
             ('online-test', 'Online Test', 'The real exam screen, before the real exam', 'A full-screen, timed test with the question palette, mark for review and auto-submit, followed by your score, rank and topic-wise report.', 'The online test window with the question palette and timer')]
    PIX = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
    def slide_img(s, i):
        if i == 0: return frame(s[0], s[4])
        f = frame(s[0], s[4]).replace(f'src="img/shots/{s[0]}.webp"', f'src="{PIX}" data-src="img/shots/{s[0]}.webp"').replace(' loading="lazy"', '')
        return f + f'<noscript><img src="img/shots/{s[0]}.webp" width="1366" height="800" alt="{E(s[4])}"></noscript>'
    slides = ''.join(f'<div class="car-slide" id="car-s{i}" role="tabpanel" aria-roledescription="slide" aria-label="{i + 1} of {len(shots)}: {E(s[1])}" data-title="{E(s[1])}">{slide_img(s, i)}<div class="car-cap"><p class="hd">{E(s[2])}</p><p>{E(s[3])}</p></div></div>' for i, s in enumerate(shots))
    showcase = ('<div class="car" data-car><div class="car-tabs" hidden></div><div class="car-view">'
                f'<div class="car-track" tabindex="0" role="group" aria-roledescription="carousel" aria-label="Screens from the dashboard">{slides}</div>'
                '<button type="button" class="car-btn car-prev" aria-label="Previous screen" hidden>&lsaquo;</button><button type="button" class="car-btn car-next" aria-label="Next screen" hidden>&rsaquo;</button></div>'
                '<div class="car-dots" hidden></div></div>')
    # ----- chapters as cards -----
    def chcard(c):
        return (f'<div class="chc"><span class="chc-code">{c["code"]}</span><p class="chc-name"><a class="stretch" href="maths/{slug(c)}/">{E(short(c))}</a></p>'
                f'<p class="chc-sub">{len(c["subs"])} subtopics</p><div class="chc-st"><span><b>{c["m"]}</b> JEE Main</span><span><b>{c["a"]}</b> Advanced</span></div><i class="chc-go" aria-hidden="true">&rarr;</i></div>')
    c11 = ''.join(chcard(c) for c in CH if cls(c) == '11'); c12 = ''.join(chcard(c) for c in CH if cls(c) == '12')
    oos = ''.join(f'<div class="chc chc-oos"><span class="chc-code">{code}</span><p class="chc-name">{E(n)}</p><p class="chc-sub">Out of syllabus</p></div>' for code, n in OOS)
    # ----- exams -----
    exam_cards = ''.join(f'<div class="exc"><div class="exc-top">{exlogo(e, "", 52)}<p class="exc-name"><a class="stretch" href="exams/{e[2]}/">{E(e[1])} papers</a></p></div><p>{E(e[3])}</p><dl class="exc-facts"><div><dt>Conducted by</dt><dd>{E(SHORT[e[0]][0])}</dd></div><div><dt>Mode</dt><dd>{E(SHORT[e[0]][2])}</dd></div></dl><div class="exc-st"><span><b>{STATS[e[0]]["questions"]:,}</b> questions</span><span><b>{STATS[e[0]]["first"]}–{STATS[e[0]]["last"]}</b></span><span><b>{STATS[e[0]]["papers"]}</b> papers</span></div></div>' for e in EXAMS)
    steps = [('Create your free account', 'Click Login, choose Student or Teacher and continue with Google. Avanti students use their Student ID.'),
             ('Practise chapter by chapter', 'Open the PYQs, practice questions, DPPs and handouts. Check every answer against the full solution.'),
             ('Take tests and track progress', 'Attempt NTA-style tests, see your score, rank and weak topics, and come back stronger next week.')]
    steps_html = ''.join(f'<div class="step"><p class="hd">{E(t)}</p><p>{E(d)}</p></div>' for t, d in steps)
    tick = lambda items: ''.join(f'<li>{CHECK}<span>{E(t)}</span></li>' for t in items)
    def plan_set(cls_, free, prem, av):
        def card(p, hot=False):
            btn_cls = 'sb sb-gold' if hot else 'sb sb-line'
            tagh = '<span class="ptag">Most popular</span>' if hot else ''
            return (f'<div class="plan{" hot" if hot else ""}">{tagh}<p class="plan-name">{E(p["name"])}</p><div class="price">{p["price"]}</div><p class="for">{E(p["for"])}</p>'
                    f'<ul>{tick(p["items"])}</ul><a class="{btn_cls}" data-login href="?login=1" rel="nofollow">{E(p["cta"])}</a></div>')
        return f'<div class="plans {cls_}">{card(free)}{card(prem, True)}{card(av)}</div>'
    stu = plan_set('plans-s',
        {'name': 'Free', 'price': '&#8377;0', 'for': 'For every student', 'cta': 'Start free as a student', 'items': ['All previous year questions (JEE Main, JEE Advanced, KCET, NDA, IAT) with answers and solutions', 'Past papers, chapter-wise and full-length mocks from PYQs, and your own tests', 'Reports with your school rank and topic analysis', 'PDF download of previous year questions', 'First Class 11 and Class 12 handouts to view']},
        {'name': 'Premium', 'price': '&#8377;299 <small>a year</small>', 'for': 'For students who want it all', 'cta': 'Get Premium for students', 'items': ['Everything in Free', 'All Non-PYQ practice questions from books and sheets', 'DPPs and the Own DPP Maker', 'Mocks and own tests with PYQ, practice or a mix, and a difficulty slider', 'All handouts to view and download', 'PDF download and printing', 'Rank among all students and the all-India average and top score']},
        {'name': 'Avanti', 'price': 'Free <small>with Avanti</small>', 'for': 'For Avanti students', 'cta': 'Login with Student ID', 'items': ['Premium included at no cost', 'Sign in with your Student ID', 'School tests from your teacher', 'Rank in school and among all students']})
    tea = plan_set('plans-t',
        {'name': 'Free', 'price': '&#8377;0', 'for': 'For every teacher', 'cta': 'Start free as a teacher', 'items': ['All previous year questions with answers and solutions', 'PDF download of previous year questions', 'Past papers, mocks and your own tests', 'One test link for your school as a free trial', 'First Class 11 and Class 12 handouts to view']},
        {'name': 'Premium', 'price': '&#8377;599 <small>a year</small>', 'for': 'For teachers who run a class', 'cta': 'Get Premium for teachers', 'items': ['Everything in Free', 'Non-PYQ practice questions, DPPs and the Own DPP Maker', 'Unlimited test links for your class and batch', 'All handouts and PDF downloads, printing', 'Saved worksheets', 'My Students with performance and test history', 'Results export and My School']},
        {'name': 'Avanti', 'price': 'Free <small>with Avanti</small>', 'for': 'For Avanti teachers', 'cta': 'Avanti teacher login', 'items': ['Full teaching tools at no cost', 'Create tests for your school', 'All handouts and PDFs, also Word and PowerPoint', 'Student list and bulk upload']})
    plans = (f'<div class="who"><input type="radio" name="who" id="who-s" class="sr" checked><input type="radio" name="who" id="who-t" class="sr">'
             f'<div class="who-bar" role="radiogroup" aria-label="Plans for"><label for="who-s">Student</label><label for="who-t">Teacher</label></div>{stu}{tea}</div>')
    faq_html = ''.join(f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q, a in FAQ)
    rows = [('1', 92), ('2', 88), ('3', 84), ('4', 79)]
    rep = ''.join(f'<div class="report-row"><b>{r}</b><div><i class="w{p}"></i></div><span>{p}%</span></div>' for r, p in rows)
    return f"""{header(0)}
<main id="main">
{clock_strip()}
<section class="hero"><div class="swrap hero-in">
<div><span class="eyebrow"><i></i>JEE · KCET · NDA · IAT Mathematics</span>
<h1>Math question bank, PYQs and DPPs <em>with full solutions</em></h1>
<p class="lead">Practise math with a question bank, PYQs (previous-year papers), DPPs, handouts and NTA-style online tests, all with full solutions, for Class 11 and 12 and for exams such as JEE, KCET, NDA and IAT.</p>
<div class="hero-cta"><a class="sb sb-gold sb-lg when-out" data-login href="?login=1" rel="nofollow">Start practising free</a><a class="sb sb-gold sb-lg when-in" href="dashboard">Open your dashboard</a><a class="sb sb-white-line sb-lg" href="#dashboard">See the dashboard</a></div>
<ul class="hero-pts">{pts}</ul></div>
{hero_shot}
</div></section>
<section class="stats" aria-label="At a glance"><div class="swrap stats-in">
<div class="stat"><b>{BANK_N}</b><span>Questions in the bank</span></div><div class="stat"><b>{STATS["_all"]["nonpyq_questions"]:,}</b><span>Non-PYQ practice questions</span></div>
<div class="stat"><b>{len(CH)}</b><span>Chapters, {D["tot_sub"]} subtopics</span></div><div class="stat"><b>2000–2026</b><span>Past papers</span></div></div></section>
<section class="sec" id="dashboard"><div class="swrap"><div class="sec-head"><span class="kick">Inside the dashboard</span><h2>See what you get after you log in</h2><p>Real screens from the dashboard: question bank, DPP builder, past papers, handouts and the online test window.</p></div>{showcase}</div></section>
<section class="sec sec-alt" id="features"><div class="swrap"><div class="sec-head"><span class="kick">Everything in one place</span><h2>Everything you need to practise math</h2><p>Practise, test yourself and track your progress without juggling PDFs, apps and notebooks.</p></div>
<div class="grid3">{feat_html}</div></div></section>
<section class="sec" id="how"><div class="swrap"><div class="sec-head"><span class="kick">How it works</span><h2>Start in three simple steps</h2></div><div class="steps">{steps_html}</div></div></section>
<section class="sec sec-alt" id="chapters"><div class="swrap"><div class="sec-head"><span class="kick">Syllabus</span><h2>Every math chapter, covered</h2><p>{len(CH)} chapters and {D["tot_sub"]} subtopics, with the number of JEE Main and JEE Advanced questions asked from each. Open a chapter to see its subtopics.</p></div>
<h3 class="chc-h">Class 11 <small>{sum(1 for c in CH if cls(c) == "11")} chapters</small></h3><div class="chc-grid">{c11}</div>
<h3 class="chc-h">Class 12 <small>{sum(1 for c in CH if cls(c) == "12")} chapters</small></h3><div class="chc-grid">{c12}</div>
<h3 class="chc-h">Out of syllabus <small>no longer in the current JEE syllabus, but still in the question bank</small></h3><div class="chc-grid">{oos}</div>
<p class="chp-note"><a class="sb sb-line" href="maths/">See all chapters with question counts</a></p></div></section>
<section class="sec" id="exams"><div class="swrap"><div class="sec-head"><span class="kick">Exams</span><h2>Built for the exams you are preparing for</h2><p>{sum(STATS[e[0]]["questions"] for e in EXAMS):,} previous-year math questions, paper by paper. Open an exam to see its questions by chapter and year.</p></div><div class="exc-grid">{exam_cards}</div><p class="home-more"><a href="exams/#dates">All exam dates and countdowns</a> &middot; <a href="resources/questions-analysis/">Questions analysis</a> &middot; <a href="resources/important-exams/">Important exams after Class 12</a> &middot; <a href="exams/cuet/">CUET UG guide</a></p></div></section>
<section class="sec sec-alt" id="teachers"><div class="swrap split"><div><span class="kick">For teachers</span><h2>Set a test in minutes. See every result.</h2><p>Build an online test from the question bank, share one link with your class and get a ranked report the moment students finish.</p>
<ul class="ticks">{tick(['Create tests from DPPs, PYQs or your own selection', 'One link for the whole class, with an exam window', 'Ranks, averages and question-wise analysis', 'Students register themselves and choose your school'])}</ul>
<a class="sb sb-pri when-out" data-login href="?login=1" rel="nofollow">Login as a teacher</a><a class="sb sb-pri when-in" href="dashboard">Go to my dashboard</a></div>
<div class="report" aria-hidden="true"><p class="report-h">Class result · Mock Test 3</p><small>Top scorers · example</small>{rep}</div></div></section>
<section class="sec" id="plans"><div class="swrap"><div class="sec-head"><span class="kick">Plans</span><h2>Start free. Upgrade when you are ready.</h2><p>Premium is a one-year membership. Avanti students and teachers get it free.</p></div>{plans}</div></section>
<section class="sec sec-alt" id="faq"><div class="swrap"><div class="sec-head"><span class="kick">FAQ</span><h2>Frequently asked questions</h2></div><div class="faq">{faq_html}</div></div></section>
<section class="cta"><h2>Ready to practise smarter?</h2><p>Create your free account and start with any chapter today.</p><a class="sb sb-gold sb-lg when-out" data-login href="?login=1" rel="nofollow">Login or register</a><a class="sb sb-gold sb-lg when-in" href="dashboard">Continue to the dashboard</a></section>
</main>
{footer(0, share=True)}"""

# ---------- public number pages: question counts, chapter-wise count, chapter weightage ----------
ALL = STATS['_all']
PYQ_N, NP_N = ALL['pyq_questions'], ALL['nonpyq_questions']
GROUP_ORDER = [('JEE Main', 'h-main'), ('JEE Advanced', 'h-adv'), ('AIEEE', 'h-old'), ('IIT', 'h-old'), ('KCET', 'h-kcet'), ('IAT', 'h-iat'), ('NDA', 'h-nda')]
EXAM_BY_KEY = {e[0]: e for e in EXAMS}
EXAM_KEY = {'JEE Main': 'JEE Main', 'JEE Advanced': 'JEE Advanced', 'AIEEE': 'AIEEE', 'IIT': 'IIT', 'KCET': 'KCET', 'IAT': 'IAT', 'NDA': 'NDA'}

def num(n): return f'{int(n):,}'

def upgrade_block():
    return ('<section class="upg"><div><h2>Want to know more, in depth?</h2><p>Get a one-year Premium membership: PDF downloads and printing, all handouts and all-India ranks, on top of the free question bank, DPPs and past papers. '
            'Students pay &#8377;299 a year and teachers &#8377;599 a year. Avanti students and teachers get Premium free.</p></div>'
            '<div class="upg-go"><a class="upg-btn when-in" href="../dashboard#/membership">Purchase Premium</a><a class="upg-btn when-out" data-login href="../?login=1" rel="nofollow">Purchase Premium</a>'
            '<small>Login or register first, then choose Premium in your profile menu.</small></div></section>')

def stat_shell(slug_, title, h1, desc, lead, inner, crumb):
    crumbs = f'<a href="../">Home</a> &rsaquo; <span aria-current="page">{E(crumb)}</span>'
    body = band(crumbs, E(h1)) + '\n' + grid(f'<p class="pg-lead">{E(lead)}</p>' + inner + upgrade_block() + cta(1, '', cur=slug_ + '/'), 1)
    ld = [{'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'}, {'@type': 'ListItem', 'position': 2, 'name': h1, 'item': f'{SITE}/{slug_}/'}]}]
    return page(title, desc, f'{SITE}/{slug_}/', body, 1, ld)

def question_counts_page():
    def tile(cls_, lbl, n, href=None):
        l = f'<a class="stretch" href="{href}">{E(lbl)}</a>' if href else E(lbl)
        return f'<div class="{cls_}"><div class="lbl">{l}</div><div class="num">{num(n)}</div></div>'
    rows = f'<div class="qc-row h-all">{tile("qc-tile all", "All questions", PYQ_N + NP_N)}{tile("qc-tile", "PYQs", PYQ_N)}{tile("qc-tile", "Non-PYQ", NP_N)}</div>'
    for k, hue in GROUP_ORDER:
        s = STATS[k]; e = EXAM_BY_KEY[k]
        yrs = ''.join(tile('qc-y', y, n) for y, n in sorted(s['by_year'].items(), key=lambda kv: -int(kv[0])))
        rows += f'<div class="qc-row {hue}">{tile("qc-tile", k, s["questions"], f"../resources/questions-analysis/{e[2]}/")}{yrs}</div>'
    oos = ALL['oos_by_exam']
    rows += f'<div class="qc-row h-oos">{tile("qc-tile", "Out of syllabus", sum(oos.values()))}' + ''.join(tile('qc-y', 'Advanced' if k == 'JEE Advanced' else k, n) for k, n in sorted(oos.items(), key=lambda kv: -kv[1])) + '</div>'
    rows += f'<div class="qc-row h-np">{tile("qc-tile", "Non-PYQ", NP_N)}' + ''.join(tile('qc-y', k, n) for k, n in sorted(ALL['by_source'].items(), key=lambda kv: -kv[1])) + '</div>'
    inner = (f'<div class="qc">{rows}</div><p class="pg-fine">PYQ means a previous-year question from a real exam paper. Non-PYQ questions are practice questions from books and sheets. The numbers on this page are counts only; the questions and solutions are inside the dashboard after you sign in.</p>')
    return stat_shell('question-counts', 'Mathematics Bank: Question Counts | अंक-IT', 'Mathematics Bank: Question Counts',
        f'How many math questions are in the अंक-IT question bank: {num(PYQ_N + NP_N)} questions, {num(PYQ_N)} previous-year questions by exam and year, and {num(NP_N)} practice questions.',
        f'{num(PYQ_N + NP_N)} math questions in all: {num(PYQ_N)} previous-year questions (PYQs) from JEE Main, JEE Advanced, AIEEE, IIT-JEE, KCET, IAT and NDA, shown paper year by year, and {num(NP_N)} practice questions from three practice sources.', inner, 'Question counts')

def chapter_wise_page():
    cols = [('JEE Main', lambda c: c['exams'].get('JEE Main', 0) + c['exams'].get('AIEEE', 0), 'All JEE Main questions, including AIEEE (the exam before 2013)'),
            ('JEE Adv', lambda c: c['exams'].get('JEE Advanced', 0) + c['exams'].get('IIT', 0), 'All JEE Advanced questions, including IIT-JEE (the exam before 2013)'),
            ('KCET', lambda c: c['exams'].get('KCET', 0), 'KCET (Karnataka CET), a separate exam'),
            ('IAT', lambda c: c['exams'].get('IAT', 0), 'IAT (IISER Aptitude Test), math section, a separate exam'),
            ('NDA', lambda c: c['exams'].get('NDA', 0), 'NDA (National Defence Academy), mathematics paper, a separate exam'),
            ('BB Ex', lambda c: c['src'].get('BB Ex', 0), 'Practice questions from BB Ex sheets'),
            ('Ln Ex', lambda c: c['src'].get('Ln Ex', 0), 'Practice questions from Ln Ex (exercises)'),
            ('Ln DY', lambda c: c['src'].get('Ln DY', 0), 'Practice questions from Ln DY sheets')]
    head = '<th scope="col">Code</th><th scope="col">Chapter</th>' + ''.join(f'<th scope="col" class="num" title="{E(t)}">{E(n)}</th>' for n, _, t in cols) + '<th scope="col" class="num">Total</th><th scope="col" class="num" title="Previous-year questions that the source lists as out of the current syllabus">Out of syllabus</th>'
    tot = [0] * (len(cols) + 2); body = ''
    order = [c['code'] for c in CH] + [code for code, _ in OOS]
    for code in order:
        c = ALL['chapter_table'].get(code)
        if not c: continue
        vals = [f(c) for _, f, _ in cols]; total = sum(vals); vals += [total, c['oos']]
        for i, v in enumerate(vals): tot[i] += v
        nm = E(CH_NAME[code]); label = f'<a href="../maths/{CH_SLUG[code]}/">{nm}</a>' if code in CH_SLUG else f'{nm} <span class="lv">out of syllabus</span>'
        body += f'<tr><td class="nw">{code}</td><td>{label}</td>' + ''.join(f'<td class="num">{num(v) if v else "&middot;"}</td>' for v in vals) + '</tr>'
    body += '<tr class="tot-row"><td></td><th scope="row">All chapters</th>' + ''.join(f'<td class="num">{num(v)}</td>' for v in tot) + '</tr>'
    inner = (f'<p>Questions per chapter: previous-year questions by exam, plus practice questions from each source. Open a chapter to see its subtopics and exam-wise counts.</p>'
             f'<div class="pg-table cw"><table class="wide"><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>'
             '<p class="pg-fine">Total is previous-year plus practice questions. Out of syllabus counts the previous-year questions that the paper lists as no longer in the current syllabus (they are also counted in the exam columns).</p>')
    return stat_shell('chapter-wise-count', 'Chapter-wise Count of Math Questions | अंक-IT', 'Chapter-wise Count',
        'Chapter-wise count of math questions in the अंक-IT bank: JEE Main, JEE Advanced, KCET, IAT and NDA PYQs and practice questions, for every chapter.',
        'How many questions each math chapter has, split by exam and by practice source.', inner, 'Chapter-wise count')

def weightage_page():
    W = ALL['wchart']; rows = []
    for code in [c['code'] for c in CH] + [code for code, _ in OOS]:
        w = W.get(code)
        if not w: continue
        rows.append((code, w))
    def n_of(w): return sum(w['main'].values()) + sum(w['adv'].values())
    rows.sort(key=lambda r: -n_of(r[1]))
    total = sum(n_of(w) for _, w in rows); top = max(n_of(rows[0][1]), 1); third = -(-len(rows) // 3)
    items = ''
    for i, (code, w) in enumerate(rows, 1):
        n = n_of(w); band_ = 'hi' if i <= third else ('mid' if i <= 2 * third else 'lo')
        cl = f'Class {"11" if code.startswith("11") else "12"}'
        nm = E(CH_NAME[code]); link = f'<a href="../maths/{CH_SLUG[code]}/">{nm}</a>' if code in CH_SLUG else nm
        dm, da = E(json.dumps(w['main'], separators=(',', ':'))), E(json.dumps(w['adv'], separators=(',', ':')))
        items += (f'<li class="wc-row" data-code="{code}" data-syl="{(order_idx := ([c["code"] for c in CH] + [x for x, _ in OOS]).index(code))}" data-main="{dm}" data-adv="{da}"><span class="wc-rk">#{i}</span>'
                  f'<span class="wc-lbl">{link}<small>{code} &middot; {cl}</small></span><span class="wc-track"><i class="wc-seg {band_} w{round(n / top * 100)}"></i></span>'
                  f'<span class="wc-val"><b>{n}</b><span>{n / total * 100:.1f}% of all</span></span></li>')
    top5 = sum(n_of(w) for _, w in rows[:5])
    btn = lambda g, v, t, on=False: f'<button type="button" class="wc-chip" data-g="{g}" data-v="{v}" aria-pressed="{"true" if on else "false"}">{t}</button>'
    ctl = ('<div class="wc-ctl"><div><span>Exam</span>' + btn('exam', 'all', 'All', True) + btn('exam', 'main', 'JEE Main') + btn('exam', 'adv', 'JEE Advanced') + '</div>'
           '<div><span>Period</span>' + btn('yrs', 'all', 'All years', True) + btn('yrs', '2013', 'Since 2013') + btn('yrs', '10', 'Last 10 years') + btn('yrs', '5', 'Last 5 years') + '</div>'
           '<div><span>Sort by</span>' + btn('sort', 'count', 'Most asked', True) + btn('sort', 'syl', 'Syllabus order') + '</div></div>')
    cards = (f'<div class="wc-cards"><div><b data-wc-total>{num(total)}</b><span>previous-year questions counted</span></div>'
             f'<div><b data-wc-top>{E(CH_NAME[rows[0][0]])}</b><span data-wc-topn>most asked chapter ({n_of(rows[0][1])} questions)</span></div>'
             f'<div><b data-wc-top5>{round(top5 / total * 100)}%</b><span>of all questions come from the top 5 chapters</span></div></div>')
    inner = (f'<p class="wc-note" data-wc-note>Showing JEE Main and JEE Advanced questions from all years. A longer bar means more questions came from that chapter. Chapters whose old papers are still being added may show fewer questions.</p>'
             f'{ctl}{cards}<ol class="wc-list" data-wc-list>{items}</ol>'
             '<div class="wc-leg"><span class="k hi">Most asked (top third)</span><span class="k mid">Often asked</span><span class="k lo">Asked less</span></div>'
             f'<script src="../weightage.js?v={VER}" defer></script>')
    return stat_shell('chapter-weightage', 'Chapter Weightage: Most Asked Math Chapters | अंक-IT', 'Chapter Weightage',
        'Chapter weightage in JEE math: how many JEE Main and JEE Advanced previous-year questions came from each chapter since 2013, in the last 10 or 5 years.',
        'Which math chapters matter most: how many previous-year questions came from each chapter. Choose the exam and the period.', inner, 'Chapter weightage')


def sitemap():
    urls = [(SITE + '/', '1.0'), (SITE + '/maths/', '0.9'), (SITE + '/syllabus-priority/', '0.8'), (SITE + '/question-counts/', '0.6'), (SITE + '/chapter-wise-count/', '0.6'), (SITE + '/chapter-weightage/', '0.7')] + [(url(c), '0.8') for c in CH] + [(SITE + '/exams/', '0.9'), (SITE + f'/{ANA}/', '0.8'), (SITE + '/resources/important-exams/', '0.8'), (SITE + '/resources/paper-wise-analysis/', '0.8')] + [(f'{SITE}/resources/paper-wise-analysis/{e[2]}/', '0.7') for e in EXAMS] + [ (SITE + '/exams/cuet/', '0.8')] + [(exam_url(e), '0.9') for e in EXAMS] + [(f'{SITE}/{ANA}/{e[2]}/', '0.8') for e in EXAMS] + [(f'{SITE}/{ANA}/{e[2]}/{ANY_SLUG[c]}/', '0.6') for e in EXAMS for c, d in STATS[e[0]]['chapters'].items() if not thin(d)] + [(f'{SITE}/{p}/', '0.3') for p in ('about', 'contact', 'privacy', 'terms', 'refund-policy')]
    body = ''.join(f'<url><loc>{u}</loc><priority>{p}</priority></url>\n' for u, p in urls)   # no lastmod: a build date on every URL tells search engines nothing
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}</urlset>\n'

def write(path, text):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    open(path, 'w', encoding='utf-8').write(text)

def main():
    for i, c in enumerate(CH):
        write(f'maths/{slug(c)}/index.html', chapter_page(i, c))
        write(f'jee-maths/{slug(c)}/index.html', redirect_page(f'maths/{slug(c)}/', 2, f'Math: {short(c)}'))   # the old address keeps working
    write('maths/index.html', hub_page()); write('jee-maths/index.html', redirect_page('maths/', 1, 'All Math Chapters'))
    write('syllabus-priority/index.html', priority_page())
    write('question-counts/index.html', question_counts_page()); write('chapter-wise-count/index.html', chapter_wise_page()); write('chapter-weightage/index.html', weightage_page())
    write('404.html', not_found_page())
    write('exams/index.html', exams_hub())
    write('resources/important-exams/index.html', important_page()); write('resources/paper-wise-analysis/index.html', paper_wise_hub());
    for e in EXAMS: write(f'resources/paper-wise-analysis/{e[2]}/index.html', paper_wise_page(e))
    write(f'{ANA}/index.html', analysis_hub())
    write('exams/important-exams/index.html', redirect_page('resources/important-exams/', 2, 'Important Exams After Class 12')); write('exams/safe-scores/index.html', redirect_page('exams/', 2, 'Exams We Cover'))   # old addresses keep working
    write('exams/cuet/index.html', exam_page(CUET)); write('exams/cuet/about/index.html', redirect_page('exams/cuet/', 3, 'CUET UG: Everything You Should Know'))
    for e in EXAMS:
        write(f'exams/{e[2]}/index.html', exam_page(e)); write(f'{ANA}/{e[2]}/index.html', analysis_page(e))
        if e[2] in GUIDES: write(f'exams/{e[2]}/about/index.html', redirect_page(f'exams/{e[2]}/', 3, f'{e[1]}: Everything You Should Know'))
        for code in STATS[e[0]]['chapters']:
            write(f'{ANA}/{e[2]}/{ANY_SLUG[code]}/index.html', exam_chapter_page(e, code))
            write(f'exams/{e[2]}/{ANY_SLUG[code]}/index.html', redirect_page(f'{ANA}/{e[2]}/{ANY_SLUG[code]}/', 3, f'{e[1]} {CH_NAME[code]} PYQ Analysis', f'{e[1]} {CH_SHORT.get(code, CH_NAME[code])}'))
    for slug_, fn in (('about', about_page), ('contact', contact_page), ('privacy', privacy_page), ('terms', terms_page), ('refund-policy', refund_page)): write(f'{slug_}/index.html', fn())
    write('sitemap.xml', sitemap())
    write('robots.txt', f'User-agent: *\nAllow: /\nDisallow: /qb/\nDisallow: /qbank\n\nSitemap: {SITE}/sitemap.xml\nSitemap: {SITE}/sitemap-q.xml\n')
    write('index.html', page('Math Question Bank, PYQs, DPPs | अंक-IT', 'Free math practice for Class 11 and 12: question bank with solutions, PYQs, DPPs, handouts and online tests for JEE, KCET, NDA and IAT.', SITE + '/', home_block(), 0,
        jsonld=[{"@context": "https://schema.org", "@graph": [{"@type": "WebSite", "@id": SITE + "/#site", "url": SITE + "/", "name": "अंक-IT Mathematics Dashboard", "inLanguage": LANG},
        {"@type": "FAQPage", "@id": SITE + "/#faq", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": ans}} for q, ans in FAQ]},
        {"@type": "EducationalOrganization", "@id": SITE + "/#org", "name": "अंक-IT Mathematics", "url": SITE + "/", "logo": SITE + "/img/icon/icon-180.png", "description": "Math question bank, previous-year papers, DPPs, handouts and online tests for Class 11 and 12."}]}], raw=True))
    if ERRORS: raise SystemExit('build_seo: fix these titles / descriptions (they are never cut automatically):\n  ' + '\n  '.join(dict.fromkeys(ERRORS)))
    print('built', len(CH), 'chapter pages +', len(EXAMS), 'exam pages + hubs + about/contact/privacy/terms + sitemap + robots + home page')

if __name__ == '__main__':
    main()
