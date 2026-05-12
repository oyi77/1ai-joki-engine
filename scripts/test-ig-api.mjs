/**
 * Instagram API Quick Test — validates cookie and probes endpoints
 * Run: node --experimental-vm-modules scripts/test-ig-api.mjs
 *   or: npx tsx scripts/test-ig-api.ts
 *
 * Env vars:
 *   TEST_INSTAGRAM_COOKIE_JSON  Path to cookie JSON (default /tmp/instagram_cookies.json)
 *   TEST_INSTAGRAM_COOKIE       Plain cookie string (fallback)
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const cookieJsonPath = process.env.TEST_INSTAGRAM_COOKIE_JSON ?? '/tmp/instagram_cookies.json'
const plainCookie = process.env.TEST_INSTAGRAM_COOKIE ?? ''

// Load cookies from JSON file
function loadCookiesFromJson(path) {
  try {
    const content = readFileSync(path, 'utf-8')
    const arr = JSON.parse(content)
    return arr.map((c) => `${c.name}=${c.value}`).join('; ')
  } catch (e) {
    console.error(`Failed to load cookie JSON from ${path}: ${e}`)
    process.exit(1)
  }
}

const cookieString = plainCookie || loadCookiesFromJson(cookieJsonPath)

if (!cookieString) {
  console.error('No cookie provided. Set TEST_INSTAGRAM_COOKIE_JSON or TEST_INSTAGRAM_COOKIE')
  process.exit(1)
}

console.log('Cookie loaded, first 80 chars:', cookieString.slice(0, 80) + '...')

// Extract CSRF token
const csrfMatch = cookieString.match(/csrftoken=([^;]+)/)
const csrfToken = csrfMatch?.[1] ?? ''
console.log('CSRF token:', csrfToken)

// Test Instagram API
async function testInstagramAPI() {
  const endpoints = [
    { method: 'GET', path: '/api/v1/accounts/current_user/?edit=true', label: 'current_user' },
    { method: 'GET', path: '/api/v1/fbsearch/topnav/', label: 'fbsearch_topnav' },
    { method: 'GET', path: '/web/search/topnav/', label: 'web_search_topnav' },
  ]

  for (const ep of endpoints) {
    try {
      const url = `https://www.instagram.com${ep.path}`
      const res = await fetch(url, {
        method: ep.method,
        headers: {
          Cookie: cookieString,
          'X-CSRFToken': csrfToken,
          'X-IG-App-ID': '936619743392459',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 303.0.0.11.109',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.instagram.com/',
        },
      })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { data = text.slice(0, 200) }
      console.log(`\n[${ep.label}] ${res.status} ${res.statusText}`)
      console.log('Response:', JSON.stringify(data, null, 2).slice(0, 500))
    } catch (e) {
      console.error(`[${ep.label}] ERROR:`, e)
    }
  }

  // Test a hashtag endpoint
  try {
    const url = 'https://www.instagram.com/api/v1/tags/ai/sections/'
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Cookie: cookieString,
        'X-CSRFToken': csrfToken,
        'X-IG-App-ID': '936619743392459',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 303.0.0.11.109',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.instagram.com/',
      },
    })
    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch { data = text.slice(0, 200) }
    console.log(`\n[hashtag_ai] ${res.status} ${res.statusText}`)
    console.log('Response:', JSON.stringify(data, null, 2).slice(0, 500))
  } catch (e) {
    console.error('[hashtag_ai] ERROR:', e)
  }
}

testInstagramAPI()