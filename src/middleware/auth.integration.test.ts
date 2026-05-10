import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'
import { initDatabase, runMigrations, closeDatabase } from '../db/sqlite'
import { accountsRouter } from '../routes/accounts'
import { authMiddleware } from './auth'
import cors from 'cors'

vi.mock('../config/secrets', () => ({
  getConfig: () => ({ JWT_SECRET: 'test-secret-key-at-least-32-chars' })
}))

describe('JWT Auth Integration', () => {
  let server: express.Application

  beforeAll(() => {
    initDatabase(':memory:')
    runMigrations('./migrations')

    server = express()
    server.use(cors())
    server.use(express.json())
    server.use('/v1', authMiddleware)
    server.get('/v1/health', (_req, res) => res.json({ status: 'ok' }))
    server.use('/v1/accounts', accountsRouter)

    server.listen(0)
  })

  afterAll(() => {
    closeDatabase()
  })

  it('should allow access to /health without auth', async () => {
    const res = await request(server).get('/v1/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  it('should return 401 for protected routes without token', async () => {
    const res = await request(server).get('/v1/accounts')
    expect(res.status).toBe(401)
    expect(res.body).toEqual(expect.objectContaining({ error: 'Unauthorized' }))
  })

  it('should return 401 for protected routes with invalid token', async () => {
    const res = await request(server)
      .get('/v1/accounts')
      .set('Authorization', 'Bearer invalid-token-here')
    expect(res.status).toBe(401)
    expect(res.body).toEqual(expect.objectContaining({ error: 'Unauthorized' }))
  })

  it('should allow access with valid JWT token', async () => {
    const JWT_SECRET = 'test-secret-key-at-least-32-chars'
    const token = jwt.sign({ userId: 'test-user' }, JWT_SECRET)
    const res = await request(server)
      .get('/v1/accounts')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).not.toBe(401)
    expect(Array.isArray(res.body)).toBe(true)
  })
})
