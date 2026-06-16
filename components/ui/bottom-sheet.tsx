"use client"

import * as React from "react"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet"
import { cn } from "@/lib/utils"

interface BottomSheetProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function BottomSheet({ children, open, onOpenChange }: BottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {children}
    </Sheet>
  )
}

interface BottomSheetContentProps extends React.ComponentProps<typeof SheetContent> {
  className?: string
  children: React.ReactNode
}

export function BottomSheetContent({ className, children, ...props }: BottomSheetContentProps) {
  return (
    <SheetContent
      side="bottom"
      className={cn(
        "max-h-[85vh] overflow-y-auto rounded-t-2xl p-0",
        className
      )}
      {...props}
    >
      {/* Drag handle for visual feedback */}
      <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted" />
      {children}
    </SheetContent>
  )
}

export const BottomSheetTrigger = SheetTrigger
export const BottomSheetClose = SheetClose
export const BottomSheetHeader = SheetHeader
export const BottomSheetFooter = SheetFooter
export const BottomSheetTitle = SheetTitle
export const BottomSheetDescription = SheetDescription
