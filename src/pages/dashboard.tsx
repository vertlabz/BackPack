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

  if (!user) return <div style={{ padding: 20 }}>Redirecionando...</div>

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Olá, {user.name}</h1>

      {user.isProvider && (
        <p>
          Você é barbeiro — <a href="/provider/dashboard">Ir para painel</a>
        </p>
      )}

      <section style={{ marginBottom: 32 }}>
        <h2>Agendar horário</h2>

        {providerLoading && <p>Carregando barbeiro...</p>}
        {providerError && <p style={{ color: 'red' }}>{providerError}</p>}

        {provider && (
          <>
            <p><strong>Barbeiro:</strong> {provider.name}</p>

            <label>
              Serviço:{' '}
              <select
                value={selectedServiceId}
                onChange={e => setSelectedServiceId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {provider.services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.duration} min — R$ {s.price.toFixed(2)}
                  </option>
                ))}
              </select>
            </label>

            <br /><br />

            <label>
              Data:{' '}
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </label>

            <br /><br />

            <button onClick={loadSlots} disabled={slotsLoading}>
              {slotsLoading ? 'Carregando...' : 'Ver horários'}
            </button>

            {slotsError && <p style={{ color: 'red' }}>{slotsError}</p>}

            {slots.length > 0 && (
              <>
                <h3>Disponíveis</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {slots.map(slot => {
                    const d = new Date(slot)
                    return (
                      <button
                        key={slot}
                        onClick={() => book(slot)}
                        disabled={bookingLoading}
                        style={{ padding: '6px 10px' }}
                      >
                        {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {bookingError && <p style={{ color: 'red' }}>{bookingError}</p>}
            {bookingMessage && <p style={{ color: 'green' }}>{bookingMessage}</p>}
          </>
        )}
      </section>

      <section>
        <h2>Meus agendamentos</h2>

        {loading && <p>Carregando...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {!loading && appointments.length === 0 && <p>Sem agendamentos ainda.</p>}

        <ul>
          {appointments.map(a => {
            const date = new Date(a.date)
            return (
              <li key={a.id} style={{ marginBottom: 10, borderBottom: '1px solid #ccc', paddingBottom: 8 }}>
                <strong>{date.toLocaleString()}</strong>
                <br />
                {a.service?.name} — {a.service?.duration} min
                <br />
                Barbeiro: {a.provider?.name}
                <br />
                Status: {a.status}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
