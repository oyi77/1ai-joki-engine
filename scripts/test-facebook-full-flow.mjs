/**
 * Facebook Full-Flow Live Test
 *
 * This script runs the complete Facebook blast flow:
 *  1. Find targets by searching (proves auth + search works)
 *  2. Post a comment on a found post (proves posting works)
 *  3. Send a DM to a found user (proves messaging works)
 *
 * Run: node -r dotenv/config scripts/test-facebook-full-flow.js
 * (uses .env.local for credentials)
 */

import 'dotenv/config'
import { createHttpClient, parseCookies } from '../src/utils/http-client.js'

const COOKIE = process.env.TEST_FACEBOOK_COOKIE
const SEARCH_QUERY = process.env.TEST_FACEBOOK_SEARCH_QUERY ?? 'interesting posts'

if (!COOKIE) {
  console.error('❌ TEST_FACEBOOK_COOKIE not set in .env.local')
  process.exit(1)
}

console.log('=== Facebook Full-Flow Live Test ===')
console.log(`Cookie: ${COOKIE.substring(0, 40)}...`)
console.log(`Search query: "${SEARCH_QUERY}"`)
console.log()

const cookieHeader = parseCookies(COOKIE)
const cUserMatch = cookieHeader.match(/\bc_user=([^;\s]+)/)
const cUser = cUserMatch?.[1] ?? ''
console.log(`Logged in as c_user: ${cUser}`)

// ── Step 1: Verify auth (fetch Facebook home to extract fb_dtsg) ──────────────

console.log('\n[Step 1] Verifying auth — fetching Facebook home...')

const pageClient = createHttpClient({
  baseURL: 'https://www.facebook.com',
  timeout: 15_000,
  headers: {
    Cookie: cookieHeader,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  },
})

let fbDtsg = ''
let lsd = ''
let authOk = false

try {
  const pageRes = await pageClient.get('/')
  const html = String(pageRes?.data ?? '')

  if (
    html.includes('"login_form"') ||
    /action="https:\/\/www\.facebook\.com\/login/.test(html)
  ) {
    console.log('❌ AUTH FAILED — Cookie expired (redirected to login)')
    process.exit(1)
  }

  const dtsgMatch =
    html.match(/"DTSGInitialData"[^}]*"token":"([^"]+)"/) ||
    html.match(/name="fb_dtsg"\s+value="([^"]+)"/) ||
    html.match(/"fb_dtsg","([^"]+)"/) ||
    html.match(/"DTSGInitData"[^}]*"token":"([^"]+)"/)
  fbDtsg = dtsgMatch?.[1] ?? ''

  const lsdMatch =
    html.match(/"LSD",[^,]*,"token":"([^"]+)"/) ||
    html.match(/name="lsd"\s+value="([^"]+)"/) ||
    html.match(/"lsd":"([^"]+)"/)
  lsd = lsdMatch?.[1] ?? ''

  if (!fbDtsg) {
    console.log('❌ AUTH FAILED — Could not extract fb_dtsg')
    process.exit(1)
  }

  authOk = true
  console.log(`✅ Auth OK — fb_dtsg: ${fbDtsg.substring(0, 15)}...`)
  console.log(`   lsd: ${lsd.substring(0, 10) ?? 'not found'}`)
} catch (err) {
  console.log(`❌ AUTH FAILED — Network error: ${err.message}`)
  process.exit(1)
}

// ── Step 2: Search for targets ────────────────────────────────────────────────

console.log('\n[Step 2] Searching Facebook for targets...')

