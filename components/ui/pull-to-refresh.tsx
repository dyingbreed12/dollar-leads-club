"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface PullToRefreshProps {
  children: React.ReactNode
  onRefresh: () => Promise<void>
  disabled?: boolean
  className?: string
  pullThreshold?: number
}

export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  className,
  pullThreshold = 80,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = React.useState(0)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [touchStart, setTouchStart] = React.useState(0)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleTouchStart = React.useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return

    // Only trigger if at the top of the page
    const scrollTop = containerRef.current?.scrollTop ?? window.scrollY
    if (scrollTop === 0) {
      setTouchStart(e.touches[0].clientY)
    }
  }, [disabled, isRefreshing])

  const handleTouchMove = React.useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || touchStart === 0) return

    const scrollTop = containerRef.current?.scrollTop ?? window.scrollY
    if (scrollTop > 0) {
      setTouchStart(0)
      setPullDistance(0)
      return
    }

    const touchY = e.touches[0].clientY
    const distance = touchY - touchStart

    if (distance > 0) {
      // Prevent default scrolling when pulling down
      e.preventDefault()
      // Apply resistance to the pull
      const resistance = Math.min(distance / 2, pullThreshold * 1.5)
      setPullDistance(resistance)
    }
  }, [disabled, isRefreshing, touchStart, pullThreshold])

  const handleTouchEnd = React.useCallback(async () => {
    if (disabled || isRefreshing) return

    if (pullDistance >= pullThreshold) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } catch (error) {
        console.error('Refresh error:', error)
      } finally {
        setIsRefreshing(false)
      }
    }

    setTouchStart(0)
    setPullDistance(0)
  }, [disabled, isRefreshing, pullDistance, pullThreshold, onRefresh])

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const showRefreshIndicator = pullDistance > 0 || isRefreshing
  const isTriggered = pullDistance >= pullThreshold

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Refresh indicator */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-50 flex items-center justify-center transition-all duration-200",
          showRefreshIndicator ? "opacity-100" : "opacity-0"
        )}
        style={{
          height: `${Math.min(pullDistance, pullThreshold)}px`,
          transform: isRefreshing ? 'translateY(0)' : `translateY(-${pullThreshold - pullDistance}px)`,
        }}
      >
        <div className="flex flex-col items-center gap-1">
          <Loader2
            className={cn(
              "size-6 text-muted-foreground transition-all",
              isRefreshing && "animate-spin",
              isTriggered && !isRefreshing && "rotate-180"
            )}
          />
          <span className="text-muted-foreground text-xs">
            {isRefreshing ? "Refreshing..." : isTriggered ? "Release to refresh" : "Pull to refresh"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div
        className={cn("transition-transform duration-200")}
        style={{
          transform: isRefreshing
            ? `translateY(${pullThreshold}px)`
            : `translateY(${pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
