/**
 * Threads comment action — reply to a Threads post.
 *
 * Extracted from blast-runner.ts inline code (lines 184-219).
 */

import { createHttpClient, parseCookies } from '../../utils/http-client'

/**
 * Reply to a Threads post.
 * Used by the blast runner for 'comment' actions on Threads.
 *
 * @param postId   Threads post ID
 * @param message  Reply text
 * @param cookie   Raw browser session cookie string
 * @returns { success: boolean, error?: string }
 */
export async function threadsReply(
  postId: string,
  message: string,
  cookie: string
): Promise<{ success: boolean; error?: string }> {
  if (!cookie) return { success: false, error: 'Cookie not provided' }
  if (!postId) return { success: false, error: 'postId not provided' }
  if (!message) return { success: false, error: 'message not provided' }

  const thCookie = parseCookies(cookie)
  const thCsrf = thCookie.match(/csrftoken=([^;]+)/)?.[1] ?? ''
  try {
    const client = createHttpClient({
      baseURL: 'https://www.threads.net',
      timeout: 15_000,
      headers: {
        Cookie: thCookie,
        'X-CSRFToken': thCsrf,
        'X-IG-App-ID': '238260118697367',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 303.0.0.11.109',
      },
    })
    const params = new URLSearchParams({
      text_post_app_info: JSON.stringify({ reply_control: 0, replied_to_id: postId }),
      source_type: '4',
      caption: message,
      upload_id: String(Date.now()),
    })
    const res = await client.post('/api/v1/media/configure_text_post_app_feed/', params.toString())
    const ok = res?.data?.status === 'ok' || res?.status === 200
    return { success: ok, error: ok ? undefined : 'Threads reply failed' }
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Threads reply error' }
  }
}
