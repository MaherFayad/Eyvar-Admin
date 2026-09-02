/**
 * Admin › Workspace — the merged `general` + `branding` + `legal` pane.
 *
 * ## What this replaces
 *
 * `AdminWorkspaceScreen.tsx` was 231 lines in which every field was a
 * `useState` seeded with a string literal (`:18`–`:28`), there was no client,
 * there were none of the four states, and the save bar's `onSave` was
 * `setTimeout(…, 300)` — a fake latency that made an unwired form feel wired.
 * The `Upload New Logo` button at `:178` had no `onClick` at all.
 *
 * ## Why this is not `session.updatePreferences`
 *
 * `clients/session.ts:106` exposes `updatePreferences`, it has zero UI callers,
 * and it is **not** the operation the stub was standing in front of.
 * `UserPreferences` is `{ subTabNavCollapsed, language }` — *my* nav state and
 * *my* language, per operator, behind `GET /me/preferences`. Everything on this
 * screen is workspace-scoped and shared: one support email, one wordmark, one
 * Terms of Service version for every operator and every rider.
 *
 * The single overlap is language, and legacy already shows why it is two
 * settings rather than one: `opsConfig.general.language` (`:2570`) is the
 * workspace default and `applyLanguage` (`:14596`) reads it at boot, while the
 * operator's own toggle changes only their session. Collapsing them would mean
 * one operator switching to Arabic switches the console for everyone. So
 * `updatePreferences` keeps its job, this client gets its own, and the language
 * default is deliberately **not** modelled here until somebody rules on which
 * of the two wins at boot — reported rather than guessed.
 *
 * ## The two logo stores
 *
 * The route row (`fixtures/routeTable.ts:742`) says the merge exists to close
 * *"two logo stores never synchronised"*. `types/workspace.ts` has the detail.
 * There is one `logo` here, `updateLogo` is the only writer, and the 200 KB cap
 * is enforced in the client rather than in the file input — a limit that lives
 * only in the browser is a limit the next surface skips.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation } from '../mock/delay'
import { ApiError } from '../types/common'
import {
  MAX_LOGO_BYTES,
  type LegalDocument,
  type ReconsentResult,
  type WorkspaceSettings,
  type WorkspaceSettingsPatch,
} from '../types/workspace'
import { appendAudit } from './audit'
import { http } from './http'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let workspaceSettingsFixture!: Fixtures['workspaceSettingsFixture']
onFixturesLoaded((f) => {
  workspaceSettingsFixture = f.workspaceSettingsFixture
  /* Seeded here rather than at module load: these locals are built from
     late-bound fixtures, which are undefined until the fixture chunk lands. */
  settings = clone(workspaceSettingsFixture)
})

export const WORKSPACE_OPERATIONS = {
  get: 'workspace.get',
  update: 'workspace.update',
  updateLogo: 'workspace.updateLogo',
  removeLogo: 'workspace.removeLogo',
  reconsent: 'workspace.reconsent',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(WORKSPACE_OPERATIONS))

let settings!: WorkspaceSettings

/** How many accounts each document has already been re-prompted for, this session. */
let reconsentQueued: Record<string, number> = {}

export function resetWorkspace(): void {
  /* Nothing seeded yet: the fixture chunk has not landed, so there is no
     state to reset and the rows this would read are still undefined. The
     binder in this module seeds fresh state when it does land. */
  if (!fixturesLoaded()) return
  settings = clone(workspaceSettingsFixture)
  reconsentQueued = {}
}

function clone(value: WorkspaceSettings): WorkspaceSettings {
  return {
    ...value,
    logo: { ...value.logo },
    legalDocuments: value.legalDocuments.map((d) => ({ ...d })),
  }
}

/**
 * GET /api/v1/workspace/settings
 *   -> WorkspaceSettings
 *
 * One read for the whole pane. The three legacy panes were three reads and
 * three saves, which is how the two logo stores drifted in the first place.
 */
