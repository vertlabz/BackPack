// src/pages/api/provider/availability/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import { requireAuth } from '../../../../middleware/requireAuth'

export default requireAuth(async (req: NextApiRequest & { user?: { userId: string } }, res: NextApiResponse) => {
  const userId = req.user!.userId
  const { id } = req.query

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE')
    return res.status(405).end()
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isProvider: true },
  })

  if (!user || !user.isProvider) {
    return res.status(403).json({ error: 'Only providers can delete availability' })
  }

  const availability = await prisma.providerAvailability.findUnique({
    where: { id: String(id) },
  })

  if (!availability || availability.providerId !== user.id) {
    return res.status(404).json({ error: 'Availability not found' })
  }

  await prisma.providerAvailability.delete({ where: { id: availability.id } })

  return res.status(200).json({ ok: true })
})
