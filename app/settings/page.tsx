'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SettingsPage() {
  const router = useRouter()
  const [userName] = useState('Irene')
  const [formData, setFormData] = useState({
    name: 'Irene',
    surname: '',
    email: '',
    language: 'English',
  })
  const accent = 'from-violet-500 to-blue-600'

  const handleLogout = () => {
    console.log('Logout')
  }

  const handleChangeEmail = () => {
    console.log('Change email')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Save settings', formData)
  }

  return (
    <div className="min-h-screen h-dvh bg-slate-950 text-white flex flex-col">
      <header className="flex-shrink-0 sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-violet-500/20">
        <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:shadow-violet-500/50 transition-shadow`}>
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <span className="text-white font-semibold text-lg hidden sm:inline">VERSE WEB</span>
          </Link>

          <div className="flex-1 flex items-center justify-center min-w-0">
            <button
              onClick={() => router.push('/avatars')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">I tuoi avatar</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 pl-2 border-l border-violet-500/20">
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${accent} flex items-center justify-center shadow-violet-500/20`}>
                <span className="text-white text-xs font-bold">{userName.charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-white font-medium text-sm truncate max-w-[80px] sm:max-w-[120px] hidden sm:block">{userName}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Impostazioni
            </h1>
            <p className="text-slate-400 text-base">Gestisci account e preferenze</p>
          </div>

          <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-white mb-2">Nome</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/60 border border-violet-500/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-violet-500/50 transition-colors"
                placeholder="Il tuo nome"
              />
            </div>

            <div>
              <label htmlFor="surname" className="block text-sm font-medium text-white mb-2">Cognome</label>
              <input
                type="text"
                id="surname"
                value={formData.surname}
                onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/60 border border-violet-500/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-violet-500/50 transition-colors"
                placeholder="Il tuo cognome"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">Email</label>
              <div className="flex gap-3">
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="flex-1 px-4 py-3 bg-slate-800/60 border border-violet-500/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-violet-500/50 transition-colors"
                  placeholder="La tua email"
                />
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="px-6 py-3 bg-slate-800/60 border border-violet-500/20 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  Modifica
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="language" className="block text-sm font-medium text-white mb-2">Lingua</label>
              <select
                id="language"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/60 border border-violet-500/20 rounded-xl text-white focus:outline-none focus:border-violet-500/50 transition-colors"
              >
                <option value="English">English</option>
                <option value="Italian">Italiano</option>
                <option value="Spanish">Español</option>
                <option value="French">Français</option>
                <option value="German">Deutsch</option>
              </select>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className={`px-6 py-3 bg-gradient-to-r ${accent} text-white rounded-xl font-medium hover:opacity-95 shadow-lg shadow-violet-500/25 transition-opacity`}
              >
                Salva modifiche
              </button>
            </div>

            <div className="pt-8 border-t border-violet-500/20">
              <button
                type="button"
                onClick={handleLogout}
                className="px-6 py-3 bg-slate-800/60 border border-violet-500/20 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
              >
                Esci
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
