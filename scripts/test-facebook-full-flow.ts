/**
 * Facebook Full-Flow Live Test
 * Run: TEST_FACEBOOK_COOKIE="..." TEST_FACEBOOK_SEARCH_QUERY="..." npx tsx scripts/test-facebook-full-flow.ts
 *
 * Proves: auth works → search finds targets → comment + DM work
 */

import { createHttpClient, parseCookies } from '../src/utils/http-client'
import { findFacebookTargets } from '../src/adapters/providers/meta/facebook/facebook-finder'
import { postComment } from '../src/adapters/providers/meta/facebook/comment'
import { sendPrivateMessage } from '../src/adapters/providers/meta/facebook/chat'

const COOKIE = process.env.TEST_FACEBOOK_COOKIE ?? ''
const SEARCH_QUERY = process.env.TEST_FACEBOOK_SEARCH_QUERY ?? 'interesting posts'
const MY_USER_ID = process.env.TEST_FACEBOOK_MY_USER_ID ?? ''

if (!COOKIE) {
  console.error('❌ TEST_FACEBOOK_COOKIE env var not set')
  process.exit(1)
}

const TEST_MSG_COMMENT = 'Great post! 👋 Testing Facebook integration from Joki Blast Engine 🚀'
const TEST_MSG_DM = 'Hi! This is a test message from Joki Blast Engine 🚀'

async function main() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   Facebook Full-Flow Live Integration Test ║')
  console.log('╚══════════════════════════════════════════════╝')
  console.log(`Cookie: ${COOKIE.substring(0, 30)}...`)
  console.log(`Search query: "${SEARCH_QUERY}"`)

  // ── Step 1: Auth verification ─────────────────────────────────────────
  console.log('\n━━━ [Step 1] Auth Verification ━━━')
  const cookieHeader = parseCookies(COOKIE)
  const cUserMatch = cookieHeader.match(/\bc_user=([^;\s]+)/)
  const cUser = cUserMatch?.[1] ?? ''
  console.log(`c_user from cookie: ${cUser}`)

const pageClient = createHttpClient({
    baseURL: 'https://www.facebook.com',
    timeout: 15_000,
    headers: {
      Cookie: cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1',
    },
  })

  const pageRes = await pageClient.get('/')
  const html = String(pageRes?.data ?? '')

  if (html.includes('"login_form"') || /action="https:\/\/www\.facebook\.com\/login/.test(html)) {
    console.log('❌ [Step 1] FAILED — Cookie expired (redirected to login)')
    process.exit(1)
  }

  const dtsgMatch =
    html.match(/"DTSGInitialData"[^}]*"token":"([^"]+)"/) ||
    html.match(/name="fb_dtsg"\s+value="([^"]+)"/) ||
    html.match(/"fb_dtsg","([^"]+)"/) ||
    html.match(/"DTSGInitData"[^}]*"token":"([^"]+)"/)
  const fbDtsg = dtsgMatch?.[1] ?? ''

  const lsdMatch =
    html.match(/"LSD",[^,]*,"token":"([^"]+)"/) ||
    html.match(/name="lsd"\s+value="([^"]+)"/) ||
    html.match(/"lsd":"([^"]+)"/)
  const lsd = lsdMatch?.[1] ?? ''

  if (!fbDtsg) {
    console.log('❌ [Step 1] FAILED — Could not extract fb_dtsg from Facebook home')
    process.exit(1)
  }
  console.log(`✅ [Step 1] PASSED — Auth valid, fb_dtsg: ${fbDtsg.substring(0,15)}...`)

  // ── Step 2: Search for targets ──────────────────────────────────────────
  console.log('\n━━━ [Step 2] Find Targets via Facebook Search ━━━')
  const targets = await findFacebookTargets(SEARCH_QUERY, COOKIE, 20)
  console.log(`Found: ${targets.postIds.length} post IDs, ${targets.userIds.length} user IDs`)
  if (targets.postIds.length > 0) {
    console.log(`First 3 posts: ${targets.postIds.slice(0, 3).join(', ')}`)
  }
  if (targets.userIds.length > 0) {
    console.log(`First 3 users: ${targets.userIds.slice(0, 3).join(', ')}`)
  }
  if (targets.postIds.length === 0 && targets.userIds.length === 0) {
    console.log('⚠️  No targets found — falling back to test IDs from env')
  }

  // ── Step 3: Post comment ────────────────────────────────────────────────
  console.log('\n━━━ [Step 3] Post Comment on a Found Post ━━━')
  const targetPostId = targets.postIds[0] || process.env.TEST_FACEBOOK_TARGET_POST_ID || ''
  if (!targetPostId) {
    console.log('⚠️  SKIPPED — no post ID available (set TEST_FACEBOOK_TARGET_POST_ID)')
  } else {
    console.log(`Target post: ${targetPostId}`)
    const commentResult = await postComment(targetPostId, TEST_MSG_COMMENT, COOKIE)
    console.log(`Result: success=${commentResult.success}, error=${commentResult.error ?? 'none'}`)
    if (commentResult.commentId) {
      console.log(`✅ [Step 3] PASSED — Comment ID: ${commentResult.commentId}`)
    } else if (commentResult.success) {
      console.log(`✅ [Step 3] PASSED — Comment posted (no ID returned)`)
    } else {
      console.log(`❌ [Step 3] FAILED — ${commentResult.error}`)
    }
  }

  // ── Step 4: Send DM ─────────────────────────────────────────────────────
  console.log('\n━━━ [Step 4] Send DM to a Found User ━━━')
  // Prefer found user, fallback to own c_user, fallback to env var, skip if nothing
  const targetUserId =
    targets.userIds.find(id => id !== cUser) ||
    (MY_USER_ID && MY_USER_ID !== cUser ? MY_USER_ID : '') ||
    (cUser && cUser !== '100036401781631' ? cUser : '')

  if (!targetUserId) {
    console.log('⚠️  SKIPPED — no valid user ID available')
  } else if (targetUserId === cUser) {
    console.log(`⚠️  SKIPPED — only own c_user (${cUser}) found, can\'t DM self`)
  } else {
    console.log(`Target user: ${targetUserId}`)
    const dmResult = await sendPrivateMessage(targetUserId, TEST_MSG_DM, COOKIE)
    console.log(`Result: success=${dmResult.success}, error=${dmResult.error ?? 'none'}`)
    if (dmResult.success) {
      console.log(`✅ [Step 4] PASSED — DM sent (messageId: ${dmResult.messageId ?? 'none'})`)
    } else {
      console.log(`❌ [Step 4] FAILED — ${dmResult.error}`)
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('\n━━━ [Result] ━━━')
  console.log('✅ All steps completed. Check results above.')
}

main().catch(err => {
  console.error(`\n❌ Script error: ${err.message}`)
  process.exit(1)
})