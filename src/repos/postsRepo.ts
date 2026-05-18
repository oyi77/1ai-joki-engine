import { DB, getDb } from '../db/sqlite'

export interface Post {
  id: string
  campaign_id?: string
  platform: string
  content: string
  cta_link?: string
  scheduled_at: string
  cron_expression?: string
  status: 'pending' | 'queued' | 'posted' | 'failed' | 'submitted'
  job_ids?: string
  account_id?: string
  created_at: string
  updated_at: string
}

export class PostsRepo {
  db?: DB

  constructor(db?: DB) {
    this.db = db
  }

  private getDatabase(): DB {
    return this.db ?? getDb()
  }

  create(post: Omit<Post, 'id' | 'created_at' | 'updated_at' | 'status'>): Post {
    const id = `post_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const now = new Date().toISOString()
    const stmt = this.getDatabase().prepare(`
      INSERT INTO posts (id, campaign_id, platform, content, cta_link, scheduled_at, cron_expression, status, job_ids, account_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, ?, ?)
    `)
    stmt.run(
      id,
      post.campaign_id ?? null,
      post.platform,
      post.content,
      post.cta_link ?? null,
      post.scheduled_at,
      post.cron_expression ?? null,
      post.account_id ?? null,
      now,
      now
    )
    return this.findById(id)!
  }

  findById(id: string): Post | undefined {
    return this.getDatabase().prepare('SELECT * FROM posts WHERE id = ?').get(id) as Post | undefined
  }

  findAll(): Post[] {
    return this.getDatabase().prepare('SELECT * FROM posts ORDER BY scheduled_at DESC').all() as Post[]
  }

  findByCampaign(campaignId: string): Post[] {
    return this.getDatabase().prepare('SELECT * FROM posts WHERE campaign_id = ? ORDER BY scheduled_at DESC').all(campaignId) as Post[]
  }

  update(id: string, patch: Partial<Pick<Post, 'content' | 'cta_link' | 'scheduled_at' | 'cron_expression' | 'account_id'>>): boolean {
    const now = new Date().toISOString()
    const fields: string[] = []
    const values: unknown[] = []
    if (patch.content !== undefined) { fields.push('content = ?'); values.push(patch.content) }
    if (patch.cta_link !== undefined) { fields.push('cta_link = ?'); values.push(patch.cta_link) }
    if (patch.scheduled_at !== undefined) { fields.push('scheduled_at = ?'); values.push(patch.scheduled_at) }
    if (patch.cron_expression !== undefined) { fields.push('cron_expression = ?'); values.push(patch.cron_expression) }
    if (patch.account_id !== undefined) { fields.push('account_id = ?'); values.push(patch.account_id) }
    if (fields.length === 0) return false
    fields.push('updated_at = ?')
    values.push(now, id)
    const result = this.getDatabase().prepare(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return result.changes > 0
  }

  updateStatus(id: string, status: Post['status'], jobIds?: string[]): boolean {
    const now = new Date().toISOString()
    const jobIdsStr = jobIds ? JSON.stringify(jobIds) : undefined
    const result = this.getDatabase().prepare('UPDATE posts SET status = ?, job_ids = ?, updated_at = ? WHERE id = ?').run(status, jobIdsStr, now, id)
    return result.changes > 0
  }

  delete(id: string): boolean {
    const result = this.getDatabase().prepare('DELETE FROM posts WHERE id = ?').run(id)
    return result.changes > 0
  }

  atomicMarkPostAndUpdateCampaign(jobId: string, status: Post['status']): void {
    const post = this.getDatabase().prepare(
      'SELECT * FROM posts WHERE job_ids IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(posts.job_ids) WHERE json_each.value = ?)'
    ).get(jobId) as Post | undefined
    if (!post) return
    this.getDatabase().prepare('UPDATE posts SET status = ?, updated_at = ? WHERE id = ?').run(status, new Date().toISOString(), post.id)
    if (post.campaign_id) {
      const { CampaignsRepo } = require('./campaignsRepo')
      const campaignsRepo = new CampaignsRepo()
      if (!campaignsRepo.hasPendingPosts(post.campaign_id)) {
        campaignsRepo.updateStatus(post.campaign_id, 'completed')
      }
    }
  }
}
