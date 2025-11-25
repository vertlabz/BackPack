// src/pages/api/providers/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const provider = await prisma.user.findUnique({
    where: { id: String(id) },
    select: {
      id: true,
      name: true,
      email: true,
      isProvider: true,
      services: {
        select: { id: true, name: true, duration: true, price: true },
      },
      providerAvailabilities: true,
      providerBlocks: true,
    },
  })

  if (!provider || !provider.isProvider) {
    return res.status(404).json({ error: 'Provider not found' })
  }

  return res.status(200).json({ provider })
}
