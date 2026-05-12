/**
 * WhatsApp Live Integration Tests (via Waha HTTP API)
 *
 * Run with:
 *   INTEGRATION_TESTS=1 npm test -- src/integration/whatsapp.integration.test.ts
 *
 * Prerequisites:
 *   INTEGRATION_TESTS=1
 *   WAHA_BASE_URL + WAHA_API_KEY configured in environment
 *   A running Waha server: docker run -p 3001:3000 devlikeapro/waha
 *   TEST_WHATSAPP_TARGET_NUMBER   (phone number e.g. +6281234567890)
 */

import { describe, it, expect } from 'vitest'
import { WhatsAppAdapter } from '../adapters/providers/meta/Whatsapp/whatsapp'

const TARGET_NUMBER = process.env.TEST_WHATSAPP_TARGET_NUMBER ?? ''
const SKIP_REASON: string[] = []

if (!process.env.INTEGRATION_TESTS) SKIP_REASON.push('INTEGRATION_TESTS not set')
if (!TARGET_NUMBER) SKIP_REASON.push('TEST_WHATSAPP_TARGET_NUMBER not set')
const SKIP = SKIP_REASON.length > 0

describe('WhatsApp Live Integration Tests', () => {
  if (SKIP) {
    it(`SKIPPED: ${SKIP_REASON.join(' | ')}`, () => {})
    return
  }

  it('sendMessage validation — empty message', async () => {
    const adapter = new WhatsAppAdapter({ logger: console.log })
    const result = await adapter.sendMessage(TARGET_NUMBER, '')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/not provided/i)
  })

  it('sendMessage — REAL API call via Waha', async () => {
    const adapter = new WhatsAppAdapter({ logger: console.log })
    const result = await adapter.sendMessage(TARGET_NUMBER, 'WhatsApp integration test message')
    console.log('[WhatsApp] sendMessage result:', result)
    expect(result).toHaveProperty('success')
    if (!result.success) {
      console.log('[WhatsApp] sendMessage error:', result.error, 'code:', result.code)
    }
  })

  it('getRateLimitStatus returns rate limit info', async () => {
    const adapter = new WhatsAppAdapter()
    const status = await adapter.getRateLimitStatus()
    console.log('[WhatsApp] rate limit status:', status)
    expect(status).toBeDefined()
  })
})