#!/usr/bin/env python3
"""Builds the public, search-engine-readable pages from syllabus.json (public data only):
   the home page (inside index.html), maths/index.html, maths/<chapter>/index.html, about/, contact/, privacy/, terms/,
   robots.txt and sitemap.xml. Run from the repository root:  python3 .github/scripts/build_seo.py
   Nothing here reads the private content (questions, answers, solutions, handouts)."""
import json, html, re, os, datetime

SITE = os.environ.get('SITE_URL', 'https://unkganit.com').rstrip('/')
TODAY = os.environ.get('SEO_DATE', datetime.date.today().isoformat())
VER = os.environ.get('SEO_VER', '927')
E = html.escape
D = json.load(open('syllabus.json', encoding='utf-8'))
CH = D['chapters']
Y0, Y1 = D['from'], D['to']
# Chapters that are no longer in the JEE syllabus. They are listed (not given pages of their own: there is no syllabus data for them).
OOS = [('12M25', 'Linear Programming Problem'), ('12M26', 'Mathematical Reasoning'), ('12M27', 'Solution of Triangle'), ('12M28', 'Height and Distance')]
CONTACT_EMAIL = os.environ.get('CONTACT_EMAIL', 'unkganit@gmail.com')   # public contact address shown on the Contact, Privacy and Terms pages
UPDATED = '17 November 2026'

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
CHECK = svg('<path d="M20 6 9 17l-5-5"/>', 20)


# ---------- exams (counts come from .github/scripts/exam-stats.json, made by exam_stats.py; only numbers, no questions) ----------
STATS = json.load(open('.github/scripts/exam-stats.json', encoding='utf-8'))
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

# Plain facts for the exam pages. Patterns change, so the pages tell readers to check the official notification.
FACTS = {
 'JEE Main': [('Full name', 'Joint Entrance Examination (Main)'), ('Conducted by', 'National Testing Agency (NTA)'),
   ('Held for', 'Admission to B.E. / B.Tech at NITs, IIITs and other centrally funded institutions; also the qualifying round for JEE Advanced'),
   ('Who can appear', 'Students who have passed, or are appearing in, Class 12'), ('Mode', 'Computer-based test'),
   ('How often', 'Twice a year (January and April sessions), held in several shifts'), ('Subjects', 'Physics, Chemistry and Mathematics'),
   ('Maths in the paper', 'Multiple-choice and numerical-answer questions. Recent shift papers have 25 maths questions (20 multiple-choice and 5 numerical).')],
 'JEE Advanced': [('Full name', 'Joint Entrance Examination (Advanced)'), ('Conducted by', 'One of the IITs, chosen by rotation each year'),
   ('Held for', 'Admission to the undergraduate programmes of the IITs'), ('Who can appear', 'Top candidates who qualify through JEE Main'),
   ('Mode', 'Computer-based test'), ('How often', 'Once a year, in two papers (Paper 1 and Paper 2)'), ('Subjects', 'Physics, Chemistry and Mathematics in each paper'),
   ('Maths in the paper', 'A mix of question types (single correct, multiple correct, numerical and matching). The pattern can change from year to year.')],
 'IIT': [('Full name', 'Joint Entrance Examination for the IITs'), ('Conducted by', 'The IITs (one IIT organised it each year)'),
   ('Held for', 'Admission to the IITs'), ('Who can appear', 'Students who had passed, or were appearing in, Class 12'), ('Mode', 'Pen and paper'),
   ('How often', 'Once a year until 2012. From 2013 it continued as JEE Advanced.'), ('Subjects', 'Physics, Chemistry and Mathematics'),
   ('Maths in the paper', 'Question styles changed over the years and included single-correct, multiple-correct, integer-answer and matching questions.')],
 'AIEEE': [('Full name', 'All India Engineering Entrance Examination'), ('Conducted by', 'Central Board of Secondary Education (CBSE)'),
   ('Held for', 'Admission to B.E. / B.Tech and B.Arch at NITs, IIITs and other institutions'), ('Who can appear', 'Students who had passed, or were appearing in, Class 12'),
   ('Mode', 'Mainly pen and paper, with an online option in later years'), ('How often', 'Once a year from 2002 to 2012. From 2013 it was replaced by JEE Main.'),
   ('Subjects', 'Physics, Chemistry and Mathematics'), ('Maths in the paper', 'Multiple-choice questions on the Class 11 and 12 syllabus')],
 'KCET': [('Full name', 'Karnataka Common Entrance Test'), ('Conducted by', 'Karnataka Examinations Authority (KEA)'),
   ('Held for', 'Admission to engineering, pharmacy, farm science and other professional courses in Karnataka'), ('Who can appear', 'Students who have passed, or are appearing in, Class 12 (II PUC)'),
   ('Mode', 'Pen and paper (OMR answer sheet)'), ('How often', 'Once a year'), ('Subjects', 'Physics, Chemistry, Mathematics and Biology (engineering uses Physics, Chemistry and Mathematics)'),
   ('Maths in the paper', 'Multiple-choice questions based on the Class 11 and 12 (PUC) syllabus')],
 'NDA': [('Full name', 'National Defence Academy and Naval Academy Examination'), ('Conducted by', 'Union Public Service Commission (UPSC)'),
   ('Held for', 'Entry to the Army, Navy and Air Force wings of the National Defence Academy and to the Indian Naval Academy'),
   ('Who can appear', 'Candidates who have passed, or are appearing in, Class 12 and meet the age limits'), ('Mode', 'Pen and paper (OMR answer sheet)'),
   ('How often', 'Twice a year (NDA I and NDA II)'), ('Written test', 'Mathematics paper (300 marks, 2.5 hours) and General Ability Test (600 marks)'),
   ('Maths in the paper', 'Objective questions on algebra, matrices, trigonometry, analytical geometry, calculus, vectors, statistics and probability')],
 'IAT': [('Full name', 'IISER Aptitude Test'), ('Conducted by', 'The Indian Institutes of Science Education and Research (organised by one IISER)'),
   ('Held for', 'Admission to the BS-MS dual degree programmes of the IISERs'), ('Who can appear', 'Students who have passed, or are appearing in, Class 12'),
   ('Mode', 'Computer-based test'), ('How often', 'Once a year'), ('Subjects', 'Physics, Chemistry, Mathematics and Biology'),
   ('Maths in the paper', 'Multiple-choice questions at Class 11 and 12 level')],
}
SHORT = {'JEE Main': ('NTA', 'NITs, IIITs and other institutes; qualifier for JEE Advanced', 'Computer-based'),
         'JEE Advanced': ('One of the IITs (rotating)', 'The IITs', 'Computer-based'),
         'IIT': ('The IITs', 'The IITs (until 2012)', 'Pen and paper'),
         'AIEEE': ('CBSE', 'NITs, IIITs and other institutes (until 2012)', 'Pen and paper / online'),
         'KCET': ('KEA, Karnataka', 'Professional courses in Karnataka', 'Pen and paper (OMR)'),
         'NDA': ('UPSC', 'National Defence Academy and Naval Academy', 'Pen and paper (OMR)'),
         'IAT': ('IISERs', 'BS-MS programmes of the IISERs', 'Computer-based')}
def exam_logo(e, size=44):
    return f'<img class="exlogo" src="{{up}}img/exams/{e[2]}.svg" alt="" width="{size}" height="{size}" loading="lazy">'
def exam_url(e): return f"{SITE}/exams/{e[2]}/"
def exam_meta(e):
    s = STATS[e[0]]
    return f"{s['questions']:,} questions · {s['first']}–{s['last']} · {s['papers']} papers"

