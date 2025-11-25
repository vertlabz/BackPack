// src/pages/api/appointments/slots.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

/**
 * Usamos horário de São Paulo (UTC-3) para:
 * - interpretar a data (YYYY-MM-DD) enviada pelo cliente
 * - gerar os slots
 * - verificar conflitos com bloqueios e agendamentos
 */
const SAO_PAULO_OFFSET_MINUTES = 3 * 60
const OFFSET_MS = SAO_PAULO_OFFSET_MINUTES * 60 * 1000

function intervalsOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB
}

// Converte um Date em UTC para "minutos desde meia-noite" em horário de São Paulo
function saoPauloMinutesFromMidnight(dateUtc: Date): number {
  const localMs = dateUtc.getTime() - OFFSET_MS
  const d = new Date(localMs)
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}

// Dado uma string YYYY-MM-DD (data local SP), retorna o range [startUtc, endUtc)
function getSaoPauloDayRangeFromLocalDate(dateStr: string): { dayStartUtc: Date; dayEndUtc: Date; weekday: number } {
  const [yearStr, monthStr, dayStr] = dateStr.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)

  if (!year || !month || !day) {
    throw new Error('Invalid date string')
  }

  // Tratamos essa data como "00:00 em São Paulo"
  // Primeiro criamos um timestamp "local" baseado em UTC:
  const localStartMs = Date.UTC(year, month - 1, day, 0, 0, 0)
  // Depois convertemos para UTC real adicionando o offset (UTC = local + 3h)
  const dayStartUtc = new Date(localStartMs + OFFSET_MS)
  const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000)

  // Dia da semana em São Paulo (mesmo da data local)
  const localDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  const weekday = localDate.getUTCDay() // 0 = domingo ... 6 = sábado

  return { dayStartUtc, dayEndUtc, weekday }
}

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
      status: { not: 'CANCELLED' },
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
