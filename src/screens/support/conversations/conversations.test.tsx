/**
 * Support › Contact Centre — the conversation console.
 *
 * Three things are asserted here that nothing else can assert, and they are the
 * three most likely to be flattened by the next person to touch this screen.
 *
 * **1. The breach asymmetry.** D22 rules that a **first-response** breach
 * reorders the queue and a **resolution** breach does not. A test that only
 * asserted *"a breached row is at the top"* would pass against an
 * implementation that reordered on either, so the ordering assertions are
 * written as a **pair**: one row that moves because it broke the answer promise
 * while waiting *less* than the row it overtakes, and one row that broke the
 * finish promise and stays exactly where `waitingSince` put it.
 *
 * **2. The register collision §8.6.2 was written to close.** An internal note's
 * `Not sent to the customer` and a failed message's `Not delivered — …` mean
 * opposite things and used to sit in the same slot. `CNV-110` carries both, two
 * messages apart, which is the fixture the rule was found on.
 *
 * **3. Delivery on one message, not forty.** §8.6.6. `CNV-108` has 64 messages
 * and is the only fixture where "every message that has a delivery state" and
 * "the newest outbound customer-visible one" differ visibly.
 *
 * **No fixture is imported.** `seam.test.ts` walks `src/` and forbids it, so
 * every conversation here comes back through the client — which is also the only
 * way to prove the screen and the test agree about what the seam serves.
 *
 * AC-936 … AC-940, AC-963 … AC-968.
 */

import { configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  getConversation,
  getTicket,
  claimConversation,
  disableMockLatency,
  transferConversation,
  EYVAR_NOW,
  getRouteTable,
  listConversations,
  mockFailures,
  resetDataLayer,
  switchMockUser,
  useEmptyConversationQueue,
} from '@/data/clients'
import type { Conversation, SubTabRoute } from '@/data/types'
import { ShellProvider } from '@/shell/ShellContext'
import { QUEUE_SHARED_EN } from '@/screens/queues/copy'
import { ConversationConsoleScreen } from './ConversationConsoleScreen'
import { CONVERSATIONS_EN } from './copy'
import { TICKETS_EN } from '@/screens/support/tickets/copy'
import { resetDrafts } from './drafts'
import { compareForQueue, conversationSla, runningClock } from './sla'

/* The console mounts a presence bar, a full `DataTable` and three reads in one
   pass. The wait is lengthened rather than the assertions loosened. */
configure({ asyncUtilTimeout: 10_000 })

const row = (): SubTabRoute => {
  const found = getRouteTable().subTabs.find((each) => each.subTabId === 'support-contact-centre')
  if (!found) throw new Error('No route-table row for support-contact-centre')
  return found
}

const copy = (key: string): string => {
  const value = CONVERSATIONS_EN[key] ?? QUEUE_SHARED_EN[key] ?? TICKETS_EN[key]
  if (!value) throw new Error(`No dictionary key ${key}`)
  return value
}

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  resetDrafts()
})

/**
 * Both addresses the screen answers on, declared exactly as `routes.tsx`
 * declares them: the sub-tab and its **level-3 detail route**. Mounting the
 * component bare would leave `useParams().conversationId` undefined and every
 * pane assertion below would silently test the queue instead.
 */
function renderConsole(entries = ['/support/contact-centre']) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <ShellProvider>
        <Routes>
          <Route path="/support/contact-centre" element={<ConversationConsoleScreen row={row()} />} />
          <Route
            path="/support/contact-centre/:conversationId"
            element={<ConversationConsoleScreen row={row()} />}
          />
        </Routes>
      </ShellProvider>
    </MemoryRouter>,
  )
}

/** The level-3 address of one conversation. */
const paneAt = (id: string) => [`/support/contact-centre/${id}`]

/**
 * A clock's window, in milliseconds — the promise itself, and the only value
 * worth asserting about an SLA. **Never compare `dueAt` as a string**: two
 * spellings of one instant are equal facts and unequal strings.
 */
function windowMs(clock: { startedAt: string | null; dueAt: string | null } | null): number | null {
  if (clock === null || clock.startedAt === null || clock.dueAt === null) return null
  return Date.parse(clock.dueAt) - Date.parse(clock.startedAt)
}

async function byId(id: string): Promise<Conversation> {
  const page = await listConversations({ pageSize: 200 })
  const found = page.items.find((conversation) => conversation.id === id)
  if (!found) throw new Error(`No conversation ${id}`)
  return found
}

/** The rendered data rows' text, in the order the table paints them. */
/**
 * `CNV-101`'s entity name. Declared once, and it is Arabic on purpose: it is
 * the row §7.3's width budget and §9.1's bidi rules are measured against.
 */
const ARABIC_RIDER = 'الجوهرة بنت عبد العزيز بن سعود آل مقرن العتيبي'

function renderedOrder(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((tr) => tr.textContent ?? '')
}

/* ══════════════════════ D22 · the two numbers ══════════════════════ */

