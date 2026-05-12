/**
 * Instagram DM — send a direct message via Instagram's internal API.
 *
 * Uses cookie-based access to Instagram's direct messaging endpoint.
 */

import { createHttpClient, parseCookies } from '../../utils/http-client'

/**
 * Send an Instagram direct message to a user.
 *
 * @param userId   Instagram user ID (numeric string / pk)
 * @param message  Text content of the message
 * @param cookie   Raw browser session cookie string
 * @returns { success: boolean, error?: string }
 */
export async function sendInstagramDM(
  userId: string,
  message: string,
  cookie: string
): Promise<{ success: boolean; error?: string }> {
  if (!cookie) return { success: false, error: 'Cookie not provided' }
  if (!userId) return { success: false, error: 'userId not provided' }
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

    const params = new URLSearchParams({
      recipient_users: JSON.stringify([userId]),
      action: 'send_item',
      client_context: String(Date.now()),
      text: message,
    })

    const res = await client.post('/api/v1/direct_v2/threads/broadcast/text/', params.toString())
    const ok = res?.data?.status === 'ok'

    return {
      success: ok,
      error: ok ? undefined : res?.data?.message ?? `DM not confirmed. Status: ${res?.status}`,
    }
  } catch (e: any) {
    return {
      success: false,
      error: e?.message ?? 'Instagram DM error',
    }
  }
}
