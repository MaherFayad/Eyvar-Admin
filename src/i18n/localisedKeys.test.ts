/**
 * **Every key the data layer mints as a `LocalisedText` must exist in `EN`.**
 *
 * `LocalisedText` (`data/types/common.ts`) is a key plus named params, resolved
 * **verbatim** by `t()` — unlike `Metric.key`, which the tile renders as
 * `t('metric.' + key)` and which therefore must NOT be checked here.
 *
 * ## Why this test exists
 *
 * `AuditEntry.detail` is a `LocalisedText`, and the financial clients had been
 * minting 14 distinct `fin.audit.*` keys since wave 3. **None of them existed in
 * any dictionary.** Nothing caught it because `detail` had no UI consumer until
 * Admin › Activity read it, at which point the first render threw
 * `Missing translation key "fin.audit.gatewayDefaulted"` — AC-74's dev-time guard
 * working exactly as designed, three waves too late to be cheap.
 *
 * The guard was written the wrong way round: `t()` throws when a key is *rendered*,
 * so a key on a surface nobody has built yet is unprotected. This test moves the
 * check from render time to build time.
 *
 * ## Why the scan is lexical, and what that costs
 *
 * **The scan keys on the FIELD NAME, not on the object's shape.** `data/types/`
 * declares exactly nine fields as `LocalisedText`, and `LOCALISED_FIELDS` below
 * is that list. A literal only counts when it sits in one of them.
 *
 * Shape alone is not enough, and two earlier drafts proved it:
 *
 * 1. Matching any `{ key: '…'` reported **43 false positives** — ledger account
 *    codes (`{ key: 'ar.driver', label: … }`), report dimensions (which carry
 *    their copy in a separate `labelKey`), `PermissionRef`s (`{ key:
 *    'view_finance', level: 'read' }`) and compliance doc types. None of those is
 *    operator-facing copy; an account code and a permission key are identifiers
 *    that must never be translated.
 * 2. Narrowing to *"exactly `key`, optionally `params`"* still reported five,
 *    because a measure reference — `measures: [{ key: 'captains.registered' }]`
 *    in `fixtures/reports.ts` — is **structurally identical** to a param-less
 *    `LocalisedText`. No shape rule can separate those two; only the field can.
 *
 * The scan is still lexical, so a key assembled indirectly is invisible to it.
 * Walking the TypeScript AST for expressions assignable to `LocalisedText` is
 * the correct version, and worth doing the day a new field is added here and
 * nobody notices.
 *
 * The alternative — walking the TypeScript AST for expressions assignable to
 * `LocalisedText` — is correct rather than approximate, and worth doing the day
 * this test's exclusion list stops being readable at a glance.
 */

import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { EN } from './dictionaries'

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) sourceFiles(path, out)
    else if (path.endsWith('.ts') && !path.includes('.test.')) out.push(path)
  }
  return out
}

/**
 * **Comments are stripped before every scan, and that is not tidiness.**
 *
 * This file's scans read source lexically, so a key *named in prose* counts as a
 * key *minted in code*. That is not hypothetical: `types/metrics.ts:379`
 * explains, at length, that `labelKey: 'breakdown.row.entity'` was **deleted** —
 * *"a pass-through key whose entire English string was `{name}`… it satisfied
 * AC-697 and it was a fig leaf"*. The scan dutifully reported the deleted key as
 * missing from the dictionary, which is the correct answer to the wrong
 * question.
 *
 * The failure runs both ways and the other direction is worse: a guard that
 * asserts the *absence* of something can be tripped by its own explanation of
 * what it forbids. `seam.test.ts:404` strips comments for exactly this reason,
 * because several files under `src/data` document the `Date.now()` ban by
 * writing `Date.now()`.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/**
 * A work-item id, not a translation key: `myWork.ts` and `requests.ts` build
 * `'application:APP-1'` and `` `${entityType}:${entityId}` `` in a field also
 * called `key`. A colon can never appear in a dotted i18n key, so the shape
 * separates them without a per-file allow-list that would go stale.
 */
function isEntityKey(key: string): boolean {
  return key.includes(':')
}

/**
 * Keys built from a template literal, enumerated by hand because a lexical scan
 * cannot expand them. Each entry names the interpolated union so a new member is
 * an obvious edit rather than a silent gap.
 */
const TEMPLATE_KEYS: readonly string[] = [
  /* `fin.audit.cash.${disposition}` — cash.ts:327, disposition: resolve | escalate */
  'fin.audit.cash.resolve',
  'fin.audit.cash.escalate',
]

