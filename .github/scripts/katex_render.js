// Renders text with \( \) and \[ \] maths into static HTML using the KaTeX in vendor/ (no CDN).
// Input (stdin): JSON list of strings.  Output (stdout): JSON list of HTML strings (same order).
const katex = require('../../vendor/katex-0.16.9.min.js');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const re = /\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;
function render(t) {
  let out = '', last = 0, m;
  const text = x => esc(x).replace(/\n/g, '<br>');
  while ((m = re.exec(t))) {
    out += text(t.slice(last, m.index));
    const disp = m[2] !== undefined;
    try { out += katex.renderToString((m[1] ?? m[2]).trim(), { displayMode: disp, throwOnError: false, output: 'htmlAndMathml', strict: 'ignore', trust: false }); }
    catch (e) { out += esc(m[0]); }
    last = m.index + m[0].length;
  }
  return out + text(t.slice(last));
}
let buf = '';
process.stdin.on('data', d => buf += d).on('end', () => process.stdout.write(JSON.stringify(JSON.parse(buf).map(render))));
