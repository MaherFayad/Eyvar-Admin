import { chromium } from 'playwright'

function probe(strings) {
  const cell = document.querySelector('tbody td:nth-child(3) span')
  const font = cell ? getComputedStyle(cell).font : '13px sans-serif'
  const small = '400 12px ' + getComputedStyle(document.body).fontFamily
  const ctx = document.createElement('canvas').getContext('2d')
  ctx.font = font
  const out = {}
  for (const s of strings) out[s] = Math.ceil(ctx.measureText(s).width)
  ctx.font = small
  const outSmall = {}
  for (const s of strings) outSmall[s] = Math.ceil(ctx.measureText(s).width)
  return { font, out, outSmall }
}

const QUEUE_EN = ['Requests', 'Trip Assurance', 'Absences', 'Safety & Incidents', 'Captain Fairness', 'Applications', 'Tickets', 'Disputes', 'Data & Integrity', 'Queue', 'Severity', 'Critical', 'Normal', 'Deadline', 'overdue 4d 22h', 'Missed 24 Jun 21:00', 'Owner', 'Unclaimed', 'Yours · 14h 37m', 'Item']
const QUEUE_AR = ['الطلبات', 'ضمان الرحلات', 'الغيابات', 'السلامة والحوادث', 'إنصاف الكباتن', 'طلبات الانضمام', 'التذاكر', 'الاعتراضات', 'البيانات والنزاهة', 'قائمة العمل', 'درجة الخطورة', 'حرجة', 'عادية', 'الموعد النهائي', 'فات موعده 24 يونيو 21:00', 'المالك', 'غير مُستلَم', 'العنصر']

const BASE = 'http://localhost:4347'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()

await page.goto(`${BASE}/operations/my-work?view=everything`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1400)
console.log('EN', JSON.stringify(await page.evaluate(probe, QUEUE_EN), null, 1))

await page.getByRole('button', { name: 'Account' }).click()
await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
await page.waitForTimeout(2200)
console.log('AR', JSON.stringify(await page.evaluate(probe, QUEUE_AR), null, 1))

await browser.close()