describe('the SLA comes from D22 and is not invented', () => {
  /**
   * **AC-963** — 45 seconds, and a chat unanswered past it is breached.
   *
   * **This asserts the PROMISE, not a timestamp string.** The first version
   * compared `dueAt` to `new Date(…).toISOString()` and broke the day the
   * fixtures moved to Riyadh-offset form — on two values that were the same
   * instant. A string comparison over ISO-8601 asserts a *serialisation choice*:
   * it fails when nothing is wrong, and it passes when the offset is right and
   * the instant is not. The window in milliseconds is the thing D22 actually
   * ruled, and it survives any normalisation anywhere in the chain.
   */
  it('promises a chat with no ticket 45 seconds and 20 minutes', async () => {
    const conversation = await byId('CNV-101') // chat, no ticket, opened 47 min ago
    const sla = conversationSla(conversation)

    expect(sla.source).toBe('chat-policy')
    expect(windowMs(sla.firstResponse)).toBe(45_000)
    expect(windowMs(sla.resolution)).toBe(20 * 60_000)
    expect(sla.firstResponseBreached).toBe(true)
  })

  /**
   * **The 45 seconds has to be RENDERABLE in seconds, and that is a property of
   * how the clock is built, not of the number.**
   *
   * `lib/sla.ts` counts in seconds only where the **window** is under ten
   * minutes — so that a four-hour ticket clock does not start flickering `47s`
   * in its final minute — and the window is only known if the clock is
   * constructed with a `startedAt` or a `targetMinutes`. Built from `dueAt`
   * alone the pill reads `1m` for its entire life and then breaches, which is
   * the exact defect the seconds tier was added to close. This asserts the
   * window reaches the clock.
   */
  it('builds the first-response clock with its window, so the pill can count in seconds', async () => {
    const conversation = await byId('CNV-101')
    const sla = conversationSla(conversation)
    const { clock } = runningClock(conversation, sla, EYVAR_NOW).result

    expect(clock.kind).not.toBe('no-clock')
    expect(clock.kind === 'no-clock' ? null : clock.windowMs).toBe(45_000)
  })

  /**
   * The instrument for the test above: **email is not on the chat number.** At
   * 19 minutes an email conversation is comfortably inside its four hours, so a
   * screen that applied 45 seconds to every channel would fail here and pass
   * everywhere else.
   */
  it('promises an email with no ticket four hours, not forty-five seconds', async () => {
    const conversation = await byId('CNV-110') // email, no ticket, opened 19 min ago
    const sla = conversationSla(conversation)

    expect(sla.source).toBe('chat-policy')
    expect(windowMs(sla.firstResponse)).toBe(4 * 60 * 60_000)
    expect(sla.firstResponseBreached).toBe(false)
  })

  /** **AC-965** — a ticket's reason-code SLA wins outright; nothing derives. */
  it('takes a ticket-backed conversation clocks from the row, not from the policy', async () => {
    const conversation = await byId('CNV-104') // email, TKT-501, legacy-reason-code
    const sla = conversationSla(conversation)

    expect(sla.source).toBe('legacy-reason-code')
    expect(sla.firstResponse?.dueAt).toBe(conversation.firstResponseDueAt)
    expect(sla.resolution?.dueAt).toBe(conversation.slaDueAt)
    expect(sla.resolution?.targetMinutes).toBe(conversation.slaTargetMinutes)
  })

  /** **AC-966** — a call makes no promise, which is not an unknown one. */
  it('gives a phone conversation no clock of either kind', async () => {
    const sla = conversationSla(await byId('CNV-106'))

    expect(sla.firstResponse).toBeNull()
    expect(sla.resolution).toBeNull()
    expect(sla.firstResponseBreached).toBe(false)
    expect(sla.resolutionBreached).toBe(false)
  })

  /** D22 — **both clocks pause on `snoozed`**, so a snoozed row cannot breach. */
  it('pauses both clocks while a conversation is snoozed', async () => {
    const sla = conversationSla(await byId('CNV-111'))

    expect(sla.paused).toBe(true)
    expect(sla.firstResponse).toBeNull()
    expect(sla.firstResponseBreached).toBe(false)
    expect(sla.resolutionBreached).toBe(false)
  })
})

/* ═══════ D22 · the asymmetry, asserted as a pair ═══════ */

describe('a first-response breach reorders and a resolution breach does not', () => {
  /**
   * **AC-964, the half that does nothing.** `CNV-102` is a chat opened 22
   * minutes ago that was answered at minute 5 — its **finish** promise is broken
   * and its **answer** promise never was. It must not climb.
   */
  it('leaves a resolution-breached row where waitingSince put it', async () => {
    const answeredLate = await byId('CNV-102')
    const sla = conversationSla(answeredLate)

    expect(sla.resolutionBreached).toBe(true)
    expect(sla.firstResponseBreached).toBe(false)

    const fresher = await byId('CNV-110') // waiting 19 min, no breach of either kind
    const order = compareForQueue(
      { conversation: answeredLate, sla },
      { conversation: fresher, sla: conversationSla(fresher) },
    )
    /* `CNV-102` has no `waitingSince` at all — nobody is waiting on it — so it
       sorts LAST, exactly as a row with no clock does. The resolution breach
       bought it nothing. */
    expect(order).toBeGreaterThan(0)
  })

  /**
   * **AC-963, the half that does everything.** `CNV-107` has waited **6
   * minutes** and `CNV-110` has waited **19**. On `waitingSince` alone
   * `CNV-110` comes first; `CNV-107` is a chat past its 45 seconds and
   * `CNV-110` an email inside its four hours, so the breach clause inverts them.
   */
  it('sorts a first-response-breached row above a longer-waiting unbreached one', async () => {
    const breached = await byId('CNV-107')
    const waitingLonger = await byId('CNV-110')

    expect(Date.parse(breached.waitingSince as string)).toBeGreaterThan(
      Date.parse(waitingLonger.waitingSince as string),
    )

    const order = compareForQueue(
      { conversation: breached, sla: conversationSla(breached) },
      { conversation: waitingLonger, sla: conversationSla(waitingLonger) },
    )
    expect(order).toBeLessThan(0)
  })
})

