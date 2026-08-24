#!/bin/bash
# Downloads every screen listed in manifest.tsv into its folder.
# Idempotent: skips files already present.
while IFS=$'\t' read -r slug folder name; do
  [ -z "$slug" ] && continue
  mkdir -p "$folder"
  out="$folder/$name.webp"
  [ -s "$out" ] && continue
  curl -sfL -o "$out" "https://mobbin.com/api/mcp/short/$slug" || echo "FAIL $slug $name"
done < manifest.tsv
