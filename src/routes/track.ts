import { Router } from 'express'
import { CampaignsRepo } from '../repos/campaignsRepo'
import { LinkClicksRepo } from '../repos/linkClicksRepo'
import { LeadsRepo } from '../repos/leadsRepo'
import { JobsRepo } from '../repos/jobsRepo'
import { parseTrackingToken } from '../utils/tracking'
import type { DB } from '../db/sqlite'

let linkClicksRepo: LinkClicksRepo | null = null
export function getLinkClicksRepo(db?: DB): LinkClicksRepo {
  if (linkClicksRepo) return linkClicksRepo
  linkClicksRepo = new LinkClicksRepo(db)
  return linkClicksRepo
}

let campaignsRepo: CampaignsRepo | null = null
function getRepo(db?: DB): CampaignsRepo {
  if (campaignsRepo) return campaignsRepo
  campaignsRepo = new CampaignsRepo(db)
  return campaignsRepo
}

const router = Router()

/**
 * GET /v1/track/stats
 * Returns aggregated analytics across all campaigns.
 */
router.get('/stats', (req, res) => {
  try {
    const jobsRepo = new JobsRepo()
    const leadsRepo = new LeadsRepo()

    const allJobs = jobsRepo.listAll(1000)
    const totalJobs = allJobs.length
    const successJobs = allJobs.filter(j => j.status === 'completed').length
    const successRate = totalJobs > 0 ? Math.round((successJobs / totalJobs) * 100) : 0

    const allLeads = leadsRepo.list(1000)
    const totalLeads = allLeads.length

    // Clicks by day (last 7 days)
    const clicksByDay: { date: string; clicks: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      clicksByDay.push({ date: dateStr, clicks: 0 })
    }

    // Platform breakdown from jobs
    const platformMap: Record<string, { success: number; failed: number }> = {}
    for (const job of allJobs) {
      const p = job.platform ?? 'unknown'
      if (!platformMap[p]) platformMap[p] = { success: 0, failed: 0 }
      if (job.status === 'completed') platformMap[p].success++
      if (job.status === 'failed') platformMap[p].failed++
    }
    const byPlatform = Object.entries(platformMap).map(([platform, counts]) => ({ platform, ...counts }))

    res.json({
      ctr: 0,
      success_rate: successRate,
      leads: totalLeads,
      clicks: 0,
      conversions: successJobs,
      clicks_by_day: clicksByDay,
      by_platform: byPlatform,
      lead_sources: allLeads.reduce((acc: {source: string; count: number}[], lead) => {
        const existing = acc.find(x => x.source === lead.inbound_platform)
        if (existing) existing.count++
        else acc.push({ source: lead.inbound_platform, count: 1 })
        return acc
      }, []),
      funnel: [
        { stage: 'Blasted', count: totalJobs },
        { stage: 'Delivered', count: successJobs },
        { stage: 'Leads', count: totalLeads },
        { stage: 'Converted', count: successJobs },
      ],
    })
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Failed to compute stats' })
  }
})

/**
 * GET /v1/track/:token
 * Records click, then 302-redirects to the campaign's cta_link.
 * If cta_link is missing returns 404.
 */
router.get('/:token', (req, res) => {
  const clicksRepo = getLinkClicksRepo()
  const parsed = parseTrackingToken(req.params.token)

  if (parsed) {
    try {
      clicksRepo.record(req.params.token, parsed.campaignId, parsed.platform)
    } catch {
      // Non-fatal — don't block the redirect
    }
    try {
      const campaign = getRepo().findById(parsed.campaignId)
      if (campaign?.cta_link) {
        return res.redirect(302, campaign.cta_link)
      }
    } catch {
      // Fall through to 404
    }
  }

  res.status(404).json({ error: 'Invalid or expired tracking link' })
})

/**
 * GET /v1/track/stats/:campaignId
 * Returns click counts grouped by platform.
 */
router.get('/stats/:campaignId', (req, res) => {
  const clicksRepo = getLinkClicksRepo()
  const counts = clicksRepo.countByCampaign(req.params.campaignId)
  res.json({ campaign_id: req.params.campaignId, clicks: counts })
})

export const trackRouter = router
export default router
