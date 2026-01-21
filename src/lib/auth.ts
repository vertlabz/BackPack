// src/lib/auth.ts
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken'

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'change_me'
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '2h') as SignOptions['expiresIn']

export type JwtPayload = { userId: string }

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}
