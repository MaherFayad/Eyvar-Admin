import { describe, expect, it } from 'vitest'
import { FILE_SIZE_MESSAGES_EN, formatFileSize } from './fileSize'
import { createTranslator, placeholdersIn } from '../i18n/translate'

const t = createTranslator({ dictionary: FILE_SIZE_MESSAGES_EN })

/**
 * Arabic resolves its own copy of the keys — the unit SYMBOL is not translated
 * (§9.6 keeps Latin acronyms in English inside an Arabic string), so the
 * template is byte-identical to English. Kept as its own literal rather than
 * importing `src/i18n/ar/fileSize.ts`, so `src/lib` stays free of `src/i18n`.
 */
const arabic = createTranslator({
  dictionary: { 'fileSize.kb': '{size} KB', 'fileSize.mb': '{size} MB' },
  fallback: FILE_SIZE_MESSAGES_EN,
  language: 'ar',
})

const KB = 1024
const MB = 1024 * 1024

describe('formatFileSize — the unit is always there', () => {
  /**
   * **The assertion whose absence let `report.pdf · 240` ship.**
   * `ConversationPane.tsx:844` rendered a bare `formatCount(bytes / 1024)` into
   * a key that carries no unit, and no test anywhere asked what the number was
   * a number *of*. Every size this function can return, at every tier, names
   * its unit.
   */
  it('never returns a bare number', () => {
    for (const bytes of [0, 1, 300, KB, 240 * KB, MB - 1, MB, 4 * MB, 1024 * MB]) {
      const rendered = formatFileSize(bytes, t)
      expect(rendered, `${bytes} bytes rendered without a unit`).toMatch(/\d\s(?:KB|MB)$/)
      expect(rendered).not.toMatch(/^[\d,.]+$/)
    }
  })

  it('cannot silently lose the unit — a dictionary without the key throws', () => {
    /* AC-74's dev guard is what makes the unit unforgettable rather than
       merely documented. A literal `${n} KB` had no such guard. */
    const empty = createTranslator({ dictionary: {} })
    expect(() => formatFileSize(240 * KB, empty)).toThrow(/fileSize\.kb/)
    expect(() => formatFileSize(4 * MB, empty)).toThrow(/fileSize\.mb/)
  })

  it('uses uppercase KB and MB, never the SI decimal kB', () => {
    expect(formatFileSize(240 * KB, t)).toBe('240 KB')
    expect(formatFileSize(4 * MB, t)).toBe('4.0 MB')
    expect(formatFileSize(240 * KB, t)).not.toContain('kB')
  })
})

describe('formatFileSize — 1024, and the KB floor', () => {
  it('is 1024-based, not 1000-based', () => {
    /* 1000 bytes is under one binary KB; a decimal formatter would say `1 KB`
       for a different reason and `2 KB` at 2000. */
    expect(formatFileSize(2000, t)).toBe('2 KB')
    expect(formatFileSize(2048, t)).toBe('2 KB')
    expect(formatFileSize(245_760, t)).toBe('240 KB')
  })

  it('renders zero bytes as 1 KB, because 0 KB on a file that exists is a wrong fact', () => {
    /* The ruling `Math.max(1, …)` encodes, kept from `AdminWorkspaceScreen`.
       The function has one number to go on and cannot tell an empty file from
       an unknown size; a caller holding `null` renders `ABSENT` instead. */
    expect(formatFileSize(0, t)).toBe('1 KB')
  })

  it('renders a file under one kilobyte as 1 KB, never 0 KB', () => {
    expect(formatFileSize(1, t)).toBe('1 KB')
    expect(formatFileSize(300, t)).toBe('1 KB')
    expect(formatFileSize(511, t)).toBe('1 KB')
  })

  it('rounds to the nearest whole kilobyte above the floor', () => {
    expect(formatFileSize(1536, t)).toBe('2 KB') // 1.5 KB
    expect(formatFileSize(1535, t)).toBe('1 KB') // 1.499 KB
    expect(formatFileSize(84_220, t)).toBe('82 KB') // CNV-104's attachment
  })

  it('groups thousands in the KB tier', () => {
    expect(formatFileSize(1023 * KB, t)).toBe('1,023 KB')
  })
})

