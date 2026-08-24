# Extract DB.<key> WRITE sites, attributed to enclosing function.
NR<2166 || NR>21855 { next }
{
  line=$0
  # track current function name: last `function NAME(` seen
  tmp=line
  while (match(tmp, /function[ \t]+[A-Za-z_$][A-Za-z0-9_$]*[ \t]*\(/)) {
    seg=substr(tmp, RSTART, RLENGTH)
    sub(/^function[ \t]+/,"",seg); sub(/[ \t]*\($/,"",seg)
    curfn=seg
    tmp=substr(tmp, RSTART+RLENGTH)
  }
  tmp=line
  while (match(tmp, /(var|window\.)[ \t]*[A-Za-z_$][A-Za-z0-9_$]*[ \t]*=[ \t]*function[ \t]*\(/)) {
    seg=substr(tmp, RSTART, RLENGTH)
    sub(/^(var|window\.)[ \t]*/,"",seg); sub(/[ \t]*=[ \t]*function[ \t]*\($/,"",seg)
    curfn=seg
    tmp=substr(tmp, RSTART+RLENGTH)
  }

  # find every DB.<key> occurrence and classify
  rest=line; off=0
  while (match(rest, /DB\.[A-Za-z_$][A-Za-z0-9_$]*/)) {
    start=RSTART; len=RLENGTH
    key=substr(rest, start+3, len-3)
    pre=substr(rest, 1, start-1)
    after=substr(rest, start+len)
    # walk the accessor chain
    chain=after
    while (1) {
      if (match(chain, /^\.[A-Za-z_$][A-Za-z0-9_$]*/)) { chain=substr(chain, RLENGTH+1); continue }
      if (substr(chain,1,1)=="[") {
        depth=0; i=1
        while (i<=length(chain)) {
          c=substr(chain,i,1)
          if (c=="[") depth++
          else if (c=="]") { depth--; if (depth==0) break }
          i++
        }
        if (depth==0) { chain=substr(chain, i+1); continue }
      }
      break
    }
    w=0
    if (pre ~ /delete[ \t]+$/) w=1
    else if (chain ~ /^[ \t]*(\+|-|\*|\/|\|\||&&)?=[^=]/) w=1
    else if (chain ~ /^[ \t]*(\+\+|--)/) w=1
    else if (chain ~ /^\.(push|unshift|splice|pop|shift|sort|reverse|fill|copyWithin)[ \t]*\(/) w=1
    else if (after ~ /^\.(push|unshift|splice|pop|shift|sort|reverse)[ \t]*\(/) w=1
    if (w) printf "%s\t%s\t%d\n", key, (curfn==""?"(toplevel)":curfn), NR
    rest=after
  }
}
