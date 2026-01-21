// src/pages/register.tsx
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/router'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isProvider, setIsProvider] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, isProvider }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.message || 'Erro ao registrar')
      return
    }

    setSuccess('Registrado com sucesso! Indo para login...')
    setTimeout(() => router.push('/login'), 1000)
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
      maxWidth: 460,
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
    checkboxRow: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 },
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
    success: { marginTop: 16, color: '#34d399', fontSize: 13 },
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Cadastro</h1>
        <p style={styles.subtitle}>Crie sua conta em poucos passos.</p>
      <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Nome</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              style={styles.input}
            />
          </div>
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
          <div style={{ ...styles.field, marginBottom: 24 }}>
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={isProvider}
                onChange={e => setIsProvider(e.target.checked)}
              />
              Sou barbeiro (provider)
            </label>
          </div>
          <button type="submit" style={styles.button}>
            Registrar
          </button>
      </form>
        {error && <p style={styles.error}>{error}</p>}
        {success && <p style={styles.success}>{success}</p>}
        <p style={styles.helper}>
          Já possui conta?{' '}
          <a href="/login" style={styles.link}>
            Fazer login
          </a>
        </p>
      </div>
    </div>
  )
}
