import * as React from "react"

import { cn } from "@/lib/utils"

type SurfacePanelProps = React.ComponentProps<"div"> & {
  density?: "default" | "compact" | "spacious"
  tone?: "default" | "muted" | "transparent"
}

function SurfacePanel({
  className,
  density = "default",
  tone = "default",
  ...props
}: SurfacePanelProps) {
  return (
    <div
      data-slot="surface-panel"
      data-density={density}
      data-tone={tone}
      className={cn(
        "rounded-[calc(var(--radius)+6px)] border border-panel-border/90 text-panel-foreground ring-1 ring-panel-ring/70 transition-colors",
        "data-[tone=default]:bg-panel/96 data-[tone=muted]:bg-panel-muted/84 data-[tone=transparent]:bg-transparent",
        "data-[density=default]:p-5 data-[density=compact]:p-4 data-[density=spacious]:p-6",
        className
      )}
      {...props}
    />
  )
}

export { SurfacePanel }
