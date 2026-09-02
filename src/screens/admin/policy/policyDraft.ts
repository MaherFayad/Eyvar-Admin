/**
 * The editor's draft, and the reason legacy F-014 cannot happen here.
 *
 * ## What F-014 was
 *
 * `renderReasonCodesTable` (`eyvar_ops_panel_v40_fixed.html:15083`) filled the
 * target input with the **effective** value — `value="'+tg.fr+'"`, where
 * `tg = rcTargets(code)` has already resolved inheritance. `saveReasonCodes`
 * (`:15104`) then read that same input straight back:
 *
 * ```js
 * rc[f] = inp.value === '' ? null : parseInt(inp.value, 10)
 * ```
 *
 * So one save with **no edit at all** turned every inherited target into an
 * explicit override carrying the tier's number of the moment. Inheritance was
 * flattened for all 40 codes, and every later change to a tier default stopped
 * propagating — silently, because the numbers on screen did not move.
 *
 * The clue that it was a round-trip defect and not a save defect is one column
 * to the right: `upd` renders `r.upd` **raw**, with an em-dash placeholder
 * (`:15085`), and `upd` round-trips correctly. Same save function, same loop,
 * different render. Two of three clock fields were lost; the third was fine.
 *
 * ## What stops it here — three things, none of them a code review
 *
 * 1. **An inherited cell is not an input.** `cellState()` returns `inherited`
 *    or `overridden`, and the UI renders the first as *text plus an `Override`
 *    button*. There is no field bound to an inherited value, so there is
 *    nothing for a save to read back. The whole defect class needs an input to
 *    live in.
 * 2. **The draft IS the wire shape.** `draftToInput` is the identity function
 *    on every field. F-014 lived inside a mapping between what was displayed
 *    and what was stored; there is no mapping.
 * 3. **`null` never leaves this module resolved.** `effectiveSlaTargets` is
 *    called for *display only* and its result is never written back. The one
 *    function that turns an inherited cell into a number —
 *    `overrideSlaTarget` — is reachable only from a button the operator
 *    presses, and it is named after what it does.
 *
 * `flattenSlaPolicy` at the bottom is the defect, reproduced deliberately, so
 * the regression test can prove its own instrument works. It is exported for
 * tests and for the QA lever in `clients/policy.ts`; **nothing in the UI calls
 * it.**
 */

import {
  SLA_TIER_KEYS,
  effectiveSlaTargets,
  type DispatchPolicy,
  type OperatingCityInput,
  type OperationalPolicy,
  type SafetyLimits,
  type SaveOperationalPolicyInput,
  type SlaPolicy,
  type SlaTierKey,
  type WorkQueueId,
} from '@/data/types/policy'

/** The two SLA numbers a cell holds. Named so a call site cannot pass a typo'd string. */
export type SlaTargetField = 'firstResponseMinutes' | 'resolutionMinutes'

export const SLA_TARGET_FIELDS: readonly SlaTargetField[] = [
  'firstResponseMinutes',
  'resolutionMinutes',
]

/**
 * The draft is `SaveOperationalPolicyInput` and nothing else.
 *
 * Declared as its own name rather than an alias so the intent survives a
 * refactor: if these two ever need to differ, the difference gets a mapping,
 * and the mapping gets the scrutiny F-014 earned.
 */
export interface PolicyDraft {
  dispatch: DispatchPolicy
  cities: OperatingCityInput[]
  limits: SafetyLimits
  sla: SlaPolicy
}

/* ───────────────────── load and save ───────────────────── */

/**
 * The document, minus what the operator may not write.
 *
 * `activeCaptains` is dropped **here**, at the one edge where it can be, rather
 * than being carried through the draft and stripped at the seam. A derived
 * value inside an editable draft is a derived value one careless spread away
 * from being written back.
 */
