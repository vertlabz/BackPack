// src/lib/cookies.ts
import { serialize } from 'cookie'

const COOKIE_NAME = process.env.REFRESH_TOKEN_COOKIE_NAME || 'rtk'
const COOKIE_PATH = process.env.REFRESH_TOKEN_COOKIE_PATH || '/'

export function setRefreshTokenCookie(res: any, token: string, maxAgeSeconds = 60 * 60 * 24 * 30) {
  const cookie = serialize(COOKIE_NAME, token, {
    httpOnly: true,
    path: COOKIE_PATH,
    maxAge: maxAgeSeconds,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  // If already have Set-Cookie header, append
  const prev = res.getHeader('Set-Cookie')
  if (prev) {
    if (Array.isArray(prev)) res.setHeader('Set-Cookie', [...prev, cookie])
    else res.setHeader('Set-Cookie', [String(prev), cookie])
  } else {
    res.setHeader('Set-Cookie', cookie)
  }
}

export function clearRefreshTokenCookie(res: any) {
  const cookie = serialize(COOKIE_NAME, '', {
    httpOnly: true,
    path: COOKIE_PATH,
    maxAge: 0,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  res.setHeader('Set-Cookie', cookie)
}
