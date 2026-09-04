/**
 * **The five documents, soonest deadline first, each one an expanding row.**
 *
 * ```
 *  Registration                                              v
 *  < Expiring >  19 Jul 2026 . 24 days left
 *  ----------------------------------------------------------
 *  Inspection                                                ^
 *  < Valid >  2 Aug 2026 . 38 days left
 *      +--------------------------------------------------+
 *      | +----------------------+                         |
 *      | |    [ the scan ]      |  240 x 160, images only |
 *      | +----------------------+                         |
 *      | inspection-DRV-0101.jpg                          |
 *      |    JPG . 1.2 MB                                  |
 *      |    Uploaded 14 Feb 2026 by Noura Al-Otaibi       |
 *      | [ Open scan ↗ ] [ Download ]                     |
 *      +--------------------------------------------------+
 *      Marked valid because more than 30 days remain.
 *  ----------------------------------------------------------
 *  ...three more...
 *  ==========================================================
 *  Open compliance file
 * ```
 *
 * **One component, both surfaces.** The sheet renders it inside its first tab;
 * the page renders it as the first section of `main`. Same rows, same order,
 * same words, same control, **and now the same viewer** — the surfaces choose
 * the box, not the content (§3). That last clause is why the viewer's trigger
 * lives on the row in here rather than being composed by each surface: with one
 * implementation and two mounts, parity is structural, and AC-CP-30 can fail a
 * second implementation instead of a reviewer having to spot one.
 *
 * ## The row is two lines BY DESIGN, not by wrapping (§5.2)
 *
 * Four facts — name, state, date, countdown — do not fit one line at this
 * width. The row used to be a `flex-wrap` between a label and a `shrink-0` span
 * carrying the other three, so the browser chose the break and chose a
 * different one per row. Measured in Chromium at 480 before the change, the
 * five rows came out **30 / 61 / 38 / 61 / 60** in English and
 * **58 / 66 / 66 / 41 / 65** in Arabic: five documents reading as ten lines,
 * with no rule governing which ones doubled, and `Documents 5` on the tab no
 * longer matching what was on screen.
 *
 * The break is declared instead, and four things do distinct parts of the work:
 *
 *   1. **The row is a single control.** It was inert markup, so nothing bound
 *      its two lines together. One `<button>` gives them one hover ground, one
 *      focus ring and one accessible name.
 *   2. **`flex-wrap` and `justify-between` are gone.** Line two is an explicit
 *      sibling starting at the **inline-start**, flush under the label. A
 *      subordinate line under its own heading reads as subordinate; the same
 *      line at the opposite edge reads as a peer, and that orphan — not the
 *      wrap — was the defect.
 *   3. **The proximity ratio inverts to 4 : 1.** Outer `py-2` (8px) against
 *      inner `gap-y-0.5` (2px). It was `py-2` against `gap-y-1`, which is 2 : 1
 *      and far too close to read as grouping. Both values are on the shipped
 *      spacing scale; **nothing here is off-grid and D-2 is not cited** — it is
 *      retired (`DESIGN.md` §6.2) and citing it fails AC-CP-56.
 *   4. **The badge leads line two.** It moves from a position determined by the
 *      countdown's width to the inline-start of the meta line, where all five
 *      align in a true column.
 *
 * **Widening the drawer was not available.** `sheet.tsx` §1.2 / C12, the rider
 * spec §6.1 and this screen's §4.4 refuse it, measured, three times over.
 *
 * ## Ordered by deadline, not by canon (D-CP-5)
 *
 * `documentRows` sorts by `expiresOn` ascending with `DOC_ORDER` as the
 * tie-break. A profile answers *"what is about to stop this captain driving"*;
 * the Compliance **view** answers *"which document is which"* and keeps the
 * canonical order in its own `DOC_COLUMNS`, untouched by this.
 *
 * ## The viewer is an expansion, and it could not have been anything else
 *
 * §5.5 forbids nesting a modal inside a drawer, and the sheet is a drawer — the
 * same clause that already stopped the suspend and pay controls shipping
 * (`DriverFooter`). A route was refused because navigating closes the sheet,
 * and a drawer exists to be consulted *against* the page behind it; a control
 * inside one that dismisses it is a category error. A second drawer over the
 * first was refused because `ShellLayer` has no stacking model. So: inline, one
 * at a time, on both surfaces (D-CP-7, §6.1).
 *
 * ## What an opened row shows, and why it can never be empty
 *
 * Two things, in this order, and **both always render**:
 *
 *   **(a) the scan's record, or its honest absence.** Three states, not two,
 *   and the third is the one that bites — see `DriverDocumentRecord`.
 *   **(b) the derivation of the state.** `ComplianceDocState`'s 7- and 30-day
 *   boundaries are invisible on every surface that prints the word, and §8.2
 *   requires a derived value to state its derivation. It is a plain sentence
 *   from `DOC_STATE_WHY`, one key per bucket, never concatenated.
 *
 * (b) is what guarantees (a) can never leave the panel blank. **The expansion
 * does not restate the expiry date or the state word** — they are two pixels
 * above it, and an expansion that repeats its own trigger teaches an operator
 * that expanding is pointless.
 *
 * ## What is deliberately not here
 *
 * **No row marker on an expired document.** Raised for the design owner last
 * wave and **ruled: correct as shipped, do not add one.** R5a's breached-row
 * marker is red's third permitted use and §8.4 scopes it to a work-queue row
 * with an SLA; a read-only list on a profile is not that. The word `Expired`
 * and `expired 12 days ago` carry the fact, which is what §7.5 asks for.
 *
 * **No renew, upload, replace or extend.** `DRIVER_OPERATIONS` still has no
 * mutation here, and a command with no operation behind it is not declared at
 * all rather than shipped disabled with an invented reason.
 *
 * **No download-ALL, no print, no export.** §6.7a spends exactly one clause of
 * §6.7 — `download` moves from refused to declared **for one document at a
 * time**, because finding Q's bytes read gave it an operation and the owner
 * asked for it. The second ground §6.7 gave is untouched and if anything
 * sharpened: *a bulk export of identity documents is a permission question, not
 * a design one.* One scan at a time, from a row the operator deliberately
 * expanded, is not an export.
 *
 * **No in-app viewer** (§6.7a's new refusal, and the line a reviewer greps
 * for): no zoom control, no rotate control, no page-through, no lightbox, no
 * `<iframe>`, no `<embed>`, no pdf.js. §6.5a.6 is the argument and
 * `DriverDocumentRecord` carries it.
 *
 * **No filled button** (D-CP-6). `Open compliance file` is a navigation, not
 * the primary act of this list; R3 caps the count at one and does not require
 * one; and on the sheet a filled control is the affordance for a commit, which
 * §6.2 says this layer does not make. It is `variant="link"` at the list's
 * inline-start, seated under the closing rule.
 *
 * Rules applied
 *   R7/R17     ONE warning tone. `Expiring` and `Expiring soon` differ by their
 *              LABEL (`profile.docState.*`), never by a second fill. The tones
 *              are `people/domain.ts`'s `DOC_STATE`; no map here re-decides one.
 *   §7.5       the state is a word as well as a tone, the countdown is a second
 *              independent carrier, and the derivation is a third. Nothing on
 *              this surface is colour-only.
 *   §11.2      a blocked control is disabled IN PLACE with its reason as real
 *              text, `aria-describedby`-linked. Never hidden, never a tooltip —
 *              a hover-only explanation is unreachable by keyboard and
 *              unreachable on touch.
 *   §4.7       the accordion is the sanctioned reveal-in-place instrument, and
 *              `ui/accordion.tsx` is the product's restyled one. It is not
 *              hand-rolled here: it already carries `aria-expanded`,
 *              `aria-controls`, the one-at-a-time behaviour, the focus ring and
 *              the disclosure chevron.
 *   §9.1       logical utilities only. Both lines start at the inline-start and
 *              the chevron is pushed to the inline-end by `ms-auto`. The only
 *              physical utility is `border-b`, which is the BLOCK end and does
 *              not mirror in a horizontal writing mode — nor should it.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { FileTextIcon } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { StatusBadge } from '@/components/StatusBadge'
import { SectionSkeleton } from '../SectionCard'
import { getComplianceDocumentFile } from '@/data/clients'
import { COMPLIANCE_DOC_FILE_KIND, isApiError, type ComplianceDoc, type DriverCompliance } from '@/data/types'
import type { AsyncResult } from '@/hooks'
import { formatDate, formatFileSize, type Language, type Translator } from '@/lib'
import { DOC_STATE } from '@/screens/operations/people/domain'
import { DOC_STATE_LABEL } from '../domain'
import { DOC_STATE_WHY, documentCountdown, documentRows } from './facts'
import { NavigateControl } from './NavigateControl'
import { complianceState } from './reads'

export interface DriverDocumentsProps {
  /** `null` data is the captain with no file — an answer, not a miss. `reads.ts`. */
  result: AsyncResult<DriverCompliance | null>
  /** The instant the countdowns are measured against. Passed, never read here. */
  nowIso: string
  /** Where `Open compliance file` goes — the Compliance view, on this captain. */
  complianceHref: string
  /**
   * **`view_operations`, and it gates two things rather than one.**
   *
   * It is `COMPLIANCE_VIEW_PERMISSION` (`hrefs.ts`), which is the permission
   * §6.3 names for the scan as well: *"the same permission that gates the
   * Compliance route, which is where the same scan lives."* So one flag serves
   * both, no new prop crosses `ProfileLayer` or the page, and the two can never
   * disagree about an operator the way two plumbed booleans eventually would.
   */
  canOpenCompliance: boolean
  t: Translator
  language: Language
}

