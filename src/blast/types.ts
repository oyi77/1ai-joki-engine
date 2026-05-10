/**
 * Blast Runner — type definitions.
 *
 * Covers platforms, action types, target shape, configuration, and result.
 */

export type BlastPlatform = 'facebook' | 'instagram' | 'twitter' | 'threads' | 'whatsapp' | 'telegram'

export type BlastAction = 'comment' | 'chat'

/** A single target to act on during a blast run. */
export interface BlastTarget {
  /** postId (for comment) or userId/phone (for chat) */
  id: string
  /** Which action to perform on this target */
  action: BlastAction
}

/** Configuration passed to the blast runner. */
export interface BlastConfig {
  platform: BlastPlatform
  /** Account row ID — used to decrypt credentials */
  accountId: string
  /** Text content to send as comment or DM */
  message: string
  /** Maximum total actions per run (default 30, hard cap 30) */
  maxActions?: number
  /** Optional override targets (e.g. WhatsApp phone list). If omitted, finder fetches them. */
  targets?: string[]
  /** Optional search query for platform finders */
  searchQuery?: string
}

/** Single action log entry. */
export interface BlastLogEntry {
  index: number
  targetId: string
  action: BlastAction
  ok: boolean
  error?: string
}

/** Result returned after a blast run completes. */
export interface BlastResult {
  platform: BlastPlatform
  total: number
  success: number
  failed: number
  log: BlastLogEntry[]
}
