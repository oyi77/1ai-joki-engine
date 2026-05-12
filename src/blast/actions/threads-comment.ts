import { ThreadsPlaywrightAdapter } from '../../adapters/providers/meta/threads/threads-playwright'
import { createHttpClient, parseCookies } from '../../utils/http-client'

const IG_ANDROID_UA =
  'Instagram 303.0.0.11.109 Android (27/8.1.0; 480dpi; 1080x1920; samsung; SM-G9550; heroqlte; en_US; 511506453)'
const IG_APP_ID = '303070000'
const IG_BASE_URL = 'https://i.instagram.com'

async function threadsReplyViaApi(
  postId: string,
  message: string,
  cookie: string
): Promise<{ success: boolean; error?: string }> {
  const thCookie = parseCookies(cookie)
  const thCsrf = thCookie.match(/csrftoken=([^;]+)/)?.[1] ?? ''
  const igDid = thCookie.match(/ig_did=([^;]+)/)?.[1] ?? 'ig-' + Math.random().toString(36).slice(2, 18)

  const client = createHttpClient({
    baseURL: IG_BASE_URL,
    timeout: 15_000,
    headers: {
      Cookie: thCookie,
      'X-CSRFToken': thCsrf,
      'X-IG-App-ID': IG_APP_ID,
      'X-IG-Device-ID': igDid,
      'X-IG-Connection-Type': 'WIFI',
      'Accept-Language': 'en-US',
      Accept: '*/*',
      'User-Agent': IG_ANDROID_UA,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
  const params = new URLSearchParams({
    text_post_app_info: JSON.stringify({ reply_control: 0, replied_to_id: postId }),
    source_type: '4',
    caption: message,
    upload_id: String(Date.now()),
  })
  const res = await client.post('/api/v1/media/configure_text_post_app_feed/', params.toString())
  if (res?.status === 401) return { success: false, error: 'Rate limited or challenge required' }
  if (res?.data?.content?.error_code === 4415001) return { success: false, error: 'Anti-automation block — session flagged' }
  const ok = res?.data?.status === 'ok'
  return { success: ok, error: ok ? undefined : (res?.data?.message || 'Threads reply failed') }
}

export async function threadsReply(
  postId: string,
  message: string,
  cookie: string,
  opts?: { useBrowser?: boolean; headless?: boolean; logger?: (msg: string) => void }
): Promise<{ success: boolean; error?: string }> {
  if (!cookie) return { success: false, error: 'Cookie not provided' }
  if (!postId) return { success: false, error: 'postId not provided' }
  if (!message) return { success: false, error: 'message not provided' }

  if (opts?.useBrowser !== false) {
    const adapter = new ThreadsPlaywrightAdapter(cookie, { headless: opts?.headless, logger: opts?.logger })
    try {
      await adapter.connect()
      const result = await adapter.commentOnPost(`https://www.threads.net/post/${postId}`, message)
      if (result.success) return result
      // Browser failed — fall back to API
      opts?.logger?.(`[threads-comment] Browser failed: ${result.error}. Falling back to API.`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      opts?.logger?.(`[threads-comment] Browser error: ${msg}. Falling back to API.`)
    } finally {
      await adapter.disconnect().catch(() => {})
    }
  }

  return threadsReplyViaApi(postId, message, cookie)
}

export { threadsReplyViaApi }