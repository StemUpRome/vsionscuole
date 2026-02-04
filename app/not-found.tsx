'use client'

import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 via-blue-600 to-blue-900 flex flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-6xl md:text-8xl font-bold text-white mb-4">404</h1>
        <p className="text-xl md:text-2xl text-white/90 mb-8">
          Pagina non trovata
        </p>
        <button
          onClick={() => router.push('/')}
          className="bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-400/90 hover:to-blue-600/90 text-white px-6 py-3 rounded-xl transition-all font-medium shadow-lg border border-blue-400/50"
        >
          Torna alla Home
        </button>
      </div>
    </div>
  )
}
