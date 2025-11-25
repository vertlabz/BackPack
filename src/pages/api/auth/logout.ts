// src/pages/api/auth/logout.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import cookie from 'cookie'
import { clearRefreshTokenCookie } from '../../../lib/cookies'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const cookies = cookie.parse(req.headers.cookie || '')
  const cookieName = process.env.REFRESH_TOKEN_COOKIE_NAME || 'rtk'
  const tokenFromCookie = cookies[cookieName]
  if (tokenFromCookie) {
    // mark token used/invalidate it
    await prisma.token.updateMany({ where: { token: tokenFromCookie }, data: { used: true } })
  }
  clearRefreshTokenCookie(res)
  return res.json({ ok: true })
}