# ---------- shared pieces ----------
def head(title, desc, canon, depth, jsonld=None, og_title=None, index=False):
    up = '../' * depth
    ld = ''.join(f'<script type="application/ld+json">{json.dumps(j, ensure_ascii=False, separators=(",", ":"))}</script>\n' for j in (jsonld or []))
    return f'''<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{E(canon)}">
<meta name="robots" content="index, follow, max-image-preview:large">
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
{ld}'''

def page(title, desc, canon, body, depth, jsonld=None, og_title=None):
    up = '../' * depth
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src https://usehxhvzhdbcmnmqaxoo.supabase.co; base-uri 'self'; form-action 'none'">
<title>{E(title)}</title>
{head(title, desc, canon, depth, jsonld, og_title)}<meta name="theme-color" content="#0c1a3d">
<link rel="icon" type="image/png" sizes="32x32" href="{up}img/icon/icon-32.png?v={VER}">
<link rel="apple-touch-icon" sizes="180x180" href="{up}img/icon/icon-180.png?v={VER}">
<link rel="preload" href="{up}vendor/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{up}site.css?v={VER}">
<script src="{up}site.js?v={VER}"></script>
<script src="{up}login.js?v={VER}" defer></script>
</head>
<body class="pg">
{header(depth)}
{body}
{footer(depth)}
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

def exlogo(e, up, size=40):
    return f'<img class="exlogo" src="{up}img/exams/{e[2]}.webp?v={VER}" alt="" width="{size}" height="{size}" loading="lazy">'

def header(depth):
    up = '../' * depth
    home = up + '#/home' if depth else '#/home'
    a = lambda frag: (up + frag) if depth else frag
    chev = svg('<path d="m6 9 6 6 6-6"/>', 16)
    def lk(t, f): return f'<a href="{a("#" + f)}">{t}</a>'
    cards = ''.join(f'<a class="mega-card" href="{up}exams/{e[2]}/" role="menuitem">{exlogo(e, up, 44)}<span class="mc-body"><b>{E(e[1])}</b><span class="mc-tag">{E(e[3])}</span><span class="mc-meta">{E(exam_meta(e))}</span></span></a>' for e in EXAMS)
    exams_dd = (f'<div class="sh-dd"><a class="sh-ddb" href="{up}exams/" aria-haspopup="true" aria-expanded="false">Exams {chev}</a>'
                f'<div class="sh-mega" role="menu"><div class="mega-in"><p class="mega-h">Exams we cover <span>previous-year maths questions, shift by shift</span></p><div class="mega-grid">{cards}</div>'
                f'<a class="mega-all" href="{up}exams/">View all exams &rarr;</a></div></div></div>')
    rest = lk('Features', 'features') + lk('How it works', 'how') + lk('Chapters', 'chapters') + lk('Plans', 'plans') + lk('FAQ', 'faq')
    nav = exams_dd + rest
    login = f'<a class="sb sb-pri when-out" data-login href="{up}?login=1" rel="nofollow">Login</a>' if depth else '<a class="sb sb-pri when-out" data-login href="?login=1" rel="nofollow">Login</a>'
    grid_ico = svg('<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>', 22)
    user = (f'<div class="sh-user when-in"><a class="sh-ico" data-dash href="{up or "./"}" title="Dashboard" aria-label="Open your dashboard">{grid_ico}</a>'
            f'<div class="sh-pf"><a class="sh-av" data-av data-profile href="{a("#/profile")}" aria-label="Your account" aria-haspopup="true" aria-expanded="false">&nbsp;</a><div class="pfm" role="menu" hidden></div></div></div>')
    burger = svg('<path d="M4 7h16M4 12h16M4 17h16"/>', 22)
    msub = ('<details class="sh-sub"><summary>Exams ' + chev + '</summary>' + ''.join(f'<a href="{up}exams/{e[2]}/">{exlogo(e, up, 26)}{E(e[1])}</a>' for e in EXAMS) + f'<a href="{up}exams/">All exams</a></details>')
    return f"""<header class="sh"><div class="swrap sh-in">
<a class="sh-logo" href="{home}" aria-label="अंक-IT Mathematics Dashboard, home"><img src="{up}{LOGO}?v={VER}" alt="अंक-IT Mathematics" width="220" height="81"></a>
<nav class="sh-nav" aria-label="Main">{nav}</nav>
<div class="sh-end">{login}{user}
<details class="sh-menu"><summary aria-label="Menu">{burger}</summary><nav aria-label="Menu">{msub}{rest}<a href="{up}maths/">All Maths chapters</a></nav></details></div>
</div></header>"""

def footer(depth):
    up = '../' * depth
    a = lambda frag: (up + frag) if depth else frag
    ex = ''.join(f'<li><a href="{up}exams/{e[2]}/">{E(e[1])}</a></li>' for e in EXAMS[:4])
    return f"""<footer class="sf"><div class="swrap">
<div class="sf-grid">
<div><img src="{up}img/ankit-logo-dark-sm.png?v={VER}" alt="अंक-IT Mathematics" width="139" height="52"><p>JEE Maths practice for Class 11 and 12: question bank, previous-year papers, DPPs, handouts and online tests.</p></div>
<div><h4>Explore</h4><ul><li><a href="{up}maths/">Maths chapters</a></li><li><a href="{up}syllabus-priority/">Syllabus priority</a></li><li><a href="{up}exams/">All exams</a></li><li><a href="{a("#features")}">Features</a></li><li><a href="{a("#plans")}">Plans</a></li><li><a href="{a("#faq")}">FAQ</a></li></ul></div>
<div><h4>Exams</h4><ul>{ex}</ul></div>
<div><h4>Company</h4><ul><li><a href="{up}about/">About us</a></li><li><a href="{up}contact/">Contact us</a></li><li><a href="{up}privacy/">Privacy policy</a></li><li><a href="{up}terms/">Terms of use</a></li></ul></div>
</div>
<div class="sf-base"><span>&copy; 2026 अंक-IT Mathematics Dashboard</span><span>JEE Main · JEE Advanced · KCET · NDA · IAT</span></div>
</div></footer>"""

def aside(depth, current=None):
    up = '../' * depth
    cur = ' aria-current="page"'
    ex = ''.join(f'<li><a href="{up}exams/{e[2]}/"{cur if e[2] == current else ""}>{exlogo(e, up, 34)}<span><b>{E(e[1])}</b><small>{STATS[e[0]]["questions"]:,} questions</small></span></a></li>' for e in EXAMS)
    pop = sorted(CH, key=lambda c: -c['m'])[:8]
    chs = ''.join(f'<li><a href="{up}maths/{slug(c)}/"><span>{E(short(c))}</span><small>{c["m"]} Main</small></a></li>' for c in pop)
    return (f'<aside class="pg-side" aria-label="Sidebar"><div class="side-cta"><h2>Practise free</h2><p>Question bank, DPPs, past papers and tests, with full solutions.</p>'
            f'<a class="sb sb-gold when-out" data-login href="{up}?login=1" rel="nofollow">Login or register</a><a class="sb sb-gold when-in" href="{up}">Open your dashboard</a></div>'
            f'<a class="side-btn" href="{up}syllabus-priority/"><span class="ico i-gold">{svg("<path d=\"M4 20V10M10 20V4M16 20v-7M22 20H2\"/>", 22)}</span><span><b>Syllabus Priority</b><small>Which chapters are asked most</small></span></a>'
            f'<div class="side-box"><h2>Exams</h2><ul class="side-list">{ex}</ul></div>'
            f'<div class="side-box"><h2>Popular chapters</h2><ul class="side-list side-ch">{chs}</ul><a class="side-more" href="{up}maths/">All chapters &rarr;</a></div>'
            f'<div class="side-box side-help"><h2>Need help?</h2><p>Questions about signing in, plans or a question in the bank?</p><a href="{up}contact/">Contact us &rarr;</a></div></aside>')

