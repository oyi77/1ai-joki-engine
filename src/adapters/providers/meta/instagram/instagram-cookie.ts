import type { IAdapter, RateLimitStatus } from '../../../IAdapter'
import { createHttpClient, parseCookies } from '../../../../utils/http-client'

/**
 * InstagramCookieAdapter
 *
 * Posts to Instagram using browser session cookies.
 * Cookies are passed as a string (plain "k=v; k2=v2") or JSON array
 * ([{"name":"k","value":"v"}]) — stored encrypted in the `accounts` table.
 *
 * This adapter calls Instagram's internal API endpoints, which don't require
 * an official access token. Use it for personal accounts without Graph API.
 *
 * IMPORTANT: Ensure you are compliant with Instagram's Terms of Service.
 */
export class InstagramCookieAdapter implements IAdapter {
  private cookieHeader: string = ''
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
    this.logger?.(`[InstagramCookie] ${msg}`)
  }

  async connect(): Promise<void> {
    if (!this.rawCookie) throw new Error('Instagram cookie not provided')
    this.cookieHeader = parseCookies(this.rawCookie)
    this.log('Cookie loaded')
  }

  async disconnect(): Promise<void> {
    this.cookieHeader = ''
    this.log('Disconnected')
  }

  /**
   * Create a text-only Instagram post using the internal create endpoint.
   * @param _to  Unused (Instagram posts are to the authenticated user's feed)
   * @param message  Caption / post text
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
          'X-CSRFToken': this.extractCsrf(),
          'X-IG-App-ID': '303070000',
          'X-IG-Device-ID': 'ig-' + Math.random().toString(36).slice(2, 18),
          'X-IG-Connection-Type': 'WIFI',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':
            'Instagram 303.0.0.11.109 Android (27/8.1.0; 480dpi; 1080x1920; samsung; SM-G9550; heroqlte; en_US; 511506453)',
        },
      })
      const params = new URLSearchParams({
        caption: message,
        media_type: '1',
        upload_id: String(Date.now()),
      })
      const res = await client.post('/api/v1/media/configure_text_post_reshare/', params.toString())
      const ok = res?.data?.status === 'ok'
      this.log(`Post result: ${res?.data?.status}`)
      const msg = res?.data?.message
    return { success: ok, error: ok ? undefined : msg, code: ok ? undefined : 'IG_COOKIE_POST_ERROR' }
    } catch (e: unknown) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'IG cookie post error',
        code: 'IG_COOKIE_POST_ERROR',
      }
    }
  }

  /**
   * Reply to a comment/media item.
   * @param to  Media or comment ID to reply to
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
          'X-CSRFToken': this.extractCsrf(),
          'X-IG-App-ID': '303070000',
          'X-IG-Device-ID': 'ig-' + Math.random().toString(36).slice(2, 18),
          'X-IG-Connection-Type': 'WIFI',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':
            'Instagram 303.0.0.11.109 Android (27/8.1.0; 480dpi; 1080x1920; samsung; SM-G9550; heroqlte; en_US; 511506453)',
        },
      })
      const params = new URLSearchParams({ comment_text: message })
      const res = await client.post(`/api/v1/media/${to}/comment/`, params.toString())
      const ok = res?.data?.status === 'ok'
      return { success: ok, error: ok ? undefined : res?.data?.message, code: ok ? undefined : 'IG_COOKIE_REPLY_ERROR' }
    } catch (e: unknown) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'IG cookie reply error',
        code: 'IG_COOKIE_REPLY_ERROR',
      }
    }
  }

  async getRateLimitStatus(): Promise<RateLimitStatus | null> {
    this.maybeDrainRate()
    return { limit: 30, remaining: this.rateRemaining, reset: this.rateReset }
  }

  private extractCsrf(): string {
    const match = this.cookieHeader.match(/csrftoken=([^;]+)/)
    return match?.[1] ?? ''
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

export default InstagramCookieAdapter