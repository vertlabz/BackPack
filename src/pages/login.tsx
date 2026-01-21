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

  const styles = {
    page: {
      minHeight: '100vh',
      background: '#0b0d10',
      color: '#e6e8eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    },
    card: {
      width: '100%',
      maxWidth: 420,
      background: '#111418',
      border: '1px solid #1f242c',
      borderRadius: 16,
      padding: 32,
      boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
    },
    title: { margin: 0, fontSize: 28, fontWeight: 600 },
    subtitle: { margin: '8px 0 24px', color: '#9aa4b2', fontSize: 14 },
    field: { display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 16 },
    label: { fontSize: 13, color: '#b5bcc7' },
    input: {
      background: '#0f1216',
      border: '1px solid #2a2f36',
      borderRadius: 10,
      padding: '10px 12px',
      color: '#e6e8eb',
      fontSize: 14,
    },
    button: {
      width: '100%',
      background: '#1c2128',
      border: '1px solid #2f3742',
      borderRadius: 10,
      padding: '12px 16px',
      color: '#e6e8eb',
      fontWeight: 600,
      cursor: 'pointer',
    },
    helper: { marginTop: 16, fontSize: 13, color: '#9aa4b2' },
    link: { color: '#7aa2ff', textDecoration: 'none' },
    error: { marginTop: 16, color: '#f87171', fontSize: 13 },
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Login</h1>
        <p style={styles.subtitle}>Acesse sua conta para continuar.</p>
      <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          <button type="submit" style={styles.button}>
            Entrar
          </button>
      </form>
        {error && <p style={styles.error}>{error}</p>}
        <p style={styles.helper}>
          Ainda não tem conta?{' '}
          <a href="/register" style={styles.link}>
            Criar cadastro
          </a>
        </p>
      </div>
    </div>
  )
}
