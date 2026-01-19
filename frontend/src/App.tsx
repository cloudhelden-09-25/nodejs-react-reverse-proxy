import { useState, useEffect } from 'react'
import './App.css'

interface ServerInfo {
  hostname: string
  platform: string
  uptime: number
  nodeVersion: string
  timestamp: string
}

interface HealthStatus {
  status: string
  timestamp: string
}

interface EchoResponse {
  received: { message: string }
  timestamp: string
  serverHostname: string
}

function App() {
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [echoResponse, setEchoResponse] = useState<EchoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [echoMessage, setEchoMessage] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [infoRes, healthRes] = await Promise.all([
        fetch('/api/info'),
        fetch('/api/health')
      ])

      if (!infoRes.ok || !healthRes.ok) {
        throw new Error('Backend nicht erreichbar')
      }

      setServerInfo(await infoRes.json())
      setHealth(await healthRes.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  const sendEcho = async () => {
    if (!echoMessage.trim()) return
    try {
      const res = await fetch('/api/echo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: echoMessage })
      })
      if (!res.ok) throw new Error('Echo fehlgeschlagen')
      setEchoResponse(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Echo Fehler')
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="app">
      <h1>Frontend &lt;-&gt; Backend Demo</h1>

      <div className="card">
        <h2>Backend Status</h2>
        {loading && <p>Lade...</p>}
        {error && <p className="error">Fehler: {error}</p>}
        {health && (
          <p className={health.status === 'healthy' ? 'healthy' : 'unhealthy'}>
            Status: {health.status}
          </p>
        )}
        <button onClick={fetchData}>Aktualisieren</button>
      </div>

      {serverInfo && (
        <div className="card">
          <h2>Server Info</h2>
          <table>
            <tbody>
              <tr><td>Hostname:</td><td>{serverInfo.hostname}</td></tr>
              <tr><td>Platform:</td><td>{serverInfo.platform}</td></tr>
              <tr><td>Uptime:</td><td>{serverInfo.uptime}s</td></tr>
              <tr><td>Node Version:</td><td>{serverInfo.nodeVersion}</td></tr>
              <tr><td>Timestamp:</td><td>{serverInfo.timestamp}</td></tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <h2>Echo Test</h2>
        <div className="echo-form">
          <input
            type="text"
            value={echoMessage}
            onChange={(e) => setEchoMessage(e.target.value)}
            placeholder="Nachricht eingeben..."
            onKeyDown={(e) => e.key === 'Enter' && sendEcho()}
          />
          <button onClick={sendEcho}>Senden</button>
        </div>
        {echoResponse && (
          <div className="echo-response">
            <p>Server ({echoResponse.serverHostname}) hat geantwortet:</p>
            <pre>{JSON.stringify(echoResponse.received, null, 2)}</pre>
            <small>um {echoResponse.timestamp}</small>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
