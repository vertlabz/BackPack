// src/pages/provider/dashboard.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

type CurrentUser = {
  id: string
  name: string
  email: string
  isProvider: boolean
}

type Appointment = {
  id: string
  date: string
  status: string
  notes?: string | null
  customer?: { id: string; name: string; email: string }
  service?: { id: string; name: string; duration: number; price: number }
}

type Availability = {
  id: string
  weekday: number
  startTime: string
  endTime: string
}

type Service = {
  id: string
  name: string
  duration: number
  price: number
}

type Block = {
  id: string
  startAt: string
  endAt: string
  reason?: string | null
}

const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function ProviderDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [token, setToken] = useState<string | null>(null)

  // Agenda do dia
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  })
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [apptError, setApptError] = useState('')
  const [apptLoading, setApptLoading] = useState(false)

  // Disponibilidades
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [availError, setAvailError] = useState('')
  const [availLoading, setAvailLoading] = useState(false)
  const [newWeekday, setNewWeekday] = useState(1)
  const [newStartTime, setNewStartTime] = useState('09:00')
  const [newEndTime, setNewEndTime] = useState('18:00')
  const [availMessage, setAvailMessage] = useState('')

  // Serviços
  const [services, setServices] = useState<Service[]>([])
  const [servicesError, setServicesError] = useState('')
  const [servicesLoading, setServicesLoading] = useState(false)

  // Bloqueios
  const [blocks, setBlocks] = useState<Block[]>([])
  const [blocksError, setBlocksError] = useState('')
  const [blocksLoading, setBlocksLoading] = useState(false)
  const [blockStart, setBlockStart] = useState('')
  const [blockEnd, setBlockEnd] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [blockMessage, setBlockMessage] = useState('')

  const styles = {
    page: {
      minHeight: '100vh',
      background: '#0b0d10',
      color: '#e6e8eb',
      padding: '40px 20px 60px',
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    },
    container: {
      maxWidth: 1100,
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
    link: { color: '#7aa2ff', textDecoration: 'none' },
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
    helper: { fontSize: 12, color: '#9aa4b2' },
  }

  // Carrega user/token do localStorage
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

  // Agenda do dia
  useEffect(() => {
    if (!token || !user) return

    async function loadAppointments() {
      setApptLoading(true)
      setApptError('')
      try {
        const res = await fetch(`/api/provider/appointments?date=${selectedDate}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) {
          setApptError(data.error || data.message || 'Erro ao carregar agenda')
        } else {
          setAppointments(data.appointments || [])
        }
      } catch {
        setApptError('Erro de rede ao carregar agenda')
      } finally {
        setApptLoading(false)
      }
    }

    loadAppointments()
  }, [token, user, selectedDate])

  // Disponibilidades
  useEffect(() => {
    if (!token || !user) return

    async function loadAvailabilities() {
      setAvailLoading(true)
      setAvailError('')
      try {
        const res = await fetch('/api/provider/availability', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) {
          setAvailError(data.error || data.message || 'Erro ao carregar disponibilidades')
        } else {
          setAvailabilities(data.availabilities || [])
        }
      } catch {
        setAvailError('Erro de rede ao carregar disponibilidades')
      } finally {
        setAvailLoading(false)
      }
    }

    loadAvailabilities()
  }, [token, user])

  // Services do provider (pra ver durations)
  useEffect(() => {
    if (!token || !user) return
    const userId = user.id

    async function loadServices() {
      setServicesLoading(true)
      setServicesError('')
      try {
        const res = await fetch(`/api/providers/${userId}`)
        const data = await res.json()
        if (!res.ok) {
          setServicesError(data.error || data.message || 'Erro ao carregar serviços')
        } else {
          setServices(data.provider?.services || [])
        }
      } catch {
        setServicesError('Erro de rede ao carregar serviços')
      } finally {
        setServicesLoading(false)
      }
    }

    loadServices()
  }, [token, user])

  // Bloqueios
  useEffect(() => {
    if (!token || !user) return

    async function loadBlocks() {
      setBlocksLoading(true)
      setBlocksError('')
      try {
        const res = await fetch('/api/provider/blocks', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) {
          setBlocksError(data.error || data.message || 'Erro ao carregar bloqueios')
        } else {
          setBlocks(data.blocks || [])
        }
      } catch {
        setBlocksError('Erro de rede ao carregar bloqueios')
      } finally {
        setBlocksLoading(false)
      }
    }

    loadBlocks()
  }, [token, user])

  async function handleCreateAvailability() {
    if (!token) return
    setAvailMessage('')
    setAvailError('')

    const res = await fetch('/api/provider/availability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        weekday: newWeekday,
        startTime: newStartTime,
        endTime: newEndTime,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setAvailError(data.error || data.message || 'Erro ao criar disponibilidade')
      return
    }

    setAvailMessage('Disponibilidade criada!')
    setAvailabilities(prev => [...prev, data.availability])
  }

  async function handleDeleteAvailability(id: string) {
    if (!token) return
    setAvailError('')
    setAvailMessage('')

    const res = await fetch(`/api/provider/availability/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) {
      setAvailError(data.error || data.message || 'Erro ao deletar disponibilidade')
      return
    }

    setAvailabilities(prev => prev.filter(a => a.id !== id))
    setAvailMessage('Disponibilidade removida')
  }

  async function handleCreateBlock() {
    if (!token) return
    setBlockMessage('')
    setBlocksError('')

    const res = await fetch('/api/provider/blocks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        startAt: blockStart,
        endAt: blockEnd,
        reason: blockReason || null,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setBlockMessage(data.error || data.message || 'Erro ao criar bloqueio')
      return
    }

    setBlockMessage('Bloqueio criado!')
    setBlockStart('')
    setBlockEnd('')
    setBlockReason('')

    // Atualiza lista
    setBlocks(prev => [...prev, data.block])
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
          <h1>Painel do Barbeiro</h1>
          <p style={styles.subtitle}>Olá, {user.name}</p>
          <a href="/provider/settings" style={styles.link}>
            Ir para configurações (serviços e preview de slots)
          </a>
        </header>

      {/* Agenda do Dia */}
        <section style={styles.card}>
        <h2>Agenda do dia</h2>
          <label style={styles.label}>
            Data
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ ...styles.input, marginLeft: 8 }}
            />
          </label>

          {apptLoading && <p style={styles.subtitle}>Carregando agenda...</p>}
          {apptError && <p style={styles.error}>{apptError}</p>}

          {!apptLoading && !apptError && (
            <ul style={styles.list}>
              {appointments.length === 0 && (
                <li style={styles.listItem}>Nenhum horário marcado neste dia.</li>
              )}
              {appointments.map(appt => {
                const dt = new Date(appt.date)
                const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                return (
                  <li key={appt.id} style={styles.listItem}>
                    <div>
                      <strong style={{ color: '#e6e8eb' }}>Hora:</strong> {timeStr}
                    </div>
                    {appt.customer && (
                      <div>
                        <strong style={{ color: '#e6e8eb' }}>Cliente:</strong> {appt.customer.name}
                      </div>
                    )}
                    {appt.service && (
                      <div>
                        <strong style={{ color: '#e6e8eb' }}>Serviço:</strong> {appt.service.name} (
                        {appt.service.duration} min)
                      </div>
                    )}
                    <div>
                      <strong style={{ color: '#e6e8eb' }}>Status:</strong> {appt.status}
                    </div>
                    {appt.notes && (
                      <div>
                        <strong style={{ color: '#e6e8eb' }}>Obs:</strong> {appt.notes}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

      {/* Serviços */}
        <section style={styles.card}>
        <h2>Serviços</h2>
          {servicesLoading && <p style={styles.subtitle}>Carregando serviços...</p>}
          {servicesError && <p style={styles.error}>{servicesError}</p>}
          {!servicesLoading && services.length === 0 && (
            <p style={styles.subtitle}>Nenhum serviço cadastrado (ainda).</p>
          )}
          <ul style={styles.list}>
            {services.map(s => (
              <li key={s.id} style={styles.listItem}>
                {s.name} — {s.duration} min — R$ {s.price.toFixed(2)}
              </li>
            ))}
          </ul>
          <p style={styles.helper}>
          (No cálculo dos slots de agendamento, a duração do serviço é usada como intervalo entre um corte e outro.)
        </p>
        </section>

      {/* Disponibilidades */}
        <section style={styles.card}>
        <h2>Disponibilidades Semanais</h2>

          <div style={{ marginBottom: 16 }}>
          <h3>Adicionar disponibilidade</h3>
            <div style={styles.field}>
              <label style={styles.label}>Dia da semana</label>
              <select
                value={newWeekday}
                onChange={e => setNewWeekday(Number(e.target.value))}
                style={styles.input}
              >
                {weekdayLabels.map((label, idx) => (
                  <option key={idx} value={idx}>
                    {label} ({idx})
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Início</label>
              <input
                type="time"
                value={newStartTime}
                onChange={e => setNewStartTime(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Fim</label>
              <input
                type="time"
                value={newEndTime}
                onChange={e => setNewEndTime(e.target.value)}
                style={styles.input}
              />
            </div>
            <button type="button" onClick={handleCreateAvailability} style={styles.button}>
              Salvar disponibilidade
            </button>
            {availError && <p style={styles.error}>{availError}</p>}
            {availMessage && <p style={styles.success}>{availMessage}</p>}
          </div>

          <div>
            <h3>Minhas disponibilidades</h3>
            {availLoading && <p style={styles.subtitle}>Carregando...</p>}
            {!availLoading && availabilities.length === 0 && (
              <p style={styles.subtitle}>Nenhuma disponibilidade cadastrada ainda.</p>
            )}
            <ul style={styles.list}>
              {availabilities.map(a => (
                <li key={a.id} style={styles.listItem}>
                  {weekdayLabels[a.weekday]}: {a.startTime} - {a.endTime}{' '}
                  <button type="button" onClick={() => handleDeleteAvailability(a.id)} style={styles.ghostButton}>
                    remover
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

      {/* Bloqueios */}
        <section style={styles.card}>
        <h2>Bloqueios (férias, horário de almoço, etc.)</h2>
          <p style={styles.subtitle}>Use isso para marcar períodos em que não quer receber agendamentos.</p>

          <div style={{ marginBottom: 16 }}>
            <div style={styles.field}>
              <label style={styles.label}>Início</label>
              <input
                type="datetime-local"
                value={blockStart}
                onChange={e => setBlockStart(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Fim</label>
              <input
                type="datetime-local"
                value={blockEnd}
                onChange={e => setBlockEnd(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Motivo</label>
              <input
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                placeholder="Férias, almoço, manutenção..."
                style={styles.input}
              />
            </div>
            <button type="button" onClick={handleCreateBlock} style={styles.button}>
              Criar bloqueio
            </button>
            {blockMessage && <p style={styles.success}>{blockMessage}</p>}
            {blocksError && <p style={styles.error}>{blocksError}</p>}
          </div>

          <div>
            <h3>Bloqueios cadastrados</h3>
            {blocksLoading && <p style={styles.subtitle}>Carregando bloqueios...</p>}
            {!blocksLoading && blocks.length === 0 && (
              <p style={styles.subtitle}>Nenhum bloqueio cadastrado.</p>
            )}
            <ul style={styles.list}>
              {blocks.map(b => {
                const start = new Date(b.startAt).toLocaleString()
                const end = new Date(b.endAt).toLocaleString()
                return (
                  <li key={b.id} style={styles.listItem}>
                    {start} - {end} {b.reason && `(${b.reason})`}
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}