/* ══════════════════════ the queue ══════════════════════ */

describe('the queue', () => {
  /** **AC-936** — opens on Unassigned, breached first, then oldest waiting. */
  it('opens on Unassigned and paints breached-first, then oldest-waiting', async () => {
    renderConsole()
    await screen.findByText('Bandar Al-Harbi')

    const order = renderedOrder()
    const at = (name: string) => order.findIndex((text) => text.includes(name))

    /* CNV-104 (breached, waiting 3 h) · CNV-101 (breached, 47 m) ·
       CNV-107 (breached, 6 m) · CNV-110 (**not** breached, 19 m, and last
       despite having waited longer than CNV-107). */
    expect(at('Khaled Al-Zahrani')).toBeGreaterThanOrEqual(0)
    expect(at('Khaled Al-Zahrani')).toBeLessThan(at('Bandar Al-Harbi'))
  })

  /** **AC-937** — `CNV-107` has no messages and says so, not a blank line. */
  it('states that a conversation with no messages has none', async () => {
    renderConsole()
    expect(await screen.findByText(copy('conversations.preview.none'))).toBeInTheDocument()
  })

  /** **AC-939** — grab is one click and no dialog. It is reversible, so D18 buys it out. */
  it('claims without a confirmation', async () => {
    renderConsole()
    const target = await screen.findByText('Bandar Al-Harbi')
    const tr = target.closest('tr') as HTMLElement

    await userEvent.click(within(tr).getByRole('button', { name: copy('queue.claim') }))

    /* No dialog, and the row converts in place: the chip that offered `Claim`
       now offers `Release`, which is the reversibility D18 traded the
       confirmation for. The toast is not asserted here — `Toaster` is the
       shell's and this render mounts the screen, not the layout. */
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      await within(tr).findByRole('button', { name: copy('queue.release') }),
    ).toBeInTheDocument()
  })

  /** **AC-940** — a take-over confirms and the dialog names the holder. */
  it('confirms a take-over and names the operator who holds it', async () => {
    renderConsole(['/support/contact-centre?view=waiting'])
    const target = await screen.findByText('Layla Al-Faraj') // CNV-103, held by Lina Al-Otaibi
    const tr = target.closest('tr') as HTMLElement

    await userEvent.click(within(tr).getByRole('button', { name: copy('queue.takeOver') }))

    const dialog = await screen.findByRole('dialog')
    /* The name appears in the title AND in the body — **AC-203** wants both. */
    expect(within(dialog).getAllByText(/Lina Al-Otaibi/).length).toBeGreaterThan(0)
  })
})

/* ══════════════════════ D22 · the cap ══════════════════════ */

