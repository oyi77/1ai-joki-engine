/**
 * Blast Runner — action randomization.
 *
 * Probabilistic logic:
 *   70% comment
 *   30% chat (DM)
 *
 * Avoids fixed patterns to simulate natural user behavior.
 */

import type { BlastAction } from './types'

/** Threshold for comment probability (0.0 – 1.0). */
const COMMENT_PROBABILITY = 0.7

/**
 * Pick a random action type based on configured probabilities.
 * Returns:
 *   60% comment
 *   20% chat (DM)
 *   20% like
 */
export function pickAction(): BlastAction {
  const r = Math.random()
  if (r < 0.6) return 'comment'
  if (r < 0.8) return 'chat'
  return 'like'
}