export function DriverDocuments({
  result,
  nowIso,
  complianceHref,
  canOpenCompliance,
  t,
  language,
}: DriverDocumentsProps) {
  const state = complianceState(result)
  /* Empty only where the file exists and holds nothing. `no-file` is its own
     sentence, and neither of them is an error. */
  const rows = state.kind === 'file' ? documentRows(state.compliance, t, nowIso) : []

  /* Controlled, `''` for none open. Radix's `type="single" collapsible` already
     gives one-at-a-time (AC-CP-33); the state is held here only so `Escape` can
     collapse the open row without reaching for a ref. */
  const [openId, setOpenId] = useState('')

  const listRef = useRef<HTMLDivElement>(null)

  /**
   * **AC-CP-42 — `Escape` inside the list collapses the open row; a SECOND
   * `Escape` closes the sheet.** `DESIGN.md` :4114 — *"Escape twice in a nested
   * surface — innermost first."*
   *
   * ## Why this is a `window` listener and not `onKeyDown`
   *
   * The obvious version — a React `onKeyDown` on the list that calls
   * `stopPropagation()` — **passes in jsdom and fails in a browser**, which is
   * the worst possible combination and is why this was measured rather than
   * assumed. Radix's `DismissableLayer` registers its handler as
   *
   *     ownerDocument.addEventListener('keydown', handleKeyDown, { capture: true })
   *
   * (`@radix-ui/react-dismissable-layer/dist/index.mjs:104`). **Capture, on
   * `document`** — so it runs on the way DOWN, long before any handler inside
   * the panel, and nothing in the subtree can stop it after the fact. Measured
   * in Chromium: the first `Escape` closed the sheet with the row still open.
   *
   * `window` is the one node above `document` in the capture path, so a capture
   * listener here is the only one guaranteed to run first regardless of mount
   * order — and mount order is not reliable either, because this component
   * lives inside a `TabsContent` that unmounts and remounts as tabs change.
   *
   * `preventDefault()` is what actually spares the sheet: the same layer
   * dismisses only `if (!event.defaultPrevented)` (`:97`). `stopPropagation()`
   * is the second half, so the event never reaches the layer at all.
   *
   * **Two guards, and both are the criterion rather than caution.** Nothing
   * open, or focus outside this list, and the event is left completely alone —
   * so `Escape` closes the sheet exactly as it does everywhere else, which is
   * the half of AC-CP-42 that is easy to lose.
   */
  useEffect(() => {
    if (openId === '') return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const list = listRef.current
      const target = event.target
      if (list === null || !(target instanceof Node) || !list.contains(target)) return
      setOpenId('')
      event.preventDefault()
      event.stopPropagation()
    }
    window.addEventListener('keydown', onEscape, { capture: true })
    return () => window.removeEventListener('keydown', onEscape, { capture: true })
  }, [openId])

  return (
    <div className="flex flex-col gap-2">
      {state.kind === 'loading' && <SectionSkeleton rows={5} />}

      {state.kind === 'error' && (
        <ErrorState
          scope="card"
          card={false}
          message={t('profile.state.error', { section: t('profile.driver.block.documents') })}
          action={{ label: t('profile.state.retry'), onClick: state.retry }}
        />
      )}

      {/* R8 / AC-37 — a card-scoped empty is ONE grey sentence, no heading and
          no illustration. Both of these are that; they differ because *no file
          exists* and *the file is empty* are different facts about the captain. */}
      {state.kind === 'no-file' && (
        <EmptyState kind="no-match" card={false} message={t('profile.driver.documents.none')} />
      )}
      {state.kind === 'file' && rows.length === 0 && (
        <EmptyState kind="no-match" card={false} message={t('profile.driver.documents.empty')} />
      )}

      {rows.length > 0 && (
        /* The closing `border-b` is what the link below is seated against. A
           list that simply stops, then a control 12px lower, reads as two
           things; a list that ends on a rule with the control under it reads as
           one. `border-b` is BLOCK-end — it does not mirror, and must not. */
        <Accordion
          type="single"
          collapsible
          value={openId}
          onValueChange={setOpenId}
          ref={listRef}
          className="border-b border-border"
        >
          {rows.map((row) => (
            /* **`border-border` is added here, not assumed.** The primitive
               ships `not-last:border-b` with no colour, and Tailwind v4's
               default border colour is `currentColor` — so an uncoloured
               `border-b` draws an ink hairline rather than the `--border` one.
               Reported against `ui/accordion.tsx`; corrected at this call site
               so the list is right either way. */
            <AccordionItem
              key={row.doc.id}
              value={row.doc.id}
              className="border-border"
            >
              {/* `py-2` overrides the primitive's `py-2.5` so the outer padding
                  is exactly four times the inner `gap-y-0.5` (AC-CP-22).
                  `font-normal` keeps the label at the rank the shipped row had
                  — D-CP-3 raised the SUMMARY block's heading, not a list label.
                  `no-underline` because the primitive's `hover:underline` would
                  underline the badge's word and the date as well as the name;
                  the hover ground is the affordance instead. */}
              {/* `py-2` overrides the primitive's `py-2.5` so the outer padding
                  is exactly four times the inner `gap-y-0.5` (AC-CP-22).
                  `font-normal` keeps the label at the rank the shipped row had.
                  `no-underline` because the primitive's `hover:underline` would
                  underline the badge's word and the date as well as the name;
                  the hover ground is the affordance instead.

                  **The trigger stays a ROW and takes ONE child.** The primitive
                  appends its two chevrons as siblings of `children`, so making
                  the trigger itself a column puts the chevron under line two
                  instead of at the inline-end — measured, it added 20px to every
                  row. The two lines are a column INSIDE it; `items-start` keeps
                  the chevron level with line one, which is where §6.6 draws it. */}
              <AccordionTrigger className="gap-2 py-2 font-normal hover:bg-accent hover:no-underline">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {/* Line one — the document. `min-w-0` so a longer label wraps
                      inside its own line rather than pushing the chevron out of
                      the row; not `truncate`, because a hidden document name is
                      worse than a row that grows honestly. */}
                  <span className="min-w-0">{row.label}</span>
                  {/* Line two — the state first, then when. All three start at
                      the inline-start, which is what makes the line read as
                      belonging to the name above it (AC-CP-20, AC-CP-24). */}
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <StatusBadge tone={DOC_STATE[row.state]} className="shrink-0">
                      {t(DOC_STATE_LABEL[row.state])}
                    </StatusBadge>
                    <span className="text-xs font-normal text-muted-foreground">
                      {/* Two `<bdi>` runs with a decorative separator between
                          them, not one string joined from two (§9.6). A date
                          and a countdown are Latin runs whose internal spaces
                          are bidi-neutral, so an Arabic paragraph would
                          otherwise walk their pieces backwards (AC-73). */}
                      <bdi className="tabular-nums">
                        {formatDate(row.expiresOn, { style: 'day-month-year', language })}
                      </bdi>
                      <span aria-hidden="true"> · </span>
                      <bdi className="tabular-nums">{documentCountdown(row, t)}</bdi>
                    </span>
                  </span>
                </span>
              </AccordionTrigger>

              {/* **`h-auto`, and it is a measured fix rather than a
                  preference.** The primitive's wrapper carries
                  `h-(--radix-accordion-content-height)`, and Radix measures
                  that variable **once**, in a layout effect keyed on
                  `[open, present]` — so the panel's height is frozen at the
                  instant it opens and the outer element's `overflow-hidden`
                  clips anything that grows afterwards.

                  Every state of the file slot that arrives *after* the
                  expansion hits that. Measured in Chromium at
                  `/entity/DRV-0101?mockFail=compliance.documentFile:503`, on
                  the PDF row: the panel opened at **172px**, clicking
                  `Open scan` replaced the one-line PDF sentence with the error
                  and its `Try again`, `scrollHeight` went to **306px**, and
                  134px of it — including the retry control — was clipped out of
                  existence.

                  Nothing is lost by dropping the fixed height: the accordion's
                  `animate-accordion-down` / `-up` classes have **no keyframes
                  defined anywhere in the product**, so the variable is doing no
                  animation work here. Reported against `ui/accordion.tsx`,
                  whose owner this task is not; overridden at the call site so
                  the list is right either way. */}
              <AccordionContent className="flex h-auto flex-col gap-2">
                <DriverDocumentRecord
                  doc={row.doc}
                  /* The row's own translated label, passed so the two controls'
                     accessible names and the row heading cannot disagree. */
                  label={row.label}
                  canViewFile={canOpenCompliance}
                  t={t}
                  language={language}
                />
                {/* §8.2 — the derived value states its derivation, and this is
                    what makes the panel impossible to leave empty. */}
                <p className="text-xs text-muted-foreground">{t(DOC_STATE_WHY[row.state])}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* D-CP-6 — a LINK at the inline-start, seated under the list's closing
          rule, and §11.2's refusal from the same implementation so the sheet and
          the page cannot offer or refuse it differently.

          It renders in all five list states, including both empties, because it
          is how an operator reaches the file that is missing. */}
      <NavigateControl
        to={complianceHref}
        label={t('profile.driver.action.compliance')}
        allowed={canOpenCompliance}
        reason={t('profile.driver.refusal.compliance')}
        align="start"
      />
    </div>
  )
}
/* ──────────────────── the scan's bytes, read on demand ─────────────────── */

/**
 * **What the file slot is looking at.** Five of these are the read's outcomes;
 * `idle` is not a state of the read at all — it is the state *before* one has
 * been asked for, which is where a PDF sits until a control is clicked
 * (§6.5a.4).
 *
 * The three rejections are kept apart because **an operator acts differently on
 * each** and the data layer went to some trouble to keep them separable
 * (`types/driver.ts`, *"those are opposite diagnoses"*). A generic `catch` that
 * rendered one error for all three would tell an operator to retry a permission
 * they do not have and a file that does not exist.
 */
type ScanRead =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'bytes'; url: string }
  /** `403`. The same sentence and the same disabled controls as the flag branch. */
  | { kind: 'refused' }
  /** The record lists a scan the store does not have. **No retry** — retrying cannot help. */
  | { kind: 'gone' }
  | { kind: 'failed'; cause: unknown }

/**
 * **The bytes, fetched when they are needed to draw something** — §6.5a.4's
 * ruling, which is neither eager nor on-demand-behind-a-control.
 *
 * `prefetch` is `true` for exactly one case: a row whose `file` is an image,
 * whose operator is permitted, and which the operator has just expanded. That
 * fetch draws the frame. Everything else asks for the bytes on a click, and a
 * row whose `file` is `null` never asks at all (AC-CP-126).
 *
 * ## Why this is not "eager"
 *
 * §6.1 rules **one row open at a time**, so the list can cost at most one
 * in-flight read, ever. And `file === null` is the majority case by design —
 * 187 of the 255 seeded documents — so most expansions fetch nothing.
 *
 * ## Three things this hook owns that nothing else can
 *
 *   1. **The `AbortSignal`.** A captain has five rows and an operator
 *      expanding and collapsing faster than the reads resolve would otherwise
 *      race stale bytes into a row that has moved on. The signal is threaded
 *      end to end by the seam — `mock()` → `delayAbortable`, `http.bytes` →
 *      `fetch` — and an abort rejects with `code: 'aborted'`. **That is not a
 *      failed read and must never surface as one**: an abort is *us*
 *      cancelling, not the store breaking (AC-CP-128).
 *   2. **The object URL's whole lifecycle.** The read hands back a
 *      `Uint8Array`, deliberately, so no URL-shaped field ever goes on the
 *      record. So this creates the URL and **revokes it** — on collapse, on
 *      unmount, and when bytes replace bytes. An un-revoked blob URL per
 *      expansion is a leak no test catches and no operator reports; a captain
 *      has five rows and an operator opens many captains a shift.
 *      **Never on click** (AC-CP-130): a tab that has already loaded the
 *      resource is safe, a tab that has not yet is broken.
 *   3. **One in-flight request per row.** `Open scan` and `Download` clicked in
 *      succession share the pending promise rather than issuing two reads, and
 *      `Try again` re-issues exactly one (AC-CP-143).
 *
 * **No cache.** The read lives in the expanded row's own component and dies
 * with it, so re-expanding refetches. Accepted: a cache is an optimisation, not
 * a correctness requirement, and a keyed byte cache is a helper nobody has
 * asked for. If it becomes one it is utilities-engineer's, not this file's.
 */
function useScanBytes(documentId: string, prefetch: boolean) {
  const [state, setState] = useState<ScanRead>({ kind: 'idle' })
  const urlRef = useRef<string | null>(null)
  const pendingRef = useRef<Promise<string | null> | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const aliveRef = useRef(true)

  const release = useCallback(() => {
    if (urlRef.current === null) return
    URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
  }, [])

  /**
   * Resolves to the object URL, or to `null` when the read produced no bytes —
   * refused, gone, failed or aborted. The **caller never learns which**; the
   * console does, in the slot, in words. A caller that wanted to branch on the
   * reason would be a second place deciding what a `403` means.
   */
  const load = useCallback((): Promise<string | null> => {
    if (urlRef.current !== null) return Promise.resolve(urlRef.current)
    /* **A pending read whose controller was ABORTED is not reusable, and this
       clause is measured rather than defensive.** Under `StrictMode` React
       mounts, unmounts and remounts every effect: the first run started a read,
       the cleanup aborted it, and the second run — running synchronously in the
       same commit, before the rejection's microtask — was handed the dead
       promise back. It resolved to `null` and the slot sat on its skeleton
       **for as long as the row stayed open**. Measured in Chromium at
       `/entity/DRV-0101`: the licence frame never resolved. */
    if (pendingRef.current !== null && controllerRef.current?.signal.aborted !== true) {
      return pendingRef.current
    }

    const controller = new AbortController()
    controllerRef.current = controller
    setState({ kind: 'loading' })

    /* Nothing lands after the row has collapsed. The abort above cancels the
       request; this guards the resolution that was already in flight. */
    const settle = (next: ScanRead): null => {
      if (aliveRef.current) setState(next)
      return null
    }

    const pending = getComplianceDocumentFile(documentId, controller.signal)
      .then((read) => {
        if (!aliveRef.current) return null
        /* **`no-file-on-record` RESOLVES and is not an error** — but this row's
           record carries a `file`, so reaching it here means the record and the
           object store have diverged. That is state F, not state A: A is *the
           record never had a scan*, and the two never share a sentence. */
        if (read.outcome === 'no-file-on-record') return settle({ kind: 'gone' })
        release()
        /* **The copy is not incidental and is not a type workaround.** The read
           returns a `Uint8Array`, which may be a VIEW onto a larger buffer with
           its own `byteOffset` — handing `.buffer` to `Blob` would attach the
           wrong bytes. Re-wrapping copies exactly this view's range, and the
           `Blob` constructor copies again regardless, so the transient cost is
           one file. It also gives TypeScript the `ArrayBuffer`-backed array its
           `BlobPart` requires without a cast. */
        const url = URL.createObjectURL(
          new Blob([new Uint8Array(read.bytes)], { type: read.mimeType }),
        )
        urlRef.current = url
        settle({ kind: 'bytes', url })
        return url
      })
      .catch((cause: unknown) => {
        /* An abort is us cancelling. It is not a failure, it draws nothing, and
           it must not repaint a row that has already collapsed. */
        if (isApiError(cause) && cause.code === 'aborted') return null
        if (!aliveRef.current) return null
        /* `403` — the permission was revoked mid-session, or the flag and the
           gate disagree. Same key, same wording, same disabled controls as the
           flag branch: it is the same fact arriving late (AC-CP-142). */
        if (isApiError(cause) && cause.kind === 'forbidden') return settle({ kind: 'refused' })
        /* `404`. §6.5a's finding Q scopes this row to *a document whose record
           carries a `file`* — which is the only condition under which this hook
           ever runs — so it is the same divergence `no-file-on-record` reports
           and takes the same sentence. It is `retryable: false` either way. */
        if (isApiError(cause) && cause.kind === 'not-found') return settle({ kind: 'gone' })
        return settle({ kind: 'failed', cause })
      })

    pendingRef.current = pending.finally(() => {
      pendingRef.current = null
    })
    return pendingRef.current
  }, [documentId, release])

  useEffect(() => {
    aliveRef.current = true
    if (prefetch) void load()
    return () => {
      aliveRef.current = false
      controllerRef.current?.abort()
      /* The aborted request is no longer a read anybody can be given. Clearing
         it here rather than waiting for the rejection's microtask is what makes
         a remount start a fresh read instead of adopting a dead one. */
      pendingRef.current = null
      release()
    }
  }, [prefetch, load, release])

  /**
   * **The tab is opened SYNCHRONOUSLY inside the gesture and its location is
   * set when the read resolves** (AC-CP-119).
   *
   * For an image the bytes are already in hand and the question does not arise;
   * for a PDF they are not, and any `await` before `window.open` is a popup the
   * browser blocks. First click, both branches, no interstitial, no second
   * click — the requirement is not negotiable and this is the standard pattern
   * §6.5a.4 names for it.
   *
   * **Focus is never moved** (AC-CP-117). Nothing traps, nothing scrims,
   * nothing is restored on return, because nothing was taken.
   */
  const openInNewTab = useCallback(() => {
    const tab = window.open('', '_blank')
    if (tab === null) return
    /* The blob URL is same-origin, so `opener` grants a document nothing it did
       not already have; severed anyway, for the reason `rel="noopener"` is on
       every other link that leaves this console. */
    tab.opener = null
    void load().then((url) => {
      /* Refused, gone or failed. The console diagnoses it — in the slot, in
         words, before the tab could have rendered a JSON `403` an operator
         cannot act on, which is the whole reason the bytes go through the seam
         rather than an anchor pointed at a raw API URL. */
      if (url === null) {
        tab.close()
        return
      }
      tab.location.href = url
    })
  }, [load])

  /**
   * **`file.name`, verbatim** — data, never translated, never transliterated,
   * digits never normalised (AC-CP-133, §9B item 5). `DRV-0201` carries two
   * Arabic filenames, one with Arabic-Indic digits, seeded deliberately as the
   * hardest bidi case on this surface.
   *
   * No toast (AC-CP-134): the browser's own download UI is the confirmation,
   * and this surface mutates nothing.
   */
  const download = useCallback(
    (fileName: string) => {
      void load().then((url) => {
        if (url === null) return
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = fileName
        anchor.rel = 'noopener'
        document.body.append(anchor)
        anchor.click()
        anchor.remove()
      })
    },
    [load],
  )

  /** Exactly one request, and only from state E. §11.2's `Try again`. */
  const retry = useCallback(() => {
    void load()
  }, [load])

  return { state, openInNewTab, download, retry }
}

export interface DriverDocumentRecordProps {
  /** The whole record, carried by `DocumentRow.doc` — never four copied fields. */
  doc: ComplianceDoc
  /**
   * The row's own translated document-type label — `DocumentRow.label`, the
   * same string the row heading renders.
   *
   * It is passed rather than derived so the accessible name and the heading
   * cannot disagree. `Open scan` alone is ambiguous to anyone who cannot see
   * which of five rows it is in, so **both control names name their document**
   * (§6.5a.7, AC-CP-138) — one key, one named param, never concatenated.
   */
  label: string
  /**
   * `view_operations`, and it gates **the scan, never the record**.
   *
   * §6.3 is explicit and the shipped implementation had it wrong: *"the gate
   * attaches to the bytes, not to the metadata … the scan record renders for
   * every operator who can open the profile."* A filename, a size and an
   * uploader are administrative facts about a record; a scan is a photograph of
   * a government identity document, and only the second one gets the gate.
   *
   * So a refused operator sees the **whole record row** and two controls
   * **disabled in place** with one sentence beneath them — §11.2's shape, which
   * §6.3 kept whole for the day there was a control to disable. That day is
   * this one. The row's EXPANSION is still never gated (AC-CP-40).
   */
  canViewFile: boolean
  t: Translator
  language: Language
}

/**
 * **The file slot — the scan's record, its preview, and the two controls that
 * hand the bytes to the browser** (D-CP-15, §6.5a).
 *
 * ```
 *  ┌───────────────────────────────────────────────┐  rounded-lg border
 *  │  ┌───────────────────────┐                    │
 *  │  │     [ the scan ]      │  240 x 160, fixed  │  the preview
 *  │  └───────────────────────┘                    │
 *  │  national-id-DRV-0101.jpg                     │  the record row
 *  │  JPG . 1.2 MB                                 │
 *  │  Uploaded 4 Jun 2026 by Layla Al-Otaibi       │
 *  │  [ Open scan ↗ ] [ Download ]                 │  the two controls
 *  └───────────────────────────────────────────────┘
 * ```
 *
 * ## The inspection is a new browser tab, on BOTH surfaces
 *
 * `DESIGN.md`:3134 forbids nesting a modal inside a drawer and the captain
 * sheet is a drawer. `Open scan` opens **no overlay on either surface**, so
 * that prohibition is never engaged — not deviated from, not worked around,
 * not argued past. One mechanism, one code path, one QA path. On the page,
 * where a modal was legal and would have kept the operator in context, the
 * better-in-context option is declined to hold parity (§3), and that is the
 * price §6.5a.1 pays deliberately.
 *
 * Two consequences make this answer cheap: **the focus contract is empty** —
 * no scrim, no trap, focus never moved, so returning from the tab needs no
 * restore — and **§6.6's `Escape` ladder is unchanged**, because neither
 * control opens a surface.
 *
 * ## A PDF gets no frame at all
 *
 * Not an empty one, not a placard, not a format chip in a box: an empty
 * bordered box is §6.4's exact prohibition one layer up, and *"a greyed tile
 * shape implies a file is loading or was refused — two different claims, both
 * false."* One sentence says why there is no picture instead, so *no preview
 * because PDF* is never mistaken for *no preview because it failed*.
 *
 * `<iframe>` / `<embed>` of the object URL was refused **for security, not
 * taste**: a PDF is an active document format and embedding an operator-supplied
 * one in the admin's own browsing context is an attack surface this console
 * does not need. A new tab is a *different* browsing context with the browser's
 * own sandboxed viewer. pdf.js was refused at ~300 KB for a first page the
 * operator sees in one click.
 *
 * ## Zoom, rotate and page-through are out of Eyvar and into the browser
 *
 * One decision, not three: building any of them means building a viewer,
 * building a viewer means building the overlay §5.5 forbids on one of the two
 * surfaces, and building it on one surface only is the divergence §3 refuses.
 * **Rotate is genuinely lost** — a sideways phone photo of a licence is a real
 * case, and legacy's five rejection reasons include *"Photo unclear / blurry"*.
 * `Download` is the escape hatch, and that is the second reason the two
 * controls ship together rather than one at a time.
 *
 * ## Six states, and no two share a sentence
 *
 * | | | Leading visual | Record row | Controls | Sentence |
 * |---|---|---|---|---|---|
 * | **A** | `file === null` | none | none | none | `No scan is stored for this document.` |
 * | **B** | refused (flag or `403`) | glyph | renders | disabled | `Opening a captain's scans needs the operations permission.` |
 * | **C** | in flight | skeleton (images only) | renders | disabled, no reason | none |
 * | **D** | bytes, image | the scan | renders | enabled | none |
 * | **D′** | bytes, PDF | glyph | renders | enabled | `A PDF has no preview. Open the scan to read it.` |
 * | **E** | failed | the error, in the frame's place | renders | disabled | `Couldn't load this scan. Try again.` + `Try again` |
 * | **F** | the store has no object | glyph | renders | disabled | `The record lists a scan that is no longer in storage.` — **no `Try again`** |
 *
 * **A versus E is the pair that matters and they are not the same fact.** A
 * says *the record never had a scan*; E says *the record has one and we could
 * not fetch it*. An operator acts differently: A is a compliance gap to chase
 * with the captain, E is a console fault to retry and then report. **F is the
 * third diagnosis** — the record and the object store have diverged — and it
 * carries no `Try again` because retrying cannot help, and no invented remedy
 * because this console cannot upload.
 *
 * ## The bytes are visibly samples, deliberately
 *
 * `fixtures/complianceScans.ts` composes real, decodable PNG / JPEG / PDF per
 * document, every one of which renders `NOT A REAL DOCUMENT` in the largest
 * type on the page — no licence border, no photograph, no seal, nothing with
 * the shape of a Saudi document. **The sample looking like a sample is the
 * feature**, so *"the preview shows a fake document"* is not a defect.
 * `bytes.byteLength` is consequently nothing like `file.sizeBytes` in mock
 * mode; **the meta line prints `file.sizeBytes`**, which is the record's claim
 * about a real upload, and reporting the payload length instead would be
 * correct against the mock and wrong against every real store.
 *
 * ## Every line in the slot is a `<span className="block">`, and that is forced
 *
 * `ui/accordion.tsx`'s content wrapper carries `[&_p:not(:last-child)]:mb-4` —
 * a **descendant** selector, so it reaches every `<p>` anywhere inside an
 * expanded panel and imposes 16px of prose spacing on it. Measured in Chromium
 * at `/entity/DRV-0101`: the shipped record row's `JPG · 1.8 MB` line computed
 * `margin-bottom: 16px` against the 2px the design draws, and a local `mb-0`
 * does **not** win — `.wrapper p:not(:last-child)` is (0,2,1) against a plain
 * utility's (0,1,0).
 *
 * So the slot's lines are `<span className="block">`. **Do not "fix" them back
 * to paragraphs**: the fix belongs in the primitive, which this task may not
 * edit, and it is reported to `ui/accordion.tsx`'s owner. The one `<p>` left in
 * the panel is the derivation sentence, which is the last child and therefore
 * unaffected.
 *
 * Rules applied
 *   §11.2      a blocked control is disabled IN PLACE with its reason as real
 *              text, `aria-describedby`-linked. Never hidden, never a tooltip.
 *              **One sentence serves both controls** — two identical refusals
 *              stacked is not twice as clear (AC-CP-141).
 *   §11.3      loading is a `Skeleton` of the frame's exact box, never a
 *              spinner, so nothing shifts when the bytes land.
 *   D-CP-6     **neither control is filled.** `secondary` is white surface,
 *              hairline, ink label — the everyday control. D-CP-6 refuses a
 *              *filled* button on the ground that one in a drawer is the
 *              affordance for a commit, and neither of these commits anything.
 *   §9.5/§9B   `↗` is a fixed external-link mark and **does not mirror**. The
 *              frame's POSITION mirrors; the pixels inside it never do — a
 *              `scaleX(-1)` on a document image would print a mirrored
 *              national ID (AC-CP-150).
 *   §7.2       the frame is **never focused**, so the visible-focus rule is
 *              satisfied by the two named buttons and never applies to it.
 */
export function DriverDocumentRecord({
  doc,
  label,
  canViewFile,
  t,
  language,
}: DriverDocumentRecordProps) {
  const file = doc.file
  /* **The branch is `file.mimeType` — the RECORD's field, never the response's
     content type** (AC-CP-129). It is therefore decided before the read
     resolves, which is the whole point of branching on the record: nothing
     changes position when the bytes arrive. */
  const isImage = file !== null && file.mimeType !== 'application/pdf'
  const scan = useScanBytes(doc.id, file !== null && canViewFile && isImage)
  const reasonId = useId()

  /* §6.4 / state A — one grey sentence in the file slot's place. **No tile
     outline, no glyph, no placeholder image**: a greyed tile shape implies a
     file is loading or was refused, and those are two different claims, both
     false. No em dash either — §8.3.1 reserves `—` for
     not-applicable-or-unknown and a dash is *"a claim that the number exists
     somewhere"*. This is a claim that it does not. */
  if (file === null) {
    return (
      <span className="block text-xs text-muted-foreground">
        {t('profile.driver.documents.noScan')}
      </span>
    )
  }

  const read = scan.state
  /* The flag and a late `403` are **the same fact**, so they are one branch and
     one sentence (AC-CP-142). */
  const refused = !canViewFile || read.kind === 'refused'
  const gone = !refused && read.kind === 'gone'
  const failed = !refused && read.kind === 'failed'
  /* **The controls render in EVERY state, enabled or disabled, and are never
     hidden** (§11.2, AC-CP-135). Hidden controls make a permission and an
     absent file indistinguishable, and those are opposite facts.

     `idle` splits by media type and that is the fetch policy showing through
     (§6.5a.4). **A PDF sits at `idle` until a control is clicked** — nothing is
     in flight, the click is what starts the read, so the controls are live. **An
     image is at `idle` for one painted frame** before its expansion-time read
     begins, and live controls in that frame would flicker to disabled; it
     blocks with the read it is about to make. */
  const blocked =
    refused || gone || failed || read.kind === 'loading' || (isImage && read.kind === 'idle')
  /* **Exactly one leading visual** (AC-CP-120): the frame when the mimeType is
     an image, the operator is permitted and the read has not come back empty;
     the `▤` glyph in every other case. Never both, never neither. In state E
     the error takes the frame's place, which is still one visual. */
  const framed = isImage && !refused && !gone

  /**
   * State E, in one of its two places.
   *
   * `boxed` is **the frame's exact 240 × 160 box**, so an image row's panel
   * height does not move between the skeleton, the scan and the failure — the
   * error genuinely *replaces the frame* rather than displacing everything
   * under it.
   *
   * **A PDF gets the unboxed one, and that is AC-CP-122 rather than taste.** A
   * PDF renders no frame *in any state*, so a 240 × 160 error card on a PDF row
   * would draw the frame-shaped thing that criterion forbids — an empty
   * bordered box, §6.4's exact prohibition, with an apology in it. There is no
   * frame to replace, so the error takes the sentence's place at the
   * inline-start and reads as one.
   */
  const scanError = (boxed: boolean) => (
    <ErrorState
      scope="card"
      card={false}
      className={boxed ? 'h-40 w-60 justify-center px-3 py-0' : 'items-start px-0 py-1 text-start'}
      message={t('profile.driver.documents.scanError')}
      action={{ label: t('profile.state.retry'), onClick: scan.retry }}
      /* `ApiError.retryable` decides whether the action renders at all. A
         refusal never reaches here, but a `502 unsupported_media_type` is a
         failure that a retry cannot fix, and `ErrorState` drops the button for
         it rather than 78 call sites each remembering to. */
      cause={read.kind === 'failed' ? read.cause : undefined}
    />
  )

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-2">
      {/* ── the preview frame (§6.5a.2) ──────────────────────────────────
          240 x 160, fixed, `object-fit: contain`, identical on the sheet and
          the page. A landscape ID fills it; a portrait page renders 113 x 160
          centred with grey either side. Enough to answer *is this the right
          paper, is it blank, is it sideways, is it legible* — which is the
          question a preview answers. It is **not** enough to read a document
          number, which is the question `Open scan` answers. Two sizes, two
          questions, two controls.

          A horizontal composition would fit the page's ~872px column and is
          **refused**: §5.2's *one composition, both surfaces*. It does not fit
          at 448, so a second composition would be a second component. */}
      {framed &&
        (read.kind === 'bytes' ? (
          /* **A redundant MOUSE target, and it adds no tab stop**
             (AC-CP-136/137). Clicking the preview opens the scan — that gesture
             is instinctive and refusing it would read as broken — but it is the
             **same act** as the button beneath, so it gets no second accessible
             name, no second tab stop and no focus ring, because it is never
             focused. `aria-hidden` + `tabIndex={-1}` is what makes that true,
             and it is why §7.4's *a clickable thing is a button* is answered
             here by the named button 8px below rather than by this element.

             `alt=""`, deliberately. A descriptive alt would be a **lie** —
             `alt="Scan of the national ID"` asserts what is in an image nobody
             on this team has read — and a restating one would repeat the line
             directly beneath it. What a screen-reader operator gets instead is
             the record row, and it is already on screen: the type, the state,
             the expiry, the countdown, the file name, the kind, the size, the
             upload date and the uploader. Everything the pixels could be
             honestly described as is already text. */
          <div
            aria-hidden="true"
            tabIndex={-1}
            onClick={scan.openInNewTab}
            className="flex h-40 w-60 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-border bg-muted"
          >
            {/* **No `scaleX(-1)`, no `rtl:` flip, ever** (AC-CP-150). The
                frame's position mirrors with the document; the pixels inside it
                do not. A mirrored national ID is a defect of the first order. */}
            <img src={read.url} alt="" className="max-h-full max-w-full object-contain" />
          </div>
        ) : failed ? (
          scanError(true)
        ) : (
          /* §11.3 — a `Skeleton` of the frame's exact 240 x 160 box, never a
             spinner, so nothing shifts when the bytes land. **A PDF renders no
             frame skeleton**, because a PDF never has a frame — the `mimeType`
             branch is decided before the read resolves, which is the point of
             branching on the record and not on the response (AC-CP-145). */
          <Skeleton className="h-40 w-60 rounded-md" />
        ))}

      {/* ── the record row (§6.5, unchanged) ────────────────────────────
          Four facts a real system holds *beside* the object. It earns its
          border by carrying them, not by standing in for a control, and
          **nothing about it suggests it opens**: no chevron, no underline, no
          hover fill, no focus ring, no pointer cursor, and it is not in the tab
          order (AC-CP-146's posture, §6.5's). */}
      <div className="flex items-start gap-2">
        {/* The glyph and the frame are **alternatives, never both** — one rule:
            the file slot renders exactly one leading visual. Two pictures of
            one file is one too many. Decorative: every fact it stands for is
            also a word beside it (§7.5). */}
        {!framed && (
          <FileTextIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          {/* **`<bdi>`, and it matters here more than anywhere else on the
              surface.** The name is DATA — never translated, never
              transliterated — and it renders in whichever script it was saved
              in. `DRV-0201` carries two Arabic file names, one with
              Arabic-Indic digits, which is the hardest bidi case on this screen
              and is seeded rather than discovered in production. */}
          <bdi className="text-sm break-words text-foreground">{file.name}</bdi>
          <span className="block text-xs text-muted-foreground">
            {/* Two `<bdi>` runs and an `aria-hidden` separator NODE, not a
                joined string (§9.6) — the same construction line two uses for
                the date and the countdown, and the reason §8.1's `fileMeta` key
                has no consumer and is not declared.

                **`file.sizeBytes`, never `bytes.byteLength`.** In mock mode the
                sample PDF is 867 bytes against a record claiming 3.4 MB, and
                that mismatch is a documented property with a test guarding it:
                the record's size is a claim about a real upload, the bytes are
                a sample of the pipeline. */}
            <bdi>{COMPLIANCE_DOC_FILE_KIND[file.mimeType]}</bdi>
            <span aria-hidden="true"> · </span>
            <bdi className="tabular-nums">{formatFileSize(file.sizeBytes, t, language)}</bdi>
          </span>
          {/* **When the scan arrived, and who sent it — not when the date was
              recorded**, and the two differ on real rows: `DRV-0104`'s
              inspection is `expired` and its scan was uploaded for the year it
              covered. A tile that names a file without saying when it arrived
              invites an operator to read a lapsed certificate as a current one.

              `uploadedByUserId === null` means the captain sent it from the
              driver app and `uploadedByUserName` is then their own name — one
              actor vocabulary (`LegAcknowledgement`'s), not a second. There is
              no anonymous upload, so `Unknown`, `Anonymous` and `—` appear
              nowhere in this line. */}
          <span className="block text-xs text-muted-foreground">
            {t('profile.driver.documents.uploaded', {
              date: formatDate(file.uploadedAt, { style: 'day-month-year', language }),
              name: file.uploadedByUserName,
            })}
          </span>
        </div>
      </div>

      {/* ── the one sentence, when there is one ─────────────────────────
          At most one renders. Conflating any two of these is the V-2 defect
          (`states.md`) and each names a different act for the operator. */}
      {refused ? (
        /* §11.2 / B. Real text, `aria-describedby`-linked from BOTH controls,
           never hidden and never a tooltip — a hover-only explanation is
           unreachable by keyboard and unreachable on touch. */
        <span id={reasonId} className="block text-xs text-muted-foreground">
          {t('profile.driver.refusal.viewDocument')}
        </span>
      ) : gone ? (
        /* F. States what happened and stops. **No `Try again`**, because
           retrying cannot help and offering it would be a lie in the shape of a
           remedy; **no invented remedy**, because this console cannot upload
           and an instruction naming an act this surface does not have is a
           remedy in name only (AC-CP-144). */
        <span className="block text-xs text-muted-foreground">
          {t('profile.driver.documents.scanGone')}
        </span>
      ) : failed && !isImage ? (
        /* E on a PDF. There is no frame to replace, so the error takes the
           sentence's place, unboxed — a 240 x 160 card here would be the empty
           bordered box AC-CP-122 forbids on a PDF in every state. */
        scanError(false)
      ) : !isImage && !failed ? (
        /* D′. The sentence names the control by its visible words so the
           pointer is followable (copy.md rule 5), and it renders from the
           moment the row is expanded rather than only once bytes exist — the
           `mimeType` branch is known before the read, and a sentence that
           appeared and vanished around a fetch would be the position shift
           AC-CP-129 exists to stop. */
        <span className="block text-xs text-muted-foreground">
          {t('profile.driver.documents.pdfNoPreview')}
        </span>
      ) : null}

      {/* ── the two controls (§6.5a.9) ──────────────────────────────────
          Every other control on either captain surface **goes somewhere in the
          app** and is correctly a link. These two are the first that **do
          something**, so they are buttons — and both of them, at one weight: a
          link beside a button is two grammars on one row.

          `Open scan` first, `gap-2`, at the inline-start of the slot's last
          row, in the same source order in both directions, so their visual
          order reverses with `dir` and their reading order does not (§9B item
          2). Arithmetic at 448: `Open scan ↗` ~102 + `Download` ~78 + 8 = 188
          in ~400 of slot-inner width, which leaves the headroom Arabic needs. */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="default"
          disabled={blocked}
          aria-describedby={refused ? reasonId : undefined}
          /* **One key, one named param, never concatenated** (§9.6, AC-75). It
             contains the visible label `Open scan` contiguously, which is what
             WCAG 2.5.3 (Label in Name) requires and what `Open the {document}
             scan in a new tab` would have failed. */
          aria-label={t('profile.driver.documents.openScanNamed', { document: label })}
          onClick={scan.openInNewTab}
        >
          {t('profile.driver.documents.openScan')}
          {/* §9.5 — the external-link mark, and the only glyph this section
              adds. It does **not** mirror: it is fixed, not directional, and
              §5.3 already reserved it for exactly this control. */}
          <span aria-hidden="true">↗</span>
        </Button>
        <Button
          variant="secondary"
          size="default"
          disabled={blocked}
          aria-describedby={refused ? reasonId : undefined}
          aria-label={t('profile.driver.documents.downloadNamed', { document: label })}
          onClick={() => scan.download(file.name)}
        >
          {t('profile.driver.documents.download')}
        </Button>
      </div>
    </div>
  )
}
