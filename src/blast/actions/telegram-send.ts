/**
 * Telegram send action — send a Telegram message.
 *
 * Extracted from blast-runner.ts for modularity and testability.
 */

import { TelegramAdapter } from '../../adapters/providers/telegram/telegram'
import { getConfig } from '../../config/secrets'

/**
 * Send a Telegram message via the TelegramAdapter.
 * Used by the blast runner for Telegram actions.
 *
 * @param chatId   Telegram chat ID
 * @param message  Message text
 * @returns { success: boolean, error?: string }
 */
export async function telegramSendMessage(
  chatId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cfg = getConfig()
    const token = cfg.TELEGRAM_BOT_TOKEN
    if (!token) return { success: false, error: 'Telegram bot token not configured' }
    const adapter = new TelegramAdapter(token)
    await adapter.connect()
    const result = await adapter.sendMessage(chatId, message)
    await adapter.disconnect()
    return result
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Telegram error' }
  }
}
