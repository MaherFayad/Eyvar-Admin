import { chromium } from 'playwright'
const routes = [
  ['/operations/corporate', 'corp'],
  ['/operations/requests', 'req'],
  ['/admin/communications', 'comms'],
]
const b = await chromium.launch()
for (const [route, name] of routes) {
  for (const dir of ['ltr','rtl']) {
    const p = await b.newPage({ viewport:{width:1512,height:900} })
    const errs=[]; p.on('pageerror',e=>errs.push(String(e.message).slice(0,140)))
    await p.goto('http://localhost:5235'+route,{waitUntil:'networkidle',timeout:60000})
    await p.waitForTimeout(1500)
    if (dir==='rtl') { await p.evaluate(()=>{document.documentElement.setAttribute('dir','rtl');document.documentElement.setAttribute('lang','ar')}); await p.waitForTimeout(800) }
    await p.screenshot({ path: `.pw-h/${name}-${dir}.png` })
    if (errs.length) console.log(name, dir, 'ERRORS', [...new Set(errs)].slice(0,3))
    else console.log(name, dir, 'ok')
    await p.close()
  }
}
await b.close()
