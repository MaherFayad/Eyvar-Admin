import { chromium } from 'playwright'

const BASE = 'http://localhost:5233'
const OUT = 'c:/Users/Admin/Documents/GitHub/Eyvar Admin/scratch/shots'
const b = await chromium.launch()

/** Open the account menu and pick a language THE WAY AN OPERATOR WOULD. */
async function switchToArabic(p) {
  await p.getByRole('button', { name: 'Account' }).click()
  await p.getByRole('menuitemradio', { name: 'Arabic' }).click()
  await p.waitForTimeout(700)
}

async function open(path, w, h = 900) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)))
  await p.goto(BASE + path, { waitUntil: 'networkidle' })
  await p.waitForTimeout(900)
  return { p, errs }
}

const results = []
function log(...a) { results.push(a.join(' ')) }

/* ── 1. Does the control exist, and does it reach the DOCUMENT ELEMENT? ── */
{
  const { p, errs } = await open('/operations/people', 1440)
  const before = await p.evaluate(() => ({
    dir: document.documentElement.getAttribute('dir'),
    lang: document.documentElement.getAttribute('lang'),
    bodyDir: document.body.getAttribute('dir'),
  }))
  await p.getByRole('button', { name: 'Account' }).click()
  await p.waitForTimeout(300)
  await p.screenshot({ path: `${OUT}/rtl-language-menu-1440.png` })
  const items = await p.getByRole('menuitemradio').all()
  const menu = []
  for (const it of items) {
    menu.push(`${await it.innerText()}=${await it.getAttribute('aria-checked')}`)
  }
  await p.getByRole('menuitemradio', { name: 'Arabic' }).click()
  await p.waitForTimeout(800)
  const after = await p.evaluate(() => ({
    dir: document.documentElement.getAttribute('dir'),
    lang: document.documentElement.getAttribute('lang'),
    bodyDir: document.body.getAttribute('dir'),
    font: getComputedStyle(document.body).fontFamily,
  }))
  const toast = await p.locator('[data-sonner-toast]').innerText().catch(() => '(none)')
  log('\n## 1. LANGUAGE CONTROL')
  log('   before:', JSON.stringify(before))
  log('   menu radio items:', JSON.stringify(menu))
  log('   after :', JSON.stringify(after))
  log('   toast :', JSON.stringify(toast))
  log('   route after switch:', p.url())
  log('   pageerrors:', errs.length ? errs.join(' | ') : 'none')
  await p.close()
}

/* ── 2. The captures ────────────────────────────────────────────────── */
const shots = [
  ['/operations/people', 1440, 'ar-people-1440.png'],
  ['/operations/people', 1280, 'ar-people-1280.png'],
  ['/operations/overview', 1440, 'ar-ops-overview-1440.png'],
  ['/operations/overview', 1280, 'ar-ops-overview-1280.png'],
  ['/management/overview', 1440, 'ar-mgmt-overview-1440.png'],
  ['/management/overview', 1280, 'ar-mgmt-overview-1280.png'],
]
for (const [path, w, name] of shots) {
  const { p, errs } = await open(path, w)
  await switchToArabic(p)
  await p.screenshot({ path: `${OUT}/${name}` })
  if (errs.length) log(`   pageerror on ${name}:`, errs.join(' | '))
  await p.close()
}
log('\n## 2. CAPTURES: ' + shots.map((s) => s[2]).join(', '))

await b.close()
console.log(results.join('\n'))
