#!/usr/bin/env python3
"""
The string layer's inventory, and the `defaultValue` ratchet.

Same house style as `extract-api-contract.py`: the SOURCE is the truth, the docs
are generated from it, and `--check` fails a build when the two disagree. It
never edits a `copy.ts`; if the output is wrong, the copy is wrong.

    python scripts/i18n-inventory.py           # write docs/08-i18n/
    python scripts/i18n-inventory.py --check    # exit 1 if stale, or if the ratchet slipped

--------------------------------------------------------------------------------
WHY THIS EXISTS

Two numbers were load-bearing and neither was measured.

1. `src/i18n/dictionaries.ts` said "200 operator-facing strings" in a header that
   several plans were sized against. The real figure is over four thousand -- an
   order of magnitude out, which is the difference between a fortnight of
   translation and a quarter of it. A hand-typed count goes stale the first day
   somebody adds a screen, so this emits it and a test asserts the header agrees.

2. `t(key, { defaultValue: 'Trips' })` puts the English string in a `.tsx`, where
   `translate.ts` reaches it as a THIRD fallback the missing-key guard never
   sees (`translate.ts:98`). It renders correctly and it is invisible to every
   extractor, so a translation pass silently skips it and the screen stays
   English forever with nothing to show for it. There is no way to find these by
   running the app -- only by counting them.

THE RATCHET

`scripts/i18n-budget.json` holds a ceiling. `--check` fails when the measured
count EXCEEDS it, naming the files. The writer sets the ceiling to
`min(measured, ceiling)` and REFUSES to raise it, so the number can only ever go
down, and it cannot be quietly reset by re-running the generator. Deleting a
`defaultValue` means moving its string into the owning screen's `copy.ts` --
`src/screens/operations/dispatch/copy.ts` is the worked example.

WHAT COUNTS, AND WHAT DOES NOT

  counted      defaultValue: 'Dispatch captain'        a literal in a .tsx
  counted      defaultValue:                           a literal wrapped to the
                 'a long sentence...'                  next line
  counted      defaultValue: x ? 'On' : 'Off'          literals in an expression
  NOT counted  defaultValue: fallback                  `withFallback` forwarding
                                                       a value out of a real
                                                       Dictionary -- extractable,
                                                       so it is the fix, not the
                                                       defect

Comments and docblocks are skipped, so a file explaining the ban does not fail
the ban.
"""
from __future__ import annotations

import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
OUT_DIR = os.path.join(ROOT, 'docs', '08-i18n')
BUDGET_PATH = os.path.join(ROOT, 'scripts', 'i18n-budget.json')
DICTIONARIES = os.path.join(SRC, 'i18n', 'dictionaries.ts')

# `const NAME: Dictionary = {` and `export const NAME_EN = Object.freeze({`.
DECL = re.compile(
    r'^[ \t]*(?:export\s+)?const\s+([A-Za-z_][A-Za-z0-9_]*)\s*'
    r'(?::\s*Dictionary\s*)?=\s*(?:Object\.freeze\()?\{',
    re.M)
# A dictionary declared with no type annotation is only a dictionary if it is
# frozen copy; anything else that matched above is dropped by this filter.
NAMED_EN = re.compile(r'(?:_EN|^EN)$')
DEFAULT_VALUE = re.compile(r'\bdefaultValue\s*:')
HEADER_COUNT = re.compile(r'translation of ([\d,]+) operator-facing strings')


def read(path):
    with io.open(path, encoding='utf-8') as fh:
        return fh.read()


def rel(path):
    return os.path.relpath(path, ROOT).replace('\\', '/')


def walk(*, suffixes, skip_tests=True):
    for base, dirs, files in os.walk(SRC):
        dirs[:] = [d for d in dirs if d not in ('node_modules', '__snapshots__')]
        for name in sorted(files):
            if not name.endswith(suffixes):
                continue
            if skip_tests and ('.test.' in name or name.endswith('.d.ts')):
                continue
            yield os.path.join(base, name)


# ---------------------------------------------------------------- key scanning

