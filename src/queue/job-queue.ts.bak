import { EventEmitter } from 'events'
import { Mutex } from 'async-mutex'
import { PostJob, ReplyJob, CommentJob, ChatJob, Job } from '../types/jobs'
import type { IAdapter } from '../adapters/IAdapter'
import { computeBackoffDelay, getRetryMaxAttemptsForError, isRetryableError } from './retry'
import { getPolicyForPlatform } from './retry-policies'
import { RateLimiter } from './rate-limiter'

// A minimal, test-friendly job queue for Task 10.
// - In-memory processing (fallback when BullMQ is unavailable)
// - Optional adapterFactory to inject mocks during tests
// - Emits "completed" and "failed" events with jobId and result/error
// - Uses Mutex to ensure atomic processNext() execution (FIX #2)

type AdapterFactory = (platform: string) => IAdapter

export class JobQueue extends EventEmitter {
  private redisUrl?: string
  private useBullMQ: boolean = false
  private queueName: string = 'job-queue'
  private inMemoryQueue: Array<{ id: string; data: any; type: string; attempts: number }> = []
  private processingMutex = new Mutex() // ✅ FIX #2: Atomic lock instead of boolean
  private processor?: (payload: { id: string; data: any }) => Promise<void>
  private adapterFactory: AdapterFactory
  public dlq: Array<{ id: string; error: any; data: any }> = []
  private rateLimiter: RateLimiter

  constructor(opts?: { redisUrl?: string; adapterFactory?: AdapterFactory }) {
    super()
    this.redisUrl = opts?.redisUrl
    this.rateLimiter = new RateLimiter()
    // If BullMQ is present, we would use it; for this exercise we also support in-memory mode.
    try {
      // Try to require BullMQ to detect availability; we donot actually instantiate in real mode here
      // to keep tests lightweight. If available, set flag to true so real path could be added later.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const BullMq = require('bullmq')
      this.useBullMQ = true
      // We do not instantiate real BullMQ in tests to avoid Redis requirements.
    } catch {
      this.useBullMQ = false
    }
    this.adapterFactory =
      opts?.adapterFactory ??
      (() => {
        // Default dummy adapter to avoid runtime crashes if used in tests without DI
        // @ts-ignore
        return { sendMessage: async () => ({ success: true }), disconnect: async () => {} } as any
      })
    // Diagnostic: queue initialized
    // eslint-disable-next-line no-console
    console.debug('[JobQueue] initialized (in-memory path).')
  }

  // Register a processor used to handle jobs from the queue
  setProcessor(fn: (payload: { id: string; data: any }) => Promise<void>) {
    this.processor = fn
  }

  // Enqueue a PostJob
  async enqueuePostJob(job: Omit<PostJob, 'id' | 'type'> & { platform: string }): Promise<string> {
    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const payload = { id, data: { ...job, type: 'PostJob' }, type: 'PostJob' } as any
    // Diagnostic
    // eslint-disable-next-line no-console
    console.debug(`[JobQueue] Enqueue PostJob id=${id} platform=${(job as any).platform}`)
    // Always use in-memory queue for now to ensure tests run without requiring BullMQ/Redis.
    this.inMemoryQueue.push({ id, data: payload.data, type: 'PostJob', attempts: 0 })
    // Trigger processing in-memory. If a processor is registered, run immediately to avoid race.
    console.debug(`[JobQueue] Scheduling processing for PostJob id=${id}`)
    if (this.processor) {
      this.processNext()
    } else {
      setTimeout(() => this.processNext(), 0)
    }
    return id
  }

  // Enqueue a ReplyJob
  async enqueueReplyJob(
    job: Omit<ReplyJob, 'id' | 'type'> & { platform: string }
  ): Promise<string> {
    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const payload = { id, data: { ...job, type: 'ReplyJob' }, type: 'ReplyJob' } as any
    // Diagnostic
    // eslint-disable-next-line no-console
    console.debug(`[JobQueue] Enqueue ReplyJob id=${id} platform=${(job as any).platform}`)
    // Always use in-memory queue for now
    this.inMemoryQueue.push({ id, data: payload.data, type: 'ReplyJob', attempts: 0 })
    console.debug(`[JobQueue] Scheduling processing for ReplyJob id=${id}`)
    if (this.processor) {
      this.processNext()
    } else {
      setTimeout(() => this.processNext(), 0)
    }
    return id
  }

