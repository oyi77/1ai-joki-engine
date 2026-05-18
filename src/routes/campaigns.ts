import { Router } from 'express'
import { CampaignsRepo } from '../repos/campaignsRepo'
import { JobsRepo } from '../repos/jobsRepo'
import type { JobQueue } from '../queue/job-queue'
import { generateTrackingToken } from '../utils/tracking'
import { getConfig } from '../config/secrets'
import { getDb } from '../db/sqlite'
import type { DB } from '../db/sqlite'
import type { PostJob } from '../types/jobs'

let campaignsRepo: CampaignsRepo | null = null
export function getCampaignsRepo(db?: DB): CampaignsRepo {
  if (campaignsRepo) return campaignsRepo
  campaignsRepo = new CampaignsRepo(db)
  return campaignsRepo
}

export function createCampaignsRouter(queue: Pick<JobQueue, 'enqueuePostJob'>) {
  const router = Router()

  /**
   * POST /v1/campaigns
   * Body: { name, content, cta_link?, platforms: string[] }
   */
  router.post('/', (req, res) => {
    const { name, content, cta_link, platforms } = req.body ?? {}
    if (!name || !content) {
      return res.status(400).json({ error: 'Missing required fields: name, content' })
    }
    if (!Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ error: 'platforms must be a non-empty array' })
    }
    const repo = getCampaignsRepo()
    const campaign = repo.create({ name, content, cta_link, platforms })
    res.status(201).json(campaign)
  })

  /**
   * GET /v1/campaigns
   */
  router.get('/', (_req, res) => {
    const repo = getCampaignsRepo()
    const campaigns = repo.list()
    const result = campaigns.map((c) => ({
      ...c,
      posts: repo.listPosts(c.id),
    }))
    res.json(result)
  })

  /**
   * GET /v1/campaigns/:id
   */
  router.get('/:id', (req, res) => {
    const repo = getCampaignsRepo()
    const campaign = repo.findById(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })
    const posts = repo.listPosts(campaign.id)
    res.json({ ...campaign, posts })
  })

  /**
   * POST /v1/campaigns/:id/blast
   * Body: { account_ids: { twitter?: string, threads?: string, instagram?: string, facebook?: string, ... } }
   *
   * For each platform in campaign.platforms, enqueues a PostJob.
   * The message is: campaign.content + tracking link for each platform.
   */
  router.post('/:id/blast', async (req, res) => {
    const repo = getCampaignsRepo()
    const campaign = repo.findById(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

    const accountIds: Record<string, string> = req.body?.account_ids ?? {}

    // Build tracking base URL
    let apiBase: string
    try {
      const cfg = getConfig()
      apiBase = `http://${cfg.API_HOST}:${cfg.API_PORT}`
    } catch {
      apiBase = 'http://localhost:3000'
    }

    const posts: Array<{ platform: string; job_id: string }> = []
    const errors: Array<{ platform: string; error: string }> = []

    for (const platform of campaign.platforms) {
      const accountId = accountIds[platform]
      if (!accountId) {
        errors.push({ platform, error: 'account_id not provided' })
        continue
      }
      try {
        // Build tracking URL for this campaign+platform
        const token = generateTrackingToken(campaign.id, platform)
        const trackUrl = `${apiBase}/v1/track/${token}`
        const message = campaign.cta_link
          ? `${campaign.content}\n\n${trackUrl}`
          : campaign.content

         const jobId = await queue.enqueuePostJob({
           platform,
           to: accountId,
           message,
           account_id: accountId,
         } as unknown as Omit<PostJob, 'id' | 'type'> & { platform: string })

         // Persist to DB so dashboard GET /v1/jobs can display it
         try {
           const jobsRepo = new JobsRepo()
           const db = jobsRepo['db'] ?? require('../db/sqlite').getDb()
           db.prepare(
             `INSERT OR IGNORE INTO jobs (id, account_id, platform, type, payload, attempts, max_attempts, status) VALUES (?, ?, ?, ?, ?, 0, 5, 'pending')`
           ).run(jobId, accountId, platform, 'post', JSON.stringify({ message, campaign_id: campaign.id }))
         } catch { /* non-fatal — queue still works */ }

         repo.addPost(campaign.id, platform, jobId)
         posts.push({ platform, job_id: jobId })
       } catch (e: unknown) {
         const errorMsg = e instanceof Error ? e.message : 'enqueue failed'
         errors.push({ platform, error: errorMsg })
       }
    }

    repo.updateStatus(campaign.id, 'scheduled')
    res.status(202).json({ campaign_id: campaign.id, posts, errors })
  })

  /**
   * PUT /v1/campaigns/:id
   * Body: { name?, content?, cta_link?, platforms? }
   */
  router.put('/:id', (req, res) => {
    const repo = getCampaignsRepo()
    const existing = repo.findById(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Campaign not found' })

    const { name, content, cta_link, platforms } = req.body ?? {}
    if (platforms && (!Array.isArray(platforms) || platforms.length === 0)) {
      return res.status(400).json({ error: 'platforms must be a non-empty array' })
    }

    const db = repo.db ?? getDb()
    const sets: string[] = []
    const params: unknown[] = []
    if (name !== undefined) { sets.push('name = ?'); params.push(name) }
    if (content !== undefined) { sets.push('content = ?'); params.push(content) }
    if (cta_link !== undefined) { sets.push('cta_link = ?'); params.push(cta_link) }
    if (platforms !== undefined) { sets.push('platforms = ?'); params.push(JSON.stringify(platforms)) }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    params.push(req.params.id)
    db.prepare(`UPDATE campaigns SET ${sets.join(', ')} WHERE id = ?`).run(...params)

    const updated = repo.findById(req.params.id)
    res.json(updated)
  })

  /**
   * DELETE /v1/campaigns/:id
   */
  router.delete('/:id', (req, res) => {
    const repo = getCampaignsRepo()
    const ok = repo.delete(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Campaign not found' })
    res.json({ message: 'Campaign deleted' })
  })

  return router
}