describe('formatFileSize — the KB/MB boundary', () => {
  it('switches at exactly 1024 KB', () => {
    expect(formatFileSize(KB, t)).toBe('1 KB')
    expect(formatFileSize(MB, t)).toBe('1.0 MB')
  })

  /**
   * The tier is chosen on the **rounded** kilobytes, so a value that rounds up
   * to 1024 KB is already an MB. `facts.tsx` branches on the exact `kb < 1024`
   * and prints `1,024 KB` here — a size in a unit it has outgrown.
   */
  it('never prints 1,024 KB', () => {
    expect(formatFileSize(MB - 1, t)).toBe('1.0 MB')
    expect(formatFileSize(1_048_064, t)).toBe('1.0 MB') // 1023.5 KB — rounds to 1024
    expect(formatFileSize(1_048_063, t)).toBe('1,023 KB') // 1023.499 KB — rounds to 1023
    for (const bytes of [MB - 1, MB - 512, 1_048_064]) {
      expect(formatFileSize(bytes, t)).not.toContain('1,024')
    }
  })

  it('renders exactly one decimal in the MB tier', () => {
    expect(formatFileSize(MB, t)).toBe('1.0 MB')
    expect(formatFileSize(1_482_113, t)).toBe('1.4 MB') // CNV-101's attachment
    expect(formatFileSize(Math.round(1.25 * MB), t)).toBe('1.3 MB')
  })

  it('has no GB tier — a very large file stays in MB, grouped', () => {
    expect(formatFileSize(1024 * MB, t)).toBe('1,024.0 MB')
    expect(formatFileSize(5 * 1024 * MB, t)).toBe('5,120.0 MB')
  })
})

describe('formatFileSize — Arabic', () => {
  it('uses Western digits — §9.2 / AC-73', () => {
    expect(formatFileSize(1023 * KB, arabic, 'ar')).toBe('1,023 KB')
    expect(formatFileSize(1023 * KB, arabic, 'ar')).not.toMatch(/[٠-٩]/)
    expect(formatFileSize(1_482_113, arabic, 'ar')).not.toMatch(/[٠-٩]/)
  })

  it('leaves the unit symbol untranslated', () => {
    expect(formatFileSize(240 * KB, arabic, 'ar')).toContain('KB')
    expect(formatFileSize(4 * MB, arabic, 'ar')).toContain('MB')
  })

  it('reads identically in both languages — the value is two LTR runs', () => {
    for (const bytes of [0, 300, 245_760, MB, 1_482_113]) {
      expect(formatFileSize(bytes, arabic, 'ar')).toBe(formatFileSize(bytes, t, 'en'))
    }
  })
})

describe('formatFileSize — what it refuses', () => {
  it('rejects a negative size', () => {
    expect(() => formatFileSize(-1, t)).toThrow(/non-negative/)
    expect(() => formatFileSize(-2048, t)).toThrow(/non-negative/)
  })

  it('rejects a fractional byte count', () => {
    expect(() => formatFileSize(1024.5, t)).toThrow(/integer/)
  })

  it('rejects a non-finite size', () => {
    expect(() => formatFileSize(Number.NaN, t)).toThrow(/finite/)
    expect(() => formatFileSize(Number.POSITIVE_INFINITY, t)).toThrow(/finite/)
  })
})

describe('FILE_SIZE_MESSAGES_EN', () => {
  it('declares exactly the {size} placeholder on every key', () => {
    for (const [key, template] of Object.entries(FILE_SIZE_MESSAGES_EN)) {
      expect(placeholdersIn(template), key).toEqual(['size'])
    }
  })

  it('carries the unit in the template, so no call site can build one', () => {
    expect(FILE_SIZE_MESSAGES_EN['fileSize.kb']).toBe('{size} KB')
    expect(FILE_SIZE_MESSAGES_EN['fileSize.mb']).toBe('{size} MB')
  })
})
