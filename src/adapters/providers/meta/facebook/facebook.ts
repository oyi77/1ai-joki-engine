import type { IAdapter, RateLimitStatus } from '../../../IAdapter'
import { createHttpClient, parseCookies } from '../../../../utils/http-client'
import { findFacebookTargets, FacebookFinderResult, FacebookSearchFilters } from './facebook-finder'
import { sendPrivateMessage } from './chat'
import { postComment } from './comment'
import { getNotifications, markNotificationAsRead, FacebookNotification } from './facebook-notif'
import { reactToPost, FacebookReactionType } from './facebook-react'
import { createPost } from './facebook-post'
import { FacebookPlaywrightAdapter } from './facebook-playwright'

class AuthError extends Error {
  constructor(message?: string) {
    super(message ?? 'Authentication failed')
    this.name = 'AuthError'
  }
}

export type FacebookAdapterMode = 'HTTP' | 'BROWSER'

/**
 * FacebookAdapter (Unified Multi-Mode Engine)
 *
 * Supports both high-speed HTTP (GraphQL) and high-robustness BROWSER (Playwright).
 */
export class FacebookAdapter implements IAdapter {
  private cookieHeader: string = ''
  private fbDtsg: string = ''
  private lsd: string = ''
  private cUser: string = ''
  private rateRemaining = 30
  private rateReset = Date.now() + 60_000
  private logger?: (msg: string) => void
  private playwrightAdapter: FacebookPlaywrightAdapter | null = null
  private mode: FacebookAdapterMode = 'HTTP'

  constructor(
    private rawCookie: string,
    opts?: { logger?: (msg: string) => void, mode?: FacebookAdapterMode }
  ) {
    this.logger = opts?.logger
    this.mode = opts?.mode ?? 'HTTP'
    if (this.mode === 'BROWSER') {
      this.playwrightAdapter = new FacebookPlaywrightAdapter(rawCookie, { logger: opts?.logger })
    }
  }

  private log(msg: string) {
    this.logger?.(`[FacebookAdapter] ${msg}`)
  }

  async connect(): Promise<void> {
    if (this.mode === 'BROWSER') {
      return this.playwrightAdapter!.connect()
    }

    if (!this.rawCookie) throw new Error('Facebook cookie not provided')
    this.cookieHeader = parseCookies(this.rawCookie)

    const cUserMatch = this.cookieHeader.match(/\bc_user=([^;\s]+)/)
    if (cUserMatch) this.cUser = cUserMatch[1]

    const client = createHttpClient({
      baseURL: 'https://www.facebook.com',
      timeout: 15_000,
      headers: {
        Cookie: this.cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    })

    const res = await client.get('/')
    const html = String(res?.data || '')

    if (/name="login"/.test(html) || html.includes('"login_form"')) {
      throw new AuthError('Cookie expired — redirected to login page')
    }

    // Extract fb_dtsg and lsd
    this.extractTokens(html)
    this.log(`Connected. c_user=${this.cUser} Mode=${this.mode}`)
  }

  private extractTokens(html: string) {
    const dtsgMatch = html.match(/"DTSGInitialData"[^}]*"token":"([^"]+)"/) ||
                      html.match(/name="fb_dtsg"\s+value="([^"]+)"/) ||
                      html.match(/"fb_dtsg",\["_",[^,]*,"([^"]+)"/)
    if (dtsgMatch) this.fbDtsg = dtsgMatch[1]

    const lsdMatch = html.match(/"LSD",[^,]*,"token":"([^"]+)"/) ||
                     html.match(/name="lsd"\s+value="([^"]+)"/) ||
                     html.match(/"lsd":"([^"]+)"/)
    if (lsdMatch) this.lsd = lsdMatch[1]
  }

  async disconnect(): Promise<void> {
    if (this.mode === 'BROWSER') {
      return this.playwrightAdapter!.disconnect()
    }
    this.cookieHeader = ''
    this.fbDtsg = ''
    this.lsd = ''
    this.log('Disconnected')
  }

  async sendMessage(to: string, message: string): Promise<{ success: boolean; error?: string; code?: string }> {
    if (this.mode === 'BROWSER') {
      return this.playwrightAdapter!.sendMessage(to, message)
    }
    this.maybeDrainRate()
    const res = await sendPrivateMessage(to, message, this.rawCookie)
    return { success: res.success, error: res.error, code: res.success ? undefined : 'FB_SEND_ERROR' }
  }

  async commentOnPost(postId: string, message: string): Promise<{ success: boolean; error?: string }> {
    if (this.mode === 'BROWSER') {
      const ok = await this.playwrightAdapter!.commentOnPost(postId, message)
      return { success: ok }
    }
    return postComment(postId, message, this.rawCookie)
  }

  async searchPosts(query: string, limit?: number, filters?: FacebookSearchFilters): Promise<FacebookFinderResult> {
    return findFacebookTargets(query, this.rawCookie, limit, filters)
  }

  async getNotifications(limit?: number, unreadOnly?: boolean): Promise<FacebookNotification[]> {
    return getNotifications(this.rawCookie, limit, unreadOnly)
  }

  async markNotificationRead(notifId: string): Promise<{ success: boolean; error?: string }> {
    return markNotificationAsRead(notifId, this.rawCookie)
  }

  async reactToPost(postId: string, reaction: FacebookReactionType = 'LIKE'): Promise<{ success: boolean; error?: string }> {
    return reactToPost(postId, reaction, this.rawCookie)
  }

  async createPost(message: string, privacy: 'EVERYONE' | 'FRIENDS' | 'SELF' = 'EVERYONE'): Promise<{ success: boolean; error?: string; postId?: string }> {
    return createPost(message, this.rawCookie, privacy)
  }

  async getRateLimitStatus(): Promise<RateLimitStatus | null> {
    if (this.mode === 'BROWSER') return this.playwrightAdapter!.getRateLimitStatus()
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
