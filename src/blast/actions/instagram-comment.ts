/**
 * Instagram comment action — post a comment on an Instagram post.
 *
 * Extracted from blast-runner.ts inline code (lines 92-117).
 */

import { createHttpClient, parseCookies } from '../../utils/http-client'

/**
 * Post a comment on an Instagram post.
 * Used by the blast runner for 'comment' actions on Instagram.
 *
 * @param postId   Instagram media ID
 * @param message  Comment text
 * @param cookie   Raw browser session cookie string
 * @returns { success: boolean, error?: string }
 */
export async function instagramPostComment(
  postId: string,
  message: string,
  cookie: string
): Promise<{ success: boolean; error?: string }> {
  if (!cookie) return { success: false, error: 'Cookie not provided' }
  if (!postId) return { success: false, error: 'postId not provided' }
  if (!message) return { success: false, error: 'message not provided' }

  const cookieHeader = parseCookies(cookie)
  const csrfMatch = cookieHeader.match(/csrftoken=([^;]+)/)
  const csrfToken = csrfMatch?.[1] ?? ''
  try {
    const client = createHttpClient({
      baseURL: 'https://i.instagram.com',
      timeout: 15_000,
      headers: {
        Cookie: cookieHeader,
        'X-CSRFToken': csrfToken,
        'X-IG-App-ID': '303070000',
        'X-IG-Device-ID': 'ig-' + Math.random().toString(36).slice(2, 18),
        'X-IG-Connection-Type': 'WIFI',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Instagram 303.0.0.11.109 Android (27/8.1.0; 480dpi; 1080x1920; samsung; SM-G9550; heroqlte; en_US; 511506453)',
      },
    })
    const params = new URLSearchParams({ comment_text: message })
    const res = await client.post(`/api/v1/media/${postId}/comment/`, params.toString())
    const ok = res?.data?.status === 'ok'
    const errMsg = res?.data?.message || res?.statusText
    return { success: ok, error: ok ? undefined : errMsg }
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'IG comment error' }
  }
}