def scan_object(src, start):
    """Walk the object literal opening at `src[start] == '{'`.

    Returns `(keys, spreads, end)` for DEPTH 1 only -- a nested object's keys
    belong to its parent entry, not to the dictionary. A character scanner
    rather than a line regex because `'a.b': 'it isn\\'t {n}'` and a `//` inside
    a string both defeat the regex, and both occur in this tree.
    """
    keys, spreads = [], []
    depth, i, n = 0, start, len(src)
    while i < n:
        ch = src[i]
        # The key test comes FIRST. A key opens with the same quote a value
        # does, so consuming quotes as strings before testing for a key finds
        # nothing at all -- which is exactly what the first version of this did.
        if depth == 1 and ch == "'":
            m = re.match(r"'([^'\\]*(?:\\.[^'\\]*)*)'\s*:", src[i:])
            if m:
                keys.append(m.group(1))
                i += m.end()
                continue
        if depth == 1 and ch == '.':
            m = re.match(r'\.\.\.([A-Za-z_][A-Za-z0-9_]*)', src[i:])
            if m:
                spreads.append(m.group(1))
                i += m.end()
                continue
        if ch in '\'"`':
            quote, i = ch, i + 1
            while i < n and src[i] != quote:
                i += 2 if src[i] == '\\' else 1
            i += 1
            continue
        if src.startswith('//', i):
            i = src.find('\n', i)
            if i < 0:
                break
            continue
        if src.startswith('/*', i):
            i = src.find('*/', i)
            if i < 0:
                break
            i += 2
            continue
        if ch == '{':
            depth += 1
            i += 1
            continue
        if ch == '}':
            depth -= 1
            i += 1
            if depth == 0:
                return keys, spreads, i
            continue
        i += 1
    return keys, spreads, n


def collect_dictionaries():
    """name -> {file, keys, spreads} for every dictionary literal in the tree."""
    found = {}
    for path in walk(suffixes=('.ts',)):
        src = read(path)
        for m in DECL.finditer(src):
            name = m.group(1)
            annotated = ': Dictionary' in m.group(0)
            if not annotated and not NAMED_EN.search(name):
                continue
            keys, spreads, _ = scan_object(src, src.index('{', m.end() - 1))
            found[name] = {'file': rel(path), 'keys': keys, 'spreads': spreads}
    return found


def resolve(name, dicts, seen=None):
    """Every key reachable from `name`, spreads followed transitively."""
    seen = seen if seen is not None else set()
    if name in seen or name not in dicts:
        return set()
    seen.add(name)
    out = set(dicts[name]['keys'])
    for spread in dicts[name]['spreads']:
        out |= resolve(spread, dicts, seen)
    return out


# ----------------------------------------------------------- defaultValue scan

def strip_comments(src):
    """Blank out comments, preserving offsets and newlines.

    String-aware, and it has to be: `'https://x'` contains a `//` and `'a/*b'`
    contains a `/*`. A version of this that was not lost half the tree to a
    single URL in a copy string and reported a `defaultValue` count less than
    half the real one.
    """
    out, i, n = [], 0, len(src)
    while i < n:
        ch = src[i]
        if ch in '\'"`':
            start = i
            i += 1
            while i < n and src[i] != ch:
                i += 2 if src[i] == '\\' else 1
            i = min(i + 1, n)
            out.append(src[start:i])
            continue
        if src.startswith('//', i):
            end = src.find('\n', i)
            end = n if end < 0 else end
            out.append(' ' * (end - i))
            i = end
            continue
        if src.startswith('/*', i):
            end = src.find('*/', i)
            end = n if end < 0 else end + 2
            out.append(''.join(c if c == '\n' else ' ' for c in src[i:end]))
            i = end
            continue
        out.append(ch)
        i += 1
    return ''.join(out)


def default_value_sites():
    sites = []
    for path in walk(suffixes=('.ts', '.tsx'), skip_tests=False):
        raw = read(path)
        if 'defaultValue' not in raw:
            continue
        code = strip_comments(raw)
        lines = code.splitlines()
        for m in DEFAULT_VALUE.finditer(code):
            line_no = code.count('\n', 0, m.start()) + 1
            tail = code[m.end():code.find('\n', m.end()) if code.find('\n', m.end()) > 0 else len(code)]
            rest = tail.strip()
            if rest == '':
                # The literal wrapped to the next line. Counted: it is still a
                # string typed into a component.
                counted = True
            else:
                counted = any(q in rest for q in ('\'', '"', '`'))
            sites.append({
                'file': rel(path), 'line': line_no, 'counted': counted,
                'text': raw.splitlines()[line_no - 1].strip()[:120] if line_no <= len(lines) else '',
            })
    return sites


# ------------------------------------------------------------------- fragments

FRAGMENT = re.compile(r'^\s*$|^[\s:;,.\-\u2014\u2013()]+$')


