/**
 * The onboarding layer's illustrations (ONBOARDING-UX-PLAN.md §4). One per
 * step, one per role, one for the completed track. Generated from
 * `docs/05-restructure/design/onboarding-illustrations/source/` by
 * `scripts/illustrations/tokenise.mjs`; decorative and `aria-hidden`, so a
 * missing entry renders nothing rather than failing a criterion.
 */

import type { ComponentType } from 'react'
import type { RoleName } from '@/data/types/session'
import type { ArtProps } from './types'
import { CommonAccountArt } from './CommonAccountArt'
import { CommonAuditArt } from './CommonAuditArt'
import { CommonMyworkArt } from './CommonMyworkArt'
import { CompleteArt } from './CompleteArt'
import { FinanceEscrowArt } from './FinanceEscrowArt'
import { FinanceGoodwillArt } from './FinanceGoodwillArt'
import { FinanceLedgerArt } from './FinanceLedgerArt'
import { FinanceReconciliationArt } from './FinanceReconciliationArt'
import { FinanceRoutingArt } from './FinanceRoutingArt'
import { OpsApplicationArt } from './OpsApplicationArt'
import { OpsAssuranceArt } from './OpsAssuranceArt'
import { OpsDispatchArt } from './OpsDispatchArt'
import { OpsFairnessArt } from './OpsFairnessArt'
import { OpsRequestsArt } from './OpsRequestsArt'
import { OwnerPolicyArt } from './OwnerPolicyArt'
import { OwnerPositionArt } from './OwnerPositionArt'
import { OwnerPricingArt } from './OwnerPricingArt'
import { OwnerTeamArt } from './OwnerTeamArt'
import { RoleFinanceArt } from './RoleFinanceArt'
import { RoleOpsManagerArt } from './RoleOpsManagerArt'
import { RoleOwnerArt } from './RoleOwnerArt'
import { RoleSupportArt } from './RoleSupportArt'
import { SupportBoundaryArt } from './SupportBoundaryArt'
import { SupportGoodwillArt } from './SupportGoodwillArt'
import { SupportProfileArt } from './SupportProfileArt'
import { SupportTicketArt } from './SupportTicketArt'

export type { ArtProps }
export { CompleteArt }

export const STEP_ART: Readonly<Record<string, ComponentType<ArtProps>>> = {
  'common.account': CommonAccountArt,
  'common.mywork': CommonMyworkArt,
  'common.audit': CommonAuditArt,
  'owner.team': OwnerTeamArt,
  'owner.policy': OwnerPolicyArt,
  'owner.position': OwnerPositionArt,
  'owner.pricing': OwnerPricingArt,
  'finance.ledger': FinanceLedgerArt,
  'finance.escrow': FinanceEscrowArt,
  'finance.reconciliation': FinanceReconciliationArt,
  'finance.goodwill': FinanceGoodwillArt,
  'finance.routing': FinanceRoutingArt,
  'ops.application': OpsApplicationArt,
  'ops.requests': OpsRequestsArt,
  'ops.assurance': OpsAssuranceArt,
  'ops.dispatch': OpsDispatchArt,
  'ops.fairness': OpsFairnessArt,
  'support.ticket': SupportTicketArt,
  'support.profile': SupportProfileArt,
  'support.goodwill': SupportGoodwillArt,
  'support.boundary': SupportBoundaryArt,
}

export const ROLE_ART: Readonly<Partial<Record<RoleName, ComponentType<ArtProps>>>> = {
  Owner: RoleOwnerArt,
  'Ops Manager': RoleOpsManagerArt,
  Finance: RoleFinanceArt,
  Support: RoleSupportArt,
}
