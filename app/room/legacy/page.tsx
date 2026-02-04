'use client'

import dynamic from 'next/dynamic'
import { AuthProvider } from '@/context/AuthContext'

// Import dinamico per evitare SSR (usa solo lato client)
const Room = dynamic(() => import('@/components/room'), {
  ssr: false,
})

export default function LegacyRoomPage() {
  return (
    <AuthProvider>
      <Room />
    </AuthProvider>
  )
}


