/**
 * Compile-time assertions for band 2's inline-start slot. This file runs
 * nothing; it fails `npx tsc --noEmit` if any construction below changes
 * status — either by starting to compile, or by stopping.
 *
 * `@ts-expect-error` is the assertion: it is itself an error when the line it
 * marks has **no** error. So if someone relaxes `ToolbarLeadingSlot` back into
 * three independent optionals, the build breaks here and names the rule,
 * rather than a heading and a five-tab track quietly sharing 342px of
 * shrinking slot at the 1280 floor and clipping one of them.
 *
 * The rule: **a table declares view tabs or a heading, never both.** They are
 * one slot. Modelled after `hooks/useIndexTable.types.ts`, which makes the same
 * kind of assertion for **AC-48**.
 *
 * The three positive cases matter as much as the negative one. Two of them are
 * the forty existing callers — `tabs`, and neither — and if either stopped
 * compiling, this change would not be additive.
 */

import { DataTable } from '../DataTable'
import type { ToolbarLeadingSlot, ToolbarTab } from './IndexToolbar'
import type { AnyTable } from '@/hooks/useIndexTable'
import type { Language, Translate } from '@/lib'

interface Row {
  id: string
}

const TABS: readonly ToolbarTab[] = [{ id: 'a', label: 'A' }]

/* ── the slot type on its own ───────────────────────────────────────────── */

export const tabsOnly: ToolbarLeadingSlot = { tabs: TABS }
export const headingOnly: ToolbarLeadingSlot = {
  heading: 'Wallet and payments',
  subheading: '2 movements',
}
/** A heading with no subline. `subheading` is optional, not merely nullable. */
export const headingAlone: ToolbarLeadingSlot = { heading: 'Payments' }
/** `null` is the declared absence, so a screen may compute one and pass it. */
export const headingWithNullSub: ToolbarLeadingSlot = { heading: 'Payments', subheading: null }
/** The forty existing callers that pass neither. */
export const neither: ToolbarLeadingSlot = {}
/** A conditional in a screen produces `undefined`, and that is not "both". */
export const explicitUndefined: ToolbarLeadingSlot = { tabs: TABS, heading: undefined }

// @ts-expect-error a table declares view tabs or a heading, never both — one slot
export const both: ToolbarLeadingSlot = { tabs: TABS, heading: 'Wallet and payments' }

/* ── and the same rule where the forty callers actually meet it ──────────── */

declare const table: AnyTable<Row>
declare const t: Translate
declare const language: Language
declare const noop: () => void

const common = {
  table,
  rows: [] as readonly Row[],
  columns: [],
  getRowId: (row: Row) => row.id,
  status: 'content' as const,
  total: 0,
  t,
  language,
  tableId: 'compile-time-assertion',
  searchPlaceholder: '',
  firstRun: { heading: '', body: '', actions: [] },
  noMatch: { message: '' },
  error: { message: '', onRetry: noop },
}

/* Never rendered. Exported so `noUnusedLocals` stays satisfied. */
export function theLeadingSlotHoldsTabsOrAHeadingAndNeverBoth() {
  return (
    <>
      <DataTable {...common} tabs={TABS} activeTab="a" onSelectTab={noop} />
      <DataTable {...common} heading="Wallet and payments" subheading="2 movements" />
      <DataTable {...common} heading="Payments" />
      <DataTable {...common} />
      {/* @ts-expect-error a table declares view tabs or a heading, never both */}
      <DataTable {...common} tabs={TABS} heading="Wallet and payments" />
    </>
  )
}