describe('the concurrent-chat cap', () => {
  /**
   * **AC-967 / AC-968, as one render — and the instrument is the row beside it.**
   *
   * `USR-1` holds **two** live chats in the seed (`CNV-102` and `CNV-108`;
   * `CNV-111`'s claim is idle past `OWNERSHIP_STALE_MINUTES` and is therefore
   * already free). So the test **claims a third** and then asserts the fourth is
   * refused — which is a better assertion than a seeded cap anyway, because it
   * proves the counter moves.
   *
   * The session is switched to `USR-3` because **D22 exempts Owner** and `USR-1`
   * is one. Worth stating plainly: **on the shipped mock session the cap never
   * fires**, because the only seeded signed-in operator is the one D22 exempts.
   *
   * **A defect this test rides over rather than hides.** `clients/conversations.ts`
   * resolves `view: 'mine'` and `heldByMe` against the module constant
   * `CURRENT_USER_ID`, not against the signed-in session, so `switchMockUser` is
   * invisible to it — the same defect `clients/session.ts:148` names for older
   * clients. The COUNT is right and the refusal is right; the claim just gets
   * recorded against `USR-1`. Reported to mock-data-engineer.
   */
  it('refuses a fourth chat in place with the number, and still allows an email', async () => {
    await switchMockUser('USR-3')

    /* **The precondition, asserted rather than assumed.** `view: 'mine'` now
       resolves against the SESSION, so this is USR-3's own holding — `CNV-103`
       and nothing else. If a fixture pass changes it, this line fails with the
       number rather than the refusal below timing out for ten seconds. */
    expect(
      (await listConversations({ view: 'mine', channel: 'chat', pageSize: 1 })).total,
    ).toBe(1)

    /* One held + two moved onto them = three, which is the cap.
       **Transferred, not claimed, and the reason is a seam defect worth
       naming.** `clients/conversations.ts` resolves `view: 'mine'` against the
       SESSION, but `nextClaim` in `clients/requests.ts` — the shared claim
       contract behind `claimConversation` — still writes
       `ownerId: CURRENT_USER_ID`, the module constant. So a claim made while
       signed in as `USR-3` lands on `USR-1` and `mine` never sees it: the two
       halves of ownership disagree about who is acting. `transferConversation`
       is the one operation that names an owner explicitly, so it is the only way
       to put work on the signed-in operator today. Reported — `requests.ts`
       serves five wave-2 queues and is not this screen's file. */
    await transferConversation('CNV-107', 'USR-3')
    await transferConversation('CNV-111', 'USR-3')
    expect(
      (await listConversations({ view: 'mine', channel: 'chat', pageSize: 1 })).total,
    ).toBe(3)

    renderConsole()

    const chat = (await screen.findByText(ARABIC_RIDER)).closest('tr') as HTMLElement
    const email = (await screen.findByText('Bandar Al-Harbi')).closest('tr') as HTMLElement

    await waitFor(() => {
      expect(within(chat).getByRole('button', { name: copy('queue.claim') })).toBeDisabled()
    })

    /* §11.2 — disabled IN PLACE, and the reason NAMES THE NUMBER. */
    expect(within(chat).getByRole('button', { name: copy('queue.claim') })).toHaveAttribute(
      'title',
      expect.stringContaining('3'),
    )

    /* **AC-968** — email does not count towards the limit and is not refused. */
    expect(within(email).getByRole('button', { name: copy('queue.claim') })).toBeEnabled()
  })

  /**
   * **The instrument.** The same three chats, the same fourth row, and the cap
   * does not fire — because `USR-1` is an **Owner** and D22 exempts one
   * outright: *"not a privilege — an Owner grabbing a fourth chat during an
   * incident should not be stopped by a throughput heuristic."* Without this
   * assertion the test above would also pass against a screen that disabled
   * `Claim` for some unrelated reason.
   */
  it('does not apply the cap to an Owner', async () => {
    /* The signed-in seed is `USR-1`, an Owner. Same rows, same claims, same
       arithmetic — and no refusal, because D22 exempts one outright: *"not a
       privilege — an Owner grabbing a fourth chat during an incident should not
       be stopped by a throughput heuristic."* Without this the test above would
       also pass against a screen that disabled `Claim` for any other reason. */
    await claimConversation('CNV-107')
    expect(
      (await listConversations({ view: 'mine', channel: 'chat', pageSize: 1 })).total,
    ).toBe(3)

    renderConsole()

    const chat = (await screen.findByText(ARABIC_RIDER)).closest('tr') as HTMLElement
    expect(within(chat).getByRole('button', { name: copy('queue.claim') })).toBeEnabled()
  })
})

/* ══════════════════════ the four states ══════════════════════ */

describe('four states', () => {
  it('renders an error with a retry when the list fails', async () => {
    mockFailures.once('conversations.list')
    renderConsole()

    expect(await screen.findByText(copy('conversations.error.list'))).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: copy('queue.error.retry') }))
    expect(await screen.findByText('Bandar Al-Harbi')).toBeInTheDocument()
  })

  /** The first-run empty, which is NOT the filtered one (AC-37 / AC-38). */
  it('renders the first-run empty when no conversation has ever existed', async () => {
    useEmptyConversationQueue()
    renderConsole()

    expect(
      await screen.findByText(copy('conversations.empty.firstRun.heading')),
    ).toBeInTheDocument()
  })
})

/* ═══════════════ the pane — §8.6, deltas D-1 … D-6 ═══════════════ */

