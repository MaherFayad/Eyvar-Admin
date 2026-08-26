import { chromium } from 'playwright'
const BASE='http://localhost:5233'
const b=await chromium.launch(); const out=[]; const log=(...a)=>out.push(a.join(' '))
for(const [lang,ar] of [['LTR',false],['RTL',true]]){
 const p=await b.newPage({viewport:{width:1440,height:900}})
 await p.goto(BASE+'/operations/people',{waitUntil:'networkidle'}); await p.waitForTimeout(900)
 if(ar){await p.getByRole('button',{name:'Account'}).click();await p.getByRole('menuitemradio',{name:'Arabic'}).click();await p.waitForTimeout(800);await p.keyboard.press('Escape');await p.waitForTimeout(300)}
 const sel=()=>p.evaluate(()=>{const t=[...document.querySelectorAll('[role="tab"]')].find(e=>e.getAttribute('aria-selected')==='true');return t?`${t.textContent.trim()}@${Math.round(t.getBoundingClientRect().x)}`:'none'})
 for(const key of ['ArrowRight','ArrowLeft']){
  await p.getByRole('tab',{name:'Compliance'}).click(); await p.waitForTimeout(500)
  const before=await sel()
  await p.keyboard.press(key); await p.waitForTimeout(600)
  const after=await sel()
  const focus=await p.evaluate(()=>document.activeElement.textContent.replace(/\s+/g,' ').trim().slice(0,16))
  log(`## ${lang} ${key}: selected ${before} -> ${after} | focus=${JSON.stringify(focus)}`)
 }
 await p.close()
}
await b.close(); console.log(out.join('\n'))
