// src/pages/api/provider/services.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { requireAuth } from '../../../middleware/requireAuth'

export default requireAuth(async (req: NextApiRequest & { user?: { userId: string } }, res: NextApiResponse) => {
  const userId = req.user!.userId

  const provider = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isProvider: true },
  })

  if (!provider || !provider.isProvider) {
    return res.status(403).json({ error: 'Only providers can manage services' })
  }

  if (req.method === 'GET') {
    const services = await prisma.service.findMany({
      where: { providerId: provider.id },
      orderBy: { name: 'asc' },
    })
    return res.status(200).json({ services })
  }

  if (req.method === 'POST') {
    const { name, duration, price } = req.body ?? {}

    if (!name || duration == null || price == null) {
      return res.status(400).json({ error: 'name, duration and price are required' })
    }

    const dur = Number(duration)
    const pr = Number(price)
    if (Number.isNaN(dur) || dur <= 0) {
      return res.status(400).json({ error: 'duration must be a positive number (minutes)' })
    }
    if (Number.isNaN(pr) || pr < 0) {
      return res.status(400).json({ error: 'price must be a non-negative number' })
    }

    const service = await prisma.service.create({
      data: {
        providerId: provider.id,
        name: String(name),
        duration: dur,
        price: pr,
      },
    })

    return res.status(201).json({ service })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).end()
})