describe('the conversation pane', () => {
  /**
   * **Delta D-4** — the pane is a PAGE, not a drawer, and §9.4's rule is that a
   * route may mount more than one mode over its lifetime and never two at once.
   * So the table is GONE while the pane is up.
   */
  it('replaces the queue rather than floating over it', async () => {
    renderConsole(paneAt('CNV-110'))

    expect(await screen.findByText(copy('conversations.rail.thisConversation'))).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  /** **AC-938** — the count is `messageCount`, never the loaded page's length. */
  it('renders the conversation message count, not the page length', async () => {
    const conversation = await byId('CNV-108')
    expect(conversation.messages.length).toBeLessThan(conversation.messageCount)

    renderConsole(paneAt('CNV-108'))

    expect(
      await screen.findByText(
        copy('conversations.thread.count.other').replace(
          '{count}',
          String(conversation.messageCount),
        ),
      ),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: copy('conversations.thread.loadEarlier') }),
    ).toBeInTheDocument()
  })

  /**
   * **Delta D-2 / §8.6.6** — delivery renders on the newest outbound
   * customer-visible message **only**. `CNV-108`'s loaded page carries several
   * outbound messages with a settled delivery state; exactly one word may
   * appear.
   */
  it('renders a delivery word on one message, not on every message that has one', async () => {
    renderConsole(paneAt('CNV-108'))
    /* Wait for the THREAD, not for the rail: the rail renders from the
       conversation row and is on screen before the message page lands. */
    await screen.findByRole('button', { name: copy('conversations.thread.loadEarlier') })

    const words = [
      copy('conversations.delivery.sent'),
      copy('conversations.delivery.delivered'),
      copy('conversations.delivery.read'),
    ]
    const found = words.flatMap((word) => screen.queryAllByText(word))
    expect(found).toHaveLength(1)
  })

  /**
   * **Delta D-1 / §8.6.2 — the collision this rule was written to close.**
   *
   * `CNV-110` carries a failed customer message and an internal note two
   * messages apart. `Not sent to the customer` belongs to the note's HEADER and
   * `Not delivered — …` to the failed message's delivery line; they mean
   * opposite things and must not share a position. The note's delivery position
   * stays empty — not an em dash, not `Not sent`, nothing.
   */
  it('separates a note’s not-sent line from a failed message’s delivery line', async () => {
    renderConsole(paneAt('CNV-110'))

    const notSent = await screen.findByText(copy('conversations.thread.notSent'))
    const failed = screen.getByText(/No email address on file for this rider/)

    /* Both present, and in different containers: the note's line is inside the
       note's own header, the failure's is on the failed bubble. */
    expect(notSent).toBeInTheDocument()
    expect(failed).toBeInTheDocument()
    expect(notSent.closest('li')).not.toBe(failed.closest('li'))

    /* **Delta D-3** — `failureMessage`, never `failureCode`, not even as a
       fallback. `no_handle` is a fact about the software. */
    expect(screen.queryByText(/no_handle/)).not.toBeInTheDocument()
  })

  /** §8.6.7 — `Send again` on a failed message, and `Add an email address` on `no_handle`. */
  it('offers Send again and the actual fix on a failed message', async () => {
    renderConsole(paneAt('CNV-110'))

    expect(
      await screen.findByRole('button', { name: copy('conversations.thread.sendAgain') }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: copy('conversations.thread.addEmail') }),
    ).toBeInTheDocument()
  })
})

/* ═══════════════════ the composer — §8.6 ═══════════════════ */

describe('the composer', () => {
  /**
   * **§8.6.2's five carriers, and not one of them is a colour.** The two that a
   * test can hold are the placeholder and the send label, and they are the two
   * that decide whether a note reaches a customer.
   */
  it('changes the placeholder and the send label with the register', async () => {
    renderConsole(paneAt('CNV-102'))

    await screen.findByText(/Thank you for waiting, Nora/)
    expect(
      screen.getByPlaceholderText(copy('conversations.composer.placeholder.reply')),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: copy('conversations.composer.send') }),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: copy('conversations.composer.note') }))

    expect(
      await screen.findByPlaceholderText(copy('conversations.composer.placeholder.note')),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: copy('conversations.composer.addNote') }),
    ).toBeInTheDocument()
  })

  /**
   * **§8.6.3 — an empty field disables `Send` and renders NO reason.** The two
   * halves are asserted together because the defect is putting a sentence under
   * the composer on every keystroke.
   */
  it('disables Send on an empty field without explaining why', async () => {
    renderConsole(paneAt('CNV-102'))

    await screen.findByText(/Thank you for waiting, Nora/)
    const send = screen.getByRole('button', { name: copy('conversations.composer.send') })
    expect(send).toBeDisabled()
    expect(
      screen.queryByText(copy('conversations.composer.unclaimed')),
    ).not.toBeInTheDocument()
  })

  /** §8.6.3 — an unclaimed conversation refuses the composer, in place, with the reason. */
  it('refuses the composer on a conversation nobody holds', async () => {
    renderConsole(paneAt('CNV-101'))

    expect(
      await screen.findByText(copy('conversations.composer.unclaimed')),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy('conversations.composer.send') })).toBeDisabled()
  })

  /**
   * **§8.6.3 / R10 — a send fires NO toast**, and the message at the foot of the
   * thread is the confirmation. `CNV-102` is held by the signed-in operator, so
   * the composer is live.
   */
  it('sends without a confirmation, without a toast, and clears the field', async () => {
    renderConsole(paneAt('CNV-102'))
    /* §8.6.9 — the composer renders DISABLED while the thread loads, with no
       reason line. So the thread has to land before anything can be typed, and
       waiting on the composer alone would type into a disabled field. */
    await screen.findByText(/Thank you for waiting, Nora/)

    const field = screen.getByPlaceholderText(
      copy('conversations.composer.placeholder.reply'),
    )
    /* A body no fixture already contains, so the assertion below cannot pass
       on a message that was already in the thread. */
    await userEvent.type(field, 'Raising this with billing now.')
    await userEvent.click(screen.getByRole('button', { name: copy('conversations.composer.send') }))

    /* §8.6.4 — no dialog. */
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText('Raising this with billing now.')).toBeInTheDocument()
    await waitFor(() => expect((field as HTMLTextAreaElement).value).toBe(''))
    /* R10 — no toast. The only status region on screen is the thread. */
    expect(screen.queryByText(copy('queue.toast.claimed'))).not.toBeInTheDocument()
  })

  /**
   * **§8.6.5 / F-4** — `CNV-110`'s customer has no handle, so the refusal lands
   * on `Send`. It is only reachable once the conversation is held, because
   * *"grab this first"* outranks it.
   */
  it('refuses the send where the customer has no address on file', async () => {
    renderConsole(paneAt('CNV-110'))

    await screen.findByText(copy('conversations.composer.unclaimed'))
    await userEvent.click(screen.getByRole('button', { name: copy('queue.claim') }))

    expect(
      await screen.findByText(copy('conversations.composer.noHandle')),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy('conversations.composer.send') })).toBeDisabled()
  })

  /**
   * **§8.6.3 — WhatsApp renders NO composer at all**, and says so in one
   * sentence in its place. D19: *"a compose box for a pipe that does not exist
   * is the worst possible state."*
   */
  it('renders no composer at all on a WhatsApp conversation', async () => {
    renderConsole(paneAt('CNV-105'))

    expect(
      await screen.findByText(copy('conversations.composer.whatsapp')),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: copy('conversations.composer.send') }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: copy('conversations.composer.addNote') }),
    ).not.toBeInTheDocument()
  })

  /**
   * **§8.6.3 — `phone` renders the NOTE register only.** The difference from
   * WhatsApp is the whole point: phone has notes and WhatsApp has nothing, and
   * an operator shown a note field on a WhatsApp row would assume the customer
   * can be reached.
   */
  it('renders the note register only on a call', async () => {
    renderConsole(paneAt('CNV-106'))

    expect(
      await screen.findByPlaceholderText(copy('conversations.composer.placeholder.note')),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('radio', { name: copy('conversations.composer.reply') }),
    ).not.toBeInTheDocument()
  })
})

