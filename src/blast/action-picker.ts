/**
 * Blast Runner — action randomization.
 *
 * Probabilistic logic:
 *   60% comment
 *   20% chat (DM)
 *   20% like
 *
 * Avoids fixed patterns to simulate natural user behavior.
 */

import type { BlastAction, BlastPlatform } from './types'

/**
 * Pick a random action type based on configured probabilities.
 * Returns:
 *   60% comment
 *   20% chat (DM)
 *   20% like
 *
 * When platform is 'threads', 'chat' is excluded because Threads DM
 * is not supported — falls back to 'comment' instead.
 */
export function pickAction(platform?: BlastPlatform): BlastAction {
  const r = Math.random()
  if (r < 0.6) return 'comment'
  if (r < 0.8) {
    // Threads DM is not supported — filter it out
    if (platform === 'threads') return 'comment'
    return 'chat'
  }
  return 'like'
}