  // Enqueue a CommentJob (Facebook comment on a post)
  async enqueueCommentJob(
    job: Omit<CommentJob, 'id' | 'type'> & { platform: string }
  ): Promise<string> {
    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const data = { ...job, type: 'CommentJob' }
    console.debug(
      `[JobQueue] Enqueue CommentJob id=${id} platform=${job.platform} postId=${(job as any).postId}`
    )
    this.inMemoryQueue.push({ id, data, type: 'CommentJob', attempts: 0 })
    if (this.processor) {
      this.processNext()
    } else {
      setTimeout(() => this.processNext(), 0)
    }
    return id
  }

  // Enqueue a ChatJob (Facebook Messenger DM)
  async enqueueChatJob(job: Omit<ChatJob, 'id' | 'type'> & { platform: string }): Promise<string> {
    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const data = { ...job, type: 'ChatJob' }
    console.debug(
      `[JobQueue] Enqueue ChatJob id=${id} platform=${job.platform} userId=${(job as any).userId}`
    )
    this.inMemoryQueue.push({ id, data, type: 'ChatJob', attempts: 0 })
    if (this.processor) {
      this.processNext()
    } else {
      setTimeout(() => this.processNext(), 0)
    }
    return id
  }

  private async processNext() {
    // ✅ FIX #2: Use Mutex to ensure atomic execution (prevent race condition)
    await this.processingMutex.runExclusive(async () => {
      // Diagnostic
      // eslint-disable-next-line no-console
      console.debug('[JobQueue] processNext started. Queue size:', this.inMemoryQueue.length)
      try {
        // Process all queued items in-order
        while (this.inMemoryQueue.length > 0) {
          const item = this.inMemoryQueue.shift()!
          const platform = item.data?.platform || 'default'

          // Wait for rate limit token before processing
          await this.rateLimiter.waitForToken(platform)

          if (!this.processor) {
            // No processor registered; skip
            // Diagnostic
            // eslint-disable-next-line no-console
            console.warn('[JobQueue] No processor registered; skipping item', item?.id)
            continue
          }
          try {
            await this.processor({ id: item.id, data: item.data })
            this.emit('completed', item.id, item.data)
          } catch (err: any) {
            const policy = getPolicyForPlatform(platform)
            const retryLimit = getRetryMaxAttemptsForError(err)
            const attempts = item.attempts

            // Check for 429 Retry-After header
            if (err?.response?.status === 429) {
              const retryAfter = parseInt(err.response.headers?.['retry-after'] || '60', 10)
              console.debug(
                `[JobQueue] 429 Rate Limit hit for ${platform}. Blocking for ${retryAfter}s`
              )
              this.rateLimiter.blockFor(platform, retryAfter)
            }

            if (isRetryableError(err) && attempts < retryLimit) {
              const delay = computeBackoffDelay(
                policy.baseDelay,
                policy.multiplier,
                attempts,
                policy.jitter
              )
              const nextItem = { ...item, attempts: attempts + 1 }
              console.debug(
                `[JobQueue] Retrying job ${item.id} in ${delay}ms (attempt ${attempts + 1})`
              )
              setTimeout(() => {
                this.inMemoryQueue.push(nextItem)
                this.processNext()
              }, delay)
              // Since we use setTimeout for retry, we continue processing other items in the queue
              continue
            } else {
              this.dlq.push({ id: item.id, error: err, data: item.data })
              this.emit('failed', item.id, err)
            }
          }
        }
      } finally {
        // Diagnostic
        // eslint-disable-next-line no-console
        console.debug('[JobQueue] processNext finished.')
      }
    })
  }
}

export default JobQueue
