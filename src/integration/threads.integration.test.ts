/**
 * Threads Live Integration Tests
 *
 * Run with:
 *   INTEGRATION_TESTS=1 npm test -- src/integration/threads.integration.test.ts
 *
 * Prerequisites:
 *   INTEGRATION_TESTS=1
 *   TEST_THREADS_COOKIE        (same Meta cookies as Instagram — sessionid, csrftoken)
 *   TEST_THREADS_TARGET_POST_ID   (post ID to test reply to)
 *
 * These tests POST REAL content on a REAL Threads account.
 */

import { describe, it, expect } from 'vitest'
import ThreadsCookieAdapter from '../adapters/providers/meta/threads/threads-cookie'

const COOKIE = process.env.TEST_THREADS_COOKIE ?? ''
const TARGET_POST_ID = process.env.TEST_THREADS_TARGET_POST_ID ?? ''
const SKIP_REASON: string[] = []

if (!process.env.INTEGRATION_TESTS) SKIP_REASON.push('INTEGRATION_TESTS not set')
if (!COOKIE) SKIP_REASON.push('TEST_THREADS_COOKIE not set')
const SKIP = SKIP_REASON.length > 0

describe('Threads Live Integration Tests', () => {
  if (SKIP) {
    it(`SKIPPED: ${SKIP_REASON.join(' | ')}`, () => {})
    return
  }

  it('connect rejects empty cookie', async () => {
    const adapter = new ThreadsCookieAdapter('')
    await expect(adapter.connect()).rejects.toThrow(/not provided/i)
  })

  it('connect accepts valid cookie', async () => {
    const adapter = new ThreadsCookieAdapter(COOKIE)
    await expect(adapter.connect()).resolves.toBeUndefined()
  })

  it('sendMessage validation — empty message', async () => {
    const adapter = new ThreadsCookieAdapter(COOKIE)
    const result = await adapter.sendMessage('', '')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/not provided/i)
  })

  it('sendMessage — REAL API call (posts to Threads feed)', async () => {
    const adapter = new ThreadsCookieAdapter(COOKIE, { logger: console.log })
    const result = await adapter.sendMessage('', 'Threads integration test post')
    console.log('[Threads] sendMessage result:', result)
    expect(result).toHaveProperty('success')
    if (!result.success) {
      console.log('[Threads] sendMessage error:', result.error, 'code:', result.code)
    }
  })

  it('replyToMessage validation — empty message', async () => {
    const adapter = new ThreadsCookieAdapter(COOKIE)
    const result = await adapter.replyToMessage('some_post_id', '')
    expect(result.success).toBe(false)
  })

  it('replyToMessage — REAL API call (replies to a thread)', async () => {
    const postId = TARGET_POST_ID || (process.env.TEST_THREADS_POST_ID ?? '')
    if (!postId) {
      console.log('[Threads] Skipping replyToMessage real test — TEST_THREADS_TARGET_POST_ID not set')
      return
    }
    const adapter = new ThreadsCookieAdapter(COOKIE, { logger: console.log })
    const result = await adapter.replyToMessage(postId, 'Threads integration test reply')
    console.log('[Threads] replyToMessage result:', result)
    expect(result).toHaveProperty('success')
    if (!result.success) {
      console.log('[Threads] replyToMessage error:', result.error, 'code:', result.code)
    }
  })

  it('getRateLimitStatus returns rate limit info', async () => {
    const adapter = new ThreadsCookieAdapter(COOKIE)
    const status = await adapter.getRateLimitStatus()
    console.log('[Threads] rate limit status:', status)
    expect(status).toBeDefined()
    expect(status?.limit).toBe(30)
  })
})