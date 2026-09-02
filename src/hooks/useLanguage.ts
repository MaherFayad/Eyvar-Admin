/**
 * The single language hook. DESIGN.md §9.7, design spec §14, **AC-70**.
 *
 * §9.7's ruling, applied to the DOM rather than to a stylesheet:
 *
 * > **One hook only** — never both `body.lang-ar` and `[dir="rtl"]` as parallel
 * > expressions of the same condition.
 *
 * `applyDocumentDirection` sets `dir` **and** `lang` on the **document element**
 * (AC-70: not on a subtree — §9.3's `.sb`-only scoping was a policy for a
 * half-translated product and its precondition is gone). CSS keys off exactly one
 * of them, and the recommendation to frontend-engineer is `:root:lang(ar)`,
 * because `dir` also flips for a single RTL string inside an English UI while
 * `lang` never does — and the six language-varying geometry tokens vary by
 * *language*, not by direction.
 *
 * Language persistence is **Q1**, same as the nav flag: today's app reseeds to
 * `en` on every load (`eyvar_ops_panel_v40_fixed.html:2570`), and the store seam
 * in `src/lib/persistence.ts` is where that gets fixed once.
 *
 * The provider is rendered by frontend-engineer — this file exports the context
 * and the state, never JSX.
 */

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  type Direction,
  type Language,
  directionFor,
  isLanguage,
  localeFor,
} from '@/lib/i18n/direction'
import { createTranslator, type Dictionary, type Translator } from '@/lib/i18n/translate'
import { defaultUiStore, UI_STATE_KEYS, type UiStateStore } from '@/lib/persistence'
/* **D16 — the validator is what turns `defaultUiStore` into a cached store.**
   Without one it stays the pre-D16 in-memory store, deliberately: caching an
   unvalidated `JSON.parse` result means casting `unknown` to `T`, and the
   half-parsed object then surfaces three screens away from the storage read
   that produced it. A type guard is a pure function, so this import crosses no
   layer the hook does not already cross for `@/data/types`. */
import { isUiLanguage } from '@/data/clients/preferences'

export interface LanguageState {
  language: Language
  /** Derived, never stored — foundation spec §8.3 marks `ui.dir` derived. */
  dir: Direction
  /** The one locale string for every `Intl` call: `ar-SA-u-ca-gregory-nu-latn`. */
  locale: string
  setLanguage: (language: Language) => void
  /**
   * `Translator`, not `Translate` — it carries `.plural` (AC-670 / AC-671).
   * A component that only renders strings may keep declaring `t: Translate`;
   * a `Translator` is assignable to it.
   */
  t: Translator
}

export interface UseLanguageStateOptions {
  initialLanguage?: Language
  /** `{ en: {...}, ar: {...} }`. An empty `ar` dictionary is AC-74's test, not a bug. */
  dictionaries: Readonly<Record<Language, Dictionary>>
  store?: UiStateStore<Language>
  /** Set to `false` in a test that does not want the jsdom document mutated. */
  applyToDocument?: boolean
  document?: Document
}

/**
 * Sets `dir` and `lang` on `<html>`. **AC-70.** Idempotent; call it whenever the
 * language changes and once at boot.
 */
export function applyDocumentDirection(
  language: Language,
  doc: Document | undefined = globalThis.document,
): void {
  if (!doc?.documentElement) return
  doc.documentElement.setAttribute('lang', language)
  doc.documentElement.setAttribute('dir', directionFor(language))
}

/**
 * The state machine behind the provider. One per application — the shell calls
 * it once and puts the result on `LanguageContext`.
 */
export function useLanguageState(options: UseLanguageStateOptions): LanguageState {
  const {
    initialLanguage,
    dictionaries,
    store = defaultUiStore(UI_STATE_KEYS.language, isUiLanguage),
    applyToDocument = true,
    document: doc,
  } = options

  const [language, setLanguageState] = useState<Language>(() => {
    const stored = store.read()
    const initial = isLanguage(stored) ? stored : (initialLanguage ?? 'en')
    if (applyToDocument) applyDocumentDirection(initial, doc)
    return initial
  })

  const setLanguage = useCallback(
    (next: Language) => {
      store.write(next)
      if (applyToDocument) applyDocumentDirection(next, doc)
      setLanguageState(next)
    },
    [store, applyToDocument, doc],
  )

  const t = useMemo(
    () =>
      createTranslator({
        dictionary: dictionaries[language],
        // English is the fallback for every language, including itself.
        // AC-74: an empty Arabic dictionary shows English, never a raw key.
        fallback: dictionaries.en,
        // Plural selection needs to know which locale's CLDR table to read.
        // Arabic has six cardinal forms; English has two.
        language,
        fallbackLanguage: 'en',
      }),
    [dictionaries, language],
  )

  return useMemo(
    () => ({ language, dir: directionFor(language), locale: localeFor(language), setLanguage, t }),
    [language, setLanguage, t],
  )
}

/**
 * Default is English with an empty dictionary set, so a component rendered
 * outside the provider in a unit test throws on the *missing key*, naming the
 * key — which is more useful than "useLanguage must be used within a provider".
 */
export const LanguageContext = createContext<LanguageState | null>(null)

export function useLanguage(): LanguageState {
  const value = useContext(LanguageContext)
  if (value === null) {
    throw new Error('useLanguage was called outside a LanguageContext provider.')
  }
  return value
}

/* ── dev-only: HMR must not mint a second context ─────────────────────────
   This module creates a React context at module scope AND exports hooks,
   so Vite's React plugin makes it self-accepting. Fast Refresh then replaces
   the module in place on every edit — and `createContext` runs again, minting a
   NEW context object while the already-mounted tree still reads the OLD one.
   Every consumer reads `null` and the next render throws

       useLanguage was called outside a LanguageContext provider.

   from a tree that is, in fact, correctly wrapped. It is a false alarm that
   costs a real debugging session, and it fires whenever anyone edits a shell
   file with the app open — which, with several people in this tree at once, is
   most of the time.

   `invalidate()` inside the accept handler declines the in-place swap and asks
   Vite to propagate to importers instead, which ends in a full reload. Slower
   than a hot swap, and correct instead of a lie. Dev only: the whole block is
   `import.meta.hot`-guarded, so it is dead code in the production bundle. */
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    import.meta.hot?.invalidate()
  })
}
