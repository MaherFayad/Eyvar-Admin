/**
 * Admin › Policy — **P6-T3**, plus the wiring the three older panes never had.
 *
 * ## One save, for all four panes
 *
 * `dispatch`, `cities`, `limits` and the SLA grid are one document
 * (`OperationalPolicy`), one draft, and one `saveOperationalPolicy`. The shell's
 * save bar is the screen's **only primary action** (R3), and the discard next to
 * it puts the draft back to what the server holds.
 *
 * This matters beyond tidiness. The three older panes were `useState` over
 * module literals with a `setTimeout` for a save — a form that *feels* wired and
 * is not. Nothing round-tripped, so nothing could be observed to be lost, and
 * that is the soil F-014 grows in: the legacy screen also felt fine, and it was
 * silently flattening tier inheritance on every press.
 *
 * ## The registry is the one thing that does not go through the save bar
 *
 * A reason code is created, edited and retired **one at a time**, each with its
 * own confirmation and its own audit entry. A single button that writes 30 rows
 * read back out of 30 inputs is exactly the construction that produced F-014,
 * and it is not offered.
 *
 * ## Four states
 *
 * The document read has three reachable ones — loading, error, content — and its
 * `empty` is declared unreachable rather than left to a default, because a
 * policy document always exists. The two lists inside it carry their own:
 * the cities table has a first-run sentence, and the reason-code table has both
 * kinds of empty through `DataTable`.
 *
 * Rules applied
 *   R3        one primary on the screen: the save bar's `Save`.
 *   §11.2     a role without `manage_settings` sees every control **disabled in
 *             place with the reason**, never hidden.
 *   §9.2 st.5 the route reports its dirty state; the shell renders the bar.
 *   §11.3     P4 skeleton — the settings-form shape this route declares.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { getOperationalPolicy, saveOperationalPolicy } from '@/data/clients'
import { isApiError, type SubTabRoute } from '@/data/types'
import type { OperationalPolicy } from '@/data/types/policy'
import { useAsync } from '@/hooks'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { useShell } from '@/shell/ShellContext'
import { canWriteSubTab, permissionContext } from '@/shell/permissions'
import { CitiesCard, DispatchCard, LimitsCard, fleetIndex } from './OperationalCards'
import { ReasonCodesCard } from './ReasonCodesCard'
import { SlaQueueGridCard, SlaTierDefaultsCard } from './SlaPolicyCards'
import { draftFromPolicy, draftToInput, isDraftDirty, type PolicyDraft } from './policyDraft'
import { withFallback } from '../../operations/localCopy'
import { POLICY_EN } from './copy'

export function AdminPolicyScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  /* AC-74 — the copy lives in `./copy.ts` and travels in this screen's
     own chunk. `withFallback` resolves a key the shell dictionary does
     not carry, so nothing here needs registering there. */
  const t = useMemo(
    /* **Memoised, and it is load-bearing.** `withFallback` returns a NEW
       function on every call, and several screens carry `t` in a `deps`
       array — so an unmemoised wrapper re-ran the fetch, which re-rendered,
       which rebuilt the wrapper. Two suites hung outright. */
    () => withFallback(shell.language.t, POLICY_EN),
    [shell.language.t],
  )
  const { dir, language } = shell.language

  const canWrite = canWriteSubTab(permissionContext(shell.session), row) && !shell.isFrozen
  const blockedReason = canWrite ? null : t('policy.blocked.permission')

  const policy = useAsync<OperationalPolicy>((signal) => getOperationalPolicy(signal), {
    deps: [],
    /* No parameters; a save goes through `refetch`, which bypasses the read. */
    cacheKey: 'policy.get',
    /* A policy document always exists — there is no tenant without one — so
       `empty` is not a state this read can be in. Declared rather than left to
       `defaultIsEmpty`, which would answer `false` by accident. */
    isEmpty: () => false,
  })

  const [draft, setDraft] = useState<PolicyDraft | null>(null)
  const [isSaving, setSaving] = useState(false)

  /* The draft is seeded from the server and re-seeded whenever the server's copy
     changes — after a save, and after a retry. */
  useEffect(() => {
    if (policy.data) setDraft(draftFromPolicy(policy.data))
  }, [policy.data])

  const isDirty = Boolean(draft && policy.data && isDraftDirty(draft, policy.data))

  const fleetById = useMemo(() => fleetIndex(policy.data?.cities ?? []), [policy.data])

  const refetch = policy.refetch

  const discard = useCallback(() => {
    if (policy.data) setDraft(draftFromPolicy(policy.data))
    toast.info(t('policy.toast.discarded'))
  }, [policy.data, t])

  const save = useCallback(async () => {
    if (!draft) return
    setSaving(true)
    try {
      await saveOperationalPolicy(draftToInput(draft))
      toast.success(t('policy.toast.saved'))
      /* Re-read rather than trust the response: the server re-attaches the
         derived fleet count, and a screen that kept its own copy would drift
         from it the first time a captain signed up. */
      refetch()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : t('policy.save.failed'))
    } finally {
      setSaving(false)
    }
  }, [draft, refetch, t])

  /**
   * **The two handlers reach the save bar through a ref, and that is not a
   * style choice.** `setSaveBar` takes an object; a new object every render is
   * new shell state, which is another render, which is another object. The
   * handlers close over `draft`, so they change identity on every keystroke —
   * put them in the dependency array and the screen spins.
   *
   * The ref holds the latest pair; the effect below depends only on the four
   * values that actually change what the bar LOOKS like.
   */
  const handlers = useRef({ save, discard })
  handlers.current = { save, discard }

  /* A string, so the effect compares by value rather than by translator identity. */
  const entityLabel = t('policy.entity')

  /* §9.2 state 5 — the route owns the dirty state, the shell owns the bar. */
  const { setSaveBar } = shell
  useEffect(() => {
    if (!isDirty || !canWrite) {
      setSaveBar(null)
      return
    }
    setSaveBar({
      status: isSaving ? 'save-in-flight' : 'dirty',
      entity: entityLabel,
      canSave: true,
      canDiscard: true,
      isSaving,
      onSave: () => void handlers.current.save(),
      onDiscard: () => handlers.current.discard(),
    })
    return () => setSaveBar(null)
  }, [isDirty, isSaving, canWrite, setSaveBar, entityLabel])

  /* Unmounting with a dirty draft must not leave the bar behind. */
  useEffect(() => () => setSaveBar(null), [setSaveBar])

  const header = (
    <PageHeader title={t(row.titleKey)} meta={t('policy.meta')} t={t} dir={dir} />
  )

  if (policy.status === 'loading') {
    return (
      <SingleColumnPage header={header}>
        <LoadingSkeleton pattern="P4" label={t('policy.loading')} />
      </SingleColumnPage>
    )
  }

  if (policy.status === 'error' || !draft) {
    return (
      <SingleColumnPage header={header}>
        <ErrorState
          scope="page"
          message={t('policy.error.read')}
          action={{ label: t('policy.error.retry'), onClick: policy.refetch }}
        />
      </SingleColumnPage>
    )
  }

  const paneProps = {
    draft,
    onChange: setDraft,
    canWrite,
    blockedReason,
    t,
    language,
  }

  return (
    <SingleColumnPage header={header}>
      <div className="flex max-w-5xl flex-col gap-6">
        <DispatchCard {...paneProps} />
        <CitiesCard {...paneProps} fleetById={fleetById} />
        <LimitsCard {...paneProps} />
        <SlaTierDefaultsCard {...paneProps} />
        <SlaQueueGridCard {...paneProps} />
        <ReasonCodesCard
          canWrite={canWrite}
          blockedReason={blockedReason}
          t={t}
          language={language}
        />
      </div>
    </SingleColumnPage>
  )
}
