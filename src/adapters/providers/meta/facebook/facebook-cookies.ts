import type { IAdapter, RateLimitStatus } from '../../../IAdapter'
import { createHttpClient, parseCookies } from '../../../../utils/http-client'

/**
 * FacebookCookieAdapter
 *
 * Posts to Facebook (by Meta) using browser session cookies.
 * Uses Facebook's internal GraphQL endpoint — the same approach as the web app.
 * Cookies stored encrypted in the `accounts` table.
 *
 * IMPORTANT: Ensure you are compliant with Meta Facebook' Terms of Service.
 */
export class FacebookCookieAdapter implements IAdapter {
  private cookieHeader: string = ''
  private csrfToken: string = ''
  private logger?: (msg: string) => void
  private rateRemaining = 30
  private rateReset = Date.now() + 60_000

  constructor(
    private rawCookie: string,
    opts?: { logger?: (msg: string) => void }
  ) {
    this.logger = opts?.logger
  }

  private log(msg: string) {
    this.logger?.(`[] ${msg}`)
  }

  async connect(): Promise<void> {
    if (!this.rawCookie) throw new Error('Facebook cookie not provided')
    this.cookieHeader = parseCookies(this.rawCookie)
    const match = this.cookieHeader.match(/csrftoken=([^;]+)/)
    this.csrfToken = match?.[1] ?? ''
    this.log('Cookie loaded')
  }

  async disconnect(): Promise<void> {
    this.cookieHeader = ''
    this.csrfToken = ''
    this.log('Disconnected')
  }

  /**
   * Create a new Threads post.
   * @param _to   Unused (post goes to authenticated user's Threads feed)
   * @param message  Post text
   */
  async sendMessage(
    _to: string,
    message: string
  ): Promise<{ success: boolean; error?: string; code?: string }> {
    if (!this.cookieHeader) await this.connect()
    this.maybeDrainRate()
    if (this.rateRemaining <= 0) {  
      return { success: false, code: 'RATE_LIMIT_EXCEEDED', error: 'Rate limit exceeded' }
    }
    try {
      const client = createHttpClient({
        baseURL: 'https://www.facebook.com',
        timeout: 15_000,
        headers: {
          Cookie: this.cookieHeader,
          'X-CSRFToken': this.csrfToken,
          'X-IG-App-ID': '238260118697367', // Threads app ID
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 303.0.0.11.109',
        },
      })
      const params = new URLSearchParams({
        text_post_app_info: JSON.stringify({ reply_control: 0 }),
        source_type: '4',
        caption: message,
        upload_id: String(Date.now()),
      })
      const res = await client.post(
        '/api/v1/media/configure_text_post_app_feed/',
        params.toString()
      )
       const ok = res?.data?.status === 'ok' || res?.status === 200
       this.log(`Post result: ${res?.data?.status}`)
       return { success: ok, code: ok ? undefined : 'FACEBOOK_COOKIE_POST_ERROR' }
     } catch (e: unknown) {
       const errorMessage = e instanceof Error ? e.message : String(e)
       return {
         success: false,
         error: errorMessage,
         code: 'FACEBOOK_COOKIE_POST_ERROR',
       }
     }
  }

  /**
   * Reply to an existing Threads post.
   * @param to  Post/thread ID to reply to
   * @param message  Reply text
   */
  async replyToMessage(
    to: string,
    message: string
  ): Promise<{ success: boolean; error?: string; code?: string }> {
    if (!this.cookieHeader) await this.connect()
    try {
      const client = createHttpClient({
        baseURL: 'https://www.facebook.com',
        timeout: 15_000,
        headers: {
          Cookie: this.cookieHeader,
          'X-CSRFToken': this.csrfToken,
          'X-IG-App-ID': '238260118697367',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 303.0.0.11.109',
        },
      })
      const params = new URLSearchParams({
        text_post_app_info: JSON.stringify({ reply_control: 0, replied_to_id: to }),
        source_type: '4',
        caption: message,
        upload_id: String(Date.now()),
      })
      const res = await client.post(
        '/api/v1/media/configure_text_post_app_feed/',
        params.toString()
      )
      const ok = res?.data?.status === 'ok' || res?.status === 200
      this.log(`Reply result: ${res?.data?.status}`)
      return { success: ok, code: ok ? undefined : 'FACEBOOK_COOKIE_REPLY_ERROR' }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      return {
        success: false,
        error: errorMessage,
        code: 'FACEBOOK_COOKIE_REPLY_ERROR',
      }
    }
  }

  async getRateLimitStatus(): Promise<RateLimitStatus | null> {
    this.maybeDrainRate()
    return {
      remaining: this.rateRemaining,
      reset: this.rateReset,
      limit: 30,
    }
  }

  private maybeDrainRate() {
    const now = Date.now()
    if (now > this.rateReset) {
      this.rateRemaining = 30
      this.rateReset = now + 60_000
    } else {
      this.rateRemaining--
    }
  }
}

