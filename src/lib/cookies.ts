// src/lib/cookies.ts
type SameSite = 'lax' | 'strict' | 'none'

type CookieOptions = {
  httpOnly?: boolean
  path?: string
  maxAge?: number
  sameSite?: SameSite
  secure?: boolean
}

function serializeCookie(name: string, value: string, options: CookieOptions = {}) {
  const encodedValue = encodeURIComponent(value)
  let cookie = `${name}=${encodedValue}`

  if (typeof options.maxAge === 'number') {
    cookie += `; Max-Age=${Math.floor(options.maxAge)}`
  }
  if (options.path) {
    cookie += `; Path=${options.path}`
  }
  if (options.httpOnly) {
    cookie += '; HttpOnly'
  }
  if (options.secure) {
    cookie += '; Secure'
  }
  if (options.sameSite) {
    cookie += `; SameSite=${options.sameSite}`
  }

  return cookie
}

const COOKIE_NAME = process.env.REFRESH_TOKEN_COOKIE_NAME || 'rtk'
const COOKIE_PATH = process.env.REFRESH_TOKEN_COOKIE_PATH || '/'

export function setRefreshTokenCookie(res: any, token: string, maxAgeSeconds = 60 * 60 * 24 * 30) {
  const cookie = serializeCookie(COOKIE_NAME, token, {
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
  const cookie = serializeCookie(COOKIE_NAME, '', {
    httpOnly: true,
    path: COOKIE_PATH,
    maxAge: 0,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  res.setHeader('Set-Cookie', cookie)
}

export function parseCookieHeader(header: string | undefined): Record<string, string> {
  const parsed: Record<string, string> = {}
  if (!header) {
    return parsed
  }

  const parts = header.split(';')
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const [name, ...rest] = trimmed.split('=')
    if (!name) continue
    parsed[name] = decodeURIComponent(rest.join('='))
  }

  return parsed
}
