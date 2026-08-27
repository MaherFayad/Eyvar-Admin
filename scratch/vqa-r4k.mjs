/** Correction pass: does Operations Overview actually PAINT, and does the
 *  tone clause of R4-4 §4.3 select on real fixture data? Rendering, not grep. */
import { chromium } from 'playwright'
const BASE='http://localhost:5433'
const b=await chromium.launch(); const problems=[]
async function toArabic(p){
  await p.getByRole('button',{name:/account|profile|menu/i}).first().click({timeout:5000})
  await p.getByRole('menuitemradio',{name:/عرب|Arabic|AR/i}).first().click({timeout:5000})
  await p.waitForTimeout(700)
}
for (const w of [1280,1440]) for (const lang of ['en','ar']) {
  const ctx=await b.newContext({viewport:{width:w,height:1200}}); const p=await ctx.newPage()
  p.on('pageerror',e=>problems.push(`${lang} ${w} PAGEERROR ${String(e).slice(0,220)}`))
  p.on('console',m=>{if(m.type()==='error')problems.push(`${lang} ${w} CONSOLE ${m.text().slice(0,220)}`)})
  await p.goto(BASE+'/operations/overview',{waitUntil:'networkidle'})
  await p.waitForSelector('main [data-slot="card"]',{timeout:15000}).catch(()=>problems.push(`${lang} ${w} BOARD DID NOT PAINT`))
  await p.waitForTimeout(400)
  if(lang==='ar'){ try{await toArabic(p)}catch(e){problems.push(`${lang} ${w} AR SWITCH FAILED`)} ; await p.waitForTimeout(500) }
  const r=await p.evaluate(()=>{
    const main=document.querySelector('main')
    const al=[...main.querySelectorAll('[data-slot="alert"]')]
    return {
      painted: !!main.querySelector('[data-slot="card"]'),
      tiles: main.querySelectorAll('ul[role="list"] > li').length,
      lists: main.querySelectorAll('ul[aria-labelledby]').length,
      bannersMain: al.length,
      bannersDoc: document.querySelectorAll('[data-slot="alert"]').length,
      banner: al[0] ? { text:(al[0].textContent??'').slice(0,120), bg:getComputedStyle(al[0]).backgroundColor,
        color:getComputedStyle(al[0]).color, radius:getComputedStyle(al[0]).borderRadius,
        dismiss: !!al[0].querySelector('button[aria-label*="ismiss" i],button[aria-label*="lose" i]') } : null,
      suppressedTileVisible: [...main.querySelectorAll('ul[role="list"] > li')]
        .map(x=>(x.textContent??'')).find(s=>/past their (48|window)|48-hour|past their window/i.test(s)) ?? null,
    }})
  console.log(`ops ${lang} ${w}:`, JSON.stringify(r))
  await p.screenshot({path:`./scratch/shots/vqa-fix-ops-${lang}-${w}.png`,fullPage:true})
  await ctx.close()
}
console.log(problems.length?'PROBLEMS:\n'+problems.join('\n'):'no console or page errors')
await b.close()
