// src/pages/api/provider/appointments.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { requireAuth } from '../../../middleware/requireAuth'

export default requireAuth(async (req: NextApiRequest & { user?: { userId: string } }, res: NextApiResponse) => {
  const userId = req.user!.userId

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isProvider: true },
  })

  if (!user || !user.isProvider) {
    return res.status(403).json({ error: 'Only providers can view provider appointments' })
  }

  const { date } = req.query
  if (!date) {
    return res.status(400).json({ error: 'date query param is required (YYYY-MM-DD)' })
  }

  const dayString = String(date)
  const start = new Date(`${dayString}T00:00:00.000Z`)
  if (Number.isNaN(start.getTime())) {
    return res.status(400).json({ error: 'Invalid date format' })
  }
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const appointments = await prisma.appointment.findMany({
    where: {
      providerId: user.id,
      date: { gte: start, lt: end },
      status: { not: 'CANCELED' },
    },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      service: true,
    },
    orderBy: { date: 'asc' },
  })

  return res.status(200).json({ appointments })
})
