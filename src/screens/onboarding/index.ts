/**
 * The onboarding layer — design §10. One shell layer, at `?onboarding=1`.
 *
 * `route.overlay` gains **`onboarding` and nothing else** (R4-3): re-authentication
 * is a modal with no route and no URL param, because a re-auth surface with an
 * address is one an operator can navigate past.
 */

export { OnboardingBeacon } from './OnboardingBeacon'
export { WelcomeDialog } from './WelcomeDialog'
export { OnboardingLayer } from './OnboardingLayer'
export { ONBOARDING_EN, ROLE_INTRO_KEYS, ROLE_KEYS } from './copy'
