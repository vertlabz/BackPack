// src/pages/api/auth/login.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { verifyPassword } from '../../../lib/hash'
import { signAccessToken } from '../../../lib/auth'
import { setRefreshTokenCookie } from '../../../lib/cookies'
import crypto from 'crypto'

type UserSafe = { id: string; name: string; email: string; isProvider: boolean }

type ResponseBody =
  | { message: string }
  | { accessToken: string; user: UserSafe }

const REFRESH_EXPIRES_DAYS = Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 30)

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ message: 'Method not allowed. Use POST.' })
  }

  try {
    const { email, password } = req.body ?? {}
    if (!email || !password) {
      return res.status(400).json({ message: 'Missing email or password' })
    }

    const cleanEmail = String(email).trim().toLowerCase()

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, name: true, email: true, password: true, isProvider: true, maxBookingDays: true },
    })
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const ok = await verifyPassword(password, user.password)
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const accessToken = signAccessToken({ userId: user.id })
    const refreshToken = crypto.randomBytes(48).toString('hex')
    const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000)

    await prisma.token.create({
      data: {
        userId: user.id,
        type: 'REFRESH',
        token: refreshToken,
        expiresAt,
        used: false,
      },
    })

    setRefreshTokenCookie(res, refreshToken, REFRESH_EXPIRES_DAYS * 24 * 60 * 60)

    const safeUser: UserSafe = {
      id: user.id,
      name: user.name,
      email: user.email,
      isProvider: user.isProvider,
    }

    return res.json({ accessToken, user: safeUser })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