def grid(main_html, depth, current=None, cls_=''):
    return f'<div class="swrap pg-grid"><main class="pg-main {cls_}">{main_html}</main>{aside(depth, current)}</div>'

def tbl(head, rows, cls_='', nums=()):
    th = ''.join(h if h.startswith('<th') else f'<th scope="col"{" class=\"num\"" if i in nums else ""}>{h}</th>' for i, h in enumerate(head))
    return f'<div class="pg-table {cls_}"><table><thead><tr>{th}</tr></thead><tbody>{rows}</tbody></table></div>'

def band(crumbs, h1):
    return f'<section class="pg-hero"><div class="swrap"><nav class="pg-crumbs" aria-label="Breadcrumb">{crumbs}</nav><h1>{h1}</h1></div></section>'

def cta(depth, text):
    up = '../' * depth
    return f'''<section class="pg-signin"><h2>Practise this free</h2><p>{E(text)}</p><p class="pg-ctas"><a class="sb sb-gold sb-lg when-out" data-login href="{up}?login=1" rel="nofollow">Login or register</a><a class="sb sb-gold sb-lg when-in" href="{up}">Open your dashboard</a></p><p class="pg-fine">Sign in with Google, or with your Student ID if you are an Avanti student. Starting is free.</p></section>'''

# ---------- chapter pages ----------
def chapter_page(i, c):
    n = int(c['no']); prev = CH[i - 1] if i > 0 else None; nxt = CH[i + 1] if i < len(CH) - 1 else None
    name = short(c); cl = cls(c)
    title = f'{name}: Maths Chapter Guide, PYQs & Practice | अंक-IT'
    if len(title) > 70: title = f'{name}: Maths PYQs & Practice | अंक-IT'
    desc = (f'{name} (Class {cl} maths): {len(c["subs"])} subtopics, previous-year questions from every exam with levels, {c["m"]} JEE Main and {c["a"]} JEE Advanced questions '
            f'tagged {Y0}–{Y1}, and free practice on अंक-IT.')
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
        ex_rows += f'<tr><td class="exn">{exlogo(e, "../../", 32)}<a href="../../exams/{e[2]}/{slug(c)}/">{E(e[1])}</a></td><td class="num">{d["questions"]}</td>{lvcells(d["by_level"])}<td>{ys[0]}–{ys[-1]}</td></tr>'
    by_exam = ('<h2>Questions by exam</h2><p>How many previous-year questions of this chapter each exam has asked, split by level (L1 easy, L2 medium, L3 hard). Open an exam to see its topic-wise and year-wise counts for this chapter.</p>'
               + tbl(['Exam', 'Questions', LVH, 'Years'], ex_rows, 'pg-narrow', (1,))) if ex_rows else ''
    modern = [(f'{exlogo(e, "../../", 24)}{E(e[1])}', STATS[e[0]]['chapters'][c['code']]['by_year']) for e in have if STATS[e[0]]['last'] >= 2013]
    legacy = [(f'{exlogo(e, "../../", 24)}{E(e[1])}', STATS[e[0]]['chapters'][c['code']]['by_year']) for e in have if STATS[e[0]]['last'] < 2013]
    trend = '<h2>Year-wise trend</h2><p>Questions per year from this chapter in every exam. Darker cells mean more questions that year.</p>' + (heat(modern, 2013, Y1) if modern else '')
    if legacy: trend += '<p class="pg-fine">Earlier exams, before 2013:</p>' + heat(legacy, 2000, 2012)
    crumbs = f'<a href="../../#/home">Home</a> &rsaquo; <a href="../">Maths</a> &rsaquo; <span aria-current="page">{E(name)}</span>'
    main = f"""<p class="pg-lead">Class {cl} · Chapter {n} of {len(CH)} · {len(c["subs"])} subtopics</p>
<p>{E(INTRO[n])}</p>
<ul class="pg-stats"><li><b>{c["m"]}</b><span>JEE Main questions tagged ({Y0}–{Y1})</span></li><li><b>{c["a"]}</b><span>JEE Advanced questions tagged</span></li><li><b>{len(c["subs"])}</b><span>subtopics</span></li></ul>
{focus}
<h2>Subtopics and how important each one is</h2>
<p>Counts are the previous-year questions tagged to each subtopic in the अंक-IT question bank. Importance reflects how often the subtopic is asked: High, Medium, Low, or Rare when it has hardly appeared. L1, L2 and L3 show the level of the questions (all exams together).</p>
{tbl(['Subtopic', 'Main Qs', 'Adv. Qs', 'Main', 'Adv.', LVH], rows, '', (1, 2))}
{by_exam}
{trend}
{cta(2, f"Solve {name} questions chapter-wise with full solutions, take NTA-style online tests and see your rank. The question bank, previous-year papers, DPPs and handouts are inside after you sign in.")}
<nav class="pg-pn" aria-label="Chapters">{links}</nav>"""
    body = band(crumbs, "Maths: " + E(name)) + '\n' + grid(main, 2)
    ld = [{'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Maths', 'item': SITE + '/maths/'},
            {'@type': 'ListItem', 'position': 3, 'name': name, 'item': url(c)}]},
          {'@context': 'https://schema.org', '@type': 'WebPage', 'name': f'Maths: {name}', 'description': desc, 'url': url(c),
           'inLanguage': 'en-IN', 'isPartOf': {'@type': 'WebSite', 'name': 'अंक-IT Mathematics Dashboard', 'url': SITE + '/'}}]
    return page(title, desc, url(c), body, 2, ld)

def chapter_list(prefix, with_stats=False):
    out = ''
    for label, sel in (('Class 11', lambda c: cls(c) == '11'), ('Class 12', lambda c: cls(c) == '12')):
        items = ''.join(
            f'<li><a href="{prefix}{slug(c)}/">{E(short(c))}</a>' + (f'<span>{len(c["subs"])} subtopics · {c["m"]} Main · {c["a"]} Adv.</span>' if with_stats else '') + '</li>'
            for c in CH if sel(c))
        out += f'<h3>{label}</h3><ul class="pg-chlist">{items}</ul>'
    oos = ''.join(f'<li><span class="pg-oos">{E(n)}</span><span>Out of syllabus · {code}</span></li>' for code, n in OOS)
    out += f'<h3>Out of syllabus</h3><p class="pg-fine">These chapters are no longer part of the current JEE syllabus. Their questions are still in the question bank and are marked <b>Out of Syllabus</b>, so you can include or leave them out.</p><ul class="pg-chlist">{oos}</ul>'
    return out

def hub_page():
    title = 'Maths Chapters: Class 11 & 12 Syllabus, PYQs & Practice | अंक-IT'
    desc = (f'All {len(CH)} maths chapters and {D["tot_sub"]} subtopics for Class 11 and 12, with previous-year question counts for JEE Main and '
            f'JEE Advanced ({Y0}–{Y1}). Practise free on अंक-IT.')
    crumbs = '<a href="../#/home">Home</a> &rsaquo; <span aria-current="page">Maths</span>'
    main = f"""<p class="pg-lead">{len(CH)} chapters in the syllabus · {D["tot_sub"]} subtopics · plus {len(OOS)} out-of-syllabus chapters</p>
<p>The maths syllabus split into chapters and subtopics. Open a chapter to see its subtopics, how often each one was asked in JEE Main and JEE Advanced, and the year-wise trend, then sign in to practise the questions with full solutions.</p>
{chapter_list('', True)}
{cta(1, "Choose a chapter, practise previous-year questions with solutions, and take online tests. Starting is free.")}"""
    body = band(crumbs, "Maths: all chapters") + '\n' + grid(main, 1)
    ld = [{'@context': 'https://schema.org', '@type': 'ItemList', 'name': 'Maths chapters', 'itemListElement': [
            {'@type': 'ListItem', 'position': k + 1, 'name': short(c), 'url': url(c)} for k, c in enumerate(CH)]}]
    return page(title, desc, f'{SITE}/maths/', body, 1, ld)

