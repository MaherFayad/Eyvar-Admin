import { chromium } from 'playwright'
const b = await chromium.launch()
for (const dir of ['ltr','rtl']) {
  const p = await b.newPage({ viewport:{width:1512,height:900} })
  const errs=[]; p.on('pageerror',e=>errs.push(String(e.message).slice(0,140)))
  await p.goto('http://localhost:5235/entity/DRV-0101',{waitUntil:'networkidle',timeout:60000})
  await p.waitForTimeout(2000)
  if (dir==='rtl'){await p.evaluate(()=>{document.documentElement.setAttribute('dir','rtl');document.documentElement.setAttribute('lang','ar')});await p.waitForTimeout(800)}
  const m = await p.evaluate(()=>{
    const dl=document.querySelector('dl[data-numeric]')
    if(!dl) return {found:false, dls: document.querySelectorAll('dl').length}
    const dt=dl.querySelector('dt'), dd=dl.querySelector('dd')
    const g=e=>{const c=getComputedStyle(e);return {text:e.innerText.trim().slice(0,22),fontSize:c.fontSize,lineHeight:c.lineHeight,fontWeight:c.fontWeight,color:c.color,fontVariantNumeric:c.fontVariantNumeric}}
    return {found:true, pairs: dl.children.length, dt:g(dt), dd:g(dd)}
  })
  console.log('dir='+dir, JSON.stringify(m,null,1))
  if(errs.length) console.log('ERRS',[...new Set(errs)].slice(0,3))
  await p.screenshot({path:`.pw-h/rail-${dir}.png`})
  await p.close()
}
await b.close()
