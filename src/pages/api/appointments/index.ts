// caminho sugerido: src/pages/api/appointments/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'   // ajuste path se necessário
import { requireAuth } from '../../../middleware/requireAuth'

export default requireAuth(async (req: NextApiRequest & { user?: { userId: string } }, res: NextApiResponse) => {
  const userId = req.user!.userId

  if (req.method === 'GET') {
    // Lista agendamentos do cliente logado
    const appointments = await prisma.appointment.findMany({
      where: { customerId: userId },
      include: { service: true, provider: { select: { id: true, name: true, avatar: true } } },
      orderBy: { date: 'desc' }
    })
    return res.json({ appointments })
  }

  if (req.method === 'POST') {
    const { providerId, date, serviceId, notes } = req.body
    if (!providerId || !date || !serviceId) return res.status(400).json({ error: 'Missing fields' })
    const appointmentDate = new Date(date)
    if (Number.isNaN(appointmentDate.getTime())) return res.status(400).json({ error: 'Invalid date' })

    // 1) Verifica se provider existe
    const provider = await prisma.user.findUnique({ where: { id: providerId } })
    if (!provider || provider.role !== 'PROVIDER') return res.status(404).json({ error: 'Provider not found' })

    // 2) Verifica blocos do provider (ex.: não criar se houver block cobrindo a data)
    const block = await prisma.providerBlock.findFirst({
      where: {
        providerId,
        start: { lte: appointmentDate },
        end: { gte: appointmentDate }
      }
    })
    if (block) return res.status(400).json({ error: 'Provider blocked at this time' })

    // 3) Verifica se há conflito com outro agendamento (mesmo provider, mesmo horário exato)
    const conflict = await prisma.appointment.findFirst({
      where: { providerId, date: appointmentDate, canceled: false }
    })
    if (conflict) return res.status(400).json({ error: 'Time slot already taken' })

    // 4) (Opcional) checar disponibilidade semanal do provider
    // Aqui simplificada: assume que provider tem availability com weekday e startTime/endTime strings
    const weekday = appointmentDate.getDay() // 0..6
    const avail = await prisma.providerAvailability.findMany({ where: { providerId, weekday } })
    if (avail.length) {
      const hhmm = (d: Date) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
      const timeStr = hhmm(appointmentDate)
      const fits = avail.some(a => a.startTime <= timeStr && a.endTime > timeStr)
      if (!fits) return res.status(400).json({ error: 'Provider not available at this time' })
    }

    // 5) Criar appointment
    const appointment = await prisma.appointment.create({
      data: {
        customerId: userId,
        providerId,
        serviceId,
        date: appointmentDate,
        notes: notes ?? null
      }
    })

    return res.status(201).json({ appointment })
  }

  return res.status(405).end()
})
