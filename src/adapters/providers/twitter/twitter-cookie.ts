import type { IAdapter, RateLimitStatus } from '../../IAdapter'
import { createHttpClient, parseCookies } from '../../../utils/http-client'

/**
 * TwitterCookieAdapter
 *
 * Posts tweets using browser session cookies (Twitter/X internal API).
 * Cookies stored encrypted in the `accounts` table.
 *
 * IMPORTANT: Ensure you are compliant with Twitter/X's Terms of Service.
 */
export class TwitterCookieAdapter implements IAdapter {
  private cookieHeader: string = ''
  private csrfToken: string = ''
  private logger?: (msg: string) => void
  private rateRemaining = 50
  private rateReset = Date.now() + 60_000

  constructor(
    private rawCookie: string,
    opts?: { logger?: (msg: string) => void }
  ) {
    this.logger = opts?.logger
  }

  private log(msg: string) {
    this.logger?.(`[TwitterCookie] ${msg}`)
  }

  async connect(): Promise<void> {
    if (!this.rawCookie) throw new Error('Twitter cookie not provided')
    this.cookieHeader = parseCookies(this.rawCookie)
    // ct0 is the CSRF token cookie for Twitter
    const match = this.cookieHeader.match(/ct0=([^;]+)/)
    this.csrfToken = match?.[1] ?? ''
    this.log('Cookie loaded')
  }

  async disconnect(): Promise<void> {
    this.cookieHeader = ''
    this.csrfToken = ''
    this.log('Disconnected')
  }

  /**
   * Create a tweet using Twitter's internal GraphQL API.
   * @param _to   Unused (tweets go to authenticated user's timeline)
   * @param message  Tweet text (max 280 chars enforced server-side)
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
        baseURL: 'https://twitter.com',
        timeout: 15_000,
        headers: {
          Cookie: this.cookieHeader,
          'X-Csrf-Token': this.csrfToken,
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
        variables: {
          tweet_text: message,
          dark_request: false,
          media: { media_entities: [], possibly_sensitive: false },
          semantic_annotation_ids: [],
        },
        features: {
          tweetypie_unmention_optimization_enabled: true,
          responsive_web_edit_tweet_api_enabled: true,
          graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
          view_counts_everywhere_api_enabled: true,
          longform_notetweets_consumption_enabled: true,
          responsive_web_twitter_article_tweet_consumption_enabled: false,
          tweet_awards_web_tipping_enabled: false,
          freedom_of_speech_not_reach_fetch_enabled: true,
          standardized_nudges_misinfo: true,
          tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: false,
          longform_notetweets_rich_text_read_enabled: true,
          longform_notetweets_inline_media_enabled: false,
          responsive_web_graphql_exclude_directive_enabled: true,
          verified_phone_label_enabled: false,
          responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
          responsive_web_graphql_timeline_navigation_enabled: true,
          responsive_web_enhance_cards_enabled: false,
        },
        queryId: 'SoVnbfCycZ7fERGCwpZkYA',
      }
      const res = await client.post('/i/api/graphql/SoVnbfCycZ7fERGCwpZkYA/CreateTweet', body)
      const tweetId = res?.data?.data?.create_tweet?.tweet_results?.result?.rest_id
      const ok = !!tweetId
      this.log(`Tweet result: ${tweetId ?? 'none'}`)
      return { success: ok, code: ok ? undefined : 'TWITTER_COOKIE_POST_ERROR' }
    } catch (e: unknown) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Twitter cookie post error',
        code: 'TWITTER_COOKIE_POST_ERROR',
      }
    }
  }

  /**
   * Reply to an existing tweet.
   * @param to  Tweet ID to reply to
   * @param message  Reply text
   */
  async replyToMessage(
    to: string,
    message: string
  ): Promise<{ success: boolean; error?: string; code?: string }> {
    if (!this.cookieHeader) await this.connect()
    this.maybeDrainRate()
    if (this.rateRemaining <= 0) {
      return { success: false, code: 'RATE_LIMIT_EXCEEDED', error: 'Rate limit exceeded' }
    }
    try {
      const client = createHttpClient({
        baseURL: 'https://twitter.com',
        timeout: 15_000,
        headers: {
          Cookie: this.cookieHeader,
          'X-Csrf-Token': this.csrfToken,
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
        variables: {
          tweet_text: message,
          reply: { in_reply_to_tweet_id: to, exclude_reply_user_ids: [] },
          dark_request: false,
          media: { media_entities: [], possibly_sensitive: false },
          semantic_annotation_ids: [],
        },
        features: {
          tweetypie_unmention_optimization_enabled: true,
          responsive_web_edit_tweet_api_enabled: true,
          graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
          view_counts_everywhere_api_enabled: true,
          longform_notetweets_consumption_enabled: true,
          responsive_web_twitter_article_tweet_consumption_enabled: false,
          tweet_awards_web_tipping_enabled: false,
          freedom_of_speech_not_reach_fetch_enabled: true,
          standardized_nudges_misinfo: true,
          tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: false,
          longform_notetweets_rich_text_read_enabled: true,
          longform_notetweets_inline_media_enabled: false,
          responsive_web_graphql_exclude_directive_enabled: true,
          verified_phone_label_enabled: false,
          responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
          responsive_web_graphql_timeline_navigation_enabled: true,
          responsive_web_enhance_cards_enabled: false,
        },
        queryId: 'SoVnbfCycZ7fERGCwpZkYA',
      }
      const res = await client.post('/i/api/graphql/SoVnbfCycZ7fERGCwpZkYA/CreateTweet', body)
      const tweetId = res?.data?.data?.create_tweet?.tweet_results?.result?.rest_id
      const ok = !!tweetId
      this.log(`Reply tweet result: ${tweetId ?? 'none'}`)
      return { success: ok, code: ok ? undefined : 'TWITTER_COOKIE_REPLY_ERROR' }
    } catch (e: unknown) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Twitter cookie reply error',
        code: 'TWITTER_COOKIE_REPLY_ERROR',
      }
    }
  }

  async getRateLimitStatus(): Promise<RateLimitStatus | null> {
    this.maybeDrainRate()
    return { limit: 50, remaining: this.rateRemaining, reset: this.rateReset }
  }

  private maybeDrainRate() {
    const now = Date.now()
    if (now > this.rateReset) {
      this.rateRemaining = 50
      this.rateReset = now + 60_000
    }
    if (this.rateRemaining > 0) this.rateRemaining--
  }
}

export default TwitterCookieAdapter