# ---------- exam pages ----------
def exam_page(e):
    key, name, sl, tag, about = e
    s = STATS[key]
    title = f'{name} Maths Previous Year Questions {s["first"]}–{s["last"]} | अंक-IT'
    desc = f'{name} maths: who conducts it, what it is for, the pattern, and {s["questions"]:,} previous-year questions from {s["first"]} to {s["last"]} with chapter-wise and year-wise counts. Practise free on अंक-IT.'
    facts = ''.join(f'<tr><th scope="row">{E(k)}</th><td>{E(v)}</td></tr>' for k, v in FACTS[key])
    glance = (f'<tr><th scope="row">Maths questions in this bank</th><td>{s["questions"]:,}</td></tr><tr><th scope="row">Years covered</th><td>{s["first"]}–{s["last"]}</td></tr>'
              f'<tr><th scope="row">Papers (shifts and sessions)</th><td>{s["papers"]}</td></tr>')
    lvd = s['by_level']; lvt = sum(lvd.values()) or 1
    glance += f'<tr><th scope="row">Question levels</th><td>L1 {lvd["L1"]:,} ({round(100 * lvd["L1"] / lvt)}%) · L2 {lvd["L2"]:,} ({round(100 * lvd["L2"] / lvt)}%) · L3 {lvd["L3"]:,} ({round(100 * lvd["L3"] / lvt)}%)</td></tr>'
    def chrow(code, d):
        nm = E(CH_NAME.get(code, code))
        label = f'<a href="{ANY_SLUG[code]}/">{nm}</a>' + ('' if code in CH_SLUG else ' <span class="lv">out of syllabus</span>')
        return f'<tr><td>{label}</td><td class="num">{d["questions"]}</td>{lvcells(d["by_level"])}<td class="sp">{spark(d["by_year"], s["last"])}</td></tr>'
    crows = ''.join(chrow(c, d) for c, d in sorted(s['chapters'].items(), key=lambda kv: (-kv[1]['questions'], kv[0])))
    yr_strip = heat([(E(name), s['by_year'])], s['first'], s['last'])
    crumbs = f'<a href="../../#/home">Home</a> &rsaquo; <a href="../">Exams</a> &rsaquo; <span aria-current="page">{E(name)}</span>'
    main = f"""<p class="pg-lead">{E(tag)}</p>
<p>{E(about)}</p>
<h2>{E(name)} at a glance</h2>
<div class="pg-table pg-facts"><table><tbody>{facts}</tbody></table></div>
<p class="pg-fine">Exam patterns change from year to year. Always check the official notification for the latest rules and dates.</p>
<h2>{E(name)} in this question bank</h2>
<div class="pg-table pg-facts"><table><tbody>{glance}</tbody></table></div>
<h2>Chapter-wise questions</h2>
<p>How many {E(name)} maths questions come from each chapter. Open a chapter to see its topic-wise and year-wise counts for {E(name)}.</p>
<p class="pg-fine">L1 easy, L2 medium, L3 hard. The dot graph shows the last five years of the exam, from the oldest on the left.</p>
{tbl(['Chapter', 'Questions', LVH, 'Last 5 years'], crows, '', (1,))}
<h2>Year-wise questions</h2>
{yr_strip}
{cta(2, f"Practise {name} questions chapter-wise with full solutions, build DPPs and open whole papers in exam format. Everything is inside after you sign in.")}"""
    body = band(crumbs, f'{exlogo(e, "../../", 44)} {E(name)}: maths and previous-year questions') + '\n' + grid(main, 2, sl)
    ld = [{'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Exams', 'item': SITE + '/exams/'},
            {'@type': 'ListItem', 'position': 3, 'name': name, 'item': exam_url(e)}]}]
    return page(title, desc, exam_url(e), body, 2, ld)

def exam_chapter_page(e, code):
    key, name, sl, tag, about = e
    d = STATS[key]['chapters'][code]; ch = CH_NAME[code]; cs = ANY_SLUG[code]
    ys = sorted(int(y) for y in d['by_year'])
    title = f'{name} {ch}: Previous Year Questions | अंक-IT'
    desc = f'{name} {ch}: {d["questions"]} previous-year maths questions from {ys[0]} to {ys[-1]}, with topic-wise counts, levels (L1/L2/L3) and a year-wise strip. Practise free on अंक-IT.'
    total = STATS[key]['questions']; share = round(100 * d['questions'] / total, 1)
    rank = 1 + sum(1 for k, v in STATS[key]['by_chapter'].items() if v > d['questions'])
    lvd = d['by_level']
    topics = ''.join(f'<tr><td>{E(t)}</td><td class="num">{v["n"]}</td>{lvcells(v)}</tr>' for t, v in sorted(d['topics_lv'].items(), key=lambda kv: (-kv[1]['n'], kv[0])))
    intro = INTRO[int([c for c in CH if c['code'] == code][0]['no'])] if code in CH_SLUG else OOS_INTRO[code]
    others = ''
    for x in EXAMS:
        dd = STATS[x[0]]['chapters'].get(code)
        if dd and x[2] != sl:
            others += f'<tr><td class="exn">{exlogo(x, "../../../", 32)}<a href="../../{x[2]}/{cs}/">{E(x[1])}</a></td><td class="num">{dd["questions"]}</td>{lvcells(dd["by_level"])}</tr>'
    general = (f'<p>See the full chapter guide with subtopics and JEE Main / Advanced counts: <a href="../../../maths/{cs}/">{E(ch)}</a>.</p>' if code in CH_SLUG else '')
    crumbs = f'<a href="../../../#/home">Home</a> &rsaquo; <a href="../../">Exams</a> &rsaquo; <a href="../">{E(name)}</a> &rsaquo; <span aria-current="page">{E(ch)}</span>'
    main = f"""<p class="pg-lead">{d["questions"]} questions · {ys[0]}–{ys[-1]} · L1 {lvd["L1"]} · L2 {lvd["L2"]} · L3 {lvd["L3"]}</p>
<p>{E(intro)}</p>
<ul class="pg-stats"><li><b>{d["questions"]}</b><span>{E(name)} questions from this chapter</span></li><li><b>{share}%</b><span>of all {E(name)} maths questions</span></li><li><b>#{rank}</b><span>rank among {E(name)} chapters</span></li></ul>
<h2>Year-wise questions</h2>
{heat([(E(ch), d['by_year'])], STATS[key]['first'], STATS[key]['last'], 'Chapter')}
<h2>Topic-wise questions in {E(name)}</h2>
<p>The topics of {E(ch)} that {E(name)} has asked, with the number of questions for each and their level (L1 easy, L2 medium, L3 hard).</p>
{tbl(['Topic', 'Questions', LVH], topics, 'pg-narrow', (1,))}
{('<h2>The same chapter in other exams</h2>' + tbl(['Exam', 'Questions', LVH], others, 'pg-narrow', (1,))) if others else ''}
{general}
{cta(3, f"Practise {name} {ch} questions with full solutions, build a DPP for this chapter and open whole papers. Everything is inside after you sign in.")}"""
    body = band(crumbs, f'{exlogo(e, "../../../", 40)} {E(name)}: {E(ch)}') + '\n' + grid(main, 3, sl)
    url_ = f'{SITE}/exams/{sl}/{cs}/'
    ld = [{'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'}, {'@type': 'ListItem', 'position': 2, 'name': 'Exams', 'item': SITE + '/exams/'},
            {'@type': 'ListItem', 'position': 3, 'name': name, 'item': exam_url(e)}, {'@type': 'ListItem', 'position': 4, 'name': ch, 'item': url_}]}]
    return page(title, desc, url_, body, 3, ld)

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
    title = 'Syllabus Priority: Which Maths Chapters Are Asked Most in JEE | अंक-IT'
    desc = f'Chapter-wise priority for JEE Maths: how many JEE Main and JEE Advanced questions each chapter has had from {Y0} to {Y1}, its share, rank and yearly trend.'
    crumbs = '<a href="../#/home">Home</a> &rsaquo; <span aria-current="page">Syllabus priority</span>'
    main = f"""<p class="pg-lead">{len(CH)} chapters · {TM:,} JEE Main and {TA} JEE Advanced questions, {Y0}–{Y1}</p>
<p>Use this to decide what to study first. Each chapter is ranked by the number of previous-year questions it has had in JEE Main and in JEE Advanced, with its share of all questions and its yearly trend. The same view is inside the dashboard.</p>
<h2>Chapters by priority</h2>
<div class="pg-table"><table class="prio"><thead><tr><th scope="col">Chapter</th><th scope="col" class="num">Main Qs</th><th scope="col" class="num">Share</th><th scope="col" class="num">Rank</th><th scope="col" class="num">Adv. Qs</th><th scope="col" class="num">Share</th><th scope="col" class="num">Rank</th><th scope="col">Leans</th><th scope="col">Trend</th></tr></thead><tbody>{rows}</tbody></table></div>
<p class="pg-fine">Trend lines show questions per year as a share of each exam's total (blue: JEE Main, orange: JEE Advanced). Importance tiers: JEE Main {tm[0]}+ questions is High and {tm[1]}+ is Medium; JEE Advanced {ta[0]}+ is High and {ta[1]}+ is Medium; anything lower is Low.</p>
<h2>The 20 most-asked subtopics</h2>
<div class="pg-table"><table><thead><tr><th scope="col">Subtopic</th><th scope="col" class="num">Main Qs</th><th scope="col">Main</th><th scope="col" class="num">Adv. Qs</th><th scope="col">Adv.</th></tr></thead><tbody>{srows}</tbody></table></div>
{cta(1, "See the priority of every subtopic, then practise those questions with full solutions. Starting is free.")}"""
    body = band(crumbs, "Syllabus priority") + '\n' + grid(main, 1)
    ld = [{'@context': 'https://schema.org', '@type': 'WebPage', 'name': 'Syllabus priority', 'url': f'{SITE}/syllabus-priority/', 'description': desc, 'inLanguage': 'en-IN',
           'isPartOf': {'@type': 'WebSite', 'name': 'अंक-IT Mathematics Dashboard', 'url': SITE + '/'}}]
    return page(title, desc, f'{SITE}/syllabus-priority/', body, 1, ld)

