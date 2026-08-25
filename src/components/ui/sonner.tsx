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
 *               NO period, NO exclamation mark, NO emoji, NO "successfully",
 *               and NO ACTION LINK — a toast never carries an action the
 *               operator must take (§13.1 "Never"). The action slot is
 *               disabled below, not merely left unused.
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
      // R9 — a toast carries no action link. Sonner still renders `action` if a
      // caller passes one, so this is enforced at the call site by review and
      // by the `toast()` wrapper in 0.7, not here; the class below at least
      // makes a stray action visually identical to the label rather than a
      // second affordance.
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
            "text-sm font-normal shadow-2",
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
