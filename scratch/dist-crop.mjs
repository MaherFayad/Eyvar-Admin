import { chromium } from 'playwright'
const BASE='http://localhost:4399'
const LANG=process.env.LANG_ ?? 'en'
const TAG=process.env.TAG ?? 'after'
const b=await chromium.launch()
const ctx=await b.newContext({viewport:{width:1440,height:1400}})
const p=await ctx.newPage()
await p.goto(`${BASE}/management/reports/dashboards/DSH-1`,{waitUntil:'networkidle'})
if(LANG==='ar'){await p.evaluate(()=>localStorage.setItem('eyvar.language','"ar"'));await p.reload({waitUntil:'networkidle'})}
await p.waitForTimeout(2500)
const tiles=p.locator('li').filter({has:p.locator('[data-slot="card"]')})
const n=await tiles.count()
for(let i=0;i<n;i++){
  const li=tiles.nth(i)
  const isPie=await li.locator('.recharts-pie').count()>0
  const isLine=await li.locator('.recharts-line, .recharts-area').count()>0
  if(!isPie&&!isLine) continue
  const box=await li.boundingBox()
  if(!box) continue
  await p.screenshot({path:`./scratch/shots-dist/${TAG}.tile${i}.${isPie?'pie':'line'}.${LANG}.png`,clip:{x:box.x,y:box.y,width:box.width,height:Math.min(box.height,620)}})
}
await b.close()
console.log('done',TAG,LANG)
