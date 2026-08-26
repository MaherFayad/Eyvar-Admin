import { chromium } from 'playwright'
const b=await chromium.launch()
for(const [tag,port] of [['dev (vite, HMR on)',5233],['preview (static build)',5244]]){
 const p=await b.newPage({viewport:{width:1440,height:900}})
 let loads=0; p.on('load',()=>loads++)
 await p.goto(`http://localhost:${port}/operations/people`,{waitUntil:'networkidle'}); await p.waitForTimeout(1000)
 await p.getByRole('button',{name:'Account'}).click(); await p.waitForTimeout(400)
 await p.getByRole('menuitemradio',{name:'Arabic'}).click()
 await p.waitForFunction(()=>document.documentElement.dir==='rtl',null,{timeout:5000})
 const atSwitch=loads
 await p.waitForTimeout(8000)
 console.log(`${tag}: dir now=${await p.evaluate(()=>document.documentElement.dir+'/'+document.documentElement.lang)} | page loads during switch=${atSwitch} | total loads after 8s=${loads}`)
 await p.close()
}
await b.close()
