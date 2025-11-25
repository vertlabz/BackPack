// src/pages/api/appointments/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
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
  })

  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' })
  }

  if (appointment.customerId !== userId && appointment.providerId !== userId) {
    return res.status(403).json({ error: 'Not allowed to cancel this appointment' })
  }

  const updated = await prisma.appointment.update({
    where: { id: String(id) },
    data: { status: 'CANCELLED' },
  })

  return res.status(200).json({ appointment: updated })
})
