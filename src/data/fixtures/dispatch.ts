/**
 * Live Dispatch — telemetry and interventions (T1.1, T1.2).
 *
 * The two rows below are the literals `DispatchScreen.tsx:208` carried, plus
 * three states the screen could never reach: an acknowledged one, a reassigned
 * one, and a `stranded` trip with no captain at all.
 */

import { EYVAR_NOW, EYVAR_TZ_OFFSET } from '../mock/clock'
import type { DispatchTelemetry, Intervention } from '../types/dispatch'

const at = (hhmm: string) => `2026-06-25T${hhmm}:00${EYVAR_TZ_OFFSET}` as const

/**
 * Measured against the fixed clock, so a capture taken twice is the same
 * capture. `asOf` is `EYVAR_NOW`; the header prints *"as of 09:14"* and claims
 * nothing about a connection (X4).
 */
export const dispatchTelemetryFixture: DispatchTelemetry = {
  /* The three the header used to hardcode as `'42s'`, `'96.4%'`, `'78.2%'`. */
  medianMatchSeconds: 42,
  autoMatchPercent: 96.4,
  fleetUtilisationPercent: 78.2,
  asOf: EYVAR_NOW,
}

export const interventionFixtures: Intervention[] = [
  {
    id: 'INT-01',
    kind: 'delayed',
    status: 'open',
    tripId: 'TRP-1002',
    driverId: 'DRV-0101',
    driverName: 'Abdullah Al-Otaibi',
    riderName: 'Sara Al-Ghamdi',
    place: 'Al-Olaya',
    raisedAt: at('09:06'),
    acknowledgedAt: null,
    acknowledgedBy: null,
    acknowledgementNote: null,
    reassignedToDriverId: null,
    reassignedToDriverName: null,
  },
  {
    id: 'INT-02',
    kind: 'sos',
    status: 'open',
    tripId: 'TRP-1004',
    driverId: 'DRV-0103',
    driverName: 'Majed Al-Harbi',
    riderName: 'Nouf Al-Qahtani',
    place: 'King Fahd Rd',
    raisedAt: at('09:11'),
    acknowledgedAt: null,
    acknowledgedBy: null,
    acknowledgementNote: null,
    reassignedToDriverId: null,
    reassignedToDriverName: null,
  },
  /* Nobody is coming. `driverId` is null and that is the state, not a gap. */
  {
    id: 'INT-03',
    kind: 'stranded',
    status: 'open',
    tripId: null,
    driverId: null,
    driverName: null,
    riderName: 'عبد الرحمن بن محمد آل عبد الله القحطاني',
    place: 'حي النرجس',
    raisedAt: at('08:52'),
    acknowledgedAt: null,
    acknowledgedBy: null,
    acknowledgementNote: null,
    reassignedToDriverId: null,
    reassignedToDriverName: null,
  },
  /* Acknowledged, not resolved: somebody has it and the rider is still late. */
  {
    id: 'INT-04',
    kind: 'delayed',
    status: 'acknowledged',
    tripId: 'TRP-1007',
    driverId: 'DRV-0104',
    driverName: 'Yousef Al-Balawi',
    riderName: 'Hessa Al-Mutairi',
    place: 'Al Sahafa',
    raisedAt: at('08:40'),
    acknowledgedAt: at('08:47'),
    acknowledgedBy: 'USR-5',
    acknowledgementNote: 'Captain called back, stuck behind the King Fahd closure.',
    reassignedToDriverId: null,
    reassignedToDriverName: null,
  },
  /* Already handed to another captain. Kept open in the record, closed in fact. */
  {
    id: 'INT-05',
    kind: 'stranded',
    status: 'reassigned',
    tripId: 'TRP-1009',
    driverId: 'DRV-0102',
    driverName: 'Turki Al-Shammari',
    riderName: 'Reem Al-Otaibi',
    place: 'Al Wurud District',
    raisedAt: at('08:12'),
    acknowledgedAt: at('08:19'),
    acknowledgedBy: 'USR-5',
    acknowledgementNote: null,
    reassignedToDriverId: 'DRV-0105',
    reassignedToDriverName: 'Khalid Al-Zahrani',
  },
]
