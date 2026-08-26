import { chromium } from 'playwright'
const BASE='http://localhost:5233'
const b=await chromium.launch(); const out=[]; const log=(...a)=>out.push(a.join(' '))
for(const [lang,ar] of [['LTR',false],['RTL',true]]){
 const p=await b.newPage({viewport:{width:1440,height:900}})
 await p.goto(BASE+'/operations/people',{waitUntil:'networkidle'}); await p.waitForTimeout(900)
 if(ar){await p.getByRole('button',{name:'Account'}).click();await p.getByRole('menuitemradio',{name:'Arabic'}).click();await p.waitForTimeout(800);await p.keyboard.press('Escape');await p.waitForTimeout(300)}
 const read=()=>p.evaluate(()=>{const e=document.activeElement;const r=e.getBoundingClientRect();return `${e.textContent.replace(/\s+/g,' ').trim().slice(0,14)}@${Math.round(r.x)}`})
 // click the selected tab so focus lands legitimately
 await p.getByRole('tab',{name:'Captains'}).click(); await p.waitForTimeout(300)
 const R=[await read()]
 for(let i=0;i<2;i++){await p.keyboard.press('ArrowRight');await p.waitForTimeout(250);R.push(await read())}
 await p.getByRole('tab',{name:'Captains'}).click(); await p.waitForTimeout(300)
 const L=[await read()]
 for(let i=0;i<2;i++){await p.keyboard.press('ArrowLeft');await p.waitForTimeout(250);L.push(await read())}
 log(`\n## TABLIST ARROWS ${lang}`)
 log('   ArrowRight:',JSON.stringify(R))
 log('   ArrowLeft :',JSON.stringify(L))
 const impl=await p.evaluate(()=>{const t=document.querySelector('[role="tablist"]');return {slot:t.getAttribute('data-slot'),orient:t.getAttribute('aria-orientation'),cls:t.className.slice(0,60)}})
 log('   tablist:',JSON.stringify(impl))
 await p.close()
}
await b.close(); console.log(out.join('\n'))
