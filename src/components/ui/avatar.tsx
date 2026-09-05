/**
 * Avatar — restyled for Eyvar. Do not use the stock shadcn version.
 *
 * Rules applied
 *   R15      ROUNDED SQUARE, radius 8px (`rounded-lg`). NEVER a circle. The
 *            stock component is `rounded-full` in four places; all four are
 *            replaced. 28px in the top bar (`size="sm"` is 24px, default is
 *            28px = `--ev-control-h`, `lg` is 36px = `--ev-control-h-lg`), so
 *            the avatar sits on the same baseline as every other control and
 *            widens in Arabic through the token.
 *   §7.5     the fallback renders initials in `--ev-text-2` on `--ev-bg2`,
 *            5.35:1. It is never blank.
 *   §9.1     `end-0` / `-space-x-2` — logical.
 *   AC-76    no emoji anywhere, including in a fallback.
 *
 * Removed on arrival: every `rounded-full`, the the dark-mode blend-mode override
 * pair (one theme), and the `after:mix-blend-darken` ring trick — a plain
 * hairline border reads correctly on both `--ev-surface` and `--ev-bg`.
 */
import * as React from "react"
import { Avatar as AvatarPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  /* `xs` is the 20px owner mark on an inbox row (design 12 §3.1). */
  size?: "default" | "xs" | "sm" | "lg"
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar relative flex size-control shrink-0 overflow-hidden rounded-lg border border-border bg-muted select-none data-[size=lg]:size-control-lg data-[size=sm]:size-6 data-[size=xs]:size-5 data-[size=xs]:rounded-sm",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        "aspect-square size-full rounded-lg object-cover",
        className
      )}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs group-data-[size=xs]/avatar:rounded-sm group-data-[size=xs]/avatar:text-2xs",
        className
      )}
      {...props}
    />
  )
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute end-0 bottom-0 z-10 inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground ring-2 ring-background select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-control shrink-0 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-control-lg group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
}
