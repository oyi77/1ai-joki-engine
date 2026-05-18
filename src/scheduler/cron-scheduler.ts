import { JobQueue } from '../queue/job-queue'
import { getDb } from '../db/sqlite'
import { TemplatesRepo } from '../repos/templatesRepo'

export interface ScheduleEntry {
  id: string
  cron: string
  template_id: string
  account_id: string
  to?: string
  platform: string
  enabled: boolean
  lastTriggeredKey?: string
  created_at: string
  updated_at: string
}

// In-memory cache of lastTriggeredKey (not persisted — resets on restart)
const lastTriggeredMap: Map<string, string> = new Map()

export function resetSchedules() {
  lastTriggeredMap.clear()
}

export function listSchedules(): ScheduleEntry[] {
  try {
    const db = getDb()
    const rows = db
      .prepare(
        'SELECT id, cron_expr as cron, template_id, account_id, enabled, created_at FROM schedules ORDER BY created_at DESC'
      )
      .all() as Record<string, unknown>[]
    return rows.map((r) => ({
      id: r.id as string,
      cron: r.cron as string,
      template_id: r.template_id as string,
      account_id: r.account_id as string,
      platform: 'default',
      enabled: !!r.enabled,
      lastTriggeredKey: lastTriggeredMap.get(r.id as string),
      created_at: r.created_at as string,
      updated_at: r.created_at as string,
    }))
  } catch {
    return []
  }
}

export function validateCronExpression(cron: string): boolean {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return false
  return parts.every((part, idx) => validateCronPart(part, idx))
}

function validateCronPart(part: string, index: number): boolean {
  if (part === '*') return true
  if (/^\*\/\d+$/.test(part)) return true
  if (/^\d+$/.test(part)) {
    const value = Number(part)
    const ranges = [
      [0, 59],
      [0, 23],
      [1, 31],
      [1, 12],
      [0, 7],
    ] as const
    const [min, max] = ranges[index]
    return value >= min && value <= max
  }
  return false
}

function cronMatchesDate(cron: string, now: Date): boolean {
  const [minute, hour, day, month, weekday] = cron.trim().split(/\s+/)
  const values = [now.getMinutes(), now.getHours(), now.getDate(), now.getMonth() + 1, now.getDay()]
  const fields = [minute, hour, day, month, weekday]
  return fields.every((field, idx) => matchesField(field, values[idx]))
}

function matchesField(field: string, value: number): boolean {
  if (field === '*') return true
  if (/^\*\/\d+$/.test(field)) {
    const step = Number(field.slice(2))
    return value % step === 0
  }
  return Number(field) === value
}

export function createSchedule(input: {
  cron: string
  template_id: string
  account_id: string
  to?: string
  platform?: string
}): ScheduleEntry {
  const id = `sch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const now = new Date().toISOString()
  const db = getDb()
  db.prepare(
    'INSERT INTO schedules (id, cron_expr, template_id, account_id, enabled, created_at) VALUES (?, ?, ?, ?, 1, ?)'
  ).run(id, input.cron, input.template_id, input.account_id, now)
  return {
    id,
    cron: input.cron,
    template_id: input.template_id,
    account_id: input.account_id,
    to: input.to,
    platform: input.platform || 'default',
    enabled: true,
    created_at: now,
    updated_at: now,
  }
}

export function updateSchedule(
  id: string,
  patch: Partial<Pick<ScheduleEntry, 'enabled' | 'cron' | 'platform'>>
): ScheduleEntry | null {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM schedules WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!existing) return null

  const sets: string[] = []
  const params: unknown[] = []
  if (patch.cron !== undefined) {
    sets.push('cron_expr = ?')
    params.push(patch.cron)
  }
  if (patch.enabled !== undefined) {
    sets.push('enabled = ?')
    params.push(patch.enabled ? 1 : 0)
  }
  if (sets.length > 0) {
    params.push(id)
    db.prepare(`UPDATE schedules SET ${sets.join(', ')} WHERE id = ?`).run(...params)
  }

  const row = db
    .prepare(
      'SELECT id, cron_expr as cron, template_id, account_id, enabled, created_at FROM schedules WHERE id = ?'
    )
    .get(id) as Record<string, unknown>
  return {
    id: row.id as string,
    cron: row.cron as string,
    template_id: row.template_id as string,
    account_id: row.account_id as string,
    platform: patch.platform || 'default',
    enabled: !!row.enabled,
    created_at: row.created_at as string,
    updated_at: row.created_at as string,
  }
}

export function deleteSchedule(id: string): boolean {
  const db = getDb()
  const res = db.prepare('DELETE FROM schedules WHERE id = ?').run(id)
  lastTriggeredMap.delete(id)
  return res.changes > 0
}

export function findScheduleById(id: string): ScheduleEntry | undefined {
  try {
    const db = getDb()
    const row = db
      .prepare(
        'SELECT id, cron_expr as cron, template_id, account_id, enabled, created_at FROM schedules WHERE id = ?'
      )
      .get(id) as Record<string, unknown> | undefined
    if (!row) return undefined
    return {
      id: row.id as string,
      cron: row.cron as string,
      template_id: row.template_id as string,
      account_id: row.account_id as string,
      platform: 'default',
      enabled: !!row.enabled,
      lastTriggeredKey: lastTriggeredMap.get(row.id as string),
      created_at: row.created_at as string,
      updated_at: row.created_at as string,
    }
  } catch {
    return undefined
  }
}

export async function runSchedulerTick(queue: Pick<JobQueue, 'enqueuePostJob'>, now = new Date()) {
  const schedules = listSchedules()
  const templatesRepo = new TemplatesRepo()
  for (const schedule of schedules) {
    if (!schedule.enabled) continue
    if (!validateCronExpression(schedule.cron)) continue
    if (!cronMatchesDate(schedule.cron, now)) continue
    const minuteKey = now.toISOString().slice(0, 16)
    if (lastTriggeredMap.get(schedule.id) === minuteKey) continue
    lastTriggeredMap.set(schedule.id, minuteKey)

    // Load actual template content instead of placeholder
    let message = `Scheduled template ${schedule.template_id}`
    try {
      const template = templatesRepo.findById(schedule.template_id)
      if (template) {
        message = template.content
      }
    } catch {
      // Fall back to placeholder if template not found
    }

    await queue.enqueuePostJob({
      platform: schedule.platform,
      to: schedule.to || schedule.account_id,
      message,
    } as any)
  }
}

let intervalHandle: NodeJS.Timeout | null = null

export function startCronScheduler(queue: Pick<JobQueue, 'enqueuePostJob'>) {
  if (intervalHandle) return intervalHandle
  intervalHandle = setInterval(() => {
    void runSchedulerTick(queue).catch(() => undefined)
  }, 60_000)
  return intervalHandle
}

export function stopCronScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}
