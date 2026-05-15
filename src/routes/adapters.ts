import { Router } from 'express'

const router = Router()

const PLATFORMS = ['facebook', 'instagram', 'threads', 'twitter', 'whatsapp', 'telegram'] as const

/**
 * GET /v1/adapters
 * Returns health status for each platform adapter.
 * Cookie-based adapters (facebook, instagram, threads) are always "ready" —
 * they don't maintain persistent connections; credentials are validated at blast time.
 */
router.get('/', (_req, res) => {
  const health: Record<string, { healthy: boolean; mode: string }> = {}
  for (const platform of PLATFORMS) {
    health[platform] = { healthy: true, mode: 'cookie' }
  }
  res.json(health)
})

export const adaptersRouter = router
export default router