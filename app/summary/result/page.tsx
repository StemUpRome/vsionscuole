'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'

const DEMO_SECTIONS = [
  { number: 1, subtitle: 'Subtitle' },
  { number: 2, subtitle: 'Subtitle' },
  { number: 3, subtitle: 'Subtitle' },
  { number: 4, subtitle: 'Subtitle' },
]

function SummaryResultContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [title, setTitle] = useState('Title summary')

  useEffect(() => {
    if (!id) return
    try {
      const raw = localStorage.getItem('user_summaries')
      const list = raw ? JSON.parse(raw) : []
      const found = list.find((s: { id: string }) => s.id === id)
      if (found?.prompt) setTitle(found.prompt.slice(0, 50) || 'Title summary')
    } catch (_) {}
  }, [id])

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white flex flex-col">
      <header className="flex items-center justify-between p-6 border-b border-[#2C2C2E]">
        <Link href="/avatars" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#6B48FF] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">Z</span>
          </div>
          <span className="text-white font-semibold text-lg">ZenkAI</span>
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">{title}</h1>

        <div className="space-y-8 mb-12">
          {DEMO_SECTIONS.map((section) => (
            <section key={section.number}>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span className="text-[#6B48FF]">&gt;</span>
                <span>{section.number} {section.subtitle}</span>
              </h2>
              <p className="text-[#A0A0A0] leading-relaxed">{LOREM}</p>
              <p className="text-[#A0A0A0] leading-relaxed mt-2">{LOREM}</p>
            </section>
          ))}
        </div>

        <div className="bg-[#2C2C2E] rounded-2xl p-8 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Create a quiz</h2>
          <p className="text-[#A0A0A0] text-sm mb-6">
            Create a quiz related to this summary
          </p>
          <button
            type="button"
            onClick={() => router.push('/quiz/new')}
            className="px-8 py-3 bg-[#6B48FF] text-white rounded-xl font-medium hover:bg-[#5A3FE6] transition-colors"
          >
            Create quiz
          </button>
        </div>
      </main>
    </div>
  )
}

export default function SummaryResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center text-white">Caricamento...</div>}>
      <SummaryResultContent />
    </Suspense>
  )
}
