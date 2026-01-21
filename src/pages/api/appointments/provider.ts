// src/pages/api/appointments/provider.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { AppointmentStatus } from '@prisma/client'
import { getSaoPauloDayRangeFromLocalDate } from '../../../lib/saoPauloTime'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const { providerId, date } = req.query
  if (!providerId || !date) {
    return res.status(400).json({ error: 'providerId and date are required' })
  }

  let start: Date
  let end: Date
  try {
    const range = getSaoPauloDayRangeFromLocalDate(String(date))
    start = range.dayStartUtc
    end = range.dayEndUtc
  } catch {
    return res.status(400).json({ error: 'Invalid date format (expected YYYY-MM-DD)' })
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      providerId: String(providerId),
      date: { gte: start, lt: end },
      status: { not: AppointmentStatus.CANCELED },
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