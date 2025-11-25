// src/pages/api/provider/me.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { requireAuth } from '../../../middleware/requireAuth'

export default requireAuth(async (req: NextApiRequest & { user?: { userId: string } }, res: NextApiResponse) => {
  const userId = req.user!.userId

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      isProvider: true,
    },
  })

  if (!user) return res.status(404).json({ error: 'User not found' })
  if (!user.isProvider) return res.status(403).json({ error: 'User is not a provider' })

  return res.status(200).json({ provider: user })
})