def fragments(dicts):
    """Templates that look like half a sentence -- AC-75's failure, statically.

    A value that is only punctuation, or that opens or closes on whitespace, is
    a fragment something else concatenates onto. In English it reads fine. In
    Arabic the two halves land on opposite sides of the run.
    """
    out = []
    for name, entry in sorted(dicts.items()):
        src = read(os.path.join(ROOT, entry['file'].replace('/', os.sep)))
        for key in entry['keys']:
            m = re.search(r"'%s'\s*:\s*'((?:[^'\\]|\\.)*)'" % re.escape(key), src)
            if not m:
                continue
            value = m.group(1)
            if value and (value != value.strip() or FRAGMENT.match(value)):
                out.append((entry['file'], key, value))
    return out


# ---------------------------------------------------------------------- render

def build():
    dicts = collect_dictionaries()
    en = resolve('EN', dicts)
    ar = resolve('AR', dicts)

    copy_files = {}
    for name, entry in dicts.items():
        if not entry['file'].endswith('copy.ts'):
            continue
        copy_files.setdefault(entry['file'], []).append(name)

    # Spread into `EN` BY NAME, not by key overlap: an unregistered screen still
    # shares `action.cancel` with the shell, and overlap would report it as
    # registered while none of its own copy is reachable.
    spread_into_en = set()

    def names_under(name, seen=None):
        seen = seen if seen is not None else set()
        if name in seen or name not in dicts:
            return
        seen.add(name)
        spread_into_en.add(name)
        for spread in dicts[name]['spreads']:
            names_under(spread, seen)

    names_under('EN')

    registered, unregistered = [], []
    for path, names in sorted(copy_files.items()):
        keys = set()
        for name in names:
            keys |= resolve(name, dicts)
        row = {'file': path, 'exports': sorted(names), 'keys': len(keys),
               'notInEN': len(keys - en)}
        (registered if any(n in spread_into_en for n in names) else unregistered).append(row)

    # Screen directories with a component and no copy.ts, theirs or an ancestor's.
    screens_root = os.path.join(SRC, 'screens')
    no_copy = []
    for base, dirs, files in os.walk(screens_root):
        dirs[:] = [d for d in dirs if d not in ('node_modules',)]
        if not any(f.endswith('Screen.tsx') for f in files):
            continue
        probe, has = base, False
        while probe.startswith(screens_root):
            if os.path.exists(os.path.join(probe, 'copy.ts')):
                has = True
                break
            probe = os.path.dirname(probe)
        if not has:
            no_copy.append({'dir': rel(base),
                            'screens': sorted(f for f in files if f.endswith('Screen.tsx'))})

    sites = default_value_sites()
    counted = [s for s in sites if s['counted']]
    by_file = {}
    for s in counted:
        by_file[s['file']] = by_file.get(s['file'], 0) + 1

    total_keys = len(set().union(*[resolve(n, dicts) for n in dicts]) if dicts else set())

    return {
        'totals': {
            'keys': total_keys,
            'en': len(en),
            'ar': len(ar),
            # A SET difference, not a subtraction. Arabic legitimately carries
            # keys English does not -- four extra CLDR plural categories per
            # family, and the two screen dictionaries EN has not registered --
            # so `len(en) - len(ar)` went negative the day Arabic landed and
            # reported -187 keys missing.
            'arMissing': len(en - ar),
            'arExtra': len(ar - en),
            'copyFiles': len(copy_files),
            'unregisteredKeys': sum(r['notInEN'] for r in unregistered),
            'pluralForms': len([k for k in en if '#' in k]),
            'defaultValue': len(counted),
            'defaultValueForwarded': len(sites) - len(counted),
        },
        'registered': sorted(registered, key=lambda r: -r['keys']),
        'unregistered': sorted(unregistered, key=lambda r: -r['keys']),
        'noCopyFile': no_copy,
        'defaultValueByFile': sorted(by_file.items(), key=lambda kv: -kv[1]),
        'fragments': [{'file': f, 'key': k, 'value': v} for f, k, v in fragments(dicts)],
    }


