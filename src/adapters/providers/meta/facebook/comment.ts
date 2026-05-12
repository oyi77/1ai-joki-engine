import { createHttpClient, parseCookies } from '../../../../utils/http-client'

/**
 * postComment — post a comment on a Facebook post.
 *
 * @param postId   Facebook post ID (e.g. "123456789_987654321" or just "987654321")
 * @param message  Comment text
 * @param cookie   Raw browser session cookie string (c_user=...; xs=...; ...)
 * @returns { success: boolean, error?: string }
 */
export async function postComment(
  postId: string,
  message: string,
  cookie: string
): Promise<{ success: boolean; error?: string; commentId?: string }> {
  if (!cookie) return { success: false, error: 'Cookie not provided' }
  if (!postId) return { success: false, error: 'postId not provided' }
  if (!message) return { success: false, error: 'message not provided' }

  const cookieHeader = parseCookies(cookie)

  // Extract c_user
  const cUserMatch = cookieHeader.match(/\bc_user=([^;\s]+)/)
  const cUser = cUserMatch?.[1] ?? ''

  try {
    // Step 1: Fetch www.facebook.com to get CSRF tokens
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

    // Detect auth
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

    // Step 2: POST comment via GraphQL
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
        Referer: `https://www.facebook.com/`,
        'X-FB-LSD': lsd,
        'X-FB-Friendly-Name': 'CometUFIAddCommentMutation',
      },
    })

    const params = new URLSearchParams({
      av: cUser,
      __user: cUser,
      __a: '1',
      __req: Math.random().toString(36).slice(2, 5),
      fb_dtsg: fbDtsg,
      lsd: lsd,
      doc_id: '1612153915386838',
      variables: JSON.stringify({
        input: {
          client_mutation_id: String(Date.now()),
          feedback_id: Buffer.from(`feedback:${postId}`).toString('base64'),
          message: {
            ranges: [],
            text: message,
          },
        },
        UFICommentContainerPaginationQuery: false,
      }),
      fb_api_caller_class: 'RelayModern',
      fb_api_req_friendly_name: 'CometUFIAddCommentMutation',
    })

    const res = await gqlClient.post('/api/graphql/', params.toString())
    const responseText = String(res?.data ?? '')

    // Auth check in response
    if (responseText.includes('"login_form"')) {
      return { success: false, error: 'Auth expired — login redirect in GraphQL response' }
    }

    type ParsedResponse = { errors?: { message?: string }[]; data?: { comment_create?: { feedback_comment?: { id?: string } }; commentCreate?: { comment?: { id?: string } } } }
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

    // Check for GraphQL errors
    const errorArray = Array.isArray(parsed?.errors) ? parsed.errors : []
    if (errorArray.length > 0) {
      const firstError = errorArray[0]
      const errMsg = firstError?.message ?? JSON.stringify(firstError)
      return { success: false, error: `GraphQL error: ${errMsg}` }
    }

    // Extract comment ID from response
    const commentId: string | undefined =
      parsed?.data?.comment_create?.feedback_comment?.id ||
      parsed?.data?.commentCreate?.comment?.id ||
      undefined

    const ok = res?.status === 200 && (!!commentId || parsed?.data !== null)
    return {
      success: ok,
      commentId,
      error: ok ? undefined : `Comment not confirmed. Response: ${responseText.slice(0, 300)}`,
    }
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e))
    return {
      success: false,
      error: error.message ?? 'postComment error',
    }
  }
}

export default postComment