def redirect_page(to, depth):
    return (f'<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Moved</title><meta name="robots" content="noindex">'
            f'<link rel="canonical" href="{SITE}/{to}"><meta http-equiv="refresh" content="0; url={"../" * depth}{to}"></head>'
            f'<body><p>This page moved to <a href="{"../" * depth}{to}">{SITE}/{to}</a>.</p></body></html>\n')

def exams_hub():
    total = sum(STATS[e[0]]['questions'] for e in EXAMS)
    title = 'Exams: JEE Main, JEE Advanced, KCET, NDA, IAT Maths Papers | अंक-IT'
    desc = f'Compare JEE Main, JEE Advanced, IIT-JEE, AIEEE, KCET, NDA and IAT: who conducts each exam, what it is for, the mode, and {total:,} previous-year maths questions in the bank.'
    rows = ''.join(f'<tr><td class="exn">{exlogo(e, "../", 38)}<a href="{e[2]}/">{E(e[1])}</a></td><td>{E(SHORT[e[0]][0])}</td><td>{E(SHORT[e[0]][1])}</td><td>{E(SHORT[e[0]][2])}</td>'
                   f'<td class="num">{STATS[e[0]]["questions"]:,}</td><td>{STATS[e[0]]["first"]}–{STATS[e[0]]["last"]}</td></tr>' for e in EXAMS)
    cards = ''.join(f'<li><a href="{e[2]}/">{E(e[1])}</a><span>{E(e[3])}</span><span>{E(exam_meta(e))}</span></li>' for e in EXAMS)
    crumbs = '<a href="../#/home">Home</a> &rsaquo; <span aria-current="page">Exams</span>'
    main = f"""<p class="pg-lead">{len(EXAMS)} exams · {total:,} previous-year maths questions</p>
<p>Every previous-year maths question in the bank, grouped by exam. The table compares the exams at a glance. Open an exam for its details and its questions by chapter and by year.</p>
<h2>Exams compared</h2>
<div class="pg-table"><table class="wide"><thead><tr><th scope="col">Exam</th><th scope="col">Conducted by</th><th scope="col">For admission to</th><th scope="col">Mode</th><th scope="col" class="num">Questions</th><th scope="col">Years</th></tr></thead><tbody>{rows}</tbody></table></div>
<p class="pg-fine">Exam patterns change from year to year. Always check the official notification for the latest rules and dates.</p>
<h2>Open an exam</h2>
<ul class="pg-chlist exam-list">{cards}</ul>
{cta(1, "Pick an exam, open its papers shift by shift and practise with full solutions. Starting is free.")}"""
    body = band(crumbs, "Exams we cover") + '\n' + grid(main, 1)
    ld = [{'@context': 'https://schema.org', '@type': 'ItemList', 'name': 'Exams', 'itemListElement': [
            {'@type': 'ListItem', 'position': k + 1, 'name': e[1], 'url': exam_url(e)} for k, e in enumerate(EXAMS)]}]
    return page(title, desc, f'{SITE}/exams/', body, 1, ld)

# ---------- About, Contact, Privacy, Terms ----------
def info_page(slug_, title, h1, desc, inner, ptype='WebPage'):
    crumbs = f'<a href="../#/home">Home</a> &rsaquo; <span aria-current="page">{E(h1)}</span>'
    body = band(crumbs, E(h1)) + '\n' + grid(inner, 1, cls_='pg-text')
    canon = f'{SITE}/{slug_}/'
    ld = [{'@context': 'https://schema.org', '@type': ptype, 'name': h1, 'url': canon, 'description': desc, 'inLanguage': 'en-IN',
           'isPartOf': {'@type': 'WebSite', 'name': 'अंक-IT Mathematics Dashboard', 'url': SITE + '/'}}]
    return page(title, desc, canon, body, 1, ld)

MAIL = f'<a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>'

