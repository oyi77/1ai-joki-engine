import { TwitterCLIAdapter } from '../../adapters/providers/twitter/twitter-cli-adapter'
import { createHash } from 'crypto'

interface CachedAdapter {
    adapter: TwitterCLIAdapter
    lastUsed: number
}

const ADAPTER_TTL_MS = 3 * 60 * 1000

const cache = new Map<string, CachedAdapter>()

function cacheKey(cookie: string): string {
    return createHash('sha256').update(cookie.slice(0, 100)).digest('hex')
}

export function getTwitterAdapter(
    cookie: string,
    opts?: { logger?: (msg: string) => void }
): TwitterCLIAdapter {
    const key = cacheKey(cookie)
    const cached = cache.get(key)

    if (cached && Date.now() - cached.lastUsed < ADAPTER_TTL_MS) {
        cached.lastUsed = Date.now()
        return cached.adapter
    }

    if (cached) {
        cached.adapter.disconnect().catch(() => {})
        cache.delete(key)
    }

    const adapter = new TwitterCLIAdapter(cookie, {
        logger: opts?.logger,
    })
    cache.set(key, { adapter, lastUsed: Date.now() })
    return adapter
}

export async function disconnectTwitterAdapter(cookie: string): Promise<void> {
    const key = cacheKey(cookie)
    const cached = cache.get(key)
    if (!cached) return
    try {
        await cached.adapter.disconnect()
    } catch {}
    cache.delete(key)
}

setInterval(() => {
    const now = Date.now()
    for (const [key, cached] of cache.entries()) {
        if (now - cached.lastUsed > ADAPTER_TTL_MS) {
            cached.adapter.disconnect().catch(() => {})
            cache.delete(key)
        }
    }
}, ADAPTER_TTL_MS)
