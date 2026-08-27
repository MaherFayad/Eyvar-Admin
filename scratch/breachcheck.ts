import { EYVAR_NOW } from '../src/data/clients/index'
import { allRequestFixtures } from '../src/data/fixtures/requests'
import { safetyIncidentFixtures } from '../src/data/fixtures/safety'
import { fairnessCaseFixtures } from '../src/data/fixtures/fairness'
import { assuranceTripFixtures } from '../src/data/fixtures/assurance'

const now = Date.parse(EYVAR_NOW)
function scan(name: string, rows: any[], isOpen: (r: any) => boolean) {
  for (const r of rows) {
    const past = r.slaDueAt !== null && Date.parse(r.slaDueAt) < now
    const stamped = r.slaBreachedAt !== null
    const open = isOpen(r)
    if (past !== stamped || (stamped && !open)) {
      console.log(`${name} ${r.id}: past=${past} stamped=${stamped} open=${open} due=${r.slaDueAt}`)
    }
  }
}
scan('req', allRequestFixtures, (r) => ['searching','offered','no-drivers'].includes(r.status))
scan('inc', safetyIncidentFixtures as any[], (r) => r.status === 'open')
scan('fc', fairnessCaseFixtures as any[], (r) => r.status === 'open')
scan('ust', assuranceTripFixtures as any[], () => true)
