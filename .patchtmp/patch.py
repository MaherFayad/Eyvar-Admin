import io, sys

def patch(path, old, new, count=1):
    with io.open(path, encoding='utf-8') as f:
        src = f.read()
    n = src.count(old)
    if n != count:
        print("FAIL %s: expected %d occurrence(s), found %d" % (path, count, n))
        sys.exit(1)
    with io.open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(src.replace(old, new))
    print("ok   %s" % path)