/**
 * **The `*Key` fields, which are the other half of the same contract — and the
 * half that was unguarded until an audit found twelve missing keys.**
 *
 * A `LocalisedText` is a `{ key, params }` object. But the data layer also mints
 * i18n keys as **bare string fields whose name ends in `Key`** — `titleKey`,
 * `reasonKey`, `labelKey` — and `t()` resolves those verbatim too. The scan
 * above keys on nine field names and could not see any of them.
 *
 * What it missed, all found by hand instead:
 *
 * - **eleven `rb.*` report-builder legality reasons** — `rb.funnel.needsSteps`,
 *   `rb.cohort.needsAnchor` and the rest, minted in `data/reporting/plan.ts`;
 * - **`shellLayer.onboarding`** — `SHELL_LAYERS` has carried that `titleKey`
 *   since the row was minted, and the string was never written. Three sibling
 *   keys sat right beside it in `dictionaries.ts`, which is exactly what made
 *   the gap invisible.
 *
 * ## Which `Key` fields count, and why the list is explicit
 *
 * Not every `*Key` is a translation key. Five are **identifiers that happen to
 * be dotted**, and translating one would be a defect, not a fix:
 * `measureKey`, `anchorMeasureKey` and `rootMeasureKey` hold measure ids like
 * `riders.joined`; `planKey` and `supersededByKey` hold plan ids. They are
 * excluded by name rather than by shape, for the same reason the scan above
 * keys on the field: **`riders.joined` and `rb.funnel.needsSteps` are
 * structurally identical**, and no rule over the string can separate them.
 *
 * So the allow-list is the assertion. A new `*Key` field is invisible to this
 * test until someone classifies it, and the `finds them at all` test below is
 * what stops the whole scan from quietly matching nothing.
 */
const I18N_KEY_FIELDS = [
  'titleKey',
  'subtitleKey',
  'labelKey',
  'subLabelKey',
  'captionKey',
  'descriptionKey',
  'reasonKey',
  'stateReasonKey',
  'predicateKey',
] as const

/** Dotted, but an identifier. Translating one of these would be the defect. */
const IDENTIFIER_KEY_FIELDS = [
  'measureKey',
  'anchorMeasureKey',
  'rootMeasureKey',
  'planKey',
  'supersededByKey',
  /* **Operation ids in an `INTEGRATION_OPERATIONS` registry, not copy** —
     `issueKey: 'integrations.keys.issue'` names the mock operation that
     failure injection addresses (`?mockFail=integrations.keys.issue`).
     They land here for the least satisfying possible reason: the *resource* is
     an API key, so three verbs against it spell fields ending in `Key`, and the
     values are dotted, so they are indistinguishable from i18n keys by shape.
     Only the field name separates them — which is the same limit the
     `LocalisedText` scan below hit, arrived at from a third direction.

     If a fourth operation registry ever names a field `…Key`, this test fails
     and asks. That is the intended cost: an operation id silently checked
     against the dictionary would report a missing translation for something
     that must never be translated. */
  'issueKey',
  'rotateKey',
  'revokeKey',
] as const

describe('every `*Key` field in the data layer resolves in EN', () => {
  /* `[ 	]*` rather than `\s*` **on purpose**, and not as a stylistic choice.
     This is a template literal, so a lone `\s` is dropped as an unrecognised
     escape and the pattern silently becomes `:s*'…'` — matching a literal `s`
     and therefore almost nothing. The scan above pays for the same hazard with
     a double backslash and a paragraph explaining it; a character class costs
     no escape at all, and a field and its value are on one line anyway.

     The `finds them at all` test is what caught it, on this scan's first run. */
  const pattern = new RegExp(`(?:${I18N_KEY_FIELDS.join('|')}):[ 	]*'([^']+)'`, 'g')

  const minted = new Set<string>()
  for (const file of sourceFiles('src/data')) {
    for (const match of stripComments(readFileSync(file, 'utf8')).matchAll(pattern)) {
      const key = match[1]!
      /* A key with no dot is a local id, not an i18n key — `planKey: 'basic'`
         shape, reached through a field this list does not name. */
      if (key.includes('.') && !isEntityKey(key)) minted.add(key)
    }
  }

  it('finds them at all, so a passing run is never vacuous', () => {
    expect(minted.size).toBeGreaterThan(150)
  })

  it('defines every one of them in the English dictionary — AC-74', () => {
    const missing = [...minted].filter((key) => EN[key] === undefined).sort()
    expect(missing, 'minted as a *Key field by src/data, defined nowhere').toEqual([])
  })

  /**
   * The classification is exhaustive. If a new `*Key` field appears in
   * `src/data` and is in neither list, this fails and names it — which is the
   * only thing standing between the allow-list above and the slow drift back
   * into an unguarded surface.
   */
  it('classifies every `*Key` field as copy or as an identifier', () => {
    const known = new Set<string>([...I18N_KEY_FIELDS, ...IDENTIFIER_KEY_FIELDS])
    const unclassified = new Set<string>()
    for (const file of sourceFiles('src/data')) {
      for (const match of stripComments(readFileSync(file, 'utf8')).matchAll(/(\w+Key):\s*'([^']+)'/g)) {
        if (!known.has(match[1]!)) unclassified.add(match[1]!)
      }
    }
    expect(
      [...unclassified].sort(),
      'a new *Key field — add it to I18N_KEY_FIELDS or to IDENTIFIER_KEY_FIELDS',
    ).toEqual([])
  })
})

