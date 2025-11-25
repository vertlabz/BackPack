// src/pages/api/auth/register.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { prisma } from '../../../lib/prisma'
import { Prisma } from '@prisma/client'

type ResponseBody =
  | { message: string }
  | { id: string; name: string; email: string; isProvider: boolean }

const SALT_ROUNDS = 10

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ message: 'Method not allowed. Use POST.' })
  }

  try {
    const { name, email, password, isProvider } = req.body ?? {}

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields: name, email, password' })
    }

    const cleanEmail = String(email).trim().toLowerCase()
    const cleanName = String(name).trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ message: 'Invalid email format' })
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    // Check existing user
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } })
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' })
    }

    // Hash password
    const hashed = await bcrypt.hash(password, SALT_ROUNDS)

    // Create user
    const user = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        password: hashed,
        isProvider: Boolean(isProvider),
      },
      select: { id: true, name: true, email: true, isProvider: true },
    })

    return res.status(201).json(user)
  } catch (err: any) {
    // Prisma unique constraint (safety net if race condition)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ message: 'Email already in use' })
    }

    console.error('Register error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
