'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function QuizCompletedContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const correct = Number(searchParams.get('correct')) || 0
  const total = Number(searchParams.get('total')) || 10

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white flex flex-col">
      <header className="p-6 border-b border-[#2C2C2E]">
        <Link href="/avatars" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#6B48FF] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">Z</span>
          </div>
          <span className="text-white font-semibold text-lg">ZenkAI</span>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-2xl mx-auto w-full text-center">
        <p className="text-xl md:text-2xl text-white mb-12 leading-relaxed">
          You successfully completed the quiz, answering correctly {correct} out of {total} questions
        </p>

        <div className="w-full space-y-4">
          <button
            type="button"
            onClick={() => router.push('/quiz/new')}
            className="w-full text-left px-6 py-4 bg-[#2C2C2E] hover:bg-[#333335] rounded-xl transition-colors border border-[#2C2C2E]"
          >
            <span className="block font-semibold text-white mb-1">Generate new questions</span>
            <span className="block text-sm text-[#A0A0A0]">
              Using the same material generate new questions
            </span>
          </button>

          <button
            type="button"
            onClick={() => router.push('/quiz/summary')}
            className="w-full text-left px-6 py-4 bg-[#2C2C2E] hover:bg-[#333335] rounded-xl transition-colors border border-[#2C2C2E]"
          >
            <span className="block font-semibold text-white mb-1">Quiz summary</span>
            <span className="block text-sm text-[#A0A0A0]">
              Analyze the quiz summary and see where you lack.
            </span>
          </button>

          <button
            type="button"
            onClick={() => router.push('/quiz/play')}
            className="w-full text-left px-6 py-4 bg-[#2C2C2E] hover:bg-[#333335] rounded-xl transition-colors border border-[#2C2C2E]"
          >
            <span className="block font-semibold text-white mb-1">Retry quiz</span>
            <span className="block text-sm text-[#A0A0A0]">
              Challenge yourself on the same questions
            </span>
          </button>
        </div>
      </main>
    </div>
  )
}

export default function QuizCompletedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center text-white">Caricamento...</div>}>
      <QuizCompletedContent />
    </Suspense>
  )
}
