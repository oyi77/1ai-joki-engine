/**
 * Blast Route — POST /v1/blast/run
 *
 * Triggers a sequential blast run against a single platform.
 * Only one blast can run at a time (global lock).
 */

import { Router, Request, Response } from 'express'
import { runBlast, isBlastRunning } from '../blast/blast-runner'
import type { BlastPlatform } from '../blast/types'

const VALID_PLATFORMS: BlastPlatform[] = ['facebook', 'instagram', 'twitter', 'threads', 'whatsapp', 'telegram']

export function createBlastRouter() {
  const router = Router()

  /**
   * POST /v1/blast/run
   *
   * Body: {
   *   platform: 'facebook' | 'instagram' | 'twitter' | 'threads' | 'whatsapp'
   *   accountId: string
   *   message: string
   *   maxActions?: number   // default 30, capped at 30
   *   targets?: string[]    // optional, for whatsapp phone numbers or manual targets
   *   searchQuery?: string  // optional, for platform finders
   * }
   */
  router.post('/run', async (req: Request, res: Response) => {
    const { platform, accountId, message, maxActions, targets, searchQuery } = req.body || {}

    // Validation
    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      return res.status(400).json({
        error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}`,
      })
    }
    if (!accountId || typeof accountId !== 'string') {
      return res.status(400).json({ error: 'accountId is required' })
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required' })
    }
    if (platform === 'whatsapp' && (!targets || !Array.isArray(targets) || targets.length === 0)) {
      return res.status(400).json({ error: 'WhatsApp requires targets (phone numbers)' })
    }

    // Check if another blast is already running
    if (isBlastRunning()) {
      return res.status(409).json({ error: 'Another blast is already running. Wait for it to finish.' })
    }

    try {
      const result = await runBlast({
        platform: platform as BlastPlatform,
        accountId,
        message: message.trim(),
        maxActions: maxActions ? Math.min(Number(maxActions), 30) : 30,
        targets,
        searchQuery,
      })

      return res.status(200).json(result)
     } catch (e: unknown) {
       const errorMsg = e instanceof Error ? e.message : 'Blast execution failed'
       return res.status(500).json({ error: errorMsg })
     }
  })

  /**
   * GET /v1/blast/status
   *
   * Returns whether a blast is currently running.
   */
  router.get('/status', (_req: Request, res: Response) => {
    res.json({ running: isBlastRunning() })
  })

  return router
}

export const blastRouter = createBlastRouter()
export default blastRouter
