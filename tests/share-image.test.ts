import { describe, it, expect } from 'vitest'
import { canUseFileShare } from '@/lib/share-image'

const file = new File([new Blob(['x'])], 'a.png', { type: 'image/png' })

describe('canUseFileShare', () => {
  it('is true when canShare+share exist and canShare returns true', () => {
    const nav = { canShare: () => true, share: async () => {} } as unknown as Navigator
    expect(canUseFileShare(nav, file)).toBe(true)
  })

  it('is false when the APIs are absent', () => {
    expect(canUseFileShare({} as Navigator, file)).toBe(false)
  })

  it('is false when canShare returns false for the file', () => {
    const nav = { canShare: () => false, share: async () => {} } as unknown as Navigator
    expect(canUseFileShare(nav, file)).toBe(false)
  })
})
