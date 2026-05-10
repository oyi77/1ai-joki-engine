/**
 * WhatsApp send action — send a WhatsApp message.
 *
 * Extracted from blast-runner.ts for modularity and testability.
*/
import { WhatsAppAdapter } from '../../adapters/providers/meta/Whatsapp/whatsapp'

/**
 * Send a WhatsApp message via the WhatsAppAdapter.
 * Used by the blast runner for WhatsApp actions.
 *
 * @param phoneNumber  WhatsApp phone number (with country code)
 * @param message      Message text
 * @returns { success: boolean, error?: string }
 */
export async function whatsappSendMessage(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adapter = new WhatsAppAdapter()
    await adapter.connect()
    const result = await adapter.sendMessage(phoneNumber, message)
    await adapter.disconnect()
    return result
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'WhatsApp error' }
  }
}
