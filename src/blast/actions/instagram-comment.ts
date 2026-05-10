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
      baseURL: 'https://www.instagram.com',
      timeout: 15_000,
      headers: {
        Cookie: cookieHeader,
        'X-CSRFToken': csrfToken,
        'X-IG-App-ID': '936619743392459',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 303.0.0.11.109',
      },
    })
    const params = new URLSearchParams({ comment_text: message })
    const res = await client.post(`/api/v1/media/${postId}/comment/`, params.toString())
    const ok = res?.data?.status === 'ok' || res?.status === 200
    return { success: ok, error: ok ? undefined : 'IG comment failed' }
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'IG comment error' }
  }
}
