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

1. `src/i18n/dictionaries.ts` once said "200 operator-facing strings" in a
   header that plans were sized against; the real figure was over four
   thousand. No source comment states the count any more. This emits it into
   `docs/08-i18n/KEYS.md`, which is the only place it lives.

2. `t(key, { defaultValue: 'Trips' })` puts the English string in a `.tsx`, where
   `translate.ts` reaches it as a THIRD fallback the missing-key guard never
   sees (`translate.ts:98`). It renders correctly and it is invisible to every
   extractor, so a translation pass silently skips it and the screen stays
   English forever with nothing to show for it. There is no way to find these by
   running the app -- only by counting them.

THE RATCHETS

`scripts/i18n-budget.json` holds a ceiling per measure. `--check` fails when a
measured count EXCEEDS its ceiling, naming the offenders. The writer sets each
ceiling to `min(measured, ceiling)` and REFUSES to raise it, so a number can
only ever go down, and it cannot be quietly reset by re-running the generator.

  defaultValue  literals no extractor can see. Deleting one means moving its
                string into the owning screen's `copy.ts` --
                `src/screens/operations/dispatch/copy.ts` is the worked example.
  emDashEn      dictionary values carrying U+2014, English (X14). No em dash in
  emDashAr      a string an operator reads: `·` separates a qualifier, two
                clauses become two sentences, a numeric range keeps its en dash.
  overBudget    English values longer than the X18 word budget for the class
                their key name puts them in. See WORD_BUDGET below.

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

    Returns `(keys, spreads, values, end)` for DEPTH 1 only -- a nested object's
    keys belong to its parent entry, not to the dictionary. A character scanner
    rather than a line regex because `'a.b': 'it isn\\'t {n}'` and a `//` inside
    a string both defeat the regex, and both occur in this tree.

    `values` maps a key to its string literal where the value IS one. A value
    that is an expression, a template literal or a nested object is absent, so
    the em-dash and word-budget passes below measure only what an operator
    actually reads.
    """
    keys, spreads, values = [], [], {}
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
                v = re.match(r"\s*'([^'\\]*(?:\\.[^'\\]*)*)'\s*[,}]", src[i:])
                if v:
                    values[m.group(1)] = v.group(1)
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
                return keys, spreads, values, i
            continue
        i += 1
    return keys, spreads, values, n


def collect_dictionaries():
    """name -> {file, keys, spreads, values} for every dictionary in the tree."""
    found = {}
    for path in walk(suffixes=('.ts',)):
        src = read(path)
        for m in DECL.finditer(src):
            name = m.group(1)
            annotated = ': Dictionary' in m.group(0)
            if not annotated and not NAMED_EN.search(name):
                continue
            keys, spreads, values, _ = scan_object(src, src.index('{', m.end() - 1))
            found[name] = {'file': rel(path), 'keys': keys, 'spreads': spreads,
                           'values': values}
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


# --------------------------------------------------- em dashes and word budget

EM_DASH = '—'


def dictionary_values(dicts):
    """(file, lang, key, value) for every dictionary entry with a string value."""
    out = []
    for name in sorted(dicts):
        entry = dicts[name]
        lang = 'ar' if entry['file'].startswith('src/i18n/ar/') else 'en'
        for key, value in entry['values'].items():
            out.append((entry['file'], lang, key, value))
    return out


def em_dash_values(values):
    """Values carrying U+2014 -- X14. Never an em dash in a string an operator
    reads: `·` separates a qualifier, two clauses become two sentences, and a
    numeric range keeps its en dash."""
    return [{'file': f, 'lang': lang, 'key': k, 'value': v}
            for f, lang, k, v in values if EM_DASH in v]


# X18's budget, in words, keyed by the class a key's NAME puts it in. The
# classification below is read off how keys are named in the `copy.ts` files
# today, not off an ideal scheme:
#
#   toast     `…toast.…`                        every undo and outcome toast
#   banner    `…banner.…`                       title and body both
#   empty     `…empty.…heading|title` -> title, `…empty.…body` and a bare
#             `…empty` or `…empty.<variant>` -> body, `…empty.action` -> button
#   tooltip   `…hint` / `…hint.…` / `…tooltip…`  what InfoHint opens
#   meta      `…meta` / `…meta.…`               the PageHeader and band meta line
#   badge     `…status.<enum>`                  the only badge naming in the tree
#   button    `…action.<verb>` (one segment)    a label; `action.x.blocked.one`
#             is a refusal sentence, not a button, so it is left unclassified
#   title     `…title` / `…heading` / `route.…` / `nav.…`   a page or card title
#
# `cell second line` from the X18 table has no naming convention yet, so it is
# not classified; give those keys a `.sub` tail and add the class here.
WORD_BUDGET = {
    'title': 4,
    'button': 3,
    'badge': 2,
    'meta': 6,
    'empty title': 5,
    'empty body': 12,
    'banner': 20,
    'toast': 8,
    'tooltip': 25,
}


def classify(key, value=''):
    """The X18 class a key's name puts it in, or None. First match wins.

    A value ending in a full stop or a question mark is a SENTENCE -- a §11.2
    refusal under `action.`, not a label -- and X18 gives it no budget.
    """
    base = key.split('#')[0]
    tail = base.rsplit('.', 1)[-1]
    if re.search(r'(^|\.)toast(\.|$)', base):
        return 'toast'
    if re.search(r'(^|\.)banner(\.|$)', base):
        return 'banner'
    if re.search(r'(^|\.)empty(\.|$)', base):
        if tail in ('heading', 'title'):
            return 'empty title'
        if tail == 'action':
            return 'button'
        return 'empty body'
    if re.search(r'(^|\.)(hint|tooltip)(\.|$)', base):
        return 'tooltip'
    if re.search(r'(^|\.)meta(\.|$)', base):
        return 'meta'
    if re.search(r'(^|\.)(status|badge)\.[A-Za-z0-9]+$', base) and tail != 'label':
        return 'badge'
    if re.search(r'(^|\.)action\.[A-Za-z0-9]+$', base) or tail == 'action':
        return None if value.rstrip().endswith(('.', '?', '!')) else 'button'
    if tail in ('title', 'heading') or re.match(r'^(route|nav)\.', base):
        return 'title'
    return None


def over_budget(values):
    """English values longer than their class allows. A placeholder counts as
    one word, because it renders as one thing the operator reads."""
    out = []
    for f, lang, key, value in values:
        if lang != 'en':
            continue
        cls = classify(key, value)
        if cls is None:
            continue
        words = len(value.split())
        if words > WORD_BUDGET[cls]:
            out.append({'file': f, 'key': key, 'class': cls, 'words': words,
                        'budget': WORD_BUDGET[cls], 'value': value})
    return sorted(out, key=lambda r: (r['class'], -r['words'], r['key']))


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

    values = dictionary_values(dicts)
    dashes = em_dash_values(values)
    long_values = over_budget(values)
    by_class = {}
    for r in long_values:
        by_class[r['class']] = by_class.get(r['class'], 0) + 1

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
            'emDashEn': len([d for d in dashes if d['lang'] == 'en']),
            'emDashAr': len([d for d in dashes if d['lang'] == 'ar']),
            'overBudget': len(long_values),
        },
        'registered': sorted(registered, key=lambda r: -r['keys']),
        'unregistered': sorted(unregistered, key=lambda r: -r['keys']),
        'noCopyFile': no_copy,
        'defaultValueByFile': sorted(by_file.items(), key=lambda kv: -kv[1]),
        'fragments': [{'file': f, 'key': k, 'value': v} for f, k, v in fragments(dicts)],
        'emDash': dashes,
        'overBudget': long_values,
        'overBudgetByClass': sorted(by_class.items(), key=lambda kv: -kv[1]),
    }


def render(data, budgets):
    t = data['totals']
    budget = budgets['defaultValue']
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
        '| **English values carrying an em dash (the ratchet)** | **%d** |' % t['emDashEn'],
        '| **Arabic values carrying an em dash (the ratchet)** | **%d** |' % t['emDashAr'],
        '| **English values over their word budget (the ratchet)** | **%d** |' % t['overBudget'],
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

    out += ['## The em-dash ratchet', '',
            'Ceilings **%d** English and **%d** Arabic, measured **%d** and **%d**. **X14**:'
            % (budgets['emDashEn'], budgets['emDashAr'], t['emDashEn'], t['emDashAr']),
            'no em dash in a string an operator reads. `·` separates a qualifier, two clauses',
            'become two sentences, and a numeric range keeps the en dash in *Showing 1-7 of 7*.',
            'Both ceilings only ever fall.', '']
    if data['emDash']:
        by_file = {}
        for d in data['emDash']:
            by_file.setdefault((d['lang'], d['file']), []).append(d['key'])
        out += ['| Language | File | Values |', '|---|---|---:|']
        out += ['| %s | `%s` | %d |' % (lang, f, len(ks))
                for (lang, f), ks in sorted(by_file.items())]
        out.append('')
        out += ['<details><summary>Every key</summary>', '',
                '| Language | Key | Value |', '|---|---|---|']
        out += ['| %s | `%s` | %s |' % (d['lang'], d['key'], d['value'].replace('|', '\\|'))
                for d in data['emDash']]
        out += ['', '</details>', '']
    else:
        out += ['None left. Delete the ceiling and make the gate a hard failure.', '']

    out += ['## The word budget', '',
            'Ceiling **%d**, measured **%d**. **X18**: a slot an operator scans holds a'
            % (budgets['overBudget'], t['overBudget']),
            'fixed number of words. A key is put in a class by its name; the mapping is in',
            'the generator header. Anything longer moves to `InfoHint` or the detail surface.',
            'Measured on English only, and a placeholder counts as one word.', '',
            '| Class | Budget, in words | Over |', '|---|---:|---:|']
    out += ['| %s | %d | %d |' % (cls, WORD_BUDGET[cls], n)
            for cls, n in data['overBudgetByClass']]
    out.append('')
    if data['overBudget']:
        out += ['<details><summary>Every key over budget</summary>', '',
                '| Class | Words | Key | Value |', '|---|---:|---|---|']
        out += ['| %s | %d | `%s` | %s |'
                % (r['class'], r['words'], r['key'], r['value'].replace('|', '\\|'))
                for r in data['overBudget']]
        out += ['', '</details>', '']
    else:
        out += ['None over budget.', '']

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


RATCHETS = ('defaultValue', 'emDashEn', 'emDashAr', 'overBudget')

BUDGET_HEADER = (
    'Ceilings the generator refuses to RAISE, written by scripts/i18n-inventory.py. '
    'defaultValue: literals no extractor can see. emDashEn/emDashAr: dictionary values '
    'carrying U+2014 (X14). overBudget: English values over their X18 word budget. '
    'See docs/08-i18n/KEYS.md.'
)


def read_budgets(measured):
    """The recorded ceilings, defaulting to what is measured today."""
    saved = json.loads(read(BUDGET_PATH)) if os.path.exists(BUDGET_PATH) else {}
    return {name: saved.get(name, measured[name]) for name in RATCHETS}


def main():
    # The report names offending values, and they are Arabic as often as English.
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    check = '--check' in sys.argv
    data = build()
    measured = data['totals']['defaultValue']

    budgets = read_budgets(data['totals'])
    budget = budgets['defaultValue']

    md = render(data, budgets)
    js = json.dumps(data, indent=2, ensure_ascii=False) + '\n'
    md_path = os.path.join(OUT_DIR, 'KEYS.md')
    js_path = os.path.join(OUT_DIR, 'keys.json')

    # X14 and X18 turn the same way `defaultValue` does: over the ceiling names
    # the offenders and fails; under it, regenerate so the ceiling follows down.
    def ratchet(name, label, offenders):
        now, ceiling = data['totals'][name], budgets[name]
        if now > ceiling:
            print('%s ratchet BROKE: %d against a ceiling of %d.' % (label, now, ceiling))
            for line in offenders:
                print('  %s' % line)
            return True
        if now < ceiling:
            print('%s fell from %d to %d. Run `npm run i18n:keys` and commit '
                  'so the ceiling follows it down.' % (label, ceiling, now))
            return True
        return False

    em_offenders = ['%-56s %s' % (d['key'], d['value']) for d in data['emDash']]
    budget_offenders = ['%-14s %2d/%2d  %-44s %s'
                        % (r['class'], r['words'], r['budget'], r['key'], r['value'])
                        for r in data['overBudget']]

    if check:
        failed = False
        if ratchet('emDashEn', 'em dash (English)',
                   [o for o, d in zip(em_offenders, data['emDash']) if d['lang'] == 'en']):
            failed = True
        if ratchet('emDashAr', 'em dash (Arabic)',
                   [o for o, d in zip(em_offenders, data['emDash']) if d['lang'] == 'ar']):
            failed = True
        if ratchet('overBudget', 'word budget', budget_offenders):
            failed = True
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
        if failed:
            return 1
        print('key inventory is current: %d keys, %d in EN, %d defaultValue sites at ceiling %d'
              % (data['totals']['keys'], data['totals']['en'], measured, budget))
        return 0

    if not os.path.isdir(OUT_DIR):
        os.makedirs(OUT_DIR)
    # Every ratchet only turns one way, including here.
    ceilings = {name: min(data['totals'][name], budgets[name]) for name in RATCHETS}
    refused = [name for name in RATCHETS if data['totals'][name] > budgets[name]]
    if refused:
        for name in refused:
            print('REFUSING to write: %s is %d against a ceiling of %d.'
                  % (name, data['totals'][name], budgets[name]))
        if 'defaultValue' in refused:
            print('The ceiling never rises. Move the new strings into a copy.ts.')
        if 'emDashEn' in refused or 'emDashAr' in refused:
            print('The ceiling never rises. No em dash in a value an operator reads (X14):')
            print('`·` for a qualifier, two sentences for two clauses.')
            for line in em_offenders:
                print('  %s' % line)
        if 'overBudget' in refused:
            print('The ceiling never rises. Cut the value to its class budget (X18),')
            print('or move the explanation behind InfoHint.')
            for line in budget_offenders:
                print('  %s' % line)
        return 1
    ceiling = ceilings['defaultValue']
    payload = {'_': BUDGET_HEADER}
    payload.update({name: ceilings[name] for name in RATCHETS})
    io.open(BUDGET_PATH, 'w', encoding='utf-8', newline='\n').write(
        json.dumps(payload, indent=2) + '\n')
    md = render(data, ceilings)
    for p, want in ((md_path, md), (js_path, js)):
        io.open(p, 'w', encoding='utf-8', newline='\n').write(want)
    print('wrote %d keys across %d copy.ts files (%d reachable from EN, %d unregistered)'
          % (data['totals']['keys'], data['totals']['copyFiles'],
             data['totals']['en'], data['totals']['unregisteredKeys']))
    print('  ar missing        %d (extra in ar: %d)'
          % (data['totals']['arMissing'], data['totals']['arExtra']))
    print('  defaultValue      %d (ceiling now %d)' % (measured, ceiling))
    print('  em dash           %d en, %d ar (ceilings now %d, %d)'
          % (data['totals']['emDashEn'], data['totals']['emDashAr'],
             ceilings['emDashEn'], ceilings['emDashAr']))
    print('  over word budget  %d (ceiling now %d)'
          % (data['totals']['overBudget'], ceilings['overBudget']))
    for cls, n in data['overBudgetByClass']:
        print('      %-14s %3d over %d words' % (cls, n, WORD_BUDGET[cls]))
    print('  fragments         %d' % len(data['fragments']))
    print('  screens no copy   %d' % len(data['noCopyFile']))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
