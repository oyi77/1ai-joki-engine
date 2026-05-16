import { JobQueue } from '../queue/job-queue'
import { IAdapter } from '../adapters/IAdapter'
import { AccountsRepo } from '../repos/accountsRepo'
import { decrypt } from '../utils/crypto'
import { getConfig } from '../config/secrets'
import { WhatsAppAdapter } from '../adapters/providers/meta/Whatsapp/whatsapp'
import { TelegramAdapter } from '../adapters/providers/telegram/telegram'
import { TelegramMTProtoAdapter } from '../adapters/providers/telegram/telegram-mtproto'
import { InstagramAdapter } from '../adapters/providers/meta/instagram/instagram'
import { InstagramCookieAdapter } from '../adapters/providers/meta/instagram/instagram-cookie'
import { TwitterAdapter } from '../adapters/providers/twitter/twitter'
import { TwitterCookieAdapter } from '../adapters/providers/twitter/twitter-cookie'
import { ThreadsAdapter } from '../adapters/providers/meta/threads/threads'
import { ThreadsCookieAdapter } from '../adapters/providers/meta/threads/threads-cookie'
import { FacebookAdapter } from '../adapters/providers/meta/facebook/facebook'
import type { Job } from '../types/jobs'

type AdapterFactory = (
  platform: string,
  context?: { accountId?: string; credentials?: string }
) => IAdapter | Promise<IAdapter>

export interface WorkerOptions {
  adapterFactory?: AdapterFactory
}

function unwrapCredentials(value: unknown): string {
  if (value == null) return ''
  if (Buffer.isBuffer(value)) return value.toString('utf8')
  return String(value)
}

function readDecryptedCredentials(value: unknown): string {
  const raw = unwrapCredentials(value)
  if (!raw) return ''
  try {
    return decrypt(raw)
  } catch {
    return raw
  }
}

function parseTelegramMtprotoCredentials(raw: string) {
  const parsed = JSON.parse(raw)
  if (
    !parsed ||
    typeof parsed.apiId !== 'number' ||
    typeof parsed.apiHash !== 'string' ||
    typeof parsed.sessionString !== 'string'
  ) {
    throw new Error('Invalid Telegram MTProto credentials payload')
  }
  return { apiId: parsed.apiId, apiHash: parsed.apiHash, sessionString: parsed.sessionString }
}

