/* Plan permissions (set from the Supabase profile by auth.js): Free views only, Premium gets PDF and print, the admin gets
   everything (Word, PowerPoint, share, copy). The server enforces the same: the Word / PowerPoint code is sent only to the admin. */
function QBP(k) { var p = window.AvantiAuth && window.AvantiAuth.perm; return !!(p && p[k] === true); }
/* Runs the question bank's own code (written for a dashboard page) inside this page. */
(function () {
  var D = {}, calcs = [], fns = [];
  var mk = function (status, data) { data = data || []; return { status: status, data: data, columns: data[0] ? Object.keys(data[0]) : [], meta: [], message: '', refreshing: false }; };
  window.dash = {
    data: function (id) { return D[id] || mk('loading'); },
    calc: function (id, c) { calcs.push([id, c]); },
    onData: function (f) { fns.push(f); },
    colors: null, params: function () { return {}; }, setParams: function () {}, resetParams: function () {}, setLink: function () {}, refresh: function () {}, loader: function () {}
  };
  window.d3 = window.d3 || { format: function () { return function (n) { return Number(n).toLocaleString('en-US'); }; } };
  window.__qbStart = async function () {
    try { var bl = document.querySelector('.qb-build'), fv = document.getElementById('appFootVer'); if (bl) { var vt = bl.textContent.replace(/^\s*Version/i, 'Question Bank v').replace(/v\s+/, 'v').trim(); if (fv) { fv.textContent = vt; bl.style.display = 'none'; } else bl.textContent += ' \u00b7 code 509'; } } catch (e) { /* label only */ }
    var pre = window.__qbPre || {}, pd = pre.data || {};
    var get = function (n) { return pd[n] || fetch('qb/data/' + n + '.json').then(function (r) { if (!r.ok) throw new Error(n); return r.json(); }); };
    /* "Solutions status" link under the version label: popup with, for every exam and year, how many questions have a solution added, which are still missing one, and which carry a flag to check */
    /* Black Book block of the Solutions status popup: one pill per book chapter, from first.json `bb` rows [book chapter, name, questions, with solution, flagged] */
    var bbHtml = function (rows, esc, other) {
      if (!rows || !rows.length) return '';
      var tot = 0, sol = 0, flg = 0; rows.forEach(function (r) { tot += r[2]; sol += r[3]; flg += r[4]; });
      var pill = function (r, txt) { return '<a href="#" class="qb-sstat-bb" data-bb="' + r[0] + '" title="Show these questions in the Question Bank" style="border:1px solid var(--color-border-line,#ccc);border-radius:999px;padding:2px 9px;font-size:12px;color:inherit;text-decoration:underline;cursor:pointer">' + esc(txt) + '</a>'; };
      var blk = function (title, sub, arr, fmt) {
        if (!arr.length) return '';
        return '<div style="margin:12px 0 4px;font-weight:600">' + title + ' <span style="font-weight:400;color:var(--color-fg-muted)">(' + arr.length + ')</span></div><div style="color:var(--color-fg-muted);font-size:12px;margin-bottom:4px">' + sub + '</div><div style="display:flex;flex-wrap:wrap;gap:5px">' + arr.map(function (r) { return pill(r, fmt(r)); }).join('') + '</div>';
      };
      var nm = function (r) { return 'Ch ' + r[0] + ' ' + r[1]; };
      return '<hr style="margin:16px 0 10px;border:0;border-top:1px solid var(--color-border-line,#ccc)"><b style="font-size:15px">Black Book (practice questions)</b>' +
        '<div style="margin-top:6px">' + sol + ' of ' + tot + ' Black Book questions have a solution added. ' + flg + ' carry a flag to check' + (other && other.length ? ' (plus ' + other.length + ' other practice questions below)' : '') + '.</div>' +
        blk('Solutions fully added', 'Every question of this book chapter has a solution.', rows.filter(function (r) { return r[3] === r[2]; }), function (r) { return nm(r) + ' \u00b7 ' + r[2] + (r[4] ? ' (' + r[4] + ' flagged)' : ''); }) +
        blk('Partly added', 'Some questions have a solution, some do not yet.', rows.filter(function (r) { return r[3] > 0 && r[3] < r[2]; }), function (r) { return nm(r) + ' \u00b7 ' + r[3] + '/' + r[2]; }) +
        blk('Yet to add', 'No solution added so far (book chapters waiting for their Word file with solutions).', rows.filter(function (r) { return r[3] === 0; }), function (r) { return nm(r) + ' \u00b7 ' + r[2] + ' Qs'; }) +
        (other && other.length ? '<div style="margin:12px 0 4px;font-weight:600">Other practice questions with an Attention flag <span style="font-weight:400;color:var(--color-fg-muted)">(' + other.length + ')</span></div><div style="color:var(--color-fg-muted);font-size:12px;margin-bottom:4px">DPP / sheet questions outside the Black Book that need a check; no solution yet.</div><div style="display:flex;flex-wrap:wrap;gap:5px">' + other.map(function (o) { return '<span style="border:1px solid var(--color-border-line,#ccc);border-radius:999px;padding:2px 9px;font-size:12px" title="' + esc(o[2] || '') + '">' + esc(o[0]) + ' \u00b7 ' + esc(o[1]) + '</span>'; }).join('') + '</div>' : '');
    };
    try {
      var bl2 = document.querySelector('.qb-build');
      if (bl2 && !document.querySelector('.qb-sstat-link')) {
        var lk = document.createElement('a'); lk.href = '#'; lk.className = 'qb-sstat-link'; lk.textContent = 'Solutions status \u203a';
        var fl = document.getElementById('appFootLink');
        if (fl) { lk.textContent = 'Solutions status'; fl.appendChild(lk); } else { lk.style.cssText = 'display:block;font-size:11px;text-align:right;padding:2px 4px;color:var(--color-fg-muted);text-decoration:underline;cursor:pointer'; bl2.insertAdjacentElement('afterend', lk); }
        lk.addEventListener('click', function (ev) {
          ev.preventDefault();
          var ov = document.createElement('div');
          ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px';
          var bx = document.createElement('div');
          bx.style.cssText = 'background:var(--color-bg,#fff);color:var(--color-fg,#111);border:1px solid var(--color-border-line,#ccc);border-radius:10px;max-width:640px;width:100%;max-height:85vh;overflow:auto;padding:16px 18px;font-size:13px;line-height:1.45;box-sizing:border-box';
          bx.textContent = 'Loading\u2026'; ov.appendChild(bx); document.body.appendChild(ov);
          var close = function () { ov.remove(); };
          ov.addEventListener('click', function (e2) { if (e2.target === ov) close(); });
          /* the counts come ready-made in the small first.json; only an old first.json falls back to the big file */
          var bbRows = null, bbOther = null;
          Promise.resolve(pre.first).catch(function () { return null; }).then(function (fj) {
            bbRows = (fj && fj.bb) || null; bbOther = (fj && fj.fl) || null;
            if (fj && fj.st) return fj.st;
            return Promise.resolve(get('pyq')).then(function (rows) {
              var gg = {};
              rows.forEach(function (q) {
                var ex = q.exam || 'Other', yr = q.year || 'n/a', k = ex + '|' + yr;
                var o = gg[k] || (gg[k] = [ex, yr, 0, 0, 0]);
                o[2]++; if (q.solution && String(q.solution).trim()) o[3]++; if (q.attention) o[4]++;
              });
              return Object.keys(gg).map(function (k) { return gg[k]; });
            });
          }).then(function (st) {
            var g = {};
            st.forEach(function (t) { g[t[0] + '|' + t[1]] = { ex: t[0], yr: t[1], n: t[2], s: t[3], f: t[4] }; });
            var L = Object.keys(g).map(function (k) { return g[k]; });
            var ord = { 'JEE Advanced': 0, 'JEE Main': 1, 'IIT': 2, 'AIEEE': 3 };
            L.sort(function (a, b) { return ((ord[a.ex] != null ? ord[a.ex] : 9) - (ord[b.ex] != null ? ord[b.ex] : 9)) || (String(b.yr).localeCompare(String(a.yr))); });
            var tot = 0, sol = 0, flg = 0; L.forEach(function (o) { tot += o.n; sol += o.s; flg += o.f; });
            var done = L.filter(function (o) { return o.s === o.n; }), part = L.filter(function (o) { return o.s > 0 && o.s < o.n; }), none = L.filter(function (o) { return o.s === 0; });
            var esc = function (t) { return String(t).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); };
            var sec = function (title, sub, arr, fmt) {
              if (!arr.length) return '';
              return '<div style="margin:12px 0 4px;font-weight:600">' + title + ' <span style="font-weight:400;color:var(--color-fg-muted)">(' + arr.length + ')</span></div>' +
                '<div style="color:var(--color-fg-muted);font-size:12px;margin-bottom:4px">' + sub + '</div>' +
                '<div style="display:flex;flex-wrap:wrap;gap:5px">' + arr.map(function (o) { return '<a href="#" class="qb-sstat-pill" data-ex="' + esc(o.ex) + '" data-yr="' + esc(o.yr) + '" title="Show these questions in the Question Bank" style="border:1px solid var(--color-border-line,#ccc);border-radius:999px;padding:2px 9px;font-size:12px;color:inherit;text-decoration:underline;cursor:pointer">' + esc(fmt(o)) + '</a>'; }).join('') + '</div>';
            };
            var ys = function (o) { return o.ex + ' ' + o.yr; };
            var flagged = L.filter(function (o) { return o.f > 0; });
            bx.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="font-size:15px">Solutions status (past papers)</b><button type="button" class="qb-sstat-x" style="font:inherit;border:1px solid var(--color-border-line,#ccc);background:var(--color-bg,#fff);color:inherit;border-radius:6px;padding:2px 10px;cursor:pointer">Close</button></div>' +
              '<div style="margin-top:6px">' + sol + ' of ' + tot + ' past-paper questions have a solution added. ' + flg + ' carry a flag to check.</div>' +
              sec('Solutions fully added', 'Every question of this paper year has a solution.', done, function (o) { return ys(o) + ' \u00b7 ' + o.n; }) +
              sec('Partly added', 'Some questions have a solution, some do not yet.', part, function (o) { return ys(o) + ' \u00b7 ' + o.s + '/' + o.n; }) +
              sec('Yet to add', 'No solution added so far (questions in the bank).', none, function (o) { return ys(o) + ' \u00b7 ' + o.n + ' Qs'; }) +
              sec('Flagged \u2013 yet to check', 'Questions carrying an attention note (shown on the question card).', flagged, function (o) { return ys(o) + ' \u00b7 ' + o.f + ' flagged'; }) +
              '';
            bx.querySelector('.qb-sstat-x').addEventListener('click', close);
            Array.prototype.forEach.call(bx.querySelectorAll('.qb-sstat-bb'), function (a) {
              a.addEventListener('click', function (e4) { e4.preventDefault(); close(); try { if (window.QBX && window.QBX.goBB) window.QBX.goBB(a.getAttribute('data-bb')); } catch (x) { /* link only */ } });
            });
            Array.prototype.forEach.call(bx.querySelectorAll('.qb-sstat-pill'), function (a) {
              a.addEventListener('click', function (e3) {
                e3.preventDefault(); close();
                try { if (window.QBX && window.QBX.goYear) window.QBX.goYear(a.getAttribute('data-yr') === 'n/a' ? null : a.getAttribute('data-yr'), null, a.getAttribute('data-ex')); } catch (x) { /* link only */ }
              });
            });
          }).catch(function () { bx.textContent = 'Could not load the data. Please try again.'; });
        });
      }
    } catch (e) { /* link only */ }
    var small = await Promise.all([get('topics'), get('chapters')]);
    D.topics = mk('ok', small[0]); D.chapters = mk('ok', small[1]);
    /* the big files are retried (fresh request, growing pause) so a dropped phone connection cannot leave the first-screen 50 cards stuck */
    var getR = function (n) {
      var tryN = function (k) {
        var p = k === 0 ? Promise.resolve().then(function () { return get(n); }) : fetch('qb/data/' + n + '.json?r=' + Date.now() + k).then(function (r) { if (!r.ok) throw new Error(n); return r.json(); });
        return p.catch(function (e) {
          if (k >= 6) throw e;
          try { var nt = document.querySelector('.qb-loadnote'); if (nt) nt.textContent = 'Connection problem, trying again\u2026'; } catch (x) { /* note only */ }
          return new Promise(function (ok) { setTimeout(ok, 1500 * (k + 1)); }).then(function () { return tryN(k + 1); });
        });
      };
      return tryN(0);
    };
    var fullP = Promise.all([getR('pyq'), getR('nonpyq')]);
    var firstP = (pre.first || fetch('qb/data/first.json').then(function (r) { if (!r.ok) throw new Error('first'); return r.json(); })).catch(function () { return null; });
    var win = await Promise.race([fullP.then(function (r) { return { full: r }; }), firstP.then(function (f) { return { first: f }; })]);
    if (win.first && window.__qbPartialStart) {
      /* first screen: first cards + counts from the small file, everything else locked until the full data is in */
      var f = win.first, sp = [], sn = [];
      f.sp.forEach(function (t) { for (var k = 0; k < t[7]; k++) sp.push({ id: '', exam: t[0], year: t[1] || null, oos: !!t[2], 'class': t[3], difficulty: t[4], type: t[5], chapter_code: t[6], options: [] }); });
      f.sn.forEach(function (t) { for (var k = 0; k < t[9]; k++) sn.push({ id: '', publisher: t[0], exam: t[1], year: t[2] || null, oos: !!t[3], 'class': t[4], difficulty: t[5], type: t[6], chapter_code: t[7], pyq: !!t[8], options: [] }); });
      D.pyq = mk('ok', f.pyq); D.nonpyq = mk('ok', f.nonpyq);
      calcs.forEach(function (c) { D[c[0]] = mk('ok', c[1].fn.apply(null, c[1].inputs.map(function (i) { return i === 'pyq' ? sp : i === 'nonpyq' ? sn : D[i].data; }))); });
      window.__qbPartialStart({ n: f.n, shown: f.shown, sp: sp, sn: sn, figs: f.figs });
      fns.forEach(function (fn) { fn(); });
      win = { full: await fullP };
    }
    var res = win.full;
    D.pyq = mk('ok', res[0]); D.nonpyq = mk('ok', res[1]);
    calcs.forEach(function (c) { D[c[0]] = mk('ok', c[1].fn.apply(null, c[1].inputs.map(function (i) { return D[i].data; }))); });
    if (window.__qbPartialEnd) window.__qbPartialEnd();
    fns.forEach(function (fn) { fn(); });
  };
})();

;

window.__mh=function(tex,display){tex=window.QBX&&window.QBX.spaceCases?window.QBX.spaceCases(tex):tex;if(window.katex){try{return window.katex.renderToString((!display&&/\\(d|t)?frac|\\sqrt/.test(tex)?'\\displaystyle ':'')+tex.replace(/\\frac(?![a-zA-Z])/g,'\\dfrac'),{displayMode:!!display,throwOnError:false,strict:false,trust:false})}catch(e){}}return window.temml?window.temml.renderToString(tex,{displayMode:!!display,throwOnError:false}):String(tex).replace(/[&<>]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})};


;



;


;


