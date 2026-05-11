/**
 * Facebook Live Integration Tests
 *
 * Run with:
 *   INTEGRATION_TESTS=1 npm test -- src/integration/facebook.integration.test.ts
 *
 * Prerequisites:
 *   INTEGRATION_TESTS=1
 *   TEST_FACEBOOK_COOKIE     (c_user=XXX; xs=YYY; datr=ZZZ)
 *   TEST_FACEBOOK_TARGET_POST_ID  (public post to comment on)
 *   TEST_FACEBOOK_TARGET_USER_ID   (user to send DM to)
 *   TEST_FACEBOOK_SEARCH_QUERY     (search term for finder)
 *
 * These tests POST REAL content on REAL Facebook accounts.
 * Use test/dummy Facebook accounts only.
 */

import { describe, it, expect } from 'vitest'
import { postComment } from '../adapters/providers/meta/facebook/comment'
import { sendPrivateMessage } from '../adapters/providers/meta/facebook/chat'
import { findFacebookTargets } from '../adapters/providers/meta/facebook/facebook-finder'

const COOKIE = process.env.TEST_FACEBOOK_COOKIE ?? ''
const TARGET_POST_ID = process.env.TEST_FACEBOOK_TARGET_POST_ID ?? ''
const TARGET_USER_ID = process.env.TEST_FACEBOOK_TARGET_USER_ID ?? ''
const SEARCH_QUERY = process.env.TEST_FACEBOOK_SEARCH_QUERY ?? 'public posts'
const SKIP_REASON: string[] = []

if (!process.env.INTEGRATION_TESTS) SKIP_REASON.push('INTEGRATION_TESTS not set')
if (!COOKIE) SKIP_REASON.push('TEST_FACEBOOK_COOKIE not set')
const SKIP = SKIP_REASON.length > 0

describe('Facebook Live Integration Tests', () => {
  if (SKIP) {
    it(`SKIPPED: ${SKIP_REASON.join(' | ')}`, () => {})
    return
  }

  // ── Validation tests (no real HTTP calls) ─────────────────────────────────

  it('postComment rejects empty cookie', async () => {
    const result = await postComment(TARGET_POST_ID, 'test', '')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/cookie/i)
  })

  it('postComment rejects empty postId', async () => {
    const result = await postComment('', 'test', COOKIE)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/postId/i)
  })

  it('postComment rejects empty message', async () => {
    const result = await postComment(TARGET_POST_ID, '', COOKIE)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/message/i)
  })

  it('sendPrivateMessage rejects empty cookie', async () => {
    const result = await sendPrivateMessage(TARGET_USER_ID, 'test', '')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/cookie/i)
  })

  it('sendPrivateMessage rejects empty userId', async () => {
    const result = await sendPrivateMessage('', 'test', COOKIE)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/userId/i)
  })

  it('sendPrivateMessage rejects empty message', async () => {
    const result = await sendPrivateMessage(TARGET_USER_ID, '', COOKIE)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/message/i)
  })

  // ── Real API tests ─────────────────────────────────────────────────────────

  it('postComment — REAL API call to Facebook', async () => {
    const postId = TARGET_POST_ID || (process.env.TEST_FB_POST_ID ?? '')
    if (!postId) {
      console.log('[Facebook] Skipping postComment real test — TEST_FACEBOOK_TARGET_POST_ID not set')
      return
    }
    const result = await postComment(postId, 'Facebook integration test comment', COOKIE)
    console.log('[Facebook] postComment result:', result)
    expect(result).toHaveProperty('success')
    if (!result.success) {
      console.log('[Facebook] postComment error:', result.error)
    }
  })

  it('sendPrivateMessage — REAL API call to Messenger', async () => {
    const userId = TARGET_USER_ID || (process.env.TEST_FB_USER_ID ?? '')
    if (!userId) {
      console.log('[Facebook] Skipping sendPrivateMessage real test — TEST_FACEBOOK_TARGET_USER_ID not set')
      return
    }
    const result = await sendPrivateMessage(userId, 'Facebook DM integration test', COOKIE)
    console.log('[Facebook] sendPrivateMessage result:', result)
    expect(result).toHaveProperty('success')
    if (!result.success) {
      console.log('[Facebook] sendPrivateMessage error:', result.error)
    }
  })

  it('findFacebookTargets — REAL API call to Facebook search', async () => {
    const result = await findFacebookTargets(SEARCH_QUERY, COOKIE, 10)
    console.log('[Facebook] findFacebookTargets result:', {
      postIds: result.postIds.length,
      userIds: result.userIds.length,
    })
    expect(result).toHaveProperty('postIds')
    expect(result).toHaveProperty('userIds')
    expect(Array.isArray(result.postIds)).toBe(true)
    expect(Array.isArray(result.userIds)).toBe(true)
  })
})