export function draftFromPolicy(policy: OperationalPolicy): PolicyDraft {
  return {
    dispatch: { ...policy.dispatch },
    cities: policy.cities.map(({ activeCaptains: _derived, ...city }) => ({ ...city })),
    limits: { ...policy.limits },
    sla: {
      ...policy.sla,
      tiers: policy.sla.tiers.map((tier) => ({ ...tier })),
      queues: policy.sla.queues.map((queue) => ({
        ...queue,
        tiers: queue.tiers.map((cell) => ({ ...cell })),
        breach: { ...queue.breach },
      })),
    },
  }
}

/**
 * The identity function, and it is deliberately still a function.
 *
 * It is the seam a reviewer looks at when asking *"does the save resolve
 * anything?"* — and the answer is visible in four lines rather than distributed
 * across a render.
 */
export function draftToInput(draft: PolicyDraft): SaveOperationalPolicyInput {
  return {
    dispatch: draft.dispatch,
    cities: draft.cities,
    limits: draft.limits,
    sla: draft.sla,
  }
}

/** Whether anything at all has moved. Structural, so a re-render alone is never dirty. */
export function isDraftDirty(draft: PolicyDraft, policy: OperationalPolicy): boolean {
  return JSON.stringify(draftToInput(draft)) !== JSON.stringify(draftToInput(draftFromPolicy(policy)))
}

/* ───────────────────── the SLA grid ───────────────────── */

export type SlaCellState = 'inherited' | 'overridden'

export interface SlaCellView {
  queueId: WorkQueueId
  tier: SlaTierKey
  field: SlaTargetField
  state: SlaCellState
  /** What the queue answers on today, whichever way it got there. */
  effectiveMinutes: number
  /** What it would fall back to. Rendered beside an override so the cost of it is visible. */
  tierMinutes: number
}

/**
 * Everything the cell needs to render, computed once, in one place.
 *
 * The **`inherited` branch has no editable value**, which is the point: a view
 * model that cannot express "an input holding an inherited number" cannot
 * produce a UI that flattens one.
 */
export function slaCellView(
  draft: PolicyDraft,
  queueId: WorkQueueId,
  tier: SlaTierKey,
  field: SlaTargetField,
): SlaCellView {
  const cell = findCell(draft, queueId, tier)
  const effective = effectiveSlaTargets(draft.sla, queueId, tier)
  const tierDefault = draft.sla.tiers.find((each) => each.key === tier)
  if (!tierDefault) throw new Error(`No SLA tier default for ${tier}`)

  const isFirstResponse = field === 'firstResponseMinutes'
  return {
    queueId,
    tier,
    field,
    state: cell[field] === null ? 'inherited' : 'overridden',
    effectiveMinutes: isFirstResponse
      ? effective.firstResponse.minutes
      : effective.resolution.minutes,
    tierMinutes: isFirstResponse
      ? tierDefault.firstResponseMinutes
      : tierDefault.resolutionMinutes,
  }
}

/**
 * Turn an inherited cell into an override, seeded with the number it inherits.
 *
 * **This is the only path from `null` to a number, and it takes a deliberate
 * press.** Legacy took the same step on every render, for every cell, with
 * nobody pressing anything.
 */
export function overrideSlaTarget(
  draft: PolicyDraft,
  queueId: WorkQueueId,
  tier: SlaTierKey,
  field: SlaTargetField,
): PolicyDraft {
  const view = slaCellView(draft, queueId, tier, field)
  return setSlaTarget(draft, queueId, tier, field, view.tierMinutes)
}

/** Put a cell back on the tier. The control §11.2 owes an operator who overrode by mistake. */
export function revertSlaTarget(
  draft: PolicyDraft,
  queueId: WorkQueueId,
  tier: SlaTierKey,
  field: SlaTargetField,
): PolicyDraft {
  return setSlaTarget(draft, queueId, tier, field, null)
}

/**
 * Write a cell. `null` is inherit; a number is an override.
 *
 * A blank input arrives as `null` from `parseWholeNumber`, which is **not** the
 * same decision legacy made at `:15104` — there, blank meant `null` too, but a
 * pre-filled number meant an override, and every input was pre-filled. Here
 * only an overridden cell has an input at all, so a blank one is an operator
 * clearing an override they created.
 */
