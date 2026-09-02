import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage()
const errs = []
page.on('pageerror', e => errs.push(String(e).slice(0,200)))
await page.addInitScript(`
  window.__sk = 0; window.__resetSk = () => { window.__sk = 0 };
  const hit = n => n.nodeType===1 && ((n.matches&&n.matches('[aria-busy="true"]'))||(n.querySelector&&!!n.querySelector('[aria-busy="true"]')));
  new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(hit(n))window.__sk++}).observe(document,{childList:true,subtree:true});
`)
const body = async () => (await page.evaluate(() => document.body.innerText)).split(/\s+/).join(' ')
const settleErr = async () => page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), { timeout: 20000 })

await page.goto('http://localhost:5211/financials/pricing?view=rate-cards', { waitUntil: 'commit', timeout: 60000 })
await page.waitForTimeout(4000); await settleErr()
const t1 = await body()
console.log('rate-cards cold  skeletons=', await page.evaluate(()=>window.__sk))
console.log('  contains "Rate":', /rate/i.test(t1), '| page error state:', /Couldn.t load|Something went wrong/i.test(t1))

// switch to another pricing view and back
await page.evaluate(()=>window.__resetSk())
await page.goto('http://localhost:5211/financials/pricing?view=plans', { waitUntil: 'commit', timeout: 60000 })
await page.waitForTimeout(2500); await settleErr()
await page.evaluate(()=>window.__resetSk())
await page.goto('http://localhost:5211/financials/pricing?view=rate-cards', { waitUntil: 'commit', timeout: 60000 })
await page.waitForTimeout(2500); await settleErr()
const t2 = await body()
console.log('rate-cards revisit skeletons=', await page.evaluate(()=>window.__sk), '(full page reload, so a cold mount is expected)')
console.log('  identical content to first visit:', t1 === t2)
console.log('  page errors:', errs.length ? errs : 'none')
await browser.close()
