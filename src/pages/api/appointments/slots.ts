// src/pages/api/appointments/slots.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

function intervalsOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const { providerId, date, serviceId } = req.query

  if (!providerId || !date || !serviceId) {
    return res.status(400).json({ error: 'providerId, date (YYYY-MM-DD) and serviceId are required' })
  }

  const provider = await prisma.user.findUnique({
    where: { id: String(providerId) },
    select: { id: true, isProvider: true },
  })
  if (!provider || !provider.isProvider) {
    return res.status(404).json({ error: 'Provider not found' })
  }

  const service = await prisma.service.findUnique({
    where: { id: String(serviceId) },
  })
  if (!service || service.providerId !== provider.id) {
    return res.status(404).json({ error: 'Service not found for this provider' })
  }

  const duration = service.duration // minutes

  const dayString = String(date)
  const dayStart = new Date(`${dayString}T00:00:00.000Z`)
  if (Number.isNaN(dayStart.getTime())) {
    return res.status(400).json({ error: 'Invalid date format' })
  }
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const maxDays = provider.maxBookingDays ?? 7
  const maxDate = new Date(today)
  maxDate.setDate(maxDate.getDate() + maxDays)

  if (dayEnd <= today) {
    return res.status(400).json({ error: 'Cannot book past dates' })
  }

  if (dayStart > maxDate) {
    return res.status(400).json({ error: `Cannot book more than ${maxDays} days in advance` })
  }

  const weekday = dayStart.getUTCDay()

  // Disponibilidades do dia da semana
  const availabilities = await prisma.providerAvailability.findMany({
    where: { providerId: provider.id, weekday },
    orderBy: { startTime: 'asc' },
  })

  // Bloqueios que pegam esse dia
  const blocks = await prisma.providerBlock.findMany({
    where: {
      providerId: provider.id,
      startAt: { lt: dayEnd },
      endAt: { gt: dayStart },
    },
  })

  // Appointments já marcados nesse dia
  const appointments = await prisma.appointment.findMany({
    where: {
      providerId: provider.id,
      date: { gte: dayStart, lt: dayEnd },
      status: { not: 'CANCELLED' },
    },
    include: {
      service: true,
    },
  })

  const availableSlots: string[] = []

  for (const av of availabilities) {
    const windowStartMin = timeToMinutes(av.startTime)
    const windowEndMin = timeToMinutes(av.endTime)

    for (let slotStart = windowStartMin; slotStart + duration <= windowEndMin; slotStart += duration) {
      const slotEnd = slotStart + duration

      // Verifica bloqueios
      const blocked = blocks.some(block => {
        const blockStartMin = minutesFromMidnight(block.startAt)
        const blockEndMin = minutesFromMidnight(block.endAt)
        return intervalsOverlap(slotStart, slotEnd, blockStartMin, blockEndMin)
      })
      if (blocked) continue

      // Verifica conflitos com outros appointments
      const conflict = appointments.some(appt => {
        const apptDuration = appt.service?.duration ?? duration
        const apptStartMin = minutesFromMidnight(appt.date)
        const apptEndMin = apptStartMin + apptDuration
        return intervalsOverlap(slotStart, slotEnd, apptStartMin, apptEndMin)
      })
      if (conflict) continue

      // Monta Date do slot
      const slotDate = new Date(dayStart)
      // Usando horário "local" do servidor; isso pode não bater 100% com timezone real, mas serve bem pro MVP.
      slotDate.setHours(Math.floor(slotStart / 60), slotStart % 60, 0, 0)
      availableSlots.push(slotDate.toISOString())
    }
  }

  return res.status(200).json({ slots: availableSlots })
}
