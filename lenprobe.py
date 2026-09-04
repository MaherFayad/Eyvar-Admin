import io, re, sys

PAT = re.compile(r"'([A-Za-z0-9_.\-]+)':\s*\n?\s*'([^']*)'")
for path in sys.argv[1:]:
    s = io.open(path, encoding='utf-8').read()
    print('==', path)
    for m in PAT.finditer(s):
        k, v = m.group(1), m.group(2)
        if len(v) >= 60:
            print(len(v), k, '|', v)
