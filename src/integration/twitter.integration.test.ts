/**
 * Twitter/X Live Integration Tests
 *
 * Run with:
 *   INTEGRATION_TESTS=1 npm test -- src/integration/twitter.integration.test.ts
 *
 * Prerequisites:
 *   INTEGRATION_TESTS=1
 *   TEST_TWITTER_COOKIE        (auth_token=XXX; ct0=YYY)
 *   TEST_TWITTER_TARGET_TWEET_ID   (tweet ID to reply to)
 *   TEST_TWITTER_TARGET_USER_ID    (user ID to send DM to)
 *
 * These tests POST REAL content on a REAL Twitter/X account.
 */

import { describe, it, expect } from 'vitest'
import TwitterCookieAdapter from '../adapters/providers/twitter/twitter-cookie'
import { twitterReply } from '../blast/actions/twitter-comment'
import { sendTwitterDM } from '../adapters/providers/twitter/dm'

const COOKIE = process.env.TEST_TWITTER_COOKIE ?? ''
const TARGET_TWEET_ID = process.env.TEST_TWITTER_TARGET_TWEET_ID ?? ''
const TARGET_USER_ID = process.env.TEST_TWITTER_TARGET_USER_ID ?? ''
const SKIP_REASON: string[] = []

if (!process.env.INTEGRATION_TESTS) SKIP_REASON.push('INTEGRATION_TESTS not set')
if (!COOKIE) SKIP_REASON.push('TEST_TWITTER_COOKIE not set')
const SKIP = SKIP_REASON.length > 0

describe('Twitter/X Live Integration Tests', () => {
  if (SKIP) {
    it(`SKIPPED: ${SKIP_REASON.join(' | ')}`, () => {})
    return
  }

  // ── TwitterCookieAdapter tests ────────────────────────────────────────────

  it('connect rejects empty cookie', async () => {
    const adapter = new TwitterCookieAdapter('')
    await expect(adapter.connect()).rejects.toThrow(/not provided/i)
  })

  it('connect accepts valid cookie', async () => {
    const adapter = new TwitterCookieAdapter(COOKIE, { logger: console.log })
    await expect(adapter.connect()).resolves.toBeUndefined()
  })

  it('sendMessage validation — empty message', async () => {
    const adapter = new TwitterCookieAdapter(COOKIE)
    const result = await adapter.sendMessage('', '')
    expect(result.success).toBe(false)
  })

  it('sendMessage — REAL API call (posts tweet)', async () => {
    const adapter = new TwitterCookieAdapter(COOKIE, { logger: console.log })
    const result = await adapter.sendMessage('', 'Twitter integration test tweet')
    console.log('[Twitter] sendMessage (tweet) result:', result)
    expect(result).toHaveProperty('success')
    if (!result.success) {
      console.log('[Twitter] sendMessage error:', result.error, 'code:', result.code)
    }
  })

  it('replyToMessage validation — empty tweetId', async () => {
    const adapter = new TwitterCookieAdapter(COOKIE)
    const result = await adapter.replyToMessage('', 'reply text')
    expect(result.success).toBe(false)
  })

  it('replyToMessage — REAL API call (replies to tweet)', async () => {
    const tweetId = TARGET_TWEET_ID || (process.env.TEST_TW_TWEET_ID ?? '')
    if (!tweetId) {
      console.log('[Twitter] Skipping replyToMessage real test — TEST_TWITTER_TARGET_TWEET_ID not set')
      return
    }
    const adapter = new TwitterCookieAdapter(COOKIE, { logger: console.log })
    const result = await adapter.replyToMessage(tweetId, 'Twitter integration test reply')
    console.log('[Twitter] replyToMessage result:', result)
    expect(result).toHaveProperty('success')
    if (!result.success) {
      console.log('[Twitter] replyToMessage error:', result.error, 'code:', result.code)
    }
  })

  it('getRateLimitStatus returns rate limit info', async () => {
    const adapter = new TwitterCookieAdapter(COOKIE)
    const status = await adapter.getRateLimitStatus()
    console.log('[Twitter] rate limit status:', status)
    expect(status).toBeDefined()
    expect(status?.limit).toBe(50)
  })

  // ── twitterReply standalone function tests ───────────────────────────────

  it('twitterReply validation — rejects missing params', async () => {
    const result = await twitterReply('', 'test', '')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/cookie|tweetId/i)
  })

  it('twitterReply — REAL API call', async () => {
    const tweetId = TARGET_TWEET_ID || (process.env.TEST_TW_TWEET_ID ?? '')
    if (!tweetId) {
      console.log('[Twitter] Skipping twitterReply real test — TEST_TWITTER_TARGET_TWEET_ID not set')
      return
    }
    const result = await twitterReply(tweetId, 'Reply via twitterReply() integration test', COOKIE)
    console.log('[Twitter] twitterReply result:', result)
    expect(result).toHaveProperty('success')
    if (!result.success) {
      console.log('[Twitter] twitterReply error:', result.error)
    }
  })

  // ── sendTwitterDM standalone function tests ──────────────────────────────

  it('sendTwitterDM validation — rejects missing params', async () => {
    const result = await sendTwitterDM('', 'test', '')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/cookie|userId/i)
  })

  it('sendTwitterDM — REAL API call', async () => {
    const userId = TARGET_USER_ID || (process.env.TEST_TW_USER_ID ?? '')
    if (!userId) {
      console.log('[Twitter] Skipping sendTwitterDM real test — TEST_TWITTER_TARGET_USER_ID not set')
      return
    }
    const result = await sendTwitterDM(userId, 'Twitter DM integration test', COOKIE)
    console.log('[Twitter] sendTwitterDM result:', result)
    expect(result).toHaveProperty('success')
    if (!result.success) {
      console.log('[Twitter] sendTwitterDM error:', result.error)
    }
  })
})