export async function getWorkspaceSettings(signal?: AbortSignal): Promise<WorkspaceSettings> {
  if (DATA_SOURCE === 'http') {
    return http.get<WorkspaceSettings>('/workspace/settings', undefined, { signal })
  }
  return mock(WORKSPACE_OPERATIONS.get, signal, () => clone(settings))
}

/**
 * PATCH /api/v1/workspace/settings
 *   body: WorkspaceSettingsPatch
 *   -> WorkspaceSettings
 *
 * Validated here, not in the form. §10.4 wants the message under the field
 * before the mutation, and the form does that too — but the client is what
 * makes the rule true for the next surface, and a 422 with a `details[].field`
 * is what lets the form render one without inventing its own vocabulary.
 */
export async function updateWorkspaceSettings(
  patch: WorkspaceSettingsPatch,
  signal?: AbortSignal,
): Promise<WorkspaceSettings> {
  if (DATA_SOURCE === 'http') {
    return http.patch<WorkspaceSettings>('/workspace/settings', patch, { signal })
  }
  return mockMutation(WORKSPACE_OPERATIONS.update, signal, () => {
    const next = { ...settings, ...patch }
    const invalid: Array<{ field: string; code: string; message: string }> = []
    if (next.siteName.trim() === '') {
      invalid.push({ field: 'siteName', code: 'required', message: 'A portal name is required.' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.supportEmail.trim())) {
      invalid.push({
        field: 'supportEmail',
        code: 'invalid_email',
        message: 'Enter an email address riders can reply to.',
      })
    }
    if (next.brandNameEn.trim() === '') {
      invalid.push({ field: 'brandNameEn', code: 'required', message: 'A wordmark is required.' })
    }
    if (invalid.length > 0) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'invalid_workspace_settings',
        message: 'Workspace settings failed validation',
        details: invalid,
        retryable: false,
      })
    }

    const changed = (Object.keys(patch) as Array<keyof WorkspaceSettingsPatch>).filter(
      (key) => patch[key] !== settings[key],
    )
    settings = { ...next, updatedAt: EYVAR_NOW, updatedBy: 'USR-1' }
    appendAudit({
      action: 'workspace.update',
      subjectType: 'workspace',
      subjectId: 'settings',
      amountHalalas: null,
      reasonCode: null,
      note: null,
      /* The changed field NAMES, not their values: a workspace save can carry a
         support phone number, and an audit log is read by more people than the
         record is. Same rule `policy.save` follows for legacy F-014. */
      detail: { key: 'admin.audit.workspace.updated', params: { fields: changed.join(', ') || '—' } },
    })
    return clone(settings)
  })
}

/**
 * PUT /api/v1/workspace/logo
 *   body: { dataUrl, fileName, sizeBytes }
 *   -> WorkspaceSettings
 *
 * **The single logo store.** Legacy had two — 200 KB and a data URL in one, 12
 * MB and a URL in the other, never synchronised. The cap is the smaller,
 * because it is the one that was actually enforced, and it is enforced *here*
 * so a second surface cannot skip it the way `DB.branding` skipped the first.
 */
export async function updateLogo(
  input: { dataUrl: string; fileName: string; sizeBytes: number },
  signal?: AbortSignal,
): Promise<WorkspaceSettings> {
  if (DATA_SOURCE === 'http') {
    return http.put<WorkspaceSettings>('/workspace/logo', input, { signal })
  }
  return mockMutation(WORKSPACE_OPERATIONS.updateLogo, signal, () => {
    if (input.sizeBytes > MAX_LOGO_BYTES) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'logo_too_large',
        message: `Logo is ${input.sizeBytes} bytes; the limit is ${MAX_LOGO_BYTES}`,
        details: [
          {
            field: 'logo',
            code: 'too_large',
            message: 'Pick a file under 200 KB.',
          },
        ],
        retryable: false,
      })
    }
    settings = {
      ...settings,
      logo: {
        dataUrl: input.dataUrl,
        fileName: input.fileName,
        sizeBytes: input.sizeBytes,
        updatedAt: EYVAR_NOW,
      },
      updatedAt: EYVAR_NOW,
      updatedBy: 'USR-1',
    }
    appendAudit({
      action: 'workspace.logo',
      subjectType: 'workspace',
      subjectId: 'logo',
      amountHalalas: null,
      reasonCode: null,
      note: null,
      detail: { key: 'admin.audit.workspace.logoUpdated', params: { file: input.fileName } },
    })
    return clone(settings)
  })
}

