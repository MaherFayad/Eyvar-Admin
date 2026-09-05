import { describe, expect, it } from 'vitest'
import { EYVAR_NOW } from '@/data/clients'
import { GROUP_WINDOW_MS, groupMessages, type GroupableMessage, type ThreadItem } from './messages'

const BASE_MS = Date.parse(EYVAR_NOW)

interface Fixture extends GroupableMessage {
  body: string
}

/** A message `offsetMs` after the fixture clock, customer-visible unless said otherwise. */
function at(
  id: string,
  offsetMs: number,
  overrides: Partial<Pick<Fixture, 'authorId' | 'authorKind' | 'visibility'>> = {},
): Fixture {
  return {
    id,
    authorId: 'cust-1',
    authorKind: 'customer',
    sentAt: new Date(BASE_MS + offsetMs).toISOString(),
    visibility: 'customer',
    body: id,
    ...overrides,
  }
}

const MINUTE = 60_000

function shape(items: ThreadItem<Fixture>[]): string[] {
  return items.map((item) =>
    item.kind === 'day' ? `day:${item.date}` : item.messages.map((m) => m.id).join('+'),
  )
}

describe('groupMessages', () => {
  it('returns nothing for an empty thread', () => {
    expect(groupMessages([])).toEqual([])
  })

  it('opens every thread with a day marker before the first group', () => {
    const items = groupMessages([at('a', 0)])
    expect(items[0]).toEqual({ kind: 'day', date: '2026-06-25' })
    expect(items[1]?.kind).toBe('group')
  })

  it('merges consecutive messages from one author within the window', () => {
    const items = groupMessages([at('a', 0), at('b', 2 * MINUTE), at('c', 4 * MINUTE)])
    expect(shape(items)).toEqual(['day:2026-06-25', 'a+b+c'])
  })

  it('measures the window from the previous message, not the first in the group', () => {
    const items = groupMessages([at('a', 0), at('b', 4 * MINUTE), at('c', 8 * MINUTE)])
    expect(shape(items)).toEqual(['day:2026-06-25', 'a+b+c'])
  })

  it('starts a new group past the window, and exactly at it still merges', () => {
    const atWindow = groupMessages([at('a', 0), at('b', GROUP_WINDOW_MS)])
    expect(shape(atWindow)).toEqual(['day:2026-06-25', 'a+b'])
    const past = groupMessages([at('a', 0), at('b', GROUP_WINDOW_MS + 1)])
    expect(shape(past)).toEqual(['day:2026-06-25', 'a', 'b'])
  })

  it('honours a caller-supplied window', () => {
    const items = groupMessages([at('a', 0), at('b', 2 * MINUTE)], { windowMs: MINUTE })
    expect(shape(items)).toEqual(['day:2026-06-25', 'a', 'b'])
  })

  it('starts a new group when the author changes', () => {
    const items = groupMessages([
      at('a', 0),
      at('b', MINUTE, { authorId: 'op-1', authorKind: 'operator' }),
      at('c', 2 * MINUTE),
    ])
    expect(shape(items)).toEqual(['day:2026-06-25', 'a', 'b', 'c'])
  })

  it('does not merge the same id across kinds', () => {
    const items = groupMessages([
      at('a', 0, { authorId: 'x' }),
      at('b', MINUTE, { authorId: 'x', authorKind: 'operator' }),
    ])
    expect(shape(items)).toEqual(['day:2026-06-25', 'a', 'b'])
  })

  it('never merges an internal note with a customer-visible group, in either direction', () => {
    const items = groupMessages([
      at('a', 0, { authorId: 'op-1', authorKind: 'operator' }),
      at('note', MINUTE, { authorId: 'op-1', authorKind: 'operator', visibility: 'internal' }),
      at('b', 2 * MINUTE, { authorId: 'op-1', authorKind: 'operator' }),
    ])
    expect(shape(items)).toEqual(['day:2026-06-25', 'a', 'note', 'b'])
    const note = items[2]
    expect(note?.kind === 'group' && note.visibility).toBe('internal')
  })

  it('keeps two consecutive notes from one author as two blocks', () => {
    const items = groupMessages([
      at('n1', 0, { authorId: 'op-1', authorKind: 'operator', visibility: 'internal' }),
      at('n2', MINUTE, { authorId: 'op-1', authorKind: 'operator', visibility: 'internal' }),
    ])
    expect(shape(items)).toEqual(['day:2026-06-25', 'n1', 'n2'])
  })

  it('treats an absent visibility as customer-visible', () => {
    const bare: GroupableMessage = { id: 'a', authorId: 'cust-1', authorKind: 'customer', sentAt: EYVAR_NOW }
    const items = groupMessages([bare, { ...bare, id: 'b', sentAt: new Date(BASE_MS + MINUTE).toISOString() }])
    expect(items).toHaveLength(2)
    expect(items[1]).toMatchObject({ kind: 'group', visibility: 'customer' })
    expect(items[1]?.kind === 'group' && items[1].messages.map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('gives a system line its own group and breaks the group around it', () => {
    const items = groupMessages([
      at('a', 0),
      at('sys', MINUTE, { authorId: null, authorKind: 'system' }),
      at('b', 2 * MINUTE),
    ])
    expect(shape(items)).toEqual(['day:2026-06-25', 'a', 'sys', 'b'])
  })

  it('never merges two system lines, even from the same null author', () => {
    const items = groupMessages([
      at('s1', 0, { authorId: null, authorKind: 'system' }),
      at('s2', MINUTE, { authorId: null, authorKind: 'system' }),
    ])
    expect(shape(items)).toEqual(['day:2026-06-25', 's1', 's2'])
  })

  it('yields a day marker at the Riyadh midnight, not the UTC one', () => {
    // 20:59:30Z is 23:59:30 in Riyadh; one minute later is the next day there.
    const items = groupMessages([
      { ...at('a', 0), sentAt: '2026-06-24T20:59:30Z' },
      { ...at('b', 0), sentAt: '2026-06-24T21:00:30Z' },
    ])
    expect(shape(items)).toEqual(['day:2026-06-24', 'a', 'day:2026-06-25', 'b'])
  })

  it('does not merge across a day boundary even within the window', () => {
    const items = groupMessages([
      { ...at('a', 0), sentAt: '2026-06-24T23:59:00+03:00' },
      { ...at('b', 0), sentAt: '2026-06-25T00:00:30+03:00' },
    ])
    expect(items.filter((i) => i.kind === 'group')).toHaveLength(2)
  })

  it('respects a caller-supplied time zone for the day boundary', () => {
    const items = groupMessages(
      [
        { ...at('a', 0), sentAt: '2026-06-24T23:30:00Z' },
        { ...at('b', 0), sentAt: '2026-06-25T00:30:00Z' },
      ],
      { timeZone: 'UTC' },
    )
    expect(shape(items)).toEqual(['day:2026-06-24', 'a', 'day:2026-06-25', 'b'])
  })

  it('starts a new group for a message that arrives out of order rather than merging it', () => {
    const items = groupMessages([at('a', 2 * MINUTE), at('b', 0)])
    expect(shape(items)).toEqual(['day:2026-06-25', 'a', 'b'])
  })

  it('keeps the original objects, so a screen can key on the message', () => {
    const a = at('a', 0)
    const items = groupMessages([a])
    expect(items[1]?.kind === 'group' && items[1].messages[0]).toBe(a)
  })

  it('carries the author onto the group for its one avatar and name line', () => {
    const items = groupMessages([at('a', 0, { authorId: 'op-9', authorKind: 'operator' })])
    expect(items[1]).toMatchObject({ kind: 'group', authorId: 'op-9', authorKind: 'operator', visibility: 'customer' })
  })
})
