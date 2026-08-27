import { chromium } from 'playwright'
const BASE = 'http://localhost:5433'
const b = await chromium.launch()
for (const w of [1280, 1440]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1200 } })
  const p = await ctx.newPage()
  console.log('===== width', w)
  for (const path of ['/management/overview','/management/performance','/management/risk','/management/growth','/management/zones','/operations/overview','/support/overview','/admin/overview']) {
    await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.waitForSelector('main [data-slot="card"]'); await p.waitForTimeout(300)
    const r = await p.evaluate(() => [...document.querySelectorAll('main ul[role="list"] span.truncate')].map((s) => ({
      text: s.textContent, chars: s.textContent.length, boxW: Math.round(s.clientWidth), needW: Math.round(s.scrollWidth),
      clipped: s.scrollWidth > s.clientWidth + 1,
    })))
    const bad = r.filter((x) => x.clipped)
    console.log(path.padEnd(26), 'captions=' + r.length, 'clipped=' + bad.length, bad.map((x) => `"${x.text}" (${x.chars}ch needs ${x.needW}px in ${x.boxW}px)`).join(' | '))
    if (r.length) console.log('   widest fitting caption:', Math.max(...r.map(x=>x.chars)), 'chars; box', r[0].boxW, 'px')
  }
  await ctx.close()
}
await b.close()
