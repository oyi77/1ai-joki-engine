import { getFacebookAdapter } from './facebook-adapter-cache'

export async function facebookPostComment(
    postId: string,
    message: string,
    cookie: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const adapter = getFacebookAdapter(cookie)
        await adapter.connect()
        await adapter.commentOnPost(
            `https://www.facebook.com/${postId}`,
            message
        )
        return { success: true }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return { success: false, error: msg }
    }
}