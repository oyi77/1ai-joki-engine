import type { IAdapter, RateLimitStatus } from '../../../IAdapter'
import { createHttpClient, parseCookies } from '../../../../utils/http-client'

class AuthError extends Error {
  constructor(message?: string) {
    super(message ?? 'Authentication failed')
    this.name = 'AuthError'
  }
}

/**
 * FacebookAdapter (cookie-based, GraphQL)
 *
 * Uses Facebook's internal GraphQL endpoint — the same approach as the web browser.
 * Credentials stored in `accounts` table as a raw browser session cookie string:
 *   c_user=...; xs=...; datr=...; sb=...
 *
 * Flow:
 *  1. connect(): GET www.facebook.com → scrape fb_dtsg + lsd
 *  2. sendMessage(): POST www.facebook.com/api/graphql/ with GraphQL doc_id
 */
export class FacebookAdapter implements IAdapter {
  private cookieHeader: string = ''
  private fbDtsg: string = ''
  private lsd: string = ''
  private cUser: string = ''
  private rateRemaining = 30
  private rateReset = Date.now() + 60_000
  private logger?: (msg: string) => void

  constructor(
    private rawCookie: string,
    opts?: { logger?: (msg: string) => void }
  ) {
    this.logger = opts?.logger
  }

  private log(msg: string) {
    this.logger?.(`[FacebookAdapter] ${msg}`)
  }

