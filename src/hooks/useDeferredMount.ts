import { useEffect, useState } from 'react'

/**
 * Returns `true` after one animation frame has elapsed since mount.
 *
 * Used to defer rendering chart children inside Recharts' `ResponsiveContainer`
 * until the wrapping div has been laid out. Recharts 3.x emits a dev-mode
 * "width(-1) height(-1)" warning on its very first render because the
 * internal ResizeObserver hasn't fired yet. Skipping the first frame lets
 * the parent layout settle so the observer reports real dimensions
 * immediately on the chart's first commit.
 */
export function useDeferredMount(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return ready
}
