import io, re
p = '.patchtmp/verify.mjs'
s = io.open(p, encoding='utf-8').read()
old = "  firstCell: (await page.locator('table tbody tr td').first().innerText()).trim().split('\n')[0],"
new = "  firstCell: (await page.locator('table tbody tr').first().innerText()).replace(/[\s\u00a0]+/g, ' ').trim().slice(0, 55),"
assert s.count(old) == 1, s.count(old)
io.open(p, 'w', encoding='utf-8', newline='').write(s.replace(old, new))
print('patched')