  /**
   * Fetch www.facebook.com to extract fb_dtsg and lsd CSRF tokens.
   * These are required by every GraphQL request.
   */
  async connect(): Promise<void> {
    if (!this.rawCookie) throw new Error('Facebook cookie not provided')
    this.cookieHeader = parseCookies(this.rawCookie)

    // Extract c_user from cookie string (fast path)
    const cUserMatch = this.cookieHeader.match(/\bc_user=([^;\s]+)/)
    if (cUserMatch) this.cUser = cUserMatch[1]

    const client = createHttpClient({
      baseURL: 'https://www.facebook.com',
      timeout: 15_000,
      headers: {
        Cookie: this.cookieHeader,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      },
    })

    const res = await client.get('/')
    const html = String(res?.data || '')

    // Detect login redirect
    const isLoginPage =
      /name="login"/.test(html) ||
      /action="https:\/\/www\.facebook\.com\/login/.test(html) ||
      html.includes('"login_form"')
    if (isLoginPage) {
      throw new AuthError('Cookie expired — redirected to login page')
    }

    // Extract fb_dtsg — multiple patterns FB uses
    const dtsgMatch =
      html.match(/"DTSGInitialData"[^}]*"token":"([^"]+)"/) ||
      html.match(/name="fb_dtsg"\s+value="([^"]+)"/) ||
      html.match(/"fb_dtsg",\["_",[^,]*,"([^"]+)"/) ||
      html.match(/fb_dtsg[" ]+value[" :=]+"([^"]+)"/) ||
      html.match(/"DTSGInitData"[^}]*"token":"([^"]+)"/)
    if (dtsgMatch) {
      this.fbDtsg = dtsgMatch[1]
      this.log(`fb_dtsg extracted (len=${this.fbDtsg.length})`)
    }

    // Extract lsd token
    const lsdMatch =
      html.match(/"LSD",[^,]*,"token":"([^"]+)"/) ||
      html.match(/name="lsd"\s+value="([^"]+)"/) ||
      html.match(/"lsd":"([^"]+)"/)
    if (lsdMatch) {
      this.lsd = lsdMatch[1]
      this.log(`lsd extracted: ${this.lsd}`)
    }

    if (!this.fbDtsg) {
      this.log('WARNING: fb_dtsg not found in HTML. Requests may fail.')
    }

    this.log(`Connected. c_user=${this.cUser}`)
  }

  async disconnect(): Promise<void> {
    this.cookieHeader = ''
    this.fbDtsg = ''
    this.lsd = ''
    this.cUser = ''
    this.log('Disconnected')
  }

  /**
   * Post a status update to the authenticated user's Facebook timeline.
   * Uses GraphQL endpoint with the CreateStory doc_id.
   *
   * @param _to   Unused — posts always go to the authenticated user's timeline.
   * @param message  Text content to post.
   */
  async sendMessage(
    _to: string,
    message: string
  ): Promise<{ success: boolean; error?: string; code?: string }> {
    try {
      if (!this.cookieHeader) await this.connect()
      if (!this.fbDtsg) await this.connect()

      this.maybeDrainRate()
      if (this.rateRemaining <= 0) {
        return { success: false, code: 'RATE_LIMIT_EXCEEDED', error: 'Rate limit exceeded' }
      }

      if (!this.fbDtsg) {
        return {
          success: false,
          code: 'FB_DTSG_MISSING',
          error: 'Could not extract fb_dtsg — check cookie validity',
        }
      }

      const client = createHttpClient({
        baseURL: 'https://www.facebook.com',
        timeout: 20_000,
        headers: {
          Cookie: this.cookieHeader,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: '*/*',
          Origin: 'https://www.facebook.com',
          Referer: 'https://www.facebook.com/',
          'X-FB-Friendly-Name': 'CometUFIStatusUpdateMutation',
          'X-FB-LSD': this.lsd,
        },
      })

      // GraphQL doc_id for creating a timeline post (status update)
      // This is the CreateStory mutation used by Facebook web
      const params = new URLSearchParams({
        av: this.cUser,
        __user: this.cUser,
        __a: '1',
        __req: Math.random().toString(36).slice(2, 5),
        fb_dtsg: this.fbDtsg,
        lsd: this.lsd,
        doc_id: '6155595407483853',
        variables: JSON.stringify({
          input: {
            message: { text: message },
            audiences: { undirected: { optIn: [] } },
            client_mutation_id: String(Date.now()),
          },
        }),
        fb_api_caller_class: 'RelayModern',
        fb_api_req_friendly_name: 'CometUFIStatusUpdateMutation',
      })

      const res = await client.post('/api/graphql/', params.toString())

      const responseText = String(res?.data ?? '')

      // Detect login redirect in response
      if (responseText.includes('"login_form"') || res?.request?.res?.responseUrl?.includes('login')) {
        throw new AuthError('Auth redirect detected in GraphQL response')
      }

      // Parse JSON response
      type ParsedResponse = { errors?: { message?: string }[]; data?: unknown; [key: string]: unknown }
      let parsed: ParsedResponse = {}
      try {
        parsed = typeof res?.data === 'object' ? res.data : JSON.parse(responseText)
      } catch {
        // Non-JSON response — check if it looks like success
        const fallbackOk = res?.status === 200 && responseText.trim().length > 0
        this.log(`Non-JSON response (status=${res?.status}, len=${responseText.length})`)
        return {
          success: fallbackOk,
          code: fallbackOk ? undefined : 'FB_POST_NON_JSON',
          error: fallbackOk ? undefined : `Unexpected response: ${responseText.slice(0, 200)}`,
        }
      }

      // Check for errors in GraphQL response
      const errorArray = Array.isArray(parsed?.errors) ? parsed.errors : []
      if (errorArray.length > 0) {
        const firstError = errorArray[0]
        const errMsg = firstError?.message ?? JSON.stringify(firstError)
        this.log(`GraphQL error: ${errMsg}`)
        return { success: false, code: 'FB_GRAPHQL_ERROR', error: errMsg }
      }

      // Look for success indicator in data
      const data = parsed?.data
      const hasData = data !== null && data !== undefined
      const ok = res?.status === 200 && hasData

      this.log(`Post result: status=${res?.status}, hasData=${hasData}`)
      return {
        success: ok,
        code: ok ? undefined : 'FB_POST_FAILED',
        error: ok ? undefined : `Post not confirmed. Response: ${responseText.slice(0, 300)}`,
      }
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e))
      if (error.name === 'AuthError') {
        return { success: false, code: 'AUTH_EXPIRED', error: error.message }
      }
      const errMsg = error.message ?? 'Unknown error'
      this.log(`sendMessage error: ${errMsg}`)
      return { success: false, code: 'FB_POST_ERROR', error: errMsg }
    }
  }

  async getRateLimitStatus(): Promise<RateLimitStatus | null> {
    return { limit: 30, remaining: this.rateRemaining, reset: this.rateReset }
  }

  private maybeDrainRate() {
    const now = Date.now()
    if (now > this.rateReset) {
      this.rateRemaining = 30
      this.rateReset = now + 60_000
    }
    if (this.rateRemaining > 0) this.rateRemaining--
  }
}

export default FacebookAdapter
