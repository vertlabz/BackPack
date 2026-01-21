// src/pages/api/auth/refresh.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { signAccessToken } from '../../../lib/auth'
import { setRefreshTokenCookie, clearRefreshTokenCookie, parseCookieHeader } from '../../../lib/cookies'
import crypto from 'crypto'

const REFRESH_EXPIRES_DAYS = Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 30)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const cookies = parseCookieHeader(req.headers.cookie)
  const cookieName = process.env.REFRESH_TOKEN_COOKIE_NAME || 'rtk'
  const tokenFromCookie = cookies[cookieName]
  if (!tokenFromCookie) return res.status(401).json({ error: 'No refresh token' })

  // Find token in DB
  const tokenRecord = await prisma.token.findUnique({ where: { token: tokenFromCookie } })
  if (!tokenRecord) {
    clearRefreshTokenCookie(res)
    return res.status(401).json({ error: 'Invalid refresh token' })
  }

  if (tokenRecord.used) {
    // Token reuse attempt: revoke all tokens for this user (optional)
    await prisma.token.updateMany({ where: { userId: tokenRecord.userId, type: 'REFRESH' }, data: { used: true } })
    clearRefreshTokenCookie(res)
    return res.status(401).json({ error: 'Refresh token already used' })
  }

  if (tokenRecord.expiresAt < new Date()) {
    clearRefreshTokenCookie(res)
    return res.status(401).json({ error: 'Refresh token expired' })
  }

  // Rotate: mark current refresh token used and create a new one
  await prisma.token.update({ where: { id: tokenRecord.id }, data: { used: true } })

  const newRefreshToken = crypto.randomBytes(48).toString('hex')
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000)
  await prisma.token.create({
    data: {
      userId: tokenRecord.userId,
      type: 'REFRESH',
      token: newRefreshToken,
      expiresAt,
      used: false
    }
  })
  setRefreshTokenCookie(res, newRefreshToken, REFRESH_EXPIRES_DAYS * 24 * 60 * 60)

  // Issue new access token
  const accessToken = signAccessToken({ userId: tokenRecord.userId })
  const user = await prisma.user.findUnique({ where: { id: tokenRecord.userId } })
  return res.json({ accessToken, user: user ? { id: user.id, name: user.name, email: user.email, isProvider: user.isProvider } : null })
}
