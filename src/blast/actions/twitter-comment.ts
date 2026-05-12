import { getTwitterAdapter } from '../finders/twitter-adapter-cache'

export async function twitterReply(
    tweetId: string,
    message: string,
    cookie: string
): Promise<{ success: boolean; error?: string }> {
    if (!cookie) return { success: false, error: 'Cookie not provided' }
    if (!tweetId) return { success: false, error: 'tweetId not provided' }
    if (!message) return { success: false, error: 'message not provided' }

    try {
        const adapter = getTwitterAdapter(cookie)
        await adapter.connect()
        return await adapter.replyToMessage(tweetId, message)
    } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
}
