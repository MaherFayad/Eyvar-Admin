import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'
import { resetDataLayer } from '@/data/clients'

// Every test starts from a clean data layer: no leaked fixtures, no injected
// failure, no carried-over latency setting. See src/data/clients/index.ts.
beforeEach(() => {
  resetDataLayer()
})
