// src/pages/api/auth/login.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { verifyPassword } from '../../../lib/hash'
import { signAccessToken } from '../../../lib/auth'

type UserSafe = { id: string; name: string; email: string; isProvider: boolean }

type ResponseBody =
  | { message: string }
  | { accessToken: string; user: UserSafe }

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

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } })
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const ok = await verifyPassword(password, user.password)
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const accessToken = signAccessToken({ userId: user.id })

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
