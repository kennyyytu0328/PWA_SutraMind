'use client'
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import {
  phraseDurationMs,
  type RecitationPhrase,
  type RecitationSpeed,
} from '@/lib/recitation'

export type RecitationStatus = 'idle' | 'playing' | 'paused' | 'done'

interface RecitationState {
  index: number
  status: RecitationStatus
  speed: RecitationSpeed
}

type Action =
  | { type: 'start' }
  | { type: 'toggle' }
  | { type: 'pause' }
  | { type: 'advance'; total: number }
  | { type: 'setSpeed'; speed: RecitationSpeed }

const INITIAL: RecitationState = { index: 0, status: 'idle', speed: '中' }

function reducer(state: RecitationState, action: Action): RecitationState {
  switch (action.type) {
    case 'start':
      return { ...state, index: 0, status: 'playing' }
    case 'toggle':
      if (state.status === 'playing') return { ...state, status: 'paused' }
      if (state.status === 'paused') return { ...state, status: 'playing' }
      return state
    case 'pause':
      return state.status === 'playing' ? { ...state, status: 'paused' } : state
    case 'advance':
      if (state.status !== 'playing') return state
      return state.index + 1 < action.total
        ? { ...state, index: state.index + 1 }
        : { ...state, status: 'done' }
    case 'setSpeed':
      return { ...state, speed: action.speed }
  }
}

export interface RecitationApi extends RecitationState {
  current: RecitationPhrase | null
  recent: RecitationPhrase[]
  progress: number
  start(): void
  toggle(): void
  setSpeed(speed: RecitationSpeed): void
}

export function useRecitation(phrases: RecitationPhrase[]): RecitationApi {
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const total = phrases.length

  // Single live timer, rescheduled whenever status / index / speed change.
  useEffect(() => {
    if (state.status !== 'playing') return
    const phrase = phrases[state.index]
    if (!phrase) return
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      dispatch({ type: 'advance', total })
    }, phraseDurationMs(phrase, state.speed))
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [state.status, state.index, state.speed, phrases, total])

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) dispatch({ type: 'pause' })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const start = useCallback(() => dispatch({ type: 'start' }), [])
  const toggle = useCallback(() => dispatch({ type: 'toggle' }), [])
  const setSpeed = useCallback(
    (speed: RecitationSpeed) => dispatch({ type: 'setSpeed', speed }),
    []
  )

  const active = state.status === 'playing' || state.status === 'paused'
  const current = active ? phrases[state.index] ?? null : null
  const recent = useMemo(
    () => (active ? phrases.slice(Math.max(0, state.index - 2), state.index) : []),
    [active, phrases, state.index]
  )
  const progress =
    state.status === 'done' ? 1 : active && total > 0 ? (state.index + 1) / total : 0

  return { ...state, current, recent, progress, start, toggle, setSpeed }
}
