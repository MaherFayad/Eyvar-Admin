import { beforeEach, describe, it } from 'vitest'
import { disableMockLatency, mockFailures } from '../config'
import { listWallets } from './wallets'
import { riderFixtures } from '../fixtures/riders'

beforeEach(() => { disableMockLatency(); mockFailures.clear() })

describe('dump', () => {
  it('dumps', async () => {
    const p1 = await listWallets({ pageSize: 25 })
    const rows = p1.items.map((w, i) => `${String(i + 1).padStart(2)} ${w.riderId} ${w.riderName.padEnd(28)} bal=${String(w.balanceHalalas).padStart(8)} n=${String(w.postingCount).padStart(2)} last=${w.lastActivityAt ?? '-'}`)
    const all = await listWallets({ pageSize: 100 })
    console.log('DUMPSTART\n' + rows.join('\n')
      + `\npage1 null lastActivity = ${p1.items.filter((w) => w.lastActivityAt === null).length} of ${p1.items.length}`
      + `\nall null lastActivity = ${all.items.filter((w) => w.lastActivityAt === null).length} of ${all.items.length}`
      + `\nnamed riders = ${riderFixtures.length}`
      + '\nDUMPEND')
  })
})