def render(data, budget):
    t = data['totals']
    out = [
        '<!-- GENERATED by scripts/i18n-inventory.py. Do not edit. -->',
        '# The key inventory', '',
        'Every operator-facing string in the product, counted from the source.',
        'Regenerate with `npm run i18n:keys`; `npm run i18n:check` fails a build when',
        'this file is stale or when the `defaultValue` ratchet slips.', '',
        '## The numbers', '',
        '| | |', '|---|---:|',
        '| **Translatable keys, all dictionaries** | **%d** |' % t['keys'],
        '| Reachable from `EN` (what the shell renders) | %d |' % t['en'],
        '| Keys in `AR` | %d |' % t['ar'],
        '| **Keys Arabic is missing** | **%d** |' % t['arMissing'],
        '| Keys in `AR` and not in `EN` (plural forms, unregistered screens) | %d |'
        % t['arExtra'],
        '| Plural forms (`key#category`) inside `EN` | %d |' % t['pluralForms'],
        '| `copy.ts` files | %d |' % t['copyFiles'],
        '| Keys in a `copy.ts` the shell has NOT registered | %d |' % t['unregisteredKeys'],
        '| **`defaultValue` call sites (the ratchet)** | **%d** |' % t['defaultValue'],
        '| `defaultValue` forwarding a Dictionary (exempt) | %d |' % t['defaultValueForwarded'],
        '',
        '`AR` is **complete**: every key reachable from `EN` resolves in Arabic, so no',
        'screen mixes the two languages. `arExtra` is not drift -- Arabic declares six CLDR',
        'plural categories against English\'s two, and it also answers the two screen',
        'dictionaries `EN` has not registered, which reach them through `withFallback`.', '',
        '## The `defaultValue` ratchet', '',
        'Ceiling **%d**, measured **%d**. `translate.ts:98` resolves `defaultValue` as a'
        % (budget, t['defaultValue']),
        'third fallback the missing-key guard never sees, so each of these is a string no',
        'extractor can find. The ceiling only ever falls: `--check` fails when the count',
        'exceeds it, and the writer refuses to raise it.', '',
    ]
    if data['defaultValueByFile']:
        out += ['| File | Sites |', '|---|---:|']
        out += ['| `%s` | %d |' % (f, n) for f, n in data['defaultValueByFile']]
        out.append('')
    else:
        out += ['None left. Add the lint rule and delete this section.', '']

    out += ['## Keys per `copy.ts`', '', '| File | Exports | Keys |', '|---|---|---:|']
    out += ['| `%s` | %s | %d |' % (r['file'], ', '.join('`%s`' % e for e in r['exports']), r['keys'])
            for r in data['registered']]
    out.append('')

    if data['unregistered']:
        out += ['### Not registered in `src/i18n/dictionaries.ts`', '',
                'These resolve through `withFallback` (`screens/operations/localCopy.ts`)',
                'rather than through the shell dictionary. They are keyed and extractable --',
                'this is a wiring gap, not a translation one -- but a translator handed only',
                '`EN` would not see them.', '',
                '| File | Exports | Keys | Not in `EN` |', '|---|---|---:|---:|']
        out += ['| `%s` | %s | %d | %d |' % (r['file'], ', '.join('`%s`' % e for e in r['exports']),
                                             r['keys'], r['notInEN'])
                for r in data['unregistered']]
        out.append('')

    out += ['## Screens with no `copy.ts`', '']
    if data['noCopyFile']:
        out += ['A screen with no copy file of its own or an ancestor\'s has its strings',
                'somewhere else -- the shell dictionary, or a `defaultValue`.', '',
                '| Directory | Screens |', '|---|---|']
        out += ['| `%s` | %s |' % (r['dir'], ', '.join('`%s`' % s for s in r['screens']))
                for r in data['noCopyFile']]
    else:
        out.append('None -- every screen directory reaches a `copy.ts`.')
    out.append('')

    out += ['## Fragment templates', '',
            'A value that is only punctuation, or that opens or closes on whitespace, is',
            'half a sentence something else completes -- **AC-75**. It reads correctly in',
            'English and puts the two halves on opposite sides of the run in Arabic.', '']
    if data['fragments']:
        out += ['| File | Key | Value |', '|---|---|---|']
        out += ['| `%s` | `%s` | `%s` |' % (f['file'], f['key'], f['value'].replace('|', '\\|'))
                for f in data['fragments']]
    else:
        out.append('None.')
    out.append('')
    return '\n'.join(out) + '\n'


def header_number(en_count):
    """The one sentence in `dictionaries.ts` that used to say "200".

    Returns `(current_source, wanted_source)`. Nothing else in that file is
    touched: this owns a NUMBER inside a docblock, not the module.
    """
    src = read(DICTIONARIES)
    want = HEADER_COUNT.sub(
        lambda m: m.group(0).replace(m.group(1), '{:,}'.format(en_count)), src, count=1)
    return src, want


