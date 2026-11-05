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
    try { var bl = document.querySelector('.qb-build'), fv = document.getElementById('appFootVer'); if (bl) { var vt = bl.textContent.replace(/^\s*Version/i, 'Question Bank v').replace(/v\s+/, 'v').trim() + ' \u00b7 Code 505'; if (fv) { fv.textContent = vt; bl.style.display = 'none'; } else bl.textContent += ' \u00b7 code 505'; } } catch (e) { /* label only */ }
    var pre = window.__qbPre || {}, pd = pre.data || {};
    var get = function (n) { return pd[n] || fetch('qb/data/' + n + '.json').then(function (r) { if (!r.ok) throw new Error(n); return r.json(); }); };
    /* "Solutions status" link under the version label: popup with, for every exam and year, how many questions have a solution added, which are still missing one, and which carry a flag to check */
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
          Promise.resolve(pre.first).catch(function () { return null; }).then(function (fj) {
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
              sec('Flagged \u2013 yet to check', 'Questions carrying an attention note (shown on the question card).', flagged, function (o) { return ys(o) + ' \u00b7 ' + o.f + ' flagged'; });
            bx.querySelector('.qb-sstat-x').addEventListener('click', close);
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
var temml=function(){"use strict";class e{constructor(t,r){let n,s=" "+t;const o=r&&r.loc;if(o&&o.start<=o.end){const e=o.lexer.input;n=o.start;const t=o.end;n===e.length?s+=" at end of input: ":s+=" at position "+(n+1)+": ";const r=e.slice(n,t).replace(/[^]/g,"$&̲");let a,l;a=n>15?"…"+e.slice(n-15,n):e.slice(0,n),l=t+15<e.length?e.slice(t,t+15)+"…":e.slice(t),s+=a+r+l}const a=new Error(s);return a.name="ParseError",a.__proto__=e.prototype,a.position=n,a}}e.prototype.__proto__=Error.prototype;const t=/([A-Z])/g,r={"&":"&amp;",">":"&gt;","<":"&lt;",'"':"&quot;","'":"&#x27;"},n=/[&><"']/g;const s=function(e){return"ordgroup"===e.type||"color"===e.type?1===e.body.length?s(e.body[0]):e:"font"===e.type?s(e.body):e};var o={deflt:function(e,t){return void 0===e?t:e},escape:function(e){return String(e).replace(n,(e=>r[e]))},hyphenate:function(e){return e.replace(t,"-$1").toLowerCase()},getBaseElem:s,isCharacterBox:function(e){const t=s(e);return"mathord"===t.type||"textord"===t.type||"atom"===t.type},protocolFromUrl:function(e){const t=/^[\x00-\x20]*([^\\/#?]*?)(:|&#0*58|&#x0*3a|&colon)/i.exec(e);return t?":"!==t[2]?null:/^[a-zA-Z][a-zA-Z0-9+\-.]*$/.test(t[1])?t[1].toLowerCase():null:"_relative"},round:function(e){return+e.toFixed(4)}};class a{constructor(e){e=e||{},this.displayMode=o.deflt(e.displayMode,!1),this.annotate=o.deflt(e.annotate,!1),this.leqno=o.deflt(e.leqno,!1),this.throwOnError=o.deflt(e.throwOnError,!1),this.errorColor=o.deflt(e.errorColor,"#b22222"),this.macros=e.macros||{},this.wrap=o.deflt(e.wrap,"tex"),this.xml=o.deflt(e.xml,!1),this.colorIsTextColor=o.deflt(e.colorIsTextColor,!1),this.strict=o.deflt(e.strict,!1),this.trust=o.deflt(e.trust,!1),this.maxSize=void 0===e.maxSize?[1/0,1/0]:Array.isArray(e.maxSize)?e.maxSize:[1/0,1/0],this.maxExpand=Math.max(0,o.deflt(e.maxExpand,1e3))}isTrusted(e){if(e.url&&!e.protocol){const t=o.protocolFromUrl(e.url);if(null==t)return!1;e.protocol=t}const t="function"==typeof this.trust?this.trust(e):this.trust;return Boolean(t)}}const l={},i={};function c({type:e,names:t,props:r,handler:n,mathmlBuilder:s}){const o={type:e,numArgs:r.numArgs,argTypes:r.argTypes,allowedInArgument:!!r.allowedInArgument,allowedInText:!!r.allowedInText,allowedInMath:void 0===r.allowedInMath||r.allowedInMath,numOptionalArgs:r.numOptionalArgs||0,infix:!!r.infix,primitive:!!r.primitive,handler:n};for(let e=0;e<t.length;++e)l[t[e]]=o;e&&s&&(i[e]=s)}function m({type:e,mathmlBuilder:t}){c({type:e,names:[],props:{numArgs:0},handler(){throw new Error("Should never be called.")},mathmlBuilder:t})}const u=function(e){return"ordgroup"===e.type&&1===e.body.length?e.body[0]:e},p=function(e){return"ordgroup"===e.type?e.body:[e]};class d{constructor(e){this.children=e,this.classes=[],this.style={}}hasClass(e){return this.classes.includes(e)}toNode(){const e=document.createDocumentFragment();for(let t=0;t<this.children.length;t++)e.appendChild(this.children[t].toNode());return e}toMarkup(){let e="";for(let t=0;t<this.children.length;t++)e+=this.children[t].toMarkup();return e}toText(){return this.children.map((e=>e.toText())).join("")}}const h=function(e){return e.filter((e=>e)).join(" ")},g=function(e,t){this.classes=e||[],this.attributes={},this.style=t||{}},f=function(e){const t=document.createElement(e);t.className=h(this.classes);for(const e in this.style)Object.prototype.hasOwnProperty.call(this.style,e)&&(t.style[e]=this.style[e]);for(const e in this.attributes)Object.prototype.hasOwnProperty.call(this.attributes,e)&&t.setAttribute(e,this.attributes[e]);for(let e=0;e<this.children.length;e++)t.appendChild(this.children[e].toNode());return t},b=function(e){let t=`<${e}`;this.classes.length&&(t+=` class="${o.escape(h(this.classes))}"`);let r="";for(const e in this.style)Object.prototype.hasOwnProperty.call(this.style,e)&&(r+=`${o.hyphenate(e)}:${this.style[e]};`);r&&(t+=` style="${r}"`);for(const e in this.attributes)Object.prototype.hasOwnProperty.call(this.attributes,e)&&(t+=` ${e}="${o.escape(this.attributes[e])}"`);t+=">";for(let e=0;e<this.children.length;e++)t+=this.children[e].toMarkup();return t+=`</${e}>`,t};class y{constructor(e,t,r){g.call(this,e,r),this.children=t||[]}setAttribute(e,t){this.attributes[e]=t}toNode(){return f.call(this,"span")}toMarkup(){return b.call(this,"span")}}let w=class{constructor(e){this.text=e}toNode(){return document.createTextNode(this.text)}toMarkup(){return o.escape(this.text)}};class x{constructor(e,t,r){this.href=e,this.classes=t,this.children=r||[]}toNode(){const e=document.createElement("a");e.setAttribute("href",this.href),this.classes.length>0&&(e.className=h(this.classes));for(let t=0;t<this.children.length;t++)e.appendChild(this.children[t].toNode());return e}toMarkup(){let e=`<a href='${o.escape(this.href)}'`;this.classes.length>0&&(e+=` class="${o.escape(h(this.classes))}"`),e+=">";for(let t=0;t<this.children.length;t++)e+=this.children[t].toMarkup();return e+="</a>",e}}class k{constructor(e,t,r){this.alt=t,this.src=e,this.classes=["mord"],this.style=r}hasClass(e){return this.classes.includes(e)}toNode(){const e=document.createElement("img");e.src=this.src,e.alt=this.alt,e.className="mord";for(const t in this.style)Object.prototype.hasOwnProperty.call(this.style,t)&&(e.style[t]=this.style[t]);return e}toMarkup(){let e=`<img src='${this.src}' alt='${this.alt}'`,t="";for(const e in this.style)Object.prototype.hasOwnProperty.call(this.style,e)&&(t+=`${o.hyphenate(e)}:${this.style[e]};`);return t&&(e+=` style="${o.escape(t)}"`),e+=">",e}}class v{constructor(e,t,r,n){this.type=e,this.attributes={},this.children=t||[],this.classes=r||[],this.style=n||{},this.label=""}setAttribute(e,t){this.attributes[e]=t}getAttribute(e){return this.attributes[e]}setLabel(e){this.label=e}toNode(){const e=document.createElementNS("http://www.w3.org/1998/Math/MathML",this.type);for(const t in this.attributes)Object.prototype.hasOwnProperty.call(this.attributes,t)&&e.setAttribute(t,this.attributes[t]);this.classes.length>0&&(e.className=h(this.classes));for(const t in this.style)Object.prototype.hasOwnProperty.call(this.style,t)&&(e.style[t]=this.style[t]);for(let t=0;t<this.children.length;t++)e.appendChild(this.children[t].toNode());return e}toMarkup(){let e="<"+this.type;for(const t in this.attributes)Object.prototype.hasOwnProperty.call(this.attributes,t)&&(e+=" "+t+'="',e+=o.escape(this.attributes[t]),e+='"');this.classes.length>0&&(e+=` class="${o.escape(h(this.classes))}"`);let t="";for(const e in this.style)Object.prototype.hasOwnProperty.call(this.style,e)&&(t+=`${o.hyphenate(e)}:${this.style[e]};`);t&&(e+=` style="${t}"`),e+=">";for(let t=0;t<this.children.length;t++)e+=this.children[t].toMarkup();return e+="</"+this.type+">",e}toText(){return this.children.map((e=>e.toText())).join("")}}class A{constructor(e){this.text=e}toNode(){return document.createTextNode(this.text)}toMarkup(){return o.escape(this.toText())}toText(){return this.text}}const N=e=>{let t;return 1===e.length&&"mrow"===e[0].type?(t=e.pop(),t.type="mstyle"):t=new v("mstyle",e),t};var T={MathNode:v,TextNode:A,newDocumentFragment:function(e){return new d(e)}};const S=e=>{let t=0;if(e.body)for(const r of e.body)t+=S(r);else if("supsub"===e.type)t+=S(e.base),e.sub&&(t+=.7*S(e.sub)),e.sup&&(t+=.7*S(e.sup));else if("mathord"===e.type||"textord"===e.type)for(const r of e.text.split("")){const e=r.codePointAt(0);t+=96<e&&e<123||944<e&&e<970?.56:47<e&&e<58?.5:.92}else t+=1;return t},q={widehat:"^",widecheck:"ˇ",widetilde:"~",wideparen:"⏜",utilde:"~",overleftarrow:"←",underleftarrow:"←",xleftarrow:"←",overrightarrow:"→",underrightarrow:"→",xrightarrow:"→",underbrace:"⏟",overbrace:"⏞",overgroup:"⏠",overparen:"⏜",undergroup:"⏡",underparen:"⏝",overleftrightarrow:"↔",underleftrightarrow:"↔",xleftrightarrow:"↔",Overrightarrow:"⇒",xRightarrow:"⇒",overleftharpoon:"↼",xleftharpoonup:"↼",overrightharpoon:"⇀",xrightharpoonup:"⇀",xLeftarrow:"⇐",xLeftrightarrow:"⇔",xhookleftarrow:"↩",xhookrightarrow:"↪",xmapsto:"↦",xrightharpoondown:"⇁",xleftharpoondown:"↽",xtwoheadleftarrow:"↞",xtwoheadrightarrow:"↠",xlongequal:"=",xrightleftarrows:"⇄",yields:"→",yieldsLeft:"←",mesomerism:"↔",longrightharpoonup:"⇀",longleftharpoondown:"↽",eqrightharpoonup:"⇀",eqleftharpoondown:"↽","\\cdrightarrow":"→","\\cdleftarrow":"←","\\cdlongequal":"="},O=function(e){const t=new T.TextNode(q[e.slice(1)]),r=new T.MathNode("mo",[t]);return r.setAttribute("stretchy","true"),r},M=["\\widetilde","\\widehat","\\widecheck","\\utilde"];var B=O,C=e=>{const t=O(e.label);if(M.includes(e.label)){const r=S(e.base);1<r&&r<1.6?t.classes.push("tml-crooked-2"):1.6<=r&&r<2.5?t.classes.push("tml-crooked-3"):2.5<=r&&t.classes.push("tml-crooked-4")}return t};const z={bin:1,close:1,inner:1,open:1,punct:1,rel:1},E={"accent-token":1,mathord:1,"op-token":1,spacing:1,textord:1},I={math:{},text:{}};function L(e,t,r,n,s){I[e][n]={group:t,replace:r},s&&r&&(I[e][r]=I[e][n])}const F="math",$="text",G="accent-token",D="bin",j="close",P="inner",R="mathord",U="op-token",H="open",V="punct",_="rel",W="spacing",X="textord";L(F,_,"≡","\\equiv",!0),L(F,_,"≺","\\prec",!0),L(F,_,"≻","\\succ",!0),L(F,_,"∼","\\sim",!0),L(F,_,"⟂","\\perp",!0),L(F,_,"⪯","\\preceq",!0),L(F,_,"⪰","\\succeq",!0),L(F,_,"≃","\\simeq",!0),L(F,_,"≌","\\backcong",!0),L(F,_,"|","\\mid",!0),L(F,_,"≪","\\ll",!0),L(F,_,"≫","\\gg",!0),L(F,_,"≍","\\asymp",!0),L(F,_,"∥","\\parallel"),L(F,_,"⌣","\\smile",!0),L(F,_,"⊑","\\sqsubseteq",!0),L(F,_,"⊒","\\sqsupseteq",!0),L(F,_,"≐","\\doteq",!0),L(F,_,"⌢","\\frown",!0),L(F,_,"∋","\\ni",!0),L(F,_,"∌","\\notni",!0),L(F,_,"∝","\\propto",!0),L(F,_,"⊢","\\vdash",!0),L(F,_,"⊣","\\dashv",!0),L(F,_,"∋","\\owns"),L(F,_,"≘","\\arceq",!0),L(F,_,"≙","\\wedgeq",!0),L(F,_,"≚","\\veeeq",!0),L(F,_,"≛","\\stareq",!0),L(F,_,"≝","\\eqdef",!0),L(F,_,"≞","\\measeq",!0),L(F,_,"≟","\\questeq",!0),L(F,_,"≠","\\ne",!0),L(F,_,"≠","\\neq"),L(F,_,"⩵","\\eqeq",!0),L(F,_,"⩶","\\eqeqeq",!0),L(F,_,"∷","\\dblcolon",!0),L(F,_,"≔","\\coloneqq",!0),L(F,_,"≕","\\eqqcolon",!0),L(F,_,"∹","\\eqcolon",!0),L(F,_,"⩴","\\Coloneqq",!0),L(F,V,".","\\ldotp"),L(F,V,"·","\\cdotp"),L(F,X,"#","\\#"),L($,X,"#","\\#"),L(F,X,"&","\\&"),L($,X,"&","\\&"),L(F,X,"ℵ","\\aleph",!0),L(F,X,"∀","\\forall",!0),L(F,X,"ℏ","\\hbar",!0),L(F,X,"∃","\\exists",!0),L(F,D,"∇","\\nabla",!0),L(F,X,"♭","\\flat",!0),L(F,X,"ℓ","\\ell",!0),L(F,X,"♮","\\natural",!0),L(F,X,"Å","\\Angstrom",!0),L($,X,"Å","\\Angstrom",!0),L(F,X,"♣","\\clubsuit",!0),L(F,X,"♧","\\varclubsuit",!0),L(F,X,"℘","\\wp",!0),L(F,X,"♯","\\sharp",!0),L(F,X,"♢","\\diamondsuit",!0),L(F,X,"♦","\\vardiamondsuit",!0),L(F,X,"ℜ","\\Re",!0),L(F,X,"♡","\\heartsuit",!0),L(F,X,"♥","\\varheartsuit",!0),L(F,X,"ℑ","\\Im",!0),L(F,X,"♠","\\spadesuit",!0),L(F,X,"♤","\\varspadesuit",!0),L(F,X,"♀","\\female",!0),L(F,X,"♂","\\male",!0),L(F,X,"§","\\S",!0),L($,X,"§","\\S"),L(F,X,"¶","\\P",!0),L($,X,"¶","\\P"),L($,X,"☺","\\smiley",!0),L(F,X,"☺","\\smiley",!0),L(F,X,"†","\\dag"),L($,X,"†","\\dag"),L($,X,"†","\\textdagger"),L(F,X,"‡","\\ddag"),L($,X,"‡","\\ddag"),L($,X,"‡","\\textdaggerdbl"),L(F,j,"⎱","\\rmoustache",!0),L(F,H,"⎰","\\lmoustache",!0),L(F,j,"⟯","\\rgroup",!0),L(F,H,"⟮","\\lgroup",!0),L(F,D,"∓","\\mp",!0),L(F,D,"⊖","\\ominus",!0),L(F,D,"⊎","\\uplus",!0),L(F,D,"⊓","\\sqcap",!0),L(F,D,"∗","\\ast"),L(F,D,"⊔","\\sqcup",!0),L(F,D,"◯","\\bigcirc",!0),L(F,D,"∙","\\bullet",!0),L(F,D,"‡","\\ddagger"),L(F,D,"≀","\\wr",!0),L(F,D,"⨿","\\amalg"),L(F,D,"&","\\And"),L(F,D,"⫽","\\sslash",!0),L(F,_,"⟵","\\longleftarrow",!0),L(F,_,"⇐","\\Leftarrow",!0),L(F,_,"⟸","\\Longleftarrow",!0),L(F,_,"⟶","\\longrightarrow",!0),L(F,_,"⇒","\\Rightarrow",!0),L(F,_,"⟹","\\Longrightarrow",!0),L(F,_,"↔","\\leftrightarrow",!0),L(F,_,"⟷","\\longleftrightarrow",!0),L(F,_,"⇔","\\Leftrightarrow",!0),L(F,_,"⟺","\\Longleftrightarrow",!0),L(F,_,"↤","\\mapsfrom",!0),L(F,_,"↦","\\mapsto",!0),L(F,_,"⟼","\\longmapsto",!0),L(F,_,"↗","\\nearrow",!0),L(F,_,"↩","\\hookleftarrow",!0),L(F,_,"↪","\\hookrightarrow",!0),L(F,_,"↘","\\searrow",!0),L(F,_,"↼","\\leftharpoonup",!0),L(F,_,"⇀","\\rightharpoonup",!0),L(F,_,"↙","\\swarrow",!0),L(F,_,"↽","\\leftharpoondown",!0),L(F,_,"⇁","\\rightharpoondown",!0),L(F,_,"↖","\\nwarrow",!0),L(F,_,"⇌","\\rightleftharpoons",!0),L(F,R,"↯","\\lightning",!0),L(F,R,"∎","\\QED",!0),L(F,R,"‰","\\permil",!0),L($,X,"‰","\\permil"),L(F,R,"☉","\\astrosun",!0),L(F,R,"☼","\\sun",!0),L(F,R,"☾","\\leftmoon",!0),L(F,R,"☽","\\rightmoon",!0),L(F,R,"⊕","\\Earth"),L(F,_,"≮","\\nless",!0),L(F,_,"⪇","\\lneq",!0),L(F,_,"≨","\\lneqq",!0),L(F,_,"≨︀","\\lvertneqq"),L(F,_,"⋦","\\lnsim",!0),L(F,_,"⪉","\\lnapprox",!0),L(F,_,"⊀","\\nprec",!0),L(F,_,"⋠","\\npreceq",!0),L(F,_,"⋨","\\precnsim",!0),L(F,_,"⪹","\\precnapprox",!0),L(F,_,"≁","\\nsim",!0),L(F,_,"∤","\\nmid",!0),L(F,_,"∤","\\nshortmid"),L(F,_,"⊬","\\nvdash",!0),L(F,_,"⊭","\\nvDash",!0),L(F,_,"⋪","\\ntriangleleft"),L(F,_,"⋬","\\ntrianglelefteq",!0),L(F,_,"⊄","\\nsubset",!0),L(F,_,"⊅","\\nsupset",!0),L(F,_,"⊊","\\subsetneq",!0),L(F,_,"⊊︀","\\varsubsetneq"),L(F,_,"⫋","\\subsetneqq",!0),L(F,_,"⫋︀","\\varsubsetneqq"),L(F,_,"≯","\\ngtr",!0),L(F,_,"⪈","\\gneq",!0),L(F,_,"≩","\\gneqq",!0),L(F,_,"≩︀","\\gvertneqq"),L(F,_,"⋧","\\gnsim",!0),L(F,_,"⪊","\\gnapprox",!0),L(F,_,"⊁","\\nsucc",!0),L(F,_,"⋡","\\nsucceq",!0),L(F,_,"⋩","\\succnsim",!0),L(F,_,"⪺","\\succnapprox",!0),L(F,_,"≆","\\ncong",!0),L(F,_,"∦","\\nparallel",!0),L(F,_,"∦","\\nshortparallel"),L(F,_,"⊯","\\nVDash",!0),L(F,_,"⋫","\\ntriangleright"),L(F,_,"⋭","\\ntrianglerighteq",!0),L(F,_,"⊋","\\supsetneq",!0),L(F,_,"⊋","\\varsupsetneq"),L(F,_,"⫌","\\supsetneqq",!0),L(F,_,"⫌︀","\\varsupsetneqq"),L(F,_,"⊮","\\nVdash",!0),L(F,_,"⪵","\\precneqq",!0),L(F,_,"⪶","\\succneqq",!0),L(F,D,"⊴","\\unlhd"),L(F,D,"⊵","\\unrhd"),L(F,_,"↚","\\nleftarrow",!0),L(F,_,"↛","\\nrightarrow",!0),L(F,_,"⇍","\\nLeftarrow",!0),L(F,_,"⇏","\\nRightarrow",!0),L(F,_,"↮","\\nleftrightarrow",!0),L(F,_,"⇎","\\nLeftrightarrow",!0),L(F,_,"△","\\vartriangle"),L(F,X,"ℏ","\\hslash"),L(F,X,"▽","\\triangledown"),L(F,X,"◊","\\lozenge"),L(F,X,"Ⓢ","\\circledS"),L(F,X,"®","\\circledR",!0),L($,X,"®","\\circledR"),L($,X,"®","\\textregistered"),L(F,X,"∡","\\measuredangle",!0),L(F,X,"∄","\\nexists"),L(F,X,"℧","\\mho"),L(F,X,"Ⅎ","\\Finv",!0),L(F,X,"⅁","\\Game",!0),L(F,X,"‵","\\backprime"),L(F,X,"‶","\\backdprime"),L(F,X,"‷","\\backtrprime"),L(F,X,"▲","\\blacktriangle"),L(F,X,"▼","\\blacktriangledown"),L(F,X,"■","\\blacksquare"),L(F,X,"⧫","\\blacklozenge"),L(F,X,"★","\\bigstar"),L(F,X,"∢","\\sphericalangle",!0),L(F,X,"∁","\\complement",!0),L(F,X,"ð","\\eth",!0),L($,X,"ð","ð"),L(F,X,"╱","\\diagup"),L(F,X,"╲","\\diagdown"),L(F,X,"□","\\square"),L(F,X,"□","\\Box"),L(F,X,"◊","\\Diamond"),L(F,X,"¥","\\yen",!0),L($,X,"¥","\\yen",!0),L(F,X,"✓","\\checkmark",!0),L($,X,"✓","\\checkmark"),L(F,X,"✗","\\ballotx",!0),L($,X,"✗","\\ballotx"),L($,X,"•","\\textbullet"),L(F,X,"ℶ","\\beth",!0),L(F,X,"ℸ","\\daleth",!0),L(F,X,"ℷ","\\gimel",!0),L(F,X,"ϝ","\\digamma",!0),L(F,X,"ϰ","\\varkappa"),L(F,H,"⌜","\\ulcorner",!0),L(F,j,"⌝","\\urcorner",!0),L(F,H,"⌞","\\llcorner",!0),L(F,j,"⌟","\\lrcorner",!0),L(F,_,"≦","\\leqq",!0),L(F,_,"⩽","\\leqslant",!0),L(F,_,"⪕","\\eqslantless",!0),L(F,_,"≲","\\lesssim",!0),L(F,_,"⪅","\\lessapprox",!0),L(F,_,"≊","\\approxeq",!0),L(F,D,"⋖","\\lessdot"),L(F,_,"⋘","\\lll",!0),L(F,_,"≶","\\lessgtr",!0),L(F,_,"⋚","\\lesseqgtr",!0),L(F,_,"⪋","\\lesseqqgtr",!0),L(F,_,"≑","\\doteqdot"),L(F,_,"≓","\\risingdotseq",!0),L(F,_,"≒","\\fallingdotseq",!0),L(F,_,"∽","\\backsim",!0),L(F,_,"⋍","\\backsimeq",!0),L(F,_,"⫅","\\subseteqq",!0),L(F,_,"⋐","\\Subset",!0),L(F,_,"⊏","\\sqsubset",!0),L(F,_,"≼","\\preccurlyeq",!0),L(F,_,"⋞","\\curlyeqprec",!0),L(F,_,"≾","\\precsim",!0),L(F,_,"⪷","\\precapprox",!0),L(F,_,"⊲","\\vartriangleleft"),L(F,_,"⊴","\\trianglelefteq"),L(F,_,"⊨","\\vDash",!0),L(F,_,"⊫","\\VDash",!0),L(F,_,"⊪","\\Vvdash",!0),L(F,_,"⌣","\\smallsmile"),L(F,_,"⌢","\\smallfrown"),L(F,_,"≏","\\bumpeq",!0),L(F,_,"≎","\\Bumpeq",!0),L(F,_,"≧","\\geqq",!0),L(F,_,"⩾","\\geqslant",!0),L(F,_,"⪖","\\eqslantgtr",!0),L(F,_,"≳","\\gtrsim",!0),L(F,_,"⪆","\\gtrapprox",!0),L(F,D,"⋗","\\gtrdot"),L(F,_,"⋙","\\ggg",!0),L(F,_,"≷","\\gtrless",!0),L(F,_,"⋛","\\gtreqless",!0),L(F,_,"⪌","\\gtreqqless",!0),L(F,_,"≖","\\eqcirc",!0),L(F,_,"≗","\\circeq",!0),L(F,_,"≜","\\triangleq",!0),L(F,_,"∼","\\thicksim"),L(F,_,"≈","\\thickapprox"),L(F,_,"⫆","\\supseteqq",!0),L(F,_,"⋑","\\Supset",!0),L(F,_,"⊐","\\sqsupset",!0),L(F,_,"≽","\\succcurlyeq",!0),L(F,_,"⋟","\\curlyeqsucc",!0),L(F,_,"≿","\\succsim",!0),L(F,_,"⪸","\\succapprox",!0),L(F,_,"⊳","\\vartriangleright"),L(F,_,"⊵","\\trianglerighteq"),L(F,_,"⊩","\\Vdash",!0),L(F,_,"∣","\\shortmid"),L(F,_,"∥","\\shortparallel"),L(F,_,"≬","\\between",!0),L(F,_,"⋔","\\pitchfork",!0),L(F,_,"∝","\\varpropto"),L(F,_,"◀","\\blacktriangleleft"),L(F,_,"∴","\\therefore",!0),L(F,_,"∍","\\backepsilon"),L(F,_,"▶","\\blacktriangleright"),L(F,_,"∵","\\because",!0),L(F,_,"⋘","\\llless"),L(F,_,"⋙","\\gggtr"),L(F,D,"⊲","\\lhd"),L(F,D,"⊳","\\rhd"),L(F,_,"≂","\\eqsim",!0),L(F,_,"≑","\\Doteq",!0),L(F,_,"⥽","\\strictif",!0),L(F,_,"⥼","\\strictfi",!0),L(F,D,"∔","\\dotplus",!0),L(F,D,"∖","\\smallsetminus"),L(F,D,"⋒","\\Cap",!0),L(F,D,"⋓","\\Cup",!0),L(F,D,"⩞","\\doublebarwedge",!0),L(F,D,"⊟","\\boxminus",!0),L(F,D,"⊞","\\boxplus",!0),L(F,D,"⧄","\\boxslash",!0),L(F,D,"⋇","\\divideontimes",!0),L(F,D,"⋉","\\ltimes",!0),L(F,D,"⋊","\\rtimes",!0),L(F,D,"⋋","\\leftthreetimes",!0),L(F,D,"⋌","\\rightthreetimes",!0),L(F,D,"⋏","\\curlywedge",!0),L(F,D,"⋎","\\curlyvee",!0),L(F,D,"⊝","\\circleddash",!0),L(F,D,"⊛","\\circledast",!0),L(F,D,"⊺","\\intercal",!0),L(F,D,"⋒","\\doublecap"),L(F,D,"⋓","\\doublecup"),L(F,D,"⊠","\\boxtimes",!0),L(F,D,"⋈","\\bowtie",!0),L(F,D,"⋈","\\Join"),L(F,D,"⟕","\\leftouterjoin",!0),L(F,D,"⟖","\\rightouterjoin",!0),L(F,D,"⟗","\\fullouterjoin",!0),L(F,D,"∸","\\dotminus",!0),L(F,D,"⟑","\\wedgedot",!0),L(F,D,"⟇","\\veedot",!0),L(F,D,"⩢","\\doublebarvee",!0),L(F,D,"⩣","\\veedoublebar",!0),L(F,D,"⩟","\\wedgebar",!0),L(F,D,"⩠","\\wedgedoublebar",!0),L(F,D,"⩔","\\Vee",!0),L(F,D,"⩓","\\Wedge",!0),L(F,D,"⩃","\\barcap",!0),L(F,D,"⩂","\\barcup",!0),L(F,D,"⩈","\\capbarcup",!0),L(F,D,"⩀","\\capdot",!0),L(F,D,"⩇","\\capovercup",!0),L(F,D,"⩆","\\cupovercap",!0),L(F,D,"⩍","\\closedvarcap",!0),L(F,D,"⩌","\\closedvarcup",!0),L(F,D,"⨪","\\minusdot",!0),L(F,D,"⨫","\\minusfdots",!0),L(F,D,"⨬","\\minusrdots",!0),L(F,D,"⊻","\\Xor",!0),L(F,D,"⊼","\\Nand",!0),L(F,D,"⊽","\\Nor",!0),L(F,D,"⊽","\\barvee"),L(F,D,"⫴","\\interleave",!0),L(F,D,"⧢","\\shuffle",!0),L(F,D,"⫶","\\threedotcolon",!0),L(F,D,"⦂","\\typecolon",!0),L(F,D,"∾","\\invlazys",!0),L(F,D,"⩋","\\twocaps",!0),L(F,D,"⩊","\\twocups",!0),L(F,D,"⩎","\\Sqcap",!0),L(F,D,"⩏","\\Sqcup",!0),L(F,D,"⩖","\\veeonvee",!0),L(F,D,"⩕","\\wedgeonwedge",!0),L(F,D,"⧗","\\blackhourglass",!0),L(F,D,"⧆","\\boxast",!0),L(F,D,"⧈","\\boxbox",!0),L(F,D,"⧇","\\boxcircle",!0),L(F,D,"⊜","\\circledequal",!0),L(F,D,"⦷","\\circledparallel",!0),L(F,D,"⦶","\\circledvert",!0),L(F,D,"⦵","\\circlehbar",!0),L(F,D,"⟡","\\concavediamond",!0),L(F,D,"⟢","\\concavediamondtickleft",!0),L(F,D,"⟣","\\concavediamondtickright",!0),L(F,D,"⋄","\\diamond",!0),L(F,D,"⧖","\\hourglass",!0),L(F,D,"⟠","\\lozengeminus",!0),L(F,D,"⌽","\\obar",!0),L(F,D,"⦸","\\obslash",!0),L(F,D,"⨸","\\odiv",!0),L(F,D,"⧁","\\ogreaterthan",!0),L(F,D,"⧀","\\olessthan",!0),L(F,D,"⦹","\\operp",!0),L(F,D,"⨷","\\Otimes",!0),L(F,D,"⨶","\\otimeshat",!0),L(F,D,"⋆","\\star",!0),L(F,D,"△","\\triangle",!0),L(F,D,"⨺","\\triangleminus",!0),L(F,D,"⨹","\\triangleplus",!0),L(F,D,"⨻","\\triangletimes",!0),L(F,D,"⟤","\\whitesquaretickleft",!0),L(F,D,"⟥","\\whitesquaretickright",!0),L(F,D,"⨳","\\smashtimes",!0),L(F,_,"⇢","\\dashrightarrow",!0),L(F,_,"⇠","\\dashleftarrow",!0),L(F,_,"⇇","\\leftleftarrows",!0),L(F,_,"⇆","\\leftrightarrows",!0),L(F,_,"⇚","\\Lleftarrow",!0),L(F,_,"↞","\\twoheadleftarrow",!0),L(F,_,"↢","\\leftarrowtail",!0),L(F,_,"↫","\\looparrowleft",!0),L(F,_,"⇋","\\leftrightharpoons",!0),L(F,_,"↶","\\curvearrowleft",!0),L(F,_,"↺","\\circlearrowleft",!0),L(F,_,"↰","\\Lsh",!0),L(F,_,"⇈","\\upuparrows",!0),L(F,_,"↿","\\upharpoonleft",!0),L(F,_,"⇃","\\downharpoonleft",!0),L(F,_,"⊶","\\origof",!0),L(F,_,"⊷","\\imageof",!0),L(F,_,"⊸","\\multimap",!0),L(F,_,"↭","\\leftrightsquigarrow",!0),L(F,_,"⇉","\\rightrightarrows",!0),L(F,_,"⇄","\\rightleftarrows",!0),L(F,_,"↠","\\twoheadrightarrow",!0),L(F,_,"↣","\\rightarrowtail",!0),L(F,_,"↬","\\looparrowright",!0),L(F,_,"↷","\\curvearrowright",!0),L(F,_,"↻","\\circlearrowright",!0),L(F,_,"↱","\\Rsh",!0),L(F,_,"⇊","\\downdownarrows",!0),L(F,_,"↾","\\upharpoonright",!0),L(F,_,"⇂","\\downharpoonright",!0),L(F,_,"⇝","\\rightsquigarrow",!0),L(F,_,"⇝","\\leadsto"),L(F,_,"⇛","\\Rrightarrow",!0),L(F,_,"↾","\\restriction"),L(F,X,"‘","`"),L(F,X,"$","\\$"),L($,X,"$","\\$"),L($,X,"$","\\textdollar"),L(F,X,"¢","\\cent"),L($,X,"¢","\\cent"),L(F,X,"%","\\%"),L($,X,"%","\\%"),L(F,X,"_","\\_"),L($,X,"_","\\_"),L($,X,"_","\\textunderscore"),L($,X,"␣","\\textvisiblespace",!0),L(F,X,"∠","\\angle",!0),L(F,X,"∞","\\infty",!0),L(F,X,"′","\\prime"),L(F,X,"″","\\dprime"),L(F,X,"‴","\\trprime"),L(F,X,"⁗","\\qprime"),L(F,X,"△","\\triangle"),L($,X,"Α","\\Alpha",!0),L($,X,"Β","\\Beta",!0),L($,X,"Γ","\\Gamma",!0),L($,X,"Δ","\\Delta",!0),L($,X,"Ε","\\Epsilon",!0),L($,X,"Ζ","\\Zeta",!0),L($,X,"Η","\\Eta",!0),L($,X,"Θ","\\Theta",!0),L($,X,"Ι","\\Iota",!0),L($,X,"Κ","\\Kappa",!0),L($,X,"Λ","\\Lambda",!0),L($,X,"Μ","\\Mu",!0),L($,X,"Ν","\\Nu",!0),L($,X,"Ξ","\\Xi",!0),L($,X,"Ο","\\Omicron",!0),L($,X,"Π","\\Pi",!0),L($,X,"Ρ","\\Rho",!0),L($,X,"Σ","\\Sigma",!0),L($,X,"Τ","\\Tau",!0),L($,X,"Υ","\\Upsilon",!0),L($,X,"Φ","\\Phi",!0),L($,X,"Χ","\\Chi",!0),L($,X,"Ψ","\\Psi",!0),L($,X,"Ω","\\Omega",!0),L(F,R,"Α","\\Alpha",!0),L(F,R,"Β","\\Beta",!0),L(F,R,"Γ","\\Gamma",!0),L(F,R,"Δ","\\Delta",!0),L(F,R,"Ε","\\Epsilon",!0),L(F,R,"Ζ","\\Zeta",!0),L(F,R,"Η","\\Eta",!0),L(F,R,"Θ","\\Theta",!0),L(F,R,"Ι","\\Iota",!0),L(F,R,"Κ","\\Kappa",!0),L(F,R,"Λ","\\Lambda",!0),L(F,R,"Μ","\\Mu",!0),L(F,R,"Ν","\\Nu",!0),L(F,R,"Ξ","\\Xi",!0),L(F,R,"Ο","\\Omicron",!0),L(F,R,"Π","\\Pi",!0),L(F,R,"Ρ","\\Rho",!0),L(F,R,"Σ","\\Sigma",!0),L(F,R,"Τ","\\Tau",!0),L(F,R,"Υ","\\Upsilon",!0),L(F,R,"Φ","\\Phi",!0),L(F,R,"Χ","\\Chi",!0),L(F,R,"Ψ","\\Psi",!0),L(F,R,"Ω","\\Omega",!0),L(F,H,"¬","\\neg",!0),L(F,H,"¬","\\lnot"),L(F,X,"⊤","\\top"),L(F,X,"⊥","\\bot"),L(F,X,"∅","\\emptyset"),L(F,X,"⌀","\\varnothing"),L(F,R,"α","\\alpha",!0),L(F,R,"β","\\beta",!0),L(F,R,"γ","\\gamma",!0),L(F,R,"δ","\\delta",!0),L(F,R,"ϵ","\\epsilon",!0),L(F,R,"ζ","\\zeta",!0),L(F,R,"η","\\eta",!0),L(F,R,"θ","\\theta",!0),L(F,R,"ι","\\iota",!0),L(F,R,"κ","\\kappa",!0),L(F,R,"λ","\\lambda",!0),L(F,R,"μ","\\mu",!0),L(F,R,"ν","\\nu",!0),L(F,R,"ξ","\\xi",!0),L(F,R,"ο","\\omicron",!0),L(F,R,"π","\\pi",!0),L(F,R,"ρ","\\rho",!0),L(F,R,"σ","\\sigma",!0),L(F,R,"τ","\\tau",!0),L(F,R,"υ","\\upsilon",!0),L(F,R,"ϕ","\\phi",!0),L(F,R,"χ","\\chi",!0),L(F,R,"ψ","\\psi",!0),L(F,R,"ω","\\omega",!0),L(F,R,"ε","\\varepsilon",!0),L(F,R,"ϑ","\\vartheta",!0),L(F,R,"ϖ","\\varpi",!0),L(F,R,"ϱ","\\varrho",!0),L(F,R,"ς","\\varsigma",!0),L(F,R,"φ","\\varphi",!0),L(F,R,"Ϙ","\\Coppa",!0),L(F,R,"ϙ","\\coppa",!0),L(F,R,"ϙ","\\varcoppa",!0),L(F,R,"Ϟ","\\Koppa",!0),L(F,R,"ϟ","\\koppa",!0),L(F,R,"Ϡ","\\Sampi",!0),L(F,R,"ϡ","\\sampi",!0),L(F,R,"Ϛ","\\Stigma",!0),L(F,R,"ϛ","\\stigma",!0),L(F,R,"⫫","\\Bot"),L(F,D,"∗","∗",!0),L(F,D,"+","+"),L(F,D,"∗","*"),L(F,D,"⁄","/",!0),L(F,D,"⁄","⁄"),L(F,D,"−","-",!0),L(F,D,"⋅","\\cdot",!0),L(F,D,"∘","\\circ",!0),L(F,D,"÷","\\div",!0),L(F,D,"±","\\pm",!0),L(F,D,"×","\\times",!0),L(F,D,"∩","\\cap",!0),L(F,D,"∪","\\cup",!0),L(F,D,"∖","\\setminus",!0),L(F,D,"∧","\\land"),L(F,D,"∨","\\lor"),L(F,D,"∧","\\wedge",!0),L(F,D,"∨","\\vee",!0),L(F,H,"⟦","\\llbracket",!0),L(F,j,"⟧","\\rrbracket",!0),L(F,H,"⟨","\\langle",!0),L(F,H,"⟪","\\lAngle",!0),L(F,H,"⦉","\\llangle",!0),L(F,H,"|","\\lvert"),L(F,H,"‖","\\lVert",!0),L(F,X,"!","\\oc"),L(F,X,"?","\\wn"),L(F,X,"↓","\\shpos"),L(F,X,"↕","\\shift"),L(F,X,"↑","\\shneg"),L(F,j,"?","?"),L(F,j,"!","!"),L(F,j,"‼","‼"),L(F,j,"⟩","\\rangle",!0),L(F,j,"⟫","\\rAngle",!0),L(F,j,"⦊","\\rrangle",!0),L(F,j,"|","\\rvert"),L(F,j,"‖","\\rVert"),L(F,H,"⦃","\\lBrace",!0),L(F,j,"⦄","\\rBrace",!0),L(F,_,"=","\\equal",!0),L(F,_,":",":"),L(F,_,"≈","\\approx",!0),L(F,_,"≅","\\cong",!0),L(F,_,"≥","\\ge"),L(F,_,"≥","\\geq",!0),L(F,_,"←","\\gets"),L(F,_,">","\\gt",!0),L(F,_,"∈","\\in",!0),L(F,_,"∉","\\notin",!0),L(F,_,"","\\@not"),L(F,_,"⊂","\\subset",!0),L(F,_,"⊃","\\supset",!0),L(F,_,"⊆","\\subseteq",!0),L(F,_,"⊇","\\supseteq",!0),L(F,_,"⊈","\\nsubseteq",!0),L(F,_,"⊈","\\nsubseteqq"),L(F,_,"⊉","\\nsupseteq",!0),L(F,_,"⊉","\\nsupseteqq"),L(F,_,"⊨","\\models"),L(F,_,"←","\\leftarrow",!0),L(F,_,"≤","\\le"),L(F,_,"≤","\\leq",!0),L(F,_,"<","\\lt",!0),L(F,_,"→","\\rightarrow",!0),L(F,_,"→","\\to"),L(F,_,"≱","\\ngeq",!0),L(F,_,"≱","\\ngeqq"),L(F,_,"≱","\\ngeqslant"),L(F,_,"≰","\\nleq",!0),L(F,_,"≰","\\nleqq"),L(F,_,"≰","\\nleqslant"),L(F,_,"⫫","\\Perp",!0),L(F,W," ","\\ "),L(F,W," ","\\space"),L(F,W," ","\\nobreakspace"),L($,W," ","\\ "),L($,W," "," "),L($,W," ","\\space"),L($,W," ","\\nobreakspace"),L(F,W,null,"\\nobreak"),L(F,W,null,"\\allowbreak"),L(F,V,",",","),L($,V,":",":"),L(F,V,";",";"),L(F,D,"⊼","\\barwedge"),L(F,D,"⊻","\\veebar"),L(F,D,"⊙","\\odot",!0),L(F,D,"⊕︎","\\oplus"),L(F,D,"⊗","\\otimes",!0),L(F,X,"∂","\\partial",!0),L(F,D,"⊘","\\oslash",!0),L(F,D,"⊚","\\circledcirc",!0),L(F,D,"⊡","\\boxdot",!0),L(F,D,"△","\\bigtriangleup"),L(F,D,"▽","\\bigtriangledown"),L(F,D,"†","\\dagger"),L(F,D,"⋄","\\diamond"),L(F,D,"◃","\\triangleleft"),L(F,D,"▹","\\triangleright"),L(F,H,"{","\\{"),L($,X,"{","\\{"),L($,X,"{","\\textbraceleft"),L(F,j,"}","\\}"),L($,X,"}","\\}"),L($,X,"}","\\textbraceright"),L(F,H,"{","\\lbrace"),L(F,j,"}","\\rbrace"),L(F,H,"[","\\lbrack",!0),L($,X,"[","\\lbrack",!0),L(F,j,"]","\\rbrack",!0),L($,X,"]","\\rbrack",!0),L(F,H,"(","\\lparen",!0),L(F,j,")","\\rparen",!0),L(F,H,"⦇","\\llparenthesis",!0),L(F,j,"⦈","\\rrparenthesis",!0),L($,X,"<","\\textless",!0),L($,X,">","\\textgreater",!0),L(F,H,"⌊","\\lfloor",!0),L(F,j,"⌋","\\rfloor",!0),L(F,H,"⌈","\\lceil",!0),L(F,j,"⌉","\\rceil",!0),L(F,X,"\\","\\backslash"),L(F,X,"|","|"),L(F,X,"|","\\vert"),L($,X,"|","\\textbar",!0),L(F,X,"‖","\\|"),L(F,X,"‖","\\Vert"),L($,X,"‖","\\textbardbl"),L($,X,"~","\\textasciitilde"),L($,X,"\\","\\textbackslash"),L($,X,"^","\\textasciicircum"),L(F,_,"↑","\\uparrow",!0),L(F,_,"⇑","\\Uparrow",!0),L(F,_,"↓","\\downarrow",!0),L(F,_,"⇓","\\Downarrow",!0),L(F,_,"↕","\\updownarrow",!0),L(F,_,"⇕","\\Updownarrow",!0),L(F,U,"∐","\\coprod"),L(F,U,"⋁","\\bigvee"),L(F,U,"⋀","\\bigwedge"),L(F,U,"⨄","\\biguplus"),L(F,U,"⨄","\\bigcupplus"),L(F,U,"⨃","\\bigcupdot"),L(F,U,"⨇","\\bigdoublevee"),L(F,U,"⨈","\\bigdoublewedge"),L(F,U,"⋂","\\bigcap"),L(F,U,"⋃","\\bigcup"),L(F,U,"∫","\\int"),L(F,U,"∫","\\intop"),L(F,U,"∬","\\iint"),L(F,U,"∭","\\iiint"),L(F,U,"∏","\\prod"),L(F,U,"∑","\\sum"),L(F,U,"⨂","\\bigotimes"),L(F,U,"⨁","\\bigoplus"),L(F,U,"⨀","\\bigodot"),L(F,U,"⨉","\\bigtimes"),L(F,U,"∮","\\oint"),L(F,U,"∯","\\oiint"),L(F,U,"∰","\\oiiint"),L(F,U,"∱","\\intclockwise"),L(F,U,"∲","\\varointclockwise"),L(F,U,"⨌","\\iiiint"),L(F,U,"⨍","\\intbar"),L(F,U,"⨎","\\intBar"),L(F,U,"⨏","\\fint"),L(F,U,"⨒","\\rppolint"),L(F,U,"⨓","\\scpolint"),L(F,U,"⨕","\\pointint"),L(F,U,"⨖","\\sqint"),L(F,U,"⨗","\\intlarhk"),L(F,U,"⨘","\\intx"),L(F,U,"⨙","\\intcap"),L(F,U,"⨚","\\intcup"),L(F,U,"⨅","\\bigsqcap"),L(F,U,"⨆","\\bigsqcup"),L(F,U,"∫","\\smallint"),L($,P,"…","\\textellipsis"),L(F,P,"…","\\mathellipsis"),L($,P,"…","\\ldots",!0),L(F,P,"…","\\ldots",!0),L(F,P,"⋰","\\iddots",!0),L(F,P,"⋯","\\@cdots",!0),L(F,P,"⋱","\\ddots",!0),L(F,X,"⋮","\\varvdots"),L($,X,"⋮","\\varvdots"),L(F,G,"ˊ","\\acute"),L(F,G,"`","\\grave"),L(F,G,"¨","\\ddot"),L(F,G,"…","\\dddot"),L(F,G,"….","\\ddddot"),L(F,G,"~","\\tilde"),L(F,G,"‾","\\bar"),L(F,G,"˘","\\breve"),L(F,G,"ˇ","\\check"),L(F,G,"^","\\hat"),L(F,G,"→","\\vec"),L(F,G,"˙","\\dot"),L(F,G,"˚","\\mathring"),L(F,R,"ı","\\imath",!0),L(F,R,"ȷ","\\jmath",!0),L(F,X,"ı","ı"),L(F,X,"ȷ","ȷ"),L($,X,"ı","\\i",!0),L($,X,"ȷ","\\j",!0),L($,X,"ß","\\ss",!0),L($,X,"æ","\\ae",!0),L($,X,"œ","\\oe",!0),L($,X,"ø","\\o",!0),L(F,R,"ø","\\o",!0),L($,X,"Æ","\\AE",!0),L($,X,"Œ","\\OE",!0),L($,X,"Ø","\\O",!0),L(F,R,"Ø","\\O",!0),L($,G,"ˊ","\\'"),L($,G,"ˋ","\\`"),L($,G,"ˆ","\\^"),L($,G,"˜","\\~"),L($,G,"ˉ","\\="),L($,G,"˘","\\u"),L($,G,"˙","\\."),L($,G,"¸","\\c"),L($,G,"˚","\\r"),L($,G,"ˇ","\\v"),L($,G,"¨",'\\"'),L($,G,"˝","\\H"),L(F,G,"ˊ","\\'"),L(F,G,"ˋ","\\`"),L(F,G,"ˆ","\\^"),L(F,G,"˜","\\~"),L(F,G,"ˉ","\\="),L(F,G,"˘","\\u"),L(F,G,"˙","\\."),L(F,G,"¸","\\c"),L(F,G,"˚","\\r"),L(F,G,"ˇ","\\v"),L(F,G,"¨",'\\"'),L(F,G,"˝","\\H");const Z={"--":!0,"---":!0,"``":!0,"''":!0};L($,X,"–","--",!0),L($,X,"–","\\textendash"),L($,X,"—","---",!0),L($,X,"—","\\textemdash"),L($,X,"‘","`",!0),L($,X,"‘","\\textquoteleft"),L($,X,"’","'",!0),L($,X,"’","\\textquoteright"),L($,X,"“","``",!0),L($,X,"“","\\textquotedblleft"),L($,X,"”","''",!0),L($,X,"”","\\textquotedblright"),L(F,X,"°","\\degree",!0),L($,X,"°","\\degree"),L($,X,"°","\\textdegree",!0),L(F,X,"£","\\pounds"),L(F,X,"£","\\mathsterling",!0),L($,X,"£","\\pounds"),L($,X,"£","\\textsterling",!0),L(F,X,"✠","\\maltese"),L($,X,"✠","\\maltese"),L(F,X,"€","\\euro",!0),L($,X,"€","\\euro",!0),L($,X,"€","\\texteuro"),L(F,X,"©","\\copyright",!0),L($,X,"©","\\textcopyright"),L(F,X,"⌀","\\diameter",!0),L($,X,"⌀","\\diameter"),L(F,X,"𝛤","\\varGamma"),L(F,X,"𝛥","\\varDelta"),L(F,X,"𝛩","\\varTheta"),L(F,X,"𝛬","\\varLambda"),L(F,X,"𝛯","\\varXi"),L(F,X,"𝛱","\\varPi"),L(F,X,"𝛴","\\varSigma"),L(F,X,"𝛶","\\varUpsilon"),L(F,X,"𝛷","\\varPhi"),L(F,X,"𝛹","\\varPsi"),L(F,X,"𝛺","\\varOmega"),L($,X,"𝛤","\\varGamma"),L($,X,"𝛥","\\varDelta"),L($,X,"𝛩","\\varTheta"),L($,X,"𝛬","\\varLambda"),L($,X,"𝛯","\\varXi"),L($,X,"𝛱","\\varPi"),L($,X,"𝛴","\\varSigma"),L($,X,"𝛶","\\varUpsilon"),L($,X,"𝛷","\\varPhi"),L($,X,"𝛹","\\varPsi"),L($,X,"𝛺","\\varOmega");const Y='0123456789/@."';for(let e=0;e<14;e++){const t=Y.charAt(e);L(F,X,t,t)}const K='0123456789!@*()-=+";:?/.,';for(let e=0;e<25;e++){const t=K.charAt(e);L($,X,t,t)}const J="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";for(let e=0;e<52;e++){const t=J.charAt(e);L(F,R,t,t),L($,X,t,t)}const Q="ÇÐÞçþℂℍℕℙℚℝℤℎℏℊℋℌℐℑℒℓ℘ℛℜℬℰℱℳℭℨ";for(let e=0;e<30;e++){const t=Q.charAt(e);L(F,R,t,t),L($,X,t,t)}let ee="";for(let e=0;e<52;e++){ee=String.fromCharCode(55349,56320+e),L(F,R,ee,ee),L($,X,ee,ee),ee=String.fromCharCode(55349,56372+e),L(F,R,ee,ee),L($,X,ee,ee),ee=String.fromCharCode(55349,56424+e),L(F,R,ee,ee),L($,X,ee,ee),ee=String.fromCharCode(55349,56580+e),L(F,R,ee,ee),L($,X,ee,ee),ee=String.fromCharCode(55349,56736+e),L(F,R,ee,ee),L($,X,ee,ee),ee=String.fromCharCode(55349,56788+e),L(F,R,ee,ee),L($,X,ee,ee),ee=String.fromCharCode(55349,56840+e),L(F,R,ee,ee),L($,X,ee,ee),ee=String.fromCharCode(55349,56944+e),L(F,R,ee,ee),L($,X,ee,ee),ee=String.fromCharCode(55349,56632+e),L(F,R,ee,ee),L($,X,ee,ee);const t=J.charAt(e);ee=String.fromCharCode(55349,56476+e),L(F,R,t,ee),L($,X,t,ee)}for(let e=0;e<10;e++)ee=String.fromCharCode(55349,57294+e),L(F,R,ee,ee),L($,X,ee,ee),ee=String.fromCharCode(55349,57314+e),L(F,R,ee,ee),L($,X,ee,ee),ee=String.fromCharCode(55349,57324+e),L(F,R,ee,ee),L($,X,ee,ee),ee=String.fromCharCode(55349,57334+e),L(F,R,ee,ee),L($,X,ee,ee);const te=function(e,t,r){return!I[t][e]||!I[t][e].replace||55349===e.charCodeAt(0)||Object.prototype.hasOwnProperty.call(Z,e)&&r&&(r.fontFamily&&"tt"===r.fontFamily.slice(4,6)||r.font&&"tt"===r.font.slice(4,6))||(e=I[t][e].replace),new T.TextNode(e)},re=(e,t)=>{if(0===e.children.length||"mtext"!==e.children[e.children.length-1].type){const r=new T.MathNode("mtext",[new T.TextNode(t.children[0].text)]);e.children.push(r)}else e.children[e.children.length-1].children[0].text+=t.children[0].text},ne=e=>{if("mrow"!==e.type&&"mstyle"!==e.type)return e;if(0===e.children.length)return e;const t=new T.MathNode("mrow");for(let r=0;r<e.children.length;r++){const n=e.children[r];if("mtext"===n.type&&0===Object.keys(n.attributes).length)re(t,n);else if("mrow"===n.type){let e=!0;for(let t=0;t<n.children.length;t++){if("mtext"!==n.children[t].type||0!==Object.keys(n.attributes).length){e=!1;break}}if(e)for(let e=0;e<n.children.length;e++){const r=n.children[e];re(t,r)}else t.children.push(n)}else t.children.push(n)}for(let r=0;r<t.children.length;r++)if("mtext"===t.children[r].type){const n=t.children[r];" "===n.children[0].text.charAt(0)&&(n.children[0].text=" "+n.children[0].text.slice(1));const s=n.children[0].text.length;s>0&&" "===n.children[0].text.charAt(s-1)&&(n.children[0].text=n.children[0].text.slice(0,-1)+" ");for(const[t,r]of Object.entries(e.attributes))n.attributes[t]=r}return 1===t.children.length&&"mtext"===t.children[0].type?t.children[0]:t},se=function(e,t=!1){if(!(1!==e.length||e[0]instanceof d))return e[0];if(!t){e[0]instanceof v&&"mo"===e[0].type&&!e[0].attributes.fence&&(e[0].attributes.lspace="0em",e[0].attributes.rspace="0em");const t=e.length-1;e[t]instanceof v&&"mo"===e[t].type&&!e[t].attributes.fence&&(e[t].attributes.lspace="0em",e[t].attributes.rspace="0em")}return new T.MathNode("mrow",e)};function oe(e){if(!e)return!1;if("mi"===e.type&&1===e.children.length){const t=e.children[0];return t instanceof A&&"."===t.text}if("mtext"===e.type&&1===e.children.length){const t=e.children[0];return t instanceof A&&" "===t.text}if("mo"===e.type&&1===e.children.length&&"true"===e.getAttribute("separator")&&"0em"===e.getAttribute("lspace")&&"0em"===e.getAttribute("rspace")){const t=e.children[0];return t instanceof A&&","===t.text}return!1}const ae=(e,t)=>{const r=e[t],n=e[t+1];return"atom"===r.type&&","===r.text&&r.loc&&n.loc&&r.loc.end===n.loc.start},le=e=>"atom"===e.type&&"rel"===e.family||"mclass"===e.type&&"mrel"===e.mclass,ie=function(e,t,r=!1){if(!r&&1===e.length){const r=me(e[0],t);return r instanceof v&&"mo"===r.type&&(r.setAttribute("lspace","0em"),r.setAttribute("rspace","0em")),[r]}const n=[],s=[];let o;for(let r=0;r<e.length;r++)s.push(me(e[r],t));for(let t=0;t<s.length;t++){const r=s[t];if(t<e.length-1&&le(e[t])&&le(e[t+1])&&r.setAttribute("rspace","0em"),t>0&&le(e[t])&&le(e[t-1])&&r.setAttribute("lspace","0em"),"mn"===r.type&&o&&"mn"===o.type)o.children.push(...r.children);else if(oe(r)&&o&&"mn"===o.type)o.children.push(...r.children);else if(o&&"mn"===o.type&&t<s.length-1&&"mn"===s[t+1].type&&ae(e,t))o.children.push(...r.children);else{if("mn"===r.type&&oe(o))r.children=[...o.children,...r.children],n.pop();else if(("msup"===r.type||"msub"===r.type)&&r.children.length>=1&&o&&("mn"===o.type||oe(o))){const e=r.children[0];e instanceof v&&"mn"===e.type&&o&&(e.children=[...o.children,...e.children],n.pop())}n.push(r),o=r}}return n},ce=function(e,t,r=!1){return se(ie(e,t,r),r)},me=function(t,r){if(!t)return new T.MathNode("mrow");if(i[t.type]){return i[t.type](t,r)}throw new e("Got group of unknown type: '"+t.type+"'")},ue=e=>new T.MathNode("mtd",[],[],{padding:"0",width:"50%"}),pe=["mrow","mtd","mtable","mtr"],de=e=>{for(const t of e.children)if(t.type&&pe.includes(t.type)){if(t.classes&&"tml-label"===t.classes[0]){return t.label}{const e=de(t);if(e)return e}}else if(!t.type){const e=de(t);if(e)return e}};function he(e,t,r,n){let s=null;1===e.length&&"tag"===e[0].type&&(s=e[0].tag,e=e[0].body);const o=ie(e,r);if(1===o.length&&o[0]instanceof x)return o[0];const a=n.displayMode||n.annotate?"none":n.wrap,l=0===o.length?null:o[0];let i=1===o.length&&null===s&&l instanceof v?o[0]:function(e,t,r){const n=[];let s=[],o=[],a=0,l=0,i=0;for(;l<e.length;){for(;e[l]instanceof d;)e.splice(l,1,...e[l].children);const r=e[l];if(r.attributes&&r.attributes.linebreak&&"newline"===r.attributes.linebreak){o.length>0&&s.push(new T.MathNode("mrow",o)),s.push(r),o=[];const e=new T.MathNode("mtd",s);e.style.textAlign="left",n.push(new T.MathNode("mtr",[e])),s=[],l+=1}else{if(o.push(r),r.type&&"mo"===r.type&&1===r.children.length&&!Object.hasOwn(r.attributes,"movablelimits")){const n=r.children[0].text;if("([{⌊⌈⟨⟮⎰⟦⦃".indexOf(n)>-1)i+=1;else if(")]}⌋⌉⟩⟯⎱⟦⦄".indexOf(n)>-1)i-=1;else if(0===i&&"="===t&&"="===n){if(a+=1,a>1){o.pop();const e=new T.MathNode("mrow",o);s.push(e),o=[r]}}else if(0===i&&"tex"===t&&"∇"!==n){const t=l<e.length-1?e[l+1]:null;let r=!0;if(!t||"mtext"!==t.type||!t.attributes.linebreak||"nobreak"!==t.attributes.linebreak)for(let t=l+1;t<e.length;t++){const n=e[t];if(!n.type||"mspace"!==n.type||n.attributes.linebreak&&"newline"===n.attributes.linebreak)break;o.push(n),l+=1,n.attributes&&n.attributes.linebreak&&"nobreak"===n.attributes.linebreak&&(r=!1)}if(r){const e=new T.MathNode("mrow",o);s.push(e),o=[]}}}l+=1}}if(o.length>0){const e=new T.MathNode("mrow",o);s.push(e)}if(n.length>0){const e=new T.MathNode("mtd",s);e.style.textAlign="left";const t=new T.MathNode("mtr",[e]);n.push(t);const o=new T.MathNode("mtable",n);return r||(o.setAttribute("columnalign","left"),o.setAttribute("rowspacing","0em")),o}return T.newDocumentFragment(s)}(o,a,n.displayMode);if(s&&(i=((e,t,r,n)=>{t=ce(t[0].body,r),(t=ne(t)).classes.push("tml-tag");const s=de(e);e=new T.MathNode("mtd",[e]);const o=[ue(),e,ue()];o[n?0:2].classes.push(n?"tml-left":"tml-right"),o[n?0:2].children.push(t);const a=new T.MathNode("mtr",o,["tml-tageqn"]);s&&a.setAttribute("id",s);const l=new T.MathNode("mtable",[a]);return l.style.width="100%",l.setAttribute("displaystyle","true"),l})(i,s,r,n.leqno)),n.annotate){const e=new T.MathNode("annotation",[new T.TextNode(t)]);e.setAttribute("encoding","application/x-tex"),i=new T.MathNode("semantics",[i,e])}const c=new T.MathNode("math",[i]);return n.xml&&c.setAttribute("xmlns","http://www.w3.org/1998/Math/MathML"),i.style.width&&(c.style.width="100%"),n.displayMode&&(c.setAttribute("display","block"),c.style.display="block math",c.classes=["tml-display"]),c}const ge="acegıȷmnopqrsuvwxyzαγεηικμνοπρςστυχωϕ𝐚𝐜𝐞𝐠𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐮𝐯𝐰𝐱𝐲𝐳",fe="ABCDEFGHIJKLMNOPQRSTUVWXYZbdfhkltΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩβδλζφθψ𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙𝐛𝐝𝐟𝐡𝐤𝐥𝐭",be=new Set(["\\alpha","\\gamma","\\delta","\\epsilon","\\eta","\\iota","\\kappa","\\mu","\\nu","\\pi","\\rho","\\sigma","\\tau","\\upsilon","\\chi","\\psi","\\omega","\\imath","\\jmath"]),ye=new Set(["\\Gamma","\\Delta","\\Sigma","\\Omega","\\beta","\\delta","\\lambda","\\theta","\\psi"]),we=(e,t)=>{const r=e.isStretchy?C(e):new T.MathNode("mo",[te(e.label,e.mode)]);if("\\vec"===e.label)r.style.transform="scale(0.75) translate(10%, 30%)";else if(r.style.mathStyle="normal",r.style.mathDepth="0",ke.has(e.label)&&o.isCharacterBox(e.base)){let t="";const n=e.base.text;(ge.indexOf(n)>-1||be.has(n))&&(t="tml-xshift"),(fe.indexOf(n)>-1||ye.has(n))&&(t="tml-capshift"),t&&r.classes.push(t)}e.isStretchy||r.setAttribute("stretchy","false");return new T.MathNode("\\c"===e.label?"munder":"mover",[me(e.base,t),r])},xe=new Set(["\\acute","\\grave","\\ddot","\\dddot","\\ddddot","\\tilde","\\bar","\\breve","\\check","\\hat","\\vec","\\dot","\\mathring"]),ke=new Set(["\\acute","\\bar","\\breve","\\check","\\dot","\\ddot","\\grave","\\hat","\\mathring","\\'","\\^","\\~","\\=","\\u","\\.",'\\"',"\\r","\\H","\\v"]),ve={"\\`":"̀","\\'":"́","\\^":"̂","\\~":"̃","\\=":"̄","\\u":"̆","\\.":"̇",'\\"':"̈","\\r":"̊","\\H":"̋","\\v":"̌"};c({type:"accent",names:["\\acute","\\grave","\\ddot","\\dddot","\\ddddot","\\tilde","\\bar","\\breve","\\check","\\hat","\\vec","\\dot","\\mathring","\\overparen","\\widecheck","\\widehat","\\wideparen","\\widetilde","\\overrightarrow","\\overleftarrow","\\Overrightarrow","\\overleftrightarrow","\\overgroup","\\overleftharpoon","\\overrightharpoon"],props:{numArgs:1},handler:(e,t)=>{const r=u(t[0]),n=!xe.has(e.funcName);return{type:"accent",mode:e.parser.mode,label:e.funcName,isStretchy:n,base:r}},mathmlBuilder:we}),c({type:"accent",names:["\\'","\\`","\\^","\\~","\\=","\\c","\\u","\\.",'\\"',"\\r","\\H","\\v"],props:{numArgs:1,allowedInText:!0,allowedInMath:!0,argTypes:["primitive"]},handler:(e,t)=>{const r=u(t[0]),n=e.parser.mode;return"math"===n&&e.parser.settings.strict&&console.log(`Temml parse error: Command ${e.funcName} is invalid in math mode.`),"text"===n&&r.text&&1===r.text.length&&e.funcName in ve&&ge.indexOf(r.text)>-1?{type:"textord",mode:"text",text:r.text+ve[e.funcName]}:{type:"accent",mode:n,label:e.funcName,isStretchy:!1,base:r}},mathmlBuilder:we}),c({type:"accentUnder",names:["\\underleftarrow","\\underrightarrow","\\underleftrightarrow","\\undergroup","\\underparen","\\utilde"],props:{numArgs:1},handler:({parser:e,funcName:t},r)=>{const n=r[0];return{type:"accentUnder",mode:e.mode,label:t,base:n}},mathmlBuilder:(e,t)=>{const r=C(e);r.style["math-depth"]=0;return new T.MathNode("munder",[me(e.base,t),r])}});const Ae={pt:800/803,pc:9600/803,dd:1238/1157*800/803,cc:12.792133216944668,nd:685/642*800/803,nc:1370/107*800/803,sp:1/65536*800/803,mm:25.4/72,cm:2.54/72,in:1/72,px:96/72},Ne=["em","ex","mu","pt","mm","cm","in","px","bp","pc","dd","cc","nd","nc","sp"],Te=function(e){return"string"!=typeof e&&(e=e.unit),Ne.indexOf(e)>-1},Se=e=>[1,.7,.5][Math.max(e-1,0)],qe=function(t,r){let n=t.number;if(r.maxSize[0]<0&&n>0)return{number:0,unit:"em"};const s=t.unit;switch(s){case"mm":case"cm":case"in":case"px":return n*Ae[s]>r.maxSize[1]?{number:r.maxSize[1],unit:"pt"}:{number:n,unit:s};case"em":case"ex":return"ex"===s&&(n*=.431),n=Math.min(n/Se(r.level),r.maxSize[0]),{number:o.round(n),unit:"em"};case"bp":return n>r.maxSize[1]&&(n=r.maxSize[1]),{number:n,unit:"pt"};case"pt":case"pc":case"dd":case"cc":case"nd":case"nc":case"sp":return n=Math.min(n*Ae[s],r.maxSize[1]),{number:o.round(n),unit:"pt"};case"mu":return n=Math.min(n/18,r.maxSize[0]),{number:o.round(n),unit:"em"};default:throw new e("Invalid unit: '"+s+"'")}},Oe=e=>{const t=new T.MathNode("mspace");return t.setAttribute("width",e+"em"),t},Me=(e,t=.3,r=0,n=!1)=>{if(null==e&&0===r)return Oe(t);const s=e?[e]:[];if(0!==t&&s.unshift(Oe(t)),r>0&&s.push(Oe(r)),n){const e=new T.MathNode("mpadded",s);return e.setAttribute("height","0"),e}return new T.MathNode("mrow",s)},Be=(e,t)=>Number(e)/Se(t),Ce=(e,t,r,n)=>{const s=B(e),o="eq"===e.slice(1,3),a="x"===e.charAt(1)?"1.75":"cd"===e.slice(2,4)?"3.0":o?"1.0":"2.0";s.setAttribute("lspace","0"),s.setAttribute("rspace",o?"0.5em":"0");const l=n.withLevel(n.level<2?2:3),i=Be(a,l.level),c=Be(a,3),m=Me(null,i.toFixed(4),0),u=Me(null,c.toFixed(4),0),p=Be(o?0:.3,l.level).toFixed(4);let d,h;const g=t&&t.body&&(t.body.body||t.body.length>0);if(g){let r=me(t,l);r=Me(r,p,p,"\\\\cdrightarrow"===e||"\\\\cdleftarrow"===e),d=new T.MathNode("mover",[r,u])}const f=r&&r.body&&(r.body.body||r.body.length>0);if(f){let e=me(r,l);e=Me(e,p,p),h=new T.MathNode("munder",[e,u])}let b;return b=g||f?g&&f?new T.MathNode("munderover",[s,h,d]):g?new T.MathNode("mover",[s,d]):new T.MathNode("munder",[s,h]):new T.MathNode("mover",[s,m]),"3.0"===a&&(b.style.height="1em"),b.setAttribute("accent","false"),b};c({type:"xArrow",names:["\\xleftarrow","\\xrightarrow","\\xLeftarrow","\\xRightarrow","\\xleftrightarrow","\\xLeftrightarrow","\\xhookleftarrow","\\xhookrightarrow","\\xmapsto","\\xrightharpoondown","\\xrightharpoonup","\\xleftharpoondown","\\xleftharpoonup","\\xlongequal","\\xtwoheadrightarrow","\\xtwoheadleftarrow","\\yields","\\yieldsLeft","\\mesomerism","\\longrightharpoonup","\\longleftharpoondown","\\\\cdrightarrow","\\\\cdleftarrow","\\\\cdlongequal"],props:{numArgs:1,numOptionalArgs:1},handler:({parser:e,funcName:t},r,n)=>({type:"xArrow",mode:e.mode,name:t,body:r[0],below:n[0]}),mathmlBuilder(e,t){const r=[Ce(e.name,e.body,e.below,t)];return r.unshift(Oe(.2778)),r.push(Oe(.2778)),new T.MathNode("mrow",r)}});const ze={"\\xtofrom":["\\xrightarrow","\\xleftarrow"],"\\xleftrightharpoons":["\\xleftharpoonup","\\xrightharpoondown"],"\\xrightleftharpoons":["\\xrightharpoonup","\\xleftharpoondown"],"\\yieldsLeftRight":["\\yields","\\yieldsLeft"],"\\equilibrium":["\\longrightharpoonup","\\longleftharpoondown"],"\\equilibriumRight":["\\longrightharpoonup","\\eqleftharpoondown"],"\\equilibriumLeft":["\\eqrightharpoonup","\\longleftharpoondown"]};function Ee(e,t){if(!e||e.type!==t)throw new Error(`Expected node of type ${t}, but got `+(e?`node of type ${e.type}`:String(e)));return e}function Ie(e){const t=Le(e);if(!t)throw new Error("Expected node of symbol group type, but got "+(e?`node of type ${e.type}`:String(e)));return t}function Le(e){return e&&("atom"===e.type||Object.prototype.hasOwnProperty.call(E,e.type))?e:null}c({type:"stackedArrow",names:["\\xtofrom","\\xleftrightharpoons","\\xrightleftharpoons","\\yieldsLeftRight","\\equilibrium","\\equilibriumRight","\\equilibriumLeft"],props:{numArgs:1,numOptionalArgs:1},handler({parser:e,funcName:t},r,n){const s=r[0]?{type:"hphantom",mode:e.mode,body:r[0]}:null,o=n[0]?{type:"hphantom",mode:e.mode,body:n[0]}:null;return{type:"stackedArrow",mode:e.mode,name:t,body:r[0],upperArrowBelow:o,lowerArrowBody:s,below:n[0]}},mathmlBuilder(e,t){const r=ze[e.name][0],n=ze[e.name][1],s=Ce(r,e.body,e.upperArrowBelow,t),o=Ce(n,e.lowerArrowBody,e.below,t);let a;const l=new T.MathNode("mpadded",[s]);if(l.setAttribute("voffset","0.3em"),l.setAttribute("height","+0.3em"),l.setAttribute("depth","-0.3em"),"\\equilibriumLeft"===e.name){const e=new T.MathNode("mpadded",[o]);e.setAttribute("width","0.5em"),a=new T.MathNode("mpadded",[Oe(.2778),e,l,Oe(.2778)])}else l.setAttribute("width","\\equilibriumRight"===e.name?"0.5em":"0"),a=new T.MathNode("mpadded",[Oe(.2778),l,o,Oe(.2778)]);return a.setAttribute("voffset","-0.18em"),a.setAttribute("height","-0.18em"),a.setAttribute("depth","+0.18em"),a}});const Fe={">":"\\\\cdrightarrow","<":"\\\\cdleftarrow","=":"\\\\cdlongequal",A:"\\uparrow",V:"\\downarrow","|":"\\Vert",".":"no arrow"},$e=e=>"textord"===e.type&&"@"===e.text;function Ge(e,t,r){const n=Fe[e];switch(n){case"\\\\cdrightarrow":case"\\\\cdleftarrow":return r.callFunction(n,[t[0]],[t[1]]);case"\\uparrow":case"\\downarrow":{const e={type:"atom",text:n,mode:"math",family:"rel"},s={type:"ordgroup",mode:"math",body:[r.callFunction("\\\\cdleft",[t[0]],[]),r.callFunction("\\Big",[e],[]),r.callFunction("\\\\cdright",[t[1]],[])],semisimple:!0};return r.callFunction("\\\\cdparent",[s],[])}case"\\\\cdlongequal":return r.callFunction("\\\\cdlongequal",[],[]);case"\\Vert":{const e={type:"textord",text:"\\Vert",mode:"math"};return r.callFunction("\\Big",[e],[])}default:return{type:"textord",text:" ",mode:"math"}}}c({type:"cdlabel",names:["\\\\cdleft","\\\\cdright"],props:{numArgs:1},handler:({parser:e,funcName:t},r)=>({type:"cdlabel",mode:e.mode,side:t.slice(4),label:r[0]}),mathmlBuilder(e,t){if(0===e.label.body.length)return new T.MathNode("mrow",t);const r=new T.MathNode("mtd",[me(e.label,t)]);r.style.padding="0";const n=new T.MathNode("mtr",[r]),s=new T.MathNode("mtable",[n]),o=new T.MathNode("mpadded",[s]);return o.setAttribute("width","0"),o.setAttribute("displaystyle","false"),o.setAttribute("scriptlevel","1"),"left"===e.side&&(o.style.display="flex",o.style.justifyContent="flex-end"),o}}),c({type:"cdlabelparent",names:["\\\\cdparent"],props:{numArgs:1},handler:({parser:e},t)=>({type:"cdlabelparent",mode:e.mode,fragment:t[0]}),mathmlBuilder:(e,t)=>new T.MathNode("mrow",[me(e.fragment,t)])}),c({type:"textord",names:["\\@char"],props:{numArgs:1,allowedInText:!0},handler({parser:t,token:r},n){const s=Ee(n[0],"ordgroup").body;let o="";for(let e=0;e<s.length;e++){o+=Ee(s[e],"textord").text}const a=parseInt(o);if(isNaN(a))throw new e(`\\@char has non-numeric argument ${o}`,r);return{type:"textord",mode:t.mode,text:String.fromCodePoint(a)}}});const De=/^(#[a-f0-9]{3}|#?[a-f0-9]{6})$/i,je=/^(#[a-f0-9]{3}|#?[a-f0-9]{6}|[a-z]+)$/i,Pe=/^ *\d{1,3} *(?:, *\d{1,3} *){2}$/,Re=/^ *[10](?:\.\d*)? *(?:, *[10](?:\.\d*)? *){2}$/,Ue=/^[a-f0-9]{6}$/i,He=e=>{let t=e.toString(16);return 1===t.length&&(t="0"+t),t},Ve=JSON.parse('{\n  "Apricot": "#ffb484",\n  "Aquamarine": "#08b4bc",\n  "Bittersweet": "#c84c14",\n  "blue": "#0000FF",\n  "Blue": "#303494",\n  "BlueGreen": "#08b4bc",\n  "BlueViolet": "#503c94",\n  "BrickRed": "#b8341c",\n  "brown": "#BF8040",\n  "Brown": "#802404",\n  "BurntOrange": "#f8941c",\n  "CadetBlue": "#78749c",\n  "CarnationPink": "#f884b4",\n  "Cerulean": "#08a4e4",\n  "CornflowerBlue": "#40ace4",\n  "cyan": "#00FFFF",\n  "Cyan": "#08acec",\n  "Dandelion": "#ffbc44",\n  "darkgray": "#404040",\n  "DarkOrchid": "#a8548c",\n  "Emerald": "#08ac9c",\n  "ForestGreen": "#089c54",\n  "Fuchsia": "#90348c",\n  "Goldenrod": "#ffdc44",\n  "gray": "#808080",\n  "Gray": "#98949c",\n  "green": "#00FF00",\n  "Green": "#08a44c",\n  "GreenYellow": "#e0e474",\n  "JungleGreen": "#08ac9c",\n  "Lavender": "#f89cc4",\n  "lightgray": "#c0c0c0",\n  "lime": "#BFFF00",\n  "LimeGreen": "#90c43c",\n  "magenta": "#FF00FF",\n  "Magenta": "#f0048c",\n  "Mahogany": "#b0341c",\n  "Maroon": "#b03434",\n  "Melon": "#f89c7c",\n  "MidnightBlue": "#086494",\n  "Mulberry": "#b03c94",\n  "NavyBlue": "#086cbc",\n  "olive": "#7F7F00",\n  "OliveGreen": "#407c34",\n  "orange": "#FF8000",\n  "Orange": "#f8843c",\n  "OrangeRed": "#f0145c",\n  "Orchid": "#b074ac",\n  "Peach": "#f8945c",\n  "Periwinkle": "#8074bc",\n  "PineGreen": "#088c74",\n  "pink": "#ff7f7f",\n  "Plum": "#98248c",\n  "ProcessBlue": "#08b4ec",\n  "purple": "#BF0040",\n  "Purple": "#a0449c",\n  "RawSienna": "#983c04",\n  "red": "#ff0000",\n  "Red": "#f01c24",\n  "RedOrange": "#f86434",\n  "RedViolet": "#a0246c",\n  "Rhodamine": "#f0549c",\n  "Royallue": "#0874bc",\n  "RoyalPurple": "#683c9c",\n  "RubineRed": "#f0047c",\n  "Salmon": "#f8948c",\n  "SeaGreen": "#30bc9c",\n  "Sepia": "#701404",\n  "SkyBlue": "#48c4dc",\n  "SpringGreen": "#c8dc64",\n  "Tan": "#e09c74",\n  "teal": "#007F7F",\n  "TealBlue": "#08acb4",\n  "Thistle": "#d884b4",\n  "Turquoise": "#08b4cc",\n  "violet": "#800080",\n  "Violet": "#60449c",\n  "VioletRed": "#f054a4",\n  "WildStrawberry": "#f0246c",\n  "yellow": "#FFFF00",\n  "Yellow": "#fff404",\n  "YellowGreen": "#98cc6c",\n  "YellowOrange": "#ffa41c"\n}'),_e=(t,r)=>{let n="";if("HTML"===t){if(!De.test(r))throw new e("Invalid HTML input.");n=r}else if("RGB"===t){if(!Pe.test(r))throw new e("Invalid RGB input.");r.split(",").map((e=>{n+=He(Number(e.trim()))}))}else{if(!Re.test(r))throw new e("Invalid rbg input.");r.split(",").map((t=>{const r=Number(t.trim());if(r>1)throw new e("Color rgb input must be < 1.");n+=He(Number((255*r).toFixed(0)))}))}return"#"!==n.charAt(0)&&(n="#"+n),n},We=(t,r,n)=>{const s=`\\\\color@${t}`;if(!je.exec(t))throw new e("Invalid color: '"+t+"'",n);return Ue.test(t)?"#"+t:("#"===t.charAt(0)||(r.has(s)?t=r.get(s).tokens[0].text:Ve[t]&&(t=Ve[t])),t)},Xe=(e,t)=>{let r=ie(e.body,t.withColor(e.color));return r=r.map((t=>(t.style.color=e.color,t))),T.newDocumentFragment(r)};c({type:"color",names:["\\textcolor"],props:{numArgs:2,numOptionalArgs:1,allowedInText:!0,argTypes:["raw","raw","original"]},handler({parser:e,token:t},r,n){const s=n[0]&&Ee(n[0],"raw").string;let o="";if(s){const e=Ee(r[0],"raw").string;o=_e(s,e)}else o=We(Ee(r[0],"raw").string,e.gullet.macros,t);const a=r[1];return{type:"color",mode:e.mode,color:o,isTextColor:!0,body:p(a)}},mathmlBuilder:Xe}),c({type:"color",names:["\\color"],props:{numArgs:1,numOptionalArgs:1,allowedInText:!0,argTypes:["raw","raw"]},handler({parser:e,breakOnTokenText:t,token:r},n,s){const o=s[0]&&Ee(s[0],"raw").string;let a="";if(o){const e=Ee(n[0],"raw").string;a=_e(o,e)}else a=We(Ee(n[0],"raw").string,e.gullet.macros,r);const l=e.parseExpression(!0,t,!0);return{type:"color",mode:e.mode,color:a,isTextColor:!1,body:l}},mathmlBuilder:Xe}),c({type:"color",names:["\\definecolor"],props:{numArgs:3,allowedInText:!0,argTypes:["raw","raw","raw"]},handler({parser:t,funcName:r,token:n},s){const o=Ee(s[0],"raw").string;if(!/^[A-Za-z]+$/.test(o))throw new e("Color name must be latin letters.",n);const a=Ee(s[1],"raw").string;if(!["HTML","RGB","rgb"].includes(a))throw new e("Color model must be HTML, RGB, or rgb.",n);const l=Ee(s[2],"raw").string,i=_e(a,l);return t.gullet.macros.set(`\\\\color@${o}`,{tokens:[{text:i}],numArgs:0}),{type:"internal",mode:t.mode}}}),c({type:"cr",names:["\\\\"],props:{numArgs:0,numOptionalArgs:0,allowedInText:!0},handler({parser:e},t,r){const n="["===e.gullet.future().text?e.parseSizeGroup(!0):null,s=!e.settings.displayMode;return{type:"cr",mode:e.mode,newLine:s,size:n&&Ee(n,"size").value}},mathmlBuilder(e,t){const r=new T.MathNode("mo");if(e.newLine&&(r.setAttribute("linebreak","newline"),e.size)){const n=qe(e.size,t);r.setAttribute("height",n.number+n.unit)}return r}});const Ze={"\\global":"\\global","\\long":"\\\\globallong","\\\\globallong":"\\\\globallong","\\def":"\\gdef","\\gdef":"\\gdef","\\edef":"\\xdef","\\xdef":"\\xdef","\\let":"\\\\globallet","\\futurelet":"\\\\globalfuture"},Ye=t=>{const r=t.text;if(/^(?:[\\{}$&#^_]|EOF)$/.test(r))throw new e("Expected a control sequence",t);return r},Ke=(e,t,r,n)=>{let s=e.gullet.macros.get(r.text);null==s&&(r.noexpand=!0,s={tokens:[r],numArgs:0,unexpandable:!e.gullet.isExpandable(r.text)}),e.gullet.macros.set(t,s,n)};c({type:"internal",names:["\\global","\\long","\\\\globallong"],props:{numArgs:0,allowedInText:!0},handler({parser:t,funcName:r}){t.consumeSpaces();const n=t.fetch();if(Ze[n.text])return"\\global"!==r&&"\\\\globallong"!==r||(n.text=Ze[n.text]),Ee(t.parseFunction(),"internal");throw new e("Invalid token after macro prefix",n)}}),c({type:"internal",names:["\\def","\\gdef","\\edef","\\xdef"],props:{numArgs:0,allowedInText:!0,primitive:!0},handler({parser:t,funcName:r}){let n=t.gullet.popToken();const s=n.text;if(/^(?:[\\{}$&#^_]|EOF)$/.test(s))throw new e("Expected a control sequence",n);let o,a=0;const l=[[]];for(;"{"!==t.gullet.future().text;)if(n=t.gullet.popToken(),"#"===n.text){if("{"===t.gullet.future().text){o=t.gullet.future(),l[a].push("{");break}if(n=t.gullet.popToken(),!/^[1-9]$/.test(n.text))throw new e(`Invalid argument number "${n.text}"`);if(parseInt(n.text)!==a+1)throw new e(`Argument number "${n.text}" out of order`);a++,l.push([])}else{if("EOF"===n.text)throw new e("Expected a macro definition");l[a].push(n.text)}let{tokens:i}=t.gullet.consumeArg();if(o&&i.unshift(o),"\\edef"===r||"\\xdef"===r){if(i=t.gullet.expandTokens(i),i.length>t.gullet.settings.maxExpand)throw new e("Too many expansions in an "+r);i.reverse()}return t.gullet.macros.set(s,{tokens:i,numArgs:a,delimiters:l},r===Ze[r]),{type:"internal",mode:t.mode}}}),c({type:"internal",names:["\\let","\\\\globallet"],props:{numArgs:0,allowedInText:!0,primitive:!0},handler({parser:e,funcName:t}){const r=Ye(e.gullet.popToken());e.gullet.consumeSpaces();const n=(e=>{let t=e.gullet.popToken();return"="===t.text&&(t=e.gullet.popToken()," "===t.text&&(t=e.gullet.popToken())),t})(e);return Ke(e,r,n,"\\\\globallet"===t),{type:"internal",mode:e.mode}}}),c({type:"internal",names:["\\futurelet","\\\\globalfuture"],props:{numArgs:0,allowedInText:!0,primitive:!0},handler({parser:e,funcName:t}){const r=Ye(e.gullet.popToken()),n=e.gullet.popToken(),s=e.gullet.popToken();return Ke(e,r,s,"\\\\globalfuture"===t),e.gullet.pushToken(s),e.gullet.pushToken(n),{type:"internal",mode:e.mode}}}),c({type:"internal",names:["\\newcommand","\\renewcommand","\\providecommand"],props:{numArgs:0,allowedInText:!0,primitive:!0},handler({parser:t,funcName:r}){let n="";const s=t.gullet.popToken();"{"===s.text?(n=Ye(t.gullet.popToken()),t.gullet.popToken()):n=Ye(s);const o=t.gullet.isDefined(n);if(o&&"\\newcommand"===r)throw new e(`\\newcommand{${n}} attempting to redefine ${n}; use \\renewcommand`);if(!o&&"\\renewcommand"===r)throw new e(`\\renewcommand{${n}} when command ${n} does not yet exist; use \\newcommand`);let a=0;if("["===t.gullet.future().text){let r=t.gullet.popToken();if(r=t.gullet.popToken(),!/^[0-9]$/.test(r.text))throw new e(`Invalid number of arguments: "${r.text}"`);if(a=parseInt(r.text),r=t.gullet.popToken(),"]"!==r.text)throw new e(`Invalid argument "${r.text}"`)}const{tokens:l}=t.gullet.consumeArg();return"\\providecommand"===r&&t.gullet.macros.has(n)||t.gullet.macros.set(n,{tokens:l,numArgs:a}),{type:"internal",mode:t.mode}}});const Je={"\\bigl":{mclass:"mopen",size:1},"\\Bigl":{mclass:"mopen",size:2},"\\biggl":{mclass:"mopen",size:3},"\\Biggl":{mclass:"mopen",size:4},"\\bigr":{mclass:"mclose",size:1},"\\Bigr":{mclass:"mclose",size:2},"\\biggr":{mclass:"mclose",size:3},"\\Biggr":{mclass:"mclose",size:4},"\\bigm":{mclass:"mrel",size:1},"\\Bigm":{mclass:"mrel",size:2},"\\biggm":{mclass:"mrel",size:3},"\\Biggm":{mclass:"mrel",size:4},"\\big":{mclass:"mord",size:1},"\\Big":{mclass:"mord",size:2},"\\bigg":{mclass:"mord",size:3},"\\Bigg":{mclass:"mord",size:4}},Qe=["(","\\lparen",")","\\rparen","[","\\lbrack","]","\\rbrack","\\{","\\lbrace","\\}","\\rbrace","⦇","\\llparenthesis","⦈","\\rrparenthesis","\\lfloor","\\rfloor","⌊","⌋","\\lceil","\\rceil","⌈","⌉","<",">","\\langle","⟨","\\rangle","⟩","\\lAngle","⟪","\\rAngle","⟫","\\llangle","⦉","\\rrangle","⦊","\\lt","\\gt","\\lvert","\\rvert","\\lVert","\\rVert","\\lgroup","\\rgroup","⟮","⟯","\\lmoustache","\\rmoustache","⎰","⎱","\\llbracket","\\rrbracket","⟦","⟦","\\lBrace","\\rBrace","⦃","⦄","/","\\backslash","|","\\vert","\\|","\\Vert","‖","\\uparrow","\\Uparrow","\\downarrow","\\Downarrow","\\updownarrow","\\Updownarrow","."],et=["}","\\left","\\middle","\\right"],tt=e=>e.length>0&&(Qe.includes(e)||Je[e]||et.includes(e)),rt=[0,1.2,1.8,2.4,3];function nt(t,r){const n=Le(t);if(n&&Qe.includes(n.text))return["<","\\lt"].includes(n.text)&&(n.text="⟨"),[">","\\gt"].includes(n.text)&&(n.text="⟩"),n;throw new e(n?`Invalid delimiter '${n.text}' after '${r.funcName}'`:`Invalid delimiter type '${t.type}'`,t)}const st=["/","\\","\\backslash","\\vert","|"];c({type:"delimsizing",names:["\\bigl","\\Bigl","\\biggl","\\Biggl","\\bigr","\\Bigr","\\biggr","\\Biggr","\\bigm","\\Bigm","\\biggm","\\Biggm","\\big","\\Big","\\bigg","\\Bigg"],props:{numArgs:1,argTypes:["primitive"]},handler:(e,t)=>{const r=nt(t[0],e);return{type:"delimsizing",mode:e.parser.mode,size:Je[e.funcName].size,mclass:Je[e.funcName].mclass,delim:r.text}},mathmlBuilder:e=>{const t=[];"."===e.delim&&(e.delim=""),t.push(te(e.delim,e.mode));const r=new T.MathNode("mo",t);return"mopen"===e.mclass||"mclose"===e.mclass?r.setAttribute("fence","true"):r.setAttribute("fence","false"),(st.includes(e.delim)||e.delim.indexOf("arrow")>-1)&&r.setAttribute("stretchy","true"),r.setAttribute("symmetric","true"),r.setAttribute("minsize",rt[e.size]+"em"),r.setAttribute("maxsize",rt[e.size]+"em"),r}}),c({type:"leftright-right",names:["\\right"],props:{numArgs:1,argTypes:["primitive"]},handler:(e,t)=>({type:"leftright-right",mode:e.parser.mode,delim:nt(t[0],e).text})}),c({type:"leftright",names:["\\left"],props:{numArgs:1,argTypes:["primitive"]},handler:(t,r)=>{const n=nt(r[0],t),s=t.parser;++s.leftrightDepth;let o=s.parseExpression(!1,null,!0),a=s.fetch();for(;"\\middle"===a.text;){s.consume();const t=s.fetch().text;if(!I.math[t])throw new e(`Invalid delimiter '${t}' after '\\middle'`);nt({type:"atom",mode:"math",text:t},{funcName:"\\middle"}),o.push({type:"middle",mode:"math",delim:t}),s.consume(),o=o.concat(s.parseExpression(!1,null,!0)),a=s.fetch()}--s.leftrightDepth,s.expect("\\right",!1);const l=Ee(s.parseFunction(),"leftright-right");return{type:"leftright",mode:s.mode,body:o,left:n.text,right:l.delim}},mathmlBuilder:(e,t)=>{!function(e){if(!e.body)throw new Error("Bug: The leftright ParseNode wasn't fully parsed.")}(e);const r=ie(e.body,t);"."===e.left&&(e.left="");const n=new T.MathNode("mo",[te(e.left,e.mode)]);n.setAttribute("fence","true"),n.setAttribute("form","prefix"),("/"===e.left||"\\"===e.left||e.left.indexOf("arrow")>-1)&&n.setAttribute("stretchy","true"),r.unshift(n),"."===e.right&&(e.right="");const s=new T.MathNode("mo",[te(e.right,e.mode)]);if(s.setAttribute("fence","true"),s.setAttribute("form","postfix"),("∖"===e.right||e.right.indexOf("arrow")>-1)&&s.setAttribute("stretchy","true"),e.body.length>0){const t=e.body[e.body.length-1];"color"!==t.type||t.isTextColor||s.setAttribute("mathcolor",t.color)}return r.push(s),se(r)}}),c({type:"middle",names:["\\middle"],props:{numArgs:1,argTypes:["primitive"]},handler:(t,r)=>{const n=nt(r[0],t);if(!t.parser.leftrightDepth)throw new e("\\middle without preceding \\left",n);return{type:"middle",mode:t.parser.mode,delim:n.text}},mathmlBuilder:(e,t)=>{const r=te(e.delim,e.mode),n=new T.MathNode("mo",[r]);return n.setAttribute("fence","true"),e.delim.indexOf("arrow")>-1&&n.setAttribute("stretchy","true"),n.setAttribute("form","prefix"),n.setAttribute("lspace","0.05em"),n.setAttribute("rspace","0.05em"),n}});const ot=e=>{const t=new T.MathNode("mspace");return t.setAttribute("width","3pt"),t},at=(e,t)=>{let r;switch(r=e.label.indexOf("colorbox")>-1||"\\boxed"===e.label?new T.MathNode("mrow",[ot(),me(e.body,t),ot()]):new T.MathNode("menclose",[me(e.body,t)]),e.label){case"\\overline":r.setAttribute("notation","top"),r.classes.push("tml-overline");break;case"\\underline":r.setAttribute("notation","bottom"),r.classes.push("tml-underline");break;case"\\cancel":r.setAttribute("notation","updiagonalstrike"),r.children.push(new T.MathNode("mrow",[],["tml-cancel","upstrike"]));break;case"\\bcancel":r.setAttribute("notation","downdiagonalstrike"),r.children.push(new T.MathNode("mrow",[],["tml-cancel","downstrike"]));break;case"\\sout":r.setAttribute("notation","horizontalstrike"),r.children.push(new T.MathNode("mrow",[],["tml-cancel","sout"]));break;case"\\xcancel":r.setAttribute("notation","updiagonalstrike downdiagonalstrike"),r.classes.push("tml-xcancel");break;case"\\longdiv":r.setAttribute("notation","longdiv"),r.classes.push("longdiv-top"),r.children.push(new T.MathNode("mrow",[],["longdiv-arc"]));break;case"\\phase":r.setAttribute("notation","phasorangle"),r.classes.push("phasor-bottom"),r.children.push(new T.MathNode("mrow",[],["phasor-angle"]));break;case"\\textcircled":r.setAttribute("notation","circle"),r.classes.push("circle-pad"),r.children.push(new T.MathNode("mrow",[],["textcircle"]));break;case"\\angl":r.setAttribute("notation","actuarial"),r.classes.push("actuarial");break;case"\\boxed":r.setAttribute("notation","box"),r.classes.push("tml-box"),r.setAttribute("scriptlevel","0"),r.setAttribute("displaystyle","true");break;case"\\fbox":r.setAttribute("notation","box"),r.classes.push("tml-fbox");break;case"\\fcolorbox":case"\\colorbox":{const t={padding:"3pt 0 3pt 0"};"\\fcolorbox"===e.label&&(t.border="0.0667em solid "+String(e.borderColor)),r.style=t;break}}return e.backgroundColor&&r.setAttribute("mathbackground",e.backgroundColor),r};c({type:"enclose",names:["\\colorbox"],props:{numArgs:2,numOptionalArgs:1,allowedInText:!0,argTypes:["raw","raw","text"]},handler({parser:e,funcName:t},r,n){const s=n[0]&&Ee(n[0],"raw").string;let o="";if(s){const e=Ee(r[0],"raw").string;o=_e(s,e)}else o=We(Ee(r[0],"raw").string,e.gullet.macros);const a=r[1];return{type:"enclose",mode:e.mode,label:t,backgroundColor:o,body:a}},mathmlBuilder:at}),c({type:"enclose",names:["\\fcolorbox"],props:{numArgs:3,numOptionalArgs:1,allowedInText:!0,argTypes:["raw","raw","raw","text"]},handler({parser:e,funcName:t},r,n){const s=n[0]&&Ee(n[0],"raw").string;let o,a="";if(s){const e=Ee(r[0],"raw").string,t=Ee(r[0],"raw").string;a=_e(s,e),o=_e(s,t)}else a=We(Ee(r[0],"raw").string,e.gullet.macros),o=We(Ee(r[1],"raw").string,e.gullet.macros);const l=r[2];return{type:"enclose",mode:e.mode,label:t,backgroundColor:o,borderColor:a,body:l}},mathmlBuilder:at}),c({type:"enclose",names:["\\fbox"],props:{numArgs:1,argTypes:["hbox"],allowedInText:!0},handler:({parser:e},t)=>({type:"enclose",mode:e.mode,label:"\\fbox",body:t[0]})}),c({type:"enclose",names:["\\angl","\\cancel","\\bcancel","\\xcancel","\\sout","\\overline","\\boxed","\\longdiv","\\phase"],props:{numArgs:1},handler({parser:e,funcName:t},r){const n=r[0];return{type:"enclose",mode:e.mode,label:t,body:n}},mathmlBuilder:at}),c({type:"enclose",names:["\\underline"],props:{numArgs:1,allowedInText:!0},handler({parser:e,funcName:t},r){const n=r[0];return{type:"enclose",mode:e.mode,label:t,body:n}},mathmlBuilder:at}),c({type:"enclose",names:["\\textcircled"],props:{numArgs:1,argTypes:["text"],allowedInArgument:!0,allowedInText:!0},handler({parser:e,funcName:t},r){const n=r[0];return{type:"enclose",mode:e.mode,label:t,body:n}},mathmlBuilder:at});const lt={};function it({type:e,names:t,props:r,handler:n,mathmlBuilder:s}){const o={type:e,numArgs:r.numArgs||0,allowedInText:!1,numOptionalArgs:0,handler:n};for(let e=0;e<t.length;++e)lt[t[e]]=o;s&&(i[e]=s)}class ct{constructor(e,t,r){this.lexer=e,this.start=t,this.end=r}static range(e,t){return t?e&&e.loc&&t.loc&&e.loc.lexer===t.loc.lexer?new ct(e.loc.lexer,e.loc.start,t.loc.end):null:e&&e.loc}}class mt{constructor(e,t){this.text=e,this.loc=t}range(e,t){return new mt(t,ct.range(this,e))}}const ut=0,pt=1,dt=2,ht=3,gt={};function ft(e,t){gt[e]=t}const bt=gt;ft("\\noexpand",(function(e){const t=e.popToken();return e.isExpandable(t.text)&&(t.noexpand=!0,t.treatAsRelax=!0),{tokens:[t],numArgs:0}})),ft("\\expandafter",(function(e){const t=e.popToken();return e.expandOnce(!0),{tokens:[t],numArgs:0}})),ft("\\@firstoftwo",(function(e){return{tokens:e.consumeArgs(2)[0],numArgs:0}})),ft("\\@secondoftwo",(function(e){return{tokens:e.consumeArgs(2)[1],numArgs:0}})),ft("\\@ifnextchar",(function(e){const t=e.consumeArgs(3);e.consumeSpaces();const r=e.future();return 1===t[0].length&&t[0][0].text===r.text?{tokens:t[1],numArgs:0}:{tokens:t[2],numArgs:0}})),ft("\\@ifstar","\\@ifnextchar *{\\@firstoftwo{#1}}"),ft("\\TextOrMath",(function(e){const t=e.consumeArgs(2);return"text"===e.mode?{tokens:t[0],numArgs:0}:{tokens:t[1],numArgs:0}}));const yt=e=>{let t="";for(let r=e.length-1;r>-1;r--)t+=e[r].text;return t},wt={0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,a:10,A:10,b:11,B:11,c:12,C:12,d:13,D:13,e:14,E:14,f:15,F:15},xt=e=>{const t=e.future().text;return"EOF"===t?[null,""]:[wt[t.charAt(0)],t]},kt=(e,t,r)=>{for(let n=1;n<t.length;n++){e*=r,e+=wt[t.charAt(n)]}return e};function vt(e){const t=e.consumeArgs(1)[0];let r="",n=t[t.length-1].loc.start;for(let e=t.length-1;e>=0;e--){const s=t[e].loc.start;s>n&&(r+=" ",n=s),r+=t[e].text,n+=t[e].text.length}return r}ft("\\char",(function(t){let r,n=t.popToken(),s="";if("'"===n.text)r=8,n=t.popToken();else if('"'===n.text)r=16,n=t.popToken();else if("`"===n.text)if(n=t.popToken(),"\\"===n.text[0])s=n.text.charCodeAt(1);else{if("EOF"===n.text)throw new e("\\char` missing argument");s=n.text.charCodeAt(0)}else r=10;if(r){let o,a=n.text;if(s=wt[a.charAt(0)],null==s||s>=r)throw new e(`Invalid base-${r} digit ${n.text}`);for(s=kt(s,a,r),[o,a]=xt(t);null!=o&&o<r;)s*=r,s+=o,s=kt(s,a,r),t.popToken(),[o,a]=xt(t)}return`\\@char{${s}}`})),ft("\\surd","\\sqrt{\\vphantom{|}}"),ft("⊕","\\oplus"),ft("\\long",""),ft("\\bgroup","{"),ft("\\egroup","}"),ft("~","\\nobreakspace"),ft("\\lq","`"),ft("\\rq","'"),ft("\\aa","\\r a"),ft("\\Bbbk","\\Bbb{k}"),ft("\\mathstrut","\\vphantom{(}"),ft("\\underbar","\\underline{\\text{#1}}"),ft("\\vdots","{\\varvdots\\rule{0pt}{15pt}}"),ft("⋮","\\vdots"),ft("\\arraystretch","1"),ft("\\arraycolsep","6pt"),ft("\\substack","\\begin{subarray}{c}#1\\end{subarray}"),ft("\\iff","\\DOTSB\\;\\Longleftrightarrow\\;"),ft("\\implies","\\DOTSB\\;\\Longrightarrow\\;"),ft("\\impliedby","\\DOTSB\\;\\Longleftarrow\\;");const At={",":"\\dotsc","\\not":"\\dotsb","+":"\\dotsb","=":"\\dotsb","<":"\\dotsb",">":"\\dotsb","-":"\\dotsb","*":"\\dotsb",":":"\\dotsb","\\DOTSB":"\\dotsb","\\coprod":"\\dotsb","\\bigvee":"\\dotsb","\\bigwedge":"\\dotsb","\\biguplus":"\\dotsb","\\bigcap":"\\dotsb","\\bigcup":"\\dotsb","\\prod":"\\dotsb","\\sum":"\\dotsb","\\bigotimes":"\\dotsb","\\bigoplus":"\\dotsb","\\bigodot":"\\dotsb","\\bigsqcap":"\\dotsb","\\bigsqcup":"\\dotsb","\\bigtimes":"\\dotsb","\\And":"\\dotsb","\\longrightarrow":"\\dotsb","\\Longrightarrow":"\\dotsb","\\longleftarrow":"\\dotsb","\\Longleftarrow":"\\dotsb","\\longleftrightarrow":"\\dotsb","\\Longleftrightarrow":"\\dotsb","\\mapsto":"\\dotsb","\\longmapsto":"\\dotsb","\\hookrightarrow":"\\dotsb","\\doteq":"\\dotsb","\\mathbin":"\\dotsb","\\mathrel":"\\dotsb","\\relbar":"\\dotsb","\\Relbar":"\\dotsb","\\xrightarrow":"\\dotsb","\\xleftarrow":"\\dotsb","\\DOTSI":"\\dotsi","\\int":"\\dotsi","\\oint":"\\dotsi","\\iint":"\\dotsi","\\iiint":"\\dotsi","\\iiiint":"\\dotsi","\\idotsint":"\\dotsi","\\DOTSX":"\\dotsx"};ft("\\dots",(function(e){let t="\\dotso";const r=e.expandAfterFuture().text;return r in At?t=At[r]:("\\not"===r.slice(0,4)||r in I.math&&["bin","rel"].includes(I.math[r].group))&&(t="\\dotsb"),t}));const Nt={")":!0,"]":!0,"\\rbrack":!0,"\\}":!0,"\\rbrace":!0,"\\rangle":!0,"\\rceil":!0,"\\rfloor":!0,"\\rgroup":!0,"\\rmoustache":!0,"\\right":!0,"\\bigr":!0,"\\biggr":!0,"\\Bigr":!0,"\\Biggr":!0,$:!0,";":!0,".":!0,",":!0};ft("\\dotso",(function(e){return e.future().text in Nt?"\\ldots\\,":"\\ldots"})),ft("\\dotsc",(function(e){const t=e.future().text;return t in Nt&&","!==t?"\\ldots\\,":"\\ldots"})),ft("\\cdots",(function(e){return e.future().text in Nt?"\\@cdots\\,":"\\@cdots"})),ft("\\dotsb","\\cdots"),ft("\\dotsm","\\cdots"),ft("\\dotsi","\\!\\cdots"),ft("\\idotsint","\\dotsi"),ft("\\dotsx","\\ldots\\,"),ft("\\DOTSI","\\relax"),ft("\\DOTSB","\\relax"),ft("\\DOTSX","\\relax"),ft("\\tmspace","\\TextOrMath{\\kern#1#3}{\\mskip#1#2}\\relax"),ft("\\,","{\\tmspace+{3mu}{.1667em}}"),ft("\\thinspace","\\,"),ft("\\>","\\mskip{4mu}"),ft("\\:","{\\tmspace+{4mu}{.2222em}}"),ft("\\medspace","\\:"),ft("\\;","{\\tmspace+{5mu}{.2777em}}"),ft("\\thickspace","\\;"),ft("\\!","{\\tmspace-{3mu}{.1667em}}"),ft("\\negthinspace","\\!"),ft("\\negmedspace","{\\tmspace-{4mu}{.2222em}}"),ft("\\negthickspace","{\\tmspace-{5mu}{.277em}}"),ft("\\enspace","\\kern.5em "),ft("\\enskip","\\hskip.5em\\relax"),ft("\\quad","\\hskip1em\\relax"),ft("\\qquad","\\hskip2em\\relax"),ft("\\AA","\\TextOrMath{\\Angstrom}{\\mathring{A}}\\relax"),ft("\\tag","\\@ifstar\\tag@literal\\tag@paren"),ft("\\tag@paren","\\tag@literal{({#1})}"),ft("\\tag@literal",(t=>{if(t.macros.get("\\df@tag"))throw new e("Multiple \\tag");return"\\gdef\\df@tag{\\text{#1}}"})),ft("\\notag","\\nonumber"),ft("\\nonumber","\\gdef\\@eqnsw{0}"),ft("\\bmod","\\mathbin{\\text{mod}}"),ft("\\pod","\\allowbreak\\mathchoice{\\mkern18mu}{\\mkern8mu}{\\mkern8mu}{\\mkern8mu}(#1)"),ft("\\pmod","\\pod{{\\rm mod}\\mkern6mu#1}"),ft("\\mod","\\allowbreak\\mathchoice{\\mkern18mu}{\\mkern12mu}{\\mkern12mu}{\\mkern12mu}{\\rm mod}\\,\\,#1"),ft("\\newline","\\\\\\relax"),ft("\\TeX","\\textrm{T}\\kern-.1667em\\raisebox{-.5ex}{E}\\kern-.125em\\textrm{X}"),ft("\\LaTeX","\\textrm{L}\\kern-.35em\\raisebox{0.2em}{\\scriptstyle A}\\kern-.15em\\TeX"),ft("\\Temml","\\textrm{T}\\kern-0.2em\\lower{0.2em}{\\textrm{E}}\\kern-0.08em{\\textrm{M}\\kern-0.08em\\raise{0.2em}\\textrm{M}\\kern-0.08em\\textrm{L}}"),ft("\\hspace","\\@ifstar\\@hspacer\\@hspace"),ft("\\@hspace","\\hskip #1\\relax"),ft("\\@hspacer","\\rule{0pt}{0pt}\\hskip #1\\relax"),ft("\\colon",'\\mathpunct{\\char"3a}'),ft("\\prescript","\\pres@cript{_{#1}^{#2}}{}{#3}"),ft("\\ordinarycolon",'\\char"3a'),ft("\\vcentcolon","\\mathrel{\\raisebox{0.035em}{\\ordinarycolon}}"),ft("\\coloneq",'\\mathrel{\\raisebox{0.035em}{\\ordinarycolon}\\char"2212}'),ft("\\Coloneq",'\\mathrel{\\char"2237\\char"2212}'),ft("\\Eqqcolon",'\\mathrel{\\char"3d\\char"2237}'),ft("\\Eqcolon",'\\mathrel{\\char"2212\\char"2237}'),ft("\\colonapprox",'\\mathrel{\\raisebox{0.035em}{\\ordinarycolon}\\char"2248}'),ft("\\Colonapprox",'\\mathrel{\\char"2237\\char"2248}'),ft("\\colonsim",'\\mathrel{\\raisebox{0.035em}{\\ordinarycolon}\\char"223c}'),ft("\\Colonsim",'\\mathrel{\\raisebox{0.035em}{\\ordinarycolon}\\char"223c}'),ft("\\ratio","\\vcentcolon"),ft("\\coloncolon","\\dblcolon"),ft("\\colonequals","\\coloneqq"),ft("\\coloncolonequals","\\Coloneqq"),ft("\\equalscolon","\\eqqcolon"),ft("\\equalscoloncolon","\\Eqqcolon"),ft("\\colonminus","\\coloneq"),ft("\\coloncolonminus","\\Coloneq"),ft("\\minuscolon","\\eqcolon"),ft("\\minuscoloncolon","\\Eqcolon"),ft("\\coloncolonapprox","\\Colonapprox"),ft("\\coloncolonsim","\\Colonsim"),ft("\\notni","\\mathrel{\\char`∌}"),ft("\\limsup","\\DOTSB\\operatorname*{lim\\,sup}"),ft("\\liminf","\\DOTSB\\operatorname*{lim\\,inf}"),ft("\\injlim","\\DOTSB\\operatorname*{inj\\,lim}"),ft("\\projlim","\\DOTSB\\operatorname*{proj\\,lim}"),ft("\\varlimsup","\\DOTSB\\operatorname*{\\overline{\\text{lim}}}"),ft("\\varliminf","\\DOTSB\\operatorname*{\\underline{\\text{lim}}}"),ft("\\varinjlim","\\DOTSB\\operatorname*{\\underrightarrow{\\text{lim}}}"),ft("\\varprojlim","\\DOTSB\\operatorname*{\\underleftarrow{\\text{lim}}}"),ft("\\centerdot","{\\medspace\\rule{0.167em}{0.189em}\\medspace}"),ft("\\argmin","\\DOTSB\\operatorname*{arg\\,min}"),ft("\\argmax","\\DOTSB\\operatorname*{arg\\,max}"),ft("\\plim","\\DOTSB\\operatorname*{plim}"),ft("\\leftmodels","\\mathop{\\reflectbox{$\\models$}}"),ft("\\bra","\\mathinner{\\langle{#1}|}"),ft("\\ket","\\mathinner{|{#1}\\rangle}"),ft("\\braket","\\mathinner{\\langle{#1}\\rangle}"),ft("\\Bra","\\left\\langle#1\\right|"),ft("\\Ket","\\left|#1\\right\\rangle");const Tt=(e,t)=>{const r=`}\\,\\middle${"|"===t[0]?"\\vert":"\\Vert"}\\,{`;return e.slice(0,t.index)+r+e.slice(t.index+t[0].length)};ft("\\Braket",(function(e){let t=vt(e);const r=/\|\||\||\\\|/g;let n;for(;null!==(n=r.exec(t));)t=Tt(t,n);return"\\left\\langle{"+t+"}\\right\\rangle"})),ft("\\Set",(function(e){let t=vt(e);const r=/\|\||\||\\\|/.exec(t);return r&&(t=Tt(t,r)),"\\left\\{\\:{"+t+"}\\:\\right\\}"})),ft("\\set",(function(e){return"\\{{"+vt(e).replace(/\|/,"}\\mid{")+"}\\}"})),ft("\\angln","{\\angl n}"),ft("\\odv","\\@ifstar\\odv@next\\odv@numerator"),ft("\\odv@numerator","\\frac{\\mathrm{d}#1}{\\mathrm{d}#2}"),ft("\\odv@next","\\frac{\\mathrm{d}}{\\mathrm{d}#2}#1"),ft("\\pdv","\\@ifstar\\pdv@next\\pdv@numerator");const St=e=>{const t=e[0][0].text,r=yt(e[1]).split(","),n=String(r.length),s="1"===n?"\\partial":`\\partial^${n}`;let o="";return r.map((e=>{o+="\\partial "+e.trim()+"\\,"})),[t,s,o.replace(/\\,$/,"")]};function qt(e){const t=[];e.consumeSpaces();let r=e.fetch().text;for("\\relax"===r&&(e.consume(),e.consumeSpaces(),r=e.fetch().text);"\\hline"===r||"\\hdashline"===r;)e.consume(),t.push("\\hdashline"===r),e.consumeSpaces(),r=e.fetch().text;return t}ft("\\pdv@numerator",(function(e){const[t,r,n]=St(e.consumeArgs(2));return`\\frac{${r} ${t}}{${n}}`})),ft("\\pdv@next",(function(e){const[t,r,n]=St(e.consumeArgs(2));return`\\frac{${r}}{${n}} ${t}`})),ft("\\upalpha","\\up@greek{\\alpha}"),ft("\\upbeta","\\up@greek{\\beta}"),ft("\\upgamma","\\up@greek{\\gamma}"),ft("\\updelta","\\up@greek{\\delta}"),ft("\\upepsilon","\\up@greek{\\epsilon}"),ft("\\upzeta","\\up@greek{\\zeta}"),ft("\\upeta","\\up@greek{\\eta}"),ft("\\uptheta","\\up@greek{\\theta}"),ft("\\upiota","\\up@greek{\\iota}"),ft("\\upkappa","\\up@greek{\\kappa}"),ft("\\uplambda","\\up@greek{\\lambda}"),ft("\\upmu","\\up@greek{\\mu}"),ft("\\upnu","\\up@greek{\\nu}"),ft("\\upxi","\\up@greek{\\xi}"),ft("\\upomicron","\\up@greek{\\omicron}"),ft("\\uppi","\\up@greek{\\pi}"),ft("\\upalpha","\\up@greek{\\alpha}"),ft("\\uprho","\\up@greek{\\rho}"),ft("\\upsigma","\\up@greek{\\sigma}"),ft("\\uptau","\\up@greek{\\tau}"),ft("\\upupsilon","\\up@greek{\\upsilon}"),ft("\\upphi","\\up@greek{\\phi}"),ft("\\upchi","\\up@greek{\\chi}"),ft("\\uppsi","\\up@greek{\\psi}"),ft("\\upomega","\\up@greek{\\omega}"),ft("\\invamp",'\\mathbin{\\char"214b}'),ft("\\parr",'\\mathbin{\\char"214b}'),ft("\\with",'\\mathbin{\\char"26}'),ft("\\multimapinv",'\\mathrel{\\char"27dc}'),ft("\\multimapboth",'\\mathrel{\\char"29df}'),ft("\\scoh",'{\\mkern5mu\\char"2322\\mkern5mu}'),ft("\\sincoh",'{\\mkern5mu\\char"2323\\mkern5mu}'),ft("\\coh",'{\\mkern5mu\\rule{}{0.7em}\\mathrlap{\\smash{\\raise2mu{\\char"2322}}}\n{\\smash{\\lower4mu{\\char"2323}}}\\mkern5mu}'),ft("\\incoh",'{\\mkern5mu\\rule{}{0.7em}\\mathrlap{\\smash{\\raise2mu{\\char"2323}}}\n{\\smash{\\lower4mu{\\char"2322}}}\\mkern5mu}'),ft("\\standardstate","\\text{\\tiny\\char`⦵}");const Ot=t=>{if(!t.parser.settings.displayMode)throw new e(`{${t.envName}} can be used only in display mode.`)},Mt=/([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/,Bt=e=>{let t=e.get("\\arraystretch");"string"!=typeof t&&(t=yt(t.tokens)),t=isNaN(t)?null:Number(t);let r=e.get("\\arraycolsep");"string"!=typeof r&&(r=yt(r.tokens));const n=Mt.exec(r);return[t,n?{number:+(n[1]+n[2]),unit:n[3]}:null]},Ct=t=>{let r="";for(let n=0;n<t.length;n++)if("label"===t[n].type){if(r)throw new e("Multiple \\labels in one row");r=t[n].string}return r};function zt(e){if(-1===e.indexOf("ed"))return-1===e.indexOf("*")}function Et(t,{cols:r,envClasses:n,autoTag:s,singleRow:o,emptySingleRow:a,maxNumCols:l,leqno:i,arraystretch:c,arraycolsep:m},u){t.gullet.beginGroup(),o||t.gullet.macros.set("\\cr","\\\\\\relax"),t.gullet.beginGroup();let p=[];const d=[p],h=[],g=[],f=[],b=null!=s?[]:void 0;function y(){s&&t.gullet.macros.set("\\@eqnsw","1",!0)}function w(){b&&(t.gullet.macros.get("\\df@tag")?(b.push(t.subparse([new mt("\\df@tag")])),t.gullet.macros.set("\\df@tag",void 0,!0)):b.push(Boolean(s)&&"1"===t.gullet.macros.get("\\@eqnsw")))}for(y(),f.push(qt(t));;){let r=t.parseExpression(!1,o?"\\end":"\\\\");t.gullet.endGroup(),t.gullet.beginGroup(),r={type:"ordgroup",mode:t.mode,body:r,semisimple:!0},p.push(r);const s=t.fetch().text;if("&"===s){if(l&&p.length===l){if(!n.includes("array"))throw new e(2===l?"The split environment accepts no more than two columns":"The equation environment accepts only one column",t.nextToken);if(t.settings.strict)throw new e("Too few columns specified in the {array} column argument.",t.nextToken)}t.consume()}else{if("\\end"===s){w(),1===p.length&&0===r.body.length&&(d.length>1||!a)&&d.pop(),g.push(Ct(r.body)),f.length<d.length+1&&f.push([]);break}if("\\\\"!==s)throw new e("Expected & or \\\\ or \\cr or \\end",t.nextToken);{let e;t.consume()," "!==t.gullet.future().text&&(e=t.parseSizeGroup(!0)),h.push(e?e.value:null),w(),g.push(Ct(r.body)),f.push(qt(t)),p=[],d.push(p),y()}}}return t.gullet.endGroup(),t.gullet.endGroup(),{type:"array",mode:t.mode,body:d,cols:r,rowGaps:h,hLinesBeforeRow:f,envClasses:n,autoTag:s,scriptLevel:u,tags:b,labels:g,leqno:i,arraystretch:c,arraycolsep:m}}function It(e){return"d"===e.slice(0,1)?"display":"text"}const Lt={c:"center ",l:"left ",r:"right "},Ft=e=>{const t=new T.MathNode("mtd",[]);return t.style={padding:"0",width:"50%"},e.envClasses.includes("multline")&&(t.style.width="7.5%"),t},$t=function(e,t){const r=[],n=e.body.length,s=e.hLinesBeforeRow;for(let o=0;o<n;o++){const a=e.body[o],l=[],i="text"===e.scriptLevel?pt:"script"===e.scriptLevel?dt:ut;for(let r=0;r<a.length;r++){const s=new T.MathNode("mtd",[me(a[r],t.withLevel(i))]);if(e.envClasses.includes("multline")){const e=0===o?"left":o===n-1?"right":"center";s.setAttribute("columnalign",e),"center"!==e&&s.classes.push("tml-"+e)}l.push(s)}const c=e.body[0].length;for(let e=0;e<c-a.length;e++)l.push(new T.MathNode("mtd",[],t));if(e.autoTag){const r=e.tags[o];let n;!0===r?n=new T.MathNode("mtext",[new y(["tml-eqn"])]):!1===r?n=new T.MathNode("mtext",[],[]):(n=ce(r[0].body,t.withLevel(i),!0),n=ne(n),n.classes=["tml-tag"]),n&&(l.unshift(Ft(e)),l.push(Ft(e)),e.leqno?(l[0].children.push(n),l[0].classes.push("tml-left")):(l[l.length-1].children.push(n),l[l.length-1].classes.push("tml-right")))}const m=new T.MathNode("mtr",l,[]),u=e.labels.shift();u&&e.tags&&e.tags[o]&&(m.setAttribute("id",u),Array.isArray(e.tags[o])&&m.classes.push("tml-tageqn")),0===o&&s[0].length>0&&(2===s[0].length?m.children.forEach((e=>{e.style.borderTop="0.15em double"})):m.children.forEach((e=>{e.style.borderTop=s[0][0]?"0.06em dashed":"0.06em solid"}))),s[o+1].length>0&&(2===s[o+1].length?m.children.forEach((e=>{e.style.borderBottom="0.15em double"})):m.children.forEach((e=>{e.style.borderBottom=s[o+1][0]?"0.06em dashed":"0.06em solid"}))),r.push(m)}if(e.envClasses.length>0){if(e.arraystretch&&1!==e.arraystretch){const t=String(1.4*e.arraystretch-.8)+"ex";for(let e=0;e<r.length;e++)for(let n=0;n<r[e].children.length;n++)r[e].children[n].style.paddingTop=t,r[e].children[n].style.paddingBottom=t}let n=e.envClasses.includes("abut")||e.envClasses.includes("cases")?"0":e.envClasses.includes("small")?"0.1389":e.envClasses.includes("cd")?"0.25":"0.4",s="em";if(e.arraycolsep){const r=qe(e.arraycolsep,t);n=r.number.toFixed(4),s=r.unit}const o=0===r.length?0:r[0].children.length,a=(t,r)=>0===t&&0===r||t===o-1&&1===r?"0":"align"!==e.envClasses[0]?n:1===r?"0":e.autoTag?t%2?"1":"0":t%2?"0":"1";for(let e=0;e<r.length;e++)for(let t=0;t<r[e].children.length;t++)r[e].children[t].style.paddingLeft=`${a(t,0)}${s}`,r[e].children[t].style.paddingRight=`${a(t,1)}${s}`;const l=e.envClasses.includes("align")||e.envClasses.includes("alignat");for(let t=0;t<r.length;t++){const n=r[t];if(l){for(let e=0;e<n.children.length;e++)n.children[e].classes=["tml-"+(e%2?"left":"right")];if(e.autoTag){const t=e.leqno?0:n.children.length-1;n.children[t].classes=["tml-"+(e.leqno?"left":"right")]}}if(n.children.length>1&&e.envClasses.includes("cases")&&(n.children[1].style.paddingLeft="1em"),e.envClasses.includes("cases")||e.envClasses.includes("subarray"))for(const e of n.children)e.classes.push("tml-left")}}else for(let e=0;e<r.length;e++)r[e].children[0].style.paddingLeft="0em",r[e].children.length===r[0].children.length&&(r[e].children[r[e].children.length-1].style.paddingRight="0em");let o=new T.MathNode("mtable",r);e.envClasses.length>0&&(e.envClasses.includes("jot")?o.classes.push("tml-jot"):e.envClasses.includes("small")&&o.classes.push("tml-small")),"display"===e.scriptLevel&&o.setAttribute("displaystyle","true"),(e.autoTag||e.envClasses.includes("multline"))&&(o.style.width="100%");let a="";if(e.cols&&e.cols.length>0){const t=e.cols;let r=!1,n=0,s=t.length;for(;"separator"===t[n].type;)n+=1;for(;"separator"===t[s-1].type;)s-=1;if("separator"===t[0].type){const e="separator"===t[1].type?"0.15em double":"|"===t[0].separator?"0.06em solid ":"0.06em dashed ";for(const t of o.children)t.children[0].style.borderLeft=e}let l=e.autoTag?0:-1;for(let e=n;e<s;e++)if("align"===t[e].type){const n=Lt[t[e].align];a+=n,l+=1;for(const e of o.children)"center"!==n.trim()&&l<e.children.length&&(e.children[l].classes=["tml-"+n.trim()]);r=!0}else if("separator"===t[e].type){if(r){const r="separator"===t[e+1].type?"0.15em double":"|"===t[e].separator?"0.06em solid":"0.06em dashed";for(const e of o.children)l<e.children.length&&(e.children[l].style.borderRight=r)}r=!1}if("separator"===t[t.length-1].type){const e="separator"===t[t.length-2].type?"0.15em double":"|"===t[t.length-1].separator?"0.06em solid":"0.06em dashed";for(const t of o.children)t.children[t.children.length-1].style.borderRight=e,t.children[t.children.length-1].style.paddingRight="0.4em"}}return e.autoTag&&(a="left "+(a.length>0?a:"center ")+"right "),a&&o.setAttribute("columnalign",a.trim()),e.envClasses.includes("small")&&(o=new T.MathNode("mstyle",[o]),o.setAttribute("scriptlevel","1")),o},Gt=function(t,r){-1===t.envName.indexOf("ed")&&Ot(t);const n="split"===t.envName,s=[],o=Et(t.parser,{cols:s,emptySingleRow:!0,autoTag:n?void 0:zt(t.envName),envClasses:["abut","jot"],maxNumCols:"split"===t.envName?2:void 0,leqno:t.parser.settings.leqno},"display");let a,l=0;const i=t.envName.indexOf("at")>-1;if(r[0]&&i){let t="";for(let e=0;e<r[0].body.length;e++){t+=Ee(r[0].body[e],"textord").text}if(isNaN(t))throw new e("The alignat enviroment requires a numeric first argument.");a=Number(t),l=2*a}o.body.forEach((function(t){if(i){const r=t.length/2;if(a<r)throw new e(`Too many math in a row: expected ${a}, but got ${r}`,t[0])}else l<t.length&&(l=t.length)}));for(let e=0;e<l;++e){let t="r";e%2==1&&(t="l"),s[e]={type:"align",align:t}}return"split"===t.envName||(i?o.envClasses.push("alignat"):o.envClasses[0]="align"),o};it({type:"array",names:["array","darray"],props:{numArgs:1},handler(t,r){const n=(Le(r[0])?[r[0]]:Ee(r[0],"ordgroup").body).map((function(t){const r=Ie(t).text;if(-1!=="lcr".indexOf(r))return{type:"align",align:r};if("|"===r)return{type:"separator",separator:"|"};if(":"===r)return{type:"separator",separator:":"};throw new e("Unknown column alignment: "+r,t)})),[s,o]=Bt(t.parser.gullet.macros),a={cols:n,envClasses:["array"],maxNumCols:n.length,arraystretch:s,arraycolsep:o};return Et(t.parser,a,It(t.envName))},mathmlBuilder:$t}),it({type:"array",names:["matrix","pmatrix","bmatrix","Bmatrix","vmatrix","Vmatrix","matrix*","pmatrix*","bmatrix*","Bmatrix*","vmatrix*","Vmatrix*"],props:{numArgs:0},handler(t){const r={matrix:null,pmatrix:["(",")"],bmatrix:["[","]"],Bmatrix:["\\{","\\}"],vmatrix:["|","|"],Vmatrix:["\\Vert","\\Vert"]}[t.envName.replace("*","")];let n="c";const s={envClasses:[],cols:[]};if("*"===t.envName.charAt(t.envName.length-1)){const r=t.parser;if(r.consumeSpaces(),"["===r.fetch().text){if(r.consume(),r.consumeSpaces(),n=r.fetch().text,-1==="lcr".indexOf(n))throw new e("Expected l or c or r",r.nextToken);r.consume(),r.consumeSpaces(),r.expect("]"),r.consume(),s.cols=[]}}const o=Et(t.parser,s,"text");o.cols=new Array(o.body[0].length).fill({type:"align",align:n});const[a,l]=Bt(t.parser.gullet.macros);return r?{type:"leftright",mode:t.mode,body:[o],left:r[0],right:r[1],rightColor:void 0,arraystretch:a,arraycolsep:l}:o},mathmlBuilder:$t}),it({type:"array",names:["smallmatrix"],props:{numArgs:0},handler(e){const t=Et(e.parser,{type:"small"},"script");return t.envClasses=["small"],t},mathmlBuilder:$t}),it({type:"array",names:["subarray"],props:{numArgs:1},handler(t,r){const n=(Le(r[0])?[r[0]]:Ee(r[0],"ordgroup").body).map((function(t){const r=Ie(t).text;if(-1!=="lc".indexOf(r))return{type:"align",align:r};throw new e("Unknown column alignment: "+r,t)}));if(n.length>1)throw new e("{subarray} can contain only one column");let s={cols:n,envClasses:["small"]};if(s=Et(t.parser,s,"script"),s.body.length>0&&s.body[0].length>1)throw new e("{subarray} can contain only one column");return s},mathmlBuilder:$t}),it({type:"array",names:["cases","dcases","rcases","drcases"],props:{numArgs:0},handler(e){const t=Et(e.parser,{cols:[],envClasses:["cases"]},It(e.envName));return{type:"leftright",mode:e.mode,body:[t],left:e.envName.indexOf("r")>-1?".":"\\{",right:e.envName.indexOf("r")>-1?"\\}":".",rightColor:void 0}},mathmlBuilder:$t}),it({type:"array",names:["align","align*","aligned","split"],props:{numArgs:0},handler:Gt,mathmlBuilder:$t}),it({type:"array",names:["alignat","alignat*","alignedat"],props:{numArgs:1},handler:Gt,mathmlBuilder:$t}),it({type:"array",names:["gathered","gather","gather*"],props:{numArgs:0},handler(e){"gathered"!==e.envName&&Ot(e);const t={cols:[],envClasses:["abut","jot"],autoTag:zt(e.envName),emptySingleRow:!0,leqno:e.parser.settings.leqno};return Et(e.parser,t,"display")},mathmlBuilder:$t}),it({type:"array",names:["equation","equation*"],props:{numArgs:0},handler(e){Ot(e);const t={autoTag:zt(e.envName),emptySingleRow:!0,singleRow:!0,maxNumCols:1,envClasses:["align"],leqno:e.parser.settings.leqno};return Et(e.parser,t,"display")},mathmlBuilder:$t}),it({type:"array",names:["multline","multline*"],props:{numArgs:0},handler(e){Ot(e);const t={autoTag:"multline"===e.envName,maxNumCols:1,envClasses:["jot","multline"],leqno:e.parser.settings.leqno};return Et(e.parser,t,"display")},mathmlBuilder:$t}),it({type:"array",names:["CD"],props:{numArgs:0},handler:t=>(Ot(t),function(t){const r=[];for(t.gullet.beginGroup(),t.gullet.macros.set("\\cr","\\\\\\relax"),t.gullet.beginGroup();;){r.push(t.parseExpression(!1,"\\\\")),t.gullet.endGroup(),t.gullet.beginGroup();const n=t.fetch().text;if("&"!==n&&"\\\\"!==n){if("\\end"===n){0===r[r.length-1].length&&r.pop();break}throw new e("Expected \\\\ or \\cr or \\end",t.nextToken)}t.consume()}let n=[];const s=[n];for(let l=0;l<r.length;l++){const i=r[l];let c={type:"styling",body:[],mode:"math",scriptLevel:"display"};for(let r=0;r<i.length;r++)if($e(i[r])){n.push(c),r+=1;const s=Ie(i[r]).text,l=new Array(2);if(l[0]={type:"ordgroup",mode:"math",body:[]},l[1]={type:"ordgroup",mode:"math",body:[]},"=|.".indexOf(s)>-1);else{if(!("<>AV".indexOf(s)>-1))throw new e('Expected one of "<>AV=|." after @.');for(let t=0;t<2;t++){let n=!0;for(let c=r+1;c<i.length;c++){if(a=s,("mathord"===(o=i[c]).type||"atom"===o.type)&&o.text===a){n=!1,r=c;break}if($e(i[c]))throw new e("Missing a "+s+" character to complete a CD arrow.",i[c]);l[t].body.push(i[c])}if(n)throw new e("Missing a "+s+" character to complete a CD arrow.",i[r])}}const m=Ge(s,l,t);n.push(m),c={type:"styling",body:[],mode:"math",scriptLevel:"display"}}else c.body.push(i[r]);l%2==0?n.push(c):n.shift(),n=[],s.push(n)}var o,a;return s.pop(),t.gullet.endGroup(),t.gullet.endGroup(),{type:"array",mode:"math",body:s,tags:null,labels:new Array(s.length+1).fill(""),envClasses:["jot","cd"],cols:[],hLinesBeforeRow:new Array(s.length+1).fill([])}}(t.parser)),mathmlBuilder:$t}),c({type:"text",names:["\\hline","\\hdashline"],props:{numArgs:0,allowedInText:!0,allowedInMath:!0},handler(t,r){throw new e(`${t.funcName} valid only within array environment`)}});const Dt=lt;c({type:"environment",names:["\\begin","\\end"],props:{numArgs:1,argTypes:["text"]},handler({parser:t,funcName:r},n){const s=n[0];if("ordgroup"!==s.type)throw new e("Invalid environment name",s);let o="";for(let e=0;e<s.body.length;++e)o+=Ee(s.body[e],"textord").text;if("\\begin"===r){if(!Object.prototype.hasOwnProperty.call(Dt,o))throw new e("No such environment: "+o,s);const r=Dt[o],{args:n,optArgs:a}=t.parseArguments("\\begin{"+o+"}",r),l={mode:t.mode,envName:o,parser:t},i=r.handler(l,n,a);t.expect("\\end",!1);const c=t.nextToken,m=Ee(t.parseFunction(),"environment");if(m.name!==o)throw new e(`Mismatch: \\begin{${o}} matched by \\end{${m.name}}`,c);return i}return{type:"environment",mode:t.mode,name:o,nameGroup:s}}}),c({type:"envTag",names:["\\env@tag"],props:{numArgs:1,argTypes:["math"]},handler:({parser:e},t)=>({type:"envTag",mode:e.mode,body:t[0]}),mathmlBuilder:(e,t)=>new T.MathNode("mrow")}),c({type:"noTag",names:["\\env@notag"],props:{numArgs:0},handler:({parser:e})=>({type:"noTag",mode:e.mode}),mathmlBuilder:(e,t)=>new T.MathNode("mrow")});const jt=(e,t)=>{const r=e.font,n=t.withFont(r),s=me(e.body,n);if(0===s.children.length)return s;if("boldsymbol"===r&&["mo","mpadded","mrow"].includes(s.type))return s.style.fontWeight="bold",s;if(((e,t)=>{if("mathrm"!==t||"ordgroup"!==e.body.type||1===e.body.body.length)return!1;if("mathord"!==e.body.body[0].type)return!1;for(let t=1;t<e.body.body.length;t++){const r=e.body.body[t].type;if("mathord"!==r&&("textord"!==r||isNaN(e.body.body[t].text)))return!1}return!0})(e,r)){const e=s.children[0].children[0];delete e.attributes.mathvariant;for(let t=1;t<s.children.length;t++)e.children[0].text+="mn"===s.children[t].type?s.children[t].children[0].text:s.children[t].children[0].children[0].text;const t=new T.MathNode("mtext",new T.TextNode("​"));return new T.MathNode("mrow",[t,e])}let o="mo"===s.children[0].type;for(let e=1;e<s.children.length;e++){"mo"===s.children[e].type&&"boldsymbol"===r&&(s.children[e].style.fontWeight="bold"),"mi"!==s.children[e].type&&(o=!1);"normal"!==(s.children[e].attributes&&s.children[e].attributes.mathvariant||"")&&(o=!1)}if(!o)return s;const a=s.children[0];for(let e=1;e<s.children.length;e++)a.children.push(s.children[e].children[0]);if(a.attributes.mathvariant&&"normal"===a.attributes.mathvariant){const e=new T.MathNode("mtext",new T.TextNode("​"));return new T.MathNode("mrow",[e,a])}return a},Pt={"\\Bbb":"\\mathbb","\\bold":"\\mathbf","\\frak":"\\mathfrak","\\bm":"\\boldsymbol"};c({type:"font",names:["\\mathrm","\\mathit","\\mathbf","\\mathnormal","\\up@greek","\\boldsymbol","\\mathbb","\\mathcal","\\mathfrak","\\mathscr","\\mathsf","\\mathsfit","\\mathtt","\\Bbb","\\bm","\\bold","\\frak"],props:{numArgs:1,allowedInArgument:!0},handler:({parser:e,funcName:t},r)=>{const n=u(r[0]);let s=t;return s in Pt&&(s=Pt[s]),{type:"font",mode:e.mode,font:s.slice(1),body:n}},mathmlBuilder:jt}),c({type:"font",names:["\\rm","\\sf","\\tt","\\bf","\\it","\\cal"],props:{numArgs:0,allowedInText:!0},handler:({parser:e,funcName:t,breakOnTokenText:r},n)=>{const{mode:s}=e,o=e.parseExpression(!0,r,!0);return{type:"font",mode:s,font:`math${t.slice(1)}`,body:{type:"ordgroup",mode:e.mode,body:o}}},mathmlBuilder:jt});const Rt=["display","text","script","scriptscript"],Ut={auto:-1,display:0,text:0,script:1,scriptscript:2},Ht=(e,t)=>{const r="auto"===e.scriptLevel?t.incrementLevel():"display"===e.scriptLevel?t.withLevel(pt):"text"===e.scriptLevel?t.withLevel(dt):t.withLevel(ht),n=me(e.numer,r),s=me(e.denom,r);3===t.level&&(n.style.mathDepth="2",n.setAttribute("scriptlevel","2"),s.style.mathDepth="2",s.setAttribute("scriptlevel","2"));let o=new T.MathNode("mfrac",[n,s]);if(e.hasBarLine){if(e.barSize){const r=qe(e.barSize,t);o.setAttribute("linethickness",r.number+r.unit)}}else o.setAttribute("linethickness","0px");if(null!=e.leftDelim||null!=e.rightDelim){const t=[];if(null!=e.leftDelim){const r=new T.MathNode("mo",[new T.TextNode(e.leftDelim.replace("\\",""))]);r.setAttribute("fence","true"),t.push(r)}if(t.push(o),null!=e.rightDelim){const r=new T.MathNode("mo",[new T.TextNode(e.rightDelim.replace("\\",""))]);r.setAttribute("fence","true"),t.push(r)}o=se(t)}return"auto"!==e.scriptLevel&&(o=new T.MathNode("mstyle",[o]),o.setAttribute("displaystyle",String("display"===e.scriptLevel)),o.setAttribute("scriptlevel",Ut[e.scriptLevel])),o};c({type:"genfrac",names:["\\dfrac","\\frac","\\tfrac","\\dbinom","\\binom","\\tbinom","\\\\atopfrac","\\\\bracefrac","\\\\brackfrac"],props:{numArgs:2,allowedInArgument:!0},handler:({parser:e,funcName:t},r)=>{const n=r[0],s=r[1];let o=!1,a=null,l=null,i="auto";switch(t){case"\\dfrac":case"\\frac":case"\\tfrac":o=!0;break;case"\\\\atopfrac":o=!1;break;case"\\dbinom":case"\\binom":case"\\tbinom":a="(",l=")";break;case"\\\\bracefrac":a="\\{",l="\\}";break;case"\\\\brackfrac":a="[",l="]";break;default:throw new Error("Unrecognized genfrac command")}switch(t){case"\\dfrac":case"\\dbinom":i="display";break;case"\\tfrac":case"\\tbinom":i="text"}return{type:"genfrac",mode:e.mode,continued:!1,numer:n,denom:s,hasBarLine:o,leftDelim:a,rightDelim:l,scriptLevel:i,barSize:null}},mathmlBuilder:Ht}),c({type:"genfrac",names:["\\cfrac"],props:{numArgs:2},handler:({parser:e,funcName:t},r)=>{const n=r[0],s=r[1];return{type:"genfrac",mode:e.mode,continued:!0,numer:n,denom:s,hasBarLine:!0,leftDelim:null,rightDelim:null,scriptLevel:"display",barSize:null}}}),c({type:"infix",names:["\\over","\\choose","\\atop","\\brace","\\brack"],props:{numArgs:0,infix:!0},handler({parser:e,funcName:t,token:r}){let n;switch(t){case"\\over":n="\\frac";break;case"\\choose":n="\\binom";break;case"\\atop":n="\\\\atopfrac";break;case"\\brace":n="\\\\bracefrac";break;case"\\brack":n="\\\\brackfrac";break;default:throw new Error("Unrecognized infix genfrac command")}return{type:"infix",mode:e.mode,replaceWith:n,token:r}}});const Vt=function(e){let t=null;return e.length>0&&(t=e,t="."===t?null:t),t};c({type:"genfrac",names:["\\genfrac"],props:{numArgs:6,allowedInArgument:!0,argTypes:["math","math","size","text","math","math"]},handler({parser:e},t){const r=t[4],n=t[5],s=u(t[0]),o="atom"===s.type&&"open"===s.family?Vt(s.text):null,a=u(t[1]),l="atom"===a.type&&"close"===a.family?Vt(a.text):null,i=Ee(t[2],"size");let c,m=null;i.isBlank?c=!0:(m=i.value,c=m.number>0);let p="auto",d=t[3];if("ordgroup"===d.type){if(d.body.length>0){const e=Ee(d.body[0],"textord");p=Rt[Number(e.text)]}}else d=Ee(d,"textord"),p=Rt[Number(d.text)];return{type:"genfrac",mode:e.mode,numer:r,denom:n,continued:!1,hasBarLine:c,barSize:m,leftDelim:o,rightDelim:l,scriptLevel:p}},mathmlBuilder:Ht}),c({type:"infix",names:["\\above"],props:{numArgs:1,argTypes:["size"],infix:!0},handler:({parser:e,funcName:t,token:r},n)=>({type:"infix",mode:e.mode,replaceWith:"\\\\abovefrac",barSize:Ee(n[0],"size").value,token:r})}),c({type:"genfrac",names:["\\\\abovefrac"],props:{numArgs:3,argTypes:["math","size","math"]},handler:({parser:e,funcName:t},r)=>{const n=r[0],s=function(e){if(!e)throw new Error("Expected non-null, but got "+String(e));return e}(Ee(r[1],"infix").barSize),o=r[2],a=s.number>0;return{type:"genfrac",mode:e.mode,numer:n,denom:o,continued:!1,hasBarLine:a,barSize:s,leftDelim:null,rightDelim:null,scriptLevel:"auto"}},mathmlBuilder:Ht}),c({type:"hbox",names:["\\hbox"],props:{numArgs:1,argTypes:["hbox"],allowedInArgument:!0,allowedInText:!1},handler:({parser:e},t)=>({type:"hbox",mode:e.mode,body:p(t[0])}),mathmlBuilder(e,t){const r=t.withLevel(pt),n=ce(e.body,r);return ne(n)}});c({type:"horizBrace",names:["\\overbrace","\\underbrace"],props:{numArgs:1},handler:({parser:e,funcName:t},r)=>({type:"horizBrace",mode:e.mode,label:t,isOver:/^\\over/.test(t),base:r[0]}),mathmlBuilder:(e,t)=>{const r=B(e.label);return r.style["math-depth"]=0,new T.MathNode(e.isOver?"mover":"munder",[me(e.base,t),r])}}),c({type:"href",names:["\\href"],props:{numArgs:2,argTypes:["url","original"],allowedInText:!0},handler:({parser:t,token:r},n)=>{const s=n[1],o=Ee(n[0],"url").url;if(!t.settings.isTrusted({command:"\\href",url:o}))throw new e('Function "\\href" is not trusted',r);return{type:"href",mode:t.mode,href:o,body:p(s)}},mathmlBuilder:(e,t)=>{const r=new v("math",[ce(e.body,t)]);return new x(e.href,[],[r])}}),c({type:"href",names:["\\url"],props:{numArgs:1,argTypes:["url"],allowedInText:!0},handler:({parser:t,token:r},n)=>{const s=Ee(n[0],"url").url;if(!t.settings.isTrusted({command:"\\url",url:s}))throw new e('Function "\\url" is not trusted',r);const o=[];for(let e=0;e<s.length;e++){let t=s[e];"~"===t&&(t="\\textasciitilde"),o.push({type:"textord",mode:"text",text:t})}const a={type:"text",mode:t.mode,font:"\\texttt",body:o};return{type:"href",mode:t.mode,href:s,body:p(a)}}}),c({type:"html",names:["\\class","\\id","\\style","\\data"],props:{numArgs:2,argTypes:["raw","original"],allowedInText:!0},handler:({parser:t,funcName:r,token:n},s)=>{const o=Ee(s[0],"raw").string,a=s[1];if(t.settings.strict)throw new e(`Function "${r}" is disabled in strict mode`,n);let l;const i={};switch(r){case"\\class":i.class=o,l={command:"\\class",class:o};break;case"\\id":i.id=o,l={command:"\\id",id:o};break;case"\\style":i.style=o,l={command:"\\style",style:o};break;case"\\data":{const t=o.split(",");for(let r=0;r<t.length;r++){const n=t[r].split("=");if(2!==n.length)throw new e("Error parsing key-value for \\data");i["data-"+n[0].trim()]=n[1].trim()}l={command:"\\data",attributes:i};break}default:throw new Error("Unrecognized html command")}if(!t.settings.isTrusted(l))throw new e(`Function "${r}" is not trusted`,n);return{type:"html",mode:t.mode,attributes:i,body:p(a)}},mathmlBuilder:(e,t)=>{const r=ce(e.body,t),n=[];e.attributes.class&&n.push(...e.attributes.class.trim().split(/\s+/)),r.classes=n;for(const t in e.attributes)"class"!==t&&Object.prototype.hasOwnProperty.call(e.attributes,t)&&r.setAttribute(t,e.attributes[t]);return r}});const _t=function(t){if(/^[-+]? *(\d+(\.\d*)?|\.\d+)$/.test(t))return{number:+t,unit:"bp"};{const r=/([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/.exec(t);if(!r)throw new e("Invalid size: '"+t+"' in \\includegraphics");const n={number:+(r[1]+r[2]),unit:r[3]};if(!Te(n))throw new e("Invalid unit: '"+n.unit+"' in \\includegraphics.");return n}};c({type:"includegraphics",names:["\\includegraphics"],props:{numArgs:1,numOptionalArgs:1,argTypes:["raw","url"],allowedInText:!1},handler:({parser:t,token:r},n,s)=>{let o={number:0,unit:"em"},a={number:.9,unit:"em"},l={number:0,unit:"em"},i="";if(s[0]){const t=Ee(s[0],"raw").string.split(",");for(let r=0;r<t.length;r++){const n=t[r].split("=");if(2===n.length){const t=n[1].trim();switch(n[0].trim()){case"alt":i=t;break;case"width":o=_t(t);break;case"height":a=_t(t);break;case"totalheight":l=_t(t);break;default:throw new e("Invalid key: '"+n[0]+"' in \\includegraphics.")}}}}const c=Ee(n[0],"url").url;if(""===i&&(i=c,i=i.replace(/^.*[\\/]/,""),i=i.substring(0,i.lastIndexOf("."))),!t.settings.isTrusted({command:"\\includegraphics",url:c}))throw new e('Function "\\includegraphics" is not trusted',r);return{type:"includegraphics",mode:t.mode,alt:i,width:o,height:a,totalheight:l,src:c}},mathmlBuilder:(e,t)=>{const r=qe(e.height,t),n={number:0,unit:"em"};e.totalheight.number>0&&e.totalheight.unit===r.unit&&e.totalheight.number>r.number&&(n.number=e.totalheight.number-r.number,n.unit=r.unit);let s=0;e.width.number>0&&(s=qe(e.width,t));const o={height:r.number+n.number+"em"};s.number>0&&(o.width=s.number+s.unit),n.number>0&&(o.verticalAlign=-n.number+n.unit);const a=new k(e.src,e.alt,o);return a.height=r,a.depth=n,new T.MathNode("mtext",[a])}}),c({type:"kern",names:["\\kern","\\mkern","\\hskip","\\mskip"],props:{numArgs:1,argTypes:["size"],primitive:!0,allowedInText:!0},handler({parser:t,funcName:r,token:n},s){const o=Ee(s[0],"size");if(t.settings.strict){const s="m"===r[1],a="mu"===o.value.unit;if(s){if(!a)throw new e(`LaTeX's ${r} supports only mu units, not ${o.value.unit} units`,n);if("math"!==t.mode)throw new e(`LaTeX's ${r} works only in math mode`,n)}else if(a)throw new e(`LaTeX's ${r} doesn't support mu units`,n)}return{type:"kern",mode:t.mode,dimension:o.value}},mathmlBuilder(e,t){const r=qe(e.dimension,t),n="em"===r.unit?Wt(r.number):"";if("text"===e.mode&&n.length>0){const e=new T.TextNode(n);return new T.MathNode("mtext",[e])}{const e=new T.MathNode("mspace");return e.setAttribute("width",r.number+r.unit),r.number<0&&(e.style.marginLeft=r.number+r.unit),e}}});const Wt=function(e){return e>=.05555&&e<=.05556?" ":e>=.1666&&e<=.1667?" ":e>=.2222&&e<=.2223?" ":e>=.2777&&e<=.2778?"  ":""},Xt=/[^A-Za-z_0-9-]/g;c({type:"label",names:["\\label"],props:{numArgs:1,argTypes:["raw"]},handler:({parser:e},t)=>({type:"label",mode:e.mode,string:t[0].string.replace(Xt,"")}),mathmlBuilder(e,t){const r=new T.MathNode("mrow",[],["tml-label"]);return e.string.length>0&&r.setLabel(e.string),r}});const Zt=["\\clap","\\llap","\\rlap"];c({type:"lap",names:["\\mathllap","\\mathrlap","\\mathclap","\\clap","\\llap","\\rlap"],props:{numArgs:1,allowedInText:!0},handler:({parser:t,funcName:r,token:n},s)=>{if(Zt.includes(r)){if(t.settings.strict&&"text"!==t.mode)throw new e(`{${r}} can be used only in text mode.\n Try \\math${r.slice(1)}`,n);r=r.slice(1)}else r=r.slice(5);const o=s[0];return{type:"lap",mode:t.mode,alignment:r,body:o}},mathmlBuilder:(e,t)=>{let r;if("llap"===e.alignment){const n=ie(p(e.body),t),s=new T.MathNode("mphantom",n);r=new T.MathNode("mpadded",[s]),r.setAttribute("width","0px")}const n=me(e.body,t);let s;if("llap"===e.alignment?(n.style.position="absolute",n.style.right="0",n.style.bottom="0",s=new T.MathNode("mpadded",[r,n])):s=new T.MathNode("mpadded",[n]),"rlap"===e.alignment)e.body.body.length>0&&"genfrac"===e.body.body[0].type&&s.setAttribute("lspace","0.16667em");else{const t="llap"===e.alignment?"-1":"-0.5";s.setAttribute("lspace",t+"width"),"llap"===e.alignment?s.style.position="relative":(s.style.display="flex",s.style.justifyContent="center")}return s.setAttribute("width","0px"),s}}),c({type:"ordgroup",names:["\\(","$"],props:{numArgs:0,allowedInText:!0,allowedInMath:!1},handler({funcName:e,parser:t},r){const n=t.mode;t.switchMode("math");const s="\\("===e?"\\)":"$",o=t.parseExpression(!1,s);return t.expect(s),t.switchMode(n),{type:"ordgroup",mode:t.mode,body:o}}}),c({type:"text",names:["\\)","\\]"],props:{numArgs:0,allowedInText:!0,allowedInMath:!1},handler(t,r){throw new e(`Mismatched ${t.funcName}`,r)}});c({type:"mathchoice",names:["\\mathchoice"],props:{numArgs:4,primitive:!0},handler:({parser:e},t)=>({type:"mathchoice",mode:e.mode,display:p(t[0]),text:p(t[1]),script:p(t[2]),scriptscript:p(t[3])}),mathmlBuilder:(e,t)=>{const r=((e,t)=>{switch(t.level){case ut:return e.display;case pt:return e.text;case dt:return e.script;case ht:return e.scriptscript;default:return e.text}})(e,t);return ce(r,t)}});const Yt=["text","textord","mathord","atom"],Kt=e=>{const t=new T.MathNode("mspace");return t.setAttribute("width",e+"em"),t};function Jt(e,t){let r;const n=ie(e.body,t);if("minner"===e.mclass)r=new T.MathNode("mpadded",n);else if("mord"===e.mclass)e.isCharacterBox||"mathord"===n[0].type?(r=n[0],r.type="mi",1===r.children.length&&r.children[0].text&&"∇"===r.children[0].text&&r.setAttribute("mathvariant","normal")):r=new T.MathNode("mi",n);else{r=new T.MathNode("mrow",n),e.mustPromote?(r=n[0],r.type="mo",e.isCharacterBox&&e.body[0].text&&/[A-Za-z]/.test(e.body[0].text)&&r.setAttribute("mathvariant","italic")):r=new T.MathNode("mrow",n);const s=t.level<2;"mrow"===r.type?s&&("mbin"===e.mclass?(r.children.unshift(Kt(.2222)),r.children.push(Kt(.2222))):"mrel"===e.mclass?(r.children.unshift(Kt(.2778)),r.children.push(Kt(.2778))):"mpunct"===e.mclass?r.children.push(Kt(.1667)):"minner"===e.mclass&&(r.children.unshift(Kt(.0556)),r.children.push(Kt(.0556)))):"mbin"===e.mclass?(r.attributes.lspace=s?"0.2222em":"0",r.attributes.rspace=s?"0.2222em":"0"):"mrel"===e.mclass?(r.attributes.lspace=s?"0.2778em":"0",r.attributes.rspace=s?"0.2778em":"0"):"mpunct"===e.mclass?(r.attributes.lspace="0em",r.attributes.rspace=s?"0.1667em":"0"):"mopen"===e.mclass||"mclose"===e.mclass?(r.attributes.lspace="0em",r.attributes.rspace="0em"):"minner"===e.mclass&&s&&(r.attributes.lspace="0.0556em",r.attributes.width="+0.1111em"),"mopen"!==e.mclass&&"mclose"!==e.mclass&&(delete r.attributes.stretchy,delete r.attributes.form)}return r}c({type:"mclass",names:["\\mathord","\\mathbin","\\mathrel","\\mathopen","\\mathclose","\\mathpunct","\\mathinner"],props:{numArgs:1,primitive:!0},handler({parser:e,funcName:t},r){const n=r[0],s=o.isCharacterBox(n);let a=!0;const l={type:"mathord",text:"",mode:e.mode},i=n.body?n.body:[n];for(const t of i){if(!Yt.includes(t.type)){a=!1;break}I[e.mode][t.text]?l.text+=I[e.mode][t.text].replace:t.text?l.text+=t.text:t.body&&t.body.map((e=>{l.text+=e.text}))}return{type:"mclass",mode:e.mode,mclass:"m"+t.slice(5),body:p(a?l:n),isCharacterBox:s,mustPromote:a}},mathmlBuilder:Jt});const Qt=e=>{const t="ordgroup"===e.type&&e.body.length?e.body[0]:e;return"atom"!==t.type||"bin"!==t.family&&"rel"!==t.family?"mord":"m"+t.family};c({type:"mclass",names:["\\@binrel"],props:{numArgs:2},handler:({parser:e},t)=>({type:"mclass",mode:e.mode,mclass:Qt(t[0]),body:p(t[1]),isCharacterBox:o.isCharacterBox(t[1])})}),c({type:"mclass",names:["\\stackrel","\\overset","\\underset"],props:{numArgs:2},handler({parser:e,funcName:t},r){const n=r[1],s=r[0],o={type:"op",mode:n.mode,limits:!0,alwaysHandleSupSub:!0,parentIsSupSub:!1,symbol:!1,stack:!0,suppressBaseShift:"\\stackrel"!==t,body:p(n)};return{type:"supsub",mode:s.mode,base:o,sup:"\\underset"===t?null:s,sub:"\\underset"===t?s:null}},mathmlBuilder:Jt});const er=(e,t,r)=>{if(!e)return r;const n=me(e,t);return"mrow"===n.type&&0===n.children.length?r:n};c({type:"multiscript",names:["\\sideset","\\pres@cript"],props:{numArgs:3},handler({parser:t,funcName:r,token:n},s){if(0===s[2].body.length)throw new e(r+"cannot parse an empty base.");const o=s[2].body[0];if(t.settings.strict&&"\\sideset"===r&&!o.symbol)throw new e("The base of \\sideset must be a big operator. Try \\prescript.");if(s[0].body.length>0&&"supsub"!==s[0].body[0].type||s[1].body.length>0&&"supsub"!==s[1].body[0].type)throw new e("\\sideset can parse only subscripts and superscripts in its first two arguments",n);const a=s[0].body.length>0?s[0].body[0]:null,l=s[1].body.length>0?s[1].body[0]:null;return a||l?a?{type:"multiscript",mode:t.mode,isSideset:"\\sideset"===r,prescripts:a,postscripts:l,base:o}:{type:"styling",mode:t.mode,scriptLevel:"text",body:[{type:"supsub",mode:t.mode,base:o,sup:l.sup,sub:l.sub}]}:o},mathmlBuilder(e,t){const r=me(e.base,t),n=new T.MathNode("mprescripts"),s=new T.MathNode("none");let o=[];const a=er(e.prescripts.sub,t,s),l=er(e.prescripts.sup,t,s);if(e.isSideset&&(a.setAttribute("style","text-align: left;"),l.setAttribute("style","text-align: left;")),e.postscripts){o=[r,er(e.postscripts.sub,t,s),er(e.postscripts.sup,t,s),n,a,l]}else o=[r,n,a,l];return new T.MathNode("mmultiscripts",o)}}),c({type:"not",names:["\\not"],props:{numArgs:1,primitive:!0,allowedInText:!1},handler({parser:e},t){const r=o.isCharacterBox(t[0]);let n;if(r)n=p(t[0]),"\\"===n[0].text.charAt(0)&&(n[0].text=I.math[n[0].text].replace),n[0].text=n[0].text.slice(0,1)+"̸"+n[0].text.slice(1);else{n=[{type:"textord",mode:"math",text:"̸"},{type:"kern",mode:"math",dimension:{number:-.6,unit:"em"}},t[0]]}return{type:"not",mode:e.mode,body:n,isCharacterBox:r}},mathmlBuilder(e,t){if(e.isCharacterBox){return ie(e.body,t,!0)[0]}return ce(e.body,t)}});const tr=["textord","mathord","atom"],rr=["\\smallint"],nr=["textord","mathord","ordgroup","close","leftright","font"],sr=e=>{e.attributes.lspace="0.1667em",e.attributes.rspace="0.1667em"},or=(e,t)=>{let r;if(e.symbol)r=new v("mo",[te(e.name,e.mode)]),rr.includes(e.name)?r.setAttribute("largeop","false"):r.setAttribute("movablelimits","false"),e.fromMathOp&&sr(r);else if(e.body)r=new v("mo",ie(e.body,t)),e.fromMathOp&&sr(r);else if(r=new v("mi",[new A(e.name.slice(1))]),!e.parentIsSupSub){const t=[r,new v("mo",[te("⁡","text")])];if(e.needsLeadingSpace){const e=new v("mspace");e.setAttribute("width","0.1667em"),t.unshift(e)}if(!e.isFollowedByDelimiter){const e=new v("mspace");e.setAttribute("width","0.1667em"),t.push(e)}r=new v("mrow",t)}return r},ar={"∏":"\\prod","∐":"\\coprod","∑":"\\sum","⋀":"\\bigwedge","⋁":"\\bigvee","⋂":"\\bigcap","⋃":"\\bigcup","⨀":"\\bigodot","⨁":"\\bigoplus","⨂":"\\bigotimes","⨄":"\\biguplus","⨅":"\\bigsqcap","⨆":"\\bigsqcup","⨃":"\\bigcupdot","⨇":"\\bigdoublevee","⨈":"\\bigdoublewedge","⨉":"\\bigtimes"};c({type:"op",names:["\\coprod","\\bigvee","\\bigwedge","\\biguplus","\\bigcupplus","\\bigcupdot","\\bigcap","\\bigcup","\\bigdoublevee","\\bigdoublewedge","\\intop","\\prod","\\sum","\\bigotimes","\\bigoplus","\\bigodot","\\bigsqcap","\\bigsqcup","\\bigtimes","\\smallint","∏","∐","∑","⋀","⋁","⋂","⋃","⨀","⨁","⨂","⨄","⨆"],props:{numArgs:0},handler:({parser:e,funcName:t},r)=>{let n=t;return 1===n.length&&(n=ar[n]),{type:"op",mode:e.mode,limits:!0,parentIsSupSub:!1,symbol:!0,stack:!1,name:n}},mathmlBuilder:or}),c({type:"op",names:["\\mathop"],props:{numArgs:1,primitive:!0},handler:({parser:e},t)=>{const r=t[0],n=r.body?r.body:[r],s=1===n.length&&tr.includes(n[0].type);return{type:"op",mode:e.mode,limits:!0,parentIsSupSub:!1,symbol:s,fromMathOp:!0,stack:!1,name:s?n[0].text:null,body:s?null:p(r)}},mathmlBuilder:or});const lr={"∫":"\\int","∬":"\\iint","∭":"\\iiint","∮":"\\oint","∯":"\\oiint","∰":"\\oiiint","∱":"\\intclockwise","∲":"\\varointclockwise","⨌":"\\iiiint","⨍":"\\intbar","⨎":"\\intBar","⨏":"\\fint","⨒":"\\rppolint","⨓":"\\scpolint","⨕":"\\pointint","⨖":"\\sqint","⨗":"\\intlarhk","⨘":"\\intx","⨙":"\\intcap","⨚":"\\intcup"};c({type:"op",names:["\\arcsin","\\arccos","\\arctan","\\arctg","\\arcctg","\\arg","\\ch","\\cos","\\cosec","\\cosh","\\cot","\\cotg","\\coth","\\csc","\\ctg","\\cth","\\deg","\\dim","\\exp","\\hom","\\ker","\\lg","\\ln","\\log","\\sec","\\sin","\\sinh","\\sh","\\sgn","\\tan","\\tanh","\\tg","\\th"],props:{numArgs:0},handler({parser:e,funcName:t}){const r=e.prevAtomType,n=e.gullet.future().text;return{type:"op",mode:e.mode,limits:!1,parentIsSupSub:!1,symbol:!1,stack:!1,isFollowedByDelimiter:tt(n),needsLeadingSpace:r.length>0&&nr.includes(r),name:t}},mathmlBuilder:or}),c({type:"op",names:["\\det","\\gcd","\\inf","\\lim","\\max","\\min","\\Pr","\\sup"],props:{numArgs:0},handler({parser:e,funcName:t}){const r=e.prevAtomType,n=e.gullet.future().text;return{type:"op",mode:e.mode,limits:!0,parentIsSupSub:!1,symbol:!1,stack:!1,isFollowedByDelimiter:tt(n),needsLeadingSpace:r.length>0&&nr.includes(r),name:t}},mathmlBuilder:or}),c({type:"op",names:["\\int","\\iint","\\iiint","\\iiiint","\\oint","\\oiint","\\oiiint","\\intclockwise","\\varointclockwise","\\intbar","\\intBar","\\fint","\\rppolint","\\scpolint","\\pointint","\\sqint","\\intlarhk","\\intx","\\intcap","\\intcup","∫","∬","∭","∮","∯","∰","∱","∲","⨌","⨍","⨎","⨏","⨒","⨓","⨕","⨖","⨗","⨘","⨙","⨚"],props:{numArgs:0},handler({parser:e,funcName:t}){let r=t;return 1===r.length&&(r=lr[r]),{type:"op",mode:e.mode,limits:!1,parentIsSupSub:!1,symbol:!0,stack:!1,name:r}},mathmlBuilder:or});c({type:"operatorname",names:["\\operatorname@","\\operatornamewithlimits"],props:{numArgs:1,allowedInArgument:!0},handler:({parser:e,funcName:t},r)=>{const n=r[0],s=e.prevAtomType,o=e.gullet.future().text;return{type:"operatorname",mode:e.mode,body:p(n),alwaysHandleSupSub:"\\operatornamewithlimits"===t,limits:!1,parentIsSupSub:!1,isFollowedByDelimiter:tt(o),needsLeadingSpace:s.length>0&&nr.includes(s)}},mathmlBuilder:(e,t)=>{let r,n=ie(e.body,t.withFont("mathrm")),s=!0;for(let e=0;e<n.length;e++){let t=n[e];if(t instanceof T.MathNode)switch("mrow"===t.type&&1===t.children.length&&t.children[0]instanceof T.MathNode&&(t=t.children[0]),t.type){case"mi":case"mn":case"ms":case"mtext":break;case"mspace":if(t.attributes.width){const r=t.attributes.width.replace("em",""),o=Wt(Number(r));""===o?s=!1:n[e]=new T.MathNode("mtext",[new T.TextNode(o)])}break;case"mo":{const e=t.children[0];1===t.children.length&&e instanceof T.TextNode?e.text=e.text.replace(/\u2212/,"-").replace(/\u2217/,"*"):s=!1;break}default:s=!1}else s=!1}if(s){const e=n.map((e=>e.toText())).join("");n=[new T.TextNode(e)]}else if(1===n.length&&["mover","munder"].includes(n[0].type)&&("mi"===n[0].children[0].type||"mtext"===n[0].children[0].type)){if(n[0].children[0].type="mi",e.parentIsSupSub)return new T.MathNode("mrow",n);{const e=new T.MathNode("mo",[te("⁡","text")]);return T.newDocumentFragment([n[0],e])}}if(s?(r=new T.MathNode("mi",n),1===n[0].text.length&&r.setAttribute("mathvariant","normal")):r=new T.MathNode("mrow",n),!e.parentIsSupSub){const t=[r,new T.MathNode("mo",[te("⁡","text")])];if(e.needsLeadingSpace){const e=new T.MathNode("mspace");e.setAttribute("width","0.1667em"),t.unshift(e)}if(!e.isFollowedByDelimiter){const e=new T.MathNode("mspace");e.setAttribute("width","0.1667em"),t.push(e)}return T.newDocumentFragment(t)}return r}}),ft("\\operatorname","\\@ifstar\\operatornamewithlimits\\operatorname@"),m({type:"ordgroup",mathmlBuilder:(e,t)=>ce(e.body,t,e.semisimple)}),c({type:"phantom",names:["\\phantom"],props:{numArgs:1,allowedInText:!0},handler:({parser:e},t)=>{const r=t[0];return{type:"phantom",mode:e.mode,body:p(r)}},mathmlBuilder:(e,t)=>{const r=ie(e.body,t);return new T.MathNode("mphantom",r)}}),c({type:"hphantom",names:["\\hphantom"],props:{numArgs:1,allowedInText:!0},handler:({parser:e},t)=>{const r=t[0];return{type:"hphantom",mode:e.mode,body:r}},mathmlBuilder:(e,t)=>{const r=ie(p(e.body),t),n=new T.MathNode("mphantom",r),s=new T.MathNode("mpadded",[n]);return s.setAttribute("height","0px"),s.setAttribute("depth","0px"),s}}),c({type:"vphantom",names:["\\vphantom"],props:{numArgs:1,allowedInText:!0},handler:({parser:e},t)=>{const r=t[0];return{type:"vphantom",mode:e.mode,body:r}},mathmlBuilder:(e,t)=>{const r=ie(p(e.body),t),n=new T.MathNode("mphantom",r),s=new T.MathNode("mpadded",[n]);return s.setAttribute("width","0px"),s}}),c({type:"pmb",names:["\\pmb"],props:{numArgs:1,allowedInText:!0},handler:({parser:e},t)=>({type:"pmb",mode:e.mode,body:p(t[0])}),mathmlBuilder(e,t){const r=ie(e.body,t),n=N(r);return n.setAttribute("style","font-weight:bold"),n}});const ir=(e,t)=>{const r=t.withLevel(pt),n=new T.MathNode("mpadded",[me(e.body,r)]),s=qe(e.dy,t);return n.setAttribute("voffset",s.number+s.unit),s.number>0?n.style.padding=s.number+s.unit+" 0 0 0":n.style.padding="0 0 "+Math.abs(s.number)+s.unit+" 0",n};c({type:"raise",names:["\\raise","\\lower"],props:{numArgs:2,argTypes:["size","primitive"],primitive:!0},handler({parser:e,funcName:t},r){const n=Ee(r[0],"size").value;"\\lower"===t&&(n.number*=-1);const s=r[1];return{type:"raise",mode:e.mode,dy:n,body:s}},mathmlBuilder:ir}),c({type:"raise",names:["\\raisebox"],props:{numArgs:2,argTypes:["size","hbox"],allowedInText:!0},handler({parser:e,funcName:t},r){const n=Ee(r[0],"size").value,s=r[1];return{type:"raise",mode:e.mode,dy:n,body:s}},mathmlBuilder:ir}),c({type:"ref",names:["\\ref","\\eqref"],props:{numArgs:1,argTypes:["raw"]},handler:({parser:e,funcName:t},r)=>({type:"ref",mode:e.mode,funcName:t,string:r[0].string.replace(Xt,"")}),mathmlBuilder(e,t){const r="\\ref"===e.funcName?["tml-ref"]:["tml-ref","tml-eqref"];return new x("#"+e.string,r,null)}}),c({type:"reflect",names:["\\reflectbox"],props:{numArgs:1,argTypes:["hbox"],allowedInText:!0},handler:({parser:e},t)=>({type:"reflect",mode:e.mode,body:t[0]}),mathmlBuilder(e,t){const r=me(e.body,t);return r.style.transform="scaleX(-1)",r}}),c({type:"internal",names:["\\relax"],props:{numArgs:0,allowedInText:!0},handler:({parser:e})=>({type:"internal",mode:e.mode})}),c({type:"rule",names:["\\rule"],props:{numArgs:2,numOptionalArgs:1,allowedInText:!0,allowedInMath:!0,argTypes:["size","size","size"]},handler({parser:e},t,r){const n=r[0],s=Ee(t[0],"size"),o=Ee(t[1],"size");return{type:"rule",mode:e.mode,shift:n&&Ee(n,"size").value,width:s.value,height:o.value}},mathmlBuilder(e,t){const r=qe(e.width,t),n=qe(e.height,t),s=e.shift?qe(e.shift,t):{number:0,unit:"em"},o=t.color&&t.getColor()||"black",a=new T.MathNode("mspace");if(r.number>0&&n.number>0&&a.setAttribute("mathbackground",o),a.setAttribute("width",r.number+r.unit),a.setAttribute("height",n.number+n.unit),0===s.number)return a;const l=new T.MathNode("mpadded",[a]);return s.number>=0?l.setAttribute("height","+"+s.number+s.unit):(l.setAttribute("height",s.number+s.unit),l.setAttribute("depth","+"+-s.number+s.unit)),l.setAttribute("voffset",s.number+s.unit),l}});const cr={"\\tiny":.5,"\\sixptsize":.6,"\\Tiny":.6,"\\scriptsize":.7,"\\footnotesize":.8,"\\small":.9,"\\normalsize":1,"\\large":1.2,"\\Large":1.44,"\\LARGE":1.728,"\\huge":2.074,"\\Huge":2.488};c({type:"sizing",names:["\\tiny","\\sixptsize","\\Tiny","\\scriptsize","\\footnotesize","\\small","\\normalsize","\\large","\\Large","\\LARGE","\\huge","\\Huge"],props:{numArgs:0,allowedInText:!0},handler:({breakOnTokenText:e,funcName:t,parser:r},n)=>{r.settings.strict&&"math"===r.mode&&console.log(`Temml strict-mode warning: Command ${t} is invalid in math mode.`);const s=r.parseExpression(!1,e,!0);return{type:"sizing",mode:r.mode,funcName:t,body:s}},mathmlBuilder:(e,t)=>{const r=t.withFontSize(cr[e.funcName]),n=ie(e.body,r),s=N(n),o=(cr[e.funcName]/t.fontSize).toFixed(4);return s.setAttribute("mathsize",o+"em"),s}}),c({type:"smash",names:["\\smash"],props:{numArgs:1,numOptionalArgs:1,allowedInText:!0},handler:({parser:e},t,r)=>{let n=!1,s=!1;const o=r[0]&&Ee(r[0],"ordgroup");if(o){let e="";for(let t=0;t<o.body.length;++t){if(e=o.body[t].text,"t"===e)n=!0;else{if("b"!==e){n=!1,s=!1;break}s=!0}}}else n=!0,s=!0;const a=t[0];return{type:"smash",mode:e.mode,body:a,smashHeight:n,smashDepth:s}},mathmlBuilder:(e,t)=>{const r=new T.MathNode("mpadded",[me(e.body,t)]);return e.smashHeight&&r.setAttribute("height","0px"),e.smashDepth&&r.setAttribute("depth","0px"),r}}),c({type:"sqrt",names:["\\sqrt"],props:{numArgs:1,numOptionalArgs:1},handler({parser:e},t,r){const n=r[0],s=t[0];return{type:"sqrt",mode:e.mode,body:s,index:n}},mathmlBuilder(e,t){const{body:r,index:n}=e;return n?new T.MathNode("mroot",[me(r,t),me(n,t.incrementLevel())]):new T.MathNode("msqrt",[me(r,t)])}});const mr={display:0,text:1,script:2,scriptscript:3},ur={display:["0","true"],text:["0","false"],script:["1","false"],scriptscript:["2","false"]};c({type:"styling",names:["\\displaystyle","\\textstyle","\\scriptstyle","\\scriptscriptstyle"],props:{numArgs:0,allowedInText:!0,primitive:!0},handler({breakOnTokenText:e,funcName:t,parser:r},n){const s=r.parseExpression(!0,e,!0),o=t.slice(1,t.length-5);return{type:"styling",mode:r.mode,scriptLevel:o,body:s}},mathmlBuilder(e,t){const r=t.withLevel(mr[e.scriptLevel]),n=ie(e.body,r),s=N(n),o=ur[e.scriptLevel];return s.setAttribute("scriptlevel",o[0]),s.setAttribute("displaystyle",o[1]),s}});const pr=/^m(over|under|underover)$/;m({type:"supsub",mathmlBuilder(e,t){let r,n,s=!1,o=!1,a=!1,l=!1;e.base&&"horizBrace"===e.base.type&&(n=!!e.sup,n===e.base.isOver&&(s=!0,r=e.base.isOver)),!e.base||e.base.stack||"op"!==e.base.type&&"operatorname"!==e.base.type||(e.base.parentIsSupSub=!0,o=!e.base.symbol,a=o&&!e.isFollowedByDelimiter,l=e.base.needsLeadingSpace);const i=e.base&&e.base.stack?[me(e.base.body[0],t)]:[me(e.base,t)],c=t.inSubOrSup();if(e.sub){const r=me(e.sub,c);3===t.level&&r.setAttribute("scriptlevel","2"),i.push(r)}if(e.sup){const r=me(e.sup,c);3===t.level&&r.setAttribute("scriptlevel","2");const n="mrow"===r.type?r.children[0]:r;n&&"mo"===n.type&&n.classes.includes("tml-prime")&&e.base&&e.base.text&&"fF".indexOf(e.base.text)>-1&&n.classes.push("prime-pad"),i.push(r)}let m;if(s)m=r?"mover":"munder";else if(e.sub)if(e.sup){const r=e.base;m=r&&("op"===r.type&&r.limits||"multiscript"===r.type)&&(t.level===ut||r.alwaysHandleSupSub)||r&&"operatorname"===r.type&&r.alwaysHandleSupSub&&(t.level===ut||r.limits)?"munderover":"msubsup"}else{const r=e.base;m=r&&"op"===r.type&&r.limits&&(t.level===ut||r.alwaysHandleSupSub)||r&&"operatorname"===r.type&&r.alwaysHandleSupSub&&(r.limits||t.level===ut)?"munder":"msub"}else{const r=e.base;m=r&&"op"===r.type&&r.limits&&(t.level===ut||r.alwaysHandleSupSub)||r&&"operatorname"===r.type&&r.alwaysHandleSupSub&&(r.limits||t.level===ut)?"mover":"msup"}let u=new T.MathNode(m,i);if(o){const e=new T.MathNode("mo",[te("⁡","text")]);if(l){const t=new T.MathNode("mspace");t.setAttribute("width","0.1667em"),u=T.newDocumentFragment([t,u,e])}else u=T.newDocumentFragment([u,e]);if(a){const e=new T.MathNode("mspace");e.setAttribute("width","0.1667em"),u.children.push(e)}}else pr.test(m)&&(u=new T.MathNode("mrow",[u]));return u}});const dr=["\\shortmid","\\nshortmid","\\shortparallel","\\nshortparallel","\\smallsetminus"],hr=["\\Rsh","\\Lsh","\\restriction"];m({type:"atom",mathmlBuilder(e,t){const r=new T.MathNode("mo",[te(e.text,e.mode)]);return"punct"===e.family?r.setAttribute("separator","true"):"open"===e.family||"close"===e.family?"open"===e.family?(r.setAttribute("form","prefix"),r.setAttribute("stretchy","false")):"close"===e.family&&(r.setAttribute("form","postfix"),r.setAttribute("stretchy","false")):"\\mid"===e.text?(r.setAttribute("lspace","0.22em"),r.setAttribute("rspace","0.22em"),r.setAttribute("stretchy","false")):"rel"===e.family&&(e=>{if(1===e.length){const t=e.codePointAt(0);return 8591<t&&t<8704}return e.indexOf("arrow")>-1||e.indexOf("harpoon")>-1||hr.includes(e)})(e.text)?r.setAttribute("stretchy","false"):dr.includes(e.text)?r.setAttribute("mathsize","70%"):":"===e.text&&(r.attributes.lspace="0.2222em",r.attributes.rspace="0.2222em"),r}});const gr={mathbf:"bold",mathrm:"normal",textit:"italic",mathit:"italic",mathnormal:"italic",mathbb:"double-struck",mathcal:"script",mathfrak:"fraktur",mathscr:"script",mathsf:"sans-serif",mathtt:"monospace"},fr=function(e,t){if("texttt"===t.fontFamily)return"monospace";if("textsc"===t.fontFamily)return"normal";if("textsf"===t.fontFamily)return"textit"===t.fontShape&&"textbf"===t.fontWeight?"sans-serif-bold-italic":"textit"===t.fontShape?"sans-serif-italic":"textbf"===t.fontWeight?"sans-serif-bold":"sans-serif";if("textit"===t.fontShape&&"textbf"===t.fontWeight)return"bold-italic";if("textit"===t.fontShape)return"italic";if("textbf"===t.fontWeight)return"bold";const r=t.font;if(!r||"mathnormal"===r)return null;const n=e.mode;switch(r){case"mathit":case"greekItalic":return"italic";case"mathrm":{const t=e.text.codePointAt(0);return 939<t&&t<975?"italic":"normal"}case"up@greek":return"normal";case"boldsymbol":case"mathboldsymbol":return"bold-italic";case"mathbf":return"bold";case"mathbb":return"double-struck";case"mathfrak":return"fraktur";case"mathscr":case"mathcal":return"script";case"mathsf":return"sans-serif";case"mathsfit":return"sans-serif-italic";case"mathtt":return"monospace"}let s=e.text;return I[n][s]&&I[n][s].replace&&(s=I[n][s].replace),Object.prototype.hasOwnProperty.call(gr,r)?gr[r]:null},br=Object.freeze({B:8426,E:8427,F:8427,H:8387,I:8391,L:8390,M:8422,R:8393,e:8394,g:8355,o:8389}),yr=Object.freeze({C:8426,H:8388,I:8392,R:8394,Z:8398}),wr=Object.freeze({C:8383,H:8389,N:8391,P:8393,Q:8393,R:8395,Z:8394}),xr=Object.freeze({"ϵ":119527,"ϑ":119564,"ϰ":119534,"φ":119577,"ϱ":119535,"ϖ":119563}),kr=Object.freeze({"ϵ":119643,"ϑ":119680,"ϰ":119650,"φ":119693,"ϱ":119651,"ϖ":119679}),vr=Object.freeze({"ϵ":119701,"ϑ":119738,"ϰ":119708,"φ":119751,"ϱ":119709,"ϖ":119737}),Ar=Object.freeze({"ϵ":119759,"ϑ":119796,"ϰ":119766,"φ":119809,"ϱ":119767,"ϖ":119795}),Nr=Object.freeze({upperCaseLatin:{normal:e=>0,bold:e=>119743,italic:e=>119795,"bold-italic":e=>119847,script:e=>br[e]||119899,"script-bold":e=>119951,fraktur:e=>yr[e]||120003,"fraktur-bold":e=>120107,"double-struck":e=>wr[e]||120055,"sans-serif":e=>120159,"sans-serif-bold":e=>120211,"sans-serif-italic":e=>120263,"sans-serif-bold-italic":e=>120380,monospace:e=>120367},lowerCaseLatin:{normal:e=>0,bold:e=>119737,italic:e=>"h"===e?8358:119789,"bold-italic":e=>119841,script:e=>br[e]||119893,"script-bold":e=>119945,fraktur:e=>119997,"fraktur-bold":e=>120101,"double-struck":e=>120049,"sans-serif":e=>120153,"sans-serif-bold":e=>120205,"sans-serif-italic":e=>120257,"sans-serif-bold-italic":e=>120309,monospace:e=>120361},upperCaseGreek:{normal:e=>0,bold:e=>119575,italic:e=>119633,"bold-italic":e=>119575,script:e=>0,"script-bold":e=>0,fraktur:e=>0,"fraktur-bold":e=>0,"double-struck":e=>0,"sans-serif":e=>119749,"sans-serif-bold":e=>119749,"sans-serif-italic":e=>0,"sans-serif-bold-italic":e=>119807,monospace:e=>0},lowerCaseGreek:{normal:e=>0,bold:e=>119569,italic:e=>119627,"bold-italic":e=>"ϕ"===e?119678:119685,script:e=>0,"script-bold":e=>0,fraktur:e=>0,"fraktur-bold":e=>0,"double-struck":e=>0,"sans-serif":e=>119743,"sans-serif-bold":e=>119743,"sans-serif-italic":e=>0,"sans-serif-bold-italic":e=>119801,monospace:e=>0},varGreek:{normal:e=>0,bold:e=>xr[e]||-51,italic:e=>0,"bold-italic":e=>kr[e]||58,script:e=>0,"script-bold":e=>0,fraktur:e=>0,"fraktur-bold":e=>0,"double-struck":e=>0,"sans-serif":e=>vr[e]||116,"sans-serif-bold":e=>vr[e]||116,"sans-serif-italic":e=>0,"sans-serif-bold-italic":e=>Ar[e]||174,monospace:e=>0},numeral:{normal:e=>0,bold:e=>120734,italic:e=>0,"bold-italic":e=>0,script:e=>0,"script-bold":e=>0,fraktur:e=>0,"fraktur-bold":e=>0,"double-struck":e=>120744,"sans-serif":e=>120754,"sans-serif-bold":e=>120764,"sans-serif-italic":e=>0,"sans-serif-bold-italic":e=>0,monospace:e=>120774}}),Tr=(e,t)=>{const r=e.codePointAt(0),n=64<r&&r<91?"upperCaseLatin":96<r&&r<123?"lowerCaseLatin":912<r&&r<938?"upperCaseGreek":944<r&&r<970||"ϕ"===e?"lowerCaseGreek":120545<r&&r<120572||xr[e]?"varGreek":47<r&&r<58?"numeral":"other";return"other"===n?e:String.fromCodePoint(r+Nr[n][t](e))},Sr=Object.freeze({a:"ᴀ",b:"ʙ",c:"ᴄ",d:"ᴅ",e:"ᴇ",f:"ꜰ",g:"ɢ",h:"ʜ",i:"ɪ",j:"ᴊ",k:"ᴋ",l:"ʟ",m:"ᴍ",n:"ɴ",o:"ᴏ",p:"ᴘ",q:"ǫ",r:"ʀ",s:"s",t:"ᴛ",u:"ᴜ",v:"ᴠ",w:"ᴡ",x:"x",y:"ʏ",z:"ᴢ"}),qr=/^\d(?:[\d,.]*\d)?$/,Or=/[A-Ba-z]/,Mr=new Set(["\\prime","\\dprime","\\trprime","\\qprime","\\backprime","\\backdprime","\\backtrprime"]);m({type:"mathord",mathmlBuilder(e,t){const r=te(e.text,e.mode,t),n=r.text.codePointAt(0),s=912<n&&n<938?"normal":"italic",o=fr(e,t)||s;if("script"===o)return r.text=Tr(r.text,o),new T.MathNode("mi",[r],[t.font]);"italic"!==o&&(r.text=Tr(r.text,o));let a=new T.MathNode("mi",[r]);return"normal"===o&&(a.setAttribute("mathvariant","normal"),1===r.text.length&&(a=new T.MathNode("mrow",[a]))),a}}),m({type:"textord",mathmlBuilder(e,t){let r=e.text;const n=r.codePointAt(0);"textsc"===t.fontFamily&&96<n&&n<123&&(r=Sr[r]);const s=te(r,e.mode,t),o=fr(e,t)||"normal";let a;if(qr.test(e.text)){const t="text"===e.mode?"mtext":"mn";if("italic"===o||"bold-italic"===o)return((e,t,r)=>{const n=new T.MathNode(r,[e]),s=new T.MathNode("mstyle",[n]);return s.style["font-style"]="italic",s.style["font-family"]="Cambria, 'Times New Roman', serif","bold-italic"===t&&(s.style["font-weight"]="bold"),s})(s,o,t);"normal"!==o&&(s.text=s.text.split("").map((e=>Tr(e,o))).join("")),a=new T.MathNode(t,[s])}else if("text"===e.mode)"normal"!==o&&(s.text=Tr(s.text,o)),a=new T.MathNode("mtext",[s]);else if(Mr.has(e.text))a=new T.MathNode("mo",[s]),a.classes.push("tml-prime");else{const e=s.text;"italic"!==o&&(s.text=Tr(s.text,o)),a=new T.MathNode("mi",[s]),s.text===e&&Or.test(e)&&a.setAttribute("mathvariant","italic")}return a}});const Br={"\\nobreak":"nobreak","\\allowbreak":"allowbreak"},Cr={" ":{},"\\ ":{},"~":{className:"nobreak"},"\\space":{},"\\nobreakspace":{className:"nobreak"}};m({type:"spacing",mathmlBuilder(t,r){let n;if(Object.prototype.hasOwnProperty.call(Cr,t.text))n=new T.MathNode("mtext",[new T.TextNode(" ")]);else{if(!Object.prototype.hasOwnProperty.call(Br,t.text))throw new e(`Unknown type of space "${t.text}"`);n=new T.MathNode("mo"),"\\nobreak"===t.text&&n.setAttribute("linebreak","nobreak")}return n}}),m({type:"tag"});const zr={"\\text":void 0,"\\textrm":"textrm","\\textsf":"textsf","\\texttt":"texttt","\\textnormal":"textrm","\\textsc":"textsc"},Er={"\\textbf":"textbf","\\textmd":"textmd"},Ir={"\\textit":"textit","\\textup":"textup"};c({type:"text",names:["\\text","\\textrm","\\textsf","\\texttt","\\textnormal","\\textsc","\\textbf","\\textmd","\\textit","\\textup","\\emph"],props:{numArgs:1,argTypes:["text"],allowedInArgument:!0,allowedInText:!0},handler({parser:e,funcName:t},r){const n=r[0];return{type:"text",mode:e.mode,body:p(n),font:t}},mathmlBuilder(e,t){const r=((e,t)=>{const r=e.font;return r?zr[r]?t.withTextFontFamily(zr[r]):Er[r]?t.withTextFontWeight(Er[r]):"\\emph"===r?"textit"===t.fontShape?t.withTextFontShape("textup"):t.withTextFontShape("textit"):t.withTextFontShape(Ir[r]):t})(e,t),n=ce(e.body,r);return ne(n)}}),c({type:"vcenter",names:["\\vcenter"],props:{numArgs:1,argTypes:["original"],allowedInText:!1},handler:({parser:e},t)=>({type:"vcenter",mode:e.mode,body:t[0]}),mathmlBuilder(e,t){const r=new T.MathNode("mtd",[me(e.body,t)]);r.style.padding="0";const n=new T.MathNode("mtr",[r]);return new T.MathNode("mtable",[n])}}),c({type:"verb",names:["\\verb"],props:{numArgs:0,allowedInText:!0},handler(t,r,n){throw new e("\\verb ended by end of line instead of matching delimiter")},mathmlBuilder(e,t){const r=new T.TextNode(Lr(e)),n=new T.MathNode("mtext",[r]);return n.setAttribute("mathvariant","monospace"),n}});const Lr=e=>e.body.replace(/ /g,e.star?"␣":" "),Fr=l,$r="[ \r\n\t]",Gr=`(\\\\[a-zA-Z@]+)${$r}*`,Dr="[̀-ͯ]",jr=new RegExp(`${Dr}+$`),Pr=`(${$r}+)|\\\\(\n|[ \r\t]+\n?)[ \r\t]*|([!-\\[\\]-‧‪-퟿豈-￿]${Dr}*|[\ud800-\udbff][\udc00-\udfff]${Dr}*|\\\\verb\\*([^]).*?\\4|\\\\verb([^*a-zA-Z]).*?\\5|${Gr}|\\\\[^\ud800-\udfff])`;class Rr{constructor(e,t){this.input=e,this.settings=t,this.tokenRegex=new RegExp(Pr,"g"),this.catcodes={"%":14,"~":13}}setCatcode(e,t){this.catcodes[e]=t}lex(){const t=this.input,r=this.tokenRegex.lastIndex;if(r===t.length)return new mt("EOF",new ct(this,r,r));const n=this.tokenRegex.exec(t);if(null===n||n.index!==r)throw new e(`Unexpected character: '${t[r]}'`,new mt(t[r],new ct(this,r,r+1)));const s=n[6]||n[3]||(n[2]?"\\ ":" ");if(14===this.catcodes[s]){const r=t.indexOf("\n",this.tokenRegex.lastIndex);if(-1===r){if(this.tokenRegex.lastIndex=t.length,this.settings.strict)throw new e("% comment has no terminating newline; LaTeX would fail because of commenting the end of math mode")}else this.tokenRegex.lastIndex=r+1;return this.lex()}return new mt(s,new ct(this,r,this.tokenRegex.lastIndex))}}class Ur{constructor(e={},t={}){this.current=t,this.builtins=e,this.undefStack=[]}beginGroup(){this.undefStack.push({})}endGroup(){if(0===this.undefStack.length)throw new e("Unbalanced namespace destruction: attempt to pop global namespace; please report this as a bug");const t=this.undefStack.pop();for(const e in t)Object.prototype.hasOwnProperty.call(t,e)&&(void 0===t[e]?delete this.current[e]:this.current[e]=t[e])}has(e){return Object.prototype.hasOwnProperty.call(this.current,e)||Object.prototype.hasOwnProperty.call(this.builtins,e)}get(e){return Object.prototype.hasOwnProperty.call(this.current,e)?this.current[e]:this.builtins[e]}set(e,t,r=!1){if(r){for(let t=0;t<this.undefStack.length;t++)delete this.undefStack[t][e];this.undefStack.length>0&&(this.undefStack[this.undefStack.length-1][e]=t)}else{const t=this.undefStack[this.undefStack.length-1];t&&!Object.prototype.hasOwnProperty.call(t,e)&&(t[e]=this.current[e])}this.current[e]=t}}const Hr={"^":!0,_:!0,"\\limits":!0,"\\nolimits":!0};class Vr{constructor(e,t,r){this.settings=t,this.expansionCount=0,this.feed(e),this.macros=new Ur(bt,t.macros),this.mode=r,this.stack=[]}feed(e){this.lexer=new Rr(e,this.settings)}switchMode(e){this.mode=e}beginGroup(){this.macros.beginGroup()}endGroup(){this.macros.endGroup()}future(){return 0===this.stack.length&&this.pushToken(this.lexer.lex()),this.stack[this.stack.length-1]}popToken(){return this.future(),this.stack.pop()}pushToken(e){this.stack.push(e)}pushTokens(e){this.stack.push(...e)}scanArgument(e){let t,r,n;if(e){if(this.consumeSpaces(),"["!==this.future().text)return null;t=this.popToken(),({tokens:n,end:r}=this.consumeArg(["]"]))}else({tokens:n,start:t,end:r}=this.consumeArg());return this.pushToken(new mt("EOF",r.loc)),this.pushTokens(n),t.range(r,"")}consumeSpaces(){for(;;){if(" "!==this.future().text)break;this.stack.pop()}}consumeArg(t){const r=[],n=t&&t.length>0;n||this.consumeSpaces();const s=this.future();let o,a=0,l=0;do{if(o=this.popToken(),r.push(o),"{"===o.text)++a;else if("}"===o.text){if(--a,-1===a)throw new e("Extra }",o)}else if("EOF"===o.text)throw new e("Unexpected end of input in a macro argument, expected '"+(t&&n?t[l]:"}")+"'",o);if(t&&n)if((0===a||1===a&&"{"===t[l])&&o.text===t[l]){if(++l,l===t.length){r.splice(-l,l);break}}else l=0}while(0!==a||n);return"{"===s.text&&"}"===r[r.length-1].text&&(r.pop(),r.shift()),r.reverse(),{tokens:r,start:s,end:o}}consumeArgs(t,r){if(r){if(r.length!==t+1)throw new e("The length of delimiters doesn't match the number of args!");const n=r[0];for(let t=0;t<n.length;t++){const r=this.popToken();if(n[t]!==r.text)throw new e("Use of the macro doesn't match its definition",r)}}const n=[];for(let e=0;e<t;e++)n.push(this.consumeArg(r&&r[e+1]).tokens);return n}expandOnce(t){const r=this.popToken(),n=r.text,s=r.noexpand?null:this._getExpansion(n);if(null==s||t&&s.unexpandable){if(t&&null==s&&"\\"===n[0]&&!this.isDefined(n))throw new e("Undefined control sequence: "+n);return this.pushToken(r),!1}if(this.expansionCount++,this.expansionCount>this.settings.maxExpand)throw new e("Too many expansions: infinite loop or need to increase maxExpand setting");let o=s.tokens;const a=this.consumeArgs(s.numArgs,s.delimiters);if(s.numArgs){o=o.slice();for(let t=o.length-1;t>=0;--t){let r=o[t];if("#"===r.text){if(0===t)throw new e("Incomplete placeholder at end of macro body",r);if(r=o[--t],"#"===r.text)o.splice(t+1,1);else{if(!/^[1-9]$/.test(r.text))throw new e("Not a valid argument number",r);o.splice(t,2,...a[+r.text-1])}}}}return this.pushTokens(o),o.length}expandAfterFuture(){return this.expandOnce(),this.future()}expandNextToken(){for(;;)if(!1===this.expandOnce()){const e=this.stack.pop();return e.treatAsRelax&&(e.text="\\relax"),e}throw new Error}expandMacro(e){return this.macros.has(e)?this.expandTokens([new mt(e)]):void 0}expandTokens(e){const t=[],r=this.stack.length;for(this.pushTokens(e);this.stack.length>r;)if(!1===this.expandOnce(!0)){const e=this.stack.pop();e.treatAsRelax&&(e.noexpand=!1,e.treatAsRelax=!1),t.push(e)}return t}expandMacroAsText(e){const t=this.expandMacro(e);return t?t.map((e=>e.text)).join(""):t}_getExpansion(e){const t=this.macros.get(e);if(null==t)return t;if(1===e.length){const t=this.lexer.catcodes[e];if(null!=t&&13!==t)return}const r="function"==typeof t?t(this):t;if("string"==typeof r){let e=0;if(-1!==r.indexOf("#")){const t=r.replace(/##/g,"");for(;-1!==t.indexOf("#"+(e+1));)++e}const t=new Rr(r,this.settings),n=[];let s=t.lex();for(;"EOF"!==s.text;)n.push(s),s=t.lex();n.reverse();return{tokens:n,numArgs:e}}return r}isDefined(e){return this.macros.has(e)||Object.prototype.hasOwnProperty.call(Fr,e)||Object.prototype.hasOwnProperty.call(I.math,e)||Object.prototype.hasOwnProperty.call(I.text,e)||Object.prototype.hasOwnProperty.call(Hr,e)}isExpandable(e){const t=this.macros.get(e);return null!=t?"string"==typeof t||"function"==typeof t||!t.unexpandable:Object.prototype.hasOwnProperty.call(Fr,e)&&!Fr[e].primitive}}const _r=/^[₊₋₌₍₎₀₁₂₃₄₅₆₇₈₉ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓᵦᵧᵨᵩᵪ]/,Wr=Object.freeze({"₊":"+","₋":"-","₌":"=","₍":"(","₎":")","₀":"0","₁":"1","₂":"2","₃":"3","₄":"4","₅":"5","₆":"6","₇":"7","₈":"8","₉":"9","ₐ":"a","ₑ":"e","ₕ":"h","ᵢ":"i","ⱼ":"j","ₖ":"k","ₗ":"l","ₘ":"m","ₙ":"n","ₒ":"o","ₚ":"p","ᵣ":"r","ₛ":"s","ₜ":"t","ᵤ":"u","ᵥ":"v","ₓ":"x","ᵦ":"β","ᵧ":"γ","ᵨ":"ρ","ᵩ":"ϕ","ᵪ":"χ","⁺":"+","⁻":"-","⁼":"=","⁽":"(","⁾":")","⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9","ᴬ":"A","ᴮ":"B","ᴰ":"D","ᴱ":"E","ᴳ":"G","ᴴ":"H","ᴵ":"I","ᴶ":"J","ᴷ":"K","ᴸ":"L","ᴹ":"M","ᴺ":"N","ᴼ":"O","ᴾ":"P","ᴿ":"R","ᵀ":"T","ᵁ":"U","ⱽ":"V","ᵂ":"W","ᵃ":"a","ᵇ":"b","ᶜ":"c","ᵈ":"d","ᵉ":"e","ᶠ":"f","ᵍ":"g","ʰ":"h","ⁱ":"i","ʲ":"j","ᵏ":"k","ˡ":"l","ᵐ":"m","ⁿ":"n","ᵒ":"o","ᵖ":"p","ʳ":"r","ˢ":"s","ᵗ":"t","ᵘ":"u","ᵛ":"v","ʷ":"w","ˣ":"x","ʸ":"y","ᶻ":"z","ᵝ":"β","ᵞ":"γ","ᵟ":"δ","ᵠ":"ϕ","ᵡ":"χ","ᶿ":"θ"}),Xr=Object.freeze({"𝒜":"A","ℬ":"B","𝒞":"C","𝒟":"D","ℰ":"E","ℱ":"F","𝒢":"G","ℋ":"H","ℐ":"I","𝒥":"J","𝒦":"K","ℒ":"L","ℳ":"M","𝒩":"N","𝒪":"O","𝒫":"P","𝒬":"Q","ℛ":"R","𝒮":"S","𝒯":"T","𝒰":"U","𝒱":"V","𝒲":"W","𝒳":"X","𝒴":"Y","𝒵":"Z"});var Zr={"́":{text:"\\'",math:"\\acute"},"̀":{text:"\\`",math:"\\grave"},"̈":{text:'\\"',math:"\\ddot"},"̃":{text:"\\~",math:"\\tilde"},"̄":{text:"\\=",math:"\\bar"},"̆":{text:"\\u",math:"\\breve"},"̌":{text:"\\v",math:"\\check"},"̂":{text:"\\^",math:"\\hat"},"̇":{text:"\\.",math:"\\dot"},"̊":{text:"\\r",math:"\\mathring"},"̋":{text:"\\H"},"̧":{text:"\\c"}},Yr={"á":"á","à":"à","ä":"ä","ǟ":"ǟ","ã":"ã","ā":"ā","ă":"ă","ắ":"ắ","ằ":"ằ","ẵ":"ẵ","ǎ":"ǎ","â":"â","ấ":"ấ","ầ":"ầ","ẫ":"ẫ","ȧ":"ȧ","ǡ":"ǡ","å":"å","ǻ":"ǻ","ḃ":"ḃ","ć":"ć","č":"č","ĉ":"ĉ","ċ":"ċ","ď":"ď","ḋ":"ḋ","é":"é","è":"è","ë":"ë","ẽ":"ẽ","ē":"ē","ḗ":"ḗ","ḕ":"ḕ","ĕ":"ĕ","ě":"ě","ê":"ê","ế":"ế","ề":"ề","ễ":"ễ","ė":"ė","ḟ":"ḟ","ǵ":"ǵ","ḡ":"ḡ","ğ":"ğ","ǧ":"ǧ","ĝ":"ĝ","ġ":"ġ","ḧ":"ḧ","ȟ":"ȟ","ĥ":"ĥ","ḣ":"ḣ","í":"í","ì":"ì","ï":"ï","ḯ":"ḯ","ĩ":"ĩ","ī":"ī","ĭ":"ĭ","ǐ":"ǐ","î":"î","ǰ":"ǰ","ĵ":"ĵ","ḱ":"ḱ","ǩ":"ǩ","ĺ":"ĺ","ľ":"ľ","ḿ":"ḿ","ṁ":"ṁ","ń":"ń","ǹ":"ǹ","ñ":"ñ","ň":"ň","ṅ":"ṅ","ó":"ó","ò":"ò","ö":"ö","ȫ":"ȫ","õ":"õ","ṍ":"ṍ","ṏ":"ṏ","ȭ":"ȭ","ō":"ō","ṓ":"ṓ","ṑ":"ṑ","ŏ":"ŏ","ǒ":"ǒ","ô":"ô","ố":"ố","ồ":"ồ","ỗ":"ỗ","ȯ":"ȯ","ȱ":"ȱ","ő":"ő","ṕ":"ṕ","ṗ":"ṗ","ŕ":"ŕ","ř":"ř","ṙ":"ṙ","ś":"ś","ṥ":"ṥ","š":"š","ṧ":"ṧ","ŝ":"ŝ","ṡ":"ṡ","ẗ":"ẗ","ť":"ť","ṫ":"ṫ","ú":"ú","ù":"ù","ü":"ü","ǘ":"ǘ","ǜ":"ǜ","ǖ":"ǖ","ǚ":"ǚ","ũ":"ũ","ṹ":"ṹ","ū":"ū","ṻ":"ṻ","ŭ":"ŭ","ǔ":"ǔ","û":"û","ů":"ů","ű":"ű","ṽ":"ṽ","ẃ":"ẃ","ẁ":"ẁ","ẅ":"ẅ","ŵ":"ŵ","ẇ":"ẇ","ẘ":"ẘ","ẍ":"ẍ","ẋ":"ẋ","ý":"ý","ỳ":"ỳ","ÿ":"ÿ","ỹ":"ỹ","ȳ":"ȳ","ŷ":"ŷ","ẏ":"ẏ","ẙ":"ẙ","ź":"ź","ž":"ž","ẑ":"ẑ","ż":"ż","Á":"Á","À":"À","Ä":"Ä","Ǟ":"Ǟ","Ã":"Ã","Ā":"Ā","Ă":"Ă","Ắ":"Ắ","Ằ":"Ằ","Ẵ":"Ẵ","Ǎ":"Ǎ","Â":"Â","Ấ":"Ấ","Ầ":"Ầ","Ẫ":"Ẫ","Ȧ":"Ȧ","Ǡ":"Ǡ","Å":"Å","Ǻ":"Ǻ","Ḃ":"Ḃ","Ć":"Ć","Č":"Č","Ĉ":"Ĉ","Ċ":"Ċ","Ď":"Ď","Ḋ":"Ḋ","É":"É","È":"È","Ë":"Ë","Ẽ":"Ẽ","Ē":"Ē","Ḗ":"Ḗ","Ḕ":"Ḕ","Ĕ":"Ĕ","Ě":"Ě","Ê":"Ê","Ế":"Ế","Ề":"Ề","Ễ":"Ễ","Ė":"Ė","Ḟ":"Ḟ","Ǵ":"Ǵ","Ḡ":"Ḡ","Ğ":"Ğ","Ǧ":"Ǧ","Ĝ":"Ĝ","Ġ":"Ġ","Ḧ":"Ḧ","Ȟ":"Ȟ","Ĥ":"Ĥ","Ḣ":"Ḣ","Í":"Í","Ì":"Ì","Ï":"Ï","Ḯ":"Ḯ","Ĩ":"Ĩ","Ī":"Ī","Ĭ":"Ĭ","Ǐ":"Ǐ","Î":"Î","İ":"İ","Ĵ":"Ĵ","Ḱ":"Ḱ","Ǩ":"Ǩ","Ĺ":"Ĺ","Ľ":"Ľ","Ḿ":"Ḿ","Ṁ":"Ṁ","Ń":"Ń","Ǹ":"Ǹ","Ñ":"Ñ","Ň":"Ň","Ṅ":"Ṅ","Ó":"Ó","Ò":"Ò","Ö":"Ö","Ȫ":"Ȫ","Õ":"Õ","Ṍ":"Ṍ","Ṏ":"Ṏ","Ȭ":"Ȭ","Ō":"Ō","Ṓ":"Ṓ","Ṑ":"Ṑ","Ŏ":"Ŏ","Ǒ":"Ǒ","Ô":"Ô","Ố":"Ố","Ồ":"Ồ","Ỗ":"Ỗ","Ȯ":"Ȯ","Ȱ":"Ȱ","Ő":"Ő","Ṕ":"Ṕ","Ṗ":"Ṗ","Ŕ":"Ŕ","Ř":"Ř","Ṙ":"Ṙ","Ś":"Ś","Ṥ":"Ṥ","Š":"Š","Ṧ":"Ṧ","Ŝ":"Ŝ","Ṡ":"Ṡ","Ť":"Ť","Ṫ":"Ṫ","Ú":"Ú","Ù":"Ù","Ü":"Ü","Ǘ":"Ǘ","Ǜ":"Ǜ","Ǖ":"Ǖ","Ǚ":"Ǚ","Ũ":"Ũ","Ṹ":"Ṹ","Ū":"Ū","Ṻ":"Ṻ","Ŭ":"Ŭ","Ǔ":"Ǔ","Û":"Û","Ů":"Ů","Ű":"Ű","Ṽ":"Ṽ","Ẃ":"Ẃ","Ẁ":"Ẁ","Ẅ":"Ẅ","Ŵ":"Ŵ","Ẇ":"Ẇ","Ẍ":"Ẍ","Ẋ":"Ẋ","Ý":"Ý","Ỳ":"Ỳ","Ÿ":"Ÿ","Ỹ":"Ỹ","Ȳ":"Ȳ","Ŷ":"Ŷ","Ẏ":"Ẏ","Ź":"Ź","Ž":"Ž","Ẑ":"Ẑ","Ż":"Ż","ά":"ά","ὰ":"ὰ","ᾱ":"ᾱ","ᾰ":"ᾰ","έ":"έ","ὲ":"ὲ","ή":"ή","ὴ":"ὴ","ί":"ί","ὶ":"ὶ","ϊ":"ϊ","ΐ":"ΐ","ῒ":"ῒ","ῑ":"ῑ","ῐ":"ῐ","ό":"ό","ὸ":"ὸ","ύ":"ύ","ὺ":"ὺ","ϋ":"ϋ","ΰ":"ΰ","ῢ":"ῢ","ῡ":"ῡ","ῠ":"ῠ","ώ":"ώ","ὼ":"ὼ","Ύ":"Ύ","Ὺ":"Ὺ","Ϋ":"Ϋ","Ῡ":"Ῡ","Ῠ":"Ῠ","Ώ":"Ώ","Ὼ":"Ὼ"};const Kr=["bin","op","open","punct","rel"],Jr=/([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/;class Qr{constructor(e,t,r=!1){this.mode="math",this.gullet=new Vr(e,t,this.mode),this.settings=t,this.isPreamble=r,this.leftrightDepth=0,this.prevAtomType=""}expect(t,r=!0){if(this.fetch().text!==t)throw new e(`Expected '${t}', got '${this.fetch().text}'`,this.fetch());r&&this.consume()}consume(){this.nextToken=null}fetch(){return null==this.nextToken&&(this.nextToken=this.gullet.expandNextToken()),this.nextToken}switchMode(e){this.mode=e,this.gullet.switchMode(e)}parse(){this.gullet.beginGroup(),this.settings.colorIsTextColor&&this.gullet.macros.set("\\color","\\textcolor");const e=this.parseExpression(!1);if(this.expect("EOF"),this.isPreamble){const e=Object.create(null);return Object.entries(this.gullet.macros.current).forEach((([t,r])=>{e[t]=r})),this.gullet.endGroup(),e}const t=this.gullet.macros.get("\\df@tag");return this.gullet.endGroup(),t&&(this.gullet.macros.current["\\df@tag"]=t),e}static get endOfExpression(){return["}","\\endgroup","\\end","\\right","\\endtoggle","&"]}subparse(e){const t=this.nextToken;this.consume(),this.gullet.pushToken(new mt("}")),this.gullet.pushTokens(e);const r=this.parseExpression(!1);return this.expect("}"),this.nextToken=t,r}parseExpression(e,t,r){const n=[];for(this.prevAtomType="";;){"math"===this.mode&&this.consumeSpaces();const s=this.fetch();if(-1!==Qr.endOfExpression.indexOf(s.text))break;if(t&&s.text===t)break;if(r&&"\\middle"===s.text)break;if(e&&Fr[s.text]&&Fr[s.text].infix)break;const o=this.parseAtom(t);if(!o)break;"internal"!==o.type&&(n.push(o),this.prevAtomType="atom"===o.type?o.family:o.type)}return"text"===this.mode&&this.formLigatures(n),this.handleInfixNodes(n)}handleInfixNodes(t){let r,n=-1;for(let s=0;s<t.length;s++)if("infix"===t[s].type){if(-1!==n)throw new e("only one infix operator per group",t[s].token);n=s,r=t[s].replaceWith}if(-1!==n&&r){let e,s;const o=t.slice(0,n),a=t.slice(n+1);let l;return e=1===o.length&&"ordgroup"===o[0].type?o[0]:{type:"ordgroup",mode:this.mode,body:o},s=1===a.length&&"ordgroup"===a[0].type?a[0]:{type:"ordgroup",mode:this.mode,body:a},l="\\\\abovefrac"===r?this.callFunction(r,[e,t[n],s],[]):this.callFunction(r,[e,s],[]),[l]}return t}handleSupSubscript(t){const r=this.fetch(),n=r.text;this.consume(),this.consumeSpaces();const s=this.parseGroup(t);if(!s)throw new e("Expected group after '"+n+"'",r);return s}formatUnsupportedCmd(e){const t=[];for(let r=0;r<e.length;r++)t.push({type:"textord",mode:"text",text:e[r]});const r={type:"text",mode:this.mode,body:t};return{type:"color",mode:this.mode,color:this.settings.errorColor,body:[r]}}parseAtom(t){const r=this.parseGroup("atom",t);if("text"===this.mode)return r;let n,s;for(;;){this.consumeSpaces();const t=this.fetch();if("\\limits"===t.text||"\\nolimits"===t.text){if(r&&"op"===r.type){const e="\\limits"===t.text;r.limits=e,r.alwaysHandleSupSub=!0}else{if(!r||"operatorname"!==r.type)throw new e("Limit controls must follow a math operator",t);r.alwaysHandleSupSub&&(r.limits="\\limits"===t.text)}this.consume()}else if("^"===t.text){if(n)throw new e("Double superscript",t);n=this.handleSupSubscript("superscript")}else if("_"===t.text){if(s)throw new e("Double subscript",t);s=this.handleSupSubscript("subscript")}else if("'"===t.text){if(n)throw new e("Double superscript",t);const r={type:"textord",mode:this.mode,text:"\\prime"},s=[r];for(this.consume();"'"===this.fetch().text;)s.push(r),this.consume();"^"===this.fetch().text&&s.push(this.handleSupSubscript("superscript")),n={type:"ordgroup",mode:this.mode,body:s}}else{if(!Wr[t.text])break;{const e=_r.test(t.text),r=[];for(r.push(new mt(Wr[t.text])),this.consume();;){const t=this.fetch().text;if(!Wr[t])break;if(_r.test(t)!==e)break;r.unshift(new mt(Wr[t])),this.consume()}const o=this.subparse(r);e?s={type:"ordgroup",mode:"math",body:o}:n={type:"ordgroup",mode:"math",body:o}}}}if(n||s){if(r&&"multiscript"===r.type&&!r.postscripts)return r.postscripts={sup:n,sub:s},r;{const e=!r||"op"!==r.type&&"operatorname"!==r.type?void 0:tt(this.nextToken.text);return{type:"supsub",mode:this.mode,base:r,sup:n,sub:s,isFollowedByDelimiter:e}}}return r}parseFunction(t,r){const n=this.fetch(),s=n.text,o=Fr[s];if(!o)return null;if(this.consume(),r&&"atom"!==r&&!o.allowedInArgument)throw new e("Got function '"+s+"' with no arguments"+(r?" as "+r:""),n);if("text"===this.mode&&!o.allowedInText)throw new e("Can't use function '"+s+"' in text mode",n);if("math"===this.mode&&!1===o.allowedInMath)throw new e("Can't use function '"+s+"' in math mode",n);const a=this.prevAtomType,{args:l,optArgs:i}=this.parseArguments(s,o);return this.prevAtomType=a,this.callFunction(s,l,i,n,t)}callFunction(t,r,n,s,o){const a={funcName:t,parser:this,token:s,breakOnTokenText:o},l=Fr[t];if(l&&l.handler)return l.handler(a,r,n);throw new e(`No function handler for ${t}`)}parseArguments(t,r){const n=r.numArgs+r.numOptionalArgs;if(0===n)return{args:[],optArgs:[]};const s=[],o=[];for(let a=0;a<n;a++){let n=r.argTypes&&r.argTypes[a];const l=a<r.numOptionalArgs;(r.primitive&&null==n||"sqrt"===r.type&&1===a&&null==o[0])&&(n="primitive");const i=this.parseGroupOfType(`argument to '${t}'`,n,l);if(l)o.push(i);else{if(null==i)throw new e("Null argument, please report this as a bug");s.push(i)}}return{args:s,optArgs:o}}parseGroupOfType(t,r,n){switch(r){case"size":return this.parseSizeGroup(n);case"url":return this.parseUrlGroup(n);case"math":case"text":return this.parseArgumentGroup(n,r);case"hbox":{const e=this.parseArgumentGroup(n,"text");return null!=e?{type:"styling",mode:e.mode,body:[e],scriptLevel:"text"}:null}case"raw":{const e=this.parseStringGroup("raw",n);return null!=e?{type:"raw",mode:"text",string:e.text}:null}case"primitive":{if(n)throw new e("A primitive argument cannot be optional");const r=this.parseGroup(t);if(null==r)throw new e("Expected group as "+t,this.fetch());return r}case"original":case null:case void 0:return this.parseArgumentGroup(n);default:throw new e("Unknown group type as "+t,this.fetch())}}consumeSpaces(){for(;;){const e=this.fetch().text;if(" "!==e&&" "!==e&&"︎"!==e)break;this.consume()}}parseStringGroup(e,t){const r=this.gullet.scanArgument(t);if(null==r)return null;let n,s="";for(;"EOF"!==(n=this.fetch()).text;)s+=n.text,this.consume();return this.consume(),r.text=s,r}parseRegexGroup(t,r){const n=this.fetch();let s,o=n,a="";for(;"EOF"!==(s=this.fetch()).text&&t.test(a+s.text);)o=s,a+=o.text,this.consume();if(""===a)throw new e("Invalid "+r+": '"+n.text+"'",n);return n.range(o,a)}parseSizeGroup(t){let r,n=!1;if(this.gullet.consumeSpaces(),r=t||"{"===this.gullet.future().text?this.parseStringGroup("size",t):this.parseRegexGroup(/^[-+]? *(?:$|\d+|\d+\.\d*|\.\d*) *[a-z]{0,2} *$/,"size"),!r)return null;t||0!==r.text.length||(r.text="0pt",n=!0);const s=Jr.exec(r.text);if(!s)throw new e("Invalid size: '"+r.text+"'",r);const o={number:+(s[1]+s[2]),unit:s[3]};if(!Te(o))throw new e("Invalid unit: '"+o.unit+"'",r);return{type:"size",mode:this.mode,value:o,isBlank:n}}parseUrlGroup(e){this.gullet.lexer.setCatcode("%",13),this.gullet.lexer.setCatcode("~",12);const t=this.parseStringGroup("url",e);if(this.gullet.lexer.setCatcode("%",14),this.gullet.lexer.setCatcode("~",13),null==t)return null;let r=t.text.replace(/\\([#$%&~_^{}])/g,"$1");return r=t.text.replace(/{\u2044}/g,"/"),{type:"url",mode:this.mode,url:r}}parseArgumentGroup(e,t){const r=this.gullet.scanArgument(e);if(null==r)return null;const n=this.mode;t&&this.switchMode(t),this.gullet.beginGroup();const s=this.parseExpression(!1,"EOF");this.expect("EOF"),this.gullet.endGroup();const o={type:"ordgroup",mode:this.mode,loc:r.loc,body:s};return t&&this.switchMode(n),o}parseGroup(e,t){const r=this.fetch(),n=r.text;let s;if("{"===n||"\\begingroup"===n||"\\toggle"===n){this.consume();const e="{"===n?"}":"\\begingroup"===n?"\\endgroup":"\\endtoggle";this.gullet.beginGroup();const t=this.parseExpression(!1,e),o=this.fetch();this.expect(e),this.gullet.endGroup(),s={type:"\\endtoggle"===o.text?"toggle":"ordgroup",mode:this.mode,loc:ct.range(r,o),body:t,semisimple:"\\begingroup"===n||void 0}}else s=this.parseFunction(t,e)||this.parseSymbol(),null!=s||"\\"!==n[0]||Object.prototype.hasOwnProperty.call(Hr,n)||(s=this.formatUnsupportedCmd(n),this.consume());return s}formLigatures(e){let t=e.length-1;for(let r=0;r<t;++r){const n=e[r],s=n.text;"-"===s&&"-"===e[r+1].text&&(r+1<t&&"-"===e[r+2].text?(e.splice(r,3,{type:"textord",mode:"text",loc:ct.range(n,e[r+2]),text:"---"}),t-=2):(e.splice(r,2,{type:"textord",mode:"text",loc:ct.range(n,e[r+1]),text:"--"}),t-=1)),"'"!==s&&"`"!==s||e[r+1].text!==s||(e.splice(r,2,{type:"textord",mode:"text",loc:ct.range(n,e[r+1]),text:s+s}),t-=1)}}parseSymbol(){const t=this.fetch();let r=t.text;if(/^\\verb[^a-zA-Z]/.test(r)){this.consume();let t=r.slice(5);const n="*"===t.charAt(0);if(n&&(t=t.slice(1)),t.length<2||t.charAt(0)!==t.slice(-1))throw new e("\\verb assertion failed --\n                    please report what input caused this bug");return t=t.slice(1,-1),{type:"verb",mode:"text",body:t,star:n}}if(Object.prototype.hasOwnProperty.call(Yr,r[0])&&"math"===this.mode&&!I[this.mode][r[0]]){if(this.settings.strict&&"math"===this.mode)throw new e(`Accented Unicode text character "${r[0]}" used in math mode`,t);r=Yr[r[0]]+r.slice(1)}const n="math"===this.mode?jr.exec(r):null;let s;if(n&&(r=r.substring(0,n.index),"i"===r?r="ı":"j"===r&&(r="ȷ")),I[this.mode][r]){let e=I[this.mode][r].group;"bin"===e&&Kr.includes(this.prevAtomType)&&(e="open");const n=ct.range(t);let o;if(Object.prototype.hasOwnProperty.call(z,e)){const t=e;o={type:"atom",mode:this.mode,family:t,loc:n,text:r}}else{if(Xr[r]){this.consume();const e=this.fetch().text.charCodeAt(0),t=65025===e?"mathscr":"mathcal";return 65024!==e&&65025!==e||this.consume(),{type:"font",mode:"math",font:t,body:{type:"mathord",mode:"math",loc:n,text:Xr[r]}}}o={type:e,mode:this.mode,loc:n,text:r}}s=o}else{if(!(r.charCodeAt(0)>=128||jr.exec(r)))return null;if(this.settings.strict&&"math"===this.mode)throw new e(`Unicode text character "${r[0]}" used in math mode`,t);s={type:"textord",mode:"text",loc:ct.range(t),text:r}}if(this.consume(),n)for(let r=0;r<n[0].length;r++){const o=n[0][r];if(!Zr[o])throw new e(`Unknown accent ' ${o}'`,t);const a=Zr[o][this.mode]||Zr[o].text;if(!a)throw new e(`Accent ${o} unsupported in ${this.mode} mode`,t);s={type:"accent",mode:this.mode,loc:ct.range(t),label:a,isStretchy:!1,base:s}}return s}}const en=function(t,r){if(!("string"==typeof t||t instanceof String))throw new TypeError("Temml can only parse string typed expression");const n=new Qr(t,r);delete n.gullet.macros.current["\\df@tag"];let s=n.parse();if(!(s.length>0&&s[0].type&&"array"===s[0].type&&s[0].addEqnNum)&&n.gullet.macros.get("\\df@tag")){if(!r.displayMode)throw new e("\\tag works only in display mode");n.gullet.feed("\\df@tag"),s=[{type:"tag",mode:"text",body:s,tag:n.parse()}]}return s},tn=[2,2,3,3];class rn{constructor(e){this.level=e.level,this.color=e.color,this.font=e.font||"",this.fontFamily=e.fontFamily||"",this.fontSize=e.fontSize||1,this.fontWeight=e.fontWeight||"",this.fontShape=e.fontShape||"",this.maxSize=e.maxSize}extend(e){const t={level:this.level,color:this.color,font:this.font,fontFamily:this.fontFamily,fontSize:this.fontSize,fontWeight:this.fontWeight,fontShape:this.fontShape,maxSize:this.maxSize};for(const r in e)Object.prototype.hasOwnProperty.call(e,r)&&(t[r]=e[r]);return new rn(t)}withLevel(e){return this.extend({level:e})}incrementLevel(){return this.extend({level:Math.min(this.level+1,3)})}inSubOrSup(){return this.extend({level:tn[this.level]})}withColor(e){return this.extend({color:e})}withFont(e){return this.extend({font:e})}withTextFontFamily(e){return this.extend({fontFamily:e,font:""})}withFontSize(e){return this.extend({fontSize:e})}withTextFontWeight(e){return this.extend({fontWeight:e,font:""})}withTextFontShape(e){return this.extend({fontShape:e,font:""})}getColor(){return this.color}}let nn=function(e,t,r={}){t.textContent="";const n="math"===t.tagName.toLowerCase();n&&(r.wrap="none");const s=sn(e,r);n||s.children.length>1?(t.textContent="",s.children.forEach((e=>{t.appendChild(e.toNode())}))):t.appendChild(s.toNode())};"undefined"!=typeof document&&"CSS1Compat"!==document.compatMode&&("undefined"!=typeof console&&console.warn("Warning: Temml doesn't work in quirks mode. Make sure your website has a suitable doctype."),nn=function(){throw new e("Temml doesn't work in quirks mode.")});const sn=function(t,r){const n=new a(r);try{const e=en(t,n);return he(e,t,new rn({level:n.displayMode?ut:pt,maxSize:n.maxSize}),n)}catch(r){return function(t,r,n){if(n.throwOnError||!(t instanceof e))throw t;const s=new y(["temml-error"],[new w(r+"\n"+t.toString())]);return s.style.color=n.errorColor,s.style.whiteSpace="pre-line",s}(r,t,n)}};var on={version:"0.10.34",render:nn,renderToString:function(e,t){return sn(e,t).toMarkup()},postProcess:function(e){const t={};let r=0;const n=document.getElementsByClassName("tml-eqn");for(let e of n)for(r+=1,e.setAttribute("id","tml-eqn-"+String(r));"mtable"!==e.tagName;){if(e.getElementsByClassName("tml-label").length>0){const n=e.attributes.id.value;t[n]=String(r);break}e=e.parentElement}const s=document.getElementsByClassName("tml-tageqn");for(const e of s){if(e.getElementsByClassName("tml-label").length>0){const r=e.getElementsByClassName("tml-tag");if(r.length>0){const n=e.attributes.id.value;t[n]=r[0].textContent}}}[...e.getElementsByClassName("tml-ref")].forEach((e=>{const r=e.getAttribute("href");let n=t[r.slice(1)];-1===e.className.indexOf("tml-eqref")?(n=n.replace(/^\(/,""),n=n.replace(/\)$/,"")):("("!==n.charAt(0)&&(n="("+n),")"!==n.slice(-1)&&(n+=")"));const s=document.createElementNS("http://www.w3.org/1998/Math/MathML","mtext");s.appendChild(document.createTextNode(n));const o=document.createElementNS("http://www.w3.org/1998/Math/MathML","math");o.appendChild(s),e.appendChild(o)}))},ParseError:e,definePreamble:function(e,t){const r=new a(t);if(r.macros={},!("string"==typeof e||e instanceof String))throw new TypeError("Temml can only parse string typed expression");const n=new Qr(e,r,!0);delete n.gullet.macros.current["\\df@tag"];return n.parse()},__parse:function(e,t){const r=new a(t);return en(e,r)},__renderToMathMLTree:sn,__defineSymbol:L,__defineMacro:ft};return on}();
window.__mh=function(tex,display){if(window.katex){try{return window.katex.renderToString((!display&&/\\(d|t)?frac|\\sqrt/.test(tex)?'\\displaystyle ':'')+tex.replace(/\\frac(?![a-zA-Z])/g,'\\dfrac'),{displayMode:!!display,throwOnError:false,strict:false,trust:false})}catch(e){}}return window.temml.renderToString(tex,{displayMode:!!display,throwOnError:false})};
;window.temml=temml;

;
window.QB_TEMML_CSS="\n@font-face {\n  font-family: 'Temml';\n  src: url(data:font/woff2;base64,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) format('woff2');\n  font-weight: normal;\n  font-style: normal;\n}\nmath {\n  font-family: \"Cambria Math\", \"STIX Two Math\", \"STIXTwoMath-Regular\", \"Latin Modern Math\", \"Noto Sans Math\", math;\n  font-style: normal;\n  font-weight: normal;\n  line-height: normal;\n  font-size-adjust: none;\n  text-indent: 0;\n  text-transform: none;\n  letter-spacing: normal;\n  word-wrap: normal;\n  direction: ltr;\n  font-feature-settings: \"dtls\" off;\n}\nmath * {\n  border-color: currentColor;\n}\nmath.tml-display { display: block; }\nmath .mathscr {\n  font-family: \"Temml\";\n}\nmo.tml-prime {\n  font-family: Temml;\n}\nmo.prime-pad {\n  padding-left: 0.08em;\n}\nmenclose {\n  -webkit-print-color-adjust: exact;  \n          print-color-adjust: exact;\n}\n.tml-right {\n  text-align: right;\n}\n.tml-left {\n  text-align: left;\n}\n@supports (not (-webkit-backdrop-filter: blur(1px))) and (not (-moz-appearance: none)) {\n  menclose {\n    position: relative;\n    padding: 0.5ex 0ex;\n  }\n    .tml-overline {\n    padding: 0.1em 0 0 0;\n    border-top: 0.065em solid;\n  }\n  .tml-underline {\n    padding: 0 0 0.1em 0;\n    border-bottom: 0.065em solid;\n  }\n  .tml-cancel {\n    display: inline-block;\n    position: absolute;\n    left: 0.5px;\n    bottom: 0;\n    width: 100%;\n    height: 100%;\n    background-color: currentColor;\n  }\n  .upstrike {\n    clip-path: polygon(0.05em 100%, 0em calc(100% - 0.05em), calc(100% - 0.05em) 0em, 100% 0.05em);\n  }\n  .downstrike {\n    clip-path: polygon(0em 0.05em, 0.05em 0em, 100% calc(100% - 0.05em), calc(100% - 0.05em) 100%);\n  }\n  .sout {\n    clip-path: polygon(0em calc(55% + 0.0333em), 0em calc(55% - 0.0333em), 100% calc(55% - 0.0333em), 100% calc(55% + 0.0333em));\n  }\n  .tml-xcancel {\n    background: linear-gradient(to top left,\n    rgba(0,0,0,0) 0%,\n    rgba(0,0,0,0) calc(50% - 0.06em),\n    rgba(0,0,0,1) 50%,\n    rgba(0,0,0,0) calc(50% + 0.06em),\n    rgba(0,0,0,0) 100%),\n    linear-gradient(to top right,\n    rgba(0,0,0,0) 0%,\n    rgba(0,0,0,0) calc(50% - 0.06em),\n    rgba(0,0,0,1) 50%,\n    rgba(0,0,0,0) calc(50% + 0.06em),\n    rgba(0,0,0,0) 100%)\n  }\n  .longdiv-top {\n    border-top: 0.067em solid;\n    padding: 0.1em 0.2em 0.2em 0.433em;\n  }\n  .longdiv-arc {\n    position: absolute;\n    top: 0;\n    bottom: 0.1em;\n    left: -0.4em;\n    width: 0.7em;\n    border: 0.067em solid;\n    transform: translateY(-0.067em);\n    border-radius: 70%;\n    clip-path: inset(0 0 0 0.4em);\n    box-sizing: border-box;}\n    .menclose {display: inline-block;\n    text-align: left;\n    position: relative;\n  }\n  .phasor-bottom {\n    border-bottom: 0.067em solid;\n    padding: 0.2em 0.2em 0.1em 0.6em;\n  }\n  .phasor-angle {\n    display: inline-block;\n    position: absolute;\n    left: 0.5px;\n    bottom: -0.04em;\n    height: 100%;\n    aspect-ratio: 0.5;\n    background-color: currentColor;\n    clip-path: polygon(0.05em 100%, 0em calc(100% - 0.05em), calc(100% - 0.05em) 0em, 100% 0.05em);\n  }\n  .tml-box {\n    padding: 3pt 0 3pt 0;\n    border: 1px solid;\n  }\n  .tml-fbox {\n    padding: 3pt;\n    border: 1px solid;\n  }\n  .circle-pad {\n    padding: 0.267em;\n  }\n  .textcircle {\n    position: absolute;\n    top: 0;\n    bottom: 0;\n    right: 0;\n    left: 0;\n    border: 0.067em solid;\n    border-radius: 50%;\n   }\n   .actuarial {\n    padding: 0.03889em 0.03889em 0 0.03889em;\n    border-width: 0.08em 0.08em 0em 0em;\n    border-style: solid;\n    margin-right: 0.03889em;\n   }\n  .tml-crooked-2 {\n    transform: scale(2.0, 1.1)\n  }\n  .tml-crooked-3 {\n    transform: scale(3.0, 1.3)\n  }\n  .tml-crooked-4 {\n    transform: scale(4.0, 1.4)\n  }\n  .tml-right {\n    text-align: -webkit-right;\n  }\n  .tml-left {\n    text-align: -webkit-left;\n  }\n}\n@supports (-webkit-backdrop-filter: blur(1px)) {\n  .tml-xshift { transform: translate(0px, 0.45em) }\n  .tml-capshift { transform: translate(0px, 0.35em) }\n}\nmath {\n  display: inline-flex;\n  flex-wrap: wrap;\n  align-items: baseline;\n}\nmath > mrow {\n  padding: 0.5ex 0ex;\n}\nmtable.tml-jot mtd {\n  padding-top: 0.7ex;\n  padding-bottom: 0.7ex;\n}\nmtable.tml-small mtd {\n  padding-top: 0.35ex;\n  padding-bottom: 0.35ex;\n}\n@-moz-document url-prefix() {\n  math { display: inline; }\n  math > mrow { padding: 0 }\n  mtd, mtable.tml-small mtd { padding-top: 0; padding-bottom: 0; }\n  mtable.tml-jot mtd { padding-top: 0.2ex; padding-bottom: 0.ex; }\n}\n.tml-eqn::before {\n  counter-increment: tmlEqnNo;\n  content: \"(\" counter(tmlEqnNo) \")\";\n}\nbody {\n  counter-reset: tmlEqnNo;\n}\nmtable mtd{padding-top:.28em!important;padding-bottom:.28em!important}\nmtable mtd:not(:first-child){padding-left:.55em!important}\nmtable mtd:not(:last-child){padding-right:.55em!important}\nmfrac>*{padding-inline:.08em}\nmsub>:last-child,msup>:last-child,msubsup>:not(:first-child){padding-left:.04em}\n";
(function(){var r=document.querySelector('.qb');if(r){var s=document.createElement('style');s.textContent=window.QB_TEMML_CSS;r.appendChild(s);}})();

;
window.QB_PPT_TPL={"master": "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n<p:sldMaster xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\"><p:cSld><p:bg><p:bgRef idx=\"1001\"><a:schemeClr val=\"bg1\"/></p:bgRef></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id=\"1\" name=\"\"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x=\"0\" y=\"0\"/><a:ext cx=\"0\" cy=\"0\"/><a:chOff x=\"0\" y=\"0\"/><a:chExt cx=\"0\" cy=\"0\"/></a:xfrm></p:grpSpPr><p:sp><p:nvSpPr><p:cNvPr id=\"2\" name=\"Title Placeholder 1\"/><p:cNvSpPr><a:spLocks noGrp=\"1\"/></p:cNvSpPr><p:nvPr><p:ph type=\"title\"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x=\"457200\" y=\"274638\"/><a:ext cx=\"8229600\" cy=\"1143000\"/></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr vert=\"horz\" lIns=\"91440\" tIns=\"45720\" rIns=\"91440\" bIns=\"45720\" rtlCol=\"0\" anchor=\"ctr\"><a:normAutofit/></a:bodyPr><a:lstStyle/><a:p><a:r><a:rPr lang=\"en-US\" smtClean=\"0\"/><a:t>Click to edit Master title style</a:t></a:r><a:endParaRPr lang=\"en-US\"/></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id=\"3\" name=\"Text Placeholder 2\"/><p:cNvSpPr><a:spLocks noGrp=\"1\"/></p:cNvSpPr><p:nvPr><p:ph type=\"body\" idx=\"1\"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x=\"457200\" y=\"1600200\"/><a:ext cx=\"8229600\" cy=\"4525963\"/></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr vert=\"horz\" lIns=\"91440\" tIns=\"45720\" rIns=\"91440\" bIns=\"45720\" rtlCol=\"0\"><a:normAutofit/></a:bodyPr><a:lstStyle/><a:p><a:pPr lvl=\"0\"/><a:r><a:rPr lang=\"en-US\" smtClean=\"0\"/><a:t>Click to edit Master text styles</a:t></a:r></a:p><a:p><a:pPr lvl=\"1\"/><a:r><a:rPr lang=\"en-US\" smtClean=\"0\"/><a:t>Second level</a:t></a:r></a:p><a:p><a:pPr lvl=\"2\"/><a:r><a:rPr lang=\"en-US\" smtClean=\"0\"/><a:t>Third level</a:t></a:r></a:p><a:p><a:pPr lvl=\"3\"/><a:r><a:rPr lang=\"en-US\" smtClean=\"0\"/><a:t>Fourth level</a:t></a:r></a:p><a:p><a:pPr lvl=\"4\"/><a:r><a:rPr lang=\"en-US\" smtClean=\"0\"/><a:t>Fifth level</a:t></a:r><a:endParaRPr lang=\"en-US\"/></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id=\"4\" name=\"Date Placeholder 3\"/><p:cNvSpPr><a:spLocks noGrp=\"1\"/></p:cNvSpPr><p:nvPr><p:ph type=\"dt\" sz=\"half\" idx=\"2\"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x=\"457200\" y=\"6356350\"/><a:ext cx=\"2133600\" cy=\"365125\"/></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr vert=\"horz\" lIns=\"91440\" tIns=\"45720\" rIns=\"91440\" bIns=\"45720\" rtlCol=\"0\" anchor=\"ctr\"/><a:lstStyle><a:lvl1pPr algn=\"l\"><a:defRPr sz=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"><a:tint val=\"75000\"/></a:schemeClr></a:solidFill></a:defRPr></a:lvl1pPr></a:lstStyle><a:p><a:fld id=\"{5BCAD085-E8A6-8845-BD4E-CB4CCA059FC4}\" type=\"datetimeFigureOut\"><a:rPr lang=\"en-US\" smtClean=\"0\"/><a:t>1/27/13</a:t></a:fld><a:endParaRPr lang=\"en-US\"/></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id=\"5\" name=\"Footer Placeholder 4\"/><p:cNvSpPr><a:spLocks noGrp=\"1\"/></p:cNvSpPr><p:nvPr><p:ph type=\"ftr\" sz=\"quarter\" idx=\"3\"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x=\"3124200\" y=\"6356350\"/><a:ext cx=\"2895600\" cy=\"365125\"/></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr vert=\"horz\" lIns=\"91440\" tIns=\"45720\" rIns=\"91440\" bIns=\"45720\" rtlCol=\"0\" anchor=\"ctr\"/><a:lstStyle><a:lvl1pPr algn=\"ctr\"><a:defRPr sz=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"><a:tint val=\"75000\"/></a:schemeClr></a:solidFill></a:defRPr></a:lvl1pPr></a:lstStyle><a:p><a:endParaRPr lang=\"en-US\"/></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id=\"6\" name=\"Slide Number Placeholder 5\"/><p:cNvSpPr><a:spLocks noGrp=\"1\"/></p:cNvSpPr><p:nvPr><p:ph type=\"sldNum\" sz=\"quarter\" idx=\"4\"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x=\"6553200\" y=\"6356350\"/><a:ext cx=\"2133600\" cy=\"365125\"/></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr vert=\"horz\" lIns=\"91440\" tIns=\"45720\" rIns=\"91440\" bIns=\"45720\" rtlCol=\"0\" anchor=\"ctr\"/><a:lstStyle><a:lvl1pPr algn=\"r\"><a:defRPr sz=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"><a:tint val=\"75000\"/></a:schemeClr></a:solidFill></a:defRPr></a:lvl1pPr></a:lstStyle><a:p><a:fld id=\"{C1FF6DA9-008F-8B48-92A6-B652298478BF}\" type=\"slidenum\"><a:rPr lang=\"en-US\" smtClean=\"0\"/><a:t>‹#›</a:t></a:fld><a:endParaRPr lang=\"en-US\"/></a:p></p:txBody></p:sp></p:spTree><p:extLst><p:ext uri=\"{BB962C8B-B14F-4D97-AF65-F5344CB8AC3E}\"><p14:creationId xmlns:p14=\"http://schemas.microsoft.com/office/powerpoint/2010/main\" val=\"2209977519\"/></p:ext></p:extLst></p:cSld><p:clrMap bg1=\"lt1\" tx1=\"dk1\" bg2=\"lt2\" tx2=\"dk2\" accent1=\"accent1\" accent2=\"accent2\" accent3=\"accent3\" accent4=\"accent4\" accent5=\"accent5\" accent6=\"accent6\" hlink=\"hlink\" folHlink=\"folHlink\"/><p:sldLayoutIdLst><p:sldLayoutId id=\"2147483649\" r:id=\"rId1\"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr algn=\"ctr\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"0\"/></a:spcBef><a:buNone/><a:defRPr sz=\"4400\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"/></a:solidFill><a:latin typeface=\"+mj-lt\"/><a:ea typeface=\"+mj-ea\"/><a:cs typeface=\"+mj-cs\"/></a:defRPr></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr marL=\"342900\" indent=\"-342900\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\"/></a:spcBef><a:buFont typeface=\"Arial\"/><a:buChar char=\"•\"/><a:defRPr sz=\"3200\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"/></a:solidFill><a:latin typeface=\"+mn-lt\"/><a:ea typeface=\"+mn-ea\"/><a:cs typeface=\"+mn-cs\"/></a:defRPr></a:lvl1pPr><a:lvl2pPr marL=\"742950\" indent=\"-285750\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\"/></a:spcBef><a:buFont typeface=\"Arial\"/><a:buChar char=\"–\"/><a:defRPr sz=\"2800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"/></a:solidFill><a:latin typeface=\"+mn-lt\"/><a:ea typeface=\"+mn-ea\"/><a:cs typeface=\"+mn-cs\"/></a:defRPr></a:lvl2pPr><a:lvl3pPr marL=\"1143000\" indent=\"-228600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\"/></a:spcBef><a:buFont typeface=\"Arial\"/><a:buChar char=\"•\"/><a:defRPr sz=\"2400\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"/></a:solidFill><a:latin typeface=\"+mn-lt\"/><a:ea typeface=\"+mn-ea\"/><a:cs typeface=\"+mn-cs\"/></a:defRPr></a:lvl3pPr><a:lvl4pPr marL=\"1600200\" indent=\"-228600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\"/></a:spcBef><a:buFont typeface=\"Arial\"/><a:buChar char=\"–\"/><a:defRPr sz=\"2000\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"/></a:solidFill><a:latin typeface=\"+mn-lt\"/><a:ea typeface=\"+mn-ea\"/><a:cs typeface=\"+mn-cs\"/></a:defRPr></a:lvl4pPr><a:lvl5pPr marL=\"2057400\" indent=\"-228600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\"/></a:spcBef><a:buFont typeface=\"Arial\"/><a:buChar char=\"»\"/><a:defRPr sz=\"2000\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"/></a:solidFill><a:latin typeface=\"+mn-lt\"/><a:ea typeface=\"+mn-ea\"/><a:cs typeface=\"+mn-cs\"/></a:defRPr></a:lvl5pPr><a:lvl6pPr marL=\"2514600\" indent=\"-228600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\"/></a:spcBef><a:buFont typeface=\"Arial\"/><a:buChar char=\"•\"/><a:defRPr sz=\"2000\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"/></a:solidFill><a:latin typeface=\"+mn-lt\"/><a:ea typeface=\"+mn-ea\"/><a:cs typeface=\"+mn-cs\"/></a:defRPr></a:lvl6pPr><a:lvl7pPr marL=\"2971800\" indent=\"-228600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\"/></a:spcBef><a:buFont typeface=\"Arial\"/><a:buChar char=\"•\"/><a:defRPr sz=\"2000\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"/></a:solidFill><a:latin typeface=\"+mn-lt\"/><a:ea typeface=\"+mn-ea\"/><a:cs typeface=\"+mn-cs\"/></a:defRPr></a:lvl7pPr><a:lvl8pPr marL=\"3429000\" indent=\"-228600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\"/></a:spcBef><a:buFont typeface=\"Arial\"/><a:buChar char=\"•\"/><a:defRPr sz=\"2000\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"/></a:solidFill><a:latin typeface=\"+mn-lt\"/><a:ea typeface=\"+mn-ea\"/><a:cs typeface=\"+mn-cs\"/></a:defRPr></a:lvl8pPr><a:lvl9pPr marL=\"3886200\" indent=\"-228600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\"/></a:spcBef><a:buFont typeface=\"Arial\"/><a:buChar char=\"•\"/><a:defRPr sz=\"2000\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"/></a:solidFill><a:latin typeface=\"+mn-lt\"/><a:ea typeface=\"+mn-ea\"/><a:cs typeface=\"+mn-cs\"/></a:defRPr></a:lvl9pPr></p:bodyStyle><p:otherStyle><a:defPPr><a:defRPr lang=\"en-US\"/></a:defPPr><a:lvl1pPr marL=\"0\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"/></a:solidFill><a:latin typeface=\"+mn-lt\"/><a:ea typeface=\"+mn-ea\"/><a:cs typeface=\"+mn-cs\"/></a:defRPr></a:lvl1pPr><a:lvl2pPr marL=\"457200\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"/></a:solidFill><a:latin typeface=\"+mn-lt\"/><a:ea typeface=\"+mn-ea\"/><a:cs typeface=\"+mn-cs\"/></a:defRPr></a:lvl2pPr><a:lvl3pPr marL=\"914400\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"/></a:solidFill><a:latin typeface=\"+mn-lt\"/><a:ea typeface=\"+mn-ea\"/><a:cs typeface=\"+mn-cs\"/></a:defRPr></a:lvl3pPr><a:lvl4pPr marL=\"1371600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"/></a:solidFill><a:latin typeface=\"+mn-lt\"/><a:ea typeface=\"+mn-ea\"/><a:cs typeface=\"+mn-cs\"/></a:defRPr></a:lvl4pPr><a:lvl5pPr marL=\"1828800\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"/></a:solidFill><a:latin typeface=\"+mn-lt\"/><a:ea typeface=\"+mn-ea\"/><a:cs typeface=\"+mn-cs\"/></a:defRPr></a:lvl5pPr><a:lvl6pPr marL=\"2286000\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"/></a:solidFill><a:latin typeface=\"+mn-lt\"/><a:ea typeface=\"+mn-ea\"/><a:cs typeface=\"+mn-cs\"/></a:defRPr></a:lvl6pPr><a:lvl7pPr marL=\"2743200\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"/></a:solidFill><a:latin typeface=\"+mn-lt\"/><a:ea typeface=\"+mn-ea\"/><a:cs typeface=\"+mn-cs\"/></a:defRPr></a:lvl7pPr><a:lvl8pPr marL=\"3200400\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"/></a:solidFill><a:latin typeface=\"+mn-lt\"/><a:ea typeface=\"+mn-ea\"/><a:cs typeface=\"+mn-cs\"/></a:defRPr></a:lvl8pPr><a:lvl9pPr marL=\"3657600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"/></a:solidFill><a:latin typeface=\"+mn-lt\"/><a:ea typeface=\"+mn-ea\"/><a:cs typeface=\"+mn-cs\"/></a:defRPr></a:lvl9pPr></p:otherStyle></p:txStyles></p:sldMaster>", "layout": "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n<p:sldLayout xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\" type=\"blank\" preserve=\"1\"><p:cSld name=\"Blank\"><p:spTree><p:nvGrpSpPr><p:cNvPr id=\"1\" name=\"\"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x=\"0\" y=\"0\"/><a:ext cx=\"0\" cy=\"0\"/><a:chOff x=\"0\" y=\"0\"/><a:chExt cx=\"0\" cy=\"0\"/></a:xfrm></p:grpSpPr><p:sp><p:nvSpPr><p:cNvPr id=\"2\" name=\"Date Placeholder 1\"/><p:cNvSpPr><a:spLocks noGrp=\"1\"/></p:cNvSpPr><p:nvPr><p:ph type=\"dt\" sz=\"half\" idx=\"10\"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:fld id=\"{5BCAD085-E8A6-8845-BD4E-CB4CCA059FC4}\" type=\"datetimeFigureOut\"><a:rPr lang=\"en-US\" smtClean=\"0\"/><a:t>1/27/13</a:t></a:fld><a:endParaRPr lang=\"en-US\"/></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id=\"3\" name=\"Footer Placeholder 2\"/><p:cNvSpPr><a:spLocks noGrp=\"1\"/></p:cNvSpPr><p:nvPr><p:ph type=\"ftr\" sz=\"quarter\" idx=\"11\"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang=\"en-US\"/></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id=\"4\" name=\"Slide Number Placeholder 3\"/><p:cNvSpPr><a:spLocks noGrp=\"1\"/></p:cNvSpPr><p:nvPr><p:ph type=\"sldNum\" sz=\"quarter\" idx=\"12\"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:fld id=\"{C1FF6DA9-008F-8B48-92A6-B652298478BF}\" type=\"slidenum\"><a:rPr lang=\"en-US\" smtClean=\"0\"/><a:t>‹#›</a:t></a:fld><a:endParaRPr lang=\"en-US\"/></a:p></p:txBody></p:sp></p:spTree><p:extLst><p:ext uri=\"{BB962C8B-B14F-4D97-AF65-F5344CB8AC3E}\"><p14:creationId xmlns:p14=\"http://schemas.microsoft.com/office/powerpoint/2010/main\" val=\"1212999818\"/></p:ext></p:extLst></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>", "theme": "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n<a:theme xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" name=\"Office Theme\"><a:themeElements><a:clrScheme name=\"Office\"><a:dk1><a:sysClr val=\"windowText\" lastClr=\"000000\"/></a:dk1><a:lt1><a:sysClr val=\"window\" lastClr=\"FFFFFF\"/></a:lt1><a:dk2><a:srgbClr val=\"1F497D\"/></a:dk2><a:lt2><a:srgbClr val=\"EEECE1\"/></a:lt2><a:accent1><a:srgbClr val=\"4F81BD\"/></a:accent1><a:accent2><a:srgbClr val=\"C0504D\"/></a:accent2><a:accent3><a:srgbClr val=\"9BBB59\"/></a:accent3><a:accent4><a:srgbClr val=\"8064A2\"/></a:accent4><a:accent5><a:srgbClr val=\"4BACC6\"/></a:accent5><a:accent6><a:srgbClr val=\"F79646\"/></a:accent6><a:hlink><a:srgbClr val=\"0000FF\"/></a:hlink><a:folHlink><a:srgbClr val=\"800080\"/></a:folHlink></a:clrScheme><a:fontScheme name=\"Office\"><a:majorFont><a:latin typeface=\"Calibri\"/><a:ea typeface=\"\"/><a:cs typeface=\"\"/><a:font script=\"Jpan\" typeface=\"ＭＳ Ｐゴシック\"/><a:font script=\"Hang\" typeface=\"맑은 고딕\"/><a:font script=\"Hans\" typeface=\"宋体\"/><a:font script=\"Hant\" typeface=\"新細明體\"/><a:font script=\"Arab\" typeface=\"Times New Roman\"/><a:font script=\"Hebr\" typeface=\"Times New Roman\"/><a:font script=\"Thai\" typeface=\"Angsana New\"/><a:font script=\"Ethi\" typeface=\"Nyala\"/><a:font script=\"Beng\" typeface=\"Vrinda\"/><a:font script=\"Gujr\" typeface=\"Shruti\"/><a:font script=\"Khmr\" typeface=\"MoolBoran\"/><a:font script=\"Knda\" typeface=\"Tunga\"/><a:font script=\"Guru\" typeface=\"Raavi\"/><a:font script=\"Cans\" typeface=\"Euphemia\"/><a:font script=\"Cher\" typeface=\"Plantagenet Cherokee\"/><a:font script=\"Yiii\" typeface=\"Microsoft Yi Baiti\"/><a:font script=\"Tibt\" typeface=\"Microsoft Himalaya\"/><a:font script=\"Thaa\" typeface=\"MV Boli\"/><a:font script=\"Deva\" typeface=\"Mangal\"/><a:font script=\"Telu\" typeface=\"Gautami\"/><a:font script=\"Taml\" typeface=\"Latha\"/><a:font script=\"Syrc\" typeface=\"Estrangelo Edessa\"/><a:font script=\"Orya\" typeface=\"Kalinga\"/><a:font script=\"Mlym\" typeface=\"Kartika\"/><a:font script=\"Laoo\" typeface=\"DokChampa\"/><a:font script=\"Sinh\" typeface=\"Iskoola Pota\"/><a:font script=\"Mong\" typeface=\"Mongolian Baiti\"/><a:font script=\"Viet\" typeface=\"Times New Roman\"/><a:font script=\"Uigh\" typeface=\"Microsoft Uighur\"/><a:font script=\"Geor\" typeface=\"Sylfaen\"/></a:majorFont><a:minorFont><a:latin typeface=\"Calibri\"/><a:ea typeface=\"\"/><a:cs typeface=\"\"/><a:font script=\"Jpan\" typeface=\"ＭＳ Ｐゴシック\"/><a:font script=\"Hang\" typeface=\"맑은 고딕\"/><a:font script=\"Hans\" typeface=\"宋体\"/><a:font script=\"Hant\" typeface=\"新細明體\"/><a:font script=\"Arab\" typeface=\"Arial\"/><a:font script=\"Hebr\" typeface=\"Arial\"/><a:font script=\"Thai\" typeface=\"Cordia New\"/><a:font script=\"Ethi\" typeface=\"Nyala\"/><a:font script=\"Beng\" typeface=\"Vrinda\"/><a:font script=\"Gujr\" typeface=\"Shruti\"/><a:font script=\"Khmr\" typeface=\"DaunPenh\"/><a:font script=\"Knda\" typeface=\"Tunga\"/><a:font script=\"Guru\" typeface=\"Raavi\"/><a:font script=\"Cans\" typeface=\"Euphemia\"/><a:font script=\"Cher\" typeface=\"Plantagenet Cherokee\"/><a:font script=\"Yiii\" typeface=\"Microsoft Yi Baiti\"/><a:font script=\"Tibt\" typeface=\"Microsoft Himalaya\"/><a:font script=\"Thaa\" typeface=\"MV Boli\"/><a:font script=\"Deva\" typeface=\"Mangal\"/><a:font script=\"Telu\" typeface=\"Gautami\"/><a:font script=\"Taml\" typeface=\"Latha\"/><a:font script=\"Syrc\" typeface=\"Estrangelo Edessa\"/><a:font script=\"Orya\" typeface=\"Kalinga\"/><a:font script=\"Mlym\" typeface=\"Kartika\"/><a:font script=\"Laoo\" typeface=\"DokChampa\"/><a:font script=\"Sinh\" typeface=\"Iskoola Pota\"/><a:font script=\"Mong\" typeface=\"Mongolian Baiti\"/><a:font script=\"Viet\" typeface=\"Arial\"/><a:font script=\"Uigh\" typeface=\"Microsoft Uighur\"/><a:font script=\"Geor\" typeface=\"Sylfaen\"/></a:minorFont></a:fontScheme><a:fmtScheme name=\"Office\"><a:fillStyleLst><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:gradFill rotWithShape=\"1\"><a:gsLst><a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:tint val=\"50000\"/><a:satMod val=\"300000\"/></a:schemeClr></a:gs><a:gs pos=\"35000\"><a:schemeClr val=\"phClr\"><a:tint val=\"37000\"/><a:satMod val=\"300000\"/></a:schemeClr></a:gs><a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:tint val=\"15000\"/><a:satMod val=\"350000\"/></a:schemeClr></a:gs></a:gsLst><a:lin ang=\"16200000\" scaled=\"1\"/></a:gradFill><a:gradFill rotWithShape=\"1\"><a:gsLst><a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:tint val=\"100000\"/><a:shade val=\"100000\"/><a:satMod val=\"130000\"/></a:schemeClr></a:gs><a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:tint val=\"50000\"/><a:shade val=\"100000\"/><a:satMod val=\"350000\"/></a:schemeClr></a:gs></a:gsLst><a:lin ang=\"16200000\" scaled=\"0\"/></a:gradFill></a:fillStyleLst><a:lnStyleLst><a:ln w=\"9525\" cap=\"flat\" cmpd=\"sng\" algn=\"ctr\"><a:solidFill><a:schemeClr val=\"phClr\"><a:shade val=\"95000\"/><a:satMod val=\"105000\"/></a:schemeClr></a:solidFill><a:prstDash val=\"solid\"/></a:ln><a:ln w=\"25400\" cap=\"flat\" cmpd=\"sng\" algn=\"ctr\"><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:prstDash val=\"solid\"/></a:ln><a:ln w=\"38100\" cap=\"flat\" cmpd=\"sng\" algn=\"ctr\"><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:prstDash val=\"solid\"/></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst><a:outerShdw blurRad=\"40000\" dist=\"20000\" dir=\"5400000\" rotWithShape=\"0\"><a:srgbClr val=\"000000\"><a:alpha val=\"38000\"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle><a:effectStyle><a:effectLst><a:outerShdw blurRad=\"40000\" dist=\"23000\" dir=\"5400000\" rotWithShape=\"0\"><a:srgbClr val=\"000000\"><a:alpha val=\"35000\"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle><a:effectStyle><a:effectLst><a:outerShdw blurRad=\"40000\" dist=\"23000\" dir=\"5400000\" rotWithShape=\"0\"><a:srgbClr val=\"000000\"><a:alpha val=\"35000\"/></a:srgbClr></a:outerShdw></a:effectLst><a:scene3d><a:camera prst=\"orthographicFront\"><a:rot lat=\"0\" lon=\"0\" rev=\"0\"/></a:camera><a:lightRig rig=\"threePt\" dir=\"t\"><a:rot lat=\"0\" lon=\"0\" rev=\"1200000\"/></a:lightRig></a:scene3d><a:sp3d><a:bevelT w=\"63500\" h=\"25400\"/></a:sp3d></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:gradFill rotWithShape=\"1\"><a:gsLst><a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:tint val=\"40000\"/><a:satMod val=\"350000\"/></a:schemeClr></a:gs><a:gs pos=\"40000\"><a:schemeClr val=\"phClr\"><a:tint val=\"45000\"/><a:shade val=\"99000\"/><a:satMod val=\"350000\"/></a:schemeClr></a:gs><a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:shade val=\"20000\"/><a:satMod val=\"255000\"/></a:schemeClr></a:gs></a:gsLst><a:path path=\"circle\"><a:fillToRect l=\"50000\" t=\"-80000\" r=\"50000\" b=\"180000\"/></a:path></a:gradFill><a:gradFill rotWithShape=\"1\"><a:gsLst><a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:tint val=\"80000\"/><a:satMod val=\"300000\"/></a:schemeClr></a:gs><a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:shade val=\"30000\"/><a:satMod val=\"200000\"/></a:schemeClr></a:gs></a:gsLst><a:path path=\"circle\"><a:fillToRect l=\"50000\" t=\"50000\" r=\"50000\" b=\"50000\"/></a:path></a:gradFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults><a:spDef><a:spPr/><a:bodyPr/><a:lstStyle/><a:style><a:lnRef idx=\"1\"><a:schemeClr val=\"accent1\"/></a:lnRef><a:fillRef idx=\"3\"><a:schemeClr val=\"accent1\"/></a:fillRef><a:effectRef idx=\"2\"><a:schemeClr val=\"accent1\"/></a:effectRef><a:fontRef idx=\"minor\"><a:schemeClr val=\"lt1\"/></a:fontRef></a:style></a:spDef><a:lnDef><a:spPr/><a:bodyPr/><a:lstStyle/><a:style><a:lnRef idx=\"2\"><a:schemeClr val=\"accent1\"/></a:lnRef><a:fillRef idx=\"0\"><a:schemeClr val=\"accent1\"/></a:fillRef><a:effectRef idx=\"1\"><a:schemeClr val=\"accent1\"/></a:effectRef><a:fontRef idx=\"minor\"><a:schemeClr val=\"tx1\"/></a:fontRef></a:style></a:lnDef></a:objectDefaults><a:extraClrSchemeLst/></a:theme>", "presProps": "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n<p:presentationPr xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\"><p:extLst><p:ext uri=\"{E76CE94A-603C-4142-B9EB-6D1370010A27}\"><p14:discardImageEditData xmlns:p14=\"http://schemas.microsoft.com/office/powerpoint/2010/main\" val=\"0\"/></p:ext><p:ext uri=\"{D31A062A-798A-4329-ABDD-BBA856620510}\"><p14:defaultImageDpi xmlns:p14=\"http://schemas.microsoft.com/office/powerpoint/2010/main\" val=\"0\"/></p:ext></p:extLst></p:presentationPr>", "viewProps": "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n<p:viewPr xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\" lastView=\"sldThumbnailView\"><p:normalViewPr><p:restoredLeft sz=\"15620\"/><p:restoredTop sz=\"94660\"/></p:normalViewPr><p:slideViewPr><p:cSldViewPr snapToGrid=\"0\" snapToObjects=\"1\"><p:cViewPr varScale=\"1\"><p:scale><a:sx n=\"124\" d=\"100\"/><a:sy n=\"124\" d=\"100\"/></p:scale><p:origin x=\"-1512\" y=\"-112\"/></p:cViewPr><p:guideLst><p:guide orient=\"horz\" pos=\"2160\"/><p:guide pos=\"2880\"/></p:guideLst></p:cSldViewPr></p:slideViewPr><p:notesTextViewPr><p:cViewPr><p:scale><a:sx n=\"100\" d=\"100\"/><a:sy n=\"100\" d=\"100\"/></p:scale><p:origin x=\"0\" y=\"0\"/></p:cViewPr></p:notesTextViewPr><p:gridSpacing cx=\"76200\" cy=\"76200\"/></p:viewPr>", "tableStyles": "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n<a:tblStyleLst xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" def=\"{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}\"/>"};

;
window.QB_LOGO_B64="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";window.QB_LOGO_W=480;window.QB_LOGO_H=165;

;
/* Exports for the PYQ bank: Word (.docx), PowerPoint (.pptx) with native equations, and PDF. */
(function () {
  var MATH_RE = /\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;
  var LET = ['A', 'B', 'C', 'D', 'E', 'F'];

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

  function metaLine(q) {
    if (q.source === 'Non-PYQ') return q.exam + ' level' + (q.ref_year ? ' [' + q.ref_year + ']' : '') + ' · ' + q.chapter_code + ' ' + q.chapter + (q.topic ? ' · ' + q.topic : '') + ' · ' + q.difficulty;
    return q.exam + (q.year ? ' ' + q.year : '') + ' · ' + q.paper + ' · ' + q.chapter_code + ' ' + q.chapter + (q.topic ? ' · ' + q.topic : '') + ' · ' + q.difficulty + (q.attention ? ' · NEEDS ATTENTION' : '');
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
        if (sg.t === 'text') cur += wRun(sg.v);
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
    var figs = o._figs = await figuresFor(qs), media = [], drel = [['rId1', 'styles', 'styles.xml']];
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
      if (sg.t === 'text') cur += aRun(sg.v, sz);
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
    return '<p:pic><p:nvPicPr><p:cNvPr id="6" name="Avanti Fellows logo"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId3"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="' + (EMU_W - 300000 - cx) + '" y="' + LOGO_TOP + '"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>';
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
    o._figs = await figuresFor(qs);
    var T = window.QB_PPT_TPL, slides = [];
    if (o.title) slides.push(slideXml(spXml(2, 'Title', MX, 2400000, BODY_W, 1400000, aPara(aRun(o.title, 3600, { b: true }), 3600) + aPara(aRun(qs.length + ' questions', 2000, { color: 'BFBFBF' }), 2000), false)));
    qs.forEach(function (q, i) { slides.push(questionSlide(q, i, o)); slides.push(slideXml('')); });
    if (o.answers && o.answerKey) slides = slides.concat(keySlides(qs));
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
        if (sg.t === 'text') return esc(sg.v);
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
  var PCSS = '.qbp{font-family:Arial,Helvetica,"Segoe UI",sans-serif;font-size:14px;line-height:1.55;color:#000;background:#fff}' +
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
  function plainText(q) { return q.question.replace(FIG_RE, ' [figure] ') + '\n' + (q.options || []).map(function (op, j) { return '(' + LET[j] + ') ' + op; }).join('\n'); }

  window.QBX = { segments: segments, optCols: optCols, buildDocx: buildDocx, buildPptx: buildPptx, buildPdf: buildPdf, printDocument: printDocument, plainText: plainText, richHtml: richHtml, texToOmml: texToOmml };
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
      nonpyq.forEach(function (q) { var k = q.publisher || 'VMC'; pb[k] = (pb[k] || 0) + 1; });
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
        { group: 'src_VMC', n: g(pb, 'VMC') },
        { group: 'src_Cengage', n: g(pb, 'Cengage') },
        { group: 'src_PPTs', n: g(pb, 'PPTs') },
        { group: 'src_Avanti', n: g(pb, 'Avanti') },
        { group: 'src_BlackBook', n: g(pb, 'Black Book') }
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
        return { chapter_code: c.chapter_code, chapter: c.chapter, main_2025: n('JEE Main', 2025), main_2026: n('JEE Main', 2026), adv_2025: n('JEE Advanced', 2025), adv_2026: n('JEE Advanced', 2026), main_all: ex('JEE Main') + ex('AIEEE'), adv_all: ex('JEE Advanced') + ex('IIT'), kcet_all: ex('KCET'), src_VMC: sc('VMC'), src_Cengage: sc('Cengage'), src_PPTs: sc('PPTs'), src_BlackBook: sc('Black Book'), nonpyq: nn.t, total: p.t + nn.t };
      });
    }
  });

  /* ---------- state ---------- */
  var SOLM = null, SOLP = null;
  function loadSol() {
    if (SOLM) return Promise.resolve(SOLM);
    if (!SOLP) SOLP = fetch('qb/data/sol.json').then(function (r) { if (!r.ok) throw new Error('sol'); return r.json(); }).then(function (m) { SOLM = m; return m; }).catch(function () { SOLP = null; return {}; });
    return SOLP;
  }
  var PER_PAGE = 20, page = 0, lastKey = null;
  var S = { exam: new Set(), year: new Set(), cls: new Set(), diff: new Set(), type: new Set(), ch: new Set(), tp: new Set(), src: new Set(), q: '', onlySel: false, flag: false, attn: false, oos: false, oosx: false, sel: new Set() };
  S.oosx = true; /* out of syllabus questions are excluded by default */
  /* Question Bank opens first from qb/data/first.json (first cards + counts) while the full data downloads: PARTIAL holds the stub rows used for the header numbers and filter lists */
  var PARTIAL = null;
  function toRows(pyqArr, npArr) {
    return pyqArr.map(function (q) { return Object.assign({ source: 'PYQ' }, q); }).concat(npArr.map(function (q) { return Object.assign({}, q, { source: 'Non-PYQ' }); })).map(function (q) {
        var o = q.options; if (typeof o === 'string') { try { o = JSON.parse(o); } catch (e) { o = []; } }
        return { id: String(q.id), pyq: !!q.pyq, pyq_ref: q.pyq_ref ? String(q.pyq_ref) : '', pyq_exam: q.pyq_exam ? String(q.pyq_exam) : '', pyq_year: q.pyq_year ? Number(q.pyq_year) : null, pyq_paper: q.pyq_paper ? String(q.pyq_paper) : '', source: q.source, publisher: q.publisher ? String(q.publisher) : '', part: q.part ? String(q.part) : '', ref_year: q.ref_year ? Number(q.ref_year) : null, note: q.note ? String(q.note) : '', oos: !!q.oos, exam: q.exam, year: q.year ? Number(q.year) : null, session: q.session, paper: q.paper, qno: Number(q.qno) || 0, type: q.type, class: Number(q.class), chapter_code: q.chapter_code, chapter: q.chapter, topic_code: q.topic_code || '', topic: q.topic || '', sort_date: q.sort_date || '', difficulty: q.difficulty, attention: q.attention ? String(q.attention) : '', figure: normFig(q.figure || (FIGS && FIGS[String(q.id)])), question: q.question || '', options: o || [], answer: q.answer == null ? '' : String(q.answer), source_url: q.source_url || '', solution: q.solution ? String(q.solution) : '' };
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
    ls.forEach(function (l, k) { if (c1 < 0 && /^\s*Column[\s-]*I\s*:?\s*$/i.test(l)) c1 = k; else if (c1 >= 0 && c2 < 0 && /^\s*Column[\s-]*II\s*:?\s*$/i.test(l)) c2 = k; });
    if (c1 >= 0 && c2 > c1) {
      if (c1 > 0) renderRich(target, ls.slice(0, c1).join('\n'), fig);
      var colA = ls.slice(c1 + 1, c2).filter(function (l) { return l.trim(); }), colB = ls.slice(c2 + 1).filter(function (l) { return l.trim(); });
      var grid = el('div', 'qb-match'); grid.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:32px;row-gap:8px;margin:8px 0;align-items:center';
      var h1 = el('div', 'qb-mh', 'Column I'), h2 = el('div', 'qb-mh', 'Column II'); h1.style.fontWeight = h2.style.fontWeight = '700'; grid.appendChild(h1); grid.appendChild(h2);
      for (var r = 0; r < Math.max(colA.length, colB.length); r++) {
        [colA[r], colB[r]].forEach(function (ln) { var cell = el('div', 'qb-mc'); if (ln != null) renderRich(cell, ln, fig); grid.appendChild(cell); });
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
        if (sg.t === 'text') { target.appendChild(document.createTextNode(sg.v)); return; }
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

  /* chapter order; PYQs first: JEE Main (with AIEEE), JEE Advanced (with IIT), KCET, each newest first (year, month, day, shift); then practice questions by source: Cengage, Black Book, VMC, Avanti, PPTs (then any other), each in sheet order */
  var PUB_ORDER = ['Cengage', 'Black Book', 'VMC', 'Avanti', 'PPTs'];
  function pubRank(q) { var i = PUB_ORDER.indexOf(q.publisher); return i < 0 ? PUB_ORDER.length : i; }
  function examRank(q) { var e = q.exam; return e === 'JEE Main' || e === 'AIEEE' ? 0 : e === 'JEE Advanced' || e === 'IIT' ? 1 : e === 'KCET' ? 2 : 3; }
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
  function isFlagged(q) { return !!(q.note || flagOf(q)); }
  function flagCount() { return ROWS.filter(isFlagged).length; }
  function attnCount() { return ROWS.filter(function (q) { return !!q.attention; }).length; }
  function oosCount() { return ROWS.filter(function (q) { return q.oos; }).length; }
  function fdoc(id) { return FDB.collection('flags').doc(String(id)); }
  function loadFlags() {
    try { var o = JSON.parse(localStorage.getItem(FKEY) || '{}'); Object.keys(o).forEach(function (k) { FLAGS[k] = o[k]; }); } catch (e) { /* no storage */ }
    if (!(window.claude && window.claude.use)) return;
    window.claude.use('db').then(function (db) {
      if (!db) return; FDB = db;
      return db.collection('flags').get().then(function (snap) {
        FLAGS = {}; try { localStorage.removeItem(FKEY); } catch (e) { /* ignore */ }
        snap.docs.forEach(function (d) { var v = d.data(); if (v && v.note && v.status !== 'done') FLAGS[d.id] = { note: String(v.note), at: v.at || 0 }; else delete FLAGS[d.id]; });
        Object.keys(CARDS).forEach(function (id) { if (CARDS[id] && CARDS[id].paintFlag) CARDS[id].paintFlag(); });
        apply();
      });
    }).catch(function () { /* flags stay on this browser only */ });
  }
  function saveFlag(q, text) {
    text = text.trim();
    if (text) FLAGS[q.id] = { note: text, at: Date.now() }; else delete FLAGS[q.id];
    try { localStorage.setItem(FKEY, JSON.stringify(FLAGS)); } catch (e) { /* ignore */ }
    if (!FDB) return Promise.resolve('browser');
    var d = fdoc(q.id);
    var w = text ? d.set({ id: q.id, note: text, status: 'open', at: Date.now(), source: q.source, exam: q.exam, year: q.year || null, paper: q.paper || '', qno: q.qno || null, chapter_code: q.chapter_code, topic: q.topic || '', question: String(q.question || '').slice(0, 300) }) : d.delete();
    return w.then(function () { return 'shared'; });
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
      meta.appendChild(el('span', 'qb-tag ' + (q.exam === 'JEE Main' ? 'ex-main' : 'ex-adv'), q.exam + ' level'));
      meta.appendChild(el('span', 'qb-tag', q.publisher || 'VMC'));
      if (q.pyq) { var pt = el('span', 'qb-tag ex-main', 'PYQ'); pt.title = 'This question is also a previous-year question' + (q.pyq_ref ? ' (' + q.pyq_ref + ')' : ''); meta.appendChild(pt); meta.appendChild(el('span', 'qb-date', q.pyq_paper + (q.pyq_exam === 'JEE Main' || !q.pyq_year ? '' : ' · ' + q.pyq_year))); }
      if (q.ref_year) meta.appendChild(el('span', 'qb-tag', '[' + q.ref_year + ']'));
    } else {
      meta.appendChild(el('span', 'qb-tag ' + (q.exam === 'JEE Main' ? 'ex-main' : 'ex-adv'), q.exam));
      meta.appendChild(el('span', 'qb-date', q.exam === 'JEE Main' || !q.year ? q.paper : q.paper + ' · ' + q.year));
    }
    var bTop = null, bTyp = icoBtn('list', q.type, true);
    if (q.topic) { bTop = icoBtn('tag', q.topic, true); }
    var bId = icoBtn('hash', 'ID: ' + q.id, true); bId.classList.add('soft'); bId.title = 'Tap to copy the question ID';
    bId.addEventListener('click', function () {
      var t = q.id, tip = 'ID: ' + t, ok = function () { flash(bId, 'Copied ' + t); };
      try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(ok, function () { flash(bId, tip); }); return; } } catch (e) { }
      flash(bId, tip);
    });
    if (q.oos) meta.appendChild(el('span', 'qb-tag oos', 'Out of syllabus'));
    if (q.attention) meta.appendChild(el('span', 'qb-tag attn', 'Attention'));
    if (q.note) meta.appendChild(el('span', 'qb-tag rev', 'Review'));
    meta.appendChild(el('span', 'qb-tag diff', q.difficulty));
    main.appendChild(meta);
    if (q.attention) main.appendChild(el('div', 'qb-attn', q.attention));
    if (q.note) main.appendChild(el('div', 'qb-note', q.note));
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
        /* solutions live in their own file (qb/data/sol.json), fetched the first time an explanation is opened */
        if (!SOLM) { sb.className = 'qb-sol-b'; sb.textContent = 'Loading\u2026'; }
        loadSol().then(function (m) {
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
    if (!document.getElementById('qb-popfix')) { var pst = document.createElement('style'); pst.id = 'qb-popfix'; pst.textContent = '.qb-q.pop-open{z-index:40}'; document.head.appendChild(pst); } /* the open menu must sit above the next cards */
    var pop = el('div', 'qb-pop'); pop.hidden = true;
    [bTop, bTyp, bId, bFlag].forEach(function (b) { if (b) pop.appendChild(b); });
    bFlag.classList.add('soft', 'row'); setIco(bFlag, 'flag', 'Flag');
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
        .catch(function () { bSave.disabled = bDel.disabled = false; fmsg.textContent = 'Could not save to the shared list. It is kept on this browser.'; paint(); apply(); });
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
    if (skip !== 'exam' && S.exam.size && !S.exam.has(effExam(q, cp))) return false;
    if (skip !== 'year' && S.year.size && !S.year.has(String(effYear(q, cp)))) return false;
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
    if (S.flag && !isFlagged(q)) return false;
    if (S.attn && !q.attention) return false;
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
    var rows = VR().filter(function (q) { return q.source === 'PYQ' && (exam ? q.exam === exam : q.exam !== 'KCET') && (y == null || Number(q.year) === y) && (!oos || q.oos); });
    var exams = ['JEE Main', 'JEE Advanced', 'AIEEE', 'IIT', 'KCET'].filter(function (e) { return rows.some(function (q) { return q.exam === e; }); });
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
    S.flag = false; S.attn = false; S.oos = !!oos; if (oos) { S.oosx = false; try { localStorage.setItem('oosEx', '0'); } catch (e) { /* ignore */ } buildChips(); } S.q = pp ? String(pp).toLowerCase() : ''; var se = $('.qb-search'); if (se) se.value = pp || '';
    closeYear(); apply();
    var r = $('.qb-results'); if (r && r.scrollIntoView) r.scrollIntoView({ block: 'start' });
  }
  function goOos(exam) {
    S.exam.clear(); S.ch.clear(); S.tp.clear(); S.year.clear(); S.src.clear(); S.diff.clear(); S.type.clear(); S.cls.clear();
    if (exam) S.exam.add(exam);
    S.flag = false; S.attn = false; S.oos = true; S.oosx = false; try { localStorage.setItem('oosEx', '0'); } catch (e) { /* ignore */ } buildChips(); S.q = ''; var se = $('.qb-search'); if (se) se.value = '';
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
    S.flag = false; S.attn = false; S.oos = false; S.q = ''; var se = $('.qb-search'); if (se) se.value = '';
    closeYear(); apply();
    var r = $('.qb-results'); if (r && r.scrollIntoView) r.scrollIntoView({ block: 'start' });
  }
  function openSource(v, from) {
    closeYear(); YM_FROM = from || null;
    var rows = VR().filter(function (q) { return q.source !== 'PYQ' && srcOf(q) === v; });
    var isBB = v === 'Black Book', EX = [1, 2, 3, 4, 5];
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
    [['JEE Main', 'h-main'], ['JEE Advanced', 'h-adv'], ['AIEEE', 'h-old'], ['IIT', 'h-old'], ['KCET', 'h-kcet']].forEach(function (e) {
      var mine = pyq.filter(function (q) { return q.exam === e[0]; }), cnt = {};
      mine.forEach(function (q) { if (q.year) cnt[q.year] = (cnt[q.year] || 0) + 1; });
      var eh = box('qb-tile', e[0], mine.length); makeYearBtn(eh, null, e[0]);
      row(e[1], eh, Object.keys(cnt).sort(function (x, y) { return Number(y) - Number(x); }).map(function (y) { var t = box('qb-ytile', y, cnt[y]); makeYearBtn(t, Number(y), e[0]); return t; }));
    });
    var oosRows = pyq.filter(function (q) { return q.oos; });
    if (oosRows.length) {
      var oh = box('qb-tile', 'Out of syllabus', oosRows.length); makeYearBtn(oh, null, null, true);
      row('h-oos', oh, ['JEE Main', 'JEE Advanced', 'AIEEE', 'IIT'].filter(function (e) { return oosRows.some(function (q) { return q.exam === e; }); }).map(function (e) { var t = box('qb-ytile', e === 'JEE Advanced' ? 'Advanced' : e, oosRows.filter(function (q) { return q.exam === e; }).length); makeYearBtn(t, null, e, true); return t; }));
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
    var DD = { src: 'All sources', exam: 'All exams', year: 'All years', type: 'All question types' };
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
  var SRC_VALS = ['PYQs', 'VMC', 'Cengage', 'Avanti', 'PPTs', 'Black Book'], EXAM_VALS = ['JEE Main', 'JEE Advanced', 'AIEEE', 'IIT', 'KCET'];
  function srcOf(q) { return q.source === 'PYQ' ? 'PYQs' : (q.publisher || 'VMC'); }
  /* "PYQs" ticked together with a source that has PYQ-tagged questions (Black Book) = the PYQs of that source only */
  var PYQ_PUBS = {};
  function comboPubs() { if (!S.src.has('PYQs')) return []; var r = []; Object.keys(PYQ_PUBS).forEach(function (p) { if (S.src.has(p)) r.push(p); }); return r; }
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
      ROWS.forEach(function (q) { if (matches(q, f)) { var k = f === 'src' ? srcOf(q) : f === 'exam' ? effExam(q, comboPubs()) : f === 'year' ? String(effYear(q, comboPubs())) : q.type; counts[k] = (counts[k] || 0) + 1; } });
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
        lab.appendChild(cb); lab.appendChild(el('span', null, t.topic)); lab.appendChild(el('span', 'n', String(counts[t.topic_code] || 0)));
        tpList.appendChild(lab);
      });
    });
    if (!tpList.children.length) tpList.appendChild(el('div', 'qb-ms-grp', 'No topics match.'));
  }

  $('.qb-search').addEventListener('input', function (e) { S.q = e.target.value.trim().toLowerCase(); apply(); });
  $('.qb-onlysel').addEventListener('click', function () { S.onlySel = !S.onlySel; apply(); });
  $('.qb-flagf').addEventListener('click', function () { S.flag = !S.flag; apply(); });
  $('.qb-attnf').addEventListener('click', function () { S.attn = !S.attn; apply(); });
  $('.qb-oosonly').addEventListener('click', function () { var on = !S.oos; S.oos = on; if (on && S.oosx) { setOosx(false); } apply(); });
  function setOosx(on) {
    S.oosx = on; if (on) S.oos = false;
    try { localStorage.setItem('oosEx', on ? '1' : '0'); } catch (e) { /* ignore */ }
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
  $('.qb-hideopts').addEventListener('click', function () { var b = $('.qb-hideopts'), on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); b.textContent = on ? 'Show options' : 'Hide options'; $('#questions').classList.toggle('hide-opts', on); });
  $('.qb-revall').addEventListener('click', function () { var b = $('.qb-revall'), on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); $('#questions').classList.toggle('rev-all', on); });
  $('.qb-reset').addEventListener('click', function () {
    ['exam', 'year', 'cls', 'diff', 'type', 'ch', 'tp', 'src'].forEach(function (k) { S[k].clear(); });
    S.q = ''; S.onlySel = false; S.flag = false; S.attn = false; S.oos = false; $('.qb-search').value = ''; apply();
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
    if (chs.length === 1) { var c = CHMAP[chs[0]]; parts.push('c' + chs[0] + ' ' + (c ? c.chapter : qs[0].chapter)); }
    else parts.push('Maths');
    if (years.length === 1) parts.push(years[0]); else if (years.length > 1) parts.push(years[0] + '-' + years[years.length - 1]);
    if (exams.length === 1) parts.push(exams[0] === 'JEE Main' ? 'JEE Mains' : exams[0]);
    var srcs = uniq(qs.map(function (q) { return q.source; }));
    parts.push(srcs.length === 1 ? (srcs[0] === 'PYQ' ? 'PYQs' : 'Practice Qs') : 'PYQs + Practice Qs');
    if (chs.length > 1) parts.push('(' + chs.length + ' chapters)');
    return parts.join(' ').replace(/[\\/:*?"<>|]+/g, '-');
  }

  function updateSelUI() {
    var n = S.sel.size;
    $('.qb-nsel').textContent = String(n);
    ['.qb-docx', '.qb-pdf', '.qb-ppt'].forEach(function (k) { $(k).disabled = busy || !n; });
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
  function apply() {
    $$('.qb-chips[data-f] .qb-chip').forEach(function (b) { var f = b.parentNode.dataset.f; b.setAttribute('aria-pressed', String(S[f].has(b.dataset.v))); });
    DDS.forEach(function (fn) { fn(); });
    $('.qb-onlysel').setAttribute('aria-pressed', String(S.onlySel));
    $('.qb-flagf').setAttribute('aria-pressed', String(S.flag));
    $('.qb-flagf').textContent = 'Review (' + flagCount() + ')';
    $('.qb-attnf').setAttribute('aria-pressed', String(S.attn));
    $('.qb-attnf').textContent = 'Attention (' + attnCount() + ')';
    $('.qb-oosonly').setAttribute('aria-pressed', String(S.oos));
    Array.prototype.forEach.call(document.querySelectorAll('.qb-oosx button'), function (b) { b.setAttribute('aria-pressed', String((b.dataset.v === 'ex') === S.oosx)); if (b.dataset.v === 'in') b.textContent = 'Include (' + oosCount() + ')'; });
    msBtn.textContent = S.ch.size === 0 ? 'All chapters' : S.ch.size === 1 ? (function () { var c = CHMAP[Array.from(S.ch)[0]]; return c ? c.chapter_code + ' ' + c.chapter : '1 chapter'; })() : S.ch.size + ' chapters';
    var tpCh = {}; TOPICS.forEach(function (t) { tpCh[t.topic_code] = t.chapter_code; }); Array.from(S.tp).forEach(function (t) { if (!S.ch.has(tpCh[t])) S.tp.delete(t); });
    var wasHidden = tf.hidden;
    tf.hidden = !S.ch.size;
    if (wasHidden && !tf.hidden) tf.classList.add('ask');
    if (tf.hidden) { tpPanel.hidden = true; tf.classList.remove('ask'); }
    tpBtn.textContent = S.tp.size === 0 ? 'All topics' : S.tp.size === 1 ? (TOPICS.filter(function (t) { return S.tp.has(t.topic_code); })[0] || { topic: '1 topic' }).topic : S.tp.size + ' topics';
    drawTpList();
    updateFlagCol();
    var pills = $('.qb-pills'); pills.replaceChildren();
    CHAPTERS.filter(function (c) { return S.ch.has(c.chapter_code); }).forEach(function (c) {
      var p = el('button', 'qb-pill', c.chapter_code + ' ' + c.chapter + ' ×'); p.type = 'button'; p.setAttribute('aria-label', 'Remove ' + c.chapter);
      p.addEventListener('click', function () { S.ch.delete(c.chapter_code); apply(); });
      pills.appendChild(p);
    });
    TOPICS.filter(function (t) { return S.tp.has(t.topic_code); }).forEach(function (t) {
      var p = el('button', 'qb-pill tp', t.topic + ' ×'); p.type = 'button'; p.setAttribute('aria-label', 'Remove topic ' + t.topic);
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
        head.appendChild(el('span', 'code', 'c' + cur));
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
    return ['exam', 'year', 'cls', 'diff', 'type', 'ch', 'tp', 'src'].map(function (k) { return Array.from(S[k]).sort().join(','); }).join('|') + '|' + S.q + '|' + S.onlySel + '|' + S.flag + '|' + S.attn + '|' + S.oos + '|' + S.oosx;
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
    var pyq = VR().filter(function (q) { return q.source === 'PYQ' && q.year && q.exam !== 'KCET'; });
    var maxY = pyq.reduce(function (m, q) { return Math.max(m, q.year); }, 0);
    var from = WC.yrs === 'all' ? 0 : maxY - Number(WC.yrs) + 1;
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
    if (WC.sort === 'count') list.sort(function (a, b) { return b.n - a.n; });
    var total = rows.length, top = list.reduce(function (t, r) { return Math.max(t, r.n); }, 0) || 1;
    body.replaceChildren();
    var yl = WC.yrs === 'all' ? 'all years' : (from + '–' + maxY);
    body.appendChild(el('div', 'qb-wc-sub', total.toLocaleString('en-US') + ' previous-year questions in the bank · ' + yl + '. Click a bar to list that chapter\u2019s questions. Chapters whose PYQ PDFs are not uploaded yet show fewer questions.'));
    list.forEach(function (r) {
      var row = el('button', 'qb-wc-row'); row.type = 'button'; row.title = r.c.chapter_code + ' ' + r.c.chapter + ': ' + r.n + ' questions';
      row.appendChild(el('span', 'qb-wc-lbl', r.c.chapter_code + ' ' + r.c.chapter));
      var tr = el('span', 'qb-wc-track'), w = r.n / top * 100;
      var a = el('span', 'qb-wc-seg main'); a.style.width = (r.main / top * 100) + '%'; tr.appendChild(a);
      var b = el('span', 'qb-wc-seg adv'); b.style.width = (r.adv / top * 100) + '%'; tr.appendChild(b);
      row.appendChild(tr);
      row.appendChild(el('span', 'qb-wc-val', WC.pct ? (total ? (r.n / total * 100).toFixed(1) : '0.0') + '%' : String(r.n)));
      row.addEventListener('click', function () {
        S.ch.clear(); S.ch.add(r.c.chapter_code); S.oos = false;
        if (WC.exam === 'main') { S.exam.clear(); S.exam.add('JEE Main'); S.exam.add('AIEEE'); } else if (WC.exam === 'adv') { S.exam.clear(); S.exam.add('JEE Advanced'); S.exam.add('IIT'); }
        apply(); var rs = $('.qb-results .qb-bar'); var t = $('#selection'); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'start' });
      });
      body.appendChild(row);
    });
    var lg = el('div', 'qb-wc-leg');
    if (WC.exam !== 'adv') lg.appendChild(el('span', 'qb-wc-key main', 'JEE Main + AIEEE'));
    if (WC.exam !== 'main') lg.appendChild(el('span', 'qb-wc-key adv', 'JEE Advanced + IIT'));
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
      ['chapter_code', 'chapter', 'main_all', 'adv_all', 'kcet_all', 'src_VMC', 'src_Cengage', 'src_PPTs', 'src_BlackBook', 'nonpyq', 'total', 'oos', 'attn', 'flagged'].forEach(function (k) {
        var td = el('td', typeof r[k] === 'number' && r[k] === 0 ? 'z' : null, String(r[k]));
        tr.appendChild(td);
      });
      tr.addEventListener('click', function () { if (S.ch.has(r.chapter_code)) S.ch.delete(r.chapter_code); else S.ch.add(r.chapter_code); apply(); });
      tb.appendChild(tr);
    });
    $$('#overview tbody tr').forEach(function (tr) { tr.classList.toggle('on', S.ch.has(tr.dataset.key)); });
  }

  /* ---------- export ---------- */
  var dl = null;
  try { if (window.claude && typeof window.claude.use === 'function') window.claude.use('downloads').then(function (d) { dl = d; }, function () { dl = null; }); } catch (e) { dl = null; }
  function msg(t, bad) { var m = $('.qb-msg'); m.textContent = t || ''; m.classList.toggle('bad', !!bad); }
  function opts() {
    var ans = $('.qb-o-ans').checked;
    return { answers: ans || $('.qb-o-key').checked, answerKey: $('.qb-o-key').checked, pptLayout: $('.qb-o-ppt').checked };
  }
  function save(filename, data) {
    if (!dl) { msg('Downloads are not available in this view. Open the dashboard on claude.ai to export.', true); return Promise.resolve(false); }
    return dl.save({ filename: filename, data: data }).then(function () { msg('Saved ' + filename); return true; }, function (e) {
      var code = e && e.code;
      if (code === 'declined') msg('Download cancelled.');
      else if (code === 'rate_limited') msg('A download prompt is already open.', true);
      else msg('Could not save the file (' + (code || 'error') + ').', true);
      return false;
    });
  }
  var busy = false;
  function setBusy(on) { busy = on; ['.qb-docx', '.qb-pdf', '.qb-ppt'].forEach(function (k) { $(k).disabled = on || !S.sel.size; }); }
  function exportWith(ext, build) {
    var qs = selected(); if (!qs.length || busy) return;
    var name = exportName(qs), o = opts(); o.title = name;
    setBusy(true); msg('Building ' + ext.toUpperCase() + ' (' + qs.length + ' questions)…');
    setTimeout(function () {
      Promise.resolve(figReady).then(function () { return build(qs, o); })
        .then(function (bytes) { return save(name + '.' + ext, new Blob([bytes])); })
        .catch(function (e) { msg('Could not build the ' + ext.toUpperCase() + ' file: ' + (e && e.message || e), true); })
        .then(function () { setBusy(false); });
    }, 30);
  }
  $('.qb-docx').addEventListener('click', function () { exportWith('docx', function (qs, o) { return QBX.buildDocx(qs, o); }); });
  $('.qb-ppt').addEventListener('click', function () { exportWith('pptx', function (qs, o) { return window.__qbCwPptx ? window.__qbCwPptx(qs.map(function (x) { return x.id; })) : QBX.buildPptx(qs, o); }); });
  $('.qb-pdf').addEventListener('click', function () {
    var qs = selected(); if (!qs.length || busy) return;
    var name = exportName(qs), o = opts(); o.title = name;
    setBusy(true); msg('Building PDF…');
    Promise.resolve(figReady).then(function () { return QBX.buildPdf(qs, o, function (i, n) { msg('Building PDF: page ' + i + ' of ' + n + '…'); }); })
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
