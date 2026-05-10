import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { getConfig } from '../config/secrets'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/health') return next()

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_MISSING_TOKEN' })
  }

  const token = authHeader.substring(7)
  try {
    const cfg = getConfig()
    const decoded = jwt.verify(token, cfg.JWT_SECRET)
    ;(req as any).user = decoded
    next()
  } catch (e: any) {
    return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_INVALID_TOKEN' })
  }
}
