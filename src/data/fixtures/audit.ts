/**
 * The audit entries the seeded roster implies (plan T7.6): the invitation the
 * roster shows as outstanding, the rota it shows as filled, and the policy it
 * shows as saved. Without them the Activity Log opens on its first-run empty
 * and teaches an operator nothing about what the log looks like.
 */

import type { AuditEntry } from '../types/audit'
import { offsetFromNow } from '../mock/clock'

export const auditFixtures: AuditEntry[] = [
  {
    id: 'AUD-00001',
    at: offsetFromNow({ days: -6 }),
    action: 'team.invite',
    actorId: 'USR-1',
    actorName: 'Sarah Al-Rashid',
    subjectType: 'operator',
    subjectId: 'USR-4',
    amountHalalas: null,
    reasonCode: null,
    note: null,
    detail: { key: 'admin.audit.team.invited', params: { name: 'Noura Al-Fahad', role: 'Support' } },
  },
  {
    id: 'AUD-00002',
    at: offsetFromNow({ days: -5 }),
    action: 'team.rota',
    actorId: 'USR-1',
    actorName: 'Sarah Al-Rashid',
    subjectType: 'rota',
    subjectId: 'on-call',
    amountHalalas: null,
    reasonCode: null,
    note: null,
    detail: { key: 'admin.audit.team.rota', params: { primary: 'Yousef Al-Balawi' } },
  },
  {
    id: 'AUD-00003',
    at: offsetFromNow({ days: -2 }),
    action: 'team.securityPolicy',
    actorId: 'USR-1',
    actorName: 'Sarah Al-Rashid',
    subjectType: 'policy',
    subjectId: 'security',
    amountHalalas: null,
    reasonCode: null,
    note: null,
    detail: {
      key: 'admin.audit.team.securityPolicy',
      params: { idleMinutes: 30, expiryHours: 12, twoFactor: 'yes' },
    },
  },
  {
    id: 'AUD-00004',
    at: offsetFromNow({ hours: -20 }),
    action: 'team.reinstate',
    actorId: 'USR-1',
    actorName: 'Sarah Al-Rashid',
    subjectType: 'operator',
    subjectId: 'USR-5',
    amountHalalas: null,
    reasonCode: null,
    note: null,
    detail: { key: 'admin.audit.team.reinstated', params: { name: 'Yousef Al-Balawi' } },
  },
]
