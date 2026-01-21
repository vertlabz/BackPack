// src/pages/api/provider/config.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { requireAuth } from '../../../middleware/requireAuth'

export default requireAuth(async (req: NextApiRequest & { user?: { userId: string } }, res: NextApiResponse) => {
  const userId = req.user!.userId

  const provider = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isProvider: true, maxBookingDays: true, cancelBookingHours: true },
  })

  if (!provider || !provider.isProvider) {
    return res.status(403).json({ error: 'Only providers can configure booking settings' })
  }

  if (req.method === 'GET') {
    return res
      .status(200)
      .json({
        maxBookingDays: provider.maxBookingDays ?? 7,
        cancelBookingHours: provider.cancelBookingHours ?? 2,
      })
  }

  if (req.method === 'POST') {
    const { maxBookingDays, cancelBookingHours } = req.body ?? {}
    const days = Number(maxBookingDays)
    const cancelHours = Number(cancelBookingHours)

    if (Number.isNaN(days) || days < 1 || days > 60) {
      return res.status(400).json({ error: 'maxBookingDays must be between 1 and 60' })
    }

    if (Number.isNaN(cancelHours) || cancelHours < 0 || cancelHours > 72) {
      return res.status(400).json({ error: 'cancelBookingHours must be between 0 and 72' })
    }

    const updated = await prisma.user.update({
      where: { id: provider.id },
      data: { maxBookingDays: days, cancelBookingHours: cancelHours },
      select: { maxBookingDays: true, cancelBookingHours: true },
    })

    return res.status(200).json({
      maxBookingDays: updated.maxBookingDays,
      cancelBookingHours: updated.cancelBookingHours,
    })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).end()
})
