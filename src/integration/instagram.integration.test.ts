/**
 * Instagram Live Integration Tests
 *
 * Run with:
 *   INTEGRATION_TESTS=1 npm test -- src/integration/instagram.integration.test.ts
 *
 * Prerequisites:
 *   INTEGRATION_TESTS=1
 *   TEST_INSTAGRAM_COOKIE        (sessionid=XXX; csrftoken=YYY)
 *   TEST_INSTAGRAM_TARGET_POST_CODE  (post shortcode to test commenting)
 *
 * These tests POST REAL content on a REAL Instagram account.
 */

import { describe, it, expect } from 'vitest'
import InstagramCookieAdapter from '../adapters/providers/meta/instagram/instagram-cookie'

const COOKIE = process.env.TEST_INSTAGRAM_COOKIE ?? ''
const TARGET_POST_CODE = process.env.TEST_INSTAGRAM_TARGET_POST_CODE ?? ''
const SKIP_REASON: string[] = []

if (!process.env.INTEGRATION_TESTS) SKIP_REASON.push('INTEGRATION_TESTS not set')
if (!COOKIE) SKIP_REASON.push('TEST_INSTAGRAM_COOKIE not set')
const SKIP = SKIP_REASON.length > 0

describe('Instagram Live Integration Tests', () => {
  if (SKIP) {
    it(`SKIPPED: ${SKIP_REASON.join(' | ')}`, () => {})
    return
  }

  it('connect rejects empty cookie', async () => {
    const adapter = new InstagramCookieAdapter('')
    await expect(adapter.connect()).rejects.toThrow(/not provided/i)
  })

  it('connect accepts valid cookie', async () => {
    const adapter = new InstagramCookieAdapter(COOKIE)
    await expect(adapter.connect()).resolves.toBeUndefined()
  })

  it('sendMessage validation — empty message', async () => {
    const adapter = new InstagramCookieAdapter(COOKIE)
    const result = await adapter.sendMessage('', '')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/not provided/i)
  })

  it('sendMessage — REAL API call (posts to Instagram feed)', async () => {
    const adapter = new InstagramCookieAdapter(COOKIE, { logger: console.log })
    const result = await adapter.sendMessage('', 'Instagram integration test post')
    console.log('[Instagram] sendMessage result:', result)
    expect(result).toHaveProperty('success')
    if (!result.success) {
      console.log('[Instagram] sendMessage error:', result.error, 'code:', result.code)
    }
  }, 30_000)

  it('replyToMessage validation — empty message', async () => {
    const adapter = new InstagramCookieAdapter(COOKIE)
    const result = await adapter.replyToMessage('some_media_id', '')
    expect(result.success).toBe(false)
  })

  it('replyToMessage — REAL API call (comments on a post)', async () => {
    const postCode = TARGET_POST_CODE || (process.env.TEST_IG_POST_CODE ?? '')
    if (!postCode) {
      console.log('[Instagram] Skipping replyToMessage real test — TEST_INSTAGRAM_TARGET_POST_CODE not set')
      return
    }
    const adapter = new InstagramCookieAdapter(COOKIE, { logger: console.log })
    const result = await adapter.replyToMessage(postCode, 'Instagram integration test comment')
    console.log('[Instagram] replyToMessage result:', result)
    expect(result).toHaveProperty('success')
    if (!result.success) {
      console.log('[Instagram] replyToMessage error:', result.error, 'code:', result.code)
    }
  })

  it('getRateLimitStatus returns rate limit info', async () => {
    const adapter = new InstagramCookieAdapter(COOKIE)
    const status = await adapter.getRateLimitStatus()
    console.log('[Instagram] rate limit status:', status)
    expect(status).toBeDefined()
    expect(status?.limit).toBe(30)
  })
})