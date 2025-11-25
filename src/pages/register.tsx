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

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Cadastro</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Nome</label>
          <input value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Senha</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={isProvider}
              onChange={e => setIsProvider(e.target.checked)}
            />
            Sou barbeiro (provider)
          </label>
        </div>
        <button type="submit">Registrar</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
    </div>
  )
}
