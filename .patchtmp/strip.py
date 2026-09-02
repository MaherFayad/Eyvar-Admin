import io, re, sys
n = 0
for f in io.open('.patchtmp/myfiles.txt', encoding='utf-8'):
    f = f.strip()
    if not f: continue
    src = io.open(f, encoding='utf-8').read()
    out = re.sub(r"^[ \t]*cacheKey: '[^']*',\n", "", src, flags=re.M)
    out2 = re.sub(r", cacheKey: '[^']*'", "", out)
    if out2 != src:
        io.open(f, 'w', encoding='utf-8', newline='').write(out2)
        n += 1
print("stripped cacheKey from %d files" % n)
