/**
 * Instagram + Threads API testing — no Sec-Fetch headers, proper cookie format
 * Run: node scripts/test-ig-v2.mjs
 */

import { readFileSync } from 'fs'

const cookieJsonPath = '/tmp/instagram_cookies.json'
const content = readFileSync(cookieJsonPath, 'utf-8')
const arr = JSON.parse(content)

const cookieString = arr.map((c) => {
  return `${decodeURIComponent(c.name)}=${decodeURIComponent(c.value)}`
}).join('; ')

const csrfMatch = cookieString.match(/csrftoken=([^;]+)/)
const csrfToken = csrfMatch?.[1] ?? ''

// Android app UA
const IG_APP_UA = 'Instagram 303.0.0.11.109 Android (27/8.1.0; 480dpi; 1080x1920; samsung; SM-G9550; heroqlte; en_US; 511506453)'
const APP_ID = '303070000'

async function apiCall(label, method, base, path, bodyParams = null) {
  const url = `${base}${path}`
  const headers = {
    'User-Agent': IG_APP_UA,
    'Cookie': cookieString,
    'X-CSRFToken': csrfToken,
    'X-IG-App-ID': APP_ID,
    'X-IG-Connection-Type': 'WIFI',
    'Accept': '*/*',
    'Accept-Language': 'en-US',
    'Content-Type': bodyParams ? 'application/x-www-form-urlencoded' : 'text/plain',
    'Referer': base + '/',
    'Origin': base,
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: bodyParams ? new URLSearchParams(bodyParams).toString() : null,
      redirect: 'manual',
    })
    const text = await res.text()
    const location = res.headers.get('location') || ''
    console.log(`\n[${label}] ${method} ${path} → ${res.status}`)
    if (location) console.log('  Location:', location)
    try {
      const json = JSON.parse(text)
      console.log('  JSON:', JSON.stringify(json, null, 2).slice(0, 500))
    } catch {
      console.log('  Text:', text.slice(0, 300))
    }
    return res
  } catch (e) {
    console.error(`[${label}] ERROR:`, e.message)
    return null
  }
}

async function run() {
  console.log('=== Instagram v2 API Tests ===')
  console.log('CSRF:', csrfToken.slice(0, 20) + '...')
  console.log('Cookies:', cookieString.slice(0, 60) + '...')

  // 1. Try comment with minimal body
  await apiCall(
    'comment_minimal',
    'POST',
    'https://i.instagram.com',
    '/api/v1/media/3471267988936569488/comment/',
    { comment_text: 'Test' }
  )

  // 2. Try with source_url
  await apiCall(
    'comment_with_source',
    'POST',
    'https://i.instagram.com',
    '/api/v1/media/3471267988936569488/comment/',
    {
      comment_text: 'Test comment',
      radio_type: 'wifi-none',
    }
  )

  // 3. Try without CSRF for comment
  const headersNoCsrf = {
    'User-Agent': IG_APP_UA,
    'Cookie': cookieString,
    'X-IG-App-ID': APP_ID,
    'X-IG-Connection-Type': 'WIFI',
    'Accept': '*/*',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Referer': 'https://i.instagram.com/',
    'Origin': 'https://i.instagram.com',
  }
  try {
    const body = new URLSearchParams({ comment_text: 'Test no CSRF' }).toString()
    const res = await fetch('https://i.instagram.com/api/v1/media/3471267988936569488/comment/', {
      method: 'POST',
      headers: headersNoCsrf,
      body,
      redirect: 'manual',
    })
    const text = await res.text()
    console.log(`\n[comment_no_csrf] POST /api/v1/media/3471267988936569488/comment/ → ${res.status}`)
    try {
      const json = JSON.parse(text)
      console.log('  JSON:', JSON.stringify(json, null, 2).slice(0, 500))
    } catch {
      console.log('  Text:', text.slice(0, 300))
    }
  } catch (e) {
    console.error('[comment_no_csrf] ERROR:', e.message)
  }

  // 4. Try Threads post on i.instagram.com (Threads uses same API)
  await apiCall(
    'threads_post',
    'POST',
    'https://i.instagram.com',
    '/api/v1/media/configure_text_post_app_feed/',
    {
      text_post_app_info: JSON.stringify({ reply_control: 0 }),
      source_type: '4',
      caption: 'Test Threads post',
      upload_id: Date.now().toString(),
    }
  )

  // 5. Try finding a real post via hashtag using i.instagram.com
  await apiCall(
    'hashtag_search',
    'GET',
    'https://i.instagram.com',
    '/api/v1/tags/ai/sections/',
    null
  )

  // 6. Try www.instagram.com for comment (public endpoint, might work differently)
  await apiCall(
    'comment_web',
    'POST',
    'https://www.instagram.com',
    '/api/v1/media/3471267988936569488/comment/',
    {
      comment_text: 'Test comment from web',
      source_type: '5',
    }
  )

  // 7. Try with proper reply_to_parent_id for comment
  await apiCall(
    'comment_reply',
    'POST',
    'https://www.instagram.com',
    '/api/v1/media/3471267988936569488/comment/',
    {
      comment_text: 'Test reply',
      reply_to_comment_id: '123',
    }
  )

  // 8. Try create media without upload_id
  await apiCall(
    'create_text_post',
    'POST',
    'https://www.instagram.com',
    '/api/v1/media/creations/configure/',
    {
      caption: 'Test post creation',
    }
  )
}

run()