/**
 * **Keys passed positionally, which neither scan above can see.**
 *
 * `data/reporting/plan.ts` calls `illegal(value, key, params)` — the key is the
 * second argument, in no named field at all. Two of the eleven missing `rb.*`
 * keys were minted this way (`rb.chart.modeFixed` at `:369`,
 * `rb.grain.modeFixed` at `:330`), so they were invisible even to a scan that
 * understood `reasonKey`.
 *
 * This is the point at which a lexical scan is visibly at its limit: the next
 * such call site, in a function named something else, is unguarded again. The
 * correct version walks the TypeScript AST for arguments to functions whose
 * parameter is typed as a translation key. Until that exists, the honest thing
 * is to name the call sites and let this fail when one is added.
 */
/* Declared once, as a regex literal, so the escape is written in source rather
   than assembled — the failure this whole file exists to prevent bit its own
   scan three times before this line settled. */
const ILLEGAL_CALL = /illegal\([^,)]+,\s*'([^']+)'/g

describe('keys passed as a positional argument', () => {
  it('resolves every key handed to `illegal(...)` — AC-74', () => {
    const minted = new Set<string>()
    for (const file of sourceFiles('src/data')) {
      for (const match of stripComments(readFileSync(file, 'utf8')).matchAll(ILLEGAL_CALL)) {
        minted.add(match[1]!)
      }
    }
    expect(minted.size, 'the scan found no `illegal(...)` call — has it been renamed?').toBeGreaterThan(0)
    const missing = [...minted].filter((key) => EN[key] === undefined).sort()
    expect(missing, 'passed to illegal(), defined nowhere').toEqual([])
  })
})

describe('LocalisedText keys resolve in EN', () => {
  /**
   * Every field `data/types/` declares as `LocalisedText`. Keep in step with:
   * `grep -rn ': LocalisedText' src/data/types/`.
   */
  const LOCALISED_FIELDS = [
    'detail', // audit.ts:60
    'failureReason', // financials.ts:228
    'type', // financials.ts:276
    'blockedReason', // financials.ts:425
    'description', // ledger.ts:292
    'reason', // ledger.ts:356
    'label', // ledger.ts:466
    'scenario', // pricing.ts:188
    'note', // pricing.ts:192
  ] as const

  /* Double-escaped on purpose: this is a template literal, so `\\s` is what
     reaches the RegExp constructor as `\s`. A single backslash would be dropped
     as an unrecognised string escape and the pattern would silently match
     almost nothing — which is exactly what the anti-vacuity test above catches. */
  const pattern = new RegExp(
    `(?:${LOCALISED_FIELDS.join('|')}):\\s*\\{\\s*key: '([^']+)'`,
    'g',
  )

  const minted = new Set<string>()
  for (const file of sourceFiles('src/data')) {
    for (const match of stripComments(readFileSync(file, 'utf8')).matchAll(pattern)) {
      const key = match[1]!
      if (!isEntityKey(key)) minted.add(key)
    }
  }
  for (const key of TEMPLATE_KEYS) minted.add(key)

  it('finds the keys at all, so a passing run is never vacuous', () => {
    expect(minted.size).toBeGreaterThan(20)
  })

  it('defines every one of them in the English dictionary — AC-74', () => {
    const missing = [...minted].filter((key) => EN[key] === undefined).sort()
    expect(missing, 'minted by src/data, defined nowhere').toEqual([])
  })

  it('gives every placeholder in the template a name the caller can supply — AC-75', () => {
    const unnamed: string[] = []
    for (const key of minted) {
      const template = EN[key]
      if (template === undefined) continue
      for (const match of template.matchAll(/\{(\w*)\}/g)) {
        if (match[1] === '') unnamed.push(key)
      }
    }
    expect(unnamed).toEqual([])
  })
})
