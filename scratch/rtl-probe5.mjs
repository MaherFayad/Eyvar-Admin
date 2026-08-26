import { chromium } from 'playwright'
const BASE='http://localhost:5233'
const b=await chromium.launch(); const out=[]; const log=(...a)=>out.push(a.join(' '))
async function open(w,ar){const p=await b.newPage({viewport:{width:w,height:900}});await p.goto(BASE+'/operations/people',{waitUntil:'networkidle'});await p.waitForTimeout(900)
 if(ar){await p.getByRole('button',{name:'Account'}).click();await p.getByRole('menuitemradio',{name:'Arabic'}).click();await p.waitForTimeout(800);await p.keyboard.press('Escape');await p.waitForTimeout(300)}
 return p}
for(const [lang,ar] of [['LTR',false],['RTL',true]]){
 const p=await open(1440,ar)
 await p.evaluate(()=>document.body.focus())
 await p.keyboard.press('Tab')
 const seen=[]
 for(let i=0;i<32;i++){
  const cur=await p.evaluate(()=>{const e=document.activeElement;if(!e||e===document.body)return null
   const r=e.getBoundingClientRect();return {t:(e.getAttribute('aria-label')||e.textContent||'').replace(/\s+/g,' ').trim().slice(0,20),role:e.getAttribute('role')||e.tagName,x:Math.round(r.x)}})
  if(cur)seen.push(`${cur.t}[${cur.role}]@${cur.x}`)
  await p.keyboard.press('Tab'); await p.waitForTimeout(45)
 }
 log(`\n## TAB ORDER ${lang} (first 32)`); log('   '+seen.join('\n   '))
 const tabstop=await p.evaluate(()=>[...document.querySelectorAll('[role="tab"]')].map(e=>`${e.textContent.trim()}:tabindex=${e.getAttribute('tabindex')}:selected=${e.getAttribute('aria-selected')}`))
 log('   tablist tabindex/selected:',JSON.stringify(tabstop))
 await p.close()
}
await b.close(); console.log(out.join('\n'))
