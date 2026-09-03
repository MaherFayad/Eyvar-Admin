/**
 * `AR` - the Arabic dictionary, assembled the way `EN` is.
 *
 * One module per English dictionary, spread in the same order, so the two sides
 * can be diffed file by file. `dictionaries.ts` imports the finished object and
 * hands it to `DICTIONARIES`; nothing else imports these modules directly.
 *
 * `src/i18n/dictionaries.ts` used to declare `AR` as an empty object, as AC-74's
 * fixture. The fallback chain it proved still works and is still tested - see
 * `src/lib/i18n/i18n.test.ts`, which builds its own empty dictionary rather than
 * borrowing this one.
 */

import type { Dictionary } from '@/lib'
import { SHELL_AR } from './shell'
import { SLA_MESSAGES_AR } from './sla'
import { CONFIRM_AR } from './confirm'
import { PWA_AR } from './pwa'
import { RIDER_VOCABULARY_AR, VOCABULARY_AR } from './vocabulary'
import { QUEUE_SHARED_AR } from './queues'
import { COMMANDS_AR } from './commands'
import { MY_WORK_AR } from './myWork'
import { REQUESTS_AR } from './requests'
import { ASSURANCE_AR } from './assurance'
import { TRIPS_AR } from './trips'
import { SUBSCRIPTIONS_AR } from './subscriptions'
import { PEOPLE_AR } from './people'
import { CORPORATE_AR } from './corporate'
import { DISPATCH_AR } from './dispatch'
import { TICKETS_AR } from './tickets'
import { DISPUTES_AR } from './disputes'
import { FAIRNESS_AR } from './fairness'
import { SAFETY_AR } from './safety'
import { CONVERSATIONS_AR } from './conversations'
import { OVERVIEW_AR } from './metrics'
import { ZONES_AR } from './zones'
import { REPORTS_AR } from './reports'
import { FINANCIALS_AR } from './financials'
import { PROFILE_AR } from './profile'
import { RIDER_PROFILE_AR } from './riderProfile'
import { ENTITY_RIDER_AR } from './entityRider'
import { AUTH_AR } from './auth'
import { ONBOARDING_AR } from './onboarding'
import { ADMIN_ACTIVITY_AR } from './adminActivity'
import { ADMIN_DATA_AR } from './adminData'
import { ADMIN_TEAM_AR } from './adminTeam'
import { ADMIN_WORKSPACE_AR } from './adminWorkspace'
import { POLICY_AR } from './policy'
import { COMMUNICATIONS_AR } from './communications'

export const AR: Dictionary = {
  ...SHELL_AR,
  ...SLA_MESSAGES_AR,
  ...CONFIRM_AR,
  ...PWA_AR,
  ...VOCABULARY_AR,
  ...RIDER_VOCABULARY_AR,
  ...QUEUE_SHARED_AR,
  ...COMMANDS_AR,
  ...MY_WORK_AR,
  ...REQUESTS_AR,
  ...ASSURANCE_AR,
  ...TRIPS_AR,
  ...SUBSCRIPTIONS_AR,
  ...PEOPLE_AR,
  ...CORPORATE_AR,
  ...DISPATCH_AR,
  ...TICKETS_AR,
  ...DISPUTES_AR,
  ...FAIRNESS_AR,
  ...SAFETY_AR,
  ...CONVERSATIONS_AR,
  ...OVERVIEW_AR,
  ...ZONES_AR,
  ...REPORTS_AR,
  ...FINANCIALS_AR,
  ...PROFILE_AR,
  ...RIDER_PROFILE_AR,
  ...ENTITY_RIDER_AR,
  ...AUTH_AR,
  ...ONBOARDING_AR,
  ...ADMIN_ACTIVITY_AR,
  ...ADMIN_DATA_AR,
  ...ADMIN_TEAM_AR,
  ...ADMIN_WORKSPACE_AR,
  ...POLICY_AR,
  ...COMMUNICATIONS_AR,
}
