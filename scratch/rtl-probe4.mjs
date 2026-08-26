import { chromium } from 'playwright'
const BASE='http://localhost:5233'
const b=await chromium.launch(); const out=[]; const log=(...a)=>out.push(a.join(' '))
async function open(w,ar){const p=await b.newPage({viewport:{width:w,height:900}});await p.goto(BASE+'/operations/people',{waitUntil:'networkidle'});await p.waitForTimeout(800)
 if(ar){await p.getByRole('button',{name:'Account'}).click();await p.getByRole('menuitemradio',{name:'Arabic'}).click();await p.waitForTimeout(700);await p.keyboard.press('Escape');await p.waitForTimeout(200)}
 return p}
for(const [lang,ar] of [['LTR',false],['RTL',true]]){
 const p=await open(1440,ar)
 const roles=await p.evaluate(()=>{const el=[...document.querySelectorAll('main [role="tab"],main [role="radio"],main button,main a')].filter(e=>/^(Captains|Applications|Compliance|Riders)$/.test(e.textContent.trim()))
  return el.map(e=>({tag:e.tagName,role:e.getAttribute('role'),txt:e.textContent.trim(),x:Math.round(e.getBoundingClientRect().x),ti:e.getAttribute('tabindex')}))})
 log(`\n## VIEW SWITCHER ${lang}:`,JSON.stringify(roles))
 if(roles.length){
  await p.evaluate(()=>{const e=[...document.querySelectorAll('main [role="tab"],main button,main a')].find(e=>e.textContent.trim()==='Captains');e.focus()})
  const read=()=>p.evaluate(()=>{const e=document.activeElement;return e?`${e.textContent.replace(/\s+/g,' ').trim().slice(0,16)}@${Math.round(e.getBoundingClientRect().x)}`:'none'})
  const R=[await read()]; for(let i=0;i<2;i++){await p.keyboard.press('ArrowRight');await p.waitForTimeout(150);R.push(await read())}
  await p.evaluate(()=>{const e=[...document.querySelectorAll('main [role="tab"],main button,main a')].find(e=>e.textContent.trim()==='Captains');e.focus()})
  const L=[]; for(let i=0;i<2;i++){await p.keyboard.press('ArrowLeft');await p.waitForTimeout(150);L.push(await read())}
  log('   ArrowRight:',JSON.stringify(R)); log('   ArrowLeft :',JSON.stringify(L))
 }
 // table header: does ArrowRight in the grid move visually right?
 const hdr=await p.evaluate(()=>{const h=[...document.querySelectorAll('main thead th button')];return h.map(e=>({t:e.textContent.replace(/\s+/g,' ').trim().slice(0,12),x:Math.round(e.getBoundingClientRect().x)}))})
 log('   header buttons x-order:',JSON.stringify(hdr))
 await p.close()
}
await b.close(); console.log(out.join('\n'))