export function setSlaTarget(
  draft: PolicyDraft,
  queueId: WorkQueueId,
  tier: SlaTierKey,
  field: SlaTargetField,
  value: number | null,
): PolicyDraft {
  return {
    ...draft,
    sla: {
      ...draft.sla,
      queues: draft.sla.queues.map((queue) =>
        queue.queueId !== queueId
          ? queue
          : {
              ...queue,
              tiers: queue.tiers.map((cell) =>
                cell.tier === tier ? { ...cell, [field]: value } : cell,
              ),
            },
      ),
    },
  }
}

export function setBreachPolicy(
  draft: PolicyDraft,
  queueId: WorkQueueId,
  patch: Partial<SlaPolicy['queues'][number]['breach']>,
): PolicyDraft {
  return {
    ...draft,
    sla: {
      ...draft.sla,
      queues: draft.sla.queues.map((queue) =>
        queue.queueId === queueId ? { ...queue, breach: { ...queue.breach, ...patch } } : queue,
      ),
    },
  }
}

export function setTierDefault(
  draft: PolicyDraft,
  tier: SlaTierKey,
  patch: Partial<SlaPolicy['tiers'][number]>,
): PolicyDraft {
  return {
    ...draft,
    sla: {
      ...draft.sla,
      tiers: draft.sla.tiers.map((each) => (each.key === tier ? { ...each, ...patch } : each)),
    },
  }
}

export function setSlaThreshold(
  draft: PolicyDraft,
  field: 'atRiskPercent' | 'uncodedCeilingPercent',
  value: number,
): PolicyDraft {
  return { ...draft, sla: { ...draft.sla, [field]: value } }
}

/** How many of the grid's cells carry an override, and how many cells there are. */
export function overrideTally(draft: PolicyDraft): { overridden: number; total: number } {
  let overridden = 0
  for (const queue of draft.sla.queues) {
    for (const cell of queue.tiers) {
      for (const field of SLA_TARGET_FIELDS) if (cell[field] !== null) overridden += 1
    }
  }
  return {
    overridden,
    total: draft.sla.queues.length * SLA_TIER_KEYS.length * SLA_TARGET_FIELDS.length,
  }
}

function findCell(draft: PolicyDraft, queueId: WorkQueueId, tier: SlaTierKey) {
  const queue = draft.sla.queues.find((each) => each.queueId === queueId)
  if (!queue) throw new Error(`No SLA policy for queue ${queueId}`)
  const cell = queue.tiers.find((each) => each.tier === tier)
  if (!cell) throw new Error(`No ${tier} row in the SLA policy for queue ${queueId}`)
  return cell
}

/* ───────────────── dispatch, cities, limits ───────────────── */

export function setDispatch(draft: PolicyDraft, patch: Partial<DispatchPolicy>): PolicyDraft {
  return { ...draft, dispatch: { ...draft.dispatch, ...patch } }
}

export function setLimits(draft: PolicyDraft, patch: Partial<SafetyLimits>): PolicyDraft {
  return { ...draft, limits: { ...draft.limits, ...patch } }
}

export function toggleCityService(
  draft: PolicyDraft,
  cityId: string,
  service: 'quickRidesEnabled' | 'subscriptionsEnabled',
): PolicyDraft {
  return {
    ...draft,
    cities: draft.cities.map((city) =>
      city.id === cityId ? { ...city, [service]: !city[service] } : city,
    ),
  }
}

/**
 * Add a city **to the draft**, not to the product.
 *
 * Legacy's `handleAddCity` toasted *"City {name} added to operating regions"*
 * the moment the dialog closed, over a `useState` array that no save ever
 * reached. The city joins the draft here and the save bar is what applies it —
 * so the message the operator gets matches what happened.
 *
 * The id is derived from the name, not from `cities.length`: legacy's
 * `CITY-0${length + 1}` (`AdminPolicyScreen.tsx:96`) collides the moment a city
 * is removed and another added, and produces `CITY-010` at ten.
 */
