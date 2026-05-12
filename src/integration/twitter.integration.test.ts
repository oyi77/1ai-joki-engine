import { describe, it, expect, beforeEach } from 'vitest'
import { TwitterCLIAdapter } from '../adapters/providers/twitter/twitter-cli-adapter'
import { twitterReply } from '../blast/actions/twitter-comment'
import { sendTwitterDM } from '../adapters/providers/twitter/dm'

const COOKIE_JSON = process.env.TEST_TWITTER_COOKIE_JSON ?? process.env.TEST_TWITTER_COOKIE ?? ''
const TARGET_TWEET_ID = process.env.TEST_TWITTER_TARGET_TWEET_ID ?? process.env.TEST_TW_TWEET_ID ?? ''
const TARGET_USER_ID = process.env.TEST_TWITTER_TARGET_USER_ID ?? process.env.TEST_TW_USER_ID ?? ''
const SKIP_REASON: string[] = []

if (!process.env.INTEGRATION_TESTS) SKIP_REASON.push('INTEGRATION_TESTS not set')
if (!COOKIE_JSON) SKIP_REASON.push('TEST_TWITTER_COOKIE_JSON not set')
const SKIP = SKIP_REASON.length > 0

describe('Twitter/X Live Integration Tests', () => {
  let adapter: TwitterCLIAdapter

  beforeEach(async () => {
    if (SKIP) return
    adapter = new TwitterCLIAdapter(COOKIE_JSON, { logger: console.log })
    await adapter.connect()
  })

  if (SKIP) {
    it(`SKIPPED: ${SKIP_REASON.join(' | ')}`, () => {})
    return
  }

  it('connect rejects empty cookie', async () => {
    const empty = new TwitterCLIAdapter('')
    await expect(empty.connect()).rejects.toThrow()
  })

  it('connect accepts valid cookie', async () => {
    const fresh = new TwitterCLIAdapter(COOKIE_JSON)
    await expect(fresh.connect()).resolves.toBeUndefined()
  })

  it('sendMessage validation — empty message', async () => {
    const result = await adapter.sendMessage('', '')
    expect(result.success).toBe(false)
  })

  it('sendMessage — posts tweet', async () => {
    const result = await adapter.sendMessage('', 'Twitter CLI integration test')
    console.log('[Twitter] sendMessage result:', result)
    expect(result).toHaveProperty('success')
    if (!result.success) console.log('[Twitter] sendMessage error:', result.error, 'code:', result.code)
  })

  it('replyToMessage validation — empty tweetId', async () => {
    const result = await adapter.replyToMessage('', 'reply text')
    expect(result.success).toBe(false)
  })

  it('replyToMessage — replies to tweet', async () => {
    if (!TARGET_TWEET_ID) {
      console.log('[Twitter] Skipping — TEST_TWITTER_TARGET_TWEET_ID not set')
      return
    }
    const result = await adapter.replyToMessage(TARGET_TWEET_ID, 'Twitter CLI reply test')
    console.log('[Twitter] replyToMessage result:', result)
    expect(result).toHaveProperty('success')
    if (!result.success) console.log('[Twitter] replyToMessage error:', result.error, 'code:', result.code)
  })

  it('getRateLimitStatus returns null', async () => {
    const status = await adapter.getRateLimitStatus()
    expect(status).toBeNull()
  })

  it('twitterReply validation', async () => {
    const result = await twitterReply('', 'test', '')
    expect(result.success).toBe(false)
  })

  it('twitterReply — blast action', async () => {
    if (!TARGET_TWEET_ID) {
      console.log('[Twitter] Skipping — TEST_TWITTER_TARGET_TWEET_ID not set')
      return
    }
    const result = await twitterReply(TARGET_TWEET_ID, 'Blast action reply via CLI', COOKIE_JSON)
    console.log('[Twitter] twitterReply result:', result)
    expect(result).toHaveProperty('success')
    if (!result.success) console.log('[Twitter] twitterReply error:', result.error)
  })

  it('sendTwitterDM validation', async () => {
    const result = await sendTwitterDM('', 'test', '')
    expect(result.success).toBe(false)
  })

  it('sendTwitterDM — sends DM', async () => {
    if (!TARGET_USER_ID) {
      console.log('[Twitter] Skipping sendTwitterDM — TEST_TWITTER_TARGET_USER_ID not set')
      return
    }
    const result = await sendTwitterDM(TARGET_USER_ID, 'Twitter DM via CLI test', COOKIE_JSON)
    console.log('[Twitter] sendTwitterDM result:', result)
    expect(result).toHaveProperty('success')
    if (!result.success) console.log('[Twitter] sendTwitterDM error:', result.error)
  })
})
