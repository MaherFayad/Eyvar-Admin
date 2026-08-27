import { chromium } from 'playwright'
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:1000}})
for (const path of ['/management/zones','/management/risk','/operations/overview']) {
await p.goto('http://localhost:5433'+path,{waitUntil:'networkidle'}); await p.waitForSelector('main ul[aria-labelledby]'); await p.waitForTimeout(400)
const r = await p.evaluate(()=>{
 const px=n=>Math.round(n*10)/10
 return [...document.querySelectorAll('main ul[aria-labelledby]')].map(ul=>({
  heading: document.getElementById(ul.getAttribute('aria-labelledby'))?.textContent,
  rows: [...ul.querySelectorAll(':scope > li')].slice(0,2).map(li=>{
   const shape=li.firstElementChild
   const kids=[...shape.children]
   const sr=shape.getBoundingClientRect()
   return { shapeH:px(sr.height), topPad:px(kids[0].getBoundingClientRect().top-sr.top),
     botPad:px(sr.bottom-kids[kids.length-1].getBoundingClientRect().bottom),
     parts:kids.map(k=>({t:(k.textContent??'').slice(0,22),h:px(k.getBoundingClientRect().height)})) }
  })}))})
console.log('==',path); console.log(JSON.stringify(r,null,1))
}
await b.close()
