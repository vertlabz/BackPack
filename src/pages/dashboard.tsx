// src/pages/dashboard.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

type Appointment = {
  id: string
  date: string
  status: string
  notes?: string | null
  provider?: { id: string; name: string; email: string }
  service?: { id: string; name: string; duration: number; price: number }
}

type CurrentUser = {
  id: string
  name: string
  email: string
  isProvider: boolean
}

type Service = {
  id: string
  name: string
  duration: number
  price: number
}

type Provider = {
  id: string
  name: string
  services: Service[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [token, setToken] = useState<string | null>(null)

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [provider, setProvider] = useState<Provider | null>(null)
  const [providerError, setProviderError] = useState('')
  const [providerLoading, setProviderLoading] = useState(true)

  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [date, setDate] = useState<string>(() => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate() + 1).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  })

  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState('')

  const [bookingMessage, setBookingMessage] = useState('')
  const [bookingError, setBookingError] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)

  const styles = {
    page: {
      minHeight: '100vh',
      background: '#0b0d10',
      color: '#e6e8eb',
      padding: '40px 20px 60px',
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    },
    container: {
      maxWidth: 960,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 24,
    },
    header: { display: 'flex', flexDirection: 'column' as const, gap: 8 },
    subtitle: { color: '#9aa4b2', fontSize: 14, margin: 0 },
    link: { color: '#7aa2ff', textDecoration: 'none' },
    card: {
      background: '#111418',
      border: '1px solid #1f242c',
      borderRadius: 16,
      padding: 24,
    },
    fieldRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 12, alignItems: 'center' },
    label: { fontSize: 13, color: '#b5bcc7' },
    input: {
      background: '#0f1216',
      border: '1px solid #2a2f36',
      borderRadius: 10,
      padding: '8px 12px',
      color: '#e6e8eb',
      fontSize: 14,
    },
    button: {
      background: '#1c2128',
      border: '1px solid #2f3742',
      borderRadius: 10,
      padding: '10px 14px',
      color: '#e6e8eb',
      fontWeight: 600,
      cursor: 'pointer',
    },
    ghostButton: {
      background: 'transparent',
      border: '1px solid #2f3742',
      borderRadius: 10,
      padding: '8px 12px',
      color: '#e6e8eb',
      cursor: 'pointer',
    },
    error: { color: '#f87171', fontSize: 13 },
    success: { color: '#34d399', fontSize: 13 },
    list: { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 },
    listItem: {
      paddingBottom: 12,
      borderBottom: '1px solid #222831',
      fontSize: 14,
      color: '#cbd3de',
    },
    chipRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginTop: 12 },
    chip: {
      border: '1px solid #2a2f36',
      borderRadius: 999,
      padding: '6px 12px',
      background: '#0f1216',
      color: '#e6e8eb',
    },
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const token = window.localStorage.getItem('accessToken')
    const userStr = window.localStorage.getItem('currentUser')

    if (!token || !userStr) {
      router.replace('/login')
      return
    }

    setToken(token)
    setUser(JSON.parse(userStr) as CurrentUser)
  }, [router])

  useEffect(() => {
    if (!token) return

    async function loadAppointments() {
      try {
        const res = await fetch('/api/appointments', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) setError(data.error || data.message)
        else setAppointments(data.appointments || [])
      } catch {
        setError('Erro ao carregar agendamentos')
      } finally {
        setLoading(false)
      }
    }

    loadAppointments()
  }, [token])

  useEffect(() => {
    async function loadProvider() {
      try {
        const res = await fetch('/api/providers')
        const data = await res.json()
        const p = data.providers?.[0]
        if (p) {
          setProvider({ id: p.id, name: p.name, services: p.services || [] })
          if (p.services?.length > 0) setSelectedServiceId(p.services[0].id)
        } else {
          setProviderError('Nenhum barbeiro cadastrado ainda.')
        }
      } catch {
        setProviderError('Erro ao carregar barbeiro')
      } finally {
        setProviderLoading(false)
      }
    }

    loadProvider()
  }, [])

  async function loadSlots() {
    if (!provider) return
    if (!selectedServiceId || !date) {
      setSlotsError('Selecione serviço e data')
      return
    }

    setSlotsError('')
    setSlotsLoading(true)

    try {
      const res = await fetch(
        `/api/appointments/slots?providerId=${provider.id}&date=${date}&serviceId=${selectedServiceId}`
      )
      const data = await res.json()
      if (!res.ok) setSlotsError(data.error || data.message)
      else setSlots(data.slots || [])
    } catch {
      setSlotsError('Erro ao carregar horários')
    } finally {
      setSlotsLoading(false)
    }
  }

  async function book(slotIso: string) {
    if (!token || !provider) return

    setBookingError('')
    setBookingMessage('')
    setBookingLoading(true)

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          providerId: provider.id,
          serviceId: selectedServiceId,
          date: slotIso,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setBookingError(data.error || data.message)
      } else {
        setBookingMessage('Agendamento criado!')
        setAppointments(prev => [data.appointment, ...prev])
      }
    } catch {
      setBookingError('Erro de rede ao agendar')
    } finally {
      setBookingLoading(false)
    }
  }

  if (!user) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>Redirecionando...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1>Olá, {user.name}</h1>
          <p style={styles.subtitle}>Gerencie seus agendamentos e horários em um só lugar.</p>
          {user.isProvider && (
            <p style={styles.subtitle}>
              Você é barbeiro —{' '}
              <a href="/provider/dashboard" style={styles.link}>
                Ir para painel
              </a>
            </p>
          )}
        </header>

        <section style={styles.card}>
          <h2>Agendar horário</h2>

          {providerLoading && <p style={styles.subtitle}>Carregando barbeiro...</p>}
          {providerError && <p style={styles.error}>{providerError}</p>}

          {provider && (
            <>
              <p style={styles.subtitle}>
                <strong>Barbeiro:</strong> {provider.name}
              </p>

              <div style={styles.fieldRow}>
                <label style={styles.label}>
                  Serviço
                  <select
                    value={selectedServiceId}
                    onChange={e => setSelectedServiceId(e.target.value)}
                    style={{ ...styles.input, marginLeft: 8 }}
                  >
                    <option value="">Selecione...</option>
                    {provider.services.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.duration} min — R$ {s.price.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={styles.label}>
                  Data
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    style={{ ...styles.input, marginLeft: 8 }}
                  />
                </label>
              </div>

              <div style={{ marginTop: 12 }}>
                <button onClick={loadSlots} disabled={slotsLoading} style={styles.button}>
                  {slotsLoading ? 'Carregando...' : 'Ver horários'}
                </button>
              </div>

              {slotsError && <p style={styles.error}>{slotsError}</p>}

              {slots.length > 0 && (
                <>
                  <h3>Disponíveis</h3>
                  <div style={styles.chipRow}>
                    {slots.map(slot => {
                      const d = new Date(slot)
                      return (
                        <button
                          key={slot}
                          onClick={() => book(slot)}
                          disabled={bookingLoading}
                          style={styles.ghostButton}
                        >
                          {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {bookingError && <p style={styles.error}>{bookingError}</p>}
              {bookingMessage && <p style={styles.success}>{bookingMessage}</p>}
            </>
          )}
        </section>

        <section style={styles.card}>
          <h2>Meus agendamentos</h2>

          {loading && <p style={styles.subtitle}>Carregando...</p>}
          {error && <p style={styles.error}>{error}</p>}
          {!loading && appointments.length === 0 && (
            <p style={styles.subtitle}>Sem agendamentos ainda.</p>
          )}

          <ul style={styles.list}>
            {appointments.map(a => {
              const date = new Date(a.date)
              return (
                <li key={a.id} style={styles.listItem}>
                  <strong style={{ color: '#e6e8eb' }}>{date.toLocaleString()}</strong>
                  <div>
                    {a.service?.name} — {a.service?.duration} min
                  </div>
                  <div>Barbeiro: {a.provider?.name}</div>
                  <div>Status: {a.status}</div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}
