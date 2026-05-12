/**
 * Test Instagram comment and post creation via fetch (bypasses axios redirect issue)
 * Run: node scripts/test-ig-comment.mjs
 */

import { readFileSync } from 'fs'

const cookieJsonPath = '/tmp/instagram_cookies.json'
const content = readFileSync(cookieJsonPath, 'utf-8')
const arr = JSON.parse(content)
const cookieString = arr.map((c) => `${c.name}=${c.value}`).join('; ')
const csrfMatch = cookieString.match(/csrftoken=([^;]+)/)
const csrfToken = csrfMatch?.[1] ?? ''
const sessionId = (cookieString.match(/sessionid=([^;]+)/) || ['', ''])[1]

// Instagram mobile web UA
const IG_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 303.0.0.11.109'
// Instagram Android UA
const IG_ANDROID_UA = 'Instagram 303.0.0.11.109 Android (27/8.1.0; 480dpi; 1080x1920; samsung; SM-G9550; heroqlte; en_US; 511506453)'

async function testEndpoint(label, method, url, body, extraHeaders = {}) {
  try {
    const headers = {
      Cookie: cookieString,
      'X-CSRFToken': csrfToken,
      'X-IG-App-ID': '936619743392459',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': IG_UA,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.instagram.com/',
      ...extraHeaders,
    }
    const res = await fetch(url, {
      method,
      headers,
      body,
      redirect: 'manual',
    })
    const text = await res.text()
    const location = res.headers.get('location') || ''
    let data
    try { data = JSON.parse(text) } catch { data = text.slice(0, 300) }
    console.log(`\n[${label}] ${method} ${url} → ${res.status} ${res.statusText}`)
    if (location) console.log('  Location:', location)
    console.log('  Body:', JSON.stringify(data, null, 2).slice(0, 400))
    return res
  } catch (e) {
    console.error(`[${label}] ERROR:`, e.message)
    return null
  }
}

async function testFollowRedirects(label, method, url, body, extraHeaders = {}) {
  let currentUrl = url
  let redirects = []
  try {
    for (let i = 0; i < 5; i++) {
      const headers = {
        Cookie: cookieString,
        'X-CSRFToken': csrfToken,
        'X-IG-App-ID': '936619743392459',
        'User-Agent': IG_UA,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.instagram.com/',
        ...extraHeaders,
      }
      const res = await fetch(currentUrl, {
        method,
        headers,
        body,
        redirect: 'manual',
      })
      const location = res.headers.get('location') || ''
      const text = await res.text()
      console.log(`\n[${label}] Step ${i+1}: ${currentUrl} → ${res.status} ${res.statusText}`)
      if (location) console.log('  Location:', location)
      else console.log('  Body:', text.slice(0, 200))
      if (!location) break
      redirects.push(`${res.status} → ${location}`)
      currentUrl = location.startsWith('/') ? `https://www.instagram.com${location}` : location
      body = null // Don't repeat body on GET after redirect
    }
  } catch (e) {
    console.error(`[${label}] ERROR:`, e.message)
  }
}

async function run() {
  console.log('=== Testing Instagram API Endpoints ===')
  console.log('Session ID:', sessionId.slice(0, 30) + '...')
  console.log('CSRF:', csrfToken)

  // 1. Verify cookie works on current_user
  await testEndpoint(
    'current_user',
    'GET',
    'https://www.instagram.com/api/v1/accounts/current_user/?edit=true',
    null
  )

  // 2. Try hashtag with Android UA
  await testEndpoint(
    'hashtag_android',
    'GET',
    'https://www.instagram.com/api/v1/tags/ai/sections/',
    null,
    { 'User-Agent': IG_ANDROID_UA }
  )

  // 3. Follow the login redirect
  await testFollowRedirects(
    'follow_login_redirect',
    'GET',
    'https://www.instagram.com/api/v1/tags/ai/sections/',
    null
  )

  // 4. Try Android UA comment
  const mediaId = '3471267988936569488'
  await testEndpoint(
    'comment_android',
    'POST',
    `https://www.instagram.com/api/v1/media/${mediaId}/comment/`,
    'comment_text=Test+from+blast+engine',
    { 'User-Agent': IG_ANDROID_UA }
  )

  // 5. Try with additional headers
  await testEndpoint(
    'current_user_extra',
    'GET',
    'https://www.instagram.com/api/v1/accounts/current_user/?edit=true',
    null,
    {
      'X-IG-World': '1',
      'X-IG-Device-ID': 'test-device-' + Date.now(),
      'X-IG-Connection-Type': 'WIFI',
    }
  )
}

run()