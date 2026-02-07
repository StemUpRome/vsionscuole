'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { AuthProvider } from '@/context/AuthContext'

const Room = dynamic(() => import('@/components/room'), {
  ssr: false,
})

function RoomWithParams() {
  const searchParams = useSearchParams()
  const avatarId = searchParams.get('avatarId') ?? undefined
  return <Room avatarId={avatarId} />
}

export default function LegacyRoomPage() {
  return (
    <AuthProvider>
      <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#09090b] text-white">Caricamento...</div>}>
        <RoomWithParams />
      </Suspense>
    </AuthProvider>
  )
}


