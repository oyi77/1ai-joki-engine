/**
 * Twitter DM — send a direct message via Twitter's internal API.
 *
 * Uses cookie-based access to Twitter's DM endpoint.
 * Same pattern as Facebook's chat.ts standalone function.
 */

import { createHttpClient, parseCookies } from '../../../utils/http-client'

/**
 * Send a Twitter/X direct message to a user.
 *
 * @param userId   Twitter user ID (numeric string)
 * @param message  Text content of the message
 * @param cookie   Raw browser session cookie string (ct0=...; auth_token=...; ...)
 * @returns { success: boolean, error?: string }
 */
export async function sendTwitterDM(
  userId: string,
  message: string,
  cookie: string
): Promise<{ success: boolean; error?: string }> {
  if (!cookie) return { success: false, error: 'Cookie not provided' }
  if (!userId) return { success: false, error: 'userId not provided' }
  if (!message) return { success: false, error: 'message not provided' }

  const cookieHeader = parseCookies(cookie)
  const csrfMatch = cookieHeader.match(/ct0=([^;]+)/)
  const csrfToken = csrfMatch?.[1] ?? ''

  try {
    const client = createHttpClient({
      baseURL: 'https://twitter.com',
      timeout: 15_000,
      headers: {
        Cookie: cookieHeader,
        'X-Csrf-Token': csrfToken,
        Authorization:
          'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
        'Content-Type': 'application/json',
        'X-Twitter-Active-User': 'yes',
        'X-Twitter-Auth-Type': 'OAuth2Session',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      },
    })

    const body = {
      conversation_id: `${userId}-${userId}`,
      recipient_ids: false,
      request_id: String(Date.now()),
      text: message,
      cards_platform: 'Web-12',
      include_cards: 1,
      include_quote_count: true,
      dm_users: false,
    }

    // Twitter DM endpoint
    const res = await client.post(
      '/i/api/1.1/dm/new2.json',
      JSON.stringify(body)
    )

    const data = res?.data
    const ok = !!data?.entries?.[0]?.message

    return {
      success: ok,
      error: ok ? undefined : `DM not confirmed. Status: ${res?.status}`,
    }
  } catch (e: unknown) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Twitter DM error',
    }
  }
}
