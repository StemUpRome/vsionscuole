'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import WorkArea from '@/components/avatars/work-area'

export default function AvatarWorkAreaPage() {
  const params = useParams()
  const router = useRouter()
  const avatarId = params.avatarId as string

  // Mock avatar data - in produzione verrà dal database
  const [avatar, setAvatar] = useState<{
    id: string
    name: string
    image: string
  } | null>(null)

  useEffect(() => {
    // TODO: Caricare dati avatar dal database
    const isVisualRoom = avatarId === 'visual'
    setAvatar({
      id: avatarId,
      name: isVisualRoom ? 'Visual Room' : `Avatar ${avatarId}`,
      image: '',
    })
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

  return <WorkArea avatarId={avatarId} avatarName={avatar.name} />
}
