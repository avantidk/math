/* Chapter Weightage (public page): re-draws the bars when the exam, period or sort is changed. Reads only the counts that are already in the page. */
(function () {
  'use strict';
  var d = document, list = d.querySelector('[data-wc-list]'); if (!list) return;
  var rows = Array.prototype.slice.call(list.querySelectorAll('.wc-row'));
  var data = rows.map(function (r) { return { el: r, main: JSON.parse(r.getAttribute('data-main') || '{}'), adv: JSON.parse(r.getAttribute('data-adv') || '{}'), syl: +r.getAttribute('data-syl') }; });
  var maxY = 0; data.forEach(function (r) { [r.main, r.adv].forEach(function (o) { Object.keys(o).forEach(function (y) { if (+y > maxY) maxY = +y; }); }); });
  var st = { exam: 'all', yrs: 'all', sort: 'count' };
  function sum(o, from) { var n = 0; Object.keys(o).forEach(function (y) { if (+y >= from) n += o[y]; }); return n; }
  function draw() {
    var from = st.yrs === 'all' ? 0 : st.yrs === '2013' ? 2013 : maxY - Number(st.yrs) + 1;
    data.forEach(function (r) { r.m = st.exam === 'adv' ? 0 : sum(r.main, from); r.a = st.exam === 'main' ? 0 : sum(r.adv, from); r.n = r.m + r.a; });
    var byCount = data.slice().sort(function (a, b) { return b.n - a.n || a.syl - b.syl; });
    byCount.forEach(function (r, i) { r.rank = i + 1; });
    var total = byCount.reduce(function (t, r) { return t + r.n; }, 0), top = Math.max(byCount[0].n, 1), third = Math.ceil(byCount.length / 3);
    var order = st.sort === 'count' ? byCount : data.slice().sort(function (a, b) { return a.syl - b.syl; });
    order.forEach(function (r) {
      var band = r.rank <= third ? 'hi' : (r.rank <= 2 * third ? 'mid' : 'lo');
      r.el.querySelector('.wc-rk').textContent = st.sort === 'count' ? '#' + r.rank : '';
      var seg = r.el.querySelector('.wc-seg'); seg.className = 'wc-seg ' + band; seg.style.width = (r.n / top * 100) + '%';
      r.el.querySelector('.wc-val b').textContent = r.n;
      r.el.querySelector('.wc-val span').textContent = (total ? (r.n / total * 100).toFixed(1) : '0.0') + '% of all';
      list.appendChild(r.el);
    });
    var top5 = byCount.slice(0, 5).reduce(function (t, r) { return t + r.n; }, 0);
    var q = function (s) { return d.querySelector(s); };
    q('[data-wc-total]').textContent = total.toLocaleString('en-US');
    q('[data-wc-top]').textContent = byCount[0].el.querySelector('.wc-lbl a, .wc-lbl').childNodes[0].textContent;
    q('[data-wc-topn]').textContent = 'most asked chapter (' + byCount[0].n + ' questions)';
    q('[data-wc-top5]').textContent = (total ? Math.round(top5 / total * 100) : 0) + '%';
    var ex = st.exam === 'main' ? 'JEE Main (with AIEEE)' : st.exam === 'adv' ? 'JEE Advanced (with IIT-JEE)' : 'JEE Main and JEE Advanced';
    var yl = st.yrs === 'all' ? 'all years' : st.yrs === '2013' ? '2013 onwards, the current JEE Main and JEE Advanced pattern, ' + from + '–' + maxY : 'the last ' + st.yrs + ' years, ' + from + '–' + maxY;
    q('[data-wc-note]').textContent = 'Showing ' + ex + ' questions from ' + yl + '. A longer bar means more questions came from that chapter. Chapters whose old papers are still being added may show fewer questions.';
  }
  Array.prototype.forEach.call(d.querySelectorAll('.wc-chip'), function (b) {
    b.addEventListener('click', function () {
      st[b.getAttribute('data-g')] = b.getAttribute('data-v');
      Array.prototype.forEach.call(d.querySelectorAll('.wc-chip[data-g="' + b.getAttribute('data-g') + '"]'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      draw();
    });
  });
})();
