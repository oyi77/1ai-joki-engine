import type { IAdapter, RateLimitStatus } from '../../../IAdapter'
import { createHttpClient, parseCookies } from '../../../../utils/http-client'

const IG_ANDROID_UA =
  'Instagram 303.0.0.11.109 Android (27/8.1.0; 480dpi; 1080x1920; samsung; SM-G9550; heroqlte; en_US; 511506453)'
const IG_APP_ID = '303070000'
const IG_BASE_URL = 'https://i.instagram.com'

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

  private webHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      Cookie: this.cookieHeader,
      'X-CSRFToken': this.csrfToken,
      'X-IG-App-ID': IG_APP_ID,
      'X-IG-Device-ID': this.extractIgDid(),
      'X-IG-Connection-Type': 'WIFI',
      'Accept-Language': 'en-US',
      Accept: '*/*',
      'User-Agent': IG_ANDROID_UA,
      ...extra,
    }
  }

  private checkBlocked(res: { status: number; data?: any }): string | null {
    if (res.status === 401) return 'Rate limited or challenge required — wait before retrying'
    const content = res.data?.content
    if (content?.error_code === 4415001) return 'Anti-automation block — session flagged as automated'
    if (res.data?.status === 'fail' && res.data?.message === 'login_required') return 'Cookie expired — login required'
    return null
  }

  private extractIgDid(): string {
    const match = this.cookieHeader.match(/ig_did=([^;]+)/)
    return match?.[1] ?? 'ig-' + Math.random().toString(36).slice(2, 18)
  }

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
        baseURL: IG_BASE_URL,
        timeout: 15_000,
        headers: this.webHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
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
      const expired = this.checkBlocked({ status: res?.status ?? 0, data: res?.data })
      if (expired) return { success: false, error: expired, code: 'IG_BLOCKED' }
      const ok = res?.data?.status === 'ok'
      this.log(`Post result: ${res?.data?.status}`)
      return { success: ok, error: ok ? undefined : res?.data?.message, code: ok ? undefined : 'THREADS_COOKIE_POST_ERROR' }
    } catch (e: any) {
      return {
        success: false,
        error: e?.message ?? 'Threads cookie post error',
        code: 'THREADS_COOKIE_POST_ERROR',
      }
    }
  }

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
        baseURL: IG_BASE_URL,
        timeout: 15_000,
        headers: this.webHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
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
      const expired = this.checkBlocked({ status: res?.status ?? 0, data: res?.data })
      if (expired) return { success: false, error: expired, code: 'IG_BLOCKED' }
      const ok = res?.data?.status === 'ok'
      this.log(`Reply result: ${res?.data?.status}`)
      return { success: ok, error: ok ? undefined : res?.data?.message, code: ok ? undefined : 'THREADS_COOKIE_REPLY_ERROR' }
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
