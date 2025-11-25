// src/pages/api/appointments/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { requireAuth } from '../../../middleware/requireAuth'

export default requireAuth(async (req: NextApiRequest & { user?: { userId: string } }, res: NextApiResponse) => {
  const userId = req.user!.userId

  if (req.method === 'GET') {
    const appointments = await prisma.appointment.findMany({
      where: { customerId: userId },
      include: {
        provider: {
          select: { id: true, name: true, email: true },
        },
        service: true,
      },
      orderBy: { date: 'desc' },
    })

    return res.status(200).json({ appointments })
  }

  if (req.method === 'POST') {
    const { providerId, date, serviceId, notes } = req.body

    if (!providerId || !date) {
      return res.status(400).json({ error: 'providerId and date are required' })
    }

    const appointmentDate = new Date(date)
    if (Number.isNaN(appointmentDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' })
    }

    // provider existe e é provider?
    const provider = await prisma.user.findUnique({ where: { id: providerId } })
    if (!provider || !provider.isProvider) {
      return res.status(404).json({ error: 'Provider not found' })
    }

    // bloqueio do provider
    const block = await prisma.providerBlock.findFirst({
      where: {
        providerId,
        startAt: { lte: appointmentDate },
        endAt: { gte: appointmentDate },
      },
    })
    if (block) {
      return res.status(400).json({ error: 'Provider blocked at this time' })
    }

    // conflito: mesmo horário exato
    const conflict = await prisma.appointment.findFirst({
      where: {
        providerId,
        date: appointmentDate,
        status: { not: 'CANCELLED' },
      },
    })
    if (conflict) {
      return res.status(400).json({ error: 'Time slot already taken' })
    }

    // (Opcional) verificar se bate com availability — simplificado:
    const weekday = appointmentDate.getDay() // 0 domingo, 6 sábado
    const availabilities = await prisma.providerAvailability.findMany({
      where: { providerId, weekday },
    })
    if (availabilities.length > 0) {
      const hh = String(appointmentDate.getHours()).padStart(2, '0')
      const mm = String(appointmentDate.getMinutes()).padStart(2, '0')
      const time = `${hh}:${mm}`

      const fits = availabilities.some(a => a.startTime <= time && a.endTime > time)
      if (!fits) {
        return res.status(400).json({ error: 'Provider not available at this time' })
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        customerId: userId,
        providerId,
        serviceId: serviceId ?? null,
        date: appointmentDate,
        notes: notes ?? null,
        // status default = SCHEDULED pelo schema
      },
    })

    return res.status(201).json({ appointment })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).end()
})