;
/* Exports for the PYQ bank: Word (.docx), PowerPoint (.pptx) with native equations, and PDF. */
(function () {
  var MATH_RE = /\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;
  var LET = ['A', 'B', 'C', 'D', 'E', 'F'];

  /* **bold** markers in text (statement labels) and extra row space in piecewise formulas */
  function boldParts(s) { var out = [], re = /\*\*([^*\n]+?)\*\*/g, last = 0, m; s = String(s); while ((m = re.exec(s))) { if (m.index > last) out.push({ s: s.slice(last, m.index), b: false }); out.push({ s: m[1], b: true }); last = m.index + m[0].length; } if (last < s.length) out.push({ s: s.slice(last), b: false }); return out; }
  function spaceCases(t) { return String(t).replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, function (m, b) { var tall = /\\(d|t)?frac|\\sqrt|\\sum|\\int|\\prod|\\lim|\\binom/.test(b), gap = tall ? '1.3em' : '0.55em'; return '\\begin{cases}' + b.replace(/\\\\(?!\[)(?=[\s\S]*\S)/g, '\\\\[' + gap + ']') + '\\end{cases}'; }); }
  function segments(s) {
    var out = [], last = 0, m;
    MATH_RE.lastIndex = 0;
    while ((m = MATH_RE.exec(s))) {
      if (m.index > last) out.push({ t: 'text', v: s.slice(last, m.index) });
      out.push({ t: 'math', v: m[1] != null ? m[1] : m[2], display: m[2] != null });
      last = MATH_RE.lastIndex;
    }
    if (last < s.length) out.push({ t: 'text', v: s.slice(last) });
    return out;
  }
  var FIG_RE = /\s*\{\{figure\}\}\s*/;
  function figLines(s) { return String(s).replace(FIG_RE, '\n{{figure}}\n').replace(/^\n+|\n+$/g, ''); }
  /* draw a question's SVG figure to PNG bytes (for Word / PowerPoint) */
  function svgPng(svg, w, h) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () {
        try {
          var k = 3, c = document.createElement('canvas'); c.width = w * k; c.height = h * k;
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
          c.toBlob(function (b) { if (!b) return rej(new Error('figure')); b.arrayBuffer().then(function (a) { res(new Uint8Array(a)); }, rej); }, 'image/png');
        } catch (e) { rej(e); }
      };
      img.onerror = function () { rej(new Error('figure')); };
      setTimeout(function () { rej(new Error('figure timeout')); }, 8000);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }
  async function figuresFor(qs) {
    var m = {}, n = 0;
    for (var i = 0; i < qs.length; i++) {
      var q = qs[i];
      if (q.figure && q.figure.svg && !m[q.id]) {
        try { m[q.id] = { png: await svgPng(q.figure.svg, q.figure.w, q.figure.h), w: q.figure.w, h: q.figure.h, n: ++n }; } catch (e) { /* figure left out */ }
      }
    }
    return m;
  }
  var FIG = null;
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* rough visible length of a LaTeX-bearing string */
  function vlen(s) {
    return String(s).replace(FIG_RE, ' ').replace(/\\[()\[\]]/g, '').replace(/\\(begin|end)\{[a-z*]*\}/g, '').replace(/\\(left|right|displaystyle|,|;|!|quad)/g, '')
      .replace(/\\frac/g, 'xxx').replace(/\\[a-zA-Z]+/g, 'xx').replace(/[{}^_\\]/g, '').length;
  }
  /* how many options fit on one line: 4, 2 or 1 */
  function optCols(opts) {
    if (!opts || !opts.length) return 0;
    if (opts.some(function (o) { return /\\\[|\n|\\begin\{(b|p|v|V)?matrix|\\begin\{array/.test(o); })) return 1;
    var m = Math.max.apply(null, opts.map(function (o) { return vlen(o) + 6 * ((String(o).match(/\\frac/g) || []).length); }));
    return m <= 20 ? 4 : m <= 48 ? 2 : 1;
  }

  /* ---------- MathML -> OMML ---------- */
  var NARY = '∫∬∭∮∯∰∑∏∐⋃⋂⋁⋀⨁⨂⨀';
  var LIMS = { lim: 1, max: 1, min: 1, sup: 1, inf: 1 };
  var ACC = { '→': '⃗', '⃗': '⃗', '^': '̂', 'ˆ': '̂', '~': '̃', '˜': '̃', '.': '̇', '˙': '̇', '¨': '̈', '¯': '̅', '‾': '̅', '―': '̅', 'ˇ': '̌', '´': '́', '`': '̀', '˘': '̆' };
  var MODE = 'w', PSZ = 2000; /* 'w' = Word, 'p' = PowerPoint (needs a:rPr in each run) */

  function kids(n) { var a = []; for (var i = 0; i < n.childNodes.length; i++) if (n.childNodes[i].nodeType === 1) a.push(n.childNodes[i]); return a; }
  function txt(n) { return (n.textContent || '').replace(/⁡|⁢|⁣/g, ''); }
  function mathItalic(t) {
    if (t.length !== 1) return t;
    var c = t.charCodeAt(0);
    if (t === 'h') return 'ℎ';
    if (c >= 97 && c <= 122) return String.fromCodePoint(0x1D44E + c - 97);
    if (c >= 65 && c <= 90) return String.fromCodePoint(0x1D434 + c - 65);
    return t;
  }
  function run(text, sty) {
    if (!text) return '';
    var rpr = sty === 'nor' ? '<m:rPr><m:nor/></m:rPr>' : sty ? '<m:rPr><m:sty m:val="' + sty + '"/></m:rPr>' : '';
    if (MODE === 'p') {
      var ital = !sty;
      if (ital) text = mathItalic(text);
      rpr += '<a:rPr lang="en-US" sz="' + PSZ + '" i="' + (ital ? 1 : 0) + '" dirty="0"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:latin typeface="Cambria Math" panose="02040503050406030204" pitchFamily="18" charset="0"/></a:rPr>';
    }
    return '<m:r>' + rpr + '<m:t xml:space="preserve">' + esc(text) + '</m:t></m:r>';
  }
  /* the operand slot of an integral / sum / product / limit is filled with the expression that follows it */
  var EMPTY_NARY = '<m:e></m:e></m:nary>', EMPTY_FUNC = '</m:limLow></m:fName><m:e></m:e></m:func>';
  function isRelation(n) { return n.localName === 'mo' && /^[=≠≈≡<>≤≥⩽⩾⇒⟹⇔⟺∈∉⊂⊆→⟶,;:]$/.test(txt(n).trim()); }
  function all(list) {
    var strs = list.map(conv), used = [];
    for (var i = list.length - 1; i >= 0; i--) {
      var st = strs[i], isN = st.slice(-EMPTY_NARY.length) === EMPTY_NARY, isF = st.slice(-EMPTY_FUNC.length) === EMPTY_FUNC;
      if (!isN && !isF) continue;
      var integral = isN && /<m:chr m:val="[∫∬∭∮∯∰]"\/>/.test(st), inner = '', j = i + 1, stop = false;
      while (j < list.length && !stop) {
        if (used[j]) { j++; continue; }
        var nd = list[j];
        if (isRelation(nd)) break;
        inner += strs[j]; used[j] = true;
        if (integral && nd.localName === 'mi' && txt(nd).trim() === 'd' && j + 1 < list.length && !used[j + 1]) { inner += strs[j + 1]; used[j + 1] = true; stop = true; }
        j++;
      }
      if (inner) strs[i] = st.slice(0, st.length - (isN ? EMPTY_NARY : EMPTY_FUNC).length) + (isN ? '<m:e>' + inner + '</m:e></m:nary>' : '</m:limLow></m:fName><m:e>' + inner + '</m:e></m:func>');
    }
    return strs.filter(function (x, k) { return !used[k]; }).join('');
  }
  function arg(n) { return n ? conv(n) : ''; }
  function isNaryBase(n) { var t = n ? txt(n).trim() : ''; return n && (n.localName === 'mo' || n.localName === 'mi') && t.length === 1 && NARY.indexOf(t) >= 0; }
  function nary(base, sub, sup, under) {
    var ch = txt(base).trim();
    var pr = '<m:naryPr><m:chr m:val="' + esc(ch) + '"/><m:limLoc m:val="' + (under && ch !== '∫' ? 'undOvr' : 'subSup') + '"/>' + (sub ? '' : '<m:subHide m:val="1"/>') + (sup ? '' : '<m:supHide m:val="1"/>') + '</m:naryPr>';
    return '<m:nary>' + pr + '<m:sub>' + arg(sub) + '</m:sub><m:sup>' + arg(sup) + '</m:sup><m:e></m:e></m:nary>';
  }
  function limLow(base, lim) { return '<m:func><m:fName><m:limLow><m:e>' + run(txt(base).trim(), 'p') + '</m:e><m:lim>' + arg(lim) + '</m:lim></m:limLow></m:fName><m:e></m:e></m:func>'; }
  function fenced(k) {
    if (k.length < 2) return null;
    var a = k[0], b = k[k.length - 1];
    if (a.localName === 'mo' && b.localName === 'mo' && a.getAttribute('fence') === 'true' && b.getAttribute('fence') === 'true')
      return '<m:d><m:dPr><m:begChr m:val="' + esc(txt(a)) + '"/><m:endChr m:val="' + esc(txt(b)) + '"/></m:dPr><m:e>' + all(k.slice(1, -1)) + '</m:e></m:d>';
    return null;
  }
  function conv(n) {
    var name = n.localName, k = kids(n), t;
    switch (name) {
      case 'math': case 'mrow': case 'mstyle': case 'mpadded': case 'semantics': case 'mtd': case 'merror':
        if (name === 'mrow') { var f = fenced(k); if (f) return f; }
        return all(k.filter(function (c) { return c.localName !== 'annotation' && c.localName !== 'annotation-xml'; }));
      case 'mphantom': case 'mspace': case 'annotation': case 'annotation-xml': return '';
      case 'mi': t = txt(n); if (!t) return ''; return run(t, t.length > 1 || n.getAttribute('mathvariant') === 'normal' ? 'p' : '');
      case 'mn': case 'mo': return run(txt(n), 'p');
      case 'mtext': case 'ms': return run(txt(n).replace(/ /g, ' '), 'nor');
      case 'mfrac':
        var nobar = /^0(\.0*)?(px|em|pt)?$/.test(n.getAttribute('linethickness') || '');
        return '<m:f>' + (nobar ? '<m:fPr><m:type m:val="noBar"/></m:fPr>' : '') + '<m:num>' + arg(k[0]) + '</m:num><m:den>' + arg(k[1]) + '</m:den></m:f>';
      case 'msqrt': return '<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg></m:deg><m:e>' + all(k) + '</m:e></m:rad>';
      case 'mroot': return '<m:rad><m:deg>' + arg(k[1]) + '</m:deg><m:e>' + arg(k[0]) + '</m:e></m:rad>';
      case 'msup':
        if (isNaryBase(k[0])) return nary(k[0], null, k[1]);
        return '<m:sSup><m:e>' + arg(k[0]) + '</m:e><m:sup>' + arg(k[1]) + '</m:sup></m:sSup>';
      case 'msub':
        if (isNaryBase(k[0])) return nary(k[0], k[1], null);
        if (k[0] && LIMS[txt(k[0]).trim()]) return limLow(k[0], k[1]);
        return '<m:sSub><m:e>' + arg(k[0]) + '</m:e><m:sub>' + arg(k[1]) + '</m:sub></m:sSub>';
      case 'msubsup':
        if (isNaryBase(k[0])) return nary(k[0], k[1], k[2]);
        return '<m:sSubSup><m:e>' + arg(k[0]) + '</m:e><m:sub>' + arg(k[1]) + '</m:sub><m:sup>' + arg(k[2]) + '</m:sup></m:sSubSup>';
      case 'munder':
        if (isNaryBase(k[0])) return nary(k[0], k[1], null, true);
        if (k[0] && LIMS[txt(k[0]).trim()]) return limLow(k[0], k[1]);
        if (k[1] && /^[_‾¯―]$/.test(txt(k[1]).trim())) return '<m:bar><m:barPr><m:pos m:val="bot"/></m:barPr><m:e>' + arg(k[0]) + '</m:e></m:bar>';
        return '<m:limLow><m:e>' + arg(k[0]) + '</m:e><m:lim>' + arg(k[1]) + '</m:lim></m:limLow>';
      case 'mover':
        if (isNaryBase(k[0])) return nary(k[0], null, k[1], true);
        var a = k[1] ? txt(k[1]).trim() : '';
        if (k[1] && k[1].localName === 'mo' && ACC[a]) {
          if (ACC[a] === '̅') return '<m:bar><m:barPr><m:pos m:val="top"/></m:barPr><m:e>' + arg(k[0]) + '</m:e></m:bar>';
          return '<m:acc><m:accPr><m:chr m:val="' + ACC[a] + '"/></m:accPr><m:e>' + arg(k[0]) + '</m:e></m:acc>';
        }
        return '<m:limUpp><m:e>' + arg(k[0]) + '</m:e><m:lim>' + arg(k[1]) + '</m:lim></m:limUpp>';
      case 'munderover':
        if (isNaryBase(k[0])) return nary(k[0], k[1], k[2], true);
        return '<m:limUpp><m:e><m:limLow><m:e>' + arg(k[0]) + '</m:e><m:lim>' + arg(k[1]) + '</m:lim></m:limLow></m:e><m:lim>' + arg(k[2]) + '</m:lim></m:limUpp>';
      case 'menclose':
        var note = n.getAttribute('notation') || '';
        if (/top/.test(note)) return '<m:bar><m:barPr><m:pos m:val="top"/></m:barPr><m:e>' + all(k) + '</m:e></m:bar>';
        if (/bottom/.test(note)) return '<m:bar><m:barPr><m:pos m:val="bot"/></m:barPr><m:e>' + all(k) + '</m:e></m:bar>';
        if (/box/.test(note)) return '<m:borderBox><m:e>' + all(k) + '</m:e></m:borderBox>';
        return all(k);
      case 'mtable':
        var rows = k.filter(function (r) { return r.localName === 'mtr' || r.localName === 'mlabeledtr'; });
        var cols = Math.max.apply(null, rows.map(function (r) { return kids(r).length; }).concat([1]));
        return '<m:m><m:mPr><m:mcs><m:mc><m:mcPr><m:count m:val="' + cols + '"/><m:mcJc m:val="center"/></m:mcPr></m:mc></m:mcs></m:mPr>' +
          rows.map(function (r) {
            var cells = kids(r); if (r.localName === 'mlabeledtr') cells = cells.slice(1);
            while (cells.length < cols) cells.push(null);
            return '<m:mr>' + cells.map(function (c) { var inner = c ? conv(c) : ''; return '<m:e>' + (c && /border/.test(c.getAttribute('style') || '') ? '<m:borderBox><m:e>' + (inner || run('\u2003', 'p')) + '</m:e></m:borderBox>' : inner) + '</m:e>'; }).join('') + '</m:mr>';
          }).join('') + '</m:m>';
      default: return k.length ? all(k) : run(txt(n), 'p');
    }
  }
  function texToOmml(tex) {
    var holder = document.createElement('template');
    try { holder.innerHTML = window.temml.renderToString(tex, { throwOnError: true }); } catch (e) { return run(tex, 'p'); }
    var math = holder.content.querySelector('math');
    return math ? conv(math) : run(tex, 'p');
  }

  /* the card code has its own srcLabel in another block; the export needs its own copy */
  function srcLabel(q) { return q.publisher || 'Practice'; }
  function metaLine(q) {
    if (q.source === 'Non-PYQ') return 'Practice · ' + srcLabel(q) + (q.ref_year ? ' [' + q.ref_year + ']' : '') + ' · ' + q.chapter_code + ' ' + q.chapter + (q.topic ? ' · ' + (q.topic_code && !/^UNMAPPED/.test(q.topic_code) ? q.topic_code.replace(/^JM-/, '') + ' ' : '') + q.topic : '') + ' · ' + q.difficulty;
    return q.exam + (q.year ? ' ' + q.year : '') + ' · ' + q.paper + ' · ' + q.chapter_code + ' ' + q.chapter + (q.topic ? ' · ' + (q.topic_code && !/^UNMAPPED/.test(q.topic_code) ? q.topic_code.replace(/^JM-/, '') + ' ' : '') + q.topic : '') + ' · ' + q.difficulty + (q.attention ? ' · NEEDS ATTENTION' : '');
  }

  /* ================= WORD ================= */
  var W_PAGE = 10204; /* A4 width minus 15 mm margins, in twips */
  function wRun(text, o) {
    o = o || {};
    var pr = (o.b ? '<w:b/>' : '') + (o.color ? '<w:color w:val="' + o.color + '"/>' : '') + (o.sz ? '<w:sz w:val="' + o.sz + '"/>' : '');
    return '<w:r>' + (pr ? '<w:rPr>' + pr + '</w:rPr>' : '') + '<w:t xml:space="preserve">' + esc(text) + '</w:t></w:r>';
  }
  function para(inner, o) {
    o = o || {};
    return '<w:p><w:pPr>' + (o.keepNext ? '<w:keepNext/>' : '') + '<w:spacing w:before="0" w:after="' + (o.after != null ? o.after : 40) + '"/>' + (o.ind ? '<w:ind w:left="' + o.ind + '"/>' : '') + '</w:pPr>' + inner + '</w:p>';
  }
  function pageBreak() { return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'; }
  function wDrawing(f) {
    var cx = f.w * 9525, cy = f.h * 9525;
    return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:docPr id="' + (1000 + f.n) + '" name="Figure ' + f.n + '"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
      '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="' + (1000 + f.n) + '" name="fig' + f.n + '.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdF' + f.n + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }
  /* "Match the following" questions (List-I / List-II, Column I / Column II): split into the two lists so Word, PDF and PowerPoint can draw a real table */
  function matchParse(s) {
    var ls = String(s).split('\n'), HA = /^\s*(List|Column)[\s\-]*(I|1)\s*(\([^)]*\))?\s*:\s*(.*)$/i, HB = /^\s*(List|Column)[\s\-]*(II|2)\s*(\([^)]*\))?\s*:\s*(.*)$/i, a = -1, b = -1, ma, mb;
    for (var k = 0; k < ls.length; k++) {
      if (a < 0) { ma = HA.exec(ls[k]); if (ma) a = k; }
      else if (b < 0) { mb = HB.exec(ls[k]); if (mb) b = k; }
    }
    if (a < 0 || b < 0) return null;
    var LBL = /^\(([A-Za-z]|\d{1,2}|i{1,3}|iv|vi{0,3})\)/;
    var grp = function (r) { if (!r.length || !LBL.test(r[0])) return r; var o = []; r.forEach(function (x) { if (LBL.test(x) || !o.length) o.push(x); else o[o.length - 1] += ' ' + x; }); return o; };
    var items = function (inline, lines) {
      var r = [];
      if (inline && inline.trim()) inline.split(/\s;\s+(?=\()/).forEach(function (x) { if (x.trim()) r.push(x.trim()); });
      lines.forEach(function (l) { if (l.trim()) r.push(l.trim()); });
      return grp(r);
    };
    var A = items(ma[4], ls.slice(a + 1, b)), B = items(mb[4], ls.slice(b + 1));
    if (!A.length || !B.length) return null;
    var lab = function (m) { return m[1] + '-' + m[2] + (m[3] ? ' ' + m[3] : ''); };
    return { pre: ls.slice(0, a).join('\n'), h1: lab(ma).replace(/^List-/, 'List-').replace(/^Column-/, 'Column '), h2: lab(mb).replace(/^Column-/, 'Column '), a: A, b: B };
  }
  function richParas(s, prefix, o) {
    var mt = matchParse(s);
    if (mt) return matchWord(mt, prefix, o);
    var out = [];
    String(s).split('\n').forEach(function (line, li) {
      var cur = li === 0 && prefix ? prefix : '';
      if (line.trim() === '{{figure}}') { if (cur) out.push(para(cur, o)); if (FIG) out.push(para(wDrawing(FIG), { after: 60 })); return; }
      segments(line).forEach(function (sg) {
        if (sg.t === 'text') boldParts(sg.v).forEach(function (bp) { cur += wRun(bp.s, bp.b ? { b: 1 } : null); });
        else if (sg.display) {
          if (cur) out.push(para(cur, o));
          out.push('<w:p><w:pPr><w:spacing w:before="0" w:after="40"/></w:pPr><m:oMathPara><m:oMath>' + texToOmml(sg.v) + '</m:oMath></m:oMathPara></w:p>');
          cur = '';
        } else cur += '<m:oMath>' + texToOmml(sg.v) + '</m:oMath>';
      });
      if (cur) out.push(para(cur, o));
    });
    return out.join('') || para('', o);
  }
  function matchWord(mt, prefix, o) {
    var out = mt.pre.trim() ? richParas(mt.pre, prefix, o) : (prefix ? para(prefix, o) : ''), w1 = Math.floor((W_PAGE - 284) / 2), n = Math.max(mt.a.length, mt.b.length);
    var BD = function (v) { return '<w:' + v + ' w:val="single" w:sz="6" w:space="0" w:color="000000"/>'; };
    var cell = function (inner, shade) { return '<w:tc><w:tcPr><w:tcW w:w="' + w1 + '" w:type="dxa"/>' + (shade ? '<w:shd w:val="clear" w:color="auto" w:fill="E7E6E6"/>' : '') + '<w:vAlign w:val="center"/></w:tcPr>' + inner + '</w:tc>'; };
    var rows = '<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>' + cell(para(wRun(mt.h1, { b: true }), { after: 20 }), true) + cell(para(wRun(mt.h2, { b: true }), { after: 20 }), true) + '</w:tr>';
    for (var r = 0; r < n; r++) rows += '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + cell(mt.a[r] != null ? richParas(mt.a[r], '', { after: 20 }) : '<w:p/>') + cell(mt.b[r] != null ? richParas(mt.b[r], '', { after: 20 }) : '<w:p/>') + '</w:tr>';
    return out + '<w:tbl><w:tblPr><w:tblW w:w="' + (w1 * 2) + '" w:type="dxa"/><w:tblInd w:w="284" w:type="dxa"/><w:tblBorders>' + BD('top') + BD('left') + BD('bottom') + BD('right') + BD('insideH') + BD('insideV') + '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="0000"/></w:tblPr><w:tblGrid><w:gridCol w:w="' + w1 + '"/><w:gridCol w:w="' + w1 + '"/></w:tblGrid>' + rows + '</w:tbl>' + para('', { after: 40 });
  }
  var NOB = '<w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/>';
  /* Word has no automatic shrinking inside a table cell, so the number of option columns is chosen from the real rendered width of every option (math is measured with the page's own engine, plus a margin because Word's math font is wider) */
  var OW_HOST = null;
  function optWidthPx(op) {
    if (!window.__mh || !document.body) return -1;
    if (!OW_HOST) { OW_HOST = document.createElement('div'); OW_HOST.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;font:14.67px Calibri,Arial,sans-serif'; document.body.appendChild(OW_HOST); }
    var w = 0;
    segments(String(op).replace(FIG_RE, ' ')).forEach(function (sg) {
      var sp = document.createElement('span');
      if (sg.t === 'math') { try { sp.innerHTML = window.__mh(sg.v, false); } catch (e) { sp.textContent = sg.v; } } else sp.textContent = sg.v;
      OW_HOST.appendChild(sp); w += sp.getBoundingClientRect().width; OW_HOST.removeChild(sp);
    });
    return w;
  }
  function optColsWord(opts) {
    var base = optCols(opts);
    if (base <= 1) return base;
    var m = 0;
    for (var i = 0; i < opts.length; i++) { var w = optWidthPx(opts[i]); if (w < 0) return base; m = Math.max(m, w); }
    m *= 1.2;
    var by = m <= 130 ? 4 : m <= 295 ? 2 : 1;
    return Math.min(base, by);
  }
  function optionsWord(opts) {
    var cols = optColsWord(opts);
    if (!cols) return '';
    if (cols === 1) return opts.map(function (op, j) { return richParas(op, wRun('(' + LET[j] + ') ', { b: true }), { ind: 284, after: 30 }); }).join('');
    var w = Math.floor((W_PAGE - 284) / cols), rows = [];
    for (var i = 0; i < opts.length; i += cols) rows.push(opts.slice(i, i + cols).map(function (op, j) { return { op: op, j: i + j }; }));
    return '<w:tbl><w:tblPr><w:tblW w:w="' + (w * cols) + '" w:type="dxa"/><w:tblInd w:w="284" w:type="dxa"/><w:tblBorders>' + NOB + '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="113" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="0000"/></w:tblPr><w:tblGrid>' +
      new Array(cols + 1).join('<w:gridCol w:w="' + w + '"/>') + '</w:tblGrid>' +
      rows.map(function (r) {
        var cells = r.map(function (c) { return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/></w:tcPr>' + richParas(c.op, wRun('(' + LET[c.j] + ') ', { b: true }), { after: 30 }) + '</w:tc>'; });
        while (cells.length < cols) cells.push('<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/></w:tcPr><w:p/></w:tc>');
        return '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + cells.join('') + '</w:tr>';
      }).join('') + '</w:tbl>' + para('', { after: 0 });
  }
  function answerKeyWord(qs) {
    var cols = 6, w = Math.floor(W_PAGE / cols), rows = [];
    for (var i = 0; i < qs.length; i += cols) rows.push(qs.slice(i, i + cols).map(function (q, j) { return { q: q, n: i + j + 1 }; }));
    return para(wRun('Answer key', { b: true, sz: 26 }), { after: 100 }) +
      '<w:tbl><w:tblPr><w:tblW w:w="' + (w * cols) + '" w:type="dxa"/><w:tblBorders>' + NOB + '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblLook w:val="0000"/></w:tblPr><w:tblGrid>' + new Array(cols + 1).join('<w:gridCol w:w="' + w + '"/>') + '</w:tblGrid>' +
      rows.map(function (r) {
        var cells = r.map(function (c) { return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/></w:tcPr>' + para(wRun(c.n + '. ', { b: true }) + wRun(c.q.answer || '—'), { after: 20 }) + '</w:tc>'; });
        while (cells.length < cols) cells.push('<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/></w:tcPr><w:p/></w:tc>');
        return '<w:tr>' + cells.join('') + '</w:tr>';
      }).join('') + '</w:tbl>' + para('');
  }
  function docxBody(qs, o) {
    MODE = 'w';
    var b = o.title ? para(wRun(o.title, { b: true, sz: 28 }), { after: 120 }) : '';
    qs.forEach(function (q, i) {
      FIG = (o._figs || {})[q.id] || null;
      b += para(wRun(metaLine(q), { color: '808080', sz: 16 }), { keepNext: true, after: 0 });
      b += richParas(figLines(q.question), wRun('Q' + (i + 1) + '. ', { b: true }), { after: 40 });
      b += optionsWord(q.options || []);
      if (o.answers && !o.answerKey) b += para(wRun('Answer: ', { b: true }) + wRun(q.answer || '—'), { after: 40 });
      if (o.pptLayout) b += pageBreak() + para('') + pageBreak();
      else b += para('', { after: 100 });
    });
    FIG = null;
    if (o.answers && o.answerKey) b += pageBreak() + answerKeyWord(qs);
    if (o.expl && o.expl.length) {
      b += pageBreak() + para(wRun('Explanations', { b: true, sz: 26 }), { after: 100 });
      o.expl.forEach(function (e) {
        FIG = (o._figs || {})[e.q.id] || null;
        b += richParas(figLines(e.q.question), wRun('Q' + e.n + '. ', { b: true }), { after: 40 }) + para('', { after: 100 });
      });
      FIG = null;
    }
    return b;
  }
  var DOC_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
  function documentXml(body) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + DOC_NS + '><w:body>' + body +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="851" w:right="851" w:bottom="851" w:left="851" w:header="425" w:footer="425" w:gutter="0"/></w:sectPr></w:body></w:document>';
  }
  var STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="40" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>';
  var REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships', OD = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
  function rels(list) { return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="' + REL_NS + '">' + list.map(function (r) { return '<Relationship Id="' + r[0] + '" Type="' + OD + r[1] + '" Target="' + r[2] + '"/>'; }).join('') + '</Relationships>'; }
  async function buildDocx(qs, o) {
    o = o || {};
    var figs = o._figs = await figuresFor(qs.concat((o.expl || []).map(function (e) { return e.q; }))), media = [], drel = [['rId1', 'styles', 'styles.xml']];
    Object.keys(figs).forEach(function (id) { var f = figs[id]; media.push({ name: 'word/media/fig' + f.n + '.png', data: f.png }); drel.push(['rIdF' + f.n, 'image', 'media/fig' + f.n + '.png']); });
    return zip([
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>' },
      { name: '_rels/.rels', data: rels([['rId1', 'officeDocument', 'word/document.xml']]) },
      { name: 'word/_rels/document.xml.rels', data: rels(drel) },
      { name: 'word/styles.xml', data: STYLES },
      { name: 'word/document.xml', data: documentXml(docxBody(qs, o)) }
    ].concat(media));
  }

  /* ================= POWERPOINT ================= */
  var EMU_W = 12192000, EMU_H = 6858000, MX = 457200, BODY_W = EMU_W - 2 * MX;
  var NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main', NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main', NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', NS_M = 'http://schemas.openxmlformats.org/officeDocument/2006/math';
  function aRun(text, sz, o) {
    o = o || {};
    return '<a:r><a:rPr lang="en-US" sz="' + sz + '"' + (o.b ? ' b="1"' : '') + ' dirty="0">' + (o.color ? '<a:solidFill><a:srgbClr val="' + o.color + '"/></a:solidFill>' : '<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>') + '</a:rPr><a:t>' + esc(text) + '</a:t></a:r>';
  }
  function aPara(inner, sz, o) {
    o = o || {};
    var tabs = o.tabs ? '<a:tabLst>' + o.tabs.map(function (p) { return '<a:tab pos="' + p + '" algn="l"/>'; }).join('') + '</a:tabLst>' : '';
    return '<a:p><a:pPr' + (o.marL ? ' marL="' + o.marL + '"' : '') + '><a:spcAft><a:spcPts val="' + (o.after != null ? o.after : 600) + '"/></a:spcAft>' + tabs + '</a:pPr>' + inner + '<a:endParaRPr lang="en-US" sz="' + sz + '" dirty="0"/></a:p>';
  }
  /* inline content of one line: runs and inline math; display math returned separately */
  function pptInline(line, sz, mathOn) {
    var parts = [], cur = '';
    segments(line).forEach(function (sg) {
      if (sg.t === 'text') boldParts(sg.v).forEach(function (bp) { cur += aRun(bp.s, sz, bp.b ? { b: 1, color: 'FFFFFF' } : null); });
      else if (!mathOn) cur += aRun(sg.display ? '\\[' + sg.v + '\\]' : '\\(' + sg.v + '\\)', sz);
      else if (sg.display) { parts.push({ inline: cur }); parts.push({ display: sg.v }); cur = ''; }
      else cur += '<a14:m><m:oMath xmlns:m="' + NS_M + '">' + texToOmml(sg.v) + '</m:oMath></a14:m>';
    });
    parts.push({ inline: cur });
    return parts;
  }
  function pptRich(s, prefix, sz, mathOn, o) {
    var out = '';
    String(s).split('\n').forEach(function (line, li) {
      if (line.trim() === '{{figure}}') return;
      var pre = li === 0 && prefix ? prefix : '';
      pptInline(line, sz, mathOn).forEach(function (p, pi) {
        if (p.display != null) out += '<a:p><a:pPr><a:spcAft><a:spcPts val="400"/></a:spcAft></a:pPr><a14:m><m:oMathPara xmlns:m="' + NS_M + '"><m:oMathParaPr><m:jc m:val="left"/></m:oMathParaPr><m:oMath>' + texToOmml(p.display) + '</m:oMath></m:oMathPara></a14:m><a:endParaRPr lang="en-US" sz="' + sz + '" dirty="0"/></a:p>';
        else if (p.inline || (pi === 0 && pre)) { out += aPara((pi === 0 ? pre : '') + p.inline, sz, o); }
      });
    });
    return out;
  }
  function pptOptions(opts, sz, mathOn) {
    var cols = optCols(opts);
    if (!cols) return '';
    if (cols === 1) return opts.map(function (op, j) { return pptRich(op, aRun('(' + LET[j] + ')  ', sz, { b: true }), sz, mathOn, { after: 300, marL: 228600 }); }).join('');
    var step = Math.floor(BODY_W / cols), tabs = [], out = '';
    for (var t = 1; t < cols; t++) tabs.push(step * t);
    for (var i = 0; i < opts.length; i += cols) {
      var inner = '';
      opts.slice(i, i + cols).forEach(function (op, j) {
        if (j) inner += aRun('\t', sz);
        inner += aRun('(' + LET[i + j] + ')  ', sz, { b: true });
        pptInline(op.replace(/\n/g, ' '), sz, mathOn).forEach(function (p) { inner += p.inline != null ? p.inline : (mathOn ? '<a14:m><m:oMath xmlns:m="' + NS_M + '">' + texToOmml(p.display) + '</m:oMath></a14:m>' : ''); });
      });
      out += aPara(inner, sz, { tabs: tabs, after: 300 });
    }
    return out;
  }
  function spXml(id, name, x, y, cx, cy, paras, autofit) {
    return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name="' + name + '"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="' + x + '" y="' + y + '"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>' +
      '<p:txBody><a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0" anchor="t">' + (autofit ? '<a:normAutofit/>' : '<a:noAutofit/>') + '</a:bodyPr><a:lstStyle/>' + paras + '</p:txBody></p:sp>';
  }
  var SP_HEAD = '<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
  var SP_TAIL = '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>';
  var LOGO_H = 457200, LOGO_TOP = 120000;
  function logoXml() {
    if (!window.QB_LOGO_B64) return '';
    var cy = LOGO_H, cx = Math.round(cy * (window.QB_LOGO_W || 480) / (window.QB_LOGO_H || 165));
    return '<p:pic><p:nvPicPr><p:cNvPr id="6" name="अंक-IT logo"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId3"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="' + (EMU_W - 300000 - cx) + '" y="' + LOGO_TOP + '"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>';
  }
  function logoWidth() { return window.QB_LOGO_B64 ? Math.round(LOGO_H * (window.QB_LOGO_W || 480) / (window.QB_LOGO_H || 165)) + 400000 : 0; }
  function slideXml(inner) { return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="' + NS_A + '" xmlns:r="' + NS_R + '" xmlns:p="' + NS_P + '">' + SP_HEAD + inner + logoXml() + SP_TAIL + '</p:sld>'; }
  function fontFor(q) {
    var n = vlen(q.question) + (q.options || []).reduce(function (s, o) { return s + vlen(o); }, 0) + (/\\begin|\\\[/.test(q.question) ? 120 : 0);
    return n < 220 ? 2400 : n < 380 ? 2200 : n < 560 ? 2000 : n < 800 ? 1800 : n < 1100 ? 1600 : 1400;
  }
  function picXml(f) {
    var maxH = 2286000, cx = f.w * 9525, cy = f.h * 9525, k = cy > maxH ? maxH / cy : 1.4;
    if (cy * k > maxH) k = maxH / cy;
    cx = Math.round(cx * k); cy = Math.round(cy * k);
    return '<p:pic><p:nvPicPr><p:cNvPr id="5" name="Figure"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="' + (EMU_W - MX - cx) + '" y="' + (EMU_H - 300000 - cy) + '"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>';
  }
  /* PowerPoint: a matching question is a real table (own shape) between the question text and the options */
  function matchSlide(q, i, o, mt, sz0, meta, f) {
    var sz = Math.max(1400, sz0 - 200); PSZ = sz;
    var lineH = Math.round(sz / 100 * 12700 * 1.25), cw = sz / 100 * 12700 * 0.5, colW = Math.floor(BODY_W / 2), perLine = Math.max(10, Math.floor((colW - 200000) / cw));
    var linesOf = function (t) { return Math.max(1, Math.ceil(vlen(t) * 0.8 / perLine)); };
    var n = Math.max(mt.a.length, mt.b.length), rowsH = [], tot = 0;
    for (var r = 0; r < n; r++) { var h = Math.max(linesOf(mt.a[r] || ''), linesOf(mt.b[r] || '')) * lineH + 120000; rowsH.push(h); tot += h; }
    var hdrH = lineH + 120000, preLines = Math.ceil((vlen(mt.pre) + 4) * 0.8 / Math.floor((BODY_W - 200000) / cw)) + (mt.pre.split('\n').length - 1) + (/\\\[/.test(mt.pre) ? 2 : 0);
    var preH = Math.max(1, preLines) * lineH + 160000, y0 = 700000, ty = y0 + preH, optH = EMU_H - 300000 - (ty + hdrH + tot) - 100000;
    var LN = function (t) { return '<a:' + t + ' w="12700"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:' + t + '>'; };
    var tc = function (inner, shade) { return '<a:tc><a:txBody><a:bodyPr/><a:lstStyle/>' + inner + '</a:txBody><a:tcPr marL="91440" marR="91440" marT="45720" marB="45720" anchor="ctr">' + LN('lnL') + LN('lnR') + LN('lnT') + LN('lnB') + (shade ? '<a:solidFill><a:srgbClr val="333333"/></a:solidFill>' : '<a:noFill/>') + '</a:tcPr></a:tc>'; };
    var make = function (mathOn) {
      var cellP = function (t) { var x = t != null ? pptRich(t, '', sz, mathOn, { after: 0 }) : ''; return x || '<a:p><a:endParaRPr lang="en-US" sz="' + sz + '" dirty="0"/></a:p>'; };
      var tbl = '<a:tbl><a:tblPr/><a:tblGrid><a:gridCol w="' + colW + '"/><a:gridCol w="' + colW + '"/></a:tblGrid><a:tr h="' + hdrH + '">' + tc(aPara(aRun(mt.h1, sz, { b: true }), sz, { after: 0 }), true) + tc(aPara(aRun(mt.h2, sz, { b: true }), sz, { after: 0 }), true) + '</a:tr>';
      for (var r = 0; r < n; r++) tbl += '<a:tr h="' + rowsH[r] + '">' + tc(cellP(mt.a[r])) + tc(cellP(mt.b[r])) + '</a:tr>';
      tbl += '</a:tbl>';
      var gf = '<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="7" name="Match table"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="' + MX + '" y="' + ty + '"/><a:ext cx="' + (colW * 2) + '" cy="' + (hdrH + tot) + '"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">' + tbl + '</a:graphicData></a:graphic></p:graphicFrame>';
      var head = pptRich(mt.pre, aRun('Q' + (i + 1) + '.  ', sz, { b: true }), sz, mathOn, { after: 300 });
      if (!mt.pre.trim()) head = aPara(aRun('Q' + (i + 1) + '.', sz, { b: true }), sz, { after: 300 });
      var out = spXml(3, 'Question', MX, y0, BODY_W, preH, head, true) + gf;
      var tail = pptOptions(q.options || [], sz, mathOn);
      if (o.answers && !o.answerKey) tail += aPara(aRun('Answer: ', sz, { b: true }) + aRun(q.answer || '—', sz), sz);
      if (tail) out += spXml(8, 'Options', MX, ty + hdrH + tot + 100000, BODY_W, Math.max(optH, 600000), tail, true);
      return out;
    };
    var body = '<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" Requires="a14">' + make(true) + '</mc:Choice><mc:Fallback>' + make(false) + '</mc:Fallback></mc:AlternateContent>';
    MODE = 'w';
    return { xml: slideXml(meta + body + (f ? picXml(f) : '')), fig: f };
  }
  function questionSlide(q, i, o) {
    var sz = fontFor(q); PSZ = sz; MODE = 'p';
    var f = (o._figs || {})[q.id];
    var meta = spXml(2, 'Source', MX, 170000, BODY_W - logoWidth(), 380000, aPara(aRun(metaLine(q), 1200, { color: 'BFBFBF' }), 1200, { after: 0 }), false);
    var mt = matchParse(figLines(q.question));
    if (mt) return matchSlide(q, i, o, mt, sz, meta, f);
    var make = function (mathOn) {
      var paras = pptRich(figLines(q.question), aRun('Q' + (i + 1) + '.  ', sz, { b: true }), sz, mathOn, { after: 600 }) + pptOptions(q.options || [], sz, mathOn);
      if (o.answers && !o.answerKey) paras += aPara(aRun('Answer: ', sz, { b: true }) + aRun(q.answer || '—', sz), sz);
      return spXml(3, 'Question', MX, 700000, BODY_W, EMU_H - 700000 - 300000, paras, true);
    };
    var body = '<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" Requires="a14">' + make(true) + '</mc:Choice><mc:Fallback>' + make(false) + '</mc:Fallback></mc:AlternateContent>';
    MODE = 'w';
    return { xml: slideXml(meta + body + (f ? picXml(f) : '')), fig: f };
  }
  function keySlides(qs) {
    var out = [], per = 40;
    for (var s = 0; s < qs.length; s += per) {
      var chunk = qs.slice(s, s + per), cols = 4, step = Math.floor(BODY_W / cols), tabs = [step, step * 2, step * 3], paras = aPara(aRun('Answer key', 2400, { b: true }), 2400, { after: 600 });
      for (var r = 0; r < chunk.length; r += cols) {
        paras += aPara(chunk.slice(r, r + cols).map(function (q, j) { return (j ? aRun('\t', 1600) : '') + aRun((s + r + j + 1) + '.  ', 1600, { b: true }) + aRun(q.answer || '—', 1600); }).join(''), 1600, { tabs: tabs, after: 200 });
      }
      out.push(slideXml(spXml(2, 'Answers', MX, 300000, BODY_W, EMU_H - 600000, paras, true)));
    }
    return out;
  }
  async function buildPptx(qs, o) {
    o = o || {};
    o._figs = await figuresFor(qs.concat((o.expl || []).map(function (e) { return e.q; })));
    var T = window.QB_PPT_TPL, slides = [];
    if (o.title) slides.push(slideXml(spXml(2, 'Title', MX, 2400000, BODY_W, 1400000, aPara(aRun(o.title, 3600, { b: true }), 3600) + aPara(aRun(qs.length + ' questions', 2000, { color: 'BFBFBF' }), 2000), false)));
    qs.forEach(function (q, i) { slides.push(questionSlide(q, i, o)); slides.push(slideXml('')); });
    if (o.answers && o.answerKey) slides = slides.concat(keySlides(qs));
    if (o.expl && o.expl.length) {
      slides.push(slideXml(spXml(2, 'Explanations', MX, 2400000, BODY_W, 1400000, aPara(aRun('Explanations', 3600, { b: true }), 3600), false)));
      o.expl.forEach(function (e) { slides.push(questionSlide(e.q, e.n - 1, Object.assign({}, o, { answers: false }))); slides.push(slideXml('')); });
    }
    var files = [], ct = '', sldIds = '', presRels = [['rId1', 'slideMaster', 'slideMasters/slideMaster1.xml'], ['rId2', 'presProps', 'presProps.xml'], ['rId3', 'viewProps', 'viewProps.xml'], ['rId4', 'theme', 'theme/theme1.xml'], ['rId5', 'tableStyles', 'tableStyles.xml']];
    slides.forEach(function (x, i) {
      var n = i + 1, sr = [['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml']];
      if (window.QB_LOGO_B64) sr.push(['rId3', 'image', '../media/logo.png']);
      if (typeof x !== 'string') {
        if (x.fig) { sr.push(['rId2', 'image', '../media/fig' + x.fig.n + '.png']); if (!x.fig.added) { x.fig.added = true; files.push({ name: 'ppt/media/fig' + x.fig.n + '.png', data: x.fig.png }); } }
        x = x.xml;
      }
      files.push({ name: 'ppt/slides/slide' + n + '.xml', data: x });
      files.push({ name: 'ppt/slides/_rels/slide' + n + '.xml.rels', data: rels(sr) });
      ct += '<Override PartName="/ppt/slides/slide' + n + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>';
      sldIds += '<p:sldId id="' + (256 + i) + '" r:id="rId' + (100 + n) + '"/>';
      presRels.push(['rId' + (100 + n), 'slide', 'slides/slide' + n + '.xml']);
    });
    var pres = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="' + NS_A + '" xmlns:r="' + NS_R + '" xmlns:p="' + NS_P + '" saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>' + sldIds + '</p:sldIdLst><p:sldSz cx="' + EMU_W + '" cy="' + EMU_H + '"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle><a:defPPr><a:defRPr lang="en-US"/></a:defPPr></p:defaultTextStyle></p:presentation>';
    var types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>' +
      '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/><Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/><Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>' + ct + '</Types>';
    return zip([
      { name: '[Content_Types].xml', data: types },
      { name: '_rels/.rels', data: rels([['rId1', 'officeDocument', 'ppt/presentation.xml']]) },
      { name: 'ppt/presentation.xml', data: pres },
      { name: 'ppt/_rels/presentation.xml.rels', data: rels(presRels) },
      { name: 'ppt/slideMasters/slideMaster1.xml', data: T.master },
      { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ['rId2', 'theme', '../theme/theme1.xml']]) },
      { name: 'ppt/slideLayouts/slideLayout1.xml', data: T.layout },
      { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: rels([['rId1', 'slideMaster', '../slideMasters/slideMaster1.xml']]) },
      { name: 'ppt/theme/theme1.xml', data: T.theme },
      { name: 'ppt/presProps.xml', data: T.presProps },
      { name: 'ppt/viewProps.xml', data: T.viewProps },
      { name: 'ppt/tableStyles.xml', data: T.tableStyles }
    ].concat(window.QB_LOGO_B64 ? [{ name: 'ppt/media/logo.png', data: Uint8Array.from(atob(window.QB_LOGO_B64), function (c) { return c.charCodeAt(0); }) }] : [], files));
  }

  /* ================= ZIP (stored) ================= */
  var CRC = (function () { var t = [], c; for (var n = 0; n < 256; n++) { c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) {
    var enc = new TextEncoder(), parts = [], central = [], offset = 0;
    function u16(v) { return [v & 255, (v >>> 8) & 255]; }
    function u32(v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; }
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
      var head = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
      parts.push(new Uint8Array(head), name, data);
      central.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset))), name);
      offset += head.length + name.length + data.length;
    });
    var csize = central.reduce(function (s, p) { return s + p.length; }, 0);
    var end = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(csize), u32(offset), u16(0)));
    var list = parts.concat(central, [end]), len = list.reduce(function (s, p) { return s + p.length; }, 0), out = new Uint8Array(len), pos = 0;
    list.forEach(function (p) { out.set(p, pos); pos += p.length; });
    return out;
  }

  /* ================= PRINT HTML + PDF ================= */
  function richHtml(s, fig) {
    var mt = matchParse(s);
    if (mt) {
      var n = Math.max(mt.a.length, mt.b.length), rows = '<tr><th>' + esc(mt.h1) + '</th><th>' + esc(mt.h2) + '</th></tr>';
      for (var r = 0; r < n; r++) rows += '<tr><td>' + (mt.a[r] != null ? richHtml(mt.a[r]) : '') + '</td><td>' + (mt.b[r] != null ? richHtml(mt.b[r]) : '') + '</td></tr>';
      return (mt.pre.trim() ? richHtml(mt.pre, fig) : '') + '<table class="mt">' + rows + '</table>';
    }
    return String(fig ? figLines(s) : s).split('\n').map(function (line) {
      if (line.trim() === '{{figure}}') return fig && fig.svg ? '<div class="fig" style="margin:6px 0">' + String(fig.svg).replace(/<svg /, '<svg style="width:' + fig.w + 'px;height:' + fig.h + 'px" ') + '</div>' : '';
      return segments(line).map(function (sg) {
        if (sg.t === 'text') return boldParts(sg.v).map(function (bp) { return bp.b ? '<b>' + esc(bp.s) + '</b>' : esc(bp.s); }).join('');
        try { return window.__mh(sg.v, sg.display); } catch (e) { return esc(sg.v); }
      }).join('');
    }).join('<br>');
  }
  function optionsHtml(opts) {
    var cols = optCols(opts);
    if (!cols) return '';
    return '<div class="ops c' + cols + '">' + opts.map(function (op, j) { return '<div class="op"><b>(' + LET[j] + ')</b> ' + richHtml(op) + '</div>'; }).join('') + '</div>';
  }
  function qHtml(q, i, o) {
    return '<div class="meta">' + esc(metaLine(q)) + '</div><div class="qt"><b>Q' + (i + 1) + '.</b> ' + richHtml(q.question, q.figure) + '</div>' + optionsHtml(q.options || []) +
      (o.answers && !o.answerKey ? '<div class="ans"><b>Answer:</b> ' + esc(q.answer || '—') + '</div>' : '');
  }
  function keyHtml(qs, from, to) {
    return '<div class="key">' + qs.slice(from, to).map(function (q, k) { return '<div><b>' + (from + k + 1) + '.</b> ' + esc(q.answer || '—') + '</div>'; }).join('') + '</div>';
  }
  /* CSS scoped to .qbp (PDF pages) — also used, unscoped, by the print-file fallback */
  var PCSS = '.qbp .katex-html{display:none!important}.qbp{font-family:Arial,Helvetica,"Segoe UI",sans-serif;font-size:14px;line-height:1.55;color:#000;background:#fff}' +
    '.qbp .h1{font-size:20px;font-weight:700;margin:0}.qbp .meta{font-size:10.5px;color:#777;margin-bottom:2px}' +
    '.qbp .qt{margin-bottom:4px}.qbp .ops{display:grid;gap:2px 14px;margin-left:16px}.qbp .ops.c4{grid-template-columns:repeat(4,1fr)}.qbp .ops.c2{grid-template-columns:repeat(2,1fr)}.qbp .ops.c1{grid-template-columns:1fr}' +
    '.qbp .op{min-width:0}.qbp .ans{margin-top:3px}.qbp .keyh{font-size:17px;font-weight:700}.qbp .key{display:grid;grid-template-columns:repeat(6,1fr);gap:4px 12px}' +
    '.qbp table.mt{border-collapse:collapse;margin:6px 0 6px 16px;width:calc(100% - 16px)}.qbp .mt td,.qbp .mt th{border:1px solid #000;padding:4px 8px;text-align:left;vertical-align:middle}.qbp .mt th{background:#e7e6e6}.qbp math{font-size:1.05em}.qbp math[display=block]{margin:.25em 0}';
  var PAGE_W = 794, PAGE_H = 1123, PAD = 45, GAP = 16, CONTENT_W = PAGE_W - 2 * PAD, CONTENT_H = PAGE_H - 2 * PAD;

  function blocksFor(qs, o) {
    var b = [];
    if (o.title) b.push({ html: '<div class="h1">' + esc(o.title) + '</div>' });
    qs.forEach(function (q, i) { b.push({ html: qHtml(q, i, o), q: true }); });
    if (o.answers && o.answerKey) {
      b.push({ html: '<div class="keyh">Answer key</div>', breakBefore: !o.pptLayout });
      for (var s = 0; s < qs.length; s += 60) b.push({ html: keyHtml(qs, s, Math.min(qs.length, s + 60)) });
    }
    if (o.expl && o.expl.length) {
      b.push({ html: '<div class="keyh">Explanations</div>', breakBefore: !o.pptLayout });
      o.expl.forEach(function (e) { b.push({ html: '<div class="qt"><b>Q' + e.n + '.</b> ' + richHtml(e.q.question, e.q.figure) + '</div>' }); });
    }
    return b;
  }
  function loadImage(src) {
    return new Promise(function (res, rej) { var img = new Image(); img.onload = function () { res(img); }; img.onerror = function () { rej(new Error('Page image failed to load')); }; img.src = src; });
  }
  async function renderPage(nodes, scale) {
    var ser = new XMLSerializer(), inner = '';
    nodes.forEach(function (n) { inner += ser.serializeToString(n); });
    var xhtml = '<div xmlns="http://www.w3.org/1999/xhtml" class="qbp" style="width:' + PAGE_W + 'px;height:' + PAGE_H + 'px;box-sizing:border-box;padding:' + PAD + 'px;background:#fff;overflow:hidden">' +
      '<style>' + esc(PCSS + (window.QB_TEMML_CSS || '')).replace(/&quot;/g, '"') + '</style>' + inner + '</div>';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + PAGE_W * scale + '" height="' + PAGE_H * scale + '" viewBox="0 0 ' + PAGE_W + ' ' + PAGE_H + '"><foreignObject x="0" y="0" width="' + PAGE_W + '" height="' + PAGE_H + '">' + xhtml + '</foreignObject></svg>';
    var img = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
    var c = document.createElement('canvas'); c.width = PAGE_W * scale; c.height = PAGE_H * scale;
    var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    var blob = await new Promise(function (res, rej) { try { c.toBlob(function (b) { b ? res(b) : rej(new Error('Could not draw the page')); }, 'image/jpeg', 0.9); } catch (e) { rej(e); } });
    return { bytes: new Uint8Array(await blob.arrayBuffer()), w: c.width, h: c.height };
  }
  /* Build a real PDF: lay the questions out on A4 pages, draw each page to an image, wrap the images in a PDF. */
  async function buildPdf(qs, o, progress) {
    o = o || {};
    var host = document.createElement('div');
    host.className = 'qbp';
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:absolute;left:-40000px;top:0;width:' + CONTENT_W + 'px;';
    var st = document.createElement('style'); st.textContent = PCSS; host.appendChild(st);
    (document.querySelector('#dash-root') || document.body).appendChild(host);
    try {
      var blocks = blocksFor(qs, o).map(function (b) {
        var d = document.createElement('div'); d.innerHTML = b.html; d.style.cssText = 'margin:0 0 ' + GAP + 'px 0;break-inside:avoid'; host.appendChild(d);
        b.node = d; return b;
      });
      await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
      blocks.forEach(function (b) { b.h = Math.ceil(b.node.getBoundingClientRect().height); });
      /* paginate */
      var pages = [], cur = [], y = 0;
      var flush = function () { if (cur.length) pages.push(cur); cur = []; y = 0; };
      blocks.forEach(function (b) {
        if (o.pptLayout && b.q) { flush(); pages.push([b]); pages.push([]); return; }
        if (b.breakBefore) flush();
        if (y > 0 && y + b.h > CONTENT_H) flush();
        cur.push(b); y += b.h + GAP;
      });
      flush();
      var out = [], blank = null;
      for (var i = 0; i < pages.length; i++) {
        if (progress) progress(i + 1, pages.length);
        var pg = pages[i];
        if (!pg.length) { out.push(null); continue; }
        var tall = pg.length === 1 && pg[0].h > CONTENT_H;
        var nodes = pg.map(function (b) {
          var c = b.node.cloneNode(true);
          if (tall) { var s = CONTENT_H / b.h; c.style.cssText += ';transform:scale(' + s.toFixed(4) + ');transform-origin:0 0;width:' + CONTENT_W + 'px'; }
          return c;
        });
        out.push(await renderPage(nodes, 2));
      }
      return pdfFromImages(out);
    } finally { host.remove(); }
  }
  function pdfFromImages(pages) {
    var enc = new TextEncoder(), chunks = [], offs = [], pos = 0, W = 595.28, H = 841.89;
    var push = function (x) { var u = typeof x === 'string' ? enc.encode(x) : x; chunks.push(u); pos += u.length; };
    var obj = function (n, body) { offs[n] = pos; push(n + ' 0 obj\n'); body.forEach(push); push('\nendobj\n'); };
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'.replace(/[\u0080-ÿ]/g, 'A'));
    var n = pages.length, kids = [];
    for (var i = 0; i < n; i++) kids.push((3 + i * 3) + ' 0 R');
    obj(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
    obj(2, ['<< /Type /Pages /Count ' + n + ' /Kids [' + kids.join(' ') + '] >>']);
    pages.forEach(function (p, i) {
      var po = 3 + i * 3, co = po + 1, io = po + 2;
      var content = p ? 'q ' + W + ' 0 0 ' + H + ' 0 0 cm /Im0 Do Q' : '';
      obj(po, ['<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << ' + (p ? '/XObject << /Im0 ' + io + ' 0 R >> ' : '') + '>> /Contents ' + co + ' 0 R >>']);
      obj(co, ['<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream']);
      if (p) obj(io, ['<< /Type /XObject /Subtype /Image /Width ' + p.w + ' /Height ' + p.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.bytes.length + ' >>\nstream\n', p.bytes, '\nendstream']);
      else obj(io, ['null']);
    });
    var total = 3 + n * 3, xref = pos;
    var x = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
    for (var k = 1; k < total; k++) x += String(offs[k]).padStart(10, '0') + ' 00000 n \n';
    push(x + 'trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    var out = new Uint8Array(pos), q = 0; chunks.forEach(function (c) { out.set(c, q); q += c.length; });
    return out;
  }
  function printDocument(qs, o) {
    o = o || {};
    var body = blocksFor(qs, o).map(function (b) { return '<section class="' + (o.pptLayout && b.q ? 'brk' : 'blk') + '">' + b.html + '</section>' + (o.pptLayout && b.q ? '<section class="brk"></section>' : ''); }).join('');
    return '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(o.title || 'JEE Maths PYQs') + '</title><style>' + PCSS + (window.QB_TEMML_CSS || '') + '.blk{margin-bottom:16px;break-inside:avoid}.brk{break-after:page;min-height:1px}@page{size:A4;margin:12mm}</style></head><body class="qbp">' + body +
      '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},400)})<\/script></body></html>';
  }
  function plainText(q) { return q.question.replace(/\*\*/g, '').replace(FIG_RE, ' [figure] ') + '\n' + (q.options || []).map(function (op, j) { return '(' + LET[j] + ') ' + op; }).join('\n'); }

  window.QBX = { segments: segments, optCols: optCols, buildDocx: buildDocx, buildPptx: buildPptx, buildPdf: buildPdf, printDocument: printDocument, plainText: plainText, richHtml: richHtml, texToOmml: texToOmml, boldParts: boldParts, spaceCases: spaceCases };
})();

;
(function () {
  var root = document.querySelector('.qb');
  var $ = function (s, el) { return (el || root).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || root).querySelectorAll(s)); };

  /* ---------- calculations (readers see these in Sources) ---------- */
  dash.calc('counts', {
    inputs: ['pyq', 'nonpyq'],
    title: 'Questions by exam and year',
    description: 'Number of questions in the bank: all, PYQs per exam and year, and practice (non-PYQ) questions.',
    fn: function (pyq, nonpyq) {
      var ex = {}, pb = {};
      pyq.forEach(function (q) { ex[q.exam] = (ex[q.exam] || 0) + 1; });
      nonpyq.forEach(function (q) { var k = q.publisher || 'Practice'; pb[k] = (pb[k] || 0) + 1; });
      var g = function (m, k) { return m[k] || 0; };
      return [
        { group: 'all', n: pyq.length + nonpyq.length },
        { group: 'pyq', n: pyq.length },
        { group: 'nonpyq', n: nonpyq.length },
        { group: 'exam_main', n: g(ex, 'JEE Main') },
        { group: 'exam_adv', n: g(ex, 'JEE Advanced') },
        { group: 'exam_aieee', n: g(ex, 'AIEEE') },
        { group: 'exam_iit', n: g(ex, 'IIT') },
        { group: 'exam_kcet', n: g(ex, 'KCET') },
        { group: 'exam_iat', n: g(ex, 'IAT') },
        { group: 'exam_nda', n: g(ex, 'NDA') },
        { group: 'src_BlackBook', n: g(pb, 'Black Book') },
        { group: 'src_AllenEx', n: g(pb, 'Allen Ex') },
        { group: 'src_AllenDY', n: g(pb, 'Allen DY') }
      ];
    }
  });
  dash.calc('by_chapter', {
    inputs: ['chapters', 'pyq', 'nonpyq'],
    title: 'Questions per chapter',
    description: 'For every chapter, PYQs per exam and year, practice (non-PYQ) questions, and the total.',
    fn: function (chapters, pyq, nonpyq) {
      var P = {}, N = {};
      pyq.forEach(function (q) {
        var o = P[q.chapter_code] || (P[q.chapter_code] = { t: 0, e: {}, y: {} });
        o.t++; o.e[q.exam] = (o.e[q.exam] || 0) + 1;
        var yk = q.exam + '|' + Number(q.year); o.y[yk] = (o.y[yk] || 0) + 1;
      });
      nonpyq.forEach(function (q) {
        var o = N[q.chapter_code] || (N[q.chapter_code] = { t: 0, p: {} });
        o.t++; o.p[q.publisher] = (o.p[q.publisher] || 0) + 1;
      });
      return chapters.map(function (c) {
        var p = P[c.chapter_code] || { t: 0, e: {}, y: {} }, nn = N[c.chapter_code] || { t: 0, p: {} };
        var n = function (exam, year) { return p.y[exam + '|' + year] || 0; };
        var ex = function (exam) { return p.e[exam] || 0; };
        var sc = function (pb) { return nn.p[pb] || 0; };
        return { chapter_code: c.chapter_code, chapter: c.chapter, main_2025: n('JEE Main', 2025), main_2026: n('JEE Main', 2026), adv_2025: n('JEE Advanced', 2025), adv_2026: n('JEE Advanced', 2026), main_all: ex('JEE Main') + ex('AIEEE'), adv_all: ex('JEE Advanced') + ex('IIT'), kcet_all: ex('KCET'), iat_all: ex('IAT'), nda_all: ex('NDA'), src_BlackBook: sc('Black Book'), src_AllenEx: sc('Allen Ex'), src_AllenDY: sc('Allen DY'), nonpyq: nn.t, total: p.t + nn.t };
      });
    }
  });

  /* ---------- state ---------- */
  /* solutions: one file per chapter in Supabase Storage, fetched for the questions asked for (window.AvantiContent.sols) */
  var SOLM = {};
  function loadSol(ids) {
    var need = (ids || []).filter(function (id) { return !(id in SOLM); });
    if (!need.length || !window.AvantiContent) return Promise.resolve(SOLM);
    return window.AvantiContent.sols(need).then(function (m) { need.forEach(function (id) { SOLM[id] = m[id] || null; }); return SOLM; }).catch(function () { return SOLM; });   /* on a failure nothing is stored, so the next click tries again */
  }
  var PER_PAGE = 20, page = 0, lastKey = null;
  var S = { exam: new Set(), year: new Set(), cls: new Set(), diff: new Set(), type: new Set(), ch: new Set(), tp: new Set(), src: new Set(), q: '', onlySel: false, flag: false, same: false, attn: false, oos: false, oosx: false, sel: new Set() };
  S.oosx = false; /* out of syllabus questions are included by default */
  /* Question Bank opens first from qb/data/first.json (first cards + counts) while the full data downloads: PARTIAL holds the stub rows used for the header numbers and filter lists */
  var PARTIAL = null;
  function toRows(pyqArr, npArr) {
    return pyqArr.map(function (q) { return Object.assign({ source: 'PYQ' }, q); }).concat(npArr.map(function (q) { return Object.assign({}, q, { source: 'Non-PYQ' }); })).map(function (q) {
        var o = q.options; if (typeof o === 'string') { try { o = JSON.parse(o); } catch (e) { o = []; } }
        return { id: String(q.id), pyq: !!q.pyq, pyq_ref: q.pyq_ref ? String(q.pyq_ref) : '', pyq_exam: q.pyq_exam ? String(q.pyq_exam) : '', pyq_year: q.pyq_year ? Number(q.pyq_year) : null, pyq_paper: q.pyq_paper ? String(q.pyq_paper) : '', source: q.source, publisher: q.publisher ? String(q.publisher) : '', part: q.part ? String(q.part) : '', ref_year: q.ref_year ? Number(q.ref_year) : null, note: q.note ? String(q.note) : '', oos: !!q.oos, exam: q.exam, year: q.year ? Number(q.year) : null, session: q.session, paper: q.paper, qno: Number(q.qno) || 0, type: q.type, class: Number(q.class), chapter_code: q.chapter_code, chapter: q.chapter, topic_code: q.topic_code || '', topic: q.topic || '', sort_date: q.sort_date || '', difficulty: q.difficulty, attention: q.attention && QBP('attention') ? String(q.attention) : '', figure: normFig(q.figure || (FIGS && FIGS[String(q.id)])), question: q.question || '', options: o || [], answer: q.answer == null ? '' : String(q.answer), source_url: q.source_url || '', solution: q.solution ? String(q.solution) : '' };
      }
    );
  }
  window.__qbPartialStart = function (p) {
    if (p.figs) FIGS = p.figs;
    PARTIAL = { n: p.n, shown: p.shown, rows: toRows(p.sp, p.sn) };
    root.classList.add('qb-partial');
  };
  window.__qbPartialEnd = function () { PARTIAL = null; root.classList.remove('qb-partial'); lastKey = null; };
  var FIGS = null, figReady = Promise.resolve(), figStarted = false;
  function normFig(f) { if (typeof f === 'string') { try { f = JSON.parse(f); } catch (e) { f = null; } } return f && f.svg ? { svg: String(f.svg), w: Number(f.w) || 160, h: Number(f.h) || 120, card: f.card && (f.card.imgs || f.card.opts) ? f.card : null } : null; }
  /* pictures live in qb/data/figures.json and arrive after the first screen: fill them into the rows and redraw only the cards that have one */
  function attachFigures(figs) {
    FIGS = figs || {};
    Object.keys(FIGS).forEach(function (id) {
      var q = BYID[id]; if (!q) return;
      q.figure = normFig(FIGS[id]);
      var old = CARDS[id]; if (!old) return;
      var nu = buildCard(q); var num = old.querySelector('.qb-num'); if (num) nu.querySelector('.qb-num').textContent = num.textContent;
      CARDS[id] = nu; if (old.parentNode) old.parentNode.replaceChild(nu, old);
    });
    updateSelUI();
  }
  function startFigures() {
    if (figStarted) return; figStarted = true;
    var load = window.__getFigs ? window.__getFigs() : fetch('qb/data/figures.json').then(function (r) { if (!r.ok) throw new Error('figures'); return r.json(); });
    figReady = load.then(attachFigures).catch(function () { figStarted = false; });
  }
  function VR() { return PARTIAL ? PARTIAL.rows : ROWS; } /* overview numbers (counts, chapter-wise, weightage) never depend on any filter */
  var ROWS = [], BYID = {}, CHAPTERS = [], CHMAP = {}, TOPICS = [], tpBuiltFrom = null, CARDS = {}, builtFrom = null, npFrom = null, chBuiltFrom = null;
  var SESSION = { 2025: 'JEE 2025', 2026: 'JEE 2026' };
  var DIFF_ORDER = ['L1', 'L2', 'L3'];
  var TYPE_ORDER = ['MCQ', 'MSQ', 'Numerical', 'Matching', 'Comprehension', 'Subjective'];
  var LET = ['A', 'B', 'C', 'D', 'E', 'F'];

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* render text with \( \) and \[ \] math and \n line breaks */
  /* long display equations are broken over lines when they are built (no measuring needed): at a top-level = (or + / -), so every line stays within about what one screen line holds */
  function texCuts(tex) {
    var d = 0, env = 0, nl = false, bar = false, c1 = [], c2 = [], i, ch, prev = '';
    for (i = 0; i < tex.length; i++) {
      ch = tex[i];
      if (ch === '\\') {
        var m = /^\\[A-Za-z]+/.exec(tex.slice(i));
        if (m) {
          if (m[0] === '\\begin') env++; else if (m[0] === '\\end') env = Math.max(0, env - 1);
          if (m[0] === '\\left' || m[0] === '\\right') {
            d = m[0] === '\\left' ? d + 1 : Math.max(0, d - 1);
            var j = i + m[0].length; while (tex[j] === ' ') j++;
            var dm = /^(\\[A-Za-z]+|\\.|.)/.exec(tex.slice(j)); i = j + (dm ? dm[0].length : 0) - 1; prev = 'x'; continue;
          }
          if (m[0] === '\\not') { i += m[0].length - 1; prev = '!'; continue; }
          if (d === 0 && env === 0 && /^\\(le|ge|leq|geq|lt|gt|neq|ne|approx|equiv|Rightarrow|Leftrightarrow|implies|iff)$/.test(m[0]) && i > 0) c1.push(i);
          i += m[0].length - 1; prev = 'x'; continue;
        }
        if (tex[i + 1] === '\\' && d === 0 && env === 0) nl = true;
        i++; continue;
      }
      if (ch === '|') { bar = !bar; d += bar ? 1 : -1; if (d < 0) d = 0; }
      else if (ch === '(' || ch === '[' || ch === '{') d++;
      else if (ch === ')' || ch === ']' || ch === '}') d = Math.max(0, d - 1);
      else if (d === 0 && env === 0 && ch === '=' && i > 0 && prev !== '<' && prev !== '>' && prev !== '!') c1.push(i);
      else if (d === 0 && env === 0 && (ch === '<' || ch === '>') && i > 0) c1.push(i);
      else if (d === 0 && env === 0 && (ch === '+' || ch === '-') && i > 0 && /[A-Za-z0-9)\]}.|']/.test(prev)) c2.push(i);
      if (ch !== ' ') prev = ch;
    }
    var r = [c1, c2]; r.nl = nl; return r;
  }
  function texPieces(tex, pts) { var o = [], p = 0; pts.forEach(function (x) { o.push(tex.slice(p, x)); p = x; }); o.push(tex.slice(p)); return o.filter(function (s) { return s.trim(); }); }
  function texVis(t) { return t.replace(/\\(left|right|big|Big|bigg|Bigg|,|;|!|quad|qquad|displaystyle)/g, '').replace(/\\(log|sin|cos|tan|cot|sec|csc|lim|det|min|max|exp|ln|arg|sinh|cosh|tanh)\b/g, 'abc').replace(/\\[A-Za-z]+/g, 'x').replace(/[{}_^\s]/g, '').length; }
  window.__texCuts = texCuts; window.__texPieces = texPieces;
  function texLines(tex) {
    var vw = Math.min(window.innerWidth || 800, 960), max = Math.max(22, Math.floor((vw - 110) / 9.5));
    if (texVis(tex) <= max) return [tex];
    var cs = texCuts(tex), parts = []; if (cs.nl) return [tex];
    texPieces(tex, cs[0]).forEach(function (pt) { if (texVis(pt) <= max) parts.push(pt); else { var sub = texPieces(pt, texCuts(pt)[1]); parts.push.apply(parts, sub.length > 1 ? sub : [pt]); } });
    var lines = [], cur = '';
    parts.forEach(function (pt) { if (!cur || texVis(cur + pt) <= max) cur += pt; else { lines.push(cur); cur = pt; } });
    if (cur) lines.push(cur);
    return lines;
  }
  function renderRich(target, s, fig) {
    if (fig) s = String(s).replace(/\s*\{\{figure\}\}\s*/, '\n{{figure}}\n');
    /* matching questions: Column I and Column II side by side, row by row */
    var ls = String(s).split('\n'), c1 = -1, c2 = -1;
    var mw = 'Column';
    ls.forEach(function (l, k) { var m1 = /^\s*(Column|List)[\s-]*I\s*:?\s*$/i.exec(l); if (c1 < 0 && m1) { c1 = k; mw = /^list/i.test(m1[1]) ? 'List' : 'Column'; } else if (c1 >= 0 && c2 < 0 && /^\s*(Column|List)[\s-]*II\s*:?\s*$/i.test(l)) c2 = k; });
    if (c1 >= 0 && c2 > c1) {
      if (c1 > 0) renderRich(target, ls.slice(0, c1).join('\n'), fig);
      var colA = ls.slice(c1 + 1, c2).filter(function (l) { return l.trim(); }), colB = ls.slice(c2 + 1).filter(function (l) { return l.trim(); });
      var grid = el('div', 'qb-match'); var wideB = colB.some(function (l) { return String(l).replace(/\\\(|\\\)|\\[a-z]+|[{}^_ ]/gi, '').length > 40; });
      grid.style.cssText = 'display:grid;grid-template-columns:' + (wideB ? 'minmax(0,1fr) minmax(0,1fr)' : 'minmax(0,3fr) minmax(140px,1fr)') + ';column-gap:40px;row-gap:0;margin:10px 0 6px;align-items:stretch';
      var h1 = el('div', 'qb-mh', mw + ' I'), h2 = el('div', 'qb-mh', mw + ' II'); h1.style.fontWeight = h2.style.fontWeight = '700'; h1.style.paddingBottom = h2.style.paddingBottom = '6px'; grid.appendChild(h1); grid.appendChild(h2);
      for (var r = 0; r < Math.max(colA.length, colB.length); r++) {
        [colA[r], colB[r]].forEach(function (ln) { var cell = el('div', 'qb-mc'); cell.style.cssText = 'padding:10px 0;border-top:1px solid var(--qb-line, rgba(128,128,128,.22));min-width:0;display:flex;flex-direction:column;justify-content:center'; var inner = el('div', 'qb-mci'); cell.appendChild(inner); if (ln != null) renderRich(inner, ln, fig); grid.appendChild(cell); });
      }
      target.appendChild(grid); return;
    }
    var CI = fig && fig.card && fig.card.imgs, prevRow = false;
    String(s).split('\n').forEach(function (line, i) {
      var cm = CI && /^(.*?)\{\{f([1-9])\}\}\s*$/.exec(line);
      if (cm) {
        var im2 = CI[Number(cm[2]) - 1], row = el('div', 'qb-figrow');
        row.style.cssText = 'display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:4px 0';
        if (cm[1].trim()) { var tx = el('span', 'qb-figtxt'); renderRich(tx, cm[1], null); row.appendChild(tx); }
        if (im2 && im2.svg) { var ii = el('img', 'qb-fig'); ii.alt = 'Figure'; ii.width = im2.w; ii.height = im2.h; ii.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(im2.svg); row.appendChild(ii); }
        target.appendChild(row); prevRow = true; return;
      }
      if (line.trim() === '{{figure}}') {
        if (fig && fig.svg) { var im = el('img', 'qb-fig'); im.alt = 'Figure'; im.width = fig.w; im.height = fig.h; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fig.svg); target.appendChild(im); }
        return;
      }
      if (i && !line.trim()) return; /* a blank line in the text never makes an empty gap */
      var lastEl = target.lastChild; /* no empty line after a display equation: it already ends its own line */
      if (i && !prevRow && !(lastEl && lastEl.nodeType === 1 && /(^| )(mxw|mxd)( |$)/.test(lastEl.className))) target.appendChild(document.createElement('br'));
      prevRow = false;
      QBX.segments(line).forEach(function (sg) {
        if (sg.t === 'text') { QBX.boldParts(sg.v).forEach(function (bp) { if (bp.b) { var bb = document.createElement('b'); bb.textContent = bp.s; target.appendChild(bb); } else target.appendChild(document.createTextNode(bp.s)); }); return; }
        /* long display equations: cut at the top-level =, <, >, + and - signs and let the pieces wrap like words, so the equation goes on to the next line instead of needing a scroller (works the same with KaTeX and Temml, no measuring) */
        if (sg.display) {
          var wc = texCuts(sg.v), wp = wc.nl ? [] : texPieces(sg.v, wc[0].concat(wc[1]).sort(function (a, b) { return a - b; }));
          for (var wk = wp.length - 2; wk >= 0; wk--) if (texVis(wp[wk]) < 4) { wp[wk + 1] = wp[wk] + wp[wk + 1]; wp.splice(wk, 1); }
          if (wp.length > 1 && texVis(sg.v) > 18) {
            var wr = el('span', 'mx mxw');
            wp.forEach(function (t) { var pc = el('span', 'mxp'); try { pc.innerHTML = window.__mh('\\displaystyle ' + t, false); } catch (e) { pc.textContent = t; } wr.appendChild(pc); });
            if (!wr.querySelector('.katex-error,.tml-error,merror')) { target.appendChild(wr); return; }
          }
        }
        var span = el('span', sg.display ? 'mx mxd' : 'mx'); if (sg.display) span.dataset.tex = sg.v;
        var ls = null; /* equations that cannot be cut are shrunk to fit by the fit code below */
        if (ls && ls.length > 1) {
          ls.forEach(function (t, k) { var d = document.createElement('div'); d.className = 'ml' + (k ? ' cont' : ''); try { d.innerHTML = window.__mh(t, true); } catch (e) { d.textContent = t; } span.appendChild(d); });
          span.dataset.pre = '1';
        } else {
          try { span.innerHTML = window.__mh(sg.v, sg.display); }
          catch (e) { span.textContent = sg.v; }
        }
        target.appendChild(span);
      });
    });
  }

  /* chapter order; PYQs first: JEE Main (with AIEEE), JEE Advanced (with IIT), KCET, each newest first (year, month, day, shift); then practice questions by source: Cengage, Black Book, VMC (then any other), each in sheet order */
  var PUB_ORDER = ['Black Book', 'Allen Ex', 'Allen DY'];
  function pubRank(q) { var i = PUB_ORDER.indexOf(q.publisher); return i < 0 ? PUB_ORDER.length : i; }
  function examRank(q) { var e = q.exam; return e === 'JEE Main' || e === 'AIEEE' ? 0 : e === 'JEE Advanced' || e === 'IIT' ? 1 : e === 'KCET' ? 2 : e === 'IAT' ? 3 : e === 'NDA' ? 4 : 5; }
  function cmp(a, b) {
    var ca = CHMAP[a.chapter_code], cb = CHMAP[b.chapter_code];
    var oa = ca ? ca.order : 99, ob = cb ? cb.order : 99;
    if (oa !== ob) return oa - ob;
    var pa = a.source === 'PYQ' ? 0 : 1, pb = b.source === 'PYQ' ? 0 : 1;
    if (pa !== pb) return pa - pb;
    if (pa === 0) { var xa = examRank(a), xb = examRank(b); if (xa !== xb) return xa - xb; }
    else { var ra = pubRank(a), rb = pubRank(b); if (ra !== rb) return ra - rb; }
    var da = a.sort_date || '', db = b.sort_date || '';
    if (da !== db) return pa === 0 ? (da < db ? 1 : -1) : (da < db ? -1 : 1);
    var ea = a.exam === 'JEE Main' ? 0 : 1, eb = b.exam === 'JEE Main' ? 0 : 1;
    if (ea !== eb) return ea - eb;
    return (Number(a.qno) || 0) - (Number(b.qno) || 0);
  }


  /* ---------- teacher flags: what to correct, saved in this page's shared database ---------- */
  var FDB = null, FLAGS = {}, FKEY = 'avanti_qb_flags';
  function flagOf(q) { return FLAGS[q.id] ? FLAGS[q.id].note : ''; }
  function isSame(q) { return /^Same as (?:BB|AL)-/i.test(String(q.note || '')); }
  function isFlagged(q) { return !!((q.note && !isSame(q)) || flagOf(q)); }
  function flagCount() { return ROWS.filter(isFlagged).length; }
  /* Attention now covers everything that needs a check: the attention flag and the old Review notes */
  function needsAttn(q) { return !!q.attention || isFlagged(q); }
  function attnCount() { return ROWS.filter(needsAttn).length; }
  function sameCount() { return ROWS.filter(isSame).length; }
  function oosCount() { return ROWS.filter(function (q) { return q.oos; }).length; }
  /* Staff flags are shared by every Staff account through the database (qb_flags_list / qb_flag_set). */
  function loadFlags() {
    var A = window.AvantiAuth;
    if (!(A && A.rpc && QBP('staff'))) return;
    FDB = A;
    A.rpc('qb_flags_list').then(function (rows) {
      FLAGS = {}; try { localStorage.removeItem(FKEY); } catch (e) { /* old browser-only flags are not used any more */ }
      (rows || []).forEach(function (v) { if (v && v.id && v.note) FLAGS[v.id] = { note: String(v.note), at: v.at || 0 }; });
      Object.keys(CARDS).forEach(function (id) { if (CARDS[id] && CARDS[id].paintFlag) CARDS[id].paintFlag(); });
      apply();
    }).catch(function () { /* flags are not shown */ });
  }
  function saveFlag(q, text) {
    text = text.trim();
    if (!FDB) return Promise.reject(new Error('Flags are for Avanti staff'));
    var meta = { source: q.source, exam: q.exam, year: q.year || null, paper: q.paper || '', qno: q.qno || null, chapter_code: q.chapter_code, topic: q.topic || '', question: String(q.question || '').slice(0, 300) };
    return FDB.rpc('qb_flag_set', { p_qid: String(q.id), p_note: text, p_meta: meta }).then(function () {
      if (text) FLAGS[q.id] = { note: text, at: Date.now() }; else delete FLAGS[q.id];
      return 'shared';
    });
  }

  /* ---------- question cards ---------- */
  function buildCard(q) {
    var card = el('article', 'qb-q d-' + q.difficulty);
    card.dataset.id = q.id;
    var side = el('div', 'qb-side');
    side.appendChild(el('span', 'qb-num', ''));
    var cb = el('input'); cb.type = 'checkbox'; cb.setAttribute('aria-label', 'Select question'); cb.title = 'Select for export';
    cb.addEventListener('change', function () { toggleSel(q.id, cb.checked); });
    side.appendChild(cb);
    card.appendChild(side);
    var main = el('div'); main.style.minWidth = '0';
    var meta = el('div', 'qb-meta');
    if (q.source === 'Non-PYQ') {
      meta.appendChild(el('span', 'qb-tag np', 'Practice'));
      meta.appendChild(el('span', 'qb-tag', srcLabel(q)));
      if (q.pyq) { var pt = el('span', 'qb-tag ex-main', 'PYQ'); pt.title = 'This question is also a previous-year question' + (q.pyq_ref ? ' (' + q.pyq_ref + ')' : ''); meta.appendChild(pt); meta.appendChild(el('span', 'qb-date', q.pyq_paper + (q.pyq_exam === 'JEE Main' || !q.pyq_year ? '' : ' · ' + q.pyq_year))); }
      if (q.ref_year) meta.appendChild(el('span', 'qb-tag', '[' + q.ref_year + ']'));
    } else {
      meta.appendChild(el('span', 'qb-tag ' + (q.exam === 'JEE Main' ? 'ex-main' : 'ex-adv'), q.exam));
      meta.appendChild(el('span', 'qb-date', q.exam === 'JEE Main' || !q.year || String(q.paper).indexOf(String(q.year)) >= 0 ? q.paper : q.paper + ' · ' + q.year));
    }
    var bTop = null, bTyp = icoBtn('list', q.type, true);
    if (q.topic) { bTop = icoBtn('tag', (q.topic_code && !/^UNMAPPED/.test(q.topic_code) ? q.topic_code.replace(/^JM-/, '') + ' · ' : '') + q.topic, true); }
    var bId = icoBtn('hash', 'ID: ' + q.id, true); bId.classList.add('idg'); bId.title = 'Tap to copy the question ID';
    bId.addEventListener('click', function () {
      var t = q.id, tip = 'ID: ' + t, ok = function () { flash(bId, 'Copied ' + t); };
      if (!QBP('copy')) { flash(bId, tip); return; }
      try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(ok, function () { flash(bId, tip); }); return; } } catch (e) { }
      flash(bId, tip);
    });
    if (q.oos) meta.appendChild(el('span', 'qb-tag oos', 'Out of syllabus'));
    if (q.attention) meta.appendChild(el('span', 'qb-tag attn', 'Attention'));
    if (q.note && !isSame(q)) meta.appendChild(el('span', 'qb-tag rev', 'Review'));
    if (q.note && isSame(q)) { var sameTag = el('span', 'qb-same', q.note); sameTag.style.cssText = 'font-size:12.5px;color:inherit;background:none;border:0;padding:0 2px;font-weight:400'; meta.appendChild(sameTag); }
    meta.appendChild(el('span', 'qb-tag diff', q.difficulty));
    main.appendChild(meta);
    if (q.attention) main.appendChild(el('div', 'qb-attn', q.attention));
    if (q.note && !isSame(q)) main.appendChild(el('div', 'qb-note', q.note));
    var body = el('div', 'qb-body');
    var qt = el('div', 'qb-qt'); renderRich(qt, q.figure && q.figure.card ? q.figure.card.text : q.question, q.figure); body.appendChild(qt);
    var opts = q.options || [];
    var okSet = String(q.answer || '').toUpperCase().split(/[^A-F]+/).filter(Boolean);
    if (opts.length) {
      var hasOI = q.figure && q.figure.card && q.figure.card.opts && q.figure.card.opts.length; var og = el('div', 'qb-opts c' + (hasOI ? 2 : QBX.optCols(opts)));
      opts.forEach(function (o, j) {
        var d = el('div', 'qb-opt' + (okSet.indexOf(LET[j]) >= 0 && /^[A-F](\s*,\s*[A-F])*$/i.test(String(q.answer).trim()) ? ' ok' : ''));
        d.appendChild(el('b', null, LET[j])); var sp = el('span'); var oi = q.figure && q.figure.card && q.figure.card.opts && q.figure.card.opts[j]; if (oi && oi.svg) { var oim = el('img', 'qb-fig'); oim.alt = 'Option ' + LET[j]; oim.width = oi.w; oim.height = oi.h; oim.style.maxWidth = '100%'; oim.style.height = 'auto'; oim.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(oi.svg); sp.appendChild(oim); d.style.alignItems = 'flex-start'; } else renderRich(sp, o); d.appendChild(sp); og.appendChild(d);
      });
      body.appendChild(og);
      /* option layout rule: 4 in one line if every option fits on one line; else 2 + 2; else one per row */
      if (!hasOI) {
        var lastW = -1;
        var layOpts = function () {
          if (!og.isConnected || !og.offsetWidth || og.offsetWidth === lastW) return; lastW = og.offsetWidth;
          var n = opts.length, modes = [n <= 4 ? n : 4, 2, 1].filter(function (m, k, a) { return m >= 1 && a.indexOf(m) === k && m <= Math.max(n, 1); });
          var spans = og.querySelectorAll('.qb-opt>span');
          for (var k = 0; k < modes.length; k++) {
            var m = modes[k]; og.className = 'qb-opts m' + m + (m > 1 ? ' nw' : '');
            if (m === 1) { og.className = 'qb-opts m1'; break; }
            var bad = Array.prototype.some.call(spans, function (sp) { return sp.scrollWidth > sp.clientWidth + 1; });
            if (!bad) break;
            if (k === modes.length - 1) og.className = 'qb-opts m1';
          }
        };
        og.className = 'qb-opts m1';
        if (window.ResizeObserver) { var ro = new ResizeObserver(layOpts); ro.observe(og); } else layOpts();
      }
    }
    main.appendChild(body);
    var foot = el('div', 'qb-foot');
    var bAns = icoBtn('eye', 'Reveal answer');
    var ans = el('span', 'qb-ans', 'Answer: ' + (q.answer || 'not available'));
    bAns.addEventListener('click', function () { var on = card.classList.toggle('rev'); setIco(bAns, on ? 'eyeoff' : 'eye', on ? 'Hide answer' : 'Reveal answer'); bAns.classList.toggle('on', on); });
    var bCopy = el('button', 'qb-lnk', 'Copy'); bCopy.type = 'button'; bCopy.title = 'Copy the question with its equations';
    bCopy.addEventListener('click', function () { copyRich(q, body, bCopy); });
    var bTex = el('button', 'qb-lnk', 'Copy LaTeX'); bTex.type = 'button';
    bTex.addEventListener('click', function () { copyPlain(QBX.plainText(q), bTex); });
    foot.appendChild(ans);
    var bSol = icoBtn('book', 'Full explanation');
    var solBox = el('div', 'qb-sol'); solBox.hidden = true;
    solBox.appendChild(el('div', 'qb-sol-h', 'Full explanation')); var sb = el('div', 'qb-sol-b');
    if (q.solution) renderRich(sb, q.solution); else { sb.className = 'qb-sol-b qb-sol-none'; sb.textContent = 'Full explanation not added yet.'; }
    solBox.appendChild(sb);
    bSol.addEventListener('click', function () {
      solBox.hidden = !solBox.hidden; setIco(bSol, 'book', solBox.hidden ? 'Full explanation' : 'Hide explanation'); bSol.classList.toggle('on', !solBox.hidden);
      if (!solBox.hidden && !q.solution && !sb.dataset.saved) {
        sb.dataset.saved = '1';
        /* solutions live in their own files (one per chapter), fetched the first time an explanation is opened */
        if (!(q.id in SOLM)) { sb.className = 'qb-sol-b'; sb.textContent = 'Loading\u2026'; }
        loadSol([q.id]).then(function (m) {
          if (m && m[q.id]) { var sv = m[q.id]; q.solution = typeof sv === 'string' ? sv : sv.t; sb.className = 'qb-sol-b'; sb.textContent = ''; renderRich(sb, q.solution, typeof sv === 'string' ? null : sv.f); return; }
          sb.className = 'qb-sol-b qb-sol-none'; sb.textContent = 'Full explanation not added yet.';
          if (window.__qbSavedSolution) window.__qbSavedSolution(q.id).then(function (text) { if (text) { sb.className = 'qb-sol-b'; sb.textContent = ''; renderRich(sb, text); } });
        });
      }
    });
    /* no footer link: the footer only holds the revealed answer */
    var bFlag = icoBtn('flag', 'Flag'); bFlag.title = 'Write what to correct in this question';
    var bMenu = icoBtn('menu', 'More'); bMenu.setAttribute('aria-haspopup', 'true'); bMenu.setAttribute('aria-expanded', 'false');
    if (!document.getElementById('qb-solfix')) { var sst = document.createElement('style'); sst.id = 'qb-solfix'; sst.textContent = '.qb-sol-b .mx.mxd{display:block;max-width:100%;padding:2px 0}'; document.head.appendChild(sst); } /* display equations in an explanation sit on their own line, like in the question */
    if (!document.getElementById('qb-ownerfix')) { var ost = document.createElement('style'); ost.id = 'qb-ownerfix'; ost.textContent = '.qb-ico.idg{color:var(--color-ok);background:color-mix(in srgb,var(--color-ok) 12%,var(--color-bg))}.qb-ico.idg,.qb-ico.idg *{color:var(--color-ok)!important}.qb-ico.idg:hover{background:color-mix(in srgb,var(--color-ok) 20%,var(--color-bg))}:root:not(.qb-is-owner) .qb-owneronly,:root:not(.qb-is-owner) .qb-flagf,:root:not(.qb-is-owner) .qb-note.mine,:root:not(.qb-is-owner) .qb-tag.rev.mine,:root:not(.qb-is-owner) .qb-fbox{display:none!important}'; document.head.appendChild(ost);
      document.documentElement.classList.toggle('qb-is-owner', QBP('staff')); } /* Flag and Review are for Staff only */
    if (!document.getElementById('qb-popfix')) { var pst = document.createElement('style'); pst.id = 'qb-popfix'; pst.textContent = '.qb-q.pop-open{z-index:40}'; document.head.appendChild(pst); } /* the open menu must sit above the next cards */
    var pop = el('div', 'qb-pop'); pop.hidden = true;
    [bTop, bTyp, bId, bFlag].forEach(function (b) { if (b) pop.appendChild(b); });
    bFlag.classList.add('soft', 'row'); setIco(bFlag, 'flag', 'Flag');
    bFlag.classList.add('qb-owneronly');
    function popCard() { return mwrap && mwrap.closest ? mwrap.closest('.qb-q') : null; }
    function popClose() { var pc = popCard(); if (pc) pc.classList.remove('pop-open'); pop.hidden = true; bMenu.setAttribute('aria-expanded', 'false'); bMenu.classList.remove('on'); document.removeEventListener('click', onDoc, true); }
    function onDoc(e) { if (!pop.contains(e.target) && e.target !== bMenu && !bMenu.contains(e.target)) popClose(); }
    bMenu.addEventListener('click', function () { if (pop.hidden) { pop.hidden = false; var pc = popCard(); if (pc) pc.classList.add('pop-open'); bMenu.setAttribute('aria-expanded', 'true'); bMenu.classList.add('on'); document.addEventListener('click', onDoc, true); } else popClose(); });
    bFlag.addEventListener('click', popClose);
    var acts = el('span', 'qb-acts'); acts.appendChild(bAns); acts.appendChild(bSol);
    var mwrap = el('span', 'qb-menu'); mwrap.appendChild(bMenu); mwrap.appendChild(pop); acts.appendChild(mwrap);
    var rgt = el('span', 'qb-right'); var dTag = meta.querySelector('.qb-tag.diff'); rgt.appendChild(acts); meta.appendChild(rgt);
    main.appendChild(foot);
    if (solBox) main.appendChild(solBox);
    var fbox = el('div', 'qb-fbox'); fbox.hidden = true;
    var ta = el('textarea', 'qb-ftext'); ta.rows = 3; ta.placeholder = 'What is wrong, and what should be done? (for example: option C should be 2π/3; answer key is B; figure missing)'; ta.setAttribute('aria-label', 'Flag note for this question');
    var frow = el('div', 'qb-frow2'); var bSave = el('button', 'qb-btn primary', 'Save flag'); bSave.type = 'button'; var bDel = el('button', 'qb-btn', 'Remove flag'); bDel.type = 'button'; var bX = el('button', 'qb-lnk', 'Close'); bX.type = 'button'; var fmsg = el('span', 'qb-fmsg');
    frow.appendChild(bSave); frow.appendChild(bDel); frow.appendChild(bX); frow.appendChild(fmsg);
    fbox.appendChild(ta); fbox.appendChild(frow); main.appendChild(fbox);
    var mine = el('div', 'qb-note mine'); mine.hidden = true; main.insertBefore(mine, body);
    var tag = el('span', 'qb-tag rev mine', 'Review'); tag.hidden = true; meta.insertBefore(tag, dTag || rgt);
    function paint() { var t = flagOf(q); mine.textContent = t; mine.hidden = !t; tag.hidden = !t; setIco(bFlag, 'flag', t ? 'Edit flag' : 'Flag'); bFlag.classList.toggle('flagged', !!t); bDel.hidden = !t; if (document.activeElement !== ta) ta.value = t; }
    card.appendChild(main);
    card.paintFlag = paint; paint();
    bFlag.addEventListener('click', function () { fbox.hidden = !fbox.hidden; if (!fbox.hidden) { ta.value = flagOf(q); ta.focus(); } });
    bX.addEventListener('click', function () { fbox.hidden = true; });
    function commit(text, done) {
      bSave.disabled = bDel.disabled = true; fmsg.textContent = 'Saving…';
      saveFlag(q, text).then(function (where) { paint(); apply(); fmsg.textContent = ''; bSave.disabled = bDel.disabled = false; fbox.hidden = true; if (where === 'browser') flash(bMenu, 'Saved on this browser only'); else flash(bMenu, done); })
        .catch(function (e) { bSave.disabled = bDel.disabled = false; fmsg.textContent = 'Could not save the flag: ' + (e && e.message ? e.message : 'try again') + '.'; });
    }
    bSave.addEventListener('click', function () { if (!ta.value.trim()) { fmsg.textContent = 'Type what to correct first.'; return; } commit(ta.value, 'Flag saved'); });
    bDel.addEventListener('click', function () { commit('', 'Flag removed'); });
    return card;
  }


  var QICO = {
    flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18"/><path d="M10.6 6.2A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.5 6.9A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    hash: '<path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
    list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    book: '<path d="M2 5.5C4.5 4 8 4 12 6c4-2 7.5-2 10-.5V19c-2.5-1.5-6-1.5-10 .5-4-2-7.5-2-10-.5z"/><path d="M12 6v13.5"/>'
  };
  function setIco(btn, name, label) { btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + QICO[name] + '</svg>'; if (btn.classList.contains('row')) { var sp = document.createElement('span'); sp.textContent = label; btn.appendChild(sp); } btn.title = label; btn.setAttribute('aria-label', label); }
  function icoBtn(name, label, row) { var b = el('button', row ? 'qb-ico row' : 'qb-ico'); b.type = 'button'; setIco(b, name, label); return b; }
  function flash(btn, text) {
    if (btn.classList.contains('row')) { var sp = btn.querySelector('span'); if (sp) { var o = sp.dataset.old || sp.textContent; sp.dataset.old = o; sp.textContent = text; setTimeout(function () { sp.textContent = o; delete sp.dataset.old; }, 1400); } return; }
    if (btn.classList.contains('qb-ico')) { btn.dataset.tip = text; btn.classList.add('flashed'); setTimeout(function () { btn.classList.remove('flashed'); }, 1400); return; } var old = btn.dataset.label || btn.textContent; btn.dataset.label = old; btn.textContent = text; setTimeout(function () { btn.textContent = old; }, 1400); }
  function execCopyNode(node) {
    var sel = window.getSelection(), r = document.createRange();
    r.selectNodeContents(node); sel.removeAllRanges(); sel.addRange(r);
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    sel.removeAllRanges(); return ok;
  }
  function copyRich(q, body, btn) {
    if (!QBP('copy')) { flash(btn, 'Copy needs Premium'); return; }
    var html = body.innerHTML, plain = QBX.plainText(q);
    var done = function () { flash(btn, 'Copied'); };
    var fallback = function () { flash(btn, execCopyNode(body) ? 'Copied' : 'Copy blocked'); };
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([plain], { type: 'text/plain' }) })]).then(done, fallback);
      } else fallback();
    } catch (e) { fallback(); }
  }
  function copyPlain(text, btn) {
    if (!QBP('copy')) { flash(btn, 'Copy needs Premium'); return; }
    var fallback = function () {
      var ta = el('textarea'); ta.value = text; ta.style.position = 'absolute'; ta.style.left = '-9999px'; root.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove(); flash(btn, ok ? 'Copied' : 'Copy blocked');
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { flash(btn, 'Copied'); }, fallback);
      else fallback();
    } catch (e) { fallback(); }
  }

  /* ---------- filters ---------- */
  function matches(q, skip) {
    var cp = comboPubs();
    if (skip !== 'exam' && S.exam.size && (q.source === 'PYQ' ? !S.exam.has(effExam(q, cp)) : !S.src.size)) return false;
    if (skip !== 'year' && S.year.size && (q.source === 'PYQ' ? !S.year.has(String(effYear(q, cp))) : !S.src.size)) return false;
    if (skip !== 'cls' && S.cls.size && !S.cls.has(String(q.class))) return false;
    if (skip !== 'diff' && S.diff.size && !S.diff.has(q.difficulty)) return false;
    if (skip !== 'type' && S.type.size && !S.type.has(q.type)) return false;
    if (skip !== 'ch' && S.ch.size && !S.ch.has(q.chapter_code)) return false;
    if (skip !== 'tp' && S.tp.size && !S.tp.has(q.topic_code)) return false;
    if (skip !== 'src' && S.src.size) {
      var sv = srcOf(q);
      if (cp.length) { if (!((q.pyq && cp.indexOf(sv) >= 0) || (sv !== 'PYQs' && cp.indexOf(sv) < 0 && S.src.has(sv)))) return false; }
      else if (!S.src.has(sv)) return false;
    }
    if (S.onlySel && !S.sel.has(q.id)) return false;
    if (S.attn && !needsAttn(q)) return false;
    if (S.same && !isSame(q)) return false;
    if (S.oosx && q.oos) return false;
    if (S.oos && !q.oos) return false;
    if (S.q) {
      var hay = (q.id + ' ' + q.question + ' ' + (q.options || []).join(' ') + ' ' + q.chapter + ' ' + q.paper).toLowerCase();
      if (hay.indexOf(S.q) < 0) return false;
    }
    return true;
  }

  /* ---------- everything about one year (opens when a year tile is clicked) ---------- */
  var YM = null, YM_FROM = null;
  function closeYear() { if (!YM) return; YM.remove(); YM = null; document.removeEventListener('keydown', ymKey, true); if (YM_FROM && YM_FROM.focus) { try { YM_FROM.focus(); } catch (e) { /* ignore */ } } }
  function ymKey(e) { if (e.key === 'Escape') { e.stopPropagation(); closeYear(); } }
  function makeYearBtn(t, y, exam, oos) {
    t.setAttribute('role', 'button'); t.tabIndex = 0; t.title = 'Open the summary' + (y ? ' of ' + (exam || '') + ' ' + y : ' of ' + (oos ? 'out-of-syllabus ' : '') + (exam || 'all') + ' questions');
    t.addEventListener('click', function () { openYear(y, t, exam, oos); });
    t.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openYear(y, t, exam, oos); } });
  }
  function openYear(y, from, exam, oos) {
    closeYear(); YM_FROM = from || null;
    var rows = VR().filter(function (q) { return q.source === 'PYQ' && (exam ? q.exam === exam : (q.exam !== 'KCET' && q.exam !== 'IAT' && q.exam !== 'NDA')) && (y == null || Number(q.year) === y) && (!oos || q.oos); });
    var exams = ['JEE Main', 'JEE Advanced', 'AIEEE', 'IIT', 'KCET', 'IAT', 'NDA'].filter(function (e) { return rows.some(function (q) { return q.exam === e; }); });
    var ov = el('div', 'qb-ymodal'); ov.addEventListener('mousedown', function (e) { if (e.target === ov) closeYear(); });
    var box = el('div', 'qb-ybox'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Summary ' + y);
    var head = el('div', 'qb-yhead');
    var ttl = (oos ? 'Out of syllabus' : (exam || 'All exams')) + (oos && exam ? ' · ' + exam : '') + (y != null ? ' · ' + y : ''); head.appendChild(el('h2', null, ttl + ' · all questions'));
    var x = el('button', 'qb-btn', 'Close'); x.type = 'button'; x.addEventListener('click', closeYear); head.appendChild(x);
    box.appendChild(head);
    var sum = el('div', 'qb-ysum');
    sum.appendChild(el('span', 'qb-tag', rows.length + ' PYQs'));
    if (exams.length > 1) exams.forEach(function (e) { sum.appendChild(el('span', 'qb-tag ' + (e === 'JEE Main' ? 'ex-main' : 'ex-adv'), e + ' ' + rows.filter(function (q) { return q.exam === e; }).length)); });
    ['L1', 'L2', 'L3'].forEach(function (d) { sum.appendChild(el('span', 'qb-tag', d + ' ' + rows.filter(function (q) { return q.difficulty === d; }).length)); });
    var at = rows.filter(function (q) { return !!q.attention; }).length; if (at) sum.appendChild(el('span', 'qb-tag attn', at + ' attention'));
    var fl = rows.filter(isFlagged).length; if (fl) sum.appendChild(el('span', 'qb-tag rev', fl + ' review'));
    var oy = oos ? 0 : rows.filter(function (q) { return q.oos; }).length; if (oy) sum.appendChild(el('span', 'qb-tag oos', oy + ' out of syllabus'));
    box.appendChild(sum);
    var act = el('div', 'qb-yact');
    var all = el('button', 'qb-btn primary', 'Show all these questions in the list'); all.type = 'button';
    all.addEventListener('click', function () { goYear(y, null, exam, oos); }); act.appendChild(all); box.appendChild(act);
    var cwh = el('h3', null, 'Chapter-wise'); box.appendChild(cwh); var selP = null;
    var wrap = el('div', 'qb-tablewrap qb-ytable'); var tbl = el('table'); var th = el('thead'); var hr = el('tr');
    var showEx = exams.length > 1; ['Code', 'Chapter'].concat(showEx ? exams : [], ['Total', 'L1', 'L2', 'L3', '']).forEach(function (h) { hr.appendChild(el('th', null, h)); });
    th.appendChild(hr); tbl.appendChild(th); var tb = el('tbody');
    function fill() {
    tb.innerHTML = ''; var rs = selP ? rows.filter(function (q) { return q.exam + '|' + q.paper === selP.k; }) : rows;
    cwh.textContent = 'Chapter-wise' + (selP ? ' · ' + selP.paper + ' (' + rs.length + ' questions)' : '');
    var tot = { e: {}, all: 0, L1: 0, L2: 0, L3: 0 };
    CHAPTERS.slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (c) {
      var mine = rs.filter(function (q) { return q.chapter_code === c.chapter_code; }); if (!mine.length) return;
      var tr = el('tr'); tr.appendChild(el('td', null, c.chapter_code)); tr.appendChild(el('td', null, c.chapter));
      exams.forEach(function (e) { var n = mine.filter(function (q) { return q.exam === e; }).length; tot.e[e] = (tot.e[e] || 0) + n; if (showEx) tr.appendChild(el('td', n ? null : 'z', String(n))); });
      tot.all += mine.length; tr.appendChild(el('td', null, String(mine.length)));
      ['L1', 'L2', 'L3'].forEach(function (d) { var n = mine.filter(function (q) { return q.difficulty === d; }).length; tot[d] += n; tr.appendChild(el('td', n ? null : 'z', String(n))); });
      var td = el('td'); var b = el('button', 'qb-lnk', 'Show'); b.type = 'button'; b.addEventListener('click', function () { goYear(y, c.chapter_code, exam, oos, selP && selP.paper); }); td.appendChild(b); tr.appendChild(td);
      tb.appendChild(tr);
    });
    var tr = el('tr', 'qb-ytot'); tr.appendChild(el('td', null, '')); tr.appendChild(el('td', null, 'Total'));
    if (showEx) exams.forEach(function (e) { tr.appendChild(el('td', null, String(tot.e[e] || 0))); });
    tr.appendChild(el('td', null, String(tot.all))); ['L1', 'L2', 'L3'].forEach(function (d) { tr.appendChild(el('td', null, String(tot[d]))); }); tr.appendChild(el('td', null, ''));
    tb.appendChild(tr);
    }
    fill(); tbl.appendChild(tb); wrap.appendChild(tbl); box.appendChild(wrap);
    // papers / shifts
    var pm = {}; rows.forEach(function (q) { var k = q.exam + '|' + q.paper; if (!pm[k]) pm[k] = { k: k, exam: q.exam, paper: q.paper, sd: q.sort_date || '', n: 0, ch: {}, L1: 0, L2: 0, L3: 0 }; pm[k].n++; if (pm[k][q.difficulty] != null) pm[k][q.difficulty]++; pm[k].ch[q.chapter_code] = 1; });
    var plist = Object.keys(pm).map(function (k) { return pm[k]; }).sort(function (a, b) { return a.exam === b.exam ? (a.sd < b.sd ? 1 : a.sd > b.sd ? -1 : 0) : (a.exam < b.exam ? -1 : 1); });
    var nMain = plist.filter(function (p) { return p.exam === 'JEE Main'; }).length;
    var kind = nMain === plist.length ? 'Shift' : (nMain === 0 ? 'Paper' : 'Paper / shift');
    var kindPl = nMain === plist.length ? 'Shifts' : (nMain === 0 ? 'Papers' : 'Papers and shifts');
    box.appendChild(el('h3', null, kindPl + ' (' + plist.length + ')'));
    var hint = el('div', 'qb-ysum', 'Click a ' + kind.toLowerCase() + ' to see only its questions in the chapter-wise table above. Click it again to see all.'); hint.style.fontSize = '12px'; hint.style.opacity = '.7'; box.appendChild(hint);
    var pw = el('div', 'qb-tablewrap qb-ytable'); var pt = el('table'); var pth = el('thead'); var phr = el('tr');
    [kind, 'Questions', 'Chapters', 'L1', 'L2', 'L3'].forEach(function (h) { phr.appendChild(el('th', null, h)); }); pth.appendChild(phr); pt.appendChild(pth);
    var ptb = el('tbody'); plist.forEach(function (p) { var r = el('tr'); r.style.cursor = 'pointer'; r.tabIndex = 0; r.title = 'Show only this ' + kind.toLowerCase() + ' in the chapter-wise table'; r.appendChild(el('td', null, (showEx ? p.exam + ' · ' : '') + p.paper)); r.appendChild(el('td', null, String(p.n))); r.appendChild(el('td', null, String(Object.keys(p.ch).length))); ['L1', 'L2', 'L3'].forEach(function (d) { r.appendChild(el('td', p[d] ? null : 'z', String(p[d]))); });
      function pick() { var on = !(selP && selP.k === p.k); selP = on ? p : null; Array.prototype.forEach.call(ptb.children, function (t) { t.style.background = ''; t.style.outline = ''; }); if (on) { r.style.background = 'rgba(80,140,255,.18)'; r.style.outline = '1px solid rgba(80,140,255,.6)'; } fill(); }
      r.addEventListener('click', pick); r.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }); ptb.appendChild(r); });
    pt.appendChild(ptb); pw.appendChild(pt); box.appendChild(pw);
    ov.appendChild(box); root.appendChild(ov); YM = ov;
    document.addEventListener('keydown', ymKey, true); x.focus();
  }
  function goYear(y, ch, ex, oos, pp) {
    S.exam.clear(); S.ch.clear(); S.tp.clear(); S.year.clear(); S.src.clear(); if (y != null) S.year.add(String(y)); if (ch) S.ch.add(ch); if (ex) S.exam.add(ex);
    S.same = false; S.attn = false; S.oos = !!oos; if (oos) { S.oosx = false; try { localStorage.setItem('oosEx2', '0'); } catch (e) { /* ignore */ } buildChips(); } S.q = pp ? String(pp).toLowerCase() : ''; var se = $('.qb-search'); if (se) se.value = pp || '';
    closeYear(); apply();
    var r = $('.qb-results'); if (r && r.scrollIntoView) r.scrollIntoView({ block: 'start' });
  }
  function goOos(exam) {
    S.exam.clear(); S.ch.clear(); S.tp.clear(); S.year.clear(); S.src.clear(); S.diff.clear(); S.type.clear(); S.cls.clear();
    if (exam) S.exam.add(exam);
    S.same = false; S.attn = false; S.oos = true; S.oosx = false; try { localStorage.setItem('oosEx2', '0'); } catch (e) { /* ignore */ } buildChips(); S.q = ''; var se = $('.qb-search'); if (se) se.value = '';
    apply();
    var r = $('.qb-results'); if (r && r.scrollIntoView) r.scrollIntoView({ block: 'start' });
  }
  function makeSrcBtn(t, v) {
    t.setAttribute('role', 'button'); t.tabIndex = 0; t.title = 'Open the summary of ' + v + ' questions';
    t.addEventListener('click', function () { openSource(v, t); });
    t.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSource(v, t); } });
  }
  function exOf(q) { var m = /Exercise-(\d)/.exec(q.paper || q.section || ''); var n = m ? Number(m[1]) : 0; if (q.type === 'Matching') n = 4; else if (q.type === 'Numerical' || q.type === 'Subjective') n = 5; return n; }
  function goSrc(v, ch) {
    S.exam.clear(); S.ch.clear(); S.tp.clear(); S.year.clear(); S.src.clear(); S.diff.clear(); S.type.clear(); S.cls.clear(); S.src.add(v); if (ch) S.ch.add(ch);
    S.same = false; S.attn = false; S.oos = false; S.q = ''; var se = $('.qb-search'); if (se) se.value = '';
    closeYear(); apply();
    var r = $('.qb-results'); if (r && r.scrollIntoView) r.scrollIntoView({ block: 'start' });
  }
  function openSource(v, from) {
    closeYear(); YM_FROM = from || null;
    var rows = VR().filter(function (q) { return q.source !== 'PYQ' && srcOf(q) === v; });
    var isBB = v === 'Black Book' || v === 'Allen Ex' || v === 'Allen DY', EX = [1, 2, 3, 4, 5];
    var EXN = { 1: 'Ex-1 Single', 2: 'Ex-2 Multi', 3: 'Ex-3 Compr.', 4: 'Ex-4 Match', 5: 'Ex-5 Subj.' };
    var ov = el('div', 'qb-ymodal'); ov.addEventListener('mousedown', function (e) { if (e.target === ov) closeYear(); });
    var box = el('div', 'qb-ybox'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', v + ' summary');
    var head = el('div', 'qb-yhead');
    head.appendChild(el('h2', null, v + ' · all questions'));
    var x = el('button', 'qb-btn', 'Close'); x.type = 'button'; x.addEventListener('click', closeYear); head.appendChild(x);
    box.appendChild(head);
    var sum = el('div', 'qb-ysum');
    sum.appendChild(el('span', 'qb-tag', rows.length + ' questions'));
    if (isBB) EX.forEach(function (e) { sum.appendChild(el('span', 'qb-tag', 'Exercise-' + e + ' ' + rows.filter(function (q) { return exOf(q) === e; }).length)); });
    ['L1', 'L2', 'L3'].forEach(function (d) { sum.appendChild(el('span', 'qb-tag', d + ' ' + rows.filter(function (q) { return q.difficulty === d; }).length)); });
    var at = rows.filter(function (q) { return !!q.attention; }).length; if (at) sum.appendChild(el('span', 'qb-tag attn', at + ' attention'));
    var fl = rows.filter(isFlagged).length; if (fl) sum.appendChild(el('span', 'qb-tag rev', fl + ' review'));
    box.appendChild(sum);
    var act = el('div', 'qb-yact');
    var all = el('button', 'qb-btn primary', 'Show all ' + v + ' questions in the list'); all.type = 'button';
    all.addEventListener('click', function () { goSrc(v, null); }); act.appendChild(all); box.appendChild(act);
    box.appendChild(el('h3', null, 'Chapter-wise'));
    var wrap = el('div', 'qb-tablewrap qb-ytable'); var tbl = el('table'); var th = el('thead'); var hr = el('tr');
    var cols = ['Code', 'Chapter'].concat(isBB ? EX.map(function (e) { return EXN[e]; }) : [], ['Total', 'L1', 'L2', 'L3', '']);
    cols.forEach(function (h) { hr.appendChild(el('th', null, h)); });
    th.appendChild(hr); tbl.appendChild(th); var tb = el('tbody');
    var tot = { ex: {}, all: 0, L1: 0, L2: 0, L3: 0 };
    CHAPTERS.slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (c) {
      var mine = rows.filter(function (q) { return q.chapter_code === c.chapter_code; }); if (!mine.length) return;
      var tr = el('tr'); tr.appendChild(el('td', null, c.chapter_code)); tr.appendChild(el('td', null, c.chapter));
      if (isBB) EX.forEach(function (e) { var n = mine.filter(function (q) { return exOf(q) === e; }).length; tot.ex[e] = (tot.ex[e] || 0) + n; tr.appendChild(el('td', n ? null : 'z', String(n))); });
      tot.all += mine.length; tr.appendChild(el('td', null, String(mine.length)));
      ['L1', 'L2', 'L3'].forEach(function (d) { var n = mine.filter(function (q) { return q.difficulty === d; }).length; tot[d] += n; tr.appendChild(el('td', n ? null : 'z', String(n))); });
      var td = el('td'); var b = el('button', 'qb-lnk', 'Show'); b.type = 'button'; b.addEventListener('click', function () { goSrc(v, c.chapter_code); }); td.appendChild(b); tr.appendChild(td);
      tb.appendChild(tr);
    });
    var tr = el('tr', 'qb-ytot'); tr.appendChild(el('td', null, '')); tr.appendChild(el('td', null, 'Total'));
    if (isBB) EX.forEach(function (e) { tr.appendChild(el('td', null, String(tot.ex[e] || 0))); });
    tr.appendChild(el('td', null, String(tot.all))); ['L1', 'L2', 'L3'].forEach(function (d) { tr.appendChild(el('td', null, String(tot[d]))); }); tr.appendChild(el('td', null, ''));
    tb.appendChild(tr); tbl.appendChild(tb); wrap.appendChild(tbl); box.appendChild(wrap);
    if (!rows.length) box.appendChild(el('p', null, 'No ' + v + ' questions in the bank yet.'));
    ov.appendChild(box); root.appendChild(ov); YM = ov;
    document.addEventListener('keydown', ymKey, true); x.focus();
  }
  function buildYearTiles() {
    var host = document.getElementById('tiles'); if (!host) return;
    host.replaceChildren();
    function box(cls, lbl, n) {
      var t = document.createElement('div'); t.className = cls;
      var l = document.createElement('div'); l.className = 'lbl'; l.textContent = lbl;
      var v = document.createElement('div'); v.className = 'num'; v.textContent = Number(n).toLocaleString('en-US');
      t.appendChild(l); t.appendChild(v); return t;
    }
    function row(hue, head, subs) {
      var r = document.createElement('div'); r.className = 'qb-trow ' + hue;
      r.appendChild(head); subs.forEach(function (s) { r.appendChild(s); }); host.appendChild(r);
    }
    var pyq = VR().filter(function (q) { return q.source === 'PYQ'; });
    var np = VR().filter(function (q) { return q.source !== 'PYQ'; });
    row('h-all', box('qb-tile all', 'All questions', pyq.length + np.length), [box('qb-tile', 'PYQs', pyq.length)]);
    [['JEE Main', 'h-main'], ['JEE Advanced', 'h-adv'], ['AIEEE', 'h-old'], ['IIT', 'h-old'], ['KCET', 'h-kcet'], ['IAT', 'h-iat'], ['NDA', 'h-nda']].forEach(function (e) {
      var mine = pyq.filter(function (q) { return q.exam === e[0]; }), cnt = {};
      mine.forEach(function (q) { if (q.year) cnt[q.year] = (cnt[q.year] || 0) + 1; });
      var eh = box('qb-tile', e[0], mine.length); makeYearBtn(eh, null, e[0]);
      row(e[1], eh, Object.keys(cnt).sort(function (x, y) { return Number(y) - Number(x); }).map(function (y) { var t = box('qb-ytile', y, cnt[y]); makeYearBtn(t, Number(y), e[0]); return t; }));
    });
    var oosRows = pyq.filter(function (q) { return q.oos; });
    if (oosRows.length) {
      var oh = box('qb-tile', 'Out of syllabus', oosRows.length); makeYearBtn(oh, null, null, true);
      row('h-oos', oh, ['JEE Main', 'JEE Advanced', 'AIEEE', 'IIT', 'NDA'].filter(function (e) { return oosRows.some(function (q) { return q.exam === e; }); }).map(function (e) { var t = box('qb-ytile', e === 'JEE Advanced' ? 'Advanced' : e, oosRows.filter(function (q) { return q.exam === e; }).length); makeYearBtn(t, null, e, true); return t; }));
    }
    var sc = {}; np.forEach(function (q) { var k = srcOf(q); sc[k] = (sc[k] || 0) + 1; });
    row('h-np', box('qb-tile', 'Non-PYQ', np.length), SRC_VALS.filter(function (v) { return v !== 'PYQs'; }).map(function (v) { var t = box('qb-ytile', v, sc[v] || 0); makeSrcBtn(t, v); return t; }));
  }
  function buildChips() {
    buildYearTiles();
    var defs = {
      src: { vals: SRC_VALS, label: function (v) { return v; } },
      exam: { vals: EXAM_VALS, label: function (v) { return v; } },
      year: { vals: uniq(VR().filter(function (q) { return q.year; }).map(function (q) { return String(q.year); })).sort(), label: function (v) { return SESSION[v] || v; } },
      cls: { vals: uniq(VR().map(function (q) { return String(q.class); })).sort(), label: function (v) { return 'Class ' + v; } },
      diff: { vals: DIFF_ORDER.filter(function (d) { return VR().some(function (q) { return q.difficulty === d; }); }), label: function (v) { return v; } },
      type: { vals: TYPE_ORDER.filter(function (d) { return VR().some(function (q) { return q.type === d; }); }), label: function (v) { return v; } }
    };
    defs.year.vals = defs.year.vals.slice().sort(function (a, b) { return Number(b) - Number(a); });
    defs.year.label = function (v) { return v; };
    var DD = { cls: 'All classes', src: 'All sources', exam: 'All exams', year: 'All years', diff: 'All levels', type: 'All question types' };
    defs.diff.label = function (v) { return { L1: 'L1 \u00b7 Easy', L2: 'L2 \u00b7 Medium', L3: 'L3 \u00b7 Hard' }[v] || v; };
    DDS = [];
    $$('.qb-chips[data-f], .qb-dd[data-f]').forEach(function (box) {
      var f = box.dataset.f, d = defs[f];
      if (DD[f]) { buildDropdown(box, f, d, DD[f]); return; }
      box.replaceChildren();
      d.vals.forEach(function (v) {
        var b = el('button', 'qb-chip', d.label(v)); b.type = 'button'; b.dataset.v = v;
        b.addEventListener('click', function () { if (S[f].has(v)) S[f].delete(v); else S[f].add(v); apply(); });
        box.appendChild(b);
      });
    });
  }
  var SRC_VALS = ['PYQs', 'Black Book', 'Allen Ex', 'Allen DY'], EXAM_VALS = ['JEE Main', 'JEE Advanced', 'AIEEE', 'IIT', 'KCET', 'IAT', 'NDA'];
  function srcLabel(q) { return q.publisher || 'Practice'; }
  function srcOf(q) { return q.source === 'PYQ' ? 'PYQs' : (q.publisher || 'Practice'); }
  /* "PYQs" ticked together with a source that has PYQ-tagged questions (Black Book) = the PYQs of that source only */
  var PYQ_PUBS = {};
  function comboPubs() { return []; if (!S.src.has('PYQs')) return []; var r = []; Object.keys(PYQ_PUBS).forEach(function (p) { if (S.src.has(p)) r.push(p); }); return r; }
  function effExam(q, cp) { return cp.length && q.pyq && q.pyq_exam ? q.pyq_exam : q.exam; }
  function effYear(q, cp) { return cp.length && q.pyq && q.pyq_year ? q.pyq_year : q.year; }
  var DDS = [];
  function buildDropdown(box, f, d, allLabel) {
    box.classList.remove('qb-chips'); box.classList.add('qb-ms', 'qb-dd'); box.replaceChildren();
    var btn = el('button', 'qb-ms-btn', allLabel); btn.type = 'button'; btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', 'false');
    var panel = el('div', 'qb-ms-panel'); panel.hidden = true;
    var tools = el('div', 'qb-ms-tools');
    var bAll = el('button', 'qb-btn', 'All'); bAll.type = 'button'; var bNone = el('button', 'qb-btn', 'Clear'); bNone.type = 'button';
    tools.appendChild(bAll); tools.appendChild(bNone); panel.appendChild(tools);
    var list = el('div', 'qb-ms-list'); panel.appendChild(list); box.appendChild(btn); box.appendChild(panel);
    function open(o) { panel.hidden = !o; btn.setAttribute('aria-expanded', String(o)); }
    btn.addEventListener('click', function () { open(panel.hidden); });
    document.addEventListener('click', function (e) { if (!panel.hidden && e.target.isConnected && !box.contains(e.target)) open(false); });
    box.addEventListener('keydown', function (e) { if (e.key === 'Escape') { open(false); btn.focus(); } });
    bAll.addEventListener('click', function () { d.vals.forEach(function (v) { S[f].add(v); }); apply(); });
    bNone.addEventListener('click', function () { S[f].clear(); apply(); });
    var boxes = {};
    d.vals.forEach(function (v) {
      var lab = el('label', 'qb-ms-item'); var cb = el('input'); cb.type = 'checkbox';
      cb.addEventListener('change', function () { if (cb.checked) S[f].add(v); else S[f].delete(v); apply(); });
      var n = el('span', 'n', '0'); lab.appendChild(cb); lab.appendChild(el('span', null, d.label(v))); lab.appendChild(n); list.appendChild(lab);
      boxes[v] = { cb: cb, n: n, lab: lab };
    });
    DDS.push(function () {
      var counts = {};
      ROWS.forEach(function (q) { if (matches(q, f) && (q.source === 'PYQ' || (f !== 'exam' && f !== 'year'))) { var k = f === 'cls' ? String(q.class) : f === 'diff' ? q.difficulty : f === 'src' ? srcOf(q) : f === 'exam' ? effExam(q, comboPubs()) : f === 'year' ? String(effYear(q, comboPubs())) : q.type; counts[k] = (counts[k] || 0) + 1; } });
      d.vals.forEach(function (v) { var b = boxes[v]; b.cb.checked = S[f].has(v); b.n.textContent = String(counts[v] || 0); b.lab.classList.toggle('zero', !counts[v]); });
      var sel = d.vals.filter(function (v) { return S[f].has(v); });
      btn.textContent = sel.length === 0 ? allLabel : sel.length <= 2 ? sel.map(d.label).join(', ') : sel.length + ' selected';
    });
  }
  function uniq(a) { var seen = new Set(); return a.filter(function (v) { if (seen.has(v)) return false; seen.add(v); return true; }); }

  /* chapter multi-select */
  var ms = $('#chapter-filter'), msBtn = $('.qb-ms-btn', ms), msPanel = $('.qb-ms-panel', ms), msList = $('.qb-ms-list', ms), msSearch = $('.qb-ms-search', ms);
  var chBefore = '';
  function openMs(open) {
    if (open === msPanel.hidden) {
      if (open) chBefore = Array.from(S.ch).sort().join(',');
      else if (S.ch.size && Array.from(S.ch).sort().join(',') !== chBefore) setTimeout(function () { openTp(true); }, 0);
    }
    msPanel.hidden = !open; msBtn.setAttribute('aria-expanded', String(open)); if (open) { msSearch.value = ''; drawMsList(); msSearch.focus(); }
  }
  msBtn.addEventListener('click', function () { openMs(msPanel.hidden); });
  document.addEventListener('click', function (e) { if (!msPanel.hidden && e.target.isConnected && !ms.contains(e.target)) openMs(false); });
  ms.addEventListener('keydown', function (e) { if (e.key === 'Escape') { openMs(false); msBtn.focus(); } });
  msSearch.addEventListener('input', drawMsList);
  $('.qb-ms-all', ms).addEventListener('click', function () { visibleChapters().forEach(function (c) { S.ch.add(c.chapter_code); }); apply(); });
  $('.qb-ms-none', ms).addEventListener('click', function () { S.ch.clear(); apply(); });
  function visibleChapters() {
    var s = msSearch.value.trim().toLowerCase();
    return CHAPTERS.filter(function (c) { return !s || (c.chapter_code + ' ' + c.chapter).toLowerCase().indexOf(s) >= 0; });
  }
  function drawMsList() {
    if (msPanel.hidden) return;
    var counts = {};
    ROWS.forEach(function (q) { if (matches(q, 'ch')) counts[q.chapter_code] = (counts[q.chapter_code] || 0) + 1; });
    msList.replaceChildren();
    [11, 12].forEach(function (cls) {
      var list = visibleChapters().filter(function (c) { return Number(c.class) === cls; });
      if (!list.length) return;
      msList.appendChild(el('div', 'qb-ms-grp', 'Class ' + cls));
      list.forEach(function (c) {
        var lab = el('label', 'qb-ms-item' + (counts[c.chapter_code] ? '' : ' zero'));
        var cb = el('input'); cb.type = 'checkbox'; cb.checked = S.ch.has(c.chapter_code);
        cb.addEventListener('change', function () { if (cb.checked) S.ch.add(c.chapter_code); else S.ch.delete(c.chapter_code); apply(); });
        lab.appendChild(cb); lab.appendChild(el('span', 'code', c.chapter_code)); lab.appendChild(el('span', null, c.chapter)); lab.appendChild(el('span', 'n', String(counts[c.chapter_code] || 0)));
        msList.appendChild(lab);
      });
    });
  }

  /* topic multi-select (shows once chapters are chosen) */
  var tf = $('#topic-filter'), tpBtn = $('.qb-ms-btn', tf), tpPanel = $('.qb-ms-panel', tf), tpList = $('.qb-ms-list', tf), tpSearch = $('.qb-ms-search', tf);
  function openTp(open) { if (open && !S.ch.size) return; tpPanel.hidden = !open; tpBtn.setAttribute('aria-expanded', String(open)); if (open) { tpSearch.value = ''; drawTpList(); tpSearch.focus(); tf.classList.remove('ask'); } }
  tpBtn.addEventListener('click', function () { openTp(tpPanel.hidden); });
  document.addEventListener('click', function (e) { if (!tpPanel.hidden && e.target.isConnected && !tf.contains(e.target) && !ms.contains(e.target)) openTp(false); });
  tf.addEventListener('keydown', function (e) { if (e.key === 'Escape') { openTp(false); tpBtn.focus(); } });
  tpSearch.addEventListener('input', drawTpList);
  $('.qb-ms-all', tf).addEventListener('click', function () { visibleTopics().forEach(function (t) { S.tp.add(t.topic_code); }); apply(); });
  $('.qb-ms-none', tf).addEventListener('click', function () { S.tp.clear(); apply(); });
  function visibleTopics() {
    var s = tpSearch.value.trim().toLowerCase();
    return TOPICS.filter(function (t) { return S.ch.has(t.chapter_code) && (!s || t.topic.toLowerCase().indexOf(s) >= 0); });
  }
  function drawTpList() {
    if (tpPanel.hidden) return;
    var counts = {};
    ROWS.forEach(function (q) { if (matches(q, 'tp')) counts[q.topic_code] = (counts[q.topic_code] || 0) + 1; });
    tpList.replaceChildren();
    CHAPTERS.filter(function (c) { return S.ch.has(c.chapter_code); }).forEach(function (c) {
      var list = visibleTopics().filter(function (t) { return t.chapter_code === c.chapter_code; });
      if (!list.length) return;
      tpList.appendChild(el('div', 'qb-ms-grp', c.chapter_code + ' · ' + c.chapter));
      list.forEach(function (t) {
        var lab = el('label', 'qb-ms-item' + (counts[t.topic_code] ? '' : ' zero'));
        var cb = el('input'); cb.type = 'checkbox'; cb.checked = S.tp.has(t.topic_code);
        cb.addEventListener('change', function () { if (cb.checked) S.tp.add(t.topic_code); else S.tp.delete(t.topic_code); apply(); });
        lab.appendChild(cb); if (!/^UNMAPPED/.test(t.topic_code)) lab.appendChild(el('span', 'code', t.topic_code.replace(/^JM-/, ''))); lab.appendChild(el('span', null, t.topic)); lab.appendChild(el('span', 'n', String(counts[t.topic_code] || 0)));
        tpList.appendChild(lab);
      });
    });
    if (!tpList.children.length) tpList.appendChild(el('div', 'qb-ms-grp', 'No topics match.'));
  }

  $('.qb-search').addEventListener('input', function (e) { S.q = e.target.value.trim().toLowerCase(); apply(); });
  $('.qb-onlysel').addEventListener('click', function () { S.onlySel = !S.onlySel; apply(); });
  $('.qb-samef').addEventListener('click', function () { S.same = !S.same; apply(); });
  (function () { /* the Filter menu: opens on click, closes on outside click or Escape */
    var fb = $('.qb-fbtn'), fp = $('.qb-fpop'); if (!fb || !fp) return;
    function setOpen(o) { fp.hidden = !o; fb.setAttribute('aria-expanded', String(o)); }
    fb.addEventListener('click', function (e) { e.stopPropagation(); setOpen(fp.hidden); });
    document.addEventListener('click', function (e) { if (!fp.hidden && !fp.contains(e.target) && e.target !== fb) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !fp.hidden) { setOpen(false); fb.focus(); } });
  })();
  $('.qb-attnf').addEventListener('click', function () { S.attn = !S.attn; apply(); });
  $('.qb-oosonly').addEventListener('click', function () { var on = !S.oos; S.oos = on; if (on && S.oosx) { setOosx(false); } apply(); });
  function setOosx(on) {
    S.oosx = on; if (on) S.oos = false;
    try { localStorage.setItem('oosEx2', on ? '1' : '0'); } catch (e) { /* ignore */ }
    buildChips(); drawWeight();
  }
  Array.prototype.forEach.call(document.querySelectorAll('.qb-oosx button'), function (b) { b.addEventListener('click', function () { var ex = b.dataset.v === 'ex'; if (ex !== S.oosx) { setOosx(ex); apply(); } }); });
  /* wide display equations: break them over lines at a top-level = (or + / -) so each line fits the card; a piece that is still too wide shrinks (down to 55 percent) and then scrolls */
  (function () {
    var qs = $('#questions'), raf = 0, mo = null;
    var cuts = window.__texCuts, pieces = window.__texPieces;
    function mk(tex) { var d = document.createElement('div'); d.className = 'ml'; try { d.innerHTML = window.__mh(tex, true); } catch (e) { d.textContent = tex; } return d; }
    /* how wide the equation really is, whatever the engine does with the width of the math element itself */
    function need(d) { var m = d.querySelector('math.tml-display') || d.querySelector('.katex-display > .katex'), r = 0; if (m) { r = Math.max(m.scrollWidth, m.getBoundingClientRect().width); var k = m.firstElementChild; if (k) r = Math.max(r, k.getBoundingClientRect().width, k.scrollWidth); } return Math.max(r, d.scrollWidth); }
    function over(d) { return need(d) > d.clientWidth + 1; }
    function layout(span) {
      var tex = span.dataset.tex, w = span.clientWidth; if (!tex || w <= 0) return;
      span.dataset.fw = String(w);
      span.textContent = ''; span.appendChild(mk(tex));
      fallback(span);
    }
    function fallback(span) {
      span.querySelectorAll('.ml').forEach(function (d) {
        var m = d.querySelector('math.tml-display') || d.querySelector('.katex-display'); if (!m) return;
        m.style.fontSize = ''; var w = d.clientWidth, s = need(d);
        if (w > 0 && s > w + 1) m.style.fontSize = Math.max(0.42, (w / s) * 0.97) * 100 + '%';
      });
    }
    function fit() {
      raf = 0; if (mo) mo.disconnect();
      try { document.querySelectorAll('.mx.mxw').forEach(function (wr) { var w = wr.clientWidth; if (w <= 0) return; var pcs = Array.prototype.filter.call(wr.children, function (c) { return c.classList.contains('mxp'); }), sc = 1; pcs.forEach(function (pc) { pc.style.fontSize = ''; }); pcs.forEach(function (pc) { var k = pc.firstElementChild, nw = Math.max(pc.scrollWidth, k ? k.getBoundingClientRect().width : 0); if (nw > w + 1) sc = Math.min(sc, Math.max(0.42, (w / nw) * 0.97)); }); /* one size for every line of the same equation */ if (sc < 1) pcs.forEach(function (pc) { pc.style.fontSize = sc * 100 + '%'; }); }); } catch (e) { /* keep the page working */ }
      try { document.querySelectorAll('.qb-qt .mx.mxd').forEach(function (sp) { if (sp.dataset.fw !== String(sp.clientWidth) && sp.clientWidth > 0) layout(sp); }); } catch (e) { /* keep the page working */ }
      /* an inline equation wider than its line (for example a long fraction inside a bracket) shrinks to fit instead of running out of the card */
      try {
        var inl = Array.prototype.slice.call(document.querySelectorAll('.qb-qt .mx:not(.mxd):not(.mxw), .qb-sol-b .mx:not(.mxd):not(.mxw)'));
        inl.forEach(function (sp) { if (sp.style.fontSize) sp.style.fontSize = ''; });
        var meas = inl.map(function (sp) { var h = sp.closest('.qb-qt, .qb-sol-b'), r = sp.getBoundingClientRect(); return { sp: sp, w: h ? h.clientWidth : 0, n: Math.max(r.width, sp.scrollWidth) }; });
        meas.forEach(function (m) { if (m.w > 0 && m.n > m.w + 1) m.sp.style.fontSize = Math.max(0.5, (m.w / m.n) * 0.96) * 100 + '%'; });
      } catch (e) { /* keep the page working */ }
      if (mo) mo.observe(document.body, { childList: true, subtree: true });
    }
    function sched() { if (!raf) { raf = requestAnimationFrame(fit); setTimeout(function () { if (raf) fit(); }, 250); } }
    if (window.MutationObserver) { mo = new MutationObserver(sched); mo.observe(document.body, { childList: true, subtree: true }); }
    if (window.ResizeObserver) new ResizeObserver(sched).observe(qs); window.addEventListener('resize', sched);
    try { if (document.fonts) { document.fonts.addEventListener('loadingdone', function () { document.querySelectorAll('.mxd').forEach(function (s) { delete s.dataset.fw; }); sched(); }); document.fonts.ready.then(function () { document.querySelectorAll('.mxd').forEach(function (s) { delete s.dataset.fw; }); sched(); }); } } catch (e) { /* ignore */ }
    [600, 1500, 3000, 6000].forEach(function (ms) { setTimeout(function () { document.querySelectorAll('.mxd').forEach(function (s) { delete s.dataset.fw; }); sched(); }, ms); });
    window.addEventListener('load', function () { document.querySelectorAll('.mxd').forEach(function (s) { delete s.dataset.fw; }); sched(); });
    sched();
  })();
  $('.qb-hideopts').addEventListener('click', function () { var b = $('.qb-hideopts'), on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); b.textContent = on ? 'Show options' : 'Hide options'; $('#questions').classList.toggle('hide-opts', on); apply(); });
  $('.qb-revall').addEventListener('click', function () { var b = $('.qb-revall'), on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); $('#questions').classList.toggle('rev-all', on); apply(); });
  $('.qb-reset').addEventListener('click', function () {
    ['exam', 'year', 'cls', 'diff', 'type', 'ch', 'tp', 'src'].forEach(function (k) { S[k].clear(); });
    S.q = ''; S.onlySel = false; S.flag = false; S.attn = false; S.same = false; S.oos = false; $('.qb-search').value = '';
    /* the two view toggles (Show all answers, Hide options) are switched off too */
    var rv = $('.qb-revall'), ho = $('.qb-hideopts'); rv.setAttribute('aria-pressed', 'false'); $('#questions').classList.remove('rev-all'); ho.setAttribute('aria-pressed', 'false'); ho.textContent = 'Hide options'; $('#questions').classList.remove('hide-opts');
    apply();
  });

  /* ---------- selection ---------- */
  function toggleSel(id, on) { if (on) S.sel.add(id); else S.sel.delete(id); updateSelUI(); }
  $('.qb-selall').addEventListener('click', function () { shown().forEach(function (q) { S.sel.add(q.id); }); updateSelUI(); });
  $('.qb-clear').addEventListener('click', function () { S.sel.clear(); if (S.onlySel) apply(); else updateSelUI(); });
  function shown() { return ROWS.filter(function (q) { return matches(q); }); }
  function selected() { return ROWS.filter(function (q) { return S.sel.has(q.id); }); }

  function exportName(qs) {
    var chs = uniq(qs.map(function (q) { return q.chapter_code; }));
    var exams = uniq(qs.map(function (q) { return q.exam; }));
    var years = uniq(qs.filter(function (q) { return q.year; }).map(function (q) { return String(q.year); })).sort();
    var parts = [];
    if (chs.length === 1) { var c = CHMAP[chs[0]]; parts.push(chs[0] + ' ' + (c ? c.chapter : qs[0].chapter)); }
    else parts.push('Maths');
    if (years.length === 1) parts.push(years[0]); else if (years.length > 1) parts.push(years[0] + '-' + years[years.length - 1]);
    if (exams.length === 1) parts.push(exams[0] === 'JEE Main' ? 'JEE Mains' : exams[0]);
    var srcs = uniq(qs.map(function (q) { return q.source; }));
    parts.push(srcs.length === 1 ? (srcs[0] === 'PYQ' ? 'PYQs' : 'Practice Qs') : 'PYQs + Practice Qs');
    if (chs.length > 1) parts.push('(' + chs.length + ' chapters)');
    return parts.join(' ').replace(/[\\/:*?"<>|]+/g, '-');
  }

  function updateSelUI() {
    var osb = $('.qb-onlysel'); if (osb) osb.textContent = 'Show selected (' + S.sel.size + ')';
    var n = S.sel.size;
    $('.qb-nsel').textContent = String(n);
    ['.qb-docx', '.qb-pdf', '.qb-ppt', '.qb-print', '.qb-share', '.qb-savews', '.qb-mktest', '.qb-expbtn'].forEach(function (k) { var b = $(k); if (b) b.disabled = busy || !n; });
    $('.qb-fname').textContent = n ? 'File name: ' + exportName(selected()) : 'Tick questions to export them.';
    Object.keys(CARDS).forEach(function (id) {
      var c = CARDS[id], on = S.sel.has(id);
      c.classList.toggle('sel', on); c.querySelector('.qb-side input').checked = on;
    });
    $$('.qb-ghead input').forEach(function (g) {
      var ids = g.dataset.ids.split(',');
      var k = ids.filter(function (i) { return S.sel.has(i); }).length;
      g.checked = k === ids.length; g.indeterminate = k > 0 && k < ids.length;
    });
  }

  /* ---------- draw list ---------- */
  /* used by the Must Solve tab: the same cards as the question bank, built from a question id */
  window.QBX = window.QBX || {};
  window.QBX.cardFor = function (id) { var q = BYID[id]; if (!q) return null; var c = buildCard(q); c.querySelector('.qb-num').textContent = ''; return c; };
  window.QBX.hasRows = function () { return ROWS.length > 0; };
  window.QBX.goYear = goYear;
  window.QBX.goBB = function (ch) { goSrc('Black Book'); S.q = 'bb-' + ch + '-'; var se = $('.qb-search'); if (se) se.value = 'BB-' + ch + '-'; apply(); var r = $('.qb-results'); if (r && r.scrollIntoView) r.scrollIntoView({ block: 'start' }); };
  function apply() {
    /* Exam and Year only make sense for PYQs: hide them when a practice source alone is chosen */
    var npOnly = S.src.size > 0 && !S.src.has('PYQs');
    if (npOnly) { S.exam.clear(); S.year.clear(); }
    $$('.qb-fgroup>[data-f=exam],.qb-fgroup>[data-f=year]').forEach(function (c) { if (c.parentNode) c.parentNode.style.display = npOnly ? 'none' : ''; });
    $$('.qb-chips[data-f] .qb-chip').forEach(function (b) { var f = b.parentNode.dataset.f; b.setAttribute('aria-pressed', String(S[f].has(b.dataset.v))); });
    DDS.forEach(function (fn) { fn(); });
    $('.qb-onlysel').setAttribute('aria-pressed', String(S.onlySel));
    $('.qb-samef').setAttribute('aria-pressed', String(!!S.same));
    $('.qb-samef').textContent = 'Show repeated (' + sameCount() + ')';
    $('.qb-attnf').setAttribute('aria-pressed', String(S.attn));
    $('.qb-attnf').textContent = 'Attention (' + attnCount() + ')';
    $('.qb-oosonly').setAttribute('aria-pressed', String(S.oos));
    $('.qb-oosonly').textContent = 'Show Out of Syllabus (' + oosCount() + ')';
    $('.qb-onlysel').textContent = 'Show selected (' + S.sel.size + ')';
    (function () { var n = [S.onlySel, S.same, S.oos, S.attn].filter(Boolean).length + ($('.qb-revall').getAttribute('aria-pressed') === 'true' ? 1 : 0) + ($('.qb-hideopts').getAttribute('aria-pressed') === 'true' ? 1 : 0), fb = $('.qb-fbtn'); if (fb) fb.textContent = n ? 'Filter (' + n + ')' : 'Filter'; })();
    Array.prototype.forEach.call(document.querySelectorAll('.qb-oosx button'), function (b) { b.setAttribute('aria-pressed', String((b.dataset.v === 'ex') === S.oosx)); if (b.dataset.v === 'in') b.textContent = 'Include (' + oosCount() + ')'; });
    msBtn.textContent = S.ch.size === 0 ? 'All chapters' : S.ch.size === 1 ? (function () { var c = CHMAP[Array.from(S.ch)[0]]; return c ? c.chapter_code + ' ' + c.chapter : '1 chapter'; })() : S.ch.size + ' chapters';
    var tpCh = {}; TOPICS.forEach(function (t) { tpCh[t.topic_code] = t.chapter_code; }); Array.from(S.tp).forEach(function (t) { if (!S.ch.has(tpCh[t])) S.tp.delete(t); });
    var wasHidden = tf.hidden;
    tf.hidden = !S.ch.size;
    if (wasHidden && !tf.hidden) tf.classList.add('ask');
    if (tf.hidden) { tpPanel.hidden = true; tf.classList.remove('ask'); }
    tpBtn.textContent = S.tp.size === 0 ? 'All topics' : S.tp.size === 1 ? (function (t0) { return t0 ? (/^UNMAPPED/.test(t0.topic_code) ? '' : t0.topic_code.replace(/^JM-/, '') + ' ') + t0.topic : '1 topic'; })(TOPICS.filter(function (t) { return S.tp.has(t.topic_code); })[0]) : S.tp.size + ' topics';
    drawTpList();
    updateFlagCol();
    var pills = $('.qb-pills'); pills.replaceChildren();
    CHAPTERS.filter(function (c) { return S.ch.has(c.chapter_code); }).forEach(function (c) {
      var p = el('button', 'qb-pill', c.chapter_code + ' ' + c.chapter + ' ×'); p.type = 'button'; p.setAttribute('aria-label', 'Remove ' + c.chapter);
      p.addEventListener('click', function () { S.ch.delete(c.chapter_code); apply(); });
      pills.appendChild(p);
    });
    TOPICS.filter(function (t) { return S.tp.has(t.topic_code); }).forEach(function (t) {
      var p = el('button', 'qb-pill tp', (/^UNMAPPED/.test(t.topic_code) ? '' : t.topic_code.replace(/^JM-/, '') + ' ') + t.topic + ' ×'); p.type = 'button'; p.setAttribute('aria-label', 'Remove topic ' + t.topic);
      p.addEventListener('click', function () { S.tp.delete(t.topic_code); apply(); });
      pills.appendChild(p);
    });
    $$('#overview tbody tr').forEach(function (tr) { tr.classList.toggle('on', S.ch.has(tr.dataset.key)); });
    drawMsList();

    var list = $('#questions');
    var rows = shown();
    $('.qb-nshow').textContent = String(PARTIAL ? PARTIAL.shown : rows.length);
    var key = filterKey();
    if (key !== lastKey) { lastKey = key; page = 0; }
    var pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
    if (page >= pages) page = pages - 1;
    list.replaceChildren();
    if (!rows.length) { list.appendChild(el('div', 'qb-empty', ROWS.length ? 'No questions match these filters.' : '')); updateSelUI(); return; }
    var byChapter = {};
    rows.forEach(function (q) { (byChapter[q.chapter_code] = byChapter[q.chapter_code] || []).push(q); });
    var start = page * PER_PAGE, slice = rows.slice(start, start + PER_PAGE);
    if (pages > 1 && !PARTIAL) list.appendChild(pager(pages, start, slice.length, rows.length));
    var cur = null;
    slice.forEach(function (q, k) {
      if (cur !== q.chapter_code) {
        cur = q.chapter_code;
        var c = CHMAP[cur], all = byChapter[cur];
        var head = el('div', 'qb-ghead');
        head.id = 'ch-' + cur;
        head.appendChild(el('span', 'code', cur));
        head.appendChild(el('h2', null, c ? c.chapter : q.chapter));
        head.appendChild(el('span', 'n', all.length + (all.length === 1 ? ' question' : ' questions')));
        var lab = el('label'), cb = el('input'); cb.type = 'checkbox'; cb.dataset.ids = all.map(function (x) { return x.id; }).join(',');
        cb.addEventListener('change', function () { all.forEach(function (x) { if (cb.checked) S.sel.add(x.id); else S.sel.delete(x.id); }); updateSelUI(); });
        lab.appendChild(cb); lab.appendChild(document.createTextNode('Select whole chapter'));
        head.appendChild(lab);
        list.appendChild(head);
      }
      if (!CARDS[q.id]) CARDS[q.id] = buildCard(q);
      CARDS[q.id].querySelector('.qb-num').textContent = String(start + k + 1);
      list.appendChild(CARDS[q.id]);
    });
    if (PARTIAL) list.appendChild(el('div', 'qb-loadnote', 'Loading all ' + Number(PARTIAL.n).toLocaleString('en-US') + ' questions\u2026'));
    else if (pages > 1) list.appendChild(pager(pages, start, slice.length, rows.length));
    updateSelUI();
  }
  function filterKey() {
    return ['exam', 'year', 'cls', 'diff', 'type', 'ch', 'tp', 'src'].map(function (k) { return Array.from(S[k]).sort().join(','); }).join('|') + '|' + S.q + '|' + S.onlySel + '|' + S.same + '|' + S.attn + '|' + S.oos + '|' + S.oosx;
  }
  function pager(pages, start, n, total) {
    var nav = el('nav', 'qb-pager'); nav.setAttribute('aria-label', 'Pages');
    nav.appendChild(el('span', 'qb-pinfo', (start + 1) + '–' + (start + n) + ' of ' + total));
    var go = function (p) { page = p; apply(); var top = $('#qbtools') || $('#questions'); if (top) top.scrollIntoView({ block: 'start' }); };
    var btn = function (label, p, on, disabled) { var b = el('button', 'qb-pbtn' + (on ? ' on' : ''), label); b.type = 'button'; b.disabled = !!disabled; if (on) b.setAttribute('aria-current', 'page'); b.addEventListener('click', function () { go(p); }); nav.appendChild(b); };
    btn('‹ Prev', page - 1, false, page === 0);
    var shownPages = [];
    for (var p = 0; p < pages; p++) if (p === 0 || p === pages - 1 || Math.abs(p - page) <= 2) shownPages.push(p);
    shownPages.forEach(function (p, i) {
      if (i && p - shownPages[i - 1] > 1) nav.appendChild(el('span', 'qb-pgap', '…'));
      btn(String(p + 1), p, p === page);
    });
    btn('Next ›', page + 1, false, page === pages - 1);
    return nav;
  }

  /* ---------- overview table ---------- */
  function chapterFlagCounts() {
    var m = {}; ROWS.forEach(function (q) { if (isFlagged(q)) m[q.chapter_code] = (m[q.chapter_code] || 0) + 1; }); return m;
  }
  function chapterAttnCounts() {
    var m = {}; ROWS.forEach(function (q) { if (q.attention) m[q.chapter_code] = (m[q.chapter_code] || 0) + 1; }); return m;
  }
  function updateFlagCol() {
    var m = chapterFlagCounts(), a = chapterAttnCounts();
    $$('#overview tbody tr').forEach(function (tr) {
      var td = tr.lastChild; if (!td) return; var n = m[tr.dataset.key] || 0;
      td.textContent = String(n); td.className = n === 0 ? 'z' : '';
      var ta = td.previousSibling; if (!ta) return; var k = a[tr.dataset.key] || 0;
      ta.textContent = String(k); ta.className = k === 0 ? 'z' : '';
    });
  }
  /* ---------- chapter weightage graph ---------- */
  var WC = { exam: 'all', yrs: 'all', sort: 'count', pct: false };
  function drawWeight() {
    var body = $('#wchartBody'); if (!body) return;
    var pyq = VR().filter(function (q) { return q.source === 'PYQ' && q.year && q.exam !== 'KCET' && q.exam !== 'IAT' && q.exam !== 'NDA'; });
    var maxY = pyq.reduce(function (m, q) { return Math.max(m, q.year); }, 0);
    var from = WC.yrs === 'all' ? 0 : WC.yrs === '2013' ? 2013 : maxY - Number(WC.yrs) + 1;
    var rows = pyq.filter(function (q) {
      if (q.year < from) return false;
      if (WC.exam === 'main') return q.exam === 'JEE Main' || q.exam === 'AIEEE';
      if (WC.exam === 'adv') return q.exam === 'JEE Advanced' || q.exam === 'IIT';
      return true;
    });
    var m = {}; CHAPTERS.forEach(function (c) { m[c.chapter_code] = { c: c, main: 0, adv: 0 }; });
    rows.forEach(function (q) { var r = m[q.chapter_code]; if (!r) return; if (q.exam === 'JEE Main' || q.exam === 'AIEEE') r.main++; else r.adv++; });
    var list = Object.keys(m).map(function (k) { return m[k]; });
    list.forEach(function (r) { r.n = r.main + r.adv; });
    var byCount = list.slice().sort(function (a, b) { return b.n - a.n; });
    byCount.forEach(function (r, i) { r.rank = i + 1; });
    var total = rows.length, top = byCount.length ? Math.max(byCount[0].n, 1) : 1;
    var third = Math.ceil(byCount.length / 3);
    list.forEach(function (r) { r.band = r.rank <= third ? 'hi' : (r.rank <= 2 * third ? 'mid' : 'lo'); });
    if (WC.sort === 'count') list = byCount;
    var top5 = byCount.slice(0, 5).reduce(function (t, r) { return t + r.n; }, 0);
    body.replaceChildren();
    var yl = WC.yrs === 'all' ? 'all years' : WC.yrs === '2013' ? ('2013 onwards, the current JEE Main and JEE Advanced pattern, ' + from + '–' + maxY) : ('the last ' + WC.yrs + ' years, ' + from + '–' + maxY);
    var ex = WC.exam === 'main' ? 'JEE Main (with AIEEE)' : WC.exam === 'adv' ? 'JEE Advanced (with IIT-JEE)' : 'JEE Main and JEE Advanced';
    body.appendChild(el('p', 'qb-wc-intro', 'Showing ' + ex + ' questions from ' + yl + '. A longer bar means more questions came from that chapter. Chapters whose old papers are still being added may show fewer questions.'));
    var cards = el('div', 'qb-wc-cards');
    function card(big, small) { var c = el('div', 'qb-wc-card'); c.appendChild(el('b', null, big)); c.appendChild(el('span', null, small)); cards.appendChild(c); }
    card(total.toLocaleString('en-US'), 'previous-year questions counted');
    if (byCount.length && byCount[0].n) card(byCount[0].c.chapter, 'most asked chapter (' + byCount[0].n + ' questions)');
    card(total ? Math.round(top5 / total * 100) + '%' : '0%', 'of all questions come from the top 5 chapters');
    body.appendChild(cards);
    var box = el('div', 'qb-wc-list');
    list.forEach(function (r) {
      var row = el('button', 'qb-wc-row'); row.type = 'button';
      var pct = total ? (r.n / total * 100) : 0;
      row.title = r.c.chapter_code + ' ' + r.c.chapter + ': ' + r.n + ' questions (JEE Main ' + r.main + ', JEE Advanced ' + r.adv + '). Click to list them.';
      row.appendChild(el('span', 'qb-wc-rk', WC.sort === 'count' ? '#' + r.rank : ''));
      var lb = el('span', 'qb-wc-lbl', r.c.chapter_code + ' ' + r.c.chapter); lb.appendChild(el('small', null, r.c.chapter_code + ' · Class ' + r.c['class']));
      row.appendChild(lb);
      var tr = el('span', 'qb-wc-track'), f = el('span', 'qb-wc-seg ' + r.band); f.style.width = (r.n / top * 100) + '%'; tr.appendChild(f);
      row.appendChild(tr);
      var vl = el('span', 'qb-wc-val'); vl.appendChild(el('b', null, String(r.n))); vl.appendChild(el('span', null, pct.toFixed(1) + '% of all'));
      row.appendChild(vl);
      row.addEventListener('click', function () {
        S.ch.clear(); S.ch.add(r.c.chapter_code); S.oos = false;
        if (WC.exam === 'main') { S.exam.clear(); S.exam.add('JEE Main'); S.exam.add('AIEEE'); } else if (WC.exam === 'adv') { S.exam.clear(); S.exam.add('JEE Advanced'); S.exam.add('IIT'); }
        apply(); var t = $('#selection'); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'start' });
      });
      box.appendChild(row);
    });
    body.appendChild(box);
    var lg = el('div', 'qb-wc-leg');
    lg.appendChild(el('span', 'qb-wc-key hi', 'Most asked (top third)'));
    lg.appendChild(el('span', 'qb-wc-key mid', 'Often asked'));
    lg.appendChild(el('span', 'qb-wc-key lo', 'Asked less'));
    body.appendChild(lg);
  }
  var weightWired = false;
  function wireWeight() {
    if (weightWired) return; weightWired = true;
    $$('#wchart [data-wc]').forEach(function (g) {
      var k = g.dataset.wc;
      $$('button', g).forEach(function (b) {
        b.addEventListener('click', function () {
          var v = b.dataset.v; if (k === 'pct') WC.pct = v === '1'; else WC[k] = v;
          $$('button', g).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          drawWeight();
        });
      });
    });
  }
  function drawOverview(rows) {
    var tb = $('#overview tbody');
    tb.replaceChildren();
    var chFl = chapterFlagCounts(), chAt = chapterAttnCounts(), chOos = {};
    ROWS.forEach(function (q) { if (q.oos) chOos[q.chapter_code] = (chOos[q.chapter_code] || 0) + 1; });
    rows.forEach(function (r) {
      r.flagged = chFl[r.chapter_code] || 0; r.attn = chAt[r.chapter_code] || 0; r.oos = chOos[r.chapter_code] || 0;
      var tr = el('tr'); tr.dataset.key = r.chapter_code;
      ['chapter_code', 'chapter', 'main_all', 'adv_all', 'kcet_all', 'iat_all', 'nda_all', 'src_BlackBook', 'src_AllenEx', 'src_AllenDY', 'total', 'oos', 'attn', 'flagged'].forEach(function (k) {
        var td = el('td', typeof r[k] === 'number' && r[k] === 0 ? 'z' : null, String(r[k]));
        tr.appendChild(td);
      });
      tr.addEventListener('click', function () { if (S.ch.has(r.chapter_code)) S.ch.delete(r.chapter_code); else S.ch.add(r.chapter_code); apply(); });
      tb.appendChild(tr);
    });
    $$('#overview tbody tr').forEach(function (tr) { tr.classList.toggle('on', S.ch.has(tr.dataset.key)); });
  }

  /* ---------- export ---------- */
  var dl = { save: function (o) { return new Promise(function (res) { var blob = o.data instanceof Blob ? o.data : new Blob([o.data]); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = o.filename || 'download'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); res(true); }, 1500); }); } }; /* plain browser download unless the Claude runtime offers its own */
  function msg(t, bad) { var m = $('.qb-msg'); m.textContent = t || ''; m.classList.toggle('bad', !!bad); }
  function opts() {
    var ans = $('.qb-o-ans').checked;
    return { answers: ans || $('.qb-o-key').checked, answerKey: $('.qb-o-key').checked, explain: !!($('.qb-o-exp') && $('.qb-o-exp').checked), pptLayout: $('.qb-o-ppt').checked };
  }
  function save(filename, data) {
    var ext = String(filename).split('.').pop().toLowerCase();
    if (!QBP(ext === 'pdf' || ext === 'html' ? 'pdf' : ext === 'pptx' ? 'pptx' : 'docx')) { msg(QBP('pdf') ? 'Your plan includes PDF downloads only. Word and PowerPoint are for the admin.' : 'Downloads need a Premium membership.', true); return Promise.resolve(false); }
    if (!dl) { msg('Downloads are not available in this view. Open the dashboard on claude.ai to export.', true); return Promise.resolve(false); }
    return dl.save({ filename: filename, data: data }).then(function () { msg('Saved ' + filename); return true; }, function (e) {
      var code = e && e.code;
      if (code === 'declined') msg('Download cancelled.');
      else if (code === 'rate_limited') msg('A download prompt is already open.', true);
      else msg('Could not save the file (' + (code || 'error') + ').', true);
      return false;
    });
  }
  /* Explanation toggle: the solutions of the selected questions are fetched (per chapter); each becomes a pseudo-question (text + its own figure) printed after the questions */
  function attachExplain(qs, o) {
    o.expl = [];
    if (!o.explain) return Promise.resolve();
    return loadSol(qs.map(function (q) { return q.id; })).then(function (m) {
      qs.forEach(function (q, i) {
        var sv = m && m[q.id], t = q.solution || (sv && (typeof sv === 'string' ? sv : sv.t));
        if (!t || !String(t).trim()) return;
        var f = sv && typeof sv !== 'string' ? sv.f : null;
        o.expl.push({ n: i + 1, q: Object.assign({}, q, { id: q.id + '#sol', question: String(t), options: [], figure: f || null, answer: '' }) });
      });
      if (!o.expl.length) msg('None of the selected questions has an explanation yet.');
    });
  }
  var busy = false;
  function setBusy(on) { busy = on; ['.qb-docx', '.qb-pdf', '.qb-ppt', '.qb-print', '.qb-share', '.qb-expbtn'].forEach(function (k) { var b = $(k); if (b) b.disabled = on || !S.sel.size; }); }
  function exportWith(ext, build) {
    var qs = selected(); if (!qs.length || busy) return;
    if (!QBP(ext === 'pptx' ? 'pptx' : 'docx')) { msg(QBP('pdf') ? 'Your plan includes PDF downloads only. Word and PowerPoint are for the admin.' : 'Downloads need a Premium membership.', true); return; }
    var name = exportName(qs), o = opts(); o.title = name;
    setBusy(true); msg('Building ' + ext.toUpperCase() + ' (' + qs.length + ' questions)…');
    setTimeout(function () {
      Promise.resolve(figReady).then(function () { return window.AvantiContent.adminScript('admin/qb-export.js'); }).then(function () { return attachExplain(qs, o); }).then(function () { return build(qs, o); })
        .then(function (bytes) { return save(name + '.' + ext, new Blob([bytes])); })
        .catch(function (e) { msg('Could not build the ' + ext.toUpperCase() + ' file: ' + (e && e.message || e), true); })
        .then(function () { setBusy(false); });
    }, 30);
  }
  $('.qb-docx').addEventListener('click', function () { exportWith('docx', function (qs, o) { return QBX.buildDocx(qs, o); }); });
  $('.qb-ppt').addEventListener('click', function () { exportWith('pptx', function (qs, o) { return window.__qbCwPptx ? window.__qbCwPptx(qs.map(function (x) { return x.id; }), o.explain) : QBX.buildPptx(qs, o); }); });
  function qbPdfBlob() {
    var qs = selected(), name = exportName(qs), o = opts(); o.title = name;
    setBusy(true); msg('Building PDF…');
    return Promise.resolve(figReady).then(function () { return attachExplain(qs, o); }).then(function () { return QBX.buildPdf(qs, o, function (i, n) { msg('Building PDF: page ' + i + ' of ' + n + '…'); }); })
      .then(function (bytes) { setBusy(false); msg(''); return { blob: new Blob([bytes], { type: 'application/pdf' }), file: name + '.pdf' }; })
      .catch(function (e) { setBusy(false); msg('Could not build the PDF: ' + (e && e.message || e), true); throw e; });
  }
  $('.qb-print').addEventListener('click', function () { if (!QBP('print') || !selected().length || busy || !window.__pdfPrint) return; window.__pdfPrint(qbPdfBlob); });
  $('.qb-share').addEventListener('click', function (e) { if (!QBP('share') || !selected().length || busy || !window.__pdfShare) return; window.__pdfShare(e.currentTarget, exportName(selected()), qbPdfBlob); });
  /* One row under the Answer Key / Explanation switches: Save as worksheet, Create test (teachers) and one Export menu
     (Word, PDF, PowerPoint, Print, Share). The old icon buttons stay hidden in .qb-exp and do the actual work. */
  (function () {
    var exp = $('.qb-exp'); if (!exp || $('.qb-wsrow')) return;
    var ICO = { save: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', test: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/></svg>',
      down: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14"/></svg>',
      print: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/></svg>' };
    var row = document.createElement('div'); row.className = 'qb-wsrow wsrow';
    function mk(cls, ico, label, title, fn) { var b = document.createElement('button'); b.type = 'button'; b.className = 'btn wsbtn ' + cls; b.title = title; b.innerHTML = ico + '<span>' + label + '</span>'; b.disabled = !S.sel.size; b.addEventListener('click', fn); row.appendChild(b); return b; }
    var ids = function () { return selected().map(function (q) { return q.id; }); };
    if (QBP('createTests') && QBP('worksheets')) mk('qb-savews', ICO.save, 'Save as worksheet', 'Keep the ticked questions in Saved worksheets', function () { if (S.sel.size && window.AvantiPortal) window.AvantiPortal.saveWorksheet(ids(), exportName(selected())); });
    if (QBP('createTests')) mk('qb-mktest', ICO.test, 'Create test', 'Make an online test from the ticked questions', function () { if (S.sel.size && window.AvantiPortal) window.AvantiPortal.createTestFrom(ids(), exportName(selected())); });
    if (QBP('pdf')) {
      var eb = mk('qb-expbtn', ICO.down, 'Export', 'Download, print or share the ticked questions', function (e) {
        var P = window.AvantiPortal, IC = P && P.icons; if (!P || !P.dropMenu || !S.sel.size) return;
        var go = function (k) { return function () { var b = $(k); if (b) b.click(); }; };
        P.dropMenu(e.currentTarget, [
          { icon: IC.pdf, text: 'Download PDF', sub: 'Print-ready, with the Avanti header', onclick: go('.qb-pdf') },
          QBP('docx') ? { icon: IC.docx, text: 'Download Word', sub: 'Editable document', onclick: go('.qb-docx') } : null,
          QBP('pptx') ? { icon: IC.pptx, text: 'Download PowerPoint', sub: 'One question per slide', onclick: go('.qb-ppt') } : null,
          '-',
          QBP('print') ? { icon: ICO.print, text: 'Print', sub: 'Opens the PDF to print', onclick: go('.qb-print') } : null,
          QBP('share') ? { icon: IC.share, text: 'Share PDF…', sub: 'WhatsApp, email or your phone’s apps', onclick: go('.qb-share') } : null]);
      });
      eb.setAttribute('aria-haspopup', 'menu'); eb.setAttribute('aria-expanded', 'false');
      eb.insertAdjacentHTML('beforeend', '<span class="pt-caret" aria-hidden="true">▾</span>');
    }
    if (!row.children.length) return;
    row.classList.add('n' + row.children.length);
    exp.parentNode.insertBefore(row, exp.nextSibling);
  })();
  $('.qb-pdf').addEventListener('click', function () {
    var qs = selected(); if (!qs.length || busy) return;
    if (!QBP('pdf')) { msg('Downloads need a Premium membership.', true); return; }
    var name = exportName(qs), o = opts(); o.title = name;
    setBusy(true); msg('Building PDF…');
    Promise.resolve(figReady).then(function () { return attachExplain(qs, o); }).then(function () { return QBX.buildPdf(qs, o, function (i, n) { msg('Building PDF: page ' + i + ' of ' + n + '…'); }); })
      .then(function (bytes) { return save(name + '.pdf', new Blob([bytes])); })
      .catch(function (e) {
        msg('This browser would not draw the PDF pages (' + (e && e.message || 'blocked') + '), so a print-ready page is being saved instead: open it and choose "Save as PDF".', true);
        return save(name + ' (print to PDF).html', QBX.printDocument(qs, o));
      })
      .then(function () { setBusy(false); });
  });

  /* ---------- data ---------- */
  function showState(d, c) {
    var list = $('#questions');
    if (d.status === 'error' || c.status === 'error') {
      list.replaceChildren(el('div', 'qb-failed', 'Failed to load'));
      return true;
    }
    if (d.status !== 'ok' || c.status !== 'ok') {
      if (!ROWS.length) list.replaceChildren(el('div', 'qb-empty dash-skeleton'));
      return true;
    }
    return false;
  }

  dash.onData(function () {
    try { if (dash.colors && dash.colors.length > 1) { root.style.setProperty('--qb-c1', dash.colors[0]); root.style.setProperty('--qb-c2', dash.colors[dash.colors.length > 4 ? 4 : 1]); } } catch (e) { /* default accents */ }
    var d = dash.data('pyq'), c = dash.data('chapters');
    var counts = dash.data('counts'), byc = dash.data('by_chapter');
    if (counts.status === 'ok') {
      $$('#tiles .num').forEach(function (n) {
        if (!n.dataset.where) return;
        var g = n.dataset.where.split('=')[1];
        var r = (counts.data || []).filter(function (x) { return x.group === g; })[0];
        n.textContent = r ? d3.format(',')(r.n) : '—';
        n.classList.remove('dash-skeleton');
      });
    } else if (counts.status === 'error') {
      $$('#tiles .num').forEach(function (n) { n.textContent = '—'; n.classList.remove('dash-skeleton'); });
    }
    if (showState(d, c)) return;
    var tps = dash.data('topics');
    if (tps.status === 'ok' && tpBuiltFrom !== tps.data) {
      tpBuiltFrom = tps.data;
      TOPICS = tps.data.map(function (r) { return { chapter_code: r.chapter_code, topic_code: r.topic_code, topic: r.topic }; });
      if (ROWS.length) apply();
    }
    if (chBuiltFrom !== c.data) {
      chBuiltFrom = c.data;
      CHAPTERS = c.data.map(function (r) { return { chapter_code: r.chapter_code, chapter: r.chapter, class: Number(r.class), order: Number(r.order) }; });
      CHMAP = {}; CHAPTERS.forEach(function (r) { CHMAP[r.chapter_code] = r; });
    }
    var np = dash.data('nonpyq'), npData = np.status === 'ok' ? np.data : [];
    if (builtFrom !== d.data || npFrom !== npData) {
      builtFrom = d.data; npFrom = npData;
      ROWS = toRows(d.data, npData).sort(cmp);
      BYID = {}; CARDS = {};
      PYQ_PUBS = {}; ROWS.forEach(function (q) { BYID[q.id] = q; if (q.pyq && q.publisher) PYQ_PUBS[q.publisher] = 1; });
      Array.from(S.sel).forEach(function (id) { if (!BYID[id]) S.sel.delete(id); });
      buildChips();
      apply();
      if (!PARTIAL) setTimeout(startFigures, 0);
      if (!loadFlags.done) { loadFlags.done = true; loadFlags(); }
    }
    if (byc.status === 'ok') drawOverview(byc.data);
    wireWeight(); drawWeight();
  });
})();

/* Overview panels: one tab bar, click a tab to show its panel, click again to hide it */
(function () {
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-qbpanel]'); if (!b) return;
    var id = b.getAttribute('data-qbpanel'), was = b.getAttribute('aria-selected') === 'true';
    var all = document.querySelectorAll('[data-qbpanel]');
    for (var i = 0; i < all.length; i++) {
      var on = !was && all[i] === b; all[i].setAttribute('aria-selected', on ? 'true' : 'false');
      var pn = document.getElementById(all[i].getAttribute('data-qbpanel')); if (pn) pn.hidden = !on;
    }
    if (!was) { var t = document.getElementById(id); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  });
})();
