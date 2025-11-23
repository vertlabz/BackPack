import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, email, password, isProvider } = req.body;
  if (!email || !password || !name) return res.status(400).json({ message: 'Missing' });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ message: 'Email exists' });

  const hashed = await bcrypt.hash(password, 8);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, isProvider: !!isProvider },
    select: { id: true, name: true, email: true, isProvider: true }
  });
  return res.status(201).json(user);
}
