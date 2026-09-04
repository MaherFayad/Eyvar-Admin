// PostToolUse hook for Edit, Write and MultiEdit (wired in .claude/settings.json).
// Reads the hook payload on stdin and checks ONLY the text the tool just wrote, so
// legacy content in the same file never produces noise. Findings go to stderr with
// exit 2, which is how a PostToolUse hook hands a report back to the agent. It never
// blocks the edit and never touches the file.
import { readFileSync } from 'node:fs'

let payload
try {
  payload = JSON.parse(readFileSync(0, 'utf8'))
} catch {
  process.exit(0)
}
const input = payload?.tool_input ?? {}
const file = String(input.file_path ?? '').replace(/\\/g, '/')
if (!/(^|\/)src\//.test(file) || !/\.(tsx?|css)$/.test(file)) process.exit(0)

const written =
  input.new_string ??
  input.content ??
  (Array.isArray(input.edits) ? input.edits.map((e) => e.new_string ?? '').join('\n') : '')
if (!written.trim()) process.exit(0)

const isCss = file.endsWith('.css')
const isTokenFile = file.endsWith('styles/globals.css')
const isTest = /\.test\.tsx?$/.test(file)

// Token checks run on code only; a comment quoting a hex value is not a defect.
const code = written
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/.*$/gm, '$1')

const rules = [
  {
    id: 'palette',
    why: 'Tailwind palette class; use a semantic slot (bg-background, text-muted-foreground, border-border, bg-primary)',
    re: /\b(?:bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|divide|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/,
    on: !isCss,
  },
  {
    id: 'arbitrary',
    why: 'arbitrary value bypasses the scale; use a token',
    re: /\b(?:[a-z]+:)*[a-z][a-z-]*-\[[^\]\s]+\]/,
    on: !isCss,
  },
  {
    id: 'raw-colour',
    why: 'raw colour outside globals.css',
    re: /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![\w-])|\brgba?\(|\bhsla?\(|\boklch\(/,
    on: !isTokenFile,
  },
  {
    id: 'physical',
    why: 'physical direction utility; use ms-/me-/ps-/pe-/start-/end-/text-start',
    re: /(?<![\w-])(?:ml|mr|pl|pr|left|right|border-l|border-r|rounded-l|rounded-r|text-left|text-right|inset-l|inset-r)-(?![\w-]*\[)/,
    on: !isCss,
  },
  {
    id: 'physical-css',
    why: 'physical direction in CSS; use logical properties',
    re: /margin-(?:left|right)\s*:|padding-(?:left|right)\s*:|^\s*(?:left|right)\s*:|text-align\s*:\s*(?:left|right)/m,
    on: isCss,
  },
  {
    id: 'div-onclick',
    why: 'non-focusable click target; use <button> or <a>',
    re: /<(?:div|span|li|td|tr)\b[^>]*\bonClick=/,
    on: !isCss,
  },
  {
    id: 'default-value',
    why: 'defaultValue literal is invisible to the extractor; add the key to the owning copy.ts',
    re: /\bdefaultValue\s*:\s*['"`]/,
    on: !isCss && !isTest,
  },
]

const findings = []
const lines = code.split('\n')
for (const rule of rules) {
  if (!rule.on) continue
  lines.forEach((line, i) => {
    if (rule.re.test(line)) {
      findings.push(`${i + 1}: [${rule.id}] ${line.trim().slice(0, 90)}\n     ${rule.why}`)
    }
  })
}
if (/outline-none|outline\s*:\s*none/.test(code) && !/focus-visible:(?:ring|outline)|focus:ring/.test(code)) {
  findings.push('[focus] outline-none written without a focus-visible:ring-* in the same edit')
}
if (/(?:group-hover|hover):(?:opacity-100|visible|flex|block)/.test(code) && !/focus-within|focus-visible/.test(code)) {
  findings.push('[hover-only] a hover reveal with no focus-within fallback')
}

// Comment policy: at most five lines, cite the ruling ID instead of restating it.
let run = 0
let longest = 0
for (const line of written.split('\n')) {
  if (/^\s*(\/\/|\/\*|\*|\*\/)/.test(line)) {
    run += 1
    longest = Math.max(longest, run)
  } else run = 0
}
if (longest > 8) {
  findings.push(`[comment] a ${longest}-line comment block; the policy is five lines that cite a ruling ID (CLAUDE.md, Comments)`)
}

if (!findings.length) process.exit(0)
const shown = findings.slice(0, 12)
process.stderr.write(
  `edit-gate: ${findings.length} finding(s) in ${file} (only the text you just wrote was checked)\n  ` +
    shown.join('\n  ') +
    (findings.length > shown.length ? `\n  ...and ${findings.length - shown.length} more` : '') +
    '\n',
)
process.exit(2)
