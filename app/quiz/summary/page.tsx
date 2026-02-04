'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'

// Demo: question 3 is multiple choice; we show user picked top-right (wrong), correct is bottom-left
const TOTAL_QUESTIONS = 10
const QUESTION_3_OPTIONS = [
  { id: 'a', label: 'Answer' },
  { id: 'b', label: 'Answer' },
  { id: 'c', label: 'Answer' },
  { id: 'd', label: 'Answer' },
]

// Simulated: Q1 correct, Q2 wrong, Q3 wrong (selected b, correct c), Q4-10 unanswered
const DEMO_STATUS: ('correct' | 'incorrect' | null)[] = [
  'correct',
  'incorrect',
  'incorrect',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
]
const DEMO_SELECTED = ['t', '', 'b', 'f', '', '', 't', '', '', 'f']
const DEMO_CORRECT_OPTION = ['t', '', 'c', 'f', '', '', 't', '', '', 'f']

export default function QuizSummaryPage() {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(2) // Question 3

  const selectedId = DEMO_SELECTED[currentIndex]
  const correctId = DEMO_CORRECT_OPTION[currentIndex]
  const isMultiple = currentIndex === 2 || currentIndex === 5 || currentIndex === 8
  const isTrueFalse = currentIndex === 0 || currentIndex === 3 || currentIndex === 6 || currentIndex === 9

  const handleFinish = () => router.push('/dashboard')

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white flex">
      <header className="absolute top-0 left-0 right-0 flex items-center p-6 border-b border-[#2C2C2E] z-10">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#6B48FF] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">Z</span>
          </div>
          <span className="text-white font-semibold text-lg">ZenkAI</span>
        </Link>
      </header>

      {/* Sidebar: question numbers 1-10 */}
      <aside className="w-20 pt-24 pb-6 pl-4 pr-2 border-r border-[#2C2C2E] flex flex-col items-center gap-2">
        {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentIndex(i)}
            className={`w-10 h-10 rounded-lg font-medium flex items-center justify-center transition-colors ${
              currentIndex === i
                ? 'bg-[#2C2C2E] border-2 border-white text-white'
                : DEMO_STATUS[i] === 'correct'
                  ? 'bg-[#1A1A1A] border-2 border-[#22C55E] text-white'
                  : DEMO_STATUS[i] === 'incorrect'
                    ? 'bg-[#1A1A1A] border-2 border-[#EF4444] text-white'
                    : 'bg-[#1A1A1A] border-2 border-[#2C2C2E] text-[#A0A0A0] hover:border-[#333335]'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </aside>

      <main className="flex-1 flex flex-col pt-24 pb-6 px-8 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-4">Question {currentIndex + 1}</h2>
        <p className="text-[#E5E5E5] mb-8 leading-relaxed">{LOREM}</p>

        {isMultiple && (
          <div className="grid grid-cols-2 gap-4 mb-10">
            {QUESTION_3_OPTIONS.map((opt) => {
              const isSelected = selectedId === opt.id
              const isCorrect = correctId === opt.id
              const border =
                isCorrect ? 'border-[#22C55E]' : isSelected ? 'border-[#EF4444]' : 'border-transparent'
              return (
                <div
                  key={opt.id}
                  className={`px-5 py-4 rounded-xl font-medium bg-[#2C2C2E] border-2 ${border} text-white`}
                >
                  {opt.label}
                </div>
              )
            })}
          </div>
        )}

        {isTrueFalse && (
          <div className="grid grid-cols-2 gap-4 mb-10">
            {['True', 'False'].map((label, i) => {
              const id = label === 'True' ? 't' : 'f'
              const isSelected = selectedId === id
              const isCorrect = correctId === id
              const border =
                isCorrect ? 'border-[#22C55E]' : isSelected ? 'border-[#EF4444]' : 'border-transparent'
              return (
                <div
                  key={id}
                  className={`px-5 py-4 rounded-xl font-medium bg-[#2C2C2E] border-2 ${border} text-white`}
                >
                  {label}
                </div>
              )
            })}
          </div>
        )}

        {!isMultiple && !isTrueFalse && (
          <div className="mb-10 px-5 py-4 bg-[#2C2C2E] rounded-xl text-[#A0A0A0]">
            Your answer (open)
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 mt-auto">
          <button
            type="button"
            className="px-5 py-3 bg-[#2C2C2E] text-white rounded-xl font-medium hover:bg-[#333335] transition-colors"
          >
            See explanation
          </button>
          <button
            type="button"
            onClick={handleFinish}
            className="px-8 py-3 bg-[#6B48FF] text-white rounded-xl font-medium hover:bg-[#5A3FE6] transition-colors"
          >
            Finish
          </button>
        </div>
      </main>
    </div>
  )
}
