#!/usr/bin/env python3
"""Builds the public, search-engine-readable pages from syllabus.json (public data only):
   the home page (inside index.html), jee-maths/index.html, jee-maths/<chapter>/index.html, about/, contact/, privacy/, terms/,
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
def url(c): return f"{SITE}/jee-maths/{slug(c)}/"
def short(c): return c['name']
LEVEL = {'High': 'High', 'Medium': 'Medium', 'Low': 'Low', 'None': 'Rare'}

def svg(d, w=24, extra=''):
    return f'<svg viewBox="0 0 24 24" width="{w}" height="{w}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"{extra}>{d}</svg>'
CHECK = svg('<path d="M20 6 9 17l-5-5"/>', 20)

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
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; base-uri 'self'; form-action 'none'">
<title>{E(title)}</title>
{head(title, desc, canon, depth, jsonld, og_title)}<meta name="theme-color" content="#0c1a3d">
<link rel="icon" type="image/png" sizes="32x32" href="{up}img/icon/icon-32.png?v={VER}">
<link rel="apple-touch-icon" sizes="180x180" href="{up}img/icon/icon-180.png?v={VER}">
<link rel="preload" href="{up}vendor/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{up}site.css?v={VER}">
<script src="{up}site.js?v={VER}"></script>
</head>
<body class="pg">
{header(depth)}
{body}
{footer(depth)}
</body>
</html>
'''

def header(depth):
    up = '../' * depth
    home = up + '#/home' if depth else '#/home'
    a = lambda frag: (up + frag) if depth else frag
    links = [('Features', 'features'), ('How it works', 'how'), ('Chapters', 'chapters'), ('Plans', 'plans'), ('FAQ', 'faq')]
    nav = ''.join(f'<a href="{a("#" + f)}">{t}</a>' for t, f in links)
    login = f'<a class="sb sb-pri when-out" data-login href="{up}?login=1" rel="nofollow">Login</a>' if depth else '<a class="sb sb-pri when-out" data-login href="?login=1" rel="nofollow">Login</a>'
    dash = f'<a class="sb sb-line when-in" data-dash href="{up or "./"}">Dashboard</a>'
    prof = f'<a class="sh-av when-in" data-av data-profile href="{a("#/profile")}" aria-label="Your profile">&nbsp;</a>'
    burger = svg('<path d="M4 7h16M4 12h16M4 17h16"/>', 22)
    return f'''<header class="sh"><div class="swrap sh-in">
<a class="sh-logo" href="{home}" aria-label="अंक-IT Mathematics Dashboard, home"><img src="{up}img/ankit-logo-sm.png?v={VER}" alt="अंक-IT Mathematics" width="139" height="52"></a>
<nav class="sh-nav" aria-label="Main">{nav}</nav>
<div class="sh-end">{login}{dash}{prof}
<details class="sh-menu"><summary aria-label="Menu">{burger}</summary><nav aria-label="Menu">{nav}<a href="{up}jee-maths/">All JEE Maths chapters</a></nav></details></div>
</div></header>'''

def footer(depth):
    up = '../' * depth
    a = lambda frag: (up + frag) if depth else frag
    return f'''<footer class="sf"><div class="swrap">
<div class="sf-grid">
<div><img src="{up}img/ankit-logo-dark-sm.png?v={VER}" alt="अंक-IT Mathematics" width="139" height="52"><p>JEE Maths practice for Class 11 and 12: question bank, previous-year papers, DPPs, handouts and online tests.</p></div>
<div><h4>Explore</h4><ul><li><a href="{up}jee-maths/">JEE Maths chapters</a></li><li><a href="{a("#features")}">Features</a></li><li><a href="{a("#plans")}">Plans</a></li><li><a href="{a("#faq")}">FAQ</a></li></ul></div>
<div><h4>Company</h4><ul><li><a href="{up}about/">About us</a></li><li><a href="{up}contact/">Contact us</a></li></ul></div>
<div><h4>Legal</h4><ul><li><a href="{up}privacy/">Privacy policy</a></li><li><a href="{up}terms/">Terms of use</a></li></ul></div>
</div>
<div class="sf-base"><span>&copy; 2026 अंक-IT Mathematics Dashboard</span><span>JEE Main · JEE Advanced · KCET · NDA · IAT</span></div>
</div></footer>'''

def band(crumbs, h1):
    return f'<section class="pg-hero"><div class="swrap"><nav class="pg-crumbs" aria-label="Breadcrumb">{crumbs}</nav><h1>{h1}</h1></div></section>'

def cta(depth, text):
    up = '../' * depth
    return f'''<section class="pg-signin"><h2>Practise this free</h2><p>{E(text)}</p><p class="pg-ctas"><a class="sb sb-gold sb-lg when-out" data-login href="{up}?login=1" rel="nofollow">Login or register</a><a class="sb sb-gold sb-lg when-in" href="{up}">Open your dashboard</a></p><p class="pg-fine">Sign in with Google, or with your Student ID if you are an Avanti student. Starting is free.</p></section>'''

# ---------- chapter pages ----------
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
    top = [s for s in sorted(c['subs'], key=lambda s: -(s['m'] + s['a']))[:3] if s['m'] + s['a'] > 0]
    focus = ''
    if top:
        focus = '<p>Most-tested subtopics in our previous-year data: ' + ', '.join(f'<b>{E(s["name"])}</b> ({s["m"]} Main, {s["a"]} Advanced)' for s in top) + '.</p>'
    links = ''
    if prev: links += f'<a class="pg-prev" href="../{slug(prev)}/">&larr; {E(short(prev))}</a>'
    if nxt: links += f'<a class="pg-next" href="../{slug(nxt)}/">{E(short(nxt))} &rarr;</a>'
    crumbs = f'<a href="../../#/home">Home</a> &rsaquo; <a href="../">JEE Maths</a> &rsaquo; <span aria-current="page">{E(name)}</span>'
    body = f'''{band(crumbs, "JEE Maths: " + E(name))}
<main class="swrap pg-main">
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
</main>'''
    ld = [{'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'JEE Maths', 'item': SITE + '/jee-maths/'},
            {'@type': 'ListItem', 'position': 3, 'name': name, 'item': url(c)}]},
          {'@context': 'https://schema.org', '@type': 'WebPage', 'name': f'JEE Maths {name}', 'description': desc, 'url': url(c),
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
    title = 'JEE Maths Chapters: Class 11 & 12 Syllabus, PYQs & Practice | अंक-IT'
    desc = (f'All {len(CH)} JEE Maths chapters and {D["tot_sub"]} subtopics for Class 11 and 12, with previous-year question counts for JEE Main and '
            f'JEE Advanced ({Y0}–{Y1}). Practise free on अंक-IT.')
    crumbs = '<a href="../#/home">Home</a> &rsaquo; <span aria-current="page">JEE Maths</span>'
    body = f'''{band(crumbs, "JEE Maths: all chapters")}
<main class="swrap pg-main">
<p class="pg-lead">{len(CH)} chapters in the syllabus · {D["tot_sub"]} subtopics · plus {len(OOS)} out-of-syllabus chapters</p>
<p>The JEE Maths syllabus split into chapters and subtopics. Open a chapter to see its subtopics, how often each one was asked in JEE Main and JEE Advanced, and the year-wise trend, then sign in to practise the questions with full solutions.</p>
{chapter_list('', True)}
{cta(1, "Choose a chapter, practise previous-year questions with solutions, and take online tests. Starting is free.")}
</main>'''
    ld = [{'@context': 'https://schema.org', '@type': 'ItemList', 'name': 'JEE Maths chapters', 'itemListElement': [
            {'@type': 'ListItem', 'position': k + 1, 'name': short(c), 'url': url(c)} for k, c in enumerate(CH)]}]
    return page(title, desc, f'{SITE}/jee-maths/', body, 1, ld)

# ---------- About, Contact, Privacy, Terms ----------
def info_page(slug_, title, h1, desc, inner, ptype='WebPage'):
    crumbs = f'<a href="../#/home">Home</a> &rsaquo; <span aria-current="page">{E(h1)}</span>'
    body = f'''{band(crumbs, E(h1))}
<main class="swrap pg-main pg-text">
{inner}
</main>'''
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
     ('i-purple', svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M8 7h8M8 11h6"/>'), 'Past papers 1978–2026', 'JEE Main, JEE Advanced and more, paper by paper and chapter by chapter, with answer keys.'),
     ('i-rose', svg('<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>'), 'DPPs, Must Solve and handouts', 'Daily practice sheets, hand-picked must-solve questions and handwritten revision notes for every chapter.'),
     ('i-teal', svg('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3 3 0 0 1 0 5.6M18 19a5 5 0 0 0-2.5-4.3"/>'), 'Built for teachers', 'Make a test in minutes, share one link with your class and see every student\'s result.')]
    feat_html = ''.join(f'<article class="fcard"><span class="ico {c}">{i}</span><h3>{E(t)}</h3><p>{E(d)}</p></article>' for c, i, t, d in feats)
    pal = ['a', 'a', 'n', 'a', 'm', 'a', 'v', 'a', 'n', 'a', 'a', 'm', 'a', 'v', 'v', 'a', 'n', 'v', 'v', 'v']
    mock = f'''<div class="mock" aria-hidden="true"><div class="mock-win"><div class="mock-bar"><i></i><i></i><i></i><span>JEE Main Mock Test · Mathematics</span><b>01:42:18</b></div>
<div class="mock-body"><div class="mock-q"><h4><span>Question 13</span><span>+4 / −1</span></h4><p>The value of <span class="m">&int;<sub>0</sub><sup>&pi;/2</sup> sin<sup>2</sup>x dx</span> is</p>
<div class="mock-opts"><div class="mock-opt"><b>A</b>&pi;/2</div><div class="mock-opt on"><b>B</b>&pi;/4</div><div class="mock-opt"><b>C</b>&pi;</div><div class="mock-opt"><b>D</b>1</div></div>
<div class="mock-btns"><span class="a">Mark for review</span><span class="b">Save &amp; next</span></div></div>
<div class="mock-pal">{''.join(f'<span class="p-{k}">{n + 1}</span>' for n, k in enumerate(pal))}</div></div></div>
<div class="mock-float"><span class="ic">{svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', 22)}</span><div><small>Report ready · example</small><b>Score 248 / 300</b><em>Rank 3 in school · 41 all-India</em></div></div></div>'''
    pts = ''.join(f'<li>{CHECK}{t}</li>' for t in ['Free to start', 'Questions with full solutions', 'Made for JEE Main and Advanced', 'Works on phone and laptop'])
    c11 = ''.join(f'<li><a class="pchip" href="jee-maths/{slug(c)}/">{E(short(c))}</a></li>' for c in CH if cls(c) == '11')
    c12 = ''.join(f'<li><a class="pchip" href="jee-maths/{slug(c)}/">{E(short(c))}</a></li>' for c in CH if cls(c) == '12')
    oos = ''.join(f'<li><span class="pchip oos">{E(n)}</span></li>' for _, n in OOS)
    steps = [('Create your free account', 'Click Login, choose Student or Teacher and continue with Google. Avanti students use their Student ID.'),
             ('Practise chapter by chapter', 'Open the question bank, DPPs, previous-year papers and Must Solve. Check every answer against the full solution.'),
             ('Take tests and track progress', 'Attempt NTA-style tests, see your score, rank and weak topics, and come back stronger next week.')]
    steps_html = ''.join(f'<div class="step"><h3>{E(t)}</h3><p>{E(d)}</p></div>' for t, d in steps)
    tick = lambda items: ''.join(f'<li>{CHECK}<span>{E(t)}</span></li>' for t in items)
    plans = f'''<div class="plans">
<div class="plan"><h3>Free</h3><div class="price">&#8377;0</div><p class="for">For every student and teacher</p><ul>{tick(['Question bank, DPPs, PYQs and Must Solve', 'Solutions for practice', 'Online tests and your own reports', 'First Class 11 and Class 12 handouts to view'])}</ul><a class="sb sb-line" data-login href="?login=1" rel="nofollow">Start free</a></div>
<div class="plan hot"><span class="ptag">Most popular</span><h3>Premium</h3><div class="price">&#8377;299 <small>a year, students</small></div><p class="for">&#8377;599 a year for teachers</p><ul>{tick(['Everything in Free', 'PDF downloads and printing', 'All handouts', 'All-India ranks and comparison with all students', 'Teachers: student list, bulk upload, saved worksheets'])}</ul><a class="sb sb-gold" data-login href="?login=1" rel="nofollow">Get started</a></div>
<div class="plan"><h3>Avanti</h3><div class="price">Free <small>with Avanti</small></div><p class="for">For Avanti students and teachers</p><ul>{tick(['Premium included at no cost', 'Sign in with your Student ID', 'School tests from your teacher', 'Rank in school and all-India'])}</ul><a class="sb sb-line" data-login href="?login=1" rel="nofollow">Login with Student ID</a></div></div>'''
    faq_html = ''.join(f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q, a in FAQ)
    rows = [('1', 'Prakhar', 92), ('2', 'Ananya', 88), ('3', 'Rohan', 84), ('4', 'Meera', 79)]
    rep = ''.join(f'<div class="report-row"><b>{r}</b><div><i style="width:{p}%"></i></div><span>{p}%</span></div>' for r, _, p in rows)
    return f'''<!--HOME:START (generated by .github/scripts/build_seo.py; edit that script, not this block)-->
<div id="home" class="site">
{header(0)}
<main>
<section class="hero"><div class="swrap hero-in">
<div><span class="eyebrow"><i></i>JEE · KCET · NDA · IAT Mathematics</span>
<h1>Practise JEE Maths the way the <em>exam asks it.</em></h1>
<p class="lead">A question bank with full solutions, previous-year papers, DPPs, handouts and NTA-style online tests, all in one place for Class 11 and 12.</p>
<div class="hero-cta"><a class="sb sb-gold sb-lg when-out" data-login href="?login=1" rel="nofollow">Start practising free</a><a class="sb sb-gold sb-lg when-in" data-dash href="./">Open your dashboard</a><a class="sb sb-white-line sb-lg" href="#chapters">Explore chapters</a></div>
<ul class="hero-pts">{pts}</ul></div>
{mock}
</div></section>
<section class="stats" aria-label="At a glance"><div class="swrap stats-in">
<div class="stat"><b>15,000+</b><span>Questions</span></div><div class="stat"><b>11,000+</b><span>Full solutions</span></div>
<div class="stat"><b>{len(CH)}</b><span>Chapters, {D["tot_sub"]} subtopics</span></div><div class="stat"><b>1978–2026</b><span>Past papers</span></div></div></section>
<section class="sec" id="features"><div class="swrap"><div class="sec-head"><span class="kick">Everything in one place</span><h2>Everything you need to prepare for JEE Maths</h2><p>Practise, test yourself and track your progress without juggling PDFs, apps and notebooks.</p></div>
<div class="grid3">{feat_html}</div></div></section>
<section class="sec sec-alt" id="how"><div class="swrap"><div class="sec-head"><span class="kick">How it works</span><h2>Start in three simple steps</h2></div><div class="steps">{steps_html}</div></div></section>
<section class="sec" id="chapters"><div class="swrap"><div class="sec-head"><span class="kick">Syllabus</span><h2>Every JEE Maths chapter, covered</h2><p>{len(CH)} chapters and {D["tot_sub"]} subtopics. Open a chapter to see its subtopics and how often each one was asked in JEE Main and JEE Advanced.</p></div>
<div class="chp"><div><h3>Class 11 <small>{sum(1 for c in CH if cls(c) == "11")} chapters</small></h3><ul class="pchips">{c11}</ul></div>
<div><h3>Class 12 <small>{sum(1 for c in CH if cls(c) == "12")} chapters</small></h3><ul class="pchips">{c12}</ul></div></div>
<div class="chp cta-sp"><div class="chp-all"><h3>Out of syllabus <small>no longer in the current JEE syllabus, but still in the question bank</small></h3><ul class="pchips">{oos}</ul></div></div>
<p class="chp-note"><a class="sb sb-line" href="jee-maths/">See all chapters with question counts</a></p></div></section>
<section class="sec sec-alt"><div class="swrap"><div class="sec-head"><span class="kick">Exams</span><h2>Built for the exams you are preparing for</h2></div><div class="exams"><span>JEE Main</span><span>JEE Advanced</span><span>KCET</span><span>NDA</span><span>IAT</span><span>AIEEE</span></div></div></section>
<section class="sec" id="teachers"><div class="swrap split"><div><span class="kick">For teachers</span><h2>Set a test in minutes. See every result.</h2><p>Build an online test from the question bank, share one link with your class and get a ranked report the moment students finish.</p>
<ul class="ticks">{tick(['Create tests from DPPs, PYQs or your own selection', 'One link for the whole class, with an exam window', 'Ranks, averages and question-wise analysis', 'Student list and bulk upload for your school'])}</ul>
<a class="sb sb-pri when-out" data-login href="?login=1" rel="nofollow">Login as a teacher</a><a class="sb sb-pri when-in" data-dash href="./">Open your dashboard</a></div>
<div class="report" aria-hidden="true"><h4>Class result · Mock Test 3</h4><small>Top scorers · example</small>{rep}</div></div></section>
<section class="sec sec-alt" id="plans"><div class="swrap"><div class="sec-head"><span class="kick">Plans</span><h2>Start free. Upgrade when you are ready.</h2><p>Premium is a one-year membership. Avanti students get it free.</p></div>{plans}</div></section>
<section class="sec" id="faq"><div class="swrap"><div class="sec-head"><span class="kick">FAQ</span><h2>Frequently asked questions</h2></div><div class="faq">{faq_html}</div></div></section>
<section class="cta"><h2>Ready to practise smarter?</h2><p>Create your free account and start with any chapter today.</p><a class="sb sb-gold sb-lg when-out" data-login href="?login=1" rel="nofollow">Login or register</a><a class="sb sb-gold sb-lg when-in" data-dash href="./">Open your dashboard</a></section>
</main>
{footer(0)}
<noscript><p style="text-align:center;padding:12px;background:#fff6dc;color:#7a5200;margin:0">Signing in needs JavaScript. Please turn it on in your browser.</p></noscript>
</div>
<!--HOME:END-->'''

def sitemap():
    urls = [(SITE + '/', '1.0'), (SITE + '/jee-maths/', '0.9')] + [(url(c), '0.8') for c in CH] + [(f'{SITE}/{p}/', '0.3') for p in ('about', 'contact', 'privacy', 'terms')]
    body = ''.join(f'<url><loc>{u}</loc><lastmod>{TODAY}</lastmod><priority>{p}</priority></url>\n' for u, p in urls)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}</urlset>\n'

def write(path, text):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    open(path, 'w', encoding='utf-8').write(text)

def main():
    for i, c in enumerate(CH): write(f'jee-maths/{slug(c)}/index.html', chapter_page(i, c))
    write('jee-maths/index.html', hub_page())
    for slug_, fn in (('about', about_page), ('contact', contact_page), ('privacy', privacy_page), ('terms', terms_page)): write(f'{slug_}/index.html', fn())
    write('sitemap.xml', sitemap())
    write('robots.txt', f'User-agent: *\nAllow: /\nDisallow: /qb/\n\nSitemap: {SITE}/sitemap.xml\n')
    s = open('index.html', encoding='utf-8').read()
    blk = home_block()
    assert '<!--HOME:START' in s, 'index.html has no HOME markers'
    s = re.sub(r'<!--HOME:START.*?<!--HOME:END-->', lambda m: blk, s, flags=re.S)
    write('index.html', s)
    print('built', len(CH), 'chapter pages + hub + about/contact/privacy/terms + sitemap + robots + home in index.html')

if __name__ == '__main__':
    main()
