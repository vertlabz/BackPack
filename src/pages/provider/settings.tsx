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
  const [cancelBookingHours, setCancelBookingHours] = useState<number>(2)
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

  const styles = {
    page: {
      minHeight: '100vh',
      background: '#0b0d10',
      color: '#e6e8eb',
      padding: '40px 20px 60px',
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    },
    container: {
      maxWidth: 1000,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 24,
    },
    card: {
      background: '#111418',
      border: '1px solid #1f242c',
      borderRadius: 16,
      padding: 24,
    },
    subtitle: { color: '#9aa4b2', fontSize: 14 },
    helper: { fontSize: 12, color: '#9aa4b2' },
    field: { display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 12 },
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
      padding: '6px 10px',
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
    chipRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 8 },
    chip: {
      padding: '6px 10px',
      border: '1px solid #2a2f36',
      borderRadius: 999,
      fontSize: 13,
      color: '#e6e8eb',
      background: '#0f1216',
    },
  }

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
          setCancelBookingHours(data.cancelBookingHours ?? 2)
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
      body: JSON.stringify({ maxBookingDays, cancelBookingHours }),
    })

    const data = await res.json()
    if (!res.ok) {
      setBookingLimitError(data.error || data.message || 'Erro ao salvar configuração')
      return
    }

    setBookingLimitMessage('Configurações atualizadas!')
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
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.card}>
          <h1>Configurações do Barbeiro</h1>
          <p style={styles.subtitle}>Olá, {user.name}</p>
        </header>

      {/* Seção Limite de Agendamento */}
        <section style={styles.card}>
        <h2>Limite de agendamento</h2>
          <p style={styles.helper}>
          Define quantos dias à frente os clientes podem agendar. Padrão: 7 dias.
        </p>
          <p style={styles.helper}>
          Também define o prazo mínimo de cancelamento para clientes e barbeiro.
        </p>
          <div style={styles.field}>
            <label style={styles.label}>Máximo de dias à frente</label>
            <input
              type="number"
              min={1}
              max={60}
              value={maxBookingDays}
              onChange={e => setMaxBookingDays(Number(e.target.value))}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Cancelamento permitido até (horas antes)</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="number"
                min={0}
                max={72}
                value={cancelBookingHours}
                onChange={e => setCancelBookingHours(Number(e.target.value))}
                style={styles.input}
              />
              <button type="button" onClick={handleSaveBookingLimit} style={styles.button}>
                Salvar
              </button>
            </div>
          </div>
          {bookingLimitError && <p style={styles.error}>{bookingLimitError}</p>}
          {bookingLimitMessage && <p style={styles.success}>{bookingLimitMessage}</p>}
        </section>

      {/* Seção Serviços */}
        <section style={styles.card}>
        <h2>Serviços</h2>
          <div style={{ marginBottom: 16 }}>
          <h3>Criar novo serviço</h3>
            <div style={styles.field}>
              <label style={styles.label}>Nome</label>
              <input
                value={newServiceName}
                onChange={e => setNewServiceName(e.target.value)}
                placeholder="Corte simples, Barba, etc."
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Duração (min)</label>
              <input
                type="number"
                value={newServiceDuration}
                onChange={e => setNewServiceDuration(Number(e.target.value))}
                min={5}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Preço (R$)</label>
              <input
                type="number"
                step="0.01"
                value={newServicePrice}
                onChange={e => setNewServicePrice(Number(e.target.value))}
                min={0}
                style={styles.input}
              />
            </div>
            <button type="button" onClick={handleCreateService} style={styles.button}>
              Salvar serviço
            </button>
            {servicesError && <p style={styles.error}>{servicesError}</p>}
            {serviceMessage && <p style={styles.success}>{serviceMessage}</p>}
          </div>

          <div>
            <h3>Meus serviços</h3>
            {servicesLoading && <p style={styles.subtitle}>Carregando serviços...</p>}
            {!servicesLoading && services.length === 0 && (
              <p style={styles.subtitle}>Nenhum serviço cadastrado ainda.</p>
            )}
            <ul style={styles.list}>
              {services.map(s => (
                <li key={s.id} style={styles.listItem}>
                  {s.name} — {s.duration} min — R$ {s.price.toFixed(2)}{' '}
                  <button type="button" onClick={() => handleDeleteService(s.id)} style={styles.ghostButton}>
                    remover
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

      {/* Seção Preview de Slots */}
        <section style={styles.card}>
        <h2>Preview de horários disponíveis</h2>
          <p style={styles.helper}>
          Os horários abaixo são calculados usando suas disponibilidades, bloqueios e a duração do serviço selecionado.
        </p>

          <div style={{ marginBottom: 16 }}>
            <div style={styles.field}>
              <label style={styles.label}>Serviço</label>
              <select
                value={selectedServiceId}
                onChange={e => setSelectedServiceId(e.target.value)}
                style={styles.input}
              >
                <option value="">Selecione...</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.duration} min
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Data</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={styles.input}
              />
            </div>
            <button type="button" onClick={loadSlots} disabled={slotsLoading} style={styles.button}>
              {slotsLoading ? 'Carregando...' : 'Ver slots'}
            </button>
            {slotsError && <p style={styles.error}>{slotsError}</p>}
          </div>

          <div>
            <h3>Slots para este dia</h3>
            {slotsLoading && <p style={styles.subtitle}>Buscando horários...</p>}
            {!slotsLoading && slots.length === 0 && <p style={styles.subtitle}>Nenhum slot disponível.</p>}
            <div style={styles.chipRow}>
              {slots.map(slot => {
                const dateObj = new Date(slot)
                const label = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                return (
                  <span key={slot} style={styles.chip}>
                    {label}
                  </span>
                )
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
