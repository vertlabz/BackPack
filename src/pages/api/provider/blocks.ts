// src/pages/api/provider/blocks.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { requireAuth } from '../../../middleware/requireAuth'

export default requireAuth(async (req: NextApiRequest & { user?: { userId: string } }, res: NextApiResponse) => {
  const userId = req.user!.userId

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isProvider: true },
  })

  if (!user || !user.isProvider) {
    return res.status(403).json({ error: 'Only providers can manage blocks' })
  }

  if (req.method === 'GET') {
    const blocks = await prisma.providerBlock.findMany({
      where: { providerId: user.id },
      orderBy: { startAt: 'asc' },
    })
    return res.status(200).json({ blocks })
  }

  if (req.method === 'POST') {
    const { startAt, endAt, reason } = req.body ?? {}

    if (!startAt || !endAt) {
      return res.status(400).json({ error: 'startAt and endAt are required' })
    }

    const start = new Date(startAt)
    const end = new Date(endAt)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ error: 'Invalid startAt or endAt' })
    }

    const created = await prisma.providerBlock.create({
      data: {
        providerId: user.id,
        startAt: start,
        endAt: end,
        reason: reason ?? null,
      },
    })

    return res.status(201).json({ block: created })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).end()
})
