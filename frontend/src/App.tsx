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
  database: string
  timestamp: string
}

interface Message {
  id: number
  content: string
  created_at: string
}

function App() {
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [infoRes, healthRes] = await Promise.all([
        fetch('/api/info'),
        fetch('/api/health')
      ])

      if (!infoRes.ok || !healthRes.ok) {
        throw new Error('offline')
      }

      const infoText = await infoRes.text()
      const healthText = await healthRes.text()

      try {
        setServerInfo(JSON.parse(infoText))
        setHealth(JSON.parse(healthText))
      } catch {
        throw new Error('offline')
      }
    } catch {
      setServerInfo(null)
      setHealth({ status: 'offline', database: 'disconnected', timestamp: new Date().toISOString() })
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/messages')
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch {
      // ignore
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage })
      })
      if (res.ok) {
        setNewMessage('')
        fetchMessages()
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchData()
    fetchMessages()
  }, [])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-12 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            NodePulse
          </h1>
          <p className="text-slate-500 mt-2">Server Health Dashboard</p>
        </div>

        {/* Backend Status */}
        <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Backend Status</h2>
            <div className="flex gap-2">
              {health && (
                <>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    health.status === 'healthy'
                      ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-md shadow-emerald-200'
                      : health.status === 'offline'
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md shadow-amber-200'
                      : 'bg-gradient-to-r from-red-400 to-rose-500 text-white shadow-md shadow-red-200'
                  }`}>
                    {health.status}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    health.database === 'connected'
                      ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-md shadow-emerald-200'
                      : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md shadow-amber-200'
                  }`}>
                    DB: {health.database}
                  </span>
                </>
              )}
            </div>
          </div>

          {loading && <p className="text-slate-400">Lade...</p>}
          {!loading && health?.status === 'offline' && (
            <p className="text-amber-700 bg-amber-50 border-l-4 border-amber-500 px-4 py-3 rounded-r-xl">
              Backend ist nicht erreichbar. Läuft der Server?
            </p>
          )}

          <button
            onClick={() => { fetchData(); fetchMessages(); }}
            className="mt-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-2.5 px-6 rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all active:scale-95"
          >
            Aktualisieren
          </button>
        </div>

        {/* Server Info */}
        {serverInfo && (
          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-shadow">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Server Info</h2>
            <div className="space-y-1">
              {[
                ['Hostname', serverInfo.hostname],
                ['Platform', serverInfo.platform],
                ['Uptime', `${serverInfo.uptime}s`],
                ['Node Version', serverInfo.nodeVersion],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-slate-800 font-mono font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-shadow">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Messages</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Nachricht eingeben..."
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all"
            />
            <button
              onClick={sendMessage}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-2.5 px-6 rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all active:scale-95"
            >
              Senden
            </button>
          </div>

          {messages.length > 0 && (
            <div className="mt-5 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-4">
                  <p className="text-slate-800">{msg.content}</p>
                  <p className="text-slate-400 text-xs mt-2">{formatDate(msg.created_at)}</p>
                </div>
              ))}
            </div>
          )}

          {messages.length === 0 && health?.database === 'connected' && (
            <p className="mt-4 text-slate-400 text-center py-8">Noch keine Nachrichten vorhanden</p>
          )}

          {health?.database === 'disconnected' && health?.status !== 'offline' && (
            <p className="mt-4 text-amber-700 bg-amber-50 border-l-4 border-amber-500 px-4 py-3 rounded-r-xl">
              Datenbank nicht verbunden
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
