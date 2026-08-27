import { describe, expect, it } from 'vitest'
import { LTR_RUN_KINDS, isolatedRunProps, stretchesInlineSize } from './isolate'

describe('isolatedRunProps — the className can only reach the box', () => {
  it('puts every class on the box and none on the run', () => {
    const { box, run } = isolatedRunProps({ ltr: 'email', className: 'flex-1 truncate' })
    expect(box.className).toBe('flex-1 truncate')
    expect(run).toEqual({ dir: 'ltr' })
    expect('className' in run).toBe(false)
  })

  it('pins dir="ltr" for a named run and leaves it auto otherwise', () => {
    expect(isolatedRunProps({ ltr: 'phone' }).run.dir).toBe('ltr')
    /* No `dir` at all, not `dir="auto"`: a bare <bdi> IS auto, and writing it
       out invites someone to "simplify" it to a <span dir="auto"> that does not
       isolate. */
    expect(isolatedRunProps().run.dir).toBeUndefined()
    expect(isolatedRunProps({ className: 'font-medium' }).run.dir).toBeUndefined()
  })

  it('takes no options at all', () => {
    expect(isolatedRunProps()).toEqual({ box: { className: undefined }, run: {} })
  })

  it('hands out frozen run props, so one call site cannot mutate another`s', () => {
    const { run } = isolatedRunProps({ ltr: 'money' })
    expect(Object.isFrozen(run)).toBe(true)
  })

  it('covers the eight LTR-pinned runs in design/08 §12 and no more', () => {
    expect(LTR_RUN_KINDS).toEqual([
      'email',
      'ip',
      'phone',
      'totpSecret',
      'maskedHint',
      'date',
      'money',
      'otpCode',
    ])
    expect(new Set(LTR_RUN_KINDS).size).toBe(8)
    for (const kind of LTR_RUN_KINDS) {
      expect(isolatedRunProps({ ltr: kind }).run.dir).toBe('ltr')
    }
  })
})

describe('stretchesInlineSize — build/08 §5.4', () => {
  it('flags the classes that made the metric boards flush the wrong way', () => {
    expect(stretchesInlineSize('flex-1')).toBe(true)
    expect(stretchesInlineSize('min-w-0 flex-1 truncate')).toBe(true)
    expect(stretchesInlineSize('w-full')).toBe(true)
    expect(stretchesInlineSize('grow')).toBe(true)
    expect(stretchesInlineSize('basis-0')).toBe(true)
    expect(stretchesInlineSize('self-stretch')).toBe(true)
    expect(stretchesInlineSize('block')).toBe(true)
    expect(stretchesInlineSize('flex items-center gap-2')).toBe(true)
  })

  it('sees through a responsive or state variant', () => {
    expect(stretchesInlineSize('md:flex-1')).toBe(true)
    expect(stretchesInlineSize('group-hover:lg:w-full')).toBe(true)
  })

  it('leaves the content-sized cases alone — they were already correct', () => {
    expect(stretchesInlineSize('tabular-nums')).toBe(false)
    expect(stretchesInlineSize('text-xs text-muted-foreground')).toBe(false)
    expect(stretchesInlineSize('truncate')).toBe(false)
    expect(stretchesInlineSize('inline-flex items-center')).toBe(false)
    expect(stretchesInlineSize('font-semibold ms-2')).toBe(false)
  })

  it('handles nothing, empty and ragged whitespace', () => {
    expect(stretchesInlineSize(undefined)).toBe(false)
    expect(stretchesInlineSize('')).toBe(false)
    expect(stretchesInlineSize('   ')).toBe(false)
    expect(stretchesInlineSize('  flex-1   truncate  ')).toBe(true)
    expect(stretchesInlineSize('a\nb\tflex-1')).toBe(true)
  })

  it('does not fire on a class that merely contains a flagged word', () => {
    expect(stretchesInlineSize('flex-1/2')).toBe(false)
    expect(stretchesInlineSize('w-full-bleed')).toBe(false)
    expect(stretchesInlineSize('growing')).toBe(false)
  })

  it('agrees with itself on props built by isolatedRunProps', () => {
    /* The point of the two-bag shape: whatever the box carries, the run carries
       nothing, so this can never be true for a <bdi> built through the helper. */
    const { run } = isolatedRunProps({ ltr: 'date', className: 'flex-1' })
    expect(stretchesInlineSize(run.className)).toBe(false)
  })
})
