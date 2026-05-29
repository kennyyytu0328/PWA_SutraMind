import { describe, it, expect } from 'vitest'
import { PREVIEW_CONVERSATIONS } from '@/data/preview-conversation'
import { getSegmentById } from '@/lib/sutra'
import { isCategoryEnabled } from '@/lib/categories'
import sutraDb from '@/data/sutra-db.json'
import type { SutraSegment } from '@/types/chat'

const SUTRA_DB = sutraDb as SutraSegment[]

describe('preview conversations', () => {
  it('ships exactly three conversations', () => {
    expect(PREVIEW_CONVERSATIONS).toHaveLength(3)
  })

  it('each has a valid, enabled category', () => {
    for (const c of PREVIEW_CONVERSATIONS) {
      expect(isCategoryEnabled(c.category)).toBe(true)
    }
  })

  it('each has a non-empty subject label', () => {
    for (const c of PREVIEW_CONVERSATIONS) {
      expect(c.subject.length).toBeGreaterThan(0)
    }
  })

  it('each has 3 user + 3 assistant turns in alternating order', () => {
    for (const c of PREVIEW_CONVERSATIONS) {
      const roles = c.messages.map((m) => m.role)
      expect(roles).toEqual([
        'user',
        'assistant',
        'user',
        'assistant',
        'user',
        'assistant',
      ])
    }
  })

  it('every assistant turn references at least one segment that resolves', () => {
    for (const c of PREVIEW_CONVERSATIONS) {
      const assistants = c.messages.filter((m) => m.role === 'assistant')
      for (const m of assistants) {
        const ids = m.referencedSegmentIds ?? []
        expect(ids.length, `${c.category} assistant turn`).toBeGreaterThan(0)
        for (const id of ids) {
          expect(getSegmentById(SUTRA_DB, id), `${c.category}: ${id}`).toBeDefined()
        }
      }
    }
  })
})
