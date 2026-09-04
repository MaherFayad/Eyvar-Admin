import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await (await b.newContext({viewport:{width:1440,height:1200}})).newPage()
await p.goto('http://localhost:4325/management/reports/RPT-1',{waitUntil:'networkidle'})
await p.waitForTimeout(2500)
await p.evaluate(() => document.body.focus())
for (let i=0;i<120;i++){
  await p.keyboard.press('Tab')
  if (await p.evaluate(()=>document.activeElement?.classList.contains('recharts-surface'))) break
}
const box = await p.evaluate(() => {
  const r = document.querySelector('.recharts-surface').getBoundingClientRect()
  return {x:r.x,y:r.y,w:r.width,h:r.height}
})
const style = await p.evaluate(() => {
  const s = getComputedStyle(document.querySelector('.recharts-surface'))
  return { outline: s.outline, outlineOffset: s.outlineOffset, matches: document.querySelector('.recharts-surface').matches(':focus-visible') }
})
console.log(JSON.stringify(style))
await p.screenshot({path:'./scratch/shots-partial/focus-ring.png', clip:{x:box.x-14,y:box.y-14,width:box.w+28,height:box.h+28}})
await b.close()