def colliding_keys():
    """Keys defined in more than one dictionary with DIFFERENT values.

    Screen dictionaries are spread into `EN`, so the last spread wins and a
    collision silently relabels whichever screen lost the race. It is invisible
    until the losing dictionary is registered, which is exactly when nobody is
    looking for it.

    Found for real: `action.saving` carried `Saving...`, `Assigning` and
    `Reassigning...` across three dictionaries and was called from three modals
    for three different verbs. A key that means four things is not a key.
    """
    import collections
    paths = [p for p in walk(suffixes=('.ts',)) if p.endswith('copy.ts')]
    paths.append(DICTIONARIES)
    vals = collections.defaultdict(dict)
    for path in paths:
        src = read(path)
        for k, v in re.findall(r"^\s*'([A-Za-z0-9._]+)'\s*:\s*'([^']*)'", src, re.M):
            vals[k][rel(path)] = v
    return {k: d for k, d in sorted(vals.items()) if len(set(d.values())) > 1}


def main():
    check = '--check' in sys.argv
    data = build()
    measured = data['totals']['defaultValue']
    header_is, header_want = header_number(data['totals']['en'])

    budget = json.loads(read(BUDGET_PATH))['defaultValue'] if os.path.exists(BUDGET_PATH) else measured

    md = render(data, budget)
    js = json.dumps(data, indent=2, ensure_ascii=False) + '\n'
    md_path = os.path.join(OUT_DIR, 'KEYS.md')
    js_path = os.path.join(OUT_DIR, 'keys.json')

    if check:
        failed = False
        if measured > budget:
            print('defaultValue ratchet BROKE: %d sites against a ceiling of %d.'
                  % (measured, budget))
            print('Each one is a string an extractor cannot see (translate.ts:98).')
            print('Move it to a key in the owning copy.ts -- '
                  'src/screens/operations/dispatch/copy.ts is the worked example.')
            for f, n in data['defaultValueByFile']:
                print('  %-70s %d' % (f, n))
            failed = True
        elif measured < budget:
            print('defaultValue fell from %d to %d. Run `npm run i18n:keys` and commit '
                  'so the ceiling follows it down.' % (budget, measured))
            failed = True
        stale = [p for p, want in ((md_path, md), (js_path, js))
                 if not os.path.exists(p) or read(p) != want]
        for p in stale:
            print('stale: %s -- run `npm run i18n:keys`' % rel(p))
        if stale:
            failed = True
        collisions = colliding_keys()
        if collisions:
            print('%d key(s) defined in more than one dictionary with DIFFERENT values.'
                  % len(collisions))
            print('The last spread into EN wins, so this silently relabels a screen.')
            for k, d in collisions.items():
                print('  %s' % k)
                for f, v in sorted(d.items()):
                    print('      %-56s %r' % (f, v))
            failed = True
        if header_is != header_want:
            print('stale: %s -- the header count is not %d. Run `npm run i18n:keys`.'
                  % (rel(DICTIONARIES), data['totals']['en']))
            failed = True
        if failed:
            return 1
        print('key inventory is current: %d keys, %d in EN, %d defaultValue sites at ceiling %d'
              % (data['totals']['keys'], data['totals']['en'], measured, budget))
        return 0

    if not os.path.isdir(OUT_DIR):
        os.makedirs(OUT_DIR)
    # The ratchet only turns one way, including here.
    ceiling = min(measured, budget)
    if measured > budget:
        print('REFUSING to write: %d defaultValue sites against a ceiling of %d.'
              % (measured, budget))
        print('The ceiling never rises. Move the new strings into a copy.ts.')
        return 1
    io.open(BUDGET_PATH, 'w', encoding='utf-8', newline='\n').write(
        json.dumps({
            '_': 'The defaultValue ceiling. Written by scripts/i18n-inventory.py, which '
                 'refuses to raise it. See docs/08-i18n/KEYS.md.',
            'defaultValue': ceiling,
        }, indent=2) + '\n')
    md = render(data, ceiling)
    for p, want in ((md_path, md), (js_path, js)):
        io.open(p, 'w', encoding='utf-8', newline='\n').write(want)
    if header_is != header_want:
        io.open(DICTIONARIES, 'w', encoding='utf-8', newline='\n').write(header_want)
        print('  rewrote the count in %s' % rel(DICTIONARIES))
    print('wrote %d keys across %d copy.ts files (%d reachable from EN, %d unregistered)'
          % (data['totals']['keys'], data['totals']['copyFiles'],
             data['totals']['en'], data['totals']['unregisteredKeys']))
    print('  ar missing        %d (extra in ar: %d)'
          % (data['totals']['arMissing'], data['totals']['arExtra']))
    print('  defaultValue      %d (ceiling now %d)' % (measured, ceiling))
    print('  fragments         %d' % len(data['fragments']))
    print('  screens no copy   %d' % len(data['noCopyFile']))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
