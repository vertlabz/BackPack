import type { GetServerSideProps } from 'next'

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB'] as const

type MemoryUsage = {
  rss: number
  heapUsed: number
  heapTotal: number
  external: number
}

type HealthProps = {
  status: string
  uptime: number
  timestamp: string
  nodeVersion: string
  memoryUsage: MemoryUsage
}

function formatBytes(value: number) {
  if (value === 0) return '0 B'

  const exponent = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    BYTE_UNITS.length - 1
  )
  const converted = value / 1024 ** exponent

  return `${converted.toFixed(2)} ${BYTE_UNITS[exponent]}`
}

export const getServerSideProps: GetServerSideProps<HealthProps> = async () => {
  const memory = process.memoryUsage()

  return {
    props: {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      memoryUsage: {
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
      },
    },
  }
}

export default function HealthPage({
  status,
  uptime,
  timestamp,
  nodeVersion,
  memoryUsage,
}: HealthProps) {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: '48px auto',
        padding: '0 24px',
        fontFamily: 'sans-serif',
      }}
    >
      <h1>Saúde do sistema</h1>
      <p>Endpoint: GET /health</p>

      <section style={{ marginTop: 24 }}>
        <h2>Status</h2>
        <p>
          <strong>{status.toUpperCase()}</strong>
        </p>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Detalhes</h2>
        <ul>
          <li>Timestamp: {timestamp}</li>
          <li>Uptime: {Math.round(uptime)}s</li>
          <li>Node: {nodeVersion}</li>
          <li>Memória RSS: {formatBytes(memoryUsage.rss)}</li>
          <li>Memória Heap: {formatBytes(memoryUsage.heapUsed)}</li>
          <li>Heap Total: {formatBytes(memoryUsage.heapTotal)}</li>
          <li>Memória Externa: {formatBytes(memoryUsage.external)}</li>
        </ul>
      </section>
    </main>
  )
}
