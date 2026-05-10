/**
 * Facebook DM action — send a private message via Messenger.
 *
 * Extracted from blast-runner.ts for modularity and testability.
 */

import { sendPrivateMessage } from '../../adapters/providers/meta/facebook/chat'

/**
 * Send a Facebook private message (DM).
 * Used by the blast runner for 'chat' actions on Facebook.
 *
 * @param userId   Facebook user ID (numeric string)
 * @param message  Message text
 * @param cookie   Raw browser session cookie string
 * @returns { success: boolean, error?: string }
 */
export async function facebookSendDM(
  userId: string,
  message: string,
  cookie: string
): Promise<{ success: boolean; error?: string }> {
  return sendPrivateMessage(userId, message, cookie)
}
