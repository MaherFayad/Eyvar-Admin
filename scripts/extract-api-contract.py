#!/usr/bin/env python3
"""
Extract the API contract from the annotated clients in `src/data/clients/`.

The clients are the source of truth. Every exported operation carries a docblock:

    /**
     * GET /api/v1/drivers
     *   params: q, status, page, pageSize, sort, filter
     *   -> Paginated<Driver>
     *   404 when the id does not exist
     *
     * <prose the backend engineer needs>
     */
    export async function listDrivers(...)

This reads those blocks and emits ONE index a backend engineer reads instead of
47 files. It never edits a client: if the output is wrong, the docblock is wrong.

    python scripts/extract-api-contract.py           # write docs/07-api/
    python scripts/extract-api-contract.py --check   # exit 1 if stale or invalid
"""
from __future__ import annotations

import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLIENTS = os.path.join(ROOT, 'src', 'data', 'clients')
OUT_DIR = os.path.join(ROOT, 'docs', '07-api')
SKIP = ('index.ts', 'http.ts')

VERB = r'(?:GET|POST|PATCH|PUT|DELETE)'
BLOCK = re.compile(r'/\*\*(.*?)\*/\s*export\s+(?:async\s+)?(?:function|const)\s+(\w+)', re.S)
ROUTE = re.compile(r'^\s*(' + VERB + r')\s+(/\S*)', re.M)
# A second route on the same line, after a separator: `POST /a . PATCH /a/:id`.
ALT_ROUTE = re.compile(r'\S\s+(' + VERB + r')\s+(/\S*)')
RETURNS = re.compile(r'^\s*->\s*(.+?)\s*$', re.M)
PARAMS = re.compile(r'^\s*params:\s*(.+?)\s*$', re.M)
BODY = re.compile(r'^\s*body:\s*(.+?)\s*$', re.M)
STATUS = re.compile(r'^\s*(\d{3})\s+(.+?)\s*$', re.M)
OPS = re.compile(r'^\s*\w+:\s*\'([\w.]+)\',', re.M)


def strip_stars(block):
    return '\n'.join(re.sub(r'^\s*\*\s?', '', ln).rstrip() for ln in block.splitlines())


def read(path):
    with io.open(path, encoding='utf-8') as fh:
        return fh.read()


def first(rx, text):
    m = rx.search(text)
    return m.group(1) if m else None


def collect():
    endpoints, problems = [], []
    names = sorted(f for f in os.listdir(CLIENTS)
                   if f.endswith('.ts') and not f.endswith('.test.ts') and f not in SKIP)
    for name in names:
        src = read(os.path.join(CLIENTS, name))
        if OPS.search(src) and 'registerOperations(' not in src:
            problems.append((name, 'unregistered',
                             'declares operation ids but never calls registerOperations(), so '
                             '?mockFail= and knownOperations() cannot see them'))
        for raw, fn in BLOCK.findall(src):
            text = strip_stars(raw)
            # One block may document several routes on the same line, separated
            # by a middot: `POST /api/v1/alerts . PATCH /api/v1/alerts/:id`.
            # They share a body, a return type and a set of statuses.
            routes = [(m.group(1), m.group(2)) for m in ROUTE.finditer(text)]
            routes += [(m.group(1), m.group(2)) for m in ALT_ROUTE.finditer(text)]
            if not routes:
                continue
            ret = first(RETURNS, text)
            for method, path in dict.fromkeys(routes):
                if '//' in path:
                    problems.append((name, 'malformed-path',
                                     'double slash in `%s` (%s)' % (path, fn)))
                if not ret:
                    problems.append((name, 'no-return',
                                     '%s `%s` has no return annotation (%s)' % (method, path, fn)))
                endpoints.append({
                    'method': method,
                    'path': path,
                    'client': 'src/data/clients/' + name,
                    'function': fn,
                    'params': first(PARAMS, text),
                    'body': first(BODY, text),
                    'returns': ret,
                    'statuses': [{'code': c, 'when': w} for c, w in STATUS.findall(text)],
                })
    endpoints.sort(key=lambda e: (e['path'], e['method']))
    return endpoints, problems


def render(endpoints, problems):
    by_client = {}
    for e in endpoints:
        by_client.setdefault(e['client'], []).append(e)
    out = [
        '# Endpoint index',
        '',
        '**Generated. Do not edit.** Regenerate with',
        '`python scripts/extract-api-contract.py`.',
        '',
        'The source of truth is the docblock above each exported function in',
        '`src/data/clients/`. If a row here is wrong, the docblock is wrong: fix the',
        'client and regenerate. Conventions, envelopes, auth and error shapes live in',
        '[CONTRACT.md](CONTRACT.md); this file is only *what exists*.',
        '',
        '**%d endpoints across %d client modules.**' % (len(endpoints), len(by_client)),
        '',
    ]
    if problems:
        buckets = {}
        for name, kind, detail in problems:
            buckets.setdefault(kind, []).append((name, detail))
        out += ['## Problems', '',
                'Each one is a question the backend engineer would otherwise have to ask.',
                'Fix it in the client, then regenerate.', '']
        for kind in sorted(buckets):
            rows = sorted(buckets[kind])
            out += ['### `%s` (%d)' % (kind, len(rows)), '']
            if kind == 'unregistered':
                out += ['| File |', '|---|'] + ['| `%s` |' % n for n, _ in rows]
            else:
                out += ['| File | Detail |', '|---|---|']
                out += ['| `%s` | %s |' % (n, d) for n, d in rows]
            out.append('')
    for client in sorted(by_client):
        out += ['## `%s`' % client, '',
                '| Method | Path | Returns | Request | Function |',
                '|---|---|---|---|---|']
        for e in by_client[client]:
            req = e['body'] or e['params'] or ''
            req_cell = ('`%s`' % req.replace('|', '\\|')) if req else '-'
            out.append('| %s | `%s` | `%s` | %s | `%s()` |' % (
                e['method'], e['path'], e['returns'] or '**missing**', req_cell, e['function']))
        out.append('')
    return '\n'.join(out) + '\n'


def main():
    check = '--check' in sys.argv
    endpoints, problems = collect()
    md = render(endpoints, problems)
    js = json.dumps({'endpoints': endpoints,
                     'problems': [{'file': f, 'kind': k, 'detail': d} for f, k, d in problems]},
                    indent=2, ensure_ascii=False) + '\n'
    md_path = os.path.join(OUT_DIR, 'ENDPOINTS.md')
    js_path = os.path.join(OUT_DIR, 'endpoints.json')
    if check:
        stale = [p for p, want in ((md_path, md), (js_path, js))
                 if not os.path.exists(p) or read(p) != want]
        for p in stale:
            print('stale: %s' % os.path.relpath(p, ROOT).replace('\\', '/'))
        for f, k, d in problems:
            print('problem [%s]: %s - %s' % (k, f, d))
        if stale or problems:
            return 1
        print('contract is current: %d endpoints, no problems' % len(endpoints))
        return 0
    if not os.path.isdir(OUT_DIR):
        os.makedirs(OUT_DIR)
    for p, want in ((md_path, md), (js_path, js)):
        io.open(p, 'w', encoding='utf-8', newline='\n').write(want)
    print('wrote %d endpoints from %d clients, %d problems'
          % (len(endpoints), len(set(e['client'] for e in endpoints)), len(problems)))
    kinds = {}
    for _, k, _ in problems:
        kinds[k] = kinds.get(k, 0) + 1
    for k in sorted(kinds):
        print('  %-16s %d' % (k, kinds[k]))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
