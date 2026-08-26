import { chromium } from 'playwright'
const BASE='http://localhost:5233'
const b=await chromium.launch(); const out=[]; const log=(...a)=>out.push(a.join(' '))
async function dump(p,tag){
 const m=await p.evaluate(()=>[...document.querySelectorAll('nav a')].map(e=>{const cs=getComputedStyle(e);const r=e.getBoundingClientRect()
  return {t:e.textContent.replace(/\s+/g,' ').trim().slice(0,16),y:Math.round(r.y),x:Math.round(r.x),bg:cs.backgroundColor,cur:e.getAttribute('aria-current')}}).filter(e=>e.bg!=='rgba(0, 0, 0, 0)'))
 log(`   ${tag}:`,JSON.stringify(m))
}
const p=await b.newPage({viewport:{width:1440,height:900}})
await p.goto(BASE+'/management/overview',{waitUntil:'networkidle'}); await p.waitForTimeout(900)
log('## NAV HIGHLIGHTS'); await dump(p,'LTR at rest')
await p.mouse.move(0,0); await p.waitForTimeout(200); await dump(p,'LTR mouse at 0,0')
await p.getByRole('button',{name:'Account'}).click(); await p.getByRole('menuitemradio',{name:'Arabic'}).click(); await p.waitForTimeout(800); await p.keyboard.press('Escape'); await p.waitForTimeout(400)
await dump(p,'RTL right after switch (mouse where the menu item was)')
await p.mouse.move(0,0); await p.waitForTimeout(300); await dump(p,'RTL after moving mouse to 0,0')
await p.screenshot({path:'c:/Users/Admin/Documents/GitHub/Eyvar Admin/scratch/shots/ar-mgmt-overview-nohover-1440.png'})
await p.close(); await b.close(); console.log(out.join('\n'))