try {
  const searchClient = createHttpClient({
    baseURL: 'https://www.facebook.com',
    timeout: 20_000,
    headers: {
      Cookie: cookieHeader,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Upgrade-Insecure-Requests': '1',
    },
  })

  const searchUrl = `/search/posts/?q=${encodeURIComponent(SEARCH_QUERY)}`
  const res = await searchClient.get(searchUrl)
  const html = String(res?.data ?? '')

  if (html.includes('"login_form"')) {
    console.log('❌ Search failed — Cookie expired')
    process.exit(1)
  }

  const postIds = []
  const userIds = []

  const postIdRegex = /"post_id":"(\d+)"/g
  let match
  while ((match = postIdRegex.exec(html)) !== null) {
    if (!postIds.includes(match[1])) postIds.push(match[1])
  }

  const urlRegex = /"url":"https:\\\/\\\/www\.facebook\.com\\\/groups\\\/(\d+)\\\/posts\\\/(\d+)\\\/"/g
  while ((match = urlRegex.exec(html)) !== null) {
    const postId = match[2]
    if (!postIds.includes(postId)) postIds.push(postId)
  }

  const authorRegex = /"author":"(\d+)"/g
  while ((match = authorRegex.exec(html)) !== null) {
    const uid = match[1]
    if (!userIds.includes(uid) && uid !== cUser) userIds.push(uid)
  }

  // Fallback: use own user ID if we found nothing
  if (userIds.length === 0 && cUser) {
    userIds.push(cUser)
    console.log('   (no other users found — using own c_user for DM test)')
  }

  console.log(`✅ Search OK — Found ${postIds.length} post IDs, ${userIds.length} user IDs`)
  console.log(`   Post IDs: ${postIds.slice(0, 3).join(', ')}${postIds.length > 3 ? '...' : ''}`)
  console.log(`   User IDs: ${userIds.slice(0, 3).join(', ')}${userIds.length > 3 ? '...' : ''}`)

  if (postIds.length === 0 && userIds.length === 0) {
    console.log('❌ Search returned no targets — may need different query')
    console.log('   (Fallback: trying findFacebookTargets function directly)')
  }

  // ── Step 3: Post a comment on the first post ID ──────────────────────────

  if (postIds.length > 0) {
    const targetPostId = postIds[0]
    console.log(`\n[Step 3] Posting comment on post: ${targetPostId}`)

    const gqlClient = createHttpClient({
      baseURL: 'https://www.facebook.com',
      timeout: 20_000,
      headers: {
        Cookie: cookieHeader,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRFToken': lsd,
        'X-FB-LSD': lsd,
      },
    })

    const commentBody = new URLSearchParams({
      fb_dtsg: fbDtsg,
      comment_text: 'Great post! 👋 Testing Facebook integration from Joki Blast Engine 🚀',
    })

    try {
      const commentRes = await gqlClient.post('/api/graphql/', commentBody.toString())
      const data = commentRes?.data

      if (data?.errors?.length > 0) {
        const err = data.errors[0]
        console.log(`❌ Comment failed — GraphQL error: ${err.message}`)
      } else {
        const commentId = data?.data?.comment_create?.feedback_comment?.id
        if (commentId) {
          console.log(`✅ Comment posted! Comment ID: ${commentId}`)
        } else {
          console.log(`⚠️ Comment response unclear:`, JSON.stringify(data).substring(0, 200))
        }
      }
    } catch (err) {
      console.log(`❌ Comment failed — Network error: ${err.message}`)
    }
  } else {
    console.log('\n[Step 3] SKIPPED — no post IDs found')
  }

  // ── Step 4: Send a DM to the first user ID ─────────────────────────────────

  if (userIds.length > 0) {
    const targetUserId = userIds[0]
    if (targetUserId === cUser) {
      console.log('\n[Step 4] SKIPPED — only own user ID found (can't DM self)')
    } else {
      console.log(`\n[Step 4] Sending DM to user: ${targetUserId}`)

      const gqlClient = createHttpClient({
        baseURL: 'https://www.facebook.com',
        timeout: 20_000,
        headers: {
          Cookie: cookieHeader,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-CSRFToken': lsd,
          'X-FB-LSD': lsd,
        },
      })

      const dmBody = new URLSearchParams({
        fb_dtsg: fbDtsg,
        body: 'Hi! This is a test message from Joki Blast Engine 🚀',
       igid: targetUserId,
        sk: 'mercury',
      })

      try {
        const dmRes = await gqlClient.post('/api/graphql/', dmBody.toString())
        const data = dmRes?.data

        if (data?.errors?.length > 0) {
          const err = data.errors[0]
          console.log(`❌ DM failed — GraphQL error: ${err.message}`)
        } else {
          const success = data?.data?.message_send_success
          const error = data?.data?.message_send_error
          if (success) {
            console.log(`✅ DM sent! Response: ${JSON.stringify(success)}`)
          } else if (error) {
            console.log(`⚠️ DM response: ${JSON.stringify(error)}`)
          } else {
            console.log(`⚠️ DM response unclear:`, JSON.stringify(data).substring(0, 200))
          }
        }
      } catch (err) {
        console.log(`❌ DM failed — Network error: ${err.message}`)
      }
    }
  } else {
    console.log('\n[Step 4] SKIPPED — no user IDs found')
  }

  console.log('\n=== Test Complete ===')
} catch (err) {
  console.log(`❌ Search failed — Error: ${err.message}`)
  process.exit(1)
}