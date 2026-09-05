/**
 * The row detail for the three Growth lists that have one (AC-G16, AC-G24).
 * §5.5 — a drawer with no scrim, so the row it explains stays readable. One
 * component over a title and a fact list, because three near-identical sheets
 * would drift the moment one of them gained a field.
 */

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { FactGrid, type Fact } from '@/components/FactGrid'

export interface GrowthSheetProps {
  open: boolean
  onClose: () => void
  title: string
  facts: readonly Fact[]
  /** The message body, which is prose rather than a fact and takes the width. */
  prose?: { label: string; value: string } | null
}

export function GrowthSheet({ open, onClose, title, facts, prose = null }: GrowthSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <SheetContent className="w-drawer overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            <bdi>{title}</bdi>
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-5 px-4 pb-4">
          {prose !== null && (
            <div className="flex flex-col gap-1">
              <span className="text-2xs font-medium tracking-widest text-muted-foreground uppercase">
                {prose.label}
              </span>
              <p className="text-sm text-pretty text-foreground">
                <bdi>{prose.value}</bdi>
              </p>
            </div>
          )}
          <FactGrid facts={facts} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
