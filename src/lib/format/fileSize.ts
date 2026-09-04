/**
 * The **only** file-size formatter in the product. `240 KB`, `1.4 MB`.
 *
 * DESIGN.md §3.8 (the attachment chip renders *"the filename, the size"*, line
 * 2040) and §9.6 / **AC-75** (no operator-facing string is assembled by
 * concatenation — every one resolves through a key).
 *
 * ## The three answers this replaces
 *
 * `sizeBytes` is on three types — `ConversationAttachment`, `ComplianceDocFile`,
 * `WorkspaceLogo` — and each of the three surfaces that renders it had written
 * its own answer:
 *
 * | site | before | wrong how |
 * |---|---|---|
 * | `ConversationPane.tsx:844` | `report.pdf · 240` | **no unit at all.** `formatCount(bytes / 1024)` into `conversations.thread.attachment` = `'{filename} · {size}'`, and neither the key nor the screen ever says *kilobytes*. Live and user-visible in both languages |
 * | `AdminWorkspaceScreen.tsx:96` | `` `${n} KB` `` | a user-visible string built by template literal, outside the dictionary — the exact defect §9.6 / AC-75 exists to prevent |
 * | `profile/driver/facts.tsx:254` | `240 KB` | correct, and it said so in its own header: *"this is the third copy … raised in the handoff, not silently duplicated"*. This module is the home it asked for |
 *
 * That is the `2,840 SAR` shape — three formatters for one question — which
 * `format/money.ts` already exists to have ended once. Adding a fourth is the
 * defect, not the fix.
 *
 * ## The rules, all of them, in one place
 *
 * | Property | Rule |
 * |---|---|
 * | Input | **non-negative integer bytes**. A float or a negative throws |
 * | Base | **1024**, not 1000 |
 * | Unit | **`KB` / `MB`, uppercase**, and it comes from a **dictionary key** |
 * | Floor | `Math.max(1, …)` on the KB branch — never `0 KB` |
 * | Tiers | KB below 1024 whole KB, MB at or above it. No `B`, no `GB` |
 * | Decimals | KB is whole, MB is exactly one |
 * | Digits | Western `0`–`9` in both languages, grouped (§9.2, AC-73) |
 *
 * **`kB` is not an option.** `kB` is strictly the SI *decimal* prefix — 1000
 * bytes — so labelling a 1024-based value with it is inaccurate as well as
 * inconsistent with the two shipped formatters. DESIGN.md:2040's `2.04 kB` is an
 * *observation of Shopify*, not a ruling on Eyvar.
 *
 * **The unit is a key and never a literal here.** A hardcoded `` `${n} KB` ``
 * is a user-visible string outside the dictionary, and it is half of what was
 * wrong with the admin call site. So this takes a `Translate` and resolves
 * `fileSize.kb` / `fileSize.mb`, exactly as `sla.ts` resolves `SLA_MESSAGES_EN`
 * — and `createTranslator` throws in dev on a missing key, so the unit cannot
 * silently vanish again the way it did on the attachment chip.
 *
 * **The unit SYMBOL is not translated.** `KB` is a Latin acronym and §9.6 keeps
 * Latin acronyms in English inside an Arabic string (`Eyvar`, `SAR`,
 * `RDR-4821`), so `FILE_SIZE_MESSAGES_AR` carries the same `KB` / `MB`. Only the
 * key's existence is per-language; the glyphs are not.
 *
 * **Not this function's job, deliberately** — the same three exclusions as
 * `format/money.ts`:
 * - `—` for an absent size. `WorkspaceLogo.sizeBytes` is `number | null`; a
 *   caller holding `null` renders `ABSENT` rather than calling at all, because a
 *   formatter that can return "no value" makes `1 KB` and "unknown" the same call.
 * - `tabular-nums`. A class on the cell, not a character.
 * - **Bidi isolation.** `240 KB` is two LTR runs and reorders to `KB 240` in an
 *   RTL paragraph, so the finished run is `<bdi>`-wrapped **by the component** —
 *   `isolate.ts`'s `money` kind is the identical shape and
 *   `DriverDocuments.tsx:449` already does it. Embedding U+2066/U+2069 in the
 *   string would poison copy-paste and assertions (`format/money.ts` U-4).
 */

import { type Language } from '../i18n/direction'
import type { Translate } from '../i18n/translate'
import { invariant } from '../invariant'
import { formatCount, formatDecimal } from './number'

/** 1024. Named so the base is a stated decision and not a magic number twice. */
const BYTES_PER_KB = 1024

/**
 * The unit keys, merged into `EN` by `src/i18n/dictionaries.ts` exactly as
 * `SLA_MESSAGES_EN` is. The Arabic side is `src/i18n/ar/fileSize.ts`.
 *
 * `{size}` is the whole value — a formatter's output, never a raw number — so
 * the numeral and the unit are two runs inside one template and no screen
 * concatenates them (AC-75).
 */
export const FILE_SIZE_MESSAGES_EN = Object.freeze({
  'fileSize.kb': '{size} KB',
  'fileSize.mb': '{size} MB',
})

export type FileSizeMessageKey = keyof typeof FILE_SIZE_MESSAGES_EN

/**
 * @param sizeBytes integer bytes. `245_760` renders `240 KB`.
 * @param t the screen's translator. The unit comes from it, never from here.
 *
 * **Zero renders `1 KB`, and that is the ruling.** `Math.max(1, …)` is the one
 * thing worth keeping from `AdminWorkspaceScreen`'s formatter: `0 KB` on a file
 * that exists is a *wrong fact*, not a rounded one, and this function cannot
 * tell an empty file from an unknown size — it has one number to go on. A
 * caller that genuinely does not know renders `ABSENT` instead of calling.
 *
 * **The tier is chosen on the ROUNDED kilobytes, not the exact ones**, and that
 * is a deliberate divergence from `facts.tsx`'s branch on `kb < 1024`. At
 * 1,048,575 bytes that test takes the KB branch and then rounds the value up to
 * `1,024 KB` — a size printed in a unit it has already outgrown, which is the
 * same class of defect as printing no unit at all. Branching on the value that
 * will actually be shown makes `1,024 KB` unrepresentable: the last string
 * before `1.0 MB` is `1,023 KB`.
 *
 * There is no `GB` tier and no bare `B` tier. Nothing in this console uploads a
 * gigabyte (the logo cap is 200 KB) and a size under a kilobyte is a size an
 * operator does not act on differently. Add a tier when a call site has one.
 */
export function formatFileSize(sizeBytes: number, t: Translate, language: Language = 'en'): string {
  invariant(
    Number.isFinite(sizeBytes),
    `formatFileSize needs a finite byte count, got ${sizeBytes}.`,
  )
  invariant(
    Number.isInteger(sizeBytes) && sizeBytes >= 0,
    `formatFileSize takes a non-negative integer byte count, got ${sizeBytes}.`,
  )

  const kilobytes = sizeBytes / BYTES_PER_KB
  const wholeKilobytes = Math.max(1, Math.round(kilobytes))

  if (wholeKilobytes < BYTES_PER_KB) {
    return t('fileSize.kb', { size: formatCount(wholeKilobytes, language) })
  }
  /* One decimal, always — `1.0 MB` beside `1.4 MB` in the same column is what
     stops the decimal point going ragged (§8.3.1's rule for money, and the
     reason `formatRatio` pins one decimal too). */
  return t('fileSize.mb', { size: formatDecimal(kilobytes / BYTES_PER_KB, 1, language) })
}
