// src/pages/api/provider/config.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { requireAuth } from '../../../middleware/requireAuth'

export default requireAuth(async (req: NextApiRequest & { user?: { userId: string } }, res: NextApiResponse) => {
  const userId = req.user!.userId

  const provider = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isProvider: true, maxBookingDays: true },
  })

  if (!provider || !provider.isProvider) {
    return res.status(403).json({ error: 'Only providers can configure booking settings' })
  }

  if (req.method === 'GET') {
    return res.status(200).json({ maxBookingDays: provider.maxBookingDays ?? 7 })
  }

  if (req.method === 'POST') {
    const { maxBookingDays } = req.body ?? {}
    const days = Number(maxBookingDays)

    if (Number.isNaN(days) || days < 1 || days > 60) {
      return res.status(400).json({ error: 'maxBookingDays must be between 1 and 60' })
    }

    const updated = await prisma.user.update({
      where: { id: provider.id },
      data: { maxBookingDays: days },
      select: { maxBookingDays: true },
    })

    return res.status(200).json({ maxBookingDays: updated.maxBookingDays })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).end()
})
