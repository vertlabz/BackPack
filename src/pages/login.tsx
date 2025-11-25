// src/pages/login.tsx
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/router'

type User = { id: string; name: string; email: string; isProvider: boolean }

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.message || 'Erro ao entrar')
      return
    }

    const { accessToken, user } = data as { accessToken: string; user: User }

    // Para demo: salvar no localStorage (depois dá pra refinar)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('accessToken', accessToken)
      window.localStorage.setItem('currentUser', JSON.stringify(user))
    }

    router.push('/dashboard') // mais tarde criamos essa página
  }

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Senha</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button type="submit">Entrar</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}
