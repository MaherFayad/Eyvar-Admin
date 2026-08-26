import { chromium } from 'playwright'
const b=await chromium.launch()
const out=[]; const log=(...a)=>out.push(a.join(' '))
/* Measure VISUAL order by splitting a text node into client rects per word. */
const visual = (sel) => `(${sel})`
async function go(route,ar){
 const p=await b.newPage({viewport:{width:1440,height:900}})
 await p.goto('http://localhost:5244'+route,{waitUntil:'networkidle'}); await p.waitForTimeout(1000)
 if(ar){await p.getByRole('button',{name:'Account'}).click();await p.waitForTimeout(400)
  await p.getByRole('menuitemradio',{name:'Arabic'}).click()
  await p.waitForFunction(()=>document.documentElement.dir==='rtl',null,{timeout:5000})
  await p.keyboard.press('Escape');await p.mouse.move(2,898);await p.waitForTimeout(6000)}
 return p
}
/* returns {dom, visual} where visual is words sorted by physical x (then reversed for rtl reading) */
const probe = `(el) => {
  const txt = el.textContent;
  const range = document.createRange();
  const node = [...el.childNodes].find(n=>n.nodeType===3) || el.firstChild;
  const words = [];
  const s = node.textContent;
  let i = 0;
  for (const m of s.matchAll(/\S+/g)) {
    range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length);
    const r = range.getBoundingClientRect();
    words.push({ w: m[0], x: Math.round(r.x) });
  }
  // reading order in an RTL paragraph = right to left
  const rtl = getComputedStyle(el).direction === 'rtl';
  const read = [...words].sort((a,b)=> rtl ? b.x-a.x : a.x-b.x).map(o=>o.w).join(' ');
  return { dom: s.trim(), reading: read, bdi: !!el.querySelector('bdi'), dir: getComputedStyle(el).direction, ub: getComputedStyle(el).unicodeBidi };
}`
for(const [tag,ar] of [['EN',false],['AR',true]]){
 const p=await go('/operations/people',ar)
 for(const [name,sel] of [['page count line','main h1 ~ *'],['search kbd','header kbd']]){
  const el=p.locator(sel).first()
  if(await el.count()){ log(`## ${tag} ${name}:`, JSON.stringify(await el.evaluate(eval(probe)))) }
 }
 await p.close()
 const q=await go('/operations/overview',ar)
 for(const [name,sel] of [['freshness line','main p:has-text("Computed"), main span:has-text("Computed")'],['zero-range msg','main :text("zero")']]){
  const el=q.locator(sel).first()
  if(await el.count()){ log(`## ${tag} ${name}:`, JSON.stringify(await el.evaluate(eval(probe)))) }
 }
 await q.close()
}
await b.close(); console.log(out.join('\n'))
