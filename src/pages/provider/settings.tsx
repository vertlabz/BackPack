// src/pages/provider/settings.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

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

export default function ProviderSettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [token, setToken] = useState<string | null>(null)

  // Limite de agendamento (maxBookingDays)
  const [maxBookingDays, setMaxBookingDays] = useState<number>(7)
  const [bookingLimitMessage, setBookingLimitMessage] = useState('')
  const [bookingLimitError, setBookingLimitError] = useState('')

  // Serviços
  const [services, setServices] = useState<Service[]>([])
  const [servicesLoading, setServicesLoading] = useState(false)
  const [servicesError, setServicesError] = useState('')
  const [newServiceName, setNewServiceName] = useState('')
  const [newServiceDuration, setNewServiceDuration] = useState(30)
  const [newServicePrice, setNewServicePrice] = useState(50)
  const [serviceMessage, setServiceMessage] = useState('')

  // Preview de slots
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [date, setDate] = useState<string>(() => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate() + 1).padStart(2, '0') // amanhã
    return `${yyyy}-${mm}-${dd}`
  })
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState('')

  // Carrega user/token
  useEffect(() => {
    if (typeof window === 'undefined') return

    const token = window.localStorage.getItem('accessToken')
    const userStr = window.localStorage.getItem('currentUser')

    if (!token || !userStr) {
      router.replace('/login')
      return
    }

    const u = JSON.parse(userStr) as CurrentUser
    if (!u.isProvider) {
      router.replace('/dashboard')
      return
    }

    setUser(u)
    setToken(token)
  }, [router])

  // Carrega serviços do provider
  useEffect(() => {
    if (!token || !user) return

    async function loadServices() {
      setServicesLoading(true)
      setServicesError('')
      try {
        const res = await fetch('/api/provider/services', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) {
          setServicesError(data.error || data.message || 'Erro ao carregar serviços')
        } else {
          setServices(data.services || [])
        }
      } catch {
        setServicesError('Erro de rede ao carregar serviços')
      } finally {
        setServicesLoading(false)
      }
    }

    loadServices()
  }, [token, user])

  // Carrega configuração de maxBookingDays
  useEffect(() => {
    if (!token || !user) return

    async function loadConfig() {
      setBookingLimitError('')
      try {
        const res = await fetch('/api/provider/config', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) {
          setBookingLimitError(data.error || data.message || 'Erro ao carregar configuração')
        } else {
          setMaxBookingDays(data.maxBookingDays ?? 7)
        }
      } catch {
        setBookingLimitError('Erro de rede ao carregar configuração')
      }
    }

    loadConfig()
  }, [token, user])

  async function handleSaveBookingLimit() {
    if (!token) return
    setBookingLimitMessage('')
    setBookingLimitError('')

    const res = await fetch('/api/provider/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ maxBookingDays }),
    })

    const data = await res.json()
    if (!res.ok) {
      setBookingLimitError(data.error || data.message || 'Erro ao salvar configuração')
      return
    }

    setBookingLimitMessage('Limite de agendamento atualizado!')
  }

  async function handleCreateService() {
    if (!token) return
    setServiceMessage('')
    setServicesError('')

    const res = await fetch('/api/provider/services', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: newServiceName,
        duration: newServiceDuration,
        price: newServicePrice,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setServicesError(data.error || data.message || 'Erro ao criar serviço')
      return
    }

    setServiceMessage('Serviço criado!')
    setServices(prev => [...prev, data.service])
    setNewServiceName('')
    // mantém duration e price padrão
  }

  async function handleDeleteService(id: string) {
    if (!token) return
    setServiceMessage('')
    setServicesError('')

    const res = await fetch(`/api/provider/services/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json()
    if (!res.ok) {
      setServicesError(data.error || data.message || 'Erro ao deletar serviço')
      return
    }

    setServices(prev => prev.filter(s => s.id !== id))
    setServiceMessage('Serviço removido')
  }

  async function loadSlots() {
    if (!user || !selectedServiceId || !date) {
      setSlotsError('Selecione serviço e data')
      return
    }
    setSlotsError('')
    setSlots([])
    setSlotsLoading(true)
    try {
      const res = await fetch(
        `/api/appointments/slots?providerId=${user.id}&date=${date}&serviceId=${selectedServiceId}`
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

  if (!user || !token) {
    return <div style={{ padding: 20 }}>Carregando...</div>
  }

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Configurações do Barbeiro</h1>
      <p>Olá, {user.name}</p>

      {/* Seção Limite de Agendamento */}
      <section style={{ marginBottom: 32 }}>
        <h2>Limite de agendamento</h2>
        <p style={{ fontSize: 12, color: '#555' }}>
          Define quantos dias à frente os clientes podem agendar. Padrão: 7 dias.
        </p>
        <div>
          <label>
            Máximo de dias à frente:{' '}
            <input
              type="number"
              min={1}
              max={60}
              value={maxBookingDays}
              onChange={e => setMaxBookingDays(Number(e.target.value))}
            />
          </label>
          <button
            type="button"
            onClick={handleSaveBookingLimit}
            style={{ marginLeft: 8 }}
          >
            Salvar
          </button>
        </div>
        {bookingLimitError && <p style={{ color: 'red' }}>{bookingLimitError}</p>}
        {bookingLimitMessage && <p style={{ color: 'green' }}>{bookingLimitMessage}</p>}
      </section>

      {/* Seção Serviços */}
      <section style={{ marginBottom: 32 }}>
        <h2>Serviços</h2>
        <div style={{ marginBottom: 16 }}>
          <h3>Criar novo serviço</h3>
          <div>
            <label>
              Nome:{' '}
              <input
                value={newServiceName}
                onChange={e => setNewServiceName(e.target.value)}
                placeholder="Corte simples, Barba, etc."
              />
            </label>
          </div>
          <div>
            <label>
              Duração (min):{' '}
              <input
                type="number"
                value={newServiceDuration}
                onChange={e => setNewServiceDuration(Number(e.target.value))}
                min={5}
              />
            </label>
          </div>
          <div>
            <label>
              Preço (R$):{' '}
              <input
                type="number"
                step="0.01"
                value={newServicePrice}
                onChange={e => setNewServicePrice(Number(e.target.value))}
                min={0}
              />
            </label>
          </div>
          <button type="button" onClick={handleCreateService}>
            Salvar serviço
          </button>
          {servicesError && <p style={{ color: 'red' }}>{servicesError}</p>}
          {serviceMessage && <p style={{ color: 'green' }}>{serviceMessage}</p>}
        </div>

        <div>
          <h3>Meus serviços</h3>
          {servicesLoading && <p>Carregando serviços...</p>}
          {!servicesLoading && services.length === 0 && <p>Nenhum serviço cadastrado ainda.</p>}
          <ul>
            {services.map(s => (
              <li key={s.id} style={{ marginBottom: 4 }}>
                {s.name} — {s.duration} min — R$ {s.price.toFixed(2)}{' '}
                <button type="button" onClick={() => handleDeleteService(s.id)}>
                  remover
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Seção Preview de Slots */}
      <section>
        <h2>Preview de horários disponíveis</h2>
        <p style={{ fontSize: 12, color: '#555' }}>
          Os horários abaixo são calculados usando suas disponibilidades, bloqueios e a duração do serviço selecionado.
        </p>

        <div style={{ marginBottom: 16 }}>
          <div>
            <label>
              Serviço:{' '}
              <select
                value={selectedServiceId}
                onChange={e => setSelectedServiceId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.duration} min
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <label>
              Data:{' '}
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </label>
          </div>
          <button type="button" onClick={loadSlots} disabled={slotsLoading}>
            {slotsLoading ? 'Carregando...' : 'Ver slots'}
          </button>
          {slotsError && <p style={{ color: 'red' }}>{slotsError}</p>}
        </div>

        <div>
          <h3>Slots para este dia</h3>
          {slotsLoading && <p>Buscando horários...</p>}
          {!slotsLoading && slots.length === 0 && <p>Nenhum slot disponível.</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {slots.map(slot => {
              const dateObj = new Date(slot)
              const label = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              return (
                <span
                  key={slot}
                  style={{
                    padding: '6px 10px',
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    fontSize: 14,
                  }}
                >
                  {label}
                </span>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
