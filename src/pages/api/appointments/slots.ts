// src/pages/api/appointments/slots.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { AppointmentStatus } from '@prisma/client'
import {
  getSaoPauloDayRangeFromLocalDate,
  saoPauloMinutesFromMidnight,
  OFFSET_MS,
} from '../../../lib/saoPauloTime'

function intervalsOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB
}

// helpers moved to src/lib/saoPauloTime.ts

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const { providerId, date, serviceId } = req.query

  if (!providerId || !date || !serviceId) {
    return res
      .status(400)
      .json({ error: 'providerId, date (YYYY-MM-DD) and serviceId are required' })
  }

  const provider = await prisma.user.findUnique({
    where: { id: String(providerId) },
    select: { id: true, isProvider: true, maxBookingDays: true },
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

  const duration = service.duration // minutos

  let dayStartUtc: Date
  let dayEndUtc: Date
  let weekday: number
  try {
    const range = getSaoPauloDayRangeFromLocalDate(String(date))
    dayStartUtc = range.dayStartUtc
    dayEndUtc = range.dayEndUtc
    weekday = range.weekday
  } catch {
    return res.status(400).json({ error: 'Invalid date format (expected YYYY-MM-DD)' })
  }

  // Regra de limite de agendamento (maxBookingDays) em dias locais de SP
  const nowUtc = new Date()
  const localNowMs = nowUtc.getTime() - OFFSET_MS
  const localDayNow = Math.floor(localNowMs / (24 * 60 * 60 * 1000))

  const midPointOfDayMs = dayStartUtc.getTime() - OFFSET_MS + 12 * 60 * 60 * 1000 // meio-dia local
  const localDayTarget = Math.floor(midPointOfDayMs / (24 * 60 * 60 * 1000))

  const diffDays = localDayTarget - localDayNow
  const maxDays = provider.maxBookingDays ?? 7

  if (diffDays < 0) {
    return res.status(400).json({ error: 'Cannot book past dates' })
  }
  if (diffDays > maxDays) {
    return res
      .status(400)
      .json({ error: `Cannot book more than ${maxDays} days in advance` })
  }

  // Disponibilidades do dia da semana (em São Paulo)
  const availabilities = await prisma.providerAvailability.findMany({
    where: { providerId: provider.id, weekday },
    orderBy: { startTime: 'asc' },
  })

  // Bloqueios que pegam esse dia (salvos em UTC)
  const blocks = await prisma.providerBlock.findMany({
    where: {
      providerId: provider.id,
      startAt: { lt: dayEndUtc },
      endAt: { gt: dayStartUtc },
    },
  })

  // Appointments já marcados nesse dia (salvos em UTC)
  const appointments = await prisma.appointment.findMany({
    where: {
      providerId: provider.id,
      date: { gte: dayStartUtc, lt: dayEndUtc },
      status: { not: AppointmentStatus.CANCELED },
    },
    include: {
      service: true,
    },
  })

  const availableSlots: string[] = []

  // Itera pelas janelas de disponibilidade
  for (const av of availabilities) {
    const [startHourStr, startMinStr] = av.startTime.split(':')
    const [endHourStr, endMinStr] = av.endTime.split(':')

    const windowStartMin = Number(startHourStr) * 60 + Number(startMinStr)
    const windowEndMin = Number(endHourStr) * 60 + Number(endMinStr)

    if (
      Number.isNaN(windowStartMin) ||
      Number.isNaN(windowEndMin) ||
      windowEndMin <= windowStartMin
    ) {
      continue
    }

    for (let slotStart = windowStartMin; slotStart + duration <= windowEndMin; slotStart += duration) {
      const slotEnd = slotStart + duration

      // 1) Verifica bloqueios
      const blocked = blocks.some(block => {
        const blockStartMin = saoPauloMinutesFromMidnight(block.startAt)
        const blockEndMin = saoPauloMinutesFromMidnight(block.endAt)
        return intervalsOverlap(slotStart, slotEnd, blockStartMin, blockEndMin)
      })
      if (blocked) continue

      // 2) Verifica conflitos com outros appointments
      const conflict = appointments.some(appt => {
        const apptDuration = appt.service?.duration ?? duration
        const apptStartMin = saoPauloMinutesFromMidnight(appt.date)
        const apptEndMin = apptStartMin + apptDuration
        return intervalsOverlap(slotStart, slotEnd, apptStartMin, apptEndMin)
      })
      if (conflict) continue

      // 3) Monta o Date UTC do slot com base na data local de SP
      const [yearStr, monthStr, dayStr] = String(date).split('-')
      const year = Number(yearStr)
      const month = Number(monthStr)
      const day = Number(dayStr)

      const hour = Math.floor(slotStart / 60)
      const minute = slotStart % 60

      // timestamp local SP (mas construído via UTC numérico)
      const localSlotMs = Date.UTC(year, month - 1, day, hour, minute, 0)
      // converte para UTC real (UTC = local + offset)
      const utcSlot = new Date(localSlotMs + OFFSET_MS)

      availableSlots.push(utcSlot.toISOString())
    }
  }

  return res.status(200).json({ slots: availableSlots })
}