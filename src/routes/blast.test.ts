import { describe, it, expect, beforeEach, vi } from 'vitest'
import express from 'express'
import request from 'supertest'

// Mock blast runner to avoid real execution
vi.mock('../blast/blast-runner', () => {
  const running = false
  return {
    runBlast: vi.fn().mockImplementation(async (config: any) => {
      if (running) {
        return {
          platform: config.platform,
          total: 0,
          success: 0,
          failed: 0,
          log: [{ index: 0, targetId: '', action: 'comment', ok: false, error: 'Another blast is already running' }],
        }
      }
      return {
        platform: config.platform,
        total: 3,
        success: 2,
        failed: 1,
        log: [
          { index: 1, targetId: 't1', action: 'comment', ok: true },
          { index: 2, targetId: 't2', action: 'chat', ok: true },
          { index: 3, targetId: 't3', action: 'comment', ok: false, error: 'simulated' },
        ],
      }
    }),
    isBlastRunning: vi.fn().mockReturnValue(false),
  }
})

import { createBlastRouter } from '../routes/blast'

function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use('/v1/blast', createBlastRouter())
  return app
}

describe('POST /v1/blast/run', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 for missing platform', async () => {
    const app = createTestApp()
    const res = await request(app)
      .post('/v1/blast/run')
      .send({ accountId: 'acc1', message: 'Hello' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('Invalid platform')
  })

  it('returns 400 for invalid platform', async () => {
    const app = createTestApp()
    const res = await request(app)
      .post('/v1/blast/run')
      .send({ platform: 'tiktok', accountId: 'acc1', message: 'Hello' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('Invalid platform')
  })

  it('returns 400 for missing accountId', async () => {
    const app = createTestApp()
    const res = await request(app)
      .post('/v1/blast/run')
      .send({ platform: 'facebook', message: 'Hello' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('accountId')
  })

  it('returns 400 for missing message', async () => {
    const app = createTestApp()
    const res = await request(app)
      .post('/v1/blast/run')
      .send({ platform: 'facebook', accountId: 'acc1' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('message')
  })

  it('returns 400 for WhatsApp without targets', async () => {
    const app = createTestApp()
    const res = await request(app)
      .post('/v1/blast/run')
      .send({ platform: 'whatsapp', accountId: 'acc1', message: 'Hello' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('targets')
  })

  it('returns 200 with BlastResult on successful blast', async () => {
    const app = createTestApp()
    const res = await request(app)
      .post('/v1/blast/run')
      .send({ platform: 'facebook', accountId: 'acc1', message: 'Hello world' })
    expect(res.status).toBe(200)
    expect(res.body.platform).toBe('facebook')
    expect(res.body.total).toBe(3)
    expect(res.body.success).toBe(2)
    expect(res.body.failed).toBe(1)
    expect(res.body.log).toHaveLength(3)
  })

  it('accepts all valid platforms', async () => {
    const app = createTestApp()
    for (const platform of ['facebook', 'instagram', 'twitter', 'threads']) {
      const res = await request(app)
        .post('/v1/blast/run')
        .send({ platform, accountId: 'acc1', message: 'Test' })
      expect(res.status).toBe(200)
    }
  })

  it('accepts WhatsApp with targets', async () => {
    const app = createTestApp()
    const res = await request(app)
      .post('/v1/blast/run')
      .send({
        platform: 'whatsapp',
        accountId: 'acc1',
        message: 'Hello',
        targets: ['6281234567890'],
      })
    expect(res.status).toBe(200)
    expect(res.body.platform).toBe('whatsapp')
  })
})

describe('GET /v1/blast/status', () => {
  it('returns running status', async () => {
    const app = createTestApp()
    const res = await request(app).get('/v1/blast/status')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('running')
    expect(typeof res.body.running).toBe('boolean')
  })
})
