import { DB, getDb } from '../db/sqlite'

export type LinkClickRow = {
  id: number
  token: string
  campaign_id?: string
  platform?: string
  clicked_at: string
}

export type ClickCount = {
  platform: string
  count: number
}

export class LinkClicksRepo {
  db?: DB

  constructor(db?: DB) {
    this.db = db
  }

  private getDatabase(): DB {
    return this.db ?? getDb()
  }

  record(token: string, campaignId?: string, platform?: string): void {
    const db = this.getDatabase()
    db.prepare(
      `INSERT INTO link_clicks (token, campaign_id, platform) VALUES (?, ?, ?)`
    ).run(token, campaignId ?? null, platform ?? null)
  }

  countByCampaign(campaignId: string): ClickCount[] {
    const db = this.getDatabase()
    const rows = db
      .prepare(
        `SELECT platform, COUNT(*) as count FROM link_clicks WHERE campaign_id = ? GROUP BY platform`
      )
      .all(campaignId) as Record<string, unknown>[]
    return rows.map((r) => ({ platform: (r.platform ?? 'unknown') as string, count: r.count as number }))
  }

  listRecent(campaignId: string, limit = 50): LinkClickRow[] {
    const db = this.getDatabase()
    return db
      .prepare(
        `SELECT * FROM link_clicks WHERE campaign_id = ? ORDER BY clicked_at DESC LIMIT ?`
      )
      .all(campaignId, limit) as LinkClickRow[]
  }

  listAll(limit = 1000): LinkClickRow[] {
    const db = this.getDatabase()
    return db
      .prepare(`SELECT * FROM link_clicks ORDER BY clicked_at DESC LIMIT ?`)
      .all(limit) as LinkClickRow[]
  }
}
