#!/usr/bin/env python3
"""Concatenate src_modules/*.js in order, inline into the HTML template, write poker-tracker.html."""
import re, sys, glob, os

MODULE_ORDER = ['01-config','02-data-ranges','03-parse','04-eval','05-checks','06-util',
                '07-render-core','08-render-hands','09-render-analysis','10-render-grid','11-boot']

def build(modules_dir='src_modules', template='tracker_template.html', out='poker-tracker.html'):
    bundle = []
    for m in MODULE_ORDER:
        p = os.path.join(modules_dir, m+'.js')
        if not os.path.exists(p):
            sys.exit(f'MISSING MODULE: {p}')
        bundle.append(open(p).read())
    js = '\n'.join(bundle)
    tmpl = open(template).read()
    # Replace the marker between script tags
    html = re.sub(r'<script>.*?</script>', lambda m: '<script>\n'+js+'\n</script>', tmpl, flags=re.S)
    open(out,'w').write(html)
    # node --check on extracted script
    import subprocess
    sm = re.search(r'<script>(.*?)</script>', html, re.S)
    open('/tmp/_chk.js','w').write(sm.group(1))
    r = subprocess.run(['node','--check','/tmp/_chk.js'], capture_output=True, text=True)
    if r.returncode!=0:
        sys.exit('SYNTAX ERROR:\n'+r.stderr)
    print(f'Built {out}: {len(html)} chars, {len(js)} JS chars, syntax OK')

if __name__=='__main__':
    build()
