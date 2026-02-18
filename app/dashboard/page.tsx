'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/avatars')
  }, [router])
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
      <p className="text-slate-400">Reindirizzamento...</p>
    </div>
  )
}
