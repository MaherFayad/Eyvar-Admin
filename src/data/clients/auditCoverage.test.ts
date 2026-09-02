/**
 * **A declared audit action that nothing writes is worse than no action at all.**
 *
 * `AuditAction` is a closed union — the type says so, and the reason is good:
 * *"an audit log whose `action` is free text cannot be filtered, and an
 * unfilterable audit log is a text file."* But a closed union is also a promise,
 * and the union was making promises the call sites did not keep. Six of the 45
 * members were declared and never written, and two of those were live mutating
 * surfaces:
 *
 *   - `senderIdentity.setDefault` — the act the type's own comment singles out
 *     as mattering most on that screen, because *"changing which address the
 *     product sends as is invisible to everyone except the recipient"*.
 *   - `emailTemplate.save`.
 *
 * Both wrote nothing. The docblock on `setDefaultSenderIdentity` even said so —
 * *"Audited act, audit entry not yet written"* — which is how a gap survives:
 * it was recorded honestly, in a place no failing test ever read.
 *
 * This test reads it instead. A member with no `appendAudit` call must be named
 * in `AWAITING_IMPLEMENTATION` below, with the reason, so that adding a verb to
 * the union forces a deliberate choice rather than a silent hole.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const DATA_ROOT = join(process.cwd(), 'src', 'data')
const TYPE_FILE = join(DATA_ROOT, 'types', 'audit.ts')

/**
 * Members whose *operation does not exist yet* — no reversal endpoint, no
 * denial recorder. These are forward declarations, not unaudited call sites,
 * and the distinction is the whole point of the list: if one of these grows a
 * mutation, this test fails until the mutation writes its entry.
 */
const AWAITING_IMPLEMENTATION = new Set([
  'payout.reverse',
  'escrow.rehold',
  'refund.reverse',
  'permission.denied',
])

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full))
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) out.push(full)
  }
  return out
}

const declared: string[] = [
  ...readFileSync(TYPE_FILE, 'utf8').matchAll(/^\s*\|\s*'([a-zA-Z.]+)'/gm),
].flatMap((m) => (m[1] === undefined ? [] : [m[1]]))

/* Every non-test source under `src/data`, minus the union's own declaration —
   otherwise the type file would count as the write site for all 45. */
const callSites = sourceFiles(DATA_ROOT)
  .filter((path) => path !== TYPE_FILE)
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n')

describe('every declared audit action is either written or explicitly deferred', () => {
  it('declares a non-trivial closed union', () => {
    expect(declared.length).toBeGreaterThan(40)
  })

  it('leaves no member silently unwritten', () => {
    const unwritten = declared.filter(
      (action) => !callSites.includes(`'${action}'`) && !AWAITING_IMPLEMENTATION.has(action),
    )
    expect(
      unwritten,
      'declared in AuditAction but no appendAudit call writes it; implement it or name it in AWAITING_IMPLEMENTATION with a reason',
    ).toEqual([])
  })

  it('keeps the deferred list honest — a deferred action that IS written must leave the list', () => {
    const written = [...AWAITING_IMPLEMENTATION].filter((action) => callSites.includes(`'${action}'`))
    expect(written, 'now written, so remove it from AWAITING_IMPLEMENTATION').toEqual([])
  })

  it('names only real union members in the deferred list', () => {
    const unknown = [...AWAITING_IMPLEMENTATION].filter((action) => !declared.includes(action))
    expect(unknown, 'deferred action that is not a member of AuditAction').toEqual([])
  })

  /* The two this test was written for, asserted by name so they cannot regress
     quietly under a refactor that drops the call. */
  it('writes the two email acts that shipped unaudited', () => {
    expect(callSites).toContain("'senderIdentity.setDefault'")
    expect(callSites).toContain("'emailTemplate.save'")
  })
})
