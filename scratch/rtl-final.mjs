import { chromium } from 'playwright'
const BASE='http://localhost:5244'; const OUT='c:/Users/Admin/Documents/GitHub/Eyvar Admin/scratch/shots'
const b=await chromium.launch()
const shots=[['/operations/people',1440],['/operations/people',1280],['/operations/overview',1440],['/operations/overview',1280],['/management/overview',1440],['/management/overview',1280]]
for(const [route,w] of shots){
 const p=await b.newPage({viewport:{width:w,height:900}})
 await p.goto(BASE+route,{waitUntil:'networkidle'}); await p.waitForTimeout(1000)
 await p.getByRole('button',{name:'Account'}).click()
 await p.waitForTimeout(400)
 await p.getByRole('menuitemradio',{name:'Arabic'}).click()
 // ASSERT the switch actually landed before spending a screenshot on it
 await p.waitForFunction(()=>document.documentElement.dir==='rtl'&&document.documentElement.lang==='ar',null,{timeout:5000})
 await p.keyboard.press('Escape')
 await p.mouse.move(2,898)              // park the pointer: no stale :hover
 await p.waitForTimeout(6500)           // let the 5s toast expire
 const name='ar'+route.replace(/\//g,'-')+'-'+w+'.png'
 const state=await p.evaluate(()=>document.documentElement.dir+'/'+document.documentElement.lang)
 if(state!=='rtl/ar') throw new Error('not RTL for '+name)
 await p.screenshot({path:`${OUT}/${name}`})
 console.log('  wrote',name,'|',state)
 await p.close()
}
await b.close()
