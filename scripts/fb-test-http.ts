import { createHttpClient } from '../src/utils/http-client'

async function main() {
  const cookie = process.env.FB_COOKIE ?? ''
  if (!cookie) {
    console.error('Set FB_COOKIE env var')
    process.exit(1)
  }

  const client = createHttpClient({
    baseURL: 'https://www.facebook.com',
    timeout: 15_000,
    headers: {
      Cookie: cookie,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  })

  console.log('Testing Facebook session via HTTP...')

  const res = await client.get('/')
  const html = String(res?.data ?? '')
  const status = res?.status ?? 0

  console.log('Status:', status)
  console.log('Redirected to login?', html.includes('"login_form"') || /action="https:\/\/www\.facebook\.com\/login/.test(html))

  const dtsgMatch = html.match(/"DTSGInitialData"[^}]*"token":"([^"]+)"/) ||
    html.match(/"fb_dtsg","([^"]+)"/) ||
    html.match(/"DTSGInitData"[^}]*"token":"([^"]+)"/)
  const lsdMatch = html.match(/"LSD",[^,]*,"token":"([^"]+)"/)
  const cUserMatch = cookie.match(/\bc_user=([^;\s]+)/)

  console.log('fb_dtsg found?', !!dtsgMatch?.[1], '=', dtsgMatch?.[1]?.substring(0, 20))
  console.log('lsd found?', !!lsdMatch?.[1], '=', lsdMatch?.[1]?.substring(0, 20))
  console.log('c_user found?', cUserMatch?.[1])

  if (!dtsgMatch?.[1]) {
    console.log('\nCookie is invalid — redirected to login')
  } else {
    console.log('\nCookie is valid — fb_dtsg extracted successfully')
  }
}

main().catch(e => { console.error(e.message); process.exit(1) })