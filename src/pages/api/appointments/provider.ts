// src/pages/api/appointments/provider.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const { providerId, date } = req.query
  if (!providerId || !date) {
    return res.status(400).json({ error: 'providerId and date are required' })
  }

  const day = new Date(String(date))
  if (Number.isNaN(day.getTime())) {
    return res.status(400).json({ error: 'Invalid date' })
  }

  const start = new Date(day)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const appointments = await prisma.appointment.findMany({
    where: {
      providerId: String(providerId),
      date: { gte: start, lt: end },
      status: { not: 'CANCELED' },
    },
    include: {
      customer: {
        select: { id: true, name: true, email: true },
      },
      service: true,
    },
    orderBy: { date: 'asc' },
  })

  return res.status(200).json({ appointments })
}
