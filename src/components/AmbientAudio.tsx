'use client'

import { useEffect, useRef, useState } from 'react'

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const SRC = `${BASE_PATH}/audio/meditativetiger-nomadic-spirit.mp3`
const STORAGE_KEY = 'sutramind:ambient-on'
const TARGET_VOLUME = 0.35
const FADE_MS = 1200

export function AmbientAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fadeRef = useRef<number | null>(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    const audio = new Audio(SRC)
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = 0
    audioRef.current = audio

    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1') {
      setOn(true)
    }

    return () => {
      if (fadeRef.current) window.clearInterval(fadeRef.current)
      audio.pause()
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (fadeRef.current) {
      window.clearInterval(fadeRef.current)
      fadeRef.current = null
    }

    const stepMs = 40
    const steps = Math.max(1, Math.round(FADE_MS / stepMs))
    const target = on ? TARGET_VOLUME : 0
    const start = audio.volume
    const delta = (target - start) / steps
    let i = 0

    if (on) {
      audio.play().catch(() => {
        setOn(false)
        localStorage.setItem(STORAGE_KEY, '0')
      })
    }

    fadeRef.current = window.setInterval(() => {
      i++
      const v = i >= steps ? target : start + delta * i
      audio.volume = Math.min(1, Math.max(0, v))
      if (i >= steps) {
        if (fadeRef.current) window.clearInterval(fadeRef.current)
        fadeRef.current = null
        if (!on) audio.pause()
      }
    }, stepMs)
  }, [on])

  function toggle() {
    setOn((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={on ? '關閉背景音' : '開啟背景音'}
      aria-pressed={on}
      className="ml-auto inline-flex h-12 w-12 items-center justify-center rounded-full text-zen-muted hover:text-zen-accent transition-colors"
    >
      {on ? <SoundOnIcon /> : <SoundOffIcon />}
    </button>
  )
}

function SoundOnIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 9.5h3l4-3v11l-4-3H5z" />
      <path d="M15.5 8.5a4 4 0 0 1 0 7" />
      <path d="M17.8 6a7 7 0 0 1 0 12" opacity="0.6" />
    </svg>
  )
}

function SoundOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 9.5h3l4-3v11l-4-3H5z" />
      <path d="M16 9l5 6M21 9l-5 6" />
    </svg>
  )
}
