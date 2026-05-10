import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import http from 'http'
import jwt from 'jsonwebtoken'
import { resetBlastState } from '../blast/blast-runner'
import express from 'express'
import cors from 'cors'
import { authMiddleware } from '../middleware'
import { blastRouter } from '../routes/blast'

// Mock all adapter dependencies
vi.mock('../adapters/providers/meta/facebook/comment', () => ({
  postComment: vi.fn().mockResolvedValue({ success: true })
}))
vi.mock('../adapters/providers/meta/facebook/chat', () => ({
  sendPrivateMessage: vi.fn().mockResolvedValue({ success: true })
}))
vi.mock('../adapters/providers/twitter/dm', () => ({
  sendTwitterDM: vi.fn().mockResolvedValue({ success: true })
}))
vi.mock('./actions/instagram-comment', () => ({
  instagramPostComment: vi.fn().mockResolvedValue({ success: true })
}))
vi.mock('./actions/instagram-dm', () => ({
  sendInstagramDM: vi.fn().mockResolvedValue({ success: true })
}))
vi.mock('./actions/facebook-comment', () => ({
  facebookPostComment: vi.fn().mockResolvedValue({ success: true })
}))
vi.mock('./actions/facebook-dm', () => ({
  facebookSendDM: vi.fn().mockResolvedValue({ success: true })
}))
vi.mock('./actions/twitter-comment', () => ({
  twitterReply: vi.fn().mockResolvedValue({ success: true })
}))
vi.mock('./actions/threads-comment', () => ({
  threadsReply: vi.fn().mockResolvedValue({ success: true })
}))
vi.mock('./actions/whatsapp-send', () => ({
  whatsappSendMessage: vi.fn().mockResolvedValue({ success: true })
}))
vi.mock('./actions/telegram-send', () => ({
  telegramSendMessage: vi.fn().mockResolvedValue({ success: true })
}))
vi.mock('../repos/accountsRepo', () => ({
  AccountsRepo: vi.fn().mockImplementation(() => ({
    findById: vi.fn().mockReturnValue({
      id: 'test-acc',
      platform: 'facebook',
      credentials_encrypted: 'c_user=123; xs=abc'
    })
  }))
}))
vi.mock('../utils/crypto', () => ({
  decrypt: vi.fn().mockImplementation((v: string) => v)
}))
vi.mock('../adapters/providers/meta/facebook/facebook-finder', () => ({
  findFacebookTargets: vi.fn().mockResolvedValue({ postIds: ['post1'], userIds: [] })
}))

describe('Blast E2E', () => {
  let server: http.Server
  let baseUrl: string
  const JWT_SECRET = 'test-secret-key-at-least-32-chars'

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET
    process.env.DATABASE_PATH = ':memory:'
    process.env.API_PORT = '0'
    process.env.API_HOST = '127.0.0.1'
    process.env.DASHBOARD_PORT = '3003'
    process.env.LOG_LEVEL = 'silent'

    const app = express()
    app.use(cors())
    app.use(express.json())
    app.get('/v1/health', (_req, res) => res.json({ status: 'ok' }))
    app.use('/v1', authMiddleware)
    app.use('/v1/blast', blastRouter)

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as { port: number }).port
        baseUrl = `http://127.0.0.1:${port}/v1`
        resolve()
      })
    })
  })

  afterAll(async () => {
    resetBlastState()
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()
    resetBlastState()
  })

  it('should trigger a Facebook comment blast via HTTP', async () => {
    const token = jwt.sign({ userId: 'test' }, JWT_SECRET)
    const res = await fetch(`${baseUrl}/blast/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        platform: 'facebook',
        accountId: 'test-acc',
        message: 'Test blast message',
        maxActions: 3,
        searchQuery: 'test-query'
      })
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.platform).toBe('facebook')
    expect(body.total).toBeGreaterThanOrEqual(0)
    expect(body.log).toBeDefined()
    expect(Array.isArray(body.log)).toBe(true)
  }, 10000)

  it('should return 409 when blast already running', async () => {
    // First blast should work
    resetBlastState()
    const token = jwt.sign({ userId: 'test' }, JWT_SECRET)

    // Start first blast (it will run quickly with mocks)
    await fetch(`${baseUrl}/blast/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        platform: 'facebook',
        accountId: 'test-acc',
        message: 'Test',
        maxActions: 1
      })
    })

    // Check status endpoint
    const statusRes = await fetch(`${baseUrl}/blast/status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const statusBody = await statusRes.json()
    expect(statusRes.status).toBe(200)
    expect(statusBody).toHaveProperty('running')
  }, 10000)

  it('should return 400 for invalid platform', async () => {
    const token = jwt.sign({ userId: 'test' }, JWT_SECRET)
    const res = await fetch(`${baseUrl}/blast/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        platform: 'invalid-platform',
        accountId: 'test-acc',
        message: 'Test'
      })
    })
    expect(res.status).toBe(400)
  }, 10000)

  it('should return 400 when missing required fields', async () => {
    const token = jwt.sign({ userId: 'test' }, JWT_SECRET)
    const res = await fetch(`${baseUrl}/blast/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({})
    })
    expect(res.status).toBe(400)
  }, 10000)

  it('should return 401 for missing token', async () => {
    const res = await fetch(`${baseUrl}/blast/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        platform: 'facebook',
        accountId: 'test-acc',
        message: 'Test'
      })
    })
    expect(res.status).toBe(401)
  }, 10000)

  it('should return 400 for WhatsApp without targets', async () => {
    const token = jwt.sign({ userId: 'test' }, JWT_SECRET)
    const res = await fetch(`${baseUrl}/blast/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        platform: 'whatsapp',
        accountId: 'test-acc',
        message: 'Test'
      })
    })
    expect(res.status).toBe(400)
  }, 10000)
})
