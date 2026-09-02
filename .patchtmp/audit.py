import io, os, re, collections

pat = re.compile(r"useAsync\s*(?:<[^>]*(?:<[^>]*>)?[^>]*>)?\s*\(", re.S)
sites = []
for root, dirs, files in os.walk('src'):
    for fn in files:
        if not fn.endswith(('.ts', '.tsx')) or '.test.' in fn:
            continue
        p = os.path.join(root, fn).replace(os.sep, '/')
        if 'hooks/useAsync' in p:
            continue
        src = io.open(p, encoding='utf-8').read()
        for m in pat.finditer(src):
            depth, i = 0, m.end() - 1
            while i < len(src):
                if src[i] == '(':
                    depth += 1
                elif src[i] == ')':
                    depth -= 1
                    if depth == 0:
                        break
                i += 1
            body = src[m.end():i]
            ck = re.search(r"cacheKey:\s*'([^']+)'", body)
            dp = re.search(r"deps:\s*(\[[^\]]*\])", body)
            line = src[:m.start()].count('\n') + 1
            sites.append((p, line, ck.group(1) if ck else None, dp.group(1) if dp else '<none>'))

keyed = [s for s in sites if s[2]]
print("total useAsync sites: %d" % len(sites))
print("with cacheKey:        %d" % len(keyed))
print()
groups = collections.defaultdict(list)
for p, line, ck, dp in keyed:
    groups[(ck, dp)].append("%s:%d" % (p, line))
print("=== keys shared by more than one site (must be the SAME request) ===")
shared = False
for (ck, dp), locs in sorted(groups.items()):
    if len(locs) > 1:
        shared = True
        print("  %-26s deps=%s" % (ck, dp))
        for l in locs:
            print("       %s" % l)
if not shared:
    print("  (none)")
print()
print("=== operation ids used at more than one deps shape (fine, just listing) ===")
byop = collections.defaultdict(set)
for (ck, dp) in groups:
    byop[ck].add(dp)
for ck, deps in sorted(byop.items()):
    if len(deps) > 1:
        print("  %-26s %s" % (ck, sorted(deps)))
