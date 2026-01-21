// src/pages/api/appointments/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { AppointmentStatus } from '@prisma/client'
import { requireAuth } from '../../../middleware/requireAuth'

export default requireAuth(async (req: NextApiRequest & { user?: { userId: string } }, res: NextApiResponse) => {
  const { id } = req.query
  const userId = req.user!.userId

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE')
    return res.status(405).end()
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: String(id) },
    include: {
      provider: {
        select: { cancelBookingHours: true },
      },
    },
  })

  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' })
  }

  if (appointment.customerId !== userId && appointment.providerId !== userId) {
    return res.status(403).json({ error: 'Not allowed to cancel this appointment' })
  }

  if (appointment.status === AppointmentStatus.CANCELED) {
    return res.status(200).json({ appointment })
  }

  if (appointment.status === AppointmentStatus.DONE) {
    return res.status(400).json({ error: 'Cannot cancel a completed appointment' })
  }

  const cancelLimitHours = appointment.provider?.cancelBookingHours ?? 2
  const now = new Date()
  const diffMs = appointment.date.getTime() - now.getTime()
  const diffHours = diffMs / (60 * 60 * 1000)

  if (diffHours < cancelLimitHours) {
    return res.status(400).json({
      error: `Cancellation must be at least ${cancelLimitHours} hours before the appointment`,
    })
  }

  const updated = await prisma.appointment.update({
    where: { id: String(id) },
    data: { status: AppointmentStatus.CANCELED },
  })

  return res.status(200).json({ appointment: updated })
})