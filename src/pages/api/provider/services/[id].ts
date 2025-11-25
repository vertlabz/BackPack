// src/pages/api/provider/services/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import { requireAuth } from '../../../../middleware/requireAuth'

export default requireAuth(async (req: NextApiRequest & { user?: { userId: string } }, res: NextApiResponse) => {
  const userId = req.user!.userId
  const { id } = req.query

  const provider = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isProvider: true },
  })

  if (!provider || !provider.isProvider) {
    return res.status(403).json({ error: 'Only providers can manage services' })
  }

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE')
    return res.status(405).end()
  }

  const service = await prisma.service.findUnique({
    where: { id: String(id) },
  })

  if (!service || service.providerId !== provider.id) {
    return res.status(404).json({ error: 'Service not found' })
  }

  // opcional: checar se tem appointments com esse serviceId antes de deletar

  await prisma.service.delete({ where: { id: service.id } })

  return res.status(200).json({ ok: true })
})