export function addCity(
  draft: PolicyDraft,
  input: { nameEn: string; nameAr: string },
): PolicyDraft {
  const id = cityId(input.nameEn, draft.cities)
  return {
    ...draft,
    cities: [
      ...draft.cities,
      {
        id,
        nameEn: input.nameEn.trim(),
        nameAr: input.nameAr.trim(),
        quickRidesEnabled: true,
        subscriptionsEnabled: true,
      },
    ],
  }
}

/** `Riyadh` → `CITY-RIYADH`, then `-2`, `-3` … if that is taken. Stable and greppable. */
function cityId(nameEn: string, existing: readonly OperatingCityInput[]): string {
  const base = `CITY-${nameEn.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '')}`
  if (!existing.some((city) => city.id === base)) return base
  let suffix = 2
  while (existing.some((city) => city.id === `${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

/** Whether a name is already in the draft. Case- and whitespace-insensitive. */
export function cityExists(draft: PolicyDraft, nameEn: string): boolean {
  const needle = nameEn.trim().toLowerCase()
  return draft.cities.some((city) => city.nameEn.trim().toLowerCase() === needle)
}

/* ───────────────────────── units ───────────────────────── */

/**
 * **Every editable number on this screen is an integer in its base unit, and
 * the field edits that integer.** Metres, seconds, minutes, percent.
 *
 * The alternative — a kilometre field over a metre store — needs a parser and a
 * formatter that must agree, and they do not: a controlled input showing
 * `(5000/1000).toFixed(1)` cannot hold the intermediate `5.` an operator types
 * on the way to `5.5`. That is the same class of defect as F-014 one unit down,
 * a round trip that loses information, so there is no conversion on the way in.
 *
 * These two are **display only**. They render the second half of a help line —
 * `5000 metres · 5.0 km` — and nothing reads them back.
 */
export function metresAsKm(metres: number): string {
  return (metres / 1000).toFixed(1)
}

export function minutesAsHours(minutes: number): string {
  return (minutes / 60).toFixed(minutes % 60 === 0 ? 0 : 1)
}

/**
 * A number field's value, or `null` for blank.
 *
 * **`null` is not `0`.** `parseInt('') || 0` — legacy's `gv()` at `:12984`, and
 * the reason D-F3 exists — turns an empty field into a zero, and a zero SLA
 * target means *breach on arrival*. A blank field is refused by the seam
 * instead.
 */
export function parseWholeNumber(text: string): number | null {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  if (!Number.isInteger(value) || value < 0) return null
  return value
}

/* ─────────────────── the defect, on purpose ─────────────────── */

/**
 * **Legacy's round trip, reproduced.** Resolves every inherited cell to the
 * number it currently inherits and stores it as an explicit override — exactly
 * what `renderReasonCodesTable` + `saveReasonCodes` did between them.
 *
 * It exists so `policy.test.ts` can prove its own instrument: a regression test
 * that asserts *"no field gained an override"* is worthless unless something
 * can make a field gain one, and this is that something. **No component imports
 * it.**
 */
export function flattenSlaPolicy(sla: SlaPolicy): SlaPolicy {
  return {
    ...sla,
    queues: sla.queues.map((queue) => ({
      ...queue,
      tiers: queue.tiers.map((cell) => {
        const tierDefault = sla.tiers.find((each) => each.key === cell.tier)
        if (!tierDefault) throw new Error(`No SLA tier default for ${cell.tier}`)
        return {
          tier: cell.tier,
          firstResponseMinutes: cell.firstResponseMinutes ?? tierDefault.firstResponseMinutes,
          resolutionMinutes: cell.resolutionMinutes ?? tierDefault.resolutionMinutes,
        }
      }),
    })),
  }
}
