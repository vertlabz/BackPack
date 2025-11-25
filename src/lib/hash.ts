// src/lib/hash.ts
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

export async function hashPassword(plain: string) {
  const salt = await bcrypt.genSalt(SALT_ROUNDS)
  return bcrypt.hash(plain, salt)
}

export async function verifyPassword(plain: string, hashed: string) {
  return bcrypt.compare(plain, hashed)
}
