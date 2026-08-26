import { describe, it } from 'vitest'
import { captainColumns } from '@/screens/operations/people/CaptainsView'
import { applicationColumns } from '@/screens/operations/people/ApplicationsView'
import { complianceColumns } from '@/screens/operations/people/ComplianceView'
import { riderColumns } from '@/screens/operations/people/RidersView'
const t = ((k: string) => k) as never
const l = 'en' as never
const h = (() => '/') as never
const deps = { t, language: l, now: '2026-06-24T09:00:00.000Z', canWrite: true, currentUserId: 'U', detailHref: h, rowErrors: new Map(), actorName: () => '', onClaim: () => undefined, onRelease: () => undefined, onTakeOver: () => undefined, onApprove: () => undefined, onReject: () => undefined } as never
const sets: [string, any[], number][] = [
  ['Captains', captainColumns(t, l, h) as any, 96],
  ['Applications', applicationColumns(deps) as any, 40],
  ['Compliance', complianceColumns(t, l, '2026-06-24T09:00:00.000Z' as never, h) as any, 96],
  ['Riders', riderColumns(t, l, h) as any, 96],
]
describe('report', () => { it('prints', () => {
  for (const [name, cols, lanes] of sets) {
    const shown = cols.filter((c: any) => c.defaultHidden !== true)
    const sum = shown.reduce((n: number, c: any) => n + (c.width ?? c.minWidth ?? 0), lanes)
    const last = shown[shown.length - 1]
    console.log(`${name}: sum=${sum} lanes=${lanes} cols=[${shown.map((c: any) => `${c.id}:${c.width ?? 'auto/' + c.minWidth}`).join(' ')}] trailing=${last.id}/${last.dataType ?? (last.align === 'end' ? 'number' : 'text')}`)
  }
}) })
