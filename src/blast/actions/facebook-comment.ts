/**
 * Facebook comment action — post a comment on a Facebook post.
 *
 * Extracted from blast-runner.ts for modularity and testability.
 */

import { postComment } from '../../adapters/providers/meta/facebook/comment'

/**
 * Post a comment on a Facebook post.
 * Used by the blast runner for 'comment' actions on Facebook.
 *
 * @param postId   Facebook post ID
 * @param message  Comment text
 * @param cookie   Raw browser session cookie string
 * @returns { success: boolean, error?: string }
 */
export async function facebookPostComment(
  postId: string,
  message: string,
  cookie: string
): Promise<{ success: boolean; error?: string }> {
  return postComment(postId, message, cookie)
}
