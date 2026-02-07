'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

const AVATAR_IMAGES = Array.from({ length: 16 }, (_, i) => `/avatar-${i + 1}.png`)

const DEMO_NAMES = [
  'Arianna', 'Marco', 'Sofia', 'Luca', 'Giulia', 'Alessandro', 'Emma', 'Matteo',
  'Chiara', 'Lorenzo', 'Francesca', 'Andrea', 'Elena', 'Davide', 'Valentina', 'Giovanni',
  'Lexi', 'Anna', 'Paolo', 'Laura', 'Federico', 'Martina', 'Simone', 'Aurora',
]

interface UserAvatar {
  id: string
  name: string
  image: string | null
  languages: string[]
}

export default function AvatarsPage() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [userAvatars, setUserAvatars] = useState<UserAvatar[]>([])
  const [userName, setUserName] = useState('Irene')

  // Carica gli avatar dell'utente da localStorage
  useEffect(() => {
    const savedAvatars = localStorage.getItem('user_avatars')
    if (savedAvatars) {
      try {
        setUserAvatars(JSON.parse(savedAvatars))
      } catch (e) {
        console.error('Error loading user avatars:', e)
      }
    }
  }, [])

  // Ascolta eventi di salvataggio avatar
  useEffect(() => {
    const handleStorageChange = () => {
      const savedAvatars = localStorage.getItem('user_avatars')
      if (savedAvatars) {
        try {
          setUserAvatars(JSON.parse(savedAvatars))
        } catch (e) {
          console.error('Error loading user avatars:', e)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('avatar-saved', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('avatar-saved', handleStorageChange)
    }
  }, [])

  // Avatar di esempio con immagini e nomi random (effetto “funzionante”)
  const demoAvatars = useMemo(() => {
    const shuffledImages = [...AVATAR_IMAGES].sort(() => Math.random() - 0.5)
    const shuffledNames = [...DEMO_NAMES].sort(() => Math.random() - 0.5)
    return Array.from({ length: 12 }, (_, i) => ({
      id: `demo-${i + 1}`,
      name: shuffledNames[i % shuffledNames.length],
      image: shuffledImages[i % shuffledImages.length],
      languages: ['it', 'en'],
    }))
  }, [])

  // Funzione per ottenere gli avatar filtrati
  const getFilteredAvatars = () => {
    let avatars: any[] = []

    if (activeFilter === 'my_creations') {
      avatars = userAvatars.map((avatar, index) => ({
        id: avatar.id,
        name: avatar.name,
        image: avatar.image || AVATAR_IMAGES[index % AVATAR_IMAGES.length],
        languages: avatar.languages || ['it'],
      }))
    } else {
      // Per ora mostra gli avatar demo, in futuro filtrare per categoria
      avatars = demoAvatars
    }

    // Filtra per ricerca
    if (searchQuery) {
      avatars = avatars.filter((avatar) =>
        avatar.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return avatars
  }

  const avatars = getFilteredAvatars()
  const showActionsOnCards = activeFilter === 'my_creations'

  const deleteAvatar = (avatarId: string | undefined) => {
    if (!avatarId) return
    if (!confirm('Eliminare questo avatar? L\'azione non si può annullare.')) return
    try {
      const saved = localStorage.getItem('user_avatars')
      if (!saved) return
      const list = JSON.parse(saved)
      const next = list.filter((a: UserAvatar) => String(a?.id) !== String(avatarId))
      localStorage.setItem('user_avatars', JSON.stringify(next))
      setUserAvatars(next)
      window.dispatchEvent(new Event('avatar-saved'))
    } catch (e) {
      console.error('Error deleting avatar:', e)
    }
  }

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'licei', label: 'Licei' },
    { id: 'its', label: 'ITS' },
    { id: 'istituti_professionali', label: 'Istituti Professionali' },
    { id: 'istituti_tecnici', label: 'Istituti tecnici' },
    { id: 'istituti_comprensivi', label: 'Istituti Comprensivi' },
    { id: 'scuola_infanzia', label: 'Scuola Infanzia' },
    { id: 'my_creations', label: 'My creations' },
    { id: 'more_filters', label: 'More filters' },
  ]

  return (
    <div className="flex h-screen bg-[#1A1A1A] text-white overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-64 bg-[#1A1A1A] border-r border-[#2C2C2E] flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-[#2C2C2E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#6B48FF] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">Z</span>
            </div>
            <span className="text-white font-semibold text-lg">ZenkAI</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#A0A0A0] hover:bg-[#2C2C2E] transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="font-medium">Home</span>
          </button>

          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#2C2C2E] text-white transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="font-medium">Avatar</span>
          </button>

          <button
            onClick={() => router.push('/chat')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#A0A0A0] hover:bg-[#2C2C2E] transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="font-medium">Chat</span>
          </button>

          <button
            onClick={() => router.push('/material')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#A0A0A0] hover:bg-[#2C2C2E] transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span className="font-medium">Material</span>
          </button>

          {/* Separator */}
          <div className="pt-4 border-t border-[#2C2C2E] mt-4"></div>

          <button
            onClick={() => router.push('/settings')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#A0A0A0] hover:bg-[#2C2C2E] transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-medium">Settings</span>
          </button>

          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#A0A0A0] hover:bg-[#2C2C2E] transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Support</span>
          </button>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#2C2C2E]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-[#1A1A1A] text-xs font-bold">I</span>
            </div>
            <div className="flex-1">
              <p className="text-[#A0A0A0] text-sm">Welcome back</p>
              <p className="text-white font-medium">{userName}</p>
            </div>
            <span className="text-lg">👋</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="px-8 py-6 border-b border-[#2C2C2E] flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0A0A0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search Avatar"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#2C2C2E] border border-[#2C2C2E] rounded-xl text-white placeholder-[#A0A0A0] focus:outline-none focus:border-[#6B48FF] transition-colors"
              />
            </div>
          </div>
          <button
            onClick={() => router.push('/avatars/new')}
            className="ml-4 px-6 py-3 bg-[#6B48FF] text-white rounded-xl font-medium hover:bg-[#5A3FE6] transition-colors"
          >
            Create new Avatar
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Title Section */}
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-white mb-2">Avatars</h1>
            <p className="text-[#A0A0A0] text-base">
              Explore filter and manage your avatars
            </p>
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-3 mb-8 overflow-x-auto scrollbar-hide pb-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => {
                  if (filter.id !== 'more_filters') {
                    setActiveFilter(filter.id)
                  }
                }}
                className={`px-5 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                  activeFilter === filter.id
                    ? 'bg-[#6B48FF] text-white'
                    : 'bg-[#2C2C2E] text-[#A0A0A0] hover:bg-[#333335]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Avatar Grid - key forza re-render quando cambia il filtro (es. My creations) */}
          <div key={activeFilter} className="grid grid-cols-4 gap-4">
            {avatars.length > 0 ? (
              avatars.map((avatar) => (
                <div
                  key={avatar.id}
                  className="bg-[#2C2C2E] rounded-2xl overflow-hidden hover:bg-[#333335] transition-colors group relative"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/avatars/${avatar.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(`/avatars/${avatar.id}`)}
                    className="block cursor-pointer"
                  >
                    <div className="aspect-square bg-gradient-to-br from-[#2C2C2E] to-[#1A1A1A] relative overflow-hidden">
                      <img
                        src={avatar.image || AVATAR_IMAGES[0]}
                        alt={avatar.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = AVATAR_IMAGES[0]
                        }}
                      />
                    </div>
                  </div>
                  <div
                    className="p-4 flex flex-col gap-2 min-h-[72px]"
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/avatars/${avatar.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(`/avatars/${avatar.id}`)}
                  >
                    <p className="text-white font-medium text-sm truncate">{avatar.name}</p>
                    {showActionsOnCards && (
                      <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-[#3F3F46] shrink-0 bg-[#1F1F23] -mx-1 px-2 py-1.5 rounded-b-lg" onClick={(e) => e.stopPropagation()} data-avatar-actions>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            router.push(`/avatars/new?edit=${encodeURIComponent(avatar.id)}`)
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/25 hover:bg-white/35 text-white text-xs font-semibold border border-white/40"
                        >
                          Modifica
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteAvatar(avatar.id); }}
                          className="px-3 py-1.5 rounded-lg bg-red-500/90 hover:bg-red-500 text-white text-xs font-semibold"
                        >
                          Elimina
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); router.push(`/room/legacy?avatarId=${encodeURIComponent(avatar.id)}`); }}
                          className="ml-auto px-3 py-1.5 rounded-lg bg-[#6B48FF] text-white text-xs font-semibold hover:bg-[#5A3FE6]"
                        >
                          Room
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-4 flex items-center justify-center py-16">
                <div className="text-center">
                  <svg className="w-16 h-16 text-[#A0A0A0] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <p className="text-[#A0A0A0] text-lg mb-2">No avatars found</p>
                  <p className="text-[#A0A0A0] text-sm mb-4">
                    {activeFilter === 'my_creations'
                      ? 'Create your first avatar to get started'
                      : 'Try adjusting your filters'}
                  </p>
                  {activeFilter === 'my_creations' && (
                    <button
                      onClick={() => router.push('/avatars/new')}
                      className="px-6 py-2 bg-[#6B48FF] text-white rounded-xl font-medium hover:bg-[#5A3FE6] transition-colors"
                    >
                      Create Avatar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
