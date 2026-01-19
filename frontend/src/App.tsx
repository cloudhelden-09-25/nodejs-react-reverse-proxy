import { useState, useEffect } from 'react'

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
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Frontend &lt;-&gt; Backend Demo
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Backend Status</h2>
          {loading && <p className="text-gray-500">Lade...</p>}
          {error && (
            <p className="text-red-600 bg-red-50 px-4 py-2 rounded-md">
              Fehler: {error}
            </p>
          )}
          {health && (
            <p className={`font-bold ${health.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
              Status: {health.status}
            </p>
          )}
          <button
            onClick={fetchData}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Aktualisieren
          </button>
        </div>

        {serverInfo && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Server Info</h2>
            <table className="w-full">
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-2 font-medium text-gray-600">Hostname:</td>
                  <td className="py-2 text-gray-800">{serverInfo.hostname}</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-gray-600">Platform:</td>
                  <td className="py-2 text-gray-800">{serverInfo.platform}</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-gray-600">Uptime:</td>
                  <td className="py-2 text-gray-800">{serverInfo.uptime}s</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-gray-600">Node Version:</td>
                  <td className="py-2 text-gray-800">{serverInfo.nodeVersion}</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-gray-600">Timestamp:</td>
                  <td className="py-2 text-gray-800">{serverInfo.timestamp}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Echo Test</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={echoMessage}
              onChange={(e) => setEchoMessage(e.target.value)}
              placeholder="Nachricht eingeben..."
              onKeyDown={(e) => e.key === 'Enter' && sendEcho()}
              className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={sendEcho}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Senden
            </button>
          </div>
          {echoResponse && (
            <div className="bg-gray-100 rounded-md p-4">
              <p className="text-gray-700 mb-2">
                Server (<span className="font-mono">{echoResponse.serverHostname}</span>) hat geantwortet:
              </p>
              <pre className="bg-gray-800 text-gray-100 p-4 rounded-md overflow-x-auto text-sm">
                {JSON.stringify(echoResponse.received, null, 2)}
              </pre>
              <small className="text-gray-500 mt-2 block">
                um {echoResponse.timestamp}
              </small>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