def about_page():
    inner = f'''<p class="pg-lead">JEE Maths practice for Class 11 and 12 students, and the teachers who coach them.</p>
<h2>What we do</h2>
<p>अंक-IT Mathematics Dashboard is a practice platform for JEE Maths. It brings a chapter-wise question bank with solutions, previous-year papers, daily practice problems (DPPs), Must Solve lists, revision handouts and NTA-style online tests into one place, for JEE Main, JEE Advanced, KCET, NDA and IAT preparation.</p>
<h2>Who built it</h2>
<p>The dashboard is built and maintained by Ankit Kamboj, a maths teacher, so that students can practise the questions that matter for each chapter and teachers can set tests and see results without extra tools.</p>
<h2>How it works</h2>
<ul><li><b>Practise by chapter:</b> filter questions by chapter, topic, level, exam and year, and see the solution.</li>
<li><b>Take tests:</b> an exam-like screen with a timer, a question panel, mark for review and auto-submit, followed by a report with your score, accuracy and rank.</li>
<li><b>Teachers:</b> build a test from the question bank, share one link with a class and see every student\'s result.</li></ul>
<h2>Free and Premium</h2>
<p>You can start free by signing in with Google. Premium (₹299 a year for students, ₹599 for teachers) adds PDF downloads and printing, all-India ranks, comparison with all students and handouts. Students of Avanti Fellows get Premium free.</p>
<h2>Get in touch</h2>
<p>Questions, corrections or ideas are welcome. See the <a href="../contact/">contact page</a>.</p>
<p><a class="sb sb-pri" href="../">Go to the dashboard</a></p>'''
    return info_page('about', 'About Us | अंक-IT Mathematics Dashboard', 'About us', 'About अंक-IT Mathematics Dashboard: JEE Maths question bank, previous-year papers, DPPs, handouts and online tests for Class 11 and 12, built by Ankit Kamboj.', inner, 'AboutPage')

def contact_page():
    inner = f'''<p class="pg-lead">We read every message about the dashboard.</p>
<h2>Email</h2>
<p>{MAIL}</p>
<p>Please tell us your name, the email or Student ID you sign in with, and what happened. A screenshot helps for problems with a page or a test.</p>
<h2>What to write to us about</h2>
<ul><li>Trouble signing in, or a problem with your account or Premium membership.</li>
<li>A mistake in a question, answer or solution (include the question number or ID).</li>
<li>Payment problems: include the date and the payment reference you received from Razorpay.</li>
<li>Teachers: school approval, adding students, or help creating a test.</li>
<li>Requests about your personal data. See the <a href="../privacy/">privacy policy</a>.</li></ul>
<h2>Help in the login window</h2>
<p>The Login window also has a <b>Help &amp; Support</b> button with the same contact details.</p>
<p><a class="sb sb-pri" href="../">Go to the dashboard</a></p>'''
    return info_page('contact', 'Contact Us | अंक-IT Mathematics Dashboard', 'Contact us', 'Contact अंक-IT Mathematics Dashboard for help with sign-in, Premium, payments, corrections to questions or your personal data.', inner, 'ContactPage')

