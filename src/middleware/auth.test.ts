import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock config BEFORE importing the module
vi.mock('../config/secrets', () => ({
  getConfig: () => ({ JWT_SECRET: 'test-secret-key-at-least-32-chars' })
}))

import jwt from 'jsonwebtoken'
import { authMiddleware } from './auth'

describe('authMiddleware', () => {
  let req: any, res: any, next: any

  beforeEach(() => {
    req = { path: '/v1/accounts', headers: {} }
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() }
    next = vi.fn()
  })

  it('should skip auth for health endpoint', () => {
    req.path = '/health'
    authMiddleware(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('should return 401 when no Authorization header', () => {
    authMiddleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Unauthorized' }))
  })

  it('should return 401 for invalid token', () => {
    req.headers.authorization = 'Bearer invalid-token'
    authMiddleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('should call next() for valid token', () => {
    const token = jwt.sign({ userId: '123' }, 'test-secret-key-at-least-32-chars')
    req.headers.authorization = `Bearer ${token}`
    authMiddleware(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.user).toEqual(expect.objectContaining({ userId: '123' }))
  })
})
