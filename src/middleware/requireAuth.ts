// src/middleware/requireAuth.ts
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import { verifyAccessToken } from '../lib/auth'

export function requireAuth(handler: NextApiHandler) {
  return async (req: NextApiRequest & { user?: { userId: string } }, res: NextApiResponse) => {
    try {
      const auth = req.headers.authorization
      if (!auth) return res.status(401).json({ error: 'No authorization header' })

      const [scheme, token] = auth.split(' ')
      if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Invalid authorization format' })
      }

      const payload = verifyAccessToken(token)
      req.user = { userId: payload.userId }

      return handler(req, res)
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
  }
}
