import { chromium } from 'playwright'
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:1000}})
await p.goto('http://localhost:5433/admin/overview',{waitUntil:'networkidle'}); await p.waitForSelector('main [data-slot="card"]'); await p.waitForTimeout(400)
const tiles = p.locator('main ul[role="list"] > li')
const n = await tiles.count()
for (let i=0;i<n;i++){
  const t = tiles.nth(i)
  const txt = await t.innerText()
  const acc = await t.locator('a').first().evaluate(el=>el.innerText).catch(()=>null)
  const arias = await t.evaluate(el => ({
    hidden: [...el.querySelectorAll('[aria-hidden="true"]')].map(x=>x.textContent).filter(Boolean),
    srOnly: [...el.querySelectorAll('.sr-only')].map(x=>x.textContent),
  }))
  console.log('--- tile',i,JSON.stringify(txt.replace(/\n/g,' | ')))
  console.log('    aria-hidden text:',JSON.stringify(arias.hidden),' sr-only:',JSON.stringify(arias.srOnly))
}
await b.close()
