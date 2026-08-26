import { chromium } from 'playwright'
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:900}})
await p.goto('http://localhost:5244/operations/overview',{waitUntil:'networkidle'}); await p.waitForTimeout(1000)
await p.getByRole('button',{name:'Account'}).click(); await p.waitForTimeout(400)
await p.getByRole('menuitemradio',{name:'Arabic'}).click()
await p.waitForFunction(()=>document.documentElement.dir==='rtl',null,{timeout:5000})
await p.keyboard.press('Escape'); await p.mouse.move(2,898); await p.waitForTimeout(6000)
const res=await p.evaluate(()=>{
  const pick=(t)=>[...document.querySelectorAll('main *')].find(e=>e.children.length===0&&e.textContent.trim().startsWith(t))
  const order=(el)=>{const n=el.firstChild;const s=n.textContent;const r=document.createRange();const w=[]
    const re=/\S+/g;let m;while((m=re.exec(s))){r.setStart(n,m.index);r.setEnd(n,m.index+m[0].length)
      w.push({t:m[0],x:Math.round(r.getBoundingClientRect().x)})}
    return w.sort((a,b)=>b.x-a.x).map(o=>o.t).join(' ')}   // RTL reading = right to left
  const out=[]
  for(const t of ['Computed','Every value']){
    const el=pick(t); if(!el) continue
    const before=order(el)
    el.setAttribute('dir','auto'); const after=order(el); el.removeAttribute('dir')
    out.push({dom:el.textContent.trim(),readsNow:before,readsWithDirAuto:after})
  }
  return out})
console.log(JSON.stringify(res,null,1))
await p.screenshot({path:'c:/Users/Admin/Documents/GitHub/Eyvar Admin/scratch/shots/ar-bidi-evidence-1440.png',clip:{x:0,y:60,width:1100,height:560}})
await p.close(); await b.close()
