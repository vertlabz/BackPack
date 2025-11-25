// src/pages/book/[providerId].tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

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

export default function BookPage() {
  const router = useRouter()
  const { providerId } = router.query

  const [token, setToken] = useState<string | null>(null)
  const [provider, setProvider] = useState<Provider | null>(null)
  const [providerError, setProviderError] = useState('')
  const [providerLoading, setProviderLoading] = useState(true)

  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [date, setDate] = useState<string>(() => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate() + 1).padStart(2, '0') // sugere amanhã
    return `${yyyy}-${mm}-${dd}`
  })

  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState('')

  const [bookingMessage, setBookingMessage] = useState('')
  const [bookingError, setBookingError] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)

  // Carrega token e garante que está logado
  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = window.localStorage.getItem('accessToken')
    const userStr = window.localStorage.getItem('currentUser')

    if (!token || !userStr) {
      router.replace('/login')
      return
    }

    setToken(token)
  }, [router])

  // Carrega provider + serviços
  useEffect(() => {
    if (!providerId) return

    async function loadProvider() {
      setProviderLoading(true)
      setProviderError('')
      try {
        const res = await fetch(`/api/providers/${providerId}`)
        const data = await res.json()
        if (!res.ok) {
          setProviderError(data.error || data.message || 'Erro ao carregar barbeiro')
        } else {
          setProvider({
            id: data.provider.id,
            name: data.provider.name,
            services: data.provider.services || [],
          })
        }
      } catch {
        setProviderError('Erro de rede ao carregar barbeiro')
      } finally {
        setProviderLoading(false)
      }
    }

    loadProvider()
  }, [providerId])

  async function loadSlots() {
    if (!providerId || !selectedServiceId || !date) {
      setSlotsError('Selecione serviço e data')
      return
    }
    setSlotsError('')
    setSlots([])
    setSlotsLoading(true)
    try {
      const res = await fetch(
        `/api/appointments/slots?providerId=${providerId}&date=${date}&serviceId=${selectedServiceId}`
      )
      const data = await res.json()
      if (!res.ok) {
        setSlotsError(data.error || data.message || 'Erro ao carregar horários')
      } else {
        setSlots(data.slots || [])
      }
    } catch {
      setSlotsError('Erro de rede ao carregar horários')
    } finally {
      setSlotsLoading(false)
    }
  }

  async function book(slotIso: string) {
    if (!token) {
      router.replace('/login')
      return
    }
    setBookingMessage('')
    setBookingError('')
    setBookingLoading(true)

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          providerId,
          serviceId: selectedServiceId,
          date: slotIso,
          notes: '',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setBookingError(data.error || data.message || 'Erro ao criar agendamento')
      } else {
        setBookingMessage('Agendamento criado com sucesso!')
        // você pode redirecionar depois de alguns segundos
      }
    } catch {
      setBookingError('Erro de rede ao criar agendamento')
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Agendar horário</h1>

      {providerLoading && <p>Carregando barbeiro...</p>}
      {providerError && <p style={{ color: 'red' }}>{providerError}</p>}
      {provider && (
        <>
          <h2>{provider.name}</h2>

          {/* Escolher serviço */}
          <section style={{ marginBottom: 24 }}>
            <h3>Escolha o serviço</h3>
            {provider.services.length === 0 && <p>Este barbeiro ainda não tem serviços cadastrados.</p>}
            {provider.services.length > 0 && (
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
            )}
          </section>

          {/* Escolher data */}
          <section style={{ marginBottom: 24 }}>
            <h3>Escolha a data</h3>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </section>

          {/* Carregar slots */}
          <section style={{ marginBottom: 24 }}>
            <button type="button" onClick={loadSlots} disabled={slotsLoading}>
              {slotsLoading ? 'Carregando...' : 'Ver horários disponíveis'}
            </button>
            {slotsError && <p style={{ color: 'red' }}>{slotsError}</p>}
          </section>

          {/* Mostrar slots */}
          <section>
            <h3>Horários disponíveis</h3>
            {slotsLoading && <p>Buscando horários...</p>}
            {!slotsLoading && slots.length === 0 && <p>Nenhum horário disponível para este dia.</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {slots.map(slot => {
                const d = new Date(slot)
                const label = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => book(slot)}
                    disabled={bookingLoading}
                    style={{ padding: '6px 10px', cursor: 'pointer' }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {bookingError && <p style={{ color: 'red' }}>{bookingError}</p>}
            {bookingMessage && <p style={{ color: 'green' }}>{bookingMessage}</p>}
          </section>
        </>
      )}
    </div>
  )
}
