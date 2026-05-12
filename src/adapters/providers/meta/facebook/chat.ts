import { createHttpClient, parseCookies } from '../../../../utils/http-client'

/**
 * sendPrivateMessage — send a Facebook Messenger private message to a user.
 *
 * @param userId   Facebook user ID to send to (numeric string)
 * @param message  Text content of the message
 * @param cookie   Raw browser session cookie string (c_user=...; xs=...; ...)
 * @returns { success: boolean, error?: string, messageId?: string }
 */
export async function sendPrivateMessage(
  userId: string,
  message: string,
  cookie: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  if (!cookie) return { success: false, error: 'Cookie not provided' }
  if (!userId) return { success: false, error: 'userId not provided' }
  if (!message) return { success: false, error: 'message not provided' }

  const cookieHeader = parseCookies(cookie)
  const cUserMatch = cookieHeader.match(/\bc_user=([^;\s]+)/)
  const cUser = cUserMatch?.[1] ?? ''

  try {
    // Step 1: Fetch www.facebook.com to extract CSRF tokens
    const pageClient = createHttpClient({
      baseURL: 'https://www.facebook.com',
      timeout: 15_000,
      headers: {
        Cookie: cookieHeader,
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })

    const pageRes = await pageClient.get('/')
    const html = String(pageRes?.data || '')

    // Detect login redirect
    if (
      html.includes('"login_form"') ||
      /action="https:\/\/www\.facebook\.com\/login/.test(html)
    ) {
      return { success: false, error: 'Cookie expired — redirected to login' }
    }

    // Extract fb_dtsg
    const dtsgMatch =
      html.match(/"DTSGInitialData"[^}]*"token":"([^"]+)"/) ||
      html.match(/name="fb_dtsg"\s+value="([^"]+)"/) ||
      html.match(/"fb_dtsg","([^"]+)"/) ||
      html.match(/"DTSGInitData"[^}]*"token":"([^"]+)"/)
    const fbDtsg = dtsgMatch?.[1] ?? ''

    // Extract lsd
    const lsdMatch =
      html.match(/"LSD",[^,]*,"token":"([^"]+)"/) ||
      html.match(/name="lsd"\s+value="([^"]+)"/) ||
      html.match(/"lsd":"([^"]+)"/)
    const lsd = lsdMatch?.[1] ?? ''

    if (!fbDtsg) {
      return { success: false, error: 'Could not extract fb_dtsg — check cookie validity' }
    }

    // Step 2: Send message via Messenger GraphQL mutation
    const gqlClient = createHttpClient({
      baseURL: 'https://www.facebook.com',
      timeout: 20_000,
      headers: {
        Cookie: cookieHeader,
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: '*/*',
        Origin: 'https://www.facebook.com',
        Referer: 'https://www.facebook.com/messages/',
        'X-FB-LSD': lsd,
        'X-FB-Friendly-Name': 'LSGraphQLRequest',
      },
    })

    const params = new URLSearchParams({
      av: cUser,
      __user: cUser,
      __a: '1',
      __req: Math.random().toString(36).slice(2, 5),
      fb_dtsg: fbDtsg,
      lsd: lsd,
      doc_id: '4949364150742317',
      variables: JSON.stringify({
        input: {
          client_mutation_id: String(Date.now()),
          message: { text: message },
          recipient_id: userId,
          timestamp: Date.now(),
        },
      }),
      fb_api_caller_class: 'RelayModern',
      fb_api_req_friendly_name: 'LSGraphQLRequest',
    })

    const res = await gqlClient.post('/api/graphql/', params.toString())
    const responseText = String(res?.data ?? '')

    // Auth check
    if (responseText.includes('"login_form"')) {
      return { success: false, error: 'Auth expired — login redirect in GraphQL response' }
    }

    type ParsedResponse = { errors?: { message?: string }[]; data?: { messenger_send_message?: { message?: { message_id?: string } }; messageSend?: { message?: { id?: string } } } }
    let parsed: ParsedResponse = {}
    try {
      parsed = typeof res?.data === 'object' ? res.data : JSON.parse(responseText)
    } catch {
      const fallbackOk = res?.status === 200 && responseText.trim().length > 0
      return {
        success: fallbackOk,
        error: fallbackOk ? undefined : `Unexpected response: ${responseText.slice(0, 200)}`,
      }
    }

    // Check GraphQL errors
    const errorArray = Array.isArray(parsed?.errors) ? parsed.errors : []
    if (errorArray.length > 0) {
      const firstError = errorArray[0]
      const errMsg = firstError?.message ?? JSON.stringify(firstError)
      return { success: false, error: `GraphQL error: ${errMsg}` }
    }

    // Try to extract message ID from response
    const messageId: string | undefined =
      parsed?.data?.messenger_send_message?.message?.message_id ||
      parsed?.data?.messageSend?.message?.id ||
      undefined

    const ok = res?.status === 200 && parsed?.data !== null
    return {
      success: ok,
      messageId,
      error: ok ? undefined : `Message not confirmed. Response: ${responseText.slice(0, 300)}`,
    }
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e))
    return {
      success: false,
      error: error.message ?? 'sendPrivateMessage error',
    }
  }
}

export default sendPrivateMessage