/**
 * DELETE /api/v1/workspace/logo
 *   -> WorkspaceSettings
 *
 * `null`, not `''`. Legacy's `clearLogo` (`:7974`) wrote the empty string and
 * then four call sites tested it for truthiness, which is how an empty string
 * became a sentinel nobody typed.
 */
export async function removeLogo(signal?: AbortSignal): Promise<WorkspaceSettings> {
  if (DATA_SOURCE === 'http') {
    return http.delete<WorkspaceSettings>('/workspace/logo', { signal })
  }
  return mockMutation(WORKSPACE_OPERATIONS.removeLogo, signal, () => {
    settings = {
      ...settings,
      logo: { dataUrl: null, fileName: null, sizeBytes: null, updatedAt: null },
      updatedAt: EYVAR_NOW,
      updatedBy: 'USR-1',
    }
    appendAudit({
      action: 'workspace.logo',
      subjectType: 'workspace',
      subjectId: 'logo',
      amountHalalas: null,
      reasonCode: null,
      note: null,
      detail: { key: 'admin.audit.workspace.logoRemoved', params: {} },
    })
    return clone(settings)
  })
}

/**
 * POST /api/v1/workspace/legal/:key/reconsent
 *   -> ReconsentResult
 *
 * **Replaces `onClick={() => toast.success('Re-consent prompt queued for all
 * active accounts')}`** — an inline toast claiming an act that never happened,
 * on the pane whose whole subject is legal consent.
 *
 * The count is served, not asserted. Legacy derives it by walking riders and
 * captains against `isConsentCurrent` (`:3846`) and the seed carries the
 * derivation's result per document, so the confirmation can state a number and
 * the toast can report the one that was actually queued.
 *
 * **Zero is legal and is not a refusal.** `driverAgreement` is seeded at 0 —
 * every captain is current — and the operation succeeds, returning `0`, because
 * *"nobody needed one"* is a different answer from *"we could not send them"*.
 * Queueing a second time within the session returns `0` for the same reason.
 */
export async function queueReconsent(
  documentKey: LegalDocument['key'],
  signal?: AbortSignal,
): Promise<ReconsentResult> {
  if (DATA_SOURCE === 'http') {
    return http.post<ReconsentResult>(`/workspace/legal/${documentKey}/reconsent`, {}, { signal })
  }
  return mockMutation(WORKSPACE_OPERATIONS.reconsent, signal, () => {
    const doc = settings.legalDocuments.find((d) => d.key === documentKey)
    if (!doc) {
      throw new ApiError({
        status: 404,
        kind: 'not-found',
        code: 'not_found',
        message: `No legal document with key ${documentKey}`,
        retryable: false,
      })
    }
    const alreadyQueued = reconsentQueued[documentKey] ?? 0
    const queued = Math.max(0, doc.pendingConsentCount - alreadyQueued)
    reconsentQueued = { ...reconsentQueued, [documentKey]: alreadyQueued + queued }
    appendAudit({
      action: 'legal.reconsent',
      subjectType: 'legal',
      subjectId: documentKey,
      amountHalalas: null,
      reasonCode: null,
      note: null,
      detail: {
        key: 'admin.audit.workspace.reconsentQueued',
        params: { version: doc.currentVersion, count: queued },
      },
    })
    return { documentKey, version: doc.currentVersion, queued }
  })
}
