import type { IAdapter, RateLimitStatus } from '../../../IAdapter'
import { createHttpClient, parseCookies } from '../../../../utils/http-client'

const IG_ANDROID_UA =
  'Instagram 303.0.0.11.109 Android (27/8.1.0; 480dpi; 1080x1920; samsung; SM-G9550; heroqlte; en_US; 511506453)'
const IG_APP_ID = '303070000'
const IG_BASE_URL = 'https://i.instagram.com'

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

  private webHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      Cookie: this.cookieHeader,
      'X-CSRFToken': this.extractCsrf(),
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
        caption: message,
        media_type: '1',
        upload_id: String(Date.now()),
      })
      const res = await client.post('/api/v1/media/configure/', params.toString())
      const blocked = this.checkBlocked({ status: res?.status ?? 0, data: res?.data })
      if (blocked) return { success: false, error: blocked, code: 'IG_BLOCKED' }
      const ok = res?.data?.status === 'ok'
      this.log(`Post result: ${res?.data?.status}`)
      return { success: ok, error: ok ? undefined : res?.data?.message, code: ok ? undefined : 'IG_COOKIE_POST_ERROR' }
    } catch (e: unknown) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'IG cookie post error',
        code: 'IG_COOKIE_POST_ERROR',
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
      const params = new URLSearchParams({ comment_text: message })
      const res = await client.post(`/api/v1/media/${to}/comment/`, params.toString())
      const blocked = this.checkBlocked({ status: res?.status ?? 0, data: res?.data })
      if (blocked) return { success: false, error: blocked, code: 'IG_BLOCKED' }
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

  private extractIgDid(): string {
    const match = this.cookieHeader.match(/ig_did=([^;]+)/)
    return match?.[1] ?? 'ig-' + Math.random().toString(36).slice(2, 18)
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