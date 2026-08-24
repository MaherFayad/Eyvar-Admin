NR<2166 || NR>21855 { next }
{
  line=$0
  prevfn=curfn
  tmp=line
  while (match(tmp, /function[ \t]+[A-Za-z_$][A-Za-z0-9_$]*[ \t]*\(/)) {
    seg=substr(tmp, RSTART, RLENGTH); sub(/^function[ \t]+/,"",seg); sub(/[ \t]*\($/,"",seg)
    curfn=seg; tmp=substr(tmp, RSTART+RLENGTH)
  }
  if (curfn!=prevfn) { delete alias }
  tmp=line
  while (match(tmp, /(var|let|const)[ \t]+[A-Za-z_$][A-Za-z0-9_$]*[ \t]*=[ \t]*DB\.[A-Za-z_$][A-Za-z0-9_$]*[\[\.]/)) {
    seg=substr(tmp, RSTART, RLENGTH)
    nm=seg; sub(/^(var|let|const)[ \t]+/,"",nm); sub(/[ \t]*=.*$/,"",nm)
    cl=seg; sub(/^.*=[ \t]*DB\./,"",cl); sub(/[\[\.]$/,"",cl)
    if (cl!="" && nm!="") alias[nm]=cl
    tmp=substr(tmp, RSTART+RLENGTH)
  }
  tmp=line
  while (match(tmp, /DB\.[A-Za-z_$][A-Za-z0-9_$]*[^;]*\.(forEach|map|some|every)[ \t]*\([ \t]*function[ \t]*\([ \t]*[A-Za-z_$][A-Za-z0-9_$]*/)) {
    seg=substr(tmp, RSTART, RLENGTH)
    cl=seg; sub(/^DB\./,"",cl); sub(/[^A-Za-z0-9_$].*$/,"",cl)
    pm=seg; sub(/^.*function[ \t]*\([ \t]*/,"",pm)
    if (cl!="" && pm!="") alias[pm]=cl
    tmp=substr(tmp, RSTART+RLENGTH)
  }
  for (nm in alias) {
    pat = "(^|[^A-Za-z0-9_$.])" nm "[.][A-Za-z_$][A-Za-z0-9_$]*[ \t]*([+][+]|[-][-]|[-+*/|&]?=[^=])"
    dpat = "delete[ \t]+" nm "[.[]"
    if (match(line, pat) || match(line, dpat)) {
      printf "%s\t%s\t%d\tALIAS:%s\n", alias[nm], (curfn==""?"(top)":curfn), NR, nm
    }
  }
}
