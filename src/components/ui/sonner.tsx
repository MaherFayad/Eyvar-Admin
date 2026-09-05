/**
 * Toaster — restyled for Eyvar. Do not use the stock shadcn version.
 *
 * The stock wrapper is a LIGHT card at the bottom-RIGHT with an action slot and
 * five status icons. Every one of those is wrong here.
 *
 * Rules applied
 *   §5.1 / C9   DARK `--ev-ink` fill, white label. This closes legacy defect
 *               D7 (a light tinted card). Recorded as sanctioned deviation #8
 *               in the design spec so nobody "restores" the light toast as a
 *               regression fix.
 *   §5.1 / D7   BOTTOM-CENTRE OF THE VIEWPORT — not bottom-right. Newest
 *               nearest the bottom edge, older ones push up, at most 3 visible.
 *   R15         rounded rectangle, radius 8px. Never a stadium.
 *   R9 / §5.7   ONE LINE, names the object exactly, <= 60 characters.
 *               Formula: `<object> <past-participle>`, sentence case.
 *               NO period, NO exclamation mark, NO emoji, NO "successfully".
 *
 *   §6.2 D-16   **THE ACTION SLOT IS NO LONGER BLANKET-FORBIDDEN, AND THIS
 *               PARAGRAPH IS THE ONE THAT WOULD OTHERWISE DELETE A REQUIRED
 *               CONTROL.** It used to read *"NO ACTION LINK — a toast never
 *               carries an action the operator must take (§13.1 Never). The
 *               action slot is disabled below, not merely left unused."*
 *
 *               Then **D18 made undo a real inverse operation whose ten-second
 *               window IS the toast's life**, which requires an `Undo` in the
 *               toast — so by §6.2's own rule the toast this register mandates
 *               was a defect against the file implementing the prohibition.
 *
 *               D-16 replaces the ban with the reason behind it, as a test:
 *
 *                 > A toast may carry an action **if and only if** either
 *                 > (a) missing the action is harmless, or
 *                 > (b) the toast does not auto-dismiss.
 *
 *               The original prohibition was right because a toast is
 *               transient, so an action inside one carries a deadline the
 *               operator did not set and the failure mode is **missing it**.
 *               `Undo` passes (a): missing it means the act stands, which is
 *               what the operator asked for. `Try again` / `Open the record` on
 *               a **critical** toast pass (b), because that toast does not
 *               auto-dismiss — a critical toast is not a red toast, it is a
 *               toast that has stopped being transient.
 *
 *               **An action on an ordinary 5-second toast whose omission loses
 *               something remains forbidden.** That is legacy defect D7 and it
 *               keeps its name.
 *   R5a / R7    no status icon set. Sonner ships success/info/warning/error
 *               glyphs; a toast is a transient confirmation of something that
 *               already happened, so a warning or error glyph here is R10's
 *               "banner where a toast would do" inverted. All five icons are
 *               removed.
 *   AC-72       THE TOAST DOES NOT MIRROR. The region is centre-anchored, so
 *               there is no corner to flip and no horizontal transform in
 *               EITHER language. The legacy `translateX(28px)` is DELETED, not
 *               negated — it is unreproducible by construction here. AC-72 was
 *               amended after 0.2 for exactly this reason (finding F-2).
 *   AC-23       survives a route change within its 5s window — Sonner's
 *               `<Toaster>` is mounted once at the shell root, above the router
 *               outlet, so a route change never unmounts it.
 *   AC-29       announced through the SINGLE live region. Sonner ships its own
 *               `aria-live` region; `LiveRegionAnnouncer` (S-08) must NOT add a
 *               second one for toasts. A toast is never the only carrier of
 *               information (§7.5.4).
 *   §7.6/AC-69  entry/exit motion is suppressed by the global reduced-motion
 *               guard in `globals.css`.
 *
 * Removed on arrival: the `next-themes` `useTheme()` dependency and the `theme`
 * prop (Eyvar ships ONE theme; the toast is dark by spec regardless of anything
 * else on the page — the package is uninstalled), the five status icons, and
 * the light `--normal-bg`/`--normal-text` mapping.
 */
import { Toaster as Sonner, type ToasterProps } from "sonner"

function Toaster({ toastOptions, ...props }: ToasterProps) {
  return (
    <Sonner
      // Bottom-centre of the VIEWPORT (§5.1). Not of the content region, and
      // not a corner — so RTL has nothing to mirror.
      position="bottom-center"
      // At most 3 visible; newest nearest the bottom edge (§11.5).
      visibleToasts={3}
      // 5s, then auto-dismiss. Hover pauses (Sonner default).
      duration={5000}
      // A trailing ✕, and nothing else, is the only control (§11.5).
      closeButton
      // §6.2 D-16 — an action is admissible under the two-part test in the
      // header, and the header explains why the blanket ban was replaced rather
      // than carved out. `Undo` (D18) and a critical toast's `Try again` both
      // qualify; an action on an ordinary 5s toast whose omission loses
      // something does not, and that remains a call-site rule enforced by
      // review, because Sonner cannot tell the two apart from here.
      icons={{}}
      className="toaster group"
      toastOptions={{
        ...toastOptions,
        classNames: {
          toast: [
            "group toast",
            "flex min-h-8 w-fit max-w-160 items-center gap-2",
            "rounded-lg border-0 px-3 py-1.5",
            "bg-foreground text-background",
            "text-sm font-normal",
          ].join(" "),
          title: "text-sm font-normal",
          description: "text-sm text-background/80",
          closeButton:
            "text-background/70 hover:text-background focus-visible:ring-2 focus-visible:ring-background",
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
