// src/pages/api/appointments/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import {
  getSaoPauloDayRangeFromUtc,
  saoPauloDiffInDaysFromNow,
  saoPauloMinutesFromMidnight,
} from '../../../lib/saoPauloTime'
import { requireAuth } from '../../../middleware/requireAuth'

function intervalsOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB
}

// helpers moved to src/lib/saoPauloTime.ts

export default requireAuth(
  async (req: NextApiRequest & { user?: { userId: string } }, res: NextApiResponse) => {
    const userId = req.user!.userId

    if (req.method === 'GET') {
      // Lista agendamentos como CLIENTE (customer)
      const appointments = await prisma.appointment.findMany({
        where: { customerId: userId },
        orderBy: { date: 'asc' },
        include: {
          provider: {
            select: { id: true, name: true, email: true },
          },
          service: true,
        },
      })
      return res.status(200).json({ appointments })
    }

    if (req.method === 'POST') {
      const { providerId, serviceId, date, notes } = req.body ?? {}

      if (!providerId || !serviceId || !date) {
        return res
          .status(400)
          .json({ error: 'providerId, serviceId and date are required' })
      }

      const appointmentDate = new Date(date)
      if (Number.isNaN(appointmentDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' })
      }

      // Provider precisa existir e ser provider
      const provider = await prisma.user.findUnique({
        where: { id: String(providerId) },
        select: { id: true, isProvider: true, maxBookingDays: true },
      })
      if (!provider || !provider.isProvider) {
        return res.status(404).json({ error: 'Provider not found' })
      }

      // Serviço precisa existir e pertencer ao provider
      const service = await prisma.service.findUnique({
        where: { id: String(serviceId) },
      })
      if (!service || service.providerId !== provider.id) {
        return res.status(404).json({ error: 'Service not found for this provider' })
      }

      // Regras de data (passado / limite de dias)
      const diffDays = saoPauloDiffInDaysFromNow(appointmentDate)
      const maxDays = provider.maxBookingDays ?? 7

      if (diffDays < 0) {
        return res.status(400).json({ error: 'Cannot book in the past' })
      }
      if (diffDays > maxDays) {
        return res
          .status(400)
          .json({ error: `Cannot book more than ${maxDays} days in advance` })
      }

      // Range do dia local de SP para esse appointment
      const { dayStartUtc, dayEndUtc } = getSaoPauloDayRangeFromUtc(appointmentDate)

      // Verifica conflitos com bloqueios
      const blocks = await prisma.providerBlock.findMany({
        where: {
          providerId: provider.id,
          startAt: { lt: dayEndUtc },
          endAt: { gt: dayStartUtc },
        },
      })

      const apptStartMin = saoPauloMinutesFromMidnight(appointmentDate)
      const apptEndMin = apptStartMin + service.duration

      const blocked = blocks.some(block => {
        const blockStartMin = saoPauloMinutesFromMidnight(block.startAt)
        const blockEndMin = saoPauloMinutesFromMidnight(block.endAt)
        return intervalsOverlap(apptStartMin, apptEndMin, blockStartMin, blockEndMin)
      })
      if (blocked) {
        return res.status(400).json({ error: 'This time is blocked for the provider' })
      }

      // Verifica conflitos com outros appointments (mesmo provider, mesmo dia)
      const existingAppointments = await prisma.appointment.findMany({
        where: {
          providerId: provider.id,
          date: { gte: dayStartUtc, lt: dayEndUtc },
          status: { not: 'CANCELED' },
        },
        include: {
          service: true,
        },
      })

      const hasConflict = existingAppointments.some(appt => {
        const apptDuration = appt.service?.duration ?? service.duration
        const existingStartMin = saoPauloMinutesFromMidnight(appt.date)
        const existingEndMin = existingStartMin + apptDuration
        return intervalsOverlap(apptStartMin, apptEndMin, existingStartMin, existingEndMin)
      })

      if (hasConflict) {
        return res.status(400).json({ error: 'Já existe um agendamento nesse horário' })
      }

      // Cria o agendamento
      const created = await prisma.appointment.create({
        data: {
          date: appointmentDate, // guardado em UTC
          customerId: userId,
          providerId: provider.id,
          serviceId: service.id,
          notes: notes ?? null,
          status: 'SCHEDULED',
        },
        include: {
          provider: { select: { id: true, name: true, email: true } },
          service: true,
        },
      })

      return res.status(201).json({ appointment: created })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).end()
  }
)
