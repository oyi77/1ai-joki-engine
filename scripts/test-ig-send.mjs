/**
 * Instagram sendMessage / comment — test with properly decoded cookies
 * and correct Instagram mobile app request format.
 *
 * Run: node scripts/test-ig-send.mjs
 */

import { readFileSync } from 'fs'

const cookieJsonPath = '/tmp/instagram_cookies.json'
const content = readFileSync(cookieJsonPath, 'utf-8')
const arr = JSON.parse(content)

// Properly decode cookie values (Instagram sends decoded values)
const cookieString = arr.map((c) => {
  const name = decodeURIComponent(c.name)
  const value = decodeURIComponent(c.value)
  return `${name}=${value}`
}).join('; ')

const csrfMatch = cookieString.match(/csrftoken=([^;]+)/)
const csrfToken = csrfMatch?.[1] ?? ''

// Android app UA (same format as Instagram app)
const IG_APP_UA = 'Instagram 303.0.0.11.109 Android (27/8.1.0; 480dpi; 1080x1920; samsung; SM-G9550; heroqlte; en_US; 511506453)'

const APP_ID = '303070000'       // Instagram app ID
const DEVICE_ID = 'ig-' + Math.random().toString(36).slice(2, 18)

async function apiCall(label, method, path, bodyParams = null) {
  const url = `https://i.instagram.com/api/v1/${path.replace(/^\//, '')}`
  const headers = {
    'User-Agent': IG_APP_UA,
    'Cookie': cookieString,
    'X-CSRFToken': csrfToken,
    'X-IG-Connection-Type': 'WIFI',
    'X-IG-App-ID': APP_ID,
    'X-IG-Device-ID': DEVICE_ID,
    'Accept': '*/*',
    'Accept-Language': 'en-US',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': bodyParams ? 'application/x-www-form-urlencoded' : 'text/plain',
    'Referer': 'https://i.instagram.com/',
    'Origin': 'https://i.instagram.com',
  }
  const body = bodyParams
    ? new URLSearchParams(bodyParams).toString()
    : null

  try {
    const res = await fetch(url, { method, headers, body, redirect: 'manual' })
    const text = await res.text()
    const location = res.headers.get('location') || ''
    console.log(`\n[${label}] ${method} ${path} → ${res.status}`)
    if (location) console.log('  → Redirect to:', location)
    try {
      const json = JSON.parse(text)
      console.log('  JSON:', JSON.stringify(json, null, 2).slice(0, 500))
    } catch {
      console.log('  Text:', text.slice(0, 200))
    }
    return res
  } catch (e) {
    console.error(`[${label}] ERROR:`, e.message)
    return null
  }
}

async function run() {
  console.log('=== Instagram API (i.instagram.com) Tests ===')
  console.log('CSRF:', csrfToken.slice(0, 20) + '...')

  // 1. Login check
  await apiCall('login_status', 'GET', 'accounts/current_user/?edit=true')

  // 2. Comment on a post (no media ID needed for this endpoint)
  await apiCall('comment_test', 'POST', 'media/3471267988936569488/comment/', {
    'comment_text': 'Test comment from blast engine',
  })

  // 3. Try post creation (no upload_id, just text post)
  await apiCall('create_post', 'POST', 'media/configure_text_post_reshare/', {
    'caption': 'Test post from blast engine',
    'upload_id': Date.now().toString(),
  })

  // 4. Try the legacy configure
  await apiCall('configure_legacy', 'POST', 'media/configure/', {
    'caption': 'Test post from blast engine',
    'media_type': '1',
    'upload_id': Date.now().toString(),
  })

  // 5. Test Threads API
  const threadsHeaders = {
    'User-Agent': 'Instagram 303.0.0.11.109 Android (27/8.1.0; 480dpi; 1080x1920; samsung; SM-G9550; heroqlte; en_US; 511506453)',
    'Cookie': cookieString,
    'X-CSRFToken': csrfToken,
    'X-IG-App-ID': '238260118697367',
    'Accept': '*/*',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Referer': 'https://threads.net/',
    'Origin': 'https://threads.net',
  }
  try {
    const res = await fetch('https://i.instagram.com/api/v1/threadsThreadsHttpApplicationDocument/threads/', {
      method: 'GET',
      headers: threadsHeaders,
      redirect: 'manual',
    })
    const text = await res.text()
    console.log(`\n[threads_test] GET threads → ${res.status}`)
    try {
      const json = JSON.parse(text)
      console.log('  JSON:', JSON.stringify(json, null, 2).slice(0, 300))
    } catch {
      console.log('  Text:', text.slice(0, 200))
    }
  } catch (e) {
    console.error('[threads_test] ERROR:', e.message)
  }

  // 6. Test Threads configure endpoint
  try {
    const body = new URLSearchParams({
      text_post_app_info: JSON.stringify({ reply_control: 0 }),
      source_type: '4',
      caption: 'Test Threads post',
      upload_id: Date.now().toString(),
    }).toString()
    const res = await fetch('https://i.instagram.com/api/v1/media/configure_text_post_app_feed/', {
      method: 'POST',
      headers: threadsHeaders,
      body,
      redirect: 'manual',
    })
    const text = await res.text()
    console.log(`\n[threads_post] POST configure_text_post_app_feed → ${res.status}`)
    try {
      const json = JSON.parse(text)
      console.log('  JSON:', JSON.stringify(json, null, 2).slice(0, 300))
    } catch {
      console.log('  Text:', text.slice(0, 200))
    }
  } catch (e) {
    console.error('[threads_post] ERROR:', e.message)
  }
}

run()