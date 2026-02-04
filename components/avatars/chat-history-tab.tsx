'use client'

export default function ChatHistoryTab() {
  const chatSessions = [
    {
      id: '1',
      date: '2024-01-15',
      time: '14:30',
      sessionId: 'sess-001',
      messages: 12,
      avatar: 'Prof. Elena Bianchi',
    },
    {
      id: '2',
      date: '2024-01-14',
      time: '10:15',
      sessionId: 'sess-002',
      messages: 8,
      avatar: 'Prof. Marco Verdi',
    },
    {
      id: '3',
      date: '2024-01-13',
      time: '16:45',
      sessionId: 'sess-003',
      messages: 15,
      avatar: 'Dr. Anna Rossi',
    },
  ]

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 lg:gap-6">
      {/* Left Panel - Session List */}
      <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-white/20 pb-4 lg:pb-0 lg:pr-6">
        <h2 className="text-xl font-semibold text-white mb-4 drop-shadow-lg">Chat History</h2>
        <div className="space-y-2">
          {chatSessions.map((session) => (
            <button
              key={session.id}
              className="w-full text-left p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl hover:bg-white/20 transition-all shadow-lg"
            >
              <div className="flex justify-between items-start mb-2">
                <p className="font-medium text-white">{session.avatar}</p>
                <span className="text-xs text-white/70 bg-black/20 backdrop-blur-sm px-2 py-1 rounded-lg">{session.messages} messaggi</span>
              </div>
              <p className="text-sm text-white/80">{session.date}</p>
              <p className="text-xs text-white/60">{session.time} • {session.sessionId}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel - Chat Detail */}
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-white mb-4 drop-shadow-lg">Dettaglio Conversazione</h3>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 h-full overflow-y-auto shadow-xl">
          <p className="text-center text-white/70">
            Seleziona una conversazione dalla lista per visualizzare i dettagli
          </p>
        </div>
      </div>
    </div>
  )
}
