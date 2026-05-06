import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { vi, beforeEach } from 'vitest'

// matchMedia: jsdom doesn't ship it. Default to "no reduced motion".
// Tests that need reduced-motion override it via setMatchMediaMatches() below.
let _matches = false
export function setMatchMediaMatches(value: boolean) {
  _matches = value
}
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: _matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// IntersectionObserver: jsdom doesn't ship it. Provide a controllable mock.
// Tests can grab the latest instance via getLatestObserver() and call .trigger(true).
type ObserverInstance = {
  callback: IntersectionObserverCallback
  observed: Element[]
  disconnected: boolean
  trigger: (intersecting: boolean) => void
}
const __observers: ObserverInstance[] = []
/**
 * Returns the most recently constructed IntersectionObserver mock.
 * When multiple observers exist in one test, this only returns the LAST one;
 * to inspect earlier ones, the auto-reset between tests is reset to ensure
 * each test starts with a clean __observers list.
 */
export function getLatestObserver(): ObserverInstance {
  const last = __observers[__observers.length - 1]
  if (!last) throw new Error('No IntersectionObserver instances yet')
  return last
}
export function clearObservers() {
  __observers.length = 0
}

class MockIntersectionObserver {
  private _inst: ObserverInstance
  constructor(public callback: IntersectionObserverCallback) {
    const inst: ObserverInstance = {
      callback,
      observed: [],
      disconnected: false,
      trigger(intersecting) {
        if (this.disconnected) return
        const entries = this.observed.map((target) => ({
          target,
          isIntersecting: intersecting,
          intersectionRatio: intersecting ? 1 : 0,
          boundingClientRect: target.getBoundingClientRect(),
          intersectionRect: target.getBoundingClientRect(),
          rootBounds: null,
          time: Date.now(),
        })) as IntersectionObserverEntry[]
        this.callback(entries, this as unknown as IntersectionObserver)
      },
    }
    this._inst = inst
    __observers.push(inst)
    Object.assign(this, inst)
  }
  observe(target: Element) {
    this._inst.observed.push(target)
  }
  unobserve() { /* no-op */ }
  disconnect() {
    this._inst.disconnected = true
  }
  takeRecords(): IntersectionObserverEntry[] { return [] }
  root = null
  rootMargin = ''
  thresholds: ReadonlyArray<number> = []
}
;(globalThis as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver

// Auto-reset mock state between tests so individual tests don't have to
// manually call clearObservers() or setMatchMediaMatches(false).
beforeEach(() => {
  _matches = false
  __observers.length = 0
})
