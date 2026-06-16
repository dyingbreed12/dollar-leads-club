import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Mobile-specific utility functions
 */

/** Minimum touch target size (44px) recommended by Apple and Google */
export const MIN_TOUCH_TARGET = 44

/**
 * Gets responsive padding based on screen size
 * @param base - base padding for mobile (default: 4)
 * @param desktop - padding for desktop (default: 6)
 * @returns Tailwind padding classes
 */
export function getResponsivePadding(base: number = 4, desktop: number = 6): string {
  return `p-${base} lg:p-${desktop}`
}

/**
 * Gets responsive text size classes
 * @param mobile - mobile text size (e.g., 'sm', 'base')
 * @param desktop - desktop text size (e.g., 'base', 'lg')
 * @returns Tailwind text size classes
 */
export function getResponsiveText(mobile: string, desktop: string): string {
  return `text-${mobile} lg:text-${desktop}`
}

/**
 * Checks if device supports touch
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

/**
 * Gets device type based on window width (for SSR-safe usage)
 */
export function getDeviceType(width: number): 'mobile' | 'tablet' | 'desktop' {
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

/**
 * Formats classes for responsive grid
 * @param mobileCols - columns on mobile (default: 1)
 * @param tabletCols - columns on tablet (default: 2)
 * @param desktopCols - columns on desktop (default: 3)
 * @returns Tailwind grid column classes
 */
export function getResponsiveGrid(
  mobileCols: number = 1,
  tabletCols: number = 2,
  desktopCols: number = 3
): string {
  return cn(
    `grid-cols-${mobileCols}`,
    `md:grid-cols-${tabletCols}`,
    `lg:grid-cols-${desktopCols}`
  )
}

/**
 * Get responsive button size classes for touch-friendly interactions
 * @param size - button size variant
 * @returns Tailwind classes for button sizing
 */
export function getTouchFriendlyButton(size: 'sm' | 'md' | 'lg' = 'md'): string {
  const sizes = {
    sm: 'min-h-10 px-3 text-sm',
    md: 'min-h-11 px-4 text-base',
    lg: 'min-h-12 px-6 text-lg',
  }
  return sizes[size]
}
