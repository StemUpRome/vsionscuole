'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import WorkArea from '@/components/avatars/work-area'

type AvatarData = {
  id: string
  name: string
  image: string
  convaiCharacterId?: string
}

export default function AvatarWorkAreaPage() {
  const params = useParams()
  const router = useRouter()
  const avatarId = params.avatarId as string

  const [avatar, setAvatar] = useState<AvatarData | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !avatarId) return
    const isVisualRoom = avatarId === 'visual'
    if (isVisualRoom) {
      setAvatar({ id: avatarId, name: 'Visual Room', image: '' })
      return
    }
    try {
      const raw = localStorage.getItem('user_avatars')
      const avatars: AvatarData[] = raw ? JSON.parse(raw) : []
      const found = avatars.find((a) => String(a?.id) === String(avatarId))
      if (found) {
        setAvatar({
          id: found.id,
          name: found.name || `Avatar`,
          image: found.image || '/avatar-1.png',
          convaiCharacterId: found.convaiCharacterId,
        })
      } else {
        setAvatar({ id: avatarId, name: `Avatar ${avatarId}`, image: '/avatar-1.png' })
      }
    } catch {
      setAvatar({ id: avatarId, name: `Avatar ${avatarId}`, image: '/avatar-1.png' })
    }
  }, [avatarId])

  if (!avatar) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center text-white">
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl px-6 py-4 shadow-2xl text-sm md:text-base text-slate-100">
          Caricamento area di lavoro avatar...
        </div>
      </main>
    )
  }

  const accent = 'from-violet-500 to-blue-600'

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <header className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-3 bg-slate-900/80 border-b border-violet-500/20">
        <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
          <span aria-hidden>←</span>
          <span>I tuoi avatar</span>
        </Link>
        <div className="flex items-center gap-3">
          {avatar.image && (
            <img
              src={avatar.image}
              alt=""
              className="w-10 h-10 rounded-xl object-cover border-2 border-violet-500/50"
            />
          )}
          <span className="font-semibold text-white">{avatar.name}</span>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/room/legacy?avatarId=${encodeURIComponent(avatarId)}`)}
          className={`px-4 py-2 rounded-xl bg-gradient-to-r ${accent} hover:opacity-95 text-white text-sm font-bold transition-opacity shadow-lg shadow-violet-500/25`}
        >
          Entra in Room
        </button>
      </header>
      <div className="flex-1 min-h-0">
        <WorkArea avatarId={avatarId} avatarName={avatar.name} />
      </div>
    </div>
  )
}
