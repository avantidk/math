#!/usr/bin/env python3
"""Turns an exam guide PDF (the 'Complete <Exam> Exam Guide' files) into .github/scripts/exam-guides.json, which build_seo.py renders
   as /exams/<exam>/about/. Usage:  python3 .github/scripts/guides_from_pdf.py <exam-slug> <file.pdf> [<exam-slug> <file.pdf> ...]
   Needs pdfplumber. Headings are recognised by font size: 20 = title, 13.5 = section, 11 bold = sub-section, 10.5 = text, 8.5 = page footer (dropped).
   The text comes only from the PDFs the owner supplied; no questions or answers are read."""
import json, os, re, sys, logging
logging.disable(logging.CRITICAL)
import pdfplumber
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'exam-guides.json')

def clean(t):
    t = re.sub(r'\s+', ' ', (t or '').replace('\u00a0', ' ')).strip()
    return re.sub(r' ([,.;:])', r'\1', t)

def cell(t):
    t = (t or '').replace(' ', ' ')
    parts = [clean(x) for x in re.split(r'\s*•\s*', t) if clean(x)]
    if '•' in t and len(parts) > 1: return {'list': parts}
    return clean(t)

def extract(path):
    items = []
    with pdfplumber.open(path) as pdf:
        for pg in pdf.pages:
            tabs = pg.find_tables(); boxes = [t.bbox for t in tabs]
            for t in tabs: items.append((pg.page_number, t.bbox[1], 't', [[cell(c) for c in row] for row in t.extract()]))
            lines = {}
            for w in pg.extract_words(extra_attrs=['size', 'fontname']):
                if any(b[0] - 1 <= w['x0'] and w['x1'] <= b[2] + 1 and b[1] - 1 <= w['top'] and w['bottom'] <= b[3] + 1 for b in boxes): continue
                lines.setdefault(round(w['top'] / 3), []).append(w)
            for ws in lines.values():
                ws.sort(key=lambda w: w['x0'])
                items.append((pg.page_number, ws[0]['top'], 'l', (' '.join(w['text'] for w in ws), max(w['size'] for w in ws), all('Bold' in w['fontname'] for w in ws))))
    items.sort(key=lambda x: (x[0], x[1]))
    doc = {'kicker': '', 'title': '', 'sections': []}; sec = sub = None; para = []
    def flush():
        nonlocal para
        if para and sec is not None:
            (sub or sec)['blocks'].append({'p': clean(' '.join(para))})
        para = []
    for _, _, k, v in items:
        if k == 't':
            flush(); (sub or sec)['blocks'].append({'table': v}) if sec is not None else None; continue
        txt, size, bold = v; txt = clean(txt)
        if size < 9.2 and (re.search(r'Page \d+ of \d+', txt) or size < 9): continue
        if size >= 19: doc['title'] = txt; continue
        if size >= 13:
            if sec is None and para: doc['intro'] = clean(' '.join(para)); para = []
            flush(); sec = {'h': re.sub(r'^\d+\.\s*', '', txt), 'blocks': [], 'subs': []}; sub = None; doc['sections'].append(sec); continue
        if size >= 10.8 and bold and sec is not None: flush(); sub = {'h': re.sub(r'^[A-Z]\.\s*', '', txt), 'blocks': []}; sec['subs'].append(sub); continue
        if sec is None:
            if size < 10: doc['kicker'] = txt
            else: para.append(txt)
            continue
        para.append(txt)
    flush()
    doc.setdefault('intro', '')
    return doc

def main():
    a = sys.argv[1:]
    if not a or len(a) % 2: sys.exit(__doc__)
    data = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else {}
    for slug, pdf in zip(a[::2], a[1::2]):
        data[slug] = extract(pdf)
    json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
    print({k: (len(v['sections']), sum(len(s['subs']) for s in v['sections'])) for k, v in data.items()})
main()
