import { getFacebookAdapter } from './facebook-adapter-cache'

export async function facebookSendDM(
    userId: string,
    message: string,
    cookie: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const adapter = getFacebookAdapter(cookie)
        await adapter.connect()
        const result = await adapter.sendMessage(userId, message)
        return result
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return { success: false, error: msg }
    }
}