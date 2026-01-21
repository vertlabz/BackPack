// src/pages/api/provider/availability.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { requireAuth } from '../../../middleware/requireAuth'

function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

function formatMinutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export default requireAuth(async (req: NextApiRequest & { user?: { userId: string } }, res: NextApiResponse) => {
  const userId = req.user!.userId

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isProvider: true },
  })

  if (!user || !user.isProvider) {
    return res.status(403).json({ error: 'Only providers can manage availability' })
  }

  if (req.method === 'GET') {
    const availabilities = await prisma.providerAvailability.findMany({
      where: { providerId: user.id },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    })
    return res.status(200).json({ availabilities })
  }

  if (req.method === 'POST') {
    const { weekday, startTime, endTime } = req.body ?? {}

    if (weekday === undefined || startTime == null || endTime == null) {
      return res.status(400).json({ error: 'weekday, startTime and endTime are required' })
    }

    const w = Number(weekday)
    if (Number.isNaN(w) || w < 0 || w > 6) {
      return res.status(400).json({ error: 'weekday must be between 0 and 6' })
    }

    const startMinutes = parseTimeToMinutes(String(startTime))
    const endMinutes = parseTimeToMinutes(String(endTime))
    if (startMinutes == null || endMinutes == null) {
      return res.status(400).json({ error: 'startTime and endTime must use HH:MM format' })
    }
    if (endMinutes <= startMinutes) {
      return res.status(400).json({ error: 'endTime must be later than startTime' })
    }

    // ⬇️ NOVO: não permitir duas disponibilidades no mesmo dia
    const existing = await prisma.providerAvailability.findFirst({
      where: { providerId: user.id, weekday: w },
    })
    if (existing) {
      return res
        .status(400)
        .json({ error: 'Já existe disponibilidade cadastrada para esse dia. Apague antes de criar outra.' })
    }

    const created = await prisma.providerAvailability.create({
      data: {
        providerId: user.id,
        weekday: w,
        startTime: formatMinutesToTime(startMinutes),
        endTime: formatMinutesToTime(endMinutes),
      },
    })

    return res.status(201).json({ availability: created })
  }


  res.setHeader('Allow', 'GET, POST')
  return res.status(405).end()
})