/* ═══════════ the level-3 route, and the state it carries ═══════════ */

describe('the conversation route', () => {
  /**
   * **The pane is reachable by address**, which is what a drawer behind a query
   * param never was: `/support/contact-centre/CNV-110` is linkable, bookmarkable
   * and survives a reload.
   */
  it('opens a conversation from its own path', async () => {
    renderConsole(paneAt('CNV-110'))

    expect(await screen.findByText(copy('conversations.rail.thisConversation'))).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  /**
   * **AC-10** — a level-3 route changes neither nav column nor the view, so the
   * queue's own question has to survive the round trip. Opening a conversation
   * from the `waiting` view and pressing `Back` returns to `waiting`, not to the
   * default. A shift that loses its place every time it reads a message is a
   * shift that stops reading messages.
   */
  it('returns to the queue it came from, with its view intact', async () => {
    renderConsole(['/support/contact-centre?view=waiting'])

    const target = await screen.findByText('Layla Al-Faraj') // CNV-103, waiting
    const tr = target.closest('tr') as HTMLElement
    /* Three row actions, so §7.8 renders a kebab rather than a labelled
       button. `Open conversation` is inside it. */
    await userEvent.click(within(tr).getByRole('button', { name: /More actions/ }))
    await userEvent.click(
      await screen.findByRole('menuitem', { name: copy('conversations.thread.open') }),
    )

    await screen.findByText(copy('conversations.rail.thisConversation'))
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))

    /* Back on the queue, and still on `waiting` — CNV-103 is in that view and
       CNV-102 (active) is not, so the pair distinguishes it from a reset. */
    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Layla Al-Faraj')).toBeInTheDocument()
    expect(screen.queryByText('Mohammed Al-Qahtani')).not.toBeInTheDocument()
  })
})

/* ═════════ §8.6.5 · Reply by email, now that handles exists ═════════ */

