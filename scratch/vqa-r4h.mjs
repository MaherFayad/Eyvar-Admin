import { chromium } from 'playwright'
const BASE='http://localhost:5433'
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1440,height:1200}}); const p=await ctx.newPage()
for (const path of ['/management/overview','/management/performance','/management/risk','/management/growth','/management/zones','/operations/overview','/support/overview','/admin/overview']) {
  await p.goto(BASE+path,{waitUntil:'networkidle'}); await p.waitForSelector('main [data-slot="card"]'); await p.waitForTimeout(300)
  const r = await p.evaluate(() => {
    const red = []
    const isRed = (c) => { const m = c.match(/\d+/g); if (!m) return false; const [r,g,bl]=m.map(Number); return r>120 && r-g>40 && r-bl>40 }
    for (const el of document.querySelectorAll('main *')) {
      const cs = getComputedStyle(el)
      if (isRed(cs.color) || isRed(cs.backgroundColor) || isRed(cs.borderTopColor))
        red.push({ tag: el.tagName, cls: (el.className?.baseVal ?? el.className ?? '').toString().slice(0,50), color: cs.color, bg: cs.backgroundColor, text: (el.textContent??'').slice(0,40) })
    }
    return {
      bannersInMain: document.querySelectorAll('main [data-slot="alert"]').length,
      bannersInDoc: document.querySelectorAll('[data-slot="alert"]').length,
      badges: [...document.querySelectorAll('main [data-slot="badge"]')].map(x=>({t:(x.textContent??'').slice(0,12), bg:getComputedStyle(x).backgroundColor, fg:getComputedStyle(x).color, r:getComputedStyle(x).borderRadius})),
      redCount: red.length, red: red.slice(0,6),
    }
  })
  console.log(path.padEnd(26), 'bannersMain='+r.bannersInMain, 'bannersDoc='+r.bannersInDoc, 'badges='+r.badges.length, 'redEls='+r.redCount)
  if (r.badges.length) console.log('   badge sample:', JSON.stringify(r.badges[0]))
  if (r.redCount) console.log('   red:', JSON.stringify(r.red.map(x=>x.tag+':'+x.text.slice(0,28))))
}
await ctx.close(); await b.close()
