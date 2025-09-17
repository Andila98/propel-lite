import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-green-500 text-primary-foreground hover:bg-green-500/80",
        warning: "border-transparent bg-yellow-500 text-primary-foreground hover:bg-yellow-500/80",
        info: "border-transparent bg-blue-500 text-primary-foreground hover:bg-blue-500/80",
        "success-gradient": "text-white bg-gradient-to-r from-emerald-500 to-green-600 border-transparent",
        "destructive-gradient": "text-white bg-gradient-to-r from-red-500 to-rose-600 border-transparent",
        "warning-gradient": "text-white bg-gradient-to-r from-amber-500 to-orange-600 border-transparent",
        "info-gradient": "text-white bg-gradient-to-r from-blue-500 to-cyan-600 border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
