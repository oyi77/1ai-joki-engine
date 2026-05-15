// Job type definitions for the internal queue

export interface PostJob {
  id?: string
  type?: 'PostJob'
  platform: string // e.g., 'whatsapp', 'telegram', 'threads', 'instagram'
  to: string // recipient identifier
  message: string
  account_id?: string
}

export interface ReplyJob {
  id?: string
  type?: 'ReplyJob'
  platform: string
  chatId: string // chat/thread id to reply to
  messageId: string // message id to reply to
  message: string
  account_id?: string
}

export interface CommentJob {
  id?: string
  type?: 'CommentJob'
  platform: string // 'facebook'
  postId: string // ID of the Facebook post to comment on
  message: string
  account_id?: string
}

export interface ChatJob {
  id?: string
  type?: 'ChatJob'
  platform: string // 'facebook'
  userId: string // Facebook user ID to send DM to
  message: string
  account_id?: string
}

export interface LikeJob {
  id?: string
  type: 'LikeJob' | 'like'
  platform: string
  targetId: string
  account_id?: string
}

export type Job = 
  | (PostJob & { type: 'PostJob' }) 
  | (ReplyJob & { type: 'ReplyJob' }) 
  | (CommentJob & { type: 'CommentJob' | 'comment' }) 
  | (ChatJob & { type: 'ChatJob' | 'chat' })
  | LikeJob