function createDefaultAdapterFactory() {
  const accountsRepo = new AccountsRepo()

  return (platform: string, context?: { accountId?: string; credentials?: string }) => {
    const cfg = getConfig()
    const account = context?.accountId ? accountsRepo.findById(context.accountId) : null
    const rawCredentials =
      context?.credentials ?? readDecryptedCredentials(account?.credentials_encrypted)

    switch (platform) {
      case 'whatsapp':
      case 'whatsapp-webjs':
        return new WhatsAppAdapter()
      case 'telegram':
        return new TelegramAdapter(rawCredentials || cfg.TELEGRAM_BOT_TOKEN || '')
      case 'telegram-mtproto':
        return new TelegramMTProtoAdapter(parseTelegramMtprotoCredentials(rawCredentials))
      case 'instagram-cookie':
        return new InstagramCookieAdapter(rawCredentials)
      case 'instagram':
        return new InstagramAdapter()
      case 'twitter-cookie':
        return new TwitterCookieAdapter(rawCredentials)
      case 'twitter':
        return new TwitterAdapter()
      case 'threads-cookie':
        return new ThreadsCookieAdapter(rawCredentials)
      case 'threads':
        return new ThreadsAdapter()
      case 'facebook':
      case 'facebook-page':
        return new FacebookAdapter(rawCredentials)
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }
}

export async function initializeJobWorker(queue: JobQueue, options?: WorkerOptions) {
  const adaptersFactory = options?.adapterFactory ?? createDefaultAdapterFactory()
  
  queue.setProcessor(async ({ id, data }: { id: string; data: unknown }) => {
    const jobData = data as Job & { account_id?: string; [key: string]: any }
    const platform = jobData?.platform
    if (!platform) throw new Error('Missing platform in job data')

    const { getDb } = await import('../db/sqlite')
    const db = getDb()

    try {
      const adapter = await adaptersFactory(platform, { accountId: jobData?.account_id })
      
      let success = false
      let error: string | undefined
      let code: string | undefined

      // Routing logic by job type (casted to any for flexibility)
      const type = jobData.type as string
      if (type === 'PostJob') {
        const to = (jobData.to as string) || (jobData.account_id as string) || ''
        const msg = jobData.message as string
        if (!to) throw new Error('PostJob missing recipient')
        
        if ('sendMessage' in adapter && typeof adapter.sendMessage === 'function') {
          const result = await adapter.sendMessage(to, msg)
          success = result.success
          error = result.error
          code = result.code
        } else {
          throw new Error('Adapter missing sendMessage')
        }
      } else if (type === 'CommentJob' || type === 'comment') {
        const postId = jobData.postId as string
        const text = jobData.message as string
        if (!postId) throw new Error('CommentJob missing postId')
        
        if ('commentOnPost' in adapter && typeof adapter.commentOnPost === 'function') {
           const result = await adapter.commentOnPost(postId, text)
           success = typeof result === 'boolean' ? result : (result as any).success
           if (!success) error = (result as any).error ?? 'Comment failed'
        } else {
          throw new Error('Adapter missing commentOnPost')
        }
      } else if (type === 'ChatJob' || type === 'chat') {
        const userId = jobData.userId as string
        const text = jobData.message as string
        if (!userId) throw new Error('ChatJob missing userId')
        
        if ('sendMessage' in adapter && typeof adapter.sendMessage === 'function') {
          const result = await adapter.sendMessage(userId, text)
          success = result.success
          error = result.error
          code = result.code
        } else {
          throw new Error('Adapter missing sendMessage')
        }
      } else if (type === 'LikeJob' || type === 'like') {
        const targetId = jobData.targetId || jobData.postId
        if (!targetId) throw new Error('LikeJob missing targetId')
        
        if ('reactToPost' in adapter && typeof adapter.reactToPost === 'function') {
           const result = await adapter.reactToPost(targetId, 'LIKE')
           success = result.success
           error = result.error
        } else {
           throw new Error('Adapter missing reactToPost')
        }
      } else if (type === 'ReplyJob' || type === 'reply') {
        const chatId = jobData.chatId as string
        const messageId = jobData.messageId as string
        const text = jobData.message as string
        if (!chatId || !messageId) throw new Error('ReplyJob missing chatId or messageId')

        if ('replyToMessage' in adapter && typeof adapter.replyToMessage === 'function') {
          const result = await adapter.replyToMessage(chatId, messageId, text)
          success = result.success
          error = result.error
          code = result.code
        } else if ('sendMessage' in adapter && typeof adapter.sendMessage === 'function') {
          // Fallback to regular send message if reply is not supported
          const result = await adapter.sendMessage(chatId, text)
          success = result.success
          error = result.error
          code = result.code
        } else {
          throw new Error('Adapter missing replyToMessage/sendMessage')
        }
      } else {
        throw new Error(`Unknown job type: ${type}`)
      }

      if (success) {
        console.log(`[worker] ${platform} adapter succeeded for job ${id}`)
        db.prepare(`UPDATE jobs SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(id)
      } else {
        throw new Error(error || 'Action failed')
      }

    } catch (err: any) {
      const errorMsg = err.message || String(err)
      console.error(`[worker] ${platform} adapter failed for job ${id}: ${errorMsg}`)
      
      try {
        db.prepare(`UPDATE jobs SET status = 'failed', last_error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(errorMsg, id)
        db.prepare(`INSERT INTO logs (job_id, level, message, meta) VALUES (?, ?, ?, ?)`).run(
          id, 
          'error', 
          `Execution failed: ${errorMsg}`,
          JSON.stringify({ stack: err.stack, platform, type: jobData.type })
        )
      } catch (dbErr: any) {
        console.error(`[worker] Failed to update job status or write log for job ${id}`, {
          error: dbErr.message,
          stack: dbErr.stack
        })
      }
      
      throw err // Rethrow for JobQueue retry logic
    }
  })
}

export default initializeJobWorker
