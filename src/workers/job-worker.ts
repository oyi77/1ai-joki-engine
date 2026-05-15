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
import { postComment } from '../adapters/providers/meta/facebook/comment'
import { sendPrivateMessage } from '../adapters/providers/meta/facebook/chat'
import type { Job } from '../types/jobs'

// In this worker, we route jobs to platform adapters based on the job.platform field.
// The worker is intentionally DI-friendly: tests can supply a custom adapterFactory
// to observe calls without depending on real network calls.

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
  // Shared repo used to resolve credentials in CommentJob / ChatJob handlers
  const workerAccountsRepo = new AccountsRepo()

  // Processor that uses platform adapters to deliver messages
  queue.setProcessor(async ({ id, data }: { id: string; data: unknown }) => {
    const jobData = data as Job & { account_id?: string }
    const platform = jobData?.platform
    if (!platform) {
      throw new Error('Missing platform in job data')
    }
    const adapter = await adaptersFactory(platform, { accountId: jobData?.account_id })
    // Route by job type
    if (jobData.type === 'PostJob') {
       const to = (jobData.to as string) || (jobData.account_id as string) || ''
       const msg = jobData.message as string
       if (!to) throw new Error('PostJob missing to/account_id')
       // Use adapter interface if available; if adapter missing, skip
       if ('sendMessage' in adapter && typeof adapter.sendMessage === 'function') {
         try {
           const result = await adapter.sendMessage(to, msg)
          if (result && typeof result === 'object' && result.success === false) {
            console.log(`[worker] ${platform} adapter failed: ${result.code} - ${result.error}`)
            // Persist failure to logs table for observability
            try {
              const { getDb } = await import('../db/sqlite')
              const db = getDb()
              db.prepare(`INSERT INTO logs (job_id, level, message, meta) VALUES (?, ?, ?, ?)`).run(
                id,
                'error',
                String(result.error ?? 'Adapter reported failure'),
                JSON.stringify({ code: result.code })
              )
            } catch (err) {
              console.error('Failed to persist job failure log', err)
            }
            const error = new Error(result.error ?? 'Adapter reported failure') as Error & { code?: string }
             error.code = result.code ?? 'ADAPTER_REPORTED_FAILURE'
             throw error
           }
           console.log(`[worker] ${platform} adapter succeeded for job ${id}`)
           // Update DB status to completed
           try {
             const { getDb } = await import('../db/sqlite')
             const db = getDb()
             db.prepare(`UPDATE jobs SET status = 'completed' WHERE id = ?`).run(id)
           } catch (err) {
             console.error('Failed to update job status to completed', err)
           }
           return
         } catch (err: unknown) {
           // On unexpected error, persist stack and message then rethrow for retry logic
           const error = err as Error & { code?: string; stack?: string; message?: string }
           try {
             const { getDb } = await import('../db/sqlite')
             const db = getDb()
             db.prepare(`INSERT INTO logs (job_id, level, message, meta) VALUES (?, ?, ?, ?)`).run(
               id,
               'error',
               String(error.message ?? 'worker error'),
               JSON.stringify({ stack: error.stack ?? null, code: error.code ?? null })
             )
           } catch (err2) {
             console.error('Failed to persist worker error log', err2)
           }
           console.error('[worker] adapter exception', error)
           throw error
        }
      }
      throw new Error('Adapter missing sendMessage implementation')
     } else if (jobData.type === 'ReplyJob') {
       const chatId = jobData.chatId as string
       const messageId = jobData.messageId as string
       const text = jobData.message as string
       if ('replyToMessage' in adapter && typeof adapter.replyToMessage === 'function') {
         const result = await adapter.replyToMessage(chatId, messageId, text)
         if (result && typeof result === 'object' && result.success === false) {
           const error = new Error(result.error ?? 'Adapter reported failure') as Error & { code?: string }
           error.code = result.code ?? 'ADAPTER_REPORTED_FAILURE'
           throw error
         }
         return
       }
       throw new Error('Adapter missing replyToMessage implementation')
     } else if (jobData.type === 'CommentJob') {
       // Facebook comment on a post — uses standalone postComment() function
       const postId = jobData.postId as string
       const text = jobData.message as string
       if (!postId) throw new Error('CommentJob missing postId')
       const account = jobData.account_id ? workerAccountsRepo.findById(jobData.account_id) : null
       const rawCreds = readDecryptedCredentials(account?.credentials_encrypted)
       if (!rawCreds) throw new Error('CommentJob: no credentials for account')
       const result = await postComment(postId, text, rawCreds)
       if (!result.success) {
         const error = new Error(result.error ?? 'postComment failed') as Error & { code?: string }
         error.code = 'COMMENT_FAILED'
         try {
           const { getDb } = await import('../db/sqlite')
           const db = getDb()
           db.prepare(`INSERT INTO logs (job_id, level, message, meta) VALUES (?, ?, ?, ?)`).run(
             id, 'error', String(result.error ?? 'postComment failed'), JSON.stringify({ postId })
           )
         } catch { /* non-fatal */ }
         throw error
       }
       console.log(`[worker] Facebook comment posted for job ${id} on post ${postId}`)
       return
     } else if (jobData.type === 'ChatJob') {
       // Facebook Messenger DM — uses standalone sendPrivateMessage() function
       const userId = jobData.userId as string
       const text = jobData.message as string
       if (!userId) throw new Error('ChatJob missing userId')
       const account = jobData.account_id ? workerAccountsRepo.findById(jobData.account_id) : null
       const rawCreds = readDecryptedCredentials(account?.credentials_encrypted)
       if (!rawCreds) throw new Error('ChatJob: no credentials for account')
       const result = await sendPrivateMessage(userId, text, rawCreds)
       if (!result.success) {
         const error = new Error(result.error ?? 'sendPrivateMessage failed') as Error & { code?: string }
         error.code = 'CHAT_FAILED'
         try {
           const { getDb } = await import('../db/sqlite')
           const db = getDb()
           db.prepare(`INSERT INTO logs (job_id, level, message, meta) VALUES (?, ?, ?, ?)`).run(
             id, 'error', String(result.error ?? 'sendPrivateMessage failed'), JSON.stringify({ userId })
           )
         } catch { /* non-fatal */ }
         throw error
       }
       console.log(`[worker] Facebook DM sent for job ${id} to user ${userId}`)
       return
     }
     throw new Error('Unknown job type')
  })
}

export default initializeJobWorker

