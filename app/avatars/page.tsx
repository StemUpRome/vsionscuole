'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const AVATAR_IMAGES_FALLBACK = Array.from({ length: 16 }, (_, i) => `/avatar-${i + 1}.png`)

interface UserAvatar {
  id: string
  name: string
  image: string | null
  languages: string[]
}

export default function AvatarsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [userAvatars, setUserAvatars] = useState<UserAvatar[]>([])
  const [userName, setUserName] = useState('Irene')
  const [avatarImages, setAvatarImages] = useState<string[]>(AVATAR_IMAGES_FALLBACK)

  useEffect(() => {
    let cancelled = false
    fetch('/api/avatar-images')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data?.images) && data.images.length > 0)
          setAvatarImages(data.images)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

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
  const avatars = userAvatars
    .map((avatar, index) => ({
      id: avatar.id,
      name: avatar.name,
      image: avatar.image || avatarImages[index % avatarImages.length],
      languages: avatar.languages || ['it'],
    }))
    .filter((avatar) =>
      searchQuery ? avatar.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
    )

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

  const accent = 'from-violet-500 to-blue-600'

  return (
    <div className="min-h-screen h-dvh bg-slate-950 text-white flex flex-col">
      {/* Header unico: logo, titolo area avatar, search, rotella settings, utente */}
      <header className="flex-shrink-0 sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-violet-500/20">
        <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:shadow-violet-500/50 transition-shadow`}>
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <span className="text-white font-semibold text-lg hidden sm:inline">VERSE WEB</span>
          </Link>

          <div className="flex-1 flex items-center justify-center min-w-0 max-w-xl mx-4">
            <div className="relative w-full">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Cerca avatar"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-violet-500/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-violet-500/50 transition-colors text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => router.push('/avatars/new')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r ${accent} text-white font-medium text-sm hover:opacity-95 transition-opacity shadow-lg shadow-violet-500/25`}
            >
              Crea avatar
            </button>
            <Link
              href="/settings"
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              aria-label="Impostazioni"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
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
              I tuoi avatar
            </h1>
            <p className="text-slate-400 text-base max-w-xl">
              Crea e gestisci i tuoi avatar. Clicca per modificare o entrare in Room e dialogare.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {avatars.length > 0 ? (
              avatars.map((avatar) => (
                <div
                  key={avatar.id}
                  className="bg-slate-800/60 rounded-2xl overflow-hidden border border-violet-500/20 hover:border-violet-500/40 hover:scale-[1.02] hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-300 group relative"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/avatars/${avatar.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(`/avatars/${avatar.id}`)}
                    className="block cursor-pointer"
                  >
                    <div className="aspect-square bg-slate-800 relative overflow-hidden">
                      <img
                        src={avatar.image || avatarImages[0]}
                        alt={avatar.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = avatarImages[0]
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
                    <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-violet-500/20 shrink-0 bg-slate-900/80 -mx-1 px-2 py-1.5 rounded-b-lg" onClick={(e) => e.stopPropagation()} data-avatar-actions>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            router.push(`/avatars/new?edit=${encodeURIComponent(avatar.id)}`)
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-white text-xs font-semibold border border-violet-500/30"
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
                          className={`ml-auto px-3 py-1.5 rounded-lg bg-gradient-to-r ${accent} text-white text-xs font-semibold hover:opacity-90`}
                        >
                          Room
                        </button>
                      </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 sm:col-span-3 lg:col-span-4 flex items-center justify-center py-16">
                <div className="text-center max-w-md">
                  <svg className="w-20 h-20 text-slate-500 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <h2 className="text-xl font-semibold text-white mb-2">Nessun avatar ancora</h2>
                  <p className="text-slate-400 text-sm mb-6">
                    Crea il tuo primo avatar: definisci identità, conoscenze e comportamento, poi entra in Room per dialogare.
                  </p>
                  <button
                    onClick={() => router.push('/avatars/new')}
                    className={`px-6 py-3 bg-gradient-to-r ${accent} text-white rounded-xl font-medium hover:opacity-95 shadow-lg shadow-violet-500/25 transition-opacity`}
                  >
                    Crea il tuo avatar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