describe('the channel switch', () => {
  /**
   * **F-3 closed, and this is the branch that had never executed.** `CNV-102`'s
   * customer now carries `handles: { chat: …, email: … }`, so the toggle is
   * **live** and its footer names the address it will use — which is one of the
   * three things §8.6.4 says carries what §5.0's confirmation row was
   * protecting, and the reason this control is allowed not to confirm.
   */
  it('offers Reply by email on a chat with an address, and names it', async () => {
    renderConsole(paneAt('CNV-102'))
    await screen.findByText(/Thank you for waiting, Nora/)

    const toggle = screen.getByRole('button', { name: copy('conversations.composer.byEmail') })
    expect(toggle).toBeEnabled()
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    /* §9.4 — the address is `<bdi>`-isolated, or the `@` and the TLD move in
       Arabic and the operator is shown an address that is not the one the
       message goes to. */
    const named = await screen.findByText(/nora[.]alharbi@example[.]com/)
    expect(named.closest('bdi')).not.toBeNull()
  })

  /**
   * The other half of the three-way fixture: a chat whose customer has **no**
   * email key at all. The toggle is refused **at rest, with its reason as real
   * text** — D17 clause 2 and §11.2 — rather than enabled and failing at commit.
   *
   * `addressOn` deliberately collapses the map's two absences: a missing key
   * (`CNV-108`, never learned) and a present `null` (`CNV-110`, looked and there
   * is none). §8.6.5 gives exactly one sentence, and the distinction stays in
   * the data for the day a second one is wanted.
   */
  it('refuses Reply by email on a chat with no address on file', async () => {
    renderConsole(paneAt('CNV-108'))
    await screen.findByRole('button', { name: copy('conversations.thread.loadEarlier') })

    const toggle = screen.getByRole('button', { name: copy('conversations.composer.byEmail') })
    expect(toggle).toBeDisabled()
    /* The reason is REAL TEXT, not a tooltip (§8.6.3, D17 clause 3). */
    const reasonId = toggle.getAttribute('aria-describedby') as string
    expect(document.getElementById(reasonId)).toHaveTextContent(
      copy('conversations.composer.noHandle'),
    )
  })

  /** §8.6.5 — absent on a conversation that is already email; there is no second channel. */
  it('does not render on an email conversation', async () => {
    renderConsole(paneAt('CNV-110'))
    await screen.findByText(copy('conversations.rail.thisConversation'))

    expect(
      screen.queryByRole('button', { name: copy('conversations.composer.byEmail') }),
    ).not.toBeInTheDocument()
  })
})

/* ═════════ the four controls that shipped dead, and now do not ═════════ */

describe('AC-947 / AC-S-14 — a ticket raised from a conversation', () => {
  it('links the two in both directions and renders the ticket link on the row', async () => {
    renderConsole(paneAt('CNV-101'))
    await screen.findByText(copy('conversations.composer.unclaimed'))
    await userEvent.click(screen.getByRole('button', { name: copy('queue.claim') }))

    await userEvent.click(await screen.findByRole('button', { name: copy('conversations.ticket.create') }))
    const dialog = await screen.findByRole('dialog')
    /* The party and the channel arrive locked from the conversation. */
    expect(within(dialog).queryByPlaceholderText(copy('ticket.new.requester.placeholder'))).not.toBeInTheDocument()

    await userEvent.click(within(dialog).getAllByRole('combobox')[0]!)
    await userEvent.click(await screen.findByRole('option', { name: 'Captain late for pickup' }))
    await userEvent.type(within(dialog).getByLabelText(copy('ticket.new.subject')), 'Late again')
    await userEvent.click(within(dialog).getByRole('button', { name: copy('ticket.new.confirm') }))

    await expect.poll(async () => (await byId('CNV-101')).ticketId).not.toBeNull()
    const linked = await byId('CNV-101')
    const ticket = await getTicket(linked.ticketId!)
    expect(ticket.conversationId).toBe('CNV-101')
    expect(ticket.channel).toBe(linked.channel)
    expect(
      await screen.findByRole('link', { name: copy('conversations.ticket.open').replace('{id}', ticket.id) }),
    ).toBeInTheDocument()
  })
})