def privacy_page():
    inner = f'''<p class="pg-lead">Last updated: {UPDATED}</p>
<p>This policy explains what information अंक-IT Mathematics Dashboard (“we”, “the website”) collects, why, and the choices you have. It applies to this website and the services behind it.</p>
<h2>Information we collect</h2>
<ul>
<li><b>Account details:</b> your name and email from Google sign-in, or your Student ID if you are an Avanti student, and whether you are a teacher or a student.</li>
<li><b>Profile details:</b> school, class, stream, batch, category and gender, where you or your school give them. Teachers add these for their students.</li>
<li><b>Practice and test data:</b> the tests you attempt, your answers, scores, time taken, ranks and reports, and worksheets that teachers save.</li>
<li><b>Payment records:</b> for Premium, the order and payment reference, the amount and the status. Card, UPI and bank details are entered on Razorpay’s payment window and are never seen or stored by us.</li>
<li><b>Chat messages:</b> messages that teachers post in the teachers’ chat.</li>
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
    return info_page('privacy', 'Privacy Policy | अंक-IT Mathematics Dashboard', 'Privacy policy', 'How अंक-IT Mathematics Dashboard collects, uses and protects your information, including sign-in, test results and payments.', inner)

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
<li>If you were charged by mistake or something went wrong with a payment, <a href="../contact/">contact us</a> and we will look into it.</li></ul>
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
    return info_page('terms', 'Terms of Use | अंक-IT Mathematics Dashboard', 'Terms of use', 'Terms of use for अंक-IT Mathematics Dashboard: accounts, Free and Premium plans, payments, content and acceptable use.', inner)

FAQ = [
 ('Is the Mathematics Dashboard free?', 'Yes, you can start free. Sign in with Google to use the question bank with solutions, online tests and your reports. Premium adds PDF downloads and printing, all-India ranks, comparison with all students and handouts.'),
 ('Who is it for?', 'Students of Class 11, Class 12 and droppers preparing JEE Maths (JEE Main and JEE Advanced), and also KCET, NDA, IAT and similar exams. Teachers can use it to make tests and track their students.'),
 ('How much does Premium cost?', 'Premium is ₹299 a year for students and ₹599 a year for teachers. Avanti students get Premium free.'),
 ('What is in the question bank?', 'JEE Maths questions filtered by chapter, topic, level, exam and year, with solutions, plus previous-year papers, daily practice problems (DPPs), Must Solve lists and revision handouts.'),
 ('How do I sign in?', 'Use your Google account. Avanti students can sign in with their Student ID instead. You choose Student or Teacher the first time.'),
 ('Can teachers create tests?', 'Yes. Teachers whose school has been approved can build an online test from the question bank, share one link with their students and see results and ranks.'),
]


# ---------- the home page (goes inside index.html) ----------
def home_block():
    feats = [
     ('i-blue', svg('<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 9h4M7 12h7"/>'), 'NTA-style online tests', 'A full-screen test with timer, question panel, mark for review and auto-submit, just like the real exam.'),
     ('i-gold', svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'), 'Instant reports and ranks', 'Score, accuracy, rank in your school and all-India, topic-wise analysis and time per question.'),
     ('i-green', svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'), '15,000+ question bank', 'Filter by chapter, topic, level, exam and year. Every question comes with its answer and a full solution.'),
     ('i-purple', svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M8 7h8M8 11h6"/>'), 'Past papers 2000–2026', 'JEE Main, JEE Advanced and more, paper by paper and chapter by chapter, with answer keys.'),
     ('i-rose', svg('<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>'), 'DPPs, Must Solve and handouts', 'Daily practice sheets, hand-picked must-solve questions and handwritten revision notes for every chapter.'),
     ('i-teal', svg('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3 3 0 0 1 0 5.6M18 19a5 5 0 0 0-2.5-4.3"/>'), 'Built for teachers', 'Make a test in minutes, share one link with your class and see every student\'s result.')]
    feat_html = ''.join(f'<article class="fcard"><span class="ico {c}">{i}</span><h3>{E(t)}</h3><p>{E(d)}</p></article>' for c, i, t, d in feats)
    def frame(src, alt, first=False):
        load = 'fetchpriority="high"' if first else 'loading="lazy"'
        return (f'<div class="frame"><div class="frame-bar"><i></i><i></i><i></i><span>unkganit.com</span></div>'
                f'<img src="img/shots/{src}.webp" width="1366" height="800" alt="{E(alt)}" {load} decoding="async"></div>')
    hero_shot = (f'<div class="hero-shot">{frame("question-bank", "The अंक-IT Question Bank: filters on the left and JEE questions with answer options on the right", True)}'
                 f'<div class="mock-float"><span class="ic">{svg("<circle cx=\'11\' cy=\'11\' r=\'7\'/><path d=\'M21 21l-4.3-4.3\'/>", 22)}</span><div><small>Question Bank</small><b>16,000+ questions</b><em>with full solutions</em></div></div></div>')
    pts = ''.join(f'<li>{CHECK}{t}</li>' for t in ['Free to start', 'Questions with full solutions', 'Made for JEE Main and Advanced', 'Works on phone and laptop'])
    # ----- real dashboard screens in a swipeable carousel (script adds the arrows, tabs and dots; without it the slides still swipe/scroll) -----
    shots = [('question-bank', 'Question Bank', 'Find any question in seconds', 'Filter 16,000+ questions by class, source, exam, year, chapter, level and type. Every question comes with its answer and a full solution.', 'The Question Bank with filters and JEE questions'),
             ('dpp-builder', 'DPP Builder', 'A ready-to-print DPP in one click', 'Pick chapters and subtopics, set the toughness and the mix of previous-year and practice questions, and get a clean practice sheet with answer key and explanations.', 'A generated DPP on definite integration, ready to print'),
             ('pyq-papers', 'PYQ Papers', 'Every paper, in exam format', 'Open any JEE Main shift or other past paper exactly as it was set, or go chapterwise through all years. Download with the answer key.', 'A JEE Main 2026 shift paper opened in the dashboard'),
             ('must-solve', 'Must Solve', 'Solve the questions that matter most', 'Questions that came again and again in JEE, in the same or a very similar form, plus sure-shot questions that are bound to come. Solve these first.', 'The Must Solve list showing sure-shot and must-know questions'),
             ('handouts', 'Handouts', 'Handwritten revision notes for every chapter', 'Neatly handwritten notes for all chapters of Class 11 and 12. Read them in the built-in viewer, or download them to revise offline.', 'The Handouts page with a note for every chapter'),
             ('online-test', 'Online Test', 'The real exam screen, before the real exam', 'A full-screen, timed test with the question palette, mark for review and auto-submit, followed by your score, rank and topic-wise report.', 'The online test window with timer and question palette')]
    slides = ''.join(f'<figure class="car-slide" data-title="{E(s[1])}">{frame(s[0], s[4])}<figcaption><h3>{E(s[2])}</h3><p>{E(s[3])}</p></figcaption></figure>' for s in shots)
    showcase = ('<div class="car" data-car><div class="car-tabs" hidden></div><div class="car-view">'
                f'<div class="car-track" tabindex="0" role="region" aria-roledescription="carousel" aria-label="Screens from the dashboard">{slides}</div>'
                '<button type="button" class="car-btn car-prev" aria-label="Previous screen" hidden>&lsaquo;</button><button type="button" class="car-btn car-next" aria-label="Next screen" hidden>&rsaquo;</button></div>'
                '<div class="car-dots" hidden></div></div>')
    # ----- chapters as cards -----
    def chcard(c):
        return (f'<a class="chc" href="maths/{slug(c)}/"><span class="chc-code">{c["code"]}</span><h3>{E(short(c))}</h3>'
                f'<p>{len(c["subs"])} subtopics</p><div class="chc-st"><span><b>{c["m"]}</b> JEE Main</span><span><b>{c["a"]}</b> Advanced</span></div><i class="chc-go" aria-hidden="true">&rarr;</i></a>')
    c11 = ''.join(chcard(c) for c in CH if cls(c) == '11'); c12 = ''.join(chcard(c) for c in CH if cls(c) == '12')
    oos = ''.join(f'<div class="chc chc-oos"><span class="chc-code">{code}</span><h3>{E(n)}</h3><p>Out of syllabus</p></div>' for code, n in OOS)
    # ----- exams -----
    exam_cards = ''.join(f'<a class="exc" href="exams/{e[2]}/"><div class="exc-top">{exlogo(e, "", 52)}<h3>{E(e[1])}</h3></div><p>{E(e[3])}</p><dl class="exc-facts"><div><dt>Conducted by</dt><dd>{E(SHORT[e[0]][0])}</dd></div><div><dt>Mode</dt><dd>{E(SHORT[e[0]][2])}</dd></div></dl><div class="exc-st"><span><b>{STATS[e[0]]["questions"]:,}</b> questions</span><span><b>{STATS[e[0]]["first"]}–{STATS[e[0]]["last"]}</b></span><span><b>{STATS[e[0]]["papers"]}</b> papers</span></div></a>' for e in EXAMS)
    steps = [('Create your free account', 'Click Login, choose Student or Teacher and continue with Google. Avanti students use their Student ID.'),
             ('Practise chapter by chapter', 'Open the question bank, DPPs, previous-year papers and Must Solve. Check every answer against the full solution.'),
             ('Take tests and track progress', 'Attempt NTA-style tests, see your score, rank and weak topics, and come back stronger next week.')]
    steps_html = ''.join(f'<div class="step"><h3>{E(t)}</h3><p>{E(d)}</p></div>' for t, d in steps)
    tick = lambda items: ''.join(f'<li>{CHECK}<span>{E(t)}</span></li>' for t in items)
    def plan_set(cls_, free, prem, av):
        def card(p, hot=False):
            btn_cls = 'sb sb-gold' if hot else 'sb sb-line'
            tagh = '<span class="ptag">Most popular</span>' if hot else ''
            return (f'<div class="plan{" hot" if hot else ""}">{tagh}<h3>{E(p["name"])}</h3><div class="price">{p["price"]}</div><p class="for">{E(p["for"])}</p>'
                    f'<ul>{tick(p["items"])}</ul><a class="{btn_cls}" data-login href="?login=1" rel="nofollow">{E(p["cta"])}</a></div>')
        return f'<div class="plans {cls_}">{card(free)}{card(prem, True)}{card(av)}</div>'
    stu = plan_set('plans-s',
        {'name': 'Free', 'price': '&#8377;0', 'for': 'For every student', 'cta': 'Start free', 'items': ['Question bank, DPPs, PYQs and Must Solve', 'Solutions for practice', 'Online tests and your own reports', 'First Class 11 and Class 12 handouts to view']},
        {'name': 'Premium', 'price': '&#8377;299 <small>a year</small>', 'for': 'For students who want it all', 'cta': 'Get Premium', 'items': ['Everything in Free', 'PDF downloads and printing', 'All handouts', 'All-India ranks and comparison with all students']},
        {'name': 'Avanti', 'price': 'Free <small>with Avanti</small>', 'for': 'For Avanti students', 'cta': 'Login with Student ID', 'items': ['Premium included at no cost', 'Sign in with your Student ID', 'School tests from your teacher', 'Rank in school and all-India']})
    tea = plan_set('plans-t',
        {'name': 'Free', 'price': '&#8377;0', 'for': 'For every teacher', 'cta': 'Start free', 'items': ['Question bank, DPPs, PYQs and Must Solve', 'Create online tests for your school', 'Add students one by one', 'Results of your own tests']},
        {'name': 'Premium', 'price': '&#8377;599 <small>a year</small>', 'for': 'For teachers who run a class', 'cta': 'Get Premium', 'items': ['Everything in Free', 'PDF downloads and printing', 'Saved worksheets', 'My Students with performance and test history', 'Bulk upload, CSV export and teachers\' chat']},
        {'name': 'Avanti', 'price': 'Free <small>with Avanti</small>', 'for': 'For Avanti teachers', 'cta': 'Login as a teacher', 'items': ['Full teaching tools at no cost', 'Create tests for your school', 'All handouts and PDFs', 'Student list and bulk upload']})
    plans = (f'<div class="who"><input type="radio" name="who" id="who-s" class="sr" checked><input type="radio" name="who" id="who-t" class="sr">'
             f'<div class="who-bar" role="radiogroup" aria-label="Plans for"><label for="who-s">Student</label><label for="who-t">Teacher</label></div>{stu}{tea}</div>')
    faq_html = ''.join(f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q, a in FAQ)
    rows = [('1', 92), ('2', 88), ('3', 84), ('4', 79)]
    rep = ''.join(f'<div class="report-row"><b>{r}</b><div><i style="width:{p}%"></i></div><span>{p}%</span></div>' for r, p in rows)
    return f"""<!--HOME:START (generated by .github/scripts/build_seo.py; edit that script, not this block)-->
<div id="home" class="site">
{header(0)}
<main>
<section class="hero"><div class="swrap hero-in">
<div><span class="eyebrow"><i></i>JEE · KCET · NDA · IAT Mathematics</span>
<h1>Practise JEE Maths the way the <em>exam asks it.</em></h1>
<p class="lead">A question bank with full solutions, previous-year papers, DPPs, handouts and NTA-style online tests, all in one place for Class 11 and 12.</p>
<div class="hero-cta"><a class="sb sb-gold sb-lg when-out" data-login href="?login=1" rel="nofollow">Start practising free</a><a class="sb sb-gold sb-lg when-in" data-dash href="./">Open your dashboard</a><a class="sb sb-white-line sb-lg" href="#dashboard">See the dashboard</a></div>
<ul class="hero-pts">{pts}</ul></div>
{hero_shot}
</div></section>
<section class="stats" aria-label="At a glance"><div class="swrap stats-in">
<div class="stat"><b>15,000+</b><span>Questions</span></div><div class="stat"><b>11,000+</b><span>Full solutions</span></div>
<div class="stat"><b>{len(CH)}</b><span>Chapters, {D["tot_sub"]} subtopics</span></div><div class="stat"><b>2000–2026</b><span>Past papers</span></div></div></section>
<section class="sec" id="dashboard"><div class="swrap"><div class="sec-head"><span class="kick">Inside the dashboard</span><h2>See what you get after you log in</h2><p>Real screens from the dashboard: question bank, DPP builder, past papers, Must Solve, handouts and the online test window.</p></div>{showcase}</div></section>
<section class="sec sec-alt" id="features"><div class="swrap"><div class="sec-head"><span class="kick">Everything in one place</span><h2>Everything you need to prepare for JEE Maths</h2><p>Practise, test yourself and track your progress without juggling PDFs, apps and notebooks.</p></div>
<div class="grid3">{feat_html}</div></div></section>
<section class="sec" id="how"><div class="swrap"><div class="sec-head"><span class="kick">How it works</span><h2>Start in three simple steps</h2></div><div class="steps">{steps_html}</div></div></section>
<section class="sec sec-alt" id="chapters"><div class="swrap"><div class="sec-head"><span class="kick">Syllabus</span><h2>Every maths chapter, covered</h2><p>{len(CH)} chapters and {D["tot_sub"]} subtopics, with the number of JEE Main and JEE Advanced questions asked from each. Open a chapter to see its subtopics.</p></div>
<h3 class="chc-h">Class 11 <small>{sum(1 for c in CH if cls(c) == "11")} chapters</small></h3><div class="chc-grid">{c11}</div>
<h3 class="chc-h">Class 12 <small>{sum(1 for c in CH if cls(c) == "12")} chapters</small></h3><div class="chc-grid">{c12}</div>
<h3 class="chc-h">Out of syllabus <small>no longer in the current JEE syllabus, but still in the question bank</small></h3><div class="chc-grid">{oos}</div>
<p class="chp-note"><a class="sb sb-line" href="maths/">See all chapters with question counts</a></p></div></section>
<section class="sec" id="exams"><div class="swrap"><div class="sec-head"><span class="kick">Exams</span><h2>Built for the exams you are preparing for</h2><p>{sum(STATS[e[0]]["questions"] for e in EXAMS):,} previous-year maths questions, paper by paper. Open an exam to see its questions by chapter and year.</p></div><div class="exc-grid">{exam_cards}</div></div></section>
<section class="sec sec-alt" id="teachers"><div class="swrap split"><div><span class="kick">For teachers</span><h2>Set a test in minutes. See every result.</h2><p>Build an online test from the question bank, share one link with your class and get a ranked report the moment students finish.</p>
<ul class="ticks">{tick(['Create tests from DPPs, PYQs or your own selection', 'One link for the whole class, with an exam window', 'Ranks, averages and question-wise analysis', 'Student list and bulk upload for your school'])}</ul>
<a class="sb sb-pri when-out" data-login href="?login=1" rel="nofollow">Login as a teacher</a><a class="sb sb-pri when-in" data-dash href="./">Open your dashboard</a></div>
<div class="report" aria-hidden="true"><h4>Class result · Mock Test 3</h4><small>Top scorers · example</small>{rep}</div></div></section>
<section class="sec" id="plans"><div class="swrap"><div class="sec-head"><span class="kick">Plans</span><h2>Start free. Upgrade when you are ready.</h2><p>Premium is a one-year membership. Avanti students and teachers get it free.</p></div>{plans}</div></section>
<section class="sec sec-alt" id="faq"><div class="swrap"><div class="sec-head"><span class="kick">FAQ</span><h2>Frequently asked questions</h2></div><div class="faq">{faq_html}</div></div></section>
<section class="cta"><h2>Ready to practise smarter?</h2><p>Create your free account and start with any chapter today.</p><a class="sb sb-gold sb-lg when-out" data-login href="?login=1" rel="nofollow">Login or register</a><a class="sb sb-gold sb-lg when-in" data-dash href="./">Open your dashboard</a></section>
</main>
{footer(0)}
<noscript><p class="ns">Signing in needs JavaScript. Please turn it on in your browser.</p></noscript>
</div>
<!--HOME:END-->"""

def sitemap():
    urls = [(SITE + '/', '1.0'), (SITE + '/maths/', '0.9'), (SITE + '/syllabus-priority/', '0.8')] + [(url(c), '0.8') for c in CH] + [(SITE + '/exams/', '0.9')] + [(exam_url(e), '0.8') for e in EXAMS] + [(f'{SITE}/exams/{e[2]}/{ANY_SLUG[c]}/', '0.6') for e in EXAMS for c in STATS[e[0]]['chapters']] + [(f'{SITE}/{p}/', '0.3') for p in ('about', 'contact', 'privacy', 'terms')]
    body = ''.join(f'<url><loc>{u}</loc><lastmod>{TODAY}</lastmod><priority>{p}</priority></url>\n' for u, p in urls)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}</urlset>\n'

def write(path, text):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    open(path, 'w', encoding='utf-8').write(text)

def main():
    for i, c in enumerate(CH):
        write(f'maths/{slug(c)}/index.html', chapter_page(i, c))
        write(f'jee-maths/{slug(c)}/index.html', redirect_page(f'maths/{slug(c)}/', 2))   # the old address keeps working
    write('maths/index.html', hub_page()); write('jee-maths/index.html', redirect_page('maths/', 1))
    write('syllabus-priority/index.html', priority_page())
    write('exams/index.html', exams_hub())
    for e in EXAMS:
        write(f'exams/{e[2]}/index.html', exam_page(e))
        for code in STATS[e[0]]['chapters']: write(f'exams/{e[2]}/{ANY_SLUG[code]}/index.html', exam_chapter_page(e, code))
    for slug_, fn in (('about', about_page), ('contact', contact_page), ('privacy', privacy_page), ('terms', terms_page)): write(f'{slug_}/index.html', fn())
    write('sitemap.xml', sitemap())
    write('robots.txt', f'User-agent: *\nAllow: /\nDisallow: /qb/\n\nSitemap: {SITE}/sitemap.xml\n')
    s = open('index.html', encoding='utf-8').read()
    blk = home_block()
    assert '<!--HOME:START' in s, 'index.html has no HOME markers'
    s = re.sub(r'<!--HOME:START.*?<!--HOME:END-->', lambda m: blk, s, flags=re.S)
    write('index.html', s)
    print('built', len(CH), 'chapter pages +', len(EXAMS), 'exam pages + hubs + about/contact/privacy/terms + sitemap + robots + home in index.html')

if __name__ == '__main__':
    main()
