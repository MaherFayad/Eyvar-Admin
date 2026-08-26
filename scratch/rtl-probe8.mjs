import { chromium } from 'playwright'
const BASE='http://localhost:5233'; const OUT='c:/Users/Admin/Documents/GitHub/Eyvar Admin/scratch/shots'
const b=await chromium.launch(); const out=[]; const log=(...a)=>out.push(a.join(' '))
for(const [lang,ar] of [['en',false],['ar',true]]){
 const p=await b.newPage({viewport:{width:1440,height:900}})
 await p.goto(BASE+'/operations/people',{waitUntil:'networkidle'}); await p.waitForTimeout(900)
 if(ar){await p.getByRole('button',{name:'Account'}).click();await p.getByRole('menuitemradio',{name:'Arabic'}).click();await p.waitForTimeout(800);await p.keyboard.press('Escape');await p.waitForTimeout(300)}
 await p.getByRole('button',{name:/Notifications/}).click(); await p.waitForTimeout(600)
 await p.screenshot({path:`${OUT}/${lang}-bell-popover-1440.png`})
 const m=await p.evaluate(()=>{const c=document.querySelector('[data-slot="popover-content"]');const r=c.getBoundingClientRect()
  const list=c.querySelector('[data-slot="scroll-area"],ul,[role="list"]')||c.firstElementChild
  const lr=list.getBoundingClientRect()
  const cs=getComputedStyle(c); const ls=getComputedStyle(list)
  return {popover:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},
    bg:cs.backgroundColor,overflow:cs.overflow,
    inner:{h:Math.round(lr.height),bottom:Math.round(lr.bottom),overflowY:ls.overflowY,maxH:ls.maxHeight},
    spill:Math.round(lr.bottom-r.bottom)}})
 log(`## BELL POPOVER ${lang}:`,JSON.stringify(m))
 await p.close()
}
await b.close(); console.log(out.join('\n'))
