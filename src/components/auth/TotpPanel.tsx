/**
 * The TOTP branch's QR canvas and secret — design §5.1.
 *
 * > *"Choosing it reveals a QR canvas (144 px) plus the secret as selectable
 * > text, `font-mono`, `dir="ltr"`, inside `<bdi>`. **The QR does not mirror**
 * > (`rtl.md`, media glyphs). Primary becomes `Continue`."*
 *
 * ## Two paths, and the second one is not a fallback
 *
 * An operator scans the square with the phone that will hold the code — which
 * is the phone that cannot photograph its own screen if the console is *on*
 * that phone, and is the wrong phone if they are at a shared desk. So the
 * secret beneath it is a **first-class path**, not a degradation: `Can't scan
 * it? Enter this key in the app`, selectable, grouped in fours so it can be
 * read aloud, and `font-mono` so `0`/`O` and `1`/`l` are distinguishable at
 * 13 px. If the encoder refuses the payload (over version 6) the square is
 * simply absent and this path is still whole.
 *
 * ## What is drawn, and what it costs
 *
 * An inline `<svg>` of `currentColor` rects at one rect per dark module —
 * **not a `<canvas>` and not an `<img>`**. Three reasons, in order of weight:
 * it inherits `--ev-ink` instead of baking a hex, it survives a zoom and a
 * print at any scale, and it is in the DOM where a visual-regression test can
 * diff it. `shape-rendering="crispEdges"` because a QR module boundary
 * anti-aliased is a QR module a phone has to work harder to read.
 *
 * ## Accessibility
 *
 * The square is **`aria-hidden`**. It encodes exactly the string rendered
 * beneath it, so announcing it would read the same secret twice — once as an
 * unreadable image description and once as text. `rtl.md` puts a media glyph in
 * the do-not-mirror column, and an SVG with no `dir` does not mirror anyway;
 * the box around it is what carries the layout.
 */

import { isolatedRunProps, type Translator } from '@/lib'
import type { TotpEnrolment } from '@/data/types/auth'
import { MAX_QR_BYTES, qrMatrix } from './qrMatrix'

/** §5.1's canvas, in `--ev-*` terms: 144 px is `size-36` on the 4 px grid. */
const QR_PX = 144

export function TotpPanel({ enrolment, t }: { enrolment: TotpEnrolment; t: Translator }) {
  /* The `<bdi>` carries the isolation and the box carries the layout —
     `isolatedRunProps` returns two bags precisely so a `className` cannot reach
     the run and stretch it. */
  const secret = isolatedRunProps({
    ltr: 'totpSecret',
    /* **The classes go on the BOX, through the helper.** Spreading `box` over
       a `className` written on the element clobbers it with `undefined`, which
       is precisely the trap `isolatedRunProps` exists to make visible: there is
       one place layout can live, and it is the argument. */
    className: 'select-all rounded-lg bg-muted px-2 py-1 font-mono text-sm text-foreground',
  })

  return (
    <div className="ms-6 mt-3 flex flex-col gap-2">
      <QrSquare uri={enrolment.otpauthUri} />
      <p className="text-xs text-muted-foreground">{t('auth.enroll.secret')}</p>
      {/* Selectable, because the whole point is that it can be copied into an
          authenticator by hand. `select-all` makes one click take all of it —
          a secret half-selected is a secret typed wrong. */}
      <p {...secret.box}>
        <bdi {...secret.run}>{enrolment.secret}</bdi>
      </p>
    </div>
  )
}

/**
 * The matrix, as rects. **One rect per dark module**, not per run: a QR at
 * version 6 is 41 × 41, so the worst case is ~840 rects, which is nothing, and
 * run-length merging would make the output harder to diff for no measurable
 * gain.
 *
 * The `viewBox` is the module grid **plus a four-module quiet zone on every
 * side**, which the specification requires and which scanners genuinely need —
 * a QR flush against a card edge is one a phone often will not find.
 */
function QrSquare({ uri }: { uri: string }) {
  const code = safeMatrix(uri)
  /* Over the encoder's bound the square is simply not drawn. §5.1 already ships
     the manual path beside it, so there is nothing to apologise for and no
     error state to invent. */
  if (code === null) return null

  const quiet = 4
  const extent = code.size + quiet * 2
  const rects: string[] = []
  for (let row = 0; row < code.size; row += 1) {
    for (let col = 0; col < code.size; col += 1) {
      if ((code.modules[row] as boolean[])[col]) rects.push(`${col + quiet},${row + quiet}`)
    }
  }

  return (
    <svg
      viewBox={`0 0 ${extent} ${extent}`}
      width={QR_PX}
      height={QR_PX}
      shapeRendering="crispEdges"
      /* It encodes the secret rendered directly beneath it, so announcing it
         would read the same string twice. */
      aria-hidden="true"
      focusable="false"
      className="rounded-lg bg-card text-foreground"
    >
      {rects.map((position) => {
        const [x, y] = position.split(',')
        return <rect key={position} x={x} y={y} width={1} height={1} fill="currentColor" />
      })}
    </svg>
  )
}

/** `null` rather than a throw at the render boundary — see `qrMatrix`'s bound. */
function safeMatrix(uri: string): ReturnType<typeof qrMatrix> | null {
  if (new TextEncoder().encode(uri).length > MAX_QR_BYTES) return null
  try {
    return qrMatrix(uri)
  } catch {
    return null
  }
}
