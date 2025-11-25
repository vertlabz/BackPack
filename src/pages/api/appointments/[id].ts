// caminho sugerido: src/pages/api/appointments/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { requireAuth } from '../../../middleware/requireAuth'

export default requireAuth(async (req: NextApiRequest & { user?: { userId: string } }, res: NextApiResponse) => {
  const userId = req.user!.userId
  const { id } = req.query

  if (req.method === 'DELETE') {
    const appt = await prisma.appointment.findUnique({ where: { id: String(id) } })
    if (!appt) return res.status(404).json({ error: 'Appointment not found' })

    // Somente cliente dono ou provider dono pode cancelar
    if (appt.customerId !== userId && appt.providerId !== userId) return res.status(403).json({ error: 'Forbidden' })

    const canceled = await prisma.appointment.update({ where: { id: appt.id }, data: { canceled: true } })
    return res.json({ canceled })
  }

  return res.status(405).end()
})
