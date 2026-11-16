# Draws the Unkganit round icon and the Hindi logo lockup (needs: pip install uharfbuzz fonttools, and Noto Sans Devanagari 400/600 TTFs saved as noto400.ttf / noto600.ttf). Output: mark.svg, lockup-dark.svg, lockup-light.svg
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
class F:
    def __init__(s,fn):
        s.hb=hb.Font(hb.Face(hb.Blob.from_file_path(fn))); s.tt=TTFont(fn); s.gs=s.tt.getGlyphSet(); s.u=s.tt['head'].unitsPerEm
    def path(s,text,size,x0,base,track=0):
        buf=hb.Buffer(); buf.add_str(text); buf.guess_segment_properties(); hb.shape(s.hb,buf,{})
        sc=size/s.u; x=0; d=[]
        for i,p in zip(buf.glyph_infos,buf.glyph_positions):
            pen=SVGPathPen(s.gs); s.gs[s.tt.getGlyphName(i.codepoint)].draw(TransformPen(pen,(sc,0,0,-sc,x0+(x+p.x_offset)*sc+track*len(d),base-p.y_offset*sc))); d.append(pen.getCommands()); x+=p.x_advance
        return ' '.join(d), x*sc+track*len(d)
light=F('noto400.ttf'); semi=F('noto600.ttf')

MARK='''<g id="mark">
<defs>
<linearGradient id="mbg" x1="0.15" y1="0" x2="0.85" y2="1"><stop offset="0" stop-color="#244aa5"/><stop offset="1" stop-color="#0b1a42"/></linearGradient>
<linearGradient id="mgold" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#f29a00"/><stop offset="1" stop-color="#ffd84d"/></linearGradient>
<clipPath id="mclip"><circle cx="256" cy="256" r="248"/></clipPath>
</defs>
<circle cx="256" cy="256" r="248" fill="url(#mbg)"/>
<g clip-path="url(#mclip)">
<!-- rays of knowledge: gold fan rising behind the book -->
<g fill="url(#mgold)" opacity=".95">
<path d="M256 300 L120 92 A250 250 0 0 1 176 62 Z"/>
<path d="M256 300 L196 52 A250 250 0 0 1 256 46 Z" opacity=".0"/>
</g>
</g>
</g>'''
# simpler, cleaner mark built explicitly
mark='''<defs>
<linearGradient id="mbg" x1="0.15" y1="0" x2="0.85" y2="1"><stop offset="0" stop-color="#2a56b8"/><stop offset="1" stop-color="#0a173f"/></linearGradient>
<linearGradient id="mgold" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#f29a00"/><stop offset="1" stop-color="#ffd84d"/></linearGradient>
</defs>
<circle cx="256" cy="256" r="250" fill="url(#mbg)"/>
<!-- open book: two flat pages meeting at the spine -->
<path d="M250 394 C206 352 140 344 92 354 L92 232 C140 222 206 230 250 270 Z" fill="#ffffff"/>
<path d="M262 394 C306 352 372 344 420 354 L420 232 C372 222 306 230 262 270 Z" fill="#c4d6ff"/>
<!-- growth arrow rising out of the book -->
<path d="M142 236 L220 176 L276 214 L370 122" fill="none" stroke="url(#mgold)" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M320 114 L382 108 L376 170 Z" fill="url(#mgold)" stroke="url(#mgold)" stroke-width="14" stroke-linejoin="round"/>
'''
open('mark.svg','w').write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">'+mark+'</svg>')

def lockup(text_fill, cap_fill, fn):
    # mark 0..512 scaled to 150 tall at left; text to the right
    s=0.32; H=190
    ank,aw=light.path('अंक-IT',116,0,0)
    cap,cw=semi.path('MATHEMATICS DASHBOARD',27,0,0,track=4.6)
    ox=512*s+34
    W=ox+max(aw,cw)+10
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H}" width="{W:.0f}" height="{H}">
<g transform="translate(6,{(H-512*s)/2:.1f}) scale({s})">{mark}</g>
<path transform="translate({ox:.1f},112)" d="{ank}" fill="{text_fill}"/>
<path transform="translate({ox+3:.1f},156)" d="{cap}" fill="{cap_fill}"/>
</svg>''', W, H
for name,tf,cf in [('lockup-dark.svg','#ffffff','#ffffff'),('lockup-light.svg','#0b1a42','#0b1a42')]:
    svg,W,H=lockup(tf,cf,None); open(name,'w').write(svg)
print(W,H)
