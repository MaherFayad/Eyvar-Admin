import { chromium } from 'playwright'
const b=await chromium.launch()
for (const w of [1280,1440]) {
  const ctx=await b.newContext({viewport:{width:w,height:1200}}); const p=await ctx.newPage()
  for (const [n,path] of [['mgmt-overview','/management/overview'],['ops','/operations/overview'],['support','/support/overview'],['admin','/admin/overview'],['risk','/management/risk'],['growth','/management/growth'],['zones','/management/zones'],['perf','/management/performance']]) {
    await p.goto('http://localhost:5433'+path,{waitUntil:'networkidle'}); await p.waitForSelector('main ul[role="list"]'); await p.waitForTimeout(300)
    const r=await p.evaluate(()=>{
      const px=n=>Math.round(n*100)/100
      const items=[...document.querySelector('main ul[role="list"]').children].map(li=>{
        const c=li.querySelector('[data-slot="card"]'), lr=li.getBoundingClientRect(), cr=c.getBoundingClientRect()
        return {top:px(lr.top),cardH:px(cr.height),gapBelow:px(lr.bottom-cr.bottom),linked:!!li.querySelector('a')}})
      const rows={}; items.forEach(i=>(rows[i.top]??=[]).push(i))
      return Object.entries(rows).filter(([,r])=>new Set(r.map(i=>i.cardH)).size>1)
        .map(([t,r])=>`y=${t} ${r.map(i=>i.cardH+(i.linked?'[link]':'[plain]')+' gap'+i.gapBelow).join(' | ')}`)
    })
    console.log(`${w} ${n.padEnd(14)} ${r.length? 'RAGGED -> '+r.join('  ;  ') : 'uniform'}`)
  }
  await ctx.close()
}
await b.close()
