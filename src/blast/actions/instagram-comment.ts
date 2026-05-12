import { InstagramPlaywrightAdapter } from '../../adapters/providers/meta/instagram/instagram-playwright'
import { createHttpClient, parseCookies } from '../../utils/http-client'

const IG_ANDROID_UA =
  'Instagram 303.0.0.11.109 Android (27/8.1.0; 480dpi; 1080x1920; samsung; SM-G9550; heroqlte; en_US; 511506453)'
const IG_APP_ID = '303070000'
const IG_BASE_URL = 'https://i.instagram.com'

async function instagramPostCommentViaApi(
  postId: string,
  message: string,
  cookie: string
): Promise<{ success: boolean; error?: string }> {
  const cookieHeader = parseCookies(cookie)
  const csrfMatch = cookieHeader.match(/csrftoken=([^;]+)/)
  const csrfToken = csrfMatch?.[1] ?? ''
  const igDid = cookieHeader.match(/ig_did=([^;]+)/)?.[1] ?? 'ig-' + Math.random().toString(36).slice(2, 18)

  const client = createHttpClient({
    baseURL: IG_BASE_URL,
    timeout: 15_000,
    headers: {
      Cookie: cookieHeader,
      'X-CSRFToken': csrfToken,
      'X-IG-App-ID': IG_APP_ID,
      'X-IG-Device-ID': igDid,
      'X-IG-Connection-Type': 'WIFI',
      'Accept-Language': 'en-US',
      Accept: '*/*',
      'User-Agent': IG_ANDROID_UA,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
  const params = new URLSearchParams({ comment_text: message })
  const res = await client.post(`/api/v1/media/${postId}/comment/`, params.toString())
  if (res?.status === 401) return { success: false, error: 'Rate limited or challenge required' }
  if (res?.data?.content?.error_code === 4415001) return { success: false, error: 'Anti-automation block — session flagged' }
  const ok = res?.data?.status === 'ok'
  const errMsg = res?.data?.message || res?.statusText
  return { success: ok, error: ok ? undefined : errMsg }
}

export async function instagramPostComment(
  postId: string,
  message: string,
  cookie: string,
  opts?: { useBrowser?: boolean; headless?: boolean; logger?: (msg: string) => void }
): Promise<{ success: boolean; error?: string }> {
  if (!cookie) return { success: false, error: 'Cookie not provided' }
  if (!postId) return { success: false, error: 'postId not provided' }
  if (!message) return { success: false, error: 'message not provided' }

  if (opts?.useBrowser !== false) {
    const adapter = new InstagramPlaywrightAdapter(cookie, { headless: opts?.headless, logger: opts?.logger })
    try {
      await adapter.connect()
      const result = await adapter.commentOnPost(`https://www.instagram.com/p/${postId}/`, message)
      if (result.success) return result
      // Browser failed — fall back to API
      opts?.logger?.(`[instagram-comment] Browser failed: ${result.error}. Falling back to API.`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      opts?.logger?.(`[instagram-comment] Browser error: ${msg}. Falling back to API.`)
    } finally {
      await adapter.disconnect().catch(() => {})
    }
  }

  return instagramPostCommentViaApi(postId, message, cookie)
}

export { instagramPostCommentViaApi }