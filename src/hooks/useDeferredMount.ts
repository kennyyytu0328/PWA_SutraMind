import { useEffect, useRef, useState, type MutableRefObject } from 'react'

interface DeferredMount {
  /** `true` after one animation frame has elapsed since mount. */
  ready: boolean
  /**
   * Stays `true` for the chart's first rendered frame, then flips to `false`.
   * Read it (as `firstMountRef.current`) to gate a one-shot intro animation:
   * because it's a ref, flipping it does not re-render or replay the animation.
   */
  firstMountRef: MutableRefObject<boolean>
}

/**
 * Defers chart rendering by one animation frame and tracks first-mount.
 *
 * Recharts' `ResponsiveContainer` emits a dev-mode "width(-1) height(-1)"
 * warning on its very first render because the internal ResizeObserver hasn't
 * fired yet. Gating the chart on `ready` lets the parent layout settle so the
 * observer reports real dimensions on the chart's first commit.
 *
 * `firstMountRef` flips `false` only *after* `ready` becomes `true`, so the
 * deferred-mount delay never costs the chart its intro animation.
 */
export function useDeferredMount(): DeferredMount {
  const [ready, setReady] = useState(false)
  const firstMountRef = useRef(true)

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (ready) firstMountRef.current = false
  }, [ready])

  return { ready, firstMountRef }
}
