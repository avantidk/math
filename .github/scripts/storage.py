#!/usr/bin/env python3
"""Supabase Storage helper for the GitHub Actions (bucket "content"). The key is read from the environment and is only
ever sent in request headers: it is never printed and never put on a command line.

    python3 .github/scripts/storage.py upload <folder>   upload every file (replacing older copies), then delete files
                                                         in the bucket that are no longer in <folder>
    python3 .github/scripts/storage.py check  <path>     exit 0 only if <path> exists in the bucket
"""
import json, mimetypes, os, sys, time, urllib.error, urllib.parse, urllib.request

URL = os.environ['SUPABASE_URL'].rstrip('/')
KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
BUCKET = 'content'
mimetypes.add_type('text/javascript', '.js')
mimetypes.add_type('application/json', '.json')


def headers(extra=None):
    h = {'apikey': KEY}
    if not KEY.startswith('sb_secret_'):   # older service_role keys are JWTs and also go in Authorization
        h['Authorization'] = 'Bearer ' + KEY
    h.update(extra or {})
    return h


def call(method, path, body=None, extra=None, tries=4):
    for t in range(tries):
        req = urllib.request.Request(URL + path, data=body, method=method, headers=headers(extra))
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            if e.code < 500 or t == tries - 1:
                return e.code, e.read()
        except urllib.error.URLError:
            if t == tries - 1:
                raise
        time.sleep(3 * (t + 1))


def quote(p):
    return '/'.join(urllib.parse.quote(x) for x in p.split('/'))


def listing(prefix=''):
    """Every object name in the bucket under prefix (folders are walked)."""
    out, offset = [], 0
    while True:
        st, body = call('POST', f'/storage/v1/object/list/{BUCKET}', json.dumps({'prefix': prefix, 'limit': 1000, 'offset': offset}).encode(),
                        {'Content-Type': 'application/json'})
        if st != 200:
            sys.exit(f'Could not list the bucket (HTTP {st}): {body[:200]!r}')
        rows = json.loads(body)
        for r in rows:
            name = (prefix + '/' if prefix else '') + r['name']
            if r.get('id') is None:
                out += listing(name)
            else:
                out.append(name)
        if len(rows) < 1000:
            return out
        offset += 1000


def upload(folder):
    local, bad = [], 0
    for root, _, files in os.walk(folder):
        for f in sorted(files):
            full = os.path.join(root, f)
            rel = os.path.relpath(full, folder).replace(os.sep, '/')
            local.append(rel)
            ctype = mimetypes.guess_type(f)[0] or 'application/octet-stream'
            with open(full, 'rb') as fh:
                st, body = call('POST', f'/storage/v1/object/{BUCKET}/{quote(rel)}', fh.read(),
                                {'Content-Type': ctype, 'x-upsert': 'true', 'cache-control': 'no-cache'})
            if 200 <= st < 300:
                print('uploaded', rel)
            else:
                bad += 1
                print(f'::error::{rel} was not uploaded (HTTP {st}): {body[:300]!r}')
    if bad:
        sys.exit(f'{bad} file(s) failed; nothing was deleted.')
    stale = sorted(set(listing()) - set(local))
    for i in range(0, len(stale), 100):
        part = stale[i:i + 100]
        st, body = call('DELETE', f'/storage/v1/object/{BUCKET}', json.dumps({'prefixes': part}).encode(), {'Content-Type': 'application/json'})
        if st >= 300:
            sys.exit(f'Could not delete old files (HTTP {st}): {body[:200]!r}')
        for n in part:
            print('deleted (no longer in content/)', n)
    print(f'{len(local)} uploaded, {len(stale)} old file(s) deleted')


def check(path):
    st, _ = call('GET', f'/storage/v1/object/authenticated/{BUCKET}/{quote(path)}', None, {'Range': 'bytes=0-0'})
    if st not in (200, 206):
        sys.exit(f'{path} is not in the Supabase bucket "{BUCKET}" (HTTP {st}). Run the "Upload content to Supabase" workflow first.')
    print(path, 'is in the bucket')


if __name__ == '__main__':
    {'upload': upload, 'check': check}[sys.argv[1]](sys.argv[2])
