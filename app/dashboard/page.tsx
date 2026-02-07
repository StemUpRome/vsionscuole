'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'

const AVATAR_IMAGES = Array.from({ length: 16 }, (_, i) => `/avatar-${i + 1}.png`)

export default function DashboardPage() {
  const router = useRouter()
  const [userName, setUserName] = useState('Irene')
  const [recentAvatars, setRecentAvatars] = useState<any[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const placeholderAvatars = useMemo(() => {
    const names = ['Lexi', 'Arianna', 'Giovanni', 'Arianna']
    const indices = [...Array(16)].map((_, i) => i).sort(() => Math.random() - 0.5)
    return indices.slice(0, 4).map((imgIndex, i) => ({
      name: names[i],
      image: AVATAR_IMAGES[imgIndex],
    }))
  }, [])

  const loadAvatars = () => {
    const savedAvatars = localStorage.getItem('user_avatars')
    if (savedAvatars) {
      try {
        const avatars = JSON.parse(savedAvatars)
        setRecentAvatars(avatars.slice(-4).reverse())
      } catch (e) {
        console.error('Error loading avatars:', e)
      }
    }
  }

  useEffect(() => {
    loadAvatars()
  }, [])

  const deleteAvatar = (avatarId: string | undefined) => {
    if (!avatarId) return
    if (!confirm('Eliminare questo avatar? L\'azione non si può annullare.')) return
    try {
      const saved = localStorage.getItem('user_avatars')
      if (!saved) return
      const avatars = JSON.parse(saved)
      const next = avatars.filter((a: any) => String(a?.id) !== String(avatarId))
      localStorage.setItem('user_avatars', JSON.stringify(next))
      loadAvatars()
      window.dispatchEvent(new Event('avatar-saved'))
    } catch (e) {
      console.error('Error deleting avatar:', e)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="flex h-screen h-dvh max-h-dvh bg-[#1A1A1A] text-white overflow-hidden">
      {/* Overlay mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50 w-64 bg-[#1A1A1A] border-r border-[#2C2C2E] flex flex-col
        transform transition-transform duration-200 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 sm:p-6 border-b border-[#2C2C2E] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity cursor-pointer shrink-0">
            <div className="w-10 h-10 bg-[#6B48FF] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">Z</span>
            </div>
            <span className="text-white font-semibold text-lg">ZenkAI</span>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#A0A0A0] hover:bg-[#2C2C2E]"
            aria-label="Chiudi menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 sm:py-6 space-y-1 overflow-y-auto">
          <button
            type="button"
            onClick={() => { router.push('/dashboard'); setSidebarOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-xl bg-[#6B48FF] text-white transition-all text-left"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="font-medium">Home</span>
          </button>

          <button
            type="button"
            onClick={() => { router.push('/avatars'); setSidebarOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-xl text-[#A0A0A0] hover:bg-[#2C2C2E] transition-all text-left"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="font-medium">Avatar</span>
          </button>

          <button
            type="button"
            onClick={() => { router.push('/chat'); setSidebarOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-xl text-[#A0A0A0] hover:bg-[#2C2C2E] transition-all text-left"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="font-medium">Chat</span>
          </button>

          <button
            type="button"
            onClick={() => { router.push('/material'); setSidebarOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-xl text-[#A0A0A0] hover:bg-[#2C2C2E] transition-all text-left"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span className="font-medium">Material</span>
          </button>

          <div className="pt-4 border-t border-[#2C2C2E] mt-4"></div>

          <button
            type="button"
            onClick={() => { router.push('/settings'); setSidebarOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-xl text-[#A0A0A0] hover:bg-[#2C2C2E] transition-all text-left"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-medium">Settings</span>
          </button>

          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-xl text-[#A0A0A0] hover:bg-[#2C2C2E] transition-all text-left"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Support</span>
          </button>
        </nav>

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

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-[#2C2C2E] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden self-start p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-white hover:bg-[#2C2C2E]"
            aria-label="Apri menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex-1 min-w-0 max-w-md w-full sm:mx-0 mx-auto order-3 sm:order-1">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0A0A0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                placeholder="Search Avatar"
                className="w-full pl-12 pr-4 py-3 min-h-[44px] bg-[#2C2C2E] border border-[#2C2C2E] rounded-xl text-white placeholder-[#A0A0A0] focus:outline-none focus:border-[#6B48FF] transition-colors text-base"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/avatars/new')}
            className="min-h-[48px] px-4 sm:px-6 py-3 bg-[#6B48FF] text-white rounded-xl font-medium hover:bg-[#5A3FE6] transition-colors text-sm sm:text-base order-2 sm:order-2 shrink-0"
          >
            Create new Avatar
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold text-white mb-1 sm:mb-2">
              {getGreeting()}, {userName}
            </h1>
            <p className="text-[#A0A0A0] text-base sm:text-lg">
              What would you like to explore today?
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div
              role="button"
              tabIndex={0}
              onClick={() => router.push('/quiz/new')}
              onKeyDown={(e) => e.key === 'Enter' && router.push('/quiz/new')}
              className="bg-[#2C2C2E] rounded-2xl p-5 sm:p-6 hover:bg-[#333335] transition-colors cursor-pointer min-h-[120px] flex flex-col"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#4285F4] rounded-xl flex items-center justify-center mb-3 sm:mb-4 shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-base sm:text-lg mb-1 sm:mb-2">Quiz</h3>
              <p className="text-[#A0A0A0] text-sm">Focus on learning more about fractions</p>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => router.push('/summary/new')}
              onKeyDown={(e) => e.key === 'Enter' && router.push('/summary/new')}
              className="bg-[#2C2C2E] rounded-2xl p-5 sm:p-6 hover:bg-[#333335] transition-colors cursor-pointer min-h-[120px] flex flex-col"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#6B48FF] rounded-xl flex items-center justify-center mb-3 sm:mb-4 shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-base sm:text-lg mb-1 sm:mb-2">Summary</h3>
              <p className="text-[#A0A0A0] text-sm">Focus on learning more about fractions</p>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => router.push('/room/legacy')}
              onKeyDown={(e) => e.key === 'Enter' && router.push('/room/legacy')}
              className="bg-[#2C2C2E] rounded-2xl p-5 sm:p-6 hover:bg-[#333335] transition-colors cursor-pointer min-h-[120px] flex flex-col sm:col-span-2 lg:col-span-1"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#FFA726] rounded-xl flex items-center justify-center mb-3 sm:mb-4 shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-base sm:text-lg mb-1 sm:mb-2">Visual</h3>
              <p className="text-[#A0A0A0] text-sm">Focus on learning more about fractions</p>
            </div>
          </div>

          <div className="bg-[#2C2C2E] rounded-2xl p-5 sm:p-6 mb-6 sm:mb-8">
            <h2 className="text-white font-semibold text-lg sm:text-xl mb-2">Today&apos;s insight</h2>
            <p className="text-[#A0A0A0] text-sm mb-4">
              Learn about an interesting fact about today
            </p>
            <button type="button" className="min-h-[44px] px-6 py-2 bg-[#6B48FF] text-white rounded-xl font-medium hover:bg-[#5A3FE6] transition-colors">
              Explore
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-white font-semibold text-lg sm:text-xl mb-4">Recent Avatars</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {recentAvatars.length > 0 ? (
                recentAvatars.map((avatar, index) => (
                  <div
                    key={avatar.id || index}
                    className="bg-[#2C2C2E] rounded-2xl overflow-hidden hover:bg-[#333335] transition-colors group relative"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/avatars/${avatar.id || index}`)}
                      onKeyDown={(e) => e.key === 'Enter' && router.push(`/avatars/${avatar.id || index}`)}
                      className="block"
                    >
                      <div className="aspect-[3/4] bg-gradient-to-br from-[#2C2C2E] to-[#1A1A1A] relative overflow-hidden">
                        <img
                          src={avatar.image || AVATAR_IMAGES[index % AVATAR_IMAGES.length]}
                          alt={avatar.name || 'Avatar'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3 sm:p-4">
                        <p className="text-white font-medium text-xs sm:text-sm truncate">{avatar.name || `Avatar ${index + 1}`}</p>
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); router.push(`/avatars/${avatar.id}`); }}
                        className="px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-semibold border border-white/30"
                      >
                        Modifica
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); deleteAvatar(avatar.id); }}
                        className="px-2 py-1 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-[10px] font-semibold"
                      >
                        Elimina
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); router.push(`/room/legacy?avatarId=${encodeURIComponent(avatar.id)}`); }}
                        className="ml-auto px-2 py-1 rounded-lg bg-[#6B48FF] text-white text-[10px] font-semibold hover:bg-[#5A3FE6]"
                      >
                        Room
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                placeholderAvatars.map((item, index) => (
                  <div
                    key={index}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push('/avatars/new')}
                    onKeyDown={(e) => e.key === 'Enter' && router.push('/avatars/new')}
                    className="bg-[#2C2C2E] rounded-2xl overflow-hidden cursor-pointer hover:bg-[#333335] transition-colors group"
                  >
                    <div className="aspect-[3/4] bg-gradient-to-br from-[#2C2C2E] to-[#1A1A1A] relative overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3 sm:p-4">
                      <p className="text-white font-medium text-xs sm:text-sm">{item.name}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