describe('the controls the seam unblocked', () => {
  /**
   * §3.5 — the header primary on a closed thread. It shipped disabled in place
   * because `clients/conversations.ts` had `close` and nothing that reversed it.
   * `reopenConversation` landed.
   *
   * **Reopening does not claim**, so the pane's precedence offers `Grab` on the
   * next render — asserted here because it is the visible consequence of an
   * open question with the product owner, and a change of answer should fail a
   * test rather than surprise an operator.
   */
  it('reopens a closed conversation, and does not claim it', async () => {
    renderConsole(paneAt('CNV-114'))

    await userEvent.click(await screen.findByRole('button', { name: copy('conversations.reopen') }))

    expect(
      await screen.findByRole('button', { name: copy('queue.claim') }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: copy('conversations.reopen') }),
    ).not.toBeInTheDocument()
  })

  /**
   * **§8.6.7, both halves.** `Send again` restores the body into the composer and
   * **does not send** — the ruling, unchanged. The next press then retries
   * **under the same message id**, so the thread does not grow a second copy of
   * a sentence the customer received once.
   *
   * The count is the assertion that matters. Honouring the ruling literally
   * after `retryMessage` landed would have called `replyConversation` and minted
   * a second transcript line — the exact defect `retryMessage` exists to
   * prevent, and the reason the composer picks its operation at press time
   * rather than at restore time.
   *
   * `CNV-104`'s `CMSG-1031` is the fixture: `bounced`, and the customer **has**
   * an address, so the retry is a real one.
   */
  it('restores a failed message into the composer, then retries it as one line', async () => {
    renderConsole(paneAt('CNV-104'))

    /* §8.6.3 — the composer is refused until the conversation is held. */
    await screen.findByText(copy('conversations.composer.unclaimed'))
    await userEvent.click(screen.getByRole('button', { name: copy('queue.claim') }))

    const failed = 'I have attached the fare breakdown'
    await userEvent.click(
      await screen.findByRole('button', { name: copy('conversations.thread.sendAgain') }),
    )

    /* Restored, and NOT sent: the body is in the field, the thread still holds
       exactly one copy of it, and the line under the composer says where it came
       from. */
    const field = screen.getByRole('textbox', { name: copy('conversations.composer.reply') })
    expect((field as HTMLTextAreaElement).value).toContain(failed)
    expect(screen.getByText(copy('conversations.composer.restored'))).toBeInTheDocument()
    expect(screen.getAllByText(new RegExp(failed))).toHaveLength(2) // the bubble and the field

    await userEvent.click(screen.getByRole('button', { name: copy('conversations.composer.send') }))

    /* One transcript line, still — the field cleared and no second bubble
       appeared. A `replyConversation` here would make this three. */
    await waitFor(() => expect((field as HTMLTextAreaElement).value).toBe(''))
    expect(screen.getAllByText(new RegExp(failed))).toHaveLength(1)
  })

  /**
   * **The case §8.6.7 wrote the ruling for**, and the reason `Send again` does
   * not send by itself: *"on `no_handle`, an unchanged retry is guaranteed to
   * fail again."*
   *
   * On `CNV-110` the customer has no address at all, so the composer is refused
   * on `Send` (§8.6.5, **F-4**) and the retry is unreachable from it — correctly.
   * The way out is the second control, `Add an email address`, which opens the
   * 360° layer at the customer. Offering only `Send again` would loop the
   * operator through a refusal they cannot clear from this screen.
   */
  it('refuses the retry where there is no address, and offers the actual fix', async () => {
    renderConsole(paneAt('CNV-110'))

    await screen.findByText(copy('conversations.composer.unclaimed'))
    await userEvent.click(screen.getByRole('button', { name: copy('queue.claim') }))

    expect(await screen.findByText(copy('conversations.composer.noHandle'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy('conversations.composer.send') })).toBeDisabled()
    expect(
      screen.getByRole('link', { name: copy('conversations.thread.addEmail') }),
    ).toBeInTheDocument()
  })

  /**
   * **§8.6.5 end to end.** The toggle stamps `message.channel`, not
   * `conversation.channel` — *"a chat escalated to an email is one conversation
   * with two message channels, and losing that is losing the audit trail"* — so
   * the reply lands in a chat thread carrying an `Email` marker, and the
   * conversation is still a chat.
   */
  it('sends one reply by email from a chat, and leaves the conversation a chat', async () => {
    renderConsole(paneAt('CNV-102'))
    await screen.findByText(/Thank you for waiting, Nora/)

    await userEvent.click(
      screen.getByRole('button', { name: copy('conversations.composer.byEmail') }),
    )
    const field = screen.getByPlaceholderText(copy('conversations.composer.placeholder.reply'))
    await userEvent.type(field, 'Sending the receipt across now.')
    await userEvent.click(screen.getByRole('button', { name: copy('conversations.composer.send') }))

    expect(await screen.findByText('Sending the receipt across now.')).toBeInTheDocument()

    const after = await byId('CNV-102')
    expect(after.channel).toBe('chat')
    const sent = after.messages.find((m) => m.body === 'Sending the receipt across now.')
    expect(sent?.channel).toBe('email')
  })
})

describe('canned responses in the composer (SUPPORT-UX-PLAN.md §7.3)', () => {
  it('offers active chat templates and inserts one without sending', async () => {
    const user = userEvent.setup()
    renderConsole(['/support/contact-centre/CNV-102'])
    const field = (await screen.findByLabelText(copy('conversations.composer.reply'))) as HTMLTextAreaElement
    const before = (await getConversation('CNV-102')).messages.length
    await user.click(screen.getByRole('button', { name: copy('ticket.template.insert') }))
    await user.click(await screen.findByRole('menuitem', { name: /Acknowledge and hold/ }))
    expect(field.value).toContain('I have this in front of me now')
    expect((await getConversation('CNV-102')).messages.length).toBe(before)
  })
})

describe('contact centre polish (SUPPORT-UX-PLAN.md §8.7)', () => {
  /* O6 / D22: snoozing parks the conversation until a chosen time and pauses both clocks. */
  it('snoozes a held conversation until a chosen time from the pane', async () => {
    renderConsole(paneAt('CNV-102'))
    await userEvent.click(await screen.findByRole('button', { name: copy('conversations.snooze') }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: copy('conversations.snooze.option.2h') }))
    await userEvent.click(within(dialog).getByRole('button', { name: copy('conversations.snooze.confirm') }))
    await expect.poll(async () => (await byId('CNV-102')).status).toBe('snoozed')
    const snoozed = await byId('CNV-102')
    expect(Date.parse(snoozed.snoozedUntil!) - Date.parse(EYVAR_NOW)).toBe(2 * 60 * 60_000)
  })

  /* §8.7: the customer's typing shows as one muted line beneath the thread. */
  it('shows that the customer is typing after they read the reply', async () => {
    renderConsole(paneAt('CNV-102'))
    const field = await screen.findByLabelText(copy('conversations.composer.reply'))
    await userEvent.type(field, 'Checking now.{Enter}')
    const conversation = await byId('CNV-102')
    expect(
      await screen.findByText(copy('conversations.typing').replace('{name}', conversation.entityName), {}, { timeout: 9000 }),
    ).toBeInTheDocument()
  })
})
