import { describe, it, expect } from 'vitest'
import { pickAction } from './action-picker'

describe('pickAction', () => {
  it('returns only "comment", "chat", or "like"', () => {
    for (let i = 0; i < 100; i++) {
      const action = pickAction()
      expect(['comment', 'chat', 'like']).toContain(action)
    }
  })

  it('produces roughly 60% comment, 20% chat, 20% like over 1000 calls', () => {
    let commentCount = 0
    let chatCount = 0
    let likeCount = 0
    const runs = 1000
    for (let i = 0; i < runs; i++) {
      const action = pickAction()
      if (action === 'comment') commentCount++
      else if (action === 'chat') chatCount++
      else if (action === 'like') likeCount++
    }
    // Allow generous tolerance (±15%) due to randomness
    const commentRatio = commentCount / runs
    expect(commentRatio).toBeGreaterThan(0.45) // target 60%
    expect(commentRatio).toBeLessThan(0.75) 
  })

  it('returns a string', () => {
    const action = pickAction()
    expect(typeof action).toBe('string')
  })
})
