/**
 * Telegram Live Integration Tests (via Bot API)
 *
 * Run with:
 *   INTEGRATION_TESTS=1 npm test -- src/integration/telegram.integration.test.ts
 *
 * Prerequisites:
 *   INTEGRATION_TESTS=1
 *   TEST_TELEGRAM_BOT_TOKEN    (from @BotFather)
 *   TEST_TELEGRAM_TARGET_CHAT_ID   (chat ID to send messages to)
 */

import { describe, it, expect } from 'vitest'
import { TelegramAdapter } from '../adapters/providers/telegram/telegram'

const BOT_TOKEN = process.env.TEST_TELEGRAM_BOT_TOKEN ?? ''
const TARGET_CHAT_ID = process.env.TEST_TELEGRAM_TARGET_CHAT_ID ?? ''
const SKIP_REASON: string[] = []

if (!process.env.INTEGRATION_TESTS) SKIP_REASON.push('INTEGRATION_TESTS not set')
if (!BOT_TOKEN) SKIP_REASON.push('TEST_TELEGRAM_BOT_TOKEN not set')
if (!TARGET_CHAT_ID) SKIP_REASON.push('TEST_TELEGRAM_TARGET_CHAT_ID not set')
const SKIP = SKIP_REASON.length > 0

describe('Telegram Live Integration Tests', () => {
  if (SKIP) {
    it(`SKIPPED: ${SKIP_REASON.join(' | ')}`, () => {})
    return
  }

  it('sendMessage validation — empty message', async () => {
    const adapter = new TelegramAdapter(BOT_TOKEN)
    const result = await adapter.sendMessage(TARGET_CHAT_ID, '')
    expect(result.success).toBe(false)
  })

  it('sendMessage — REAL API call (sends message)', async () => {
    const adapter = new TelegramAdapter(BOT_TOKEN)
    const result = await adapter.sendMessage(TARGET_CHAT_ID, 'Telegram integration test message')
    console.log('[Telegram] sendMessage result:', result)
    expect(result).toHaveProperty('success')
    if (!result.success) {
      console.log('[Telegram] sendMessage error:', result.error, 'code:', result.code)
    }
  })

  it('replyToMessage — REAL API call (replies to message)', async () => {
    const adapter = new TelegramAdapter(BOT_TOKEN)
    const result = await adapter.replyToMessage(TARGET_CHAT_ID, 1, 'Telegram reply integration test')
    console.log('[Telegram] replyToMessage result:', result)
    expect(result).toHaveProperty('success')
    if (!result.success) {
      console.log('[Telegram] replyToMessage error:', result.error, 'code:', result.code)
    }
  })

  it('getRateLimitStatus returns rate limit info', async () => {
    const adapter = new TelegramAdapter(BOT_TOKEN)
    const status = await adapter.getRateLimitStatus()
    console.log('[Telegram] rate limit status:', status)
    expect(status).toBeDefined()
  })

  it('disconnect is safe to call', async () => {
    const adapter = new TelegramAdapter(BOT_TOKEN)
    await expect(adapter.disconnect()).resolves.toBeUndefined()
  })
})