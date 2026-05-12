import type { IAdapter, RateLimitStatus } from '../../../IAdapter'
import { createHttpClient, parseCookies } from '../../../../utils/http-client'

/**
 * ThreadsCookieAdapter
 *
 * Posts to Threads (by Meta) using browser session cookies.
 * Uses Threads' internal GraphQL endpoint — the same approach as the web app.
 * Cookies stored encrypted in the `accounts` table.
 *
 * IMPORTANT: Ensure you are compliant with Meta Threads' Terms of Service.
 */
export class ThreadsCookieAdapter implements IAdapter {
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
    this.logger?.(`[ThreadsCookie] ${msg}`)
  }

  async connect(): Promise<void> {
    if (!this.rawCookie) throw new Error('Threads cookie not provided')
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
    if (!message.trim()) return { success: false, error: 'Message not provided', code: 'INVALID_INPUT' }
    if (!this.cookieHeader) await this.connect()
    this.maybeDrainRate()
    if (this.rateRemaining <= 0) {
      return { success: false, code: 'RATE_LIMIT_EXCEEDED', error: 'Rate limit exceeded' }
    }
    try {
      const client = createHttpClient({
        baseURL: 'https://i.instagram.com',
        timeout: 15_000,
        headers: {
          Cookie: this.cookieHeader,
          'X-CSRFToken': this.csrfToken,
          'X-IG-App-ID': '303070000',
          'X-IG-Device-ID': 'ig-' + Math.random().toString(36).slice(2, 18),
          'X-IG-Connection-Type': 'WIFI',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':
            'Instagram 303.0.0.11.109 Android (27/8.1.0; 480dpi; 1080x1920; samsung; SM-G9550; heroqlte; en_US; 511506453)',
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
      const ok = res?.data?.status === 'ok'
      this.log(`Post result: ${res?.data?.status}`)
      return { success: ok, code: ok ? undefined : 'THREADS_COOKIE_POST_ERROR' }
    } catch (e: any) {
      return {
        success: false,
        error: e?.message ?? 'Threads cookie post error',
        code: 'THREADS_COOKIE_POST_ERROR',
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
    if (!message.trim()) return { success: false, error: 'Message not provided', code: 'INVALID_INPUT' }
    if (!this.cookieHeader) await this.connect()
    this.maybeDrainRate()
    if (this.rateRemaining <= 0) {
      return { success: false, code: 'RATE_LIMIT_EXCEEDED', error: 'Rate limit exceeded' }
    }
    try {
      const client = createHttpClient({
        baseURL: 'https://i.instagram.com',
        timeout: 15_000,
        headers: {
          Cookie: this.cookieHeader,
          'X-CSRFToken': this.csrfToken,
          'X-IG-App-ID': '303070000',
          'X-IG-Device-ID': 'ig-' + Math.random().toString(36).slice(2, 18),
          'X-IG-Connection-Type': 'WIFI',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':
            'Instagram 303.0.0.11.109 Android (27/8.1.0; 480dpi; 1080x1920; samsung; SM-G9550; heroqlte; en_US; 511506453)',
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
      const ok = res?.data?.status === 'ok'
      this.log(`Reply result: ${res?.data?.status}`)
      return { success: ok, code: ok ? undefined : 'THREADS_COOKIE_REPLY_ERROR' }
    } catch (e: unknown) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Threads cookie reply error',
        code: 'THREADS_COOKIE_REPLY_ERROR',
      }
    }
  }

  async getRateLimitStatus(): Promise<RateLimitStatus | null> {
    this.maybeDrainRate()
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

export default ThreadsCookieAdapter
