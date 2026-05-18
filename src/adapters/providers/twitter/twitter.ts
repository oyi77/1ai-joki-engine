import { IAdapter, RateLimitStatus } from '../../IAdapter'
import { getConfig } from '../../../config/secrets'
import { RateLimiter, PLATFORM_QUOTAS } from '../../../queue/rate-limiter'

const rateLimiter = new RateLimiter()

// Lightweight Twitter adapter using twitter-api-v2 with lazy require
// Supports Bearer token (OAuth 2.0) for read and OAuth 1.0a style for write when credentials are provided.
export class TwitterAdapter implements IAdapter {
  private twitterClient: any
  private rwClient: any // write-capable client (readWrite)
  private logger?: (msg: string) => void

  constructor(opts?: { logger?: (msg: string) => void }) {
    this.logger = opts?.logger
  }

  private log(msg: string) {
    this.logger?.(`[TwitterAdapter] ${msg}`)
  }

  async connect(): Promise<void> {
    // Lazy require to avoid hard dependency in test environments
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { TwitterApi } = require('twitter-api-v2')
      const cfg = getConfig()
      // Prefer Bearer-based app authentication when available
      if (cfg.TWITTER_BEARER_TOKEN) {
        this.twitterClient = new TwitterApi(cfg.TWITTER_BEARER_TOKEN as any)
      } else if (cfg.TWITTER_API_KEY && cfg.TWITTER_API_SECRET) {
        const token = (cfg as any).TWITTER_ACCESS_TOKEN
        const secret = (cfg as any).TWITTER_ACCESS_TOKEN_SECRET
        this.twitterClient = new TwitterApi({
          appKey: cfg.TWITTER_API_KEY,
          appSecret: cfg.TWITTER_API_SECRET,
          accessToken: token,
          accessSecret: secret,
        } as any)
      } else {
        throw new Error('Twitter credentials not configured')
      }
      // Create a write-enabled client if possible
      this.rwClient = this.twitterClient.readWrite
        ? this.twitterClient.readWrite
        : this.twitterClient
      this.log('Twitter client initialized (lazy).')
    } catch (e: any) {
      // Do not throw in tests; allow tests to mock behavior
      this.log('Twitter library not available or misconfigured: ' + (e?.message ?? String(e)))
      this.twitterClient = undefined
      this.rwClient = undefined
    }
  }

  async disconnect(): Promise<void> {
    // twitter-api-v2 supports close() for cleanup; ignore if not present
    try {
      if (this.twitterClient && typeof this.twitterClient.close === 'function') {
        await this.twitterClient.close()
      }
    } catch {
      // ignore
    }
  }

  async sendMessage(
    _to: string,
    message: string
  ): Promise<{ success: boolean; error?: string; code?: string }> {
    // Ensure client is ready
    if (!this.rwClient) {
      await this.connect()
    }
    try {
      if (!this.rwClient) {
        return {
          success: false,
          error: 'Twitter client not initialized',
          code: 'TWITTER_CLIENT_NOT_INITIALIZED',
        }
      }
      await rateLimiter.waitForToken('twitter')
      // Use v2 create tweet if available; fall back to v1.tweet
      if (typeof this.rwClient.v2?.tweet === 'function') {
        await this.rwClient.v2.tweet(message)
      } else if (typeof this.rwClient.v1?.tweet === 'function') {
        await this.rwClient.v1.tweet(message)
      } else {
        // Unknown API surface; return a friendly error
        return {
          success: false,
          code: 'TWITTER_API_UNSUPPORTED',
          error: 'Twitter API surface not supported in this runtime',
        }
      }
      return { success: true }
    } catch (e: any) {
      const error = e?.message ?? 'Twitter post error'
      return { success: false, error, code: e?.code ?? 'TWITTER_POST_ERROR' }
    }
  }

  async replyToMessage(
    to: string,
    message: string
  ): Promise<{ success: boolean; error?: string; code?: string }> {
    if (!this.rwClient) {
      await this.connect()
    }
    try {
      if (!this.rwClient) {
        return {
          success: false,
          error: 'Twitter client not initialized',
          code: 'TWITTER_CLIENT_NOT_INITIALIZED',
        }
      }
      await rateLimiter.waitForToken('twitter')
      // Reply to a tweet by id using v1 API when available
      if (typeof this.rwClient.v1?.reply === 'function') {
        // Twitter v1: reply(text, in_reply_to_status_id)
        await this.rwClient.v1.reply(message, to)
      } else if (typeof this.rwClient.v2?.respond === 'function') {
        await this.rwClient.v2.respond(message, { in_reply_to_tweet_id: to } as any)
      } else {
        return {
          success: false,
          code: 'TWITTER_API_UNSUPPORTED',
          error: 'Twitter API surface not supported for replies',
        }
      }
      return { success: true }
    } catch (e: any) {
      const error = e?.message ?? 'Twitter reply error'
      return { success: false, error, code: e?.code ?? 'TWITTER_REPLY_ERROR' }
    }
  }

  async getRateLimitStatus(): Promise<RateLimitStatus | null> {
    const bucketInfo = rateLimiter.getBucketInfo('twitter')
    return {
      limit: PLATFORM_QUOTAS.twitter.capacity,
      remaining: Math.floor(bucketInfo.tokens),
      reset: Date.now() + 60_000,
    }
  }
}

export default TwitterAdapter
