'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'

type QuestionType = 'true_false' | 'multiple' | 'open'

interface BaseQuestion {
  id: string
  text: string
  type: QuestionType
}

interface ChoiceQuestion extends BaseQuestion {
  type: 'true_false' | 'multiple'
  options: { id: string; label: string }[]
}

interface OpenQuestion extends BaseQuestion {
  type: 'open'
}

type Question = ChoiceQuestion | OpenQuestion

// 10 questions: 1 true_false, 2 open, 3 multiple, then repeat pattern
const DEMO_QUESTIONS: Question[] = [
  { id: '1', type: 'true_false', text: LOREM, options: [{ id: 't', label: 'True' }, { id: 'f', label: 'False' }] },
  { id: '2', type: 'open', text: LOREM },
  {
    id: '3',
    type: 'multiple',
    text: LOREM,
    options: [
      { id: 'a', label: 'Answer' },
      { id: 'b', label: 'Answer' },
      { id: 'c', label: 'Answer' },
      { id: 'd', label: 'Answer' },
    ],
  },
  { id: '4', type: 'true_false', text: LOREM, options: [{ id: 't', label: 'True' }, { id: 'f', label: 'False' }] },
  { id: '5', type: 'open', text: LOREM },
  {
    id: '6',
    type: 'multiple',
    text: LOREM,
    options: [
      { id: 'a', label: 'Answer' },
      { id: 'b', label: 'Answer' },
      { id: 'c', label: 'Answer' },
      { id: 'd', label: 'Answer' },
    ],
  },
  { id: '7', type: 'true_false', text: LOREM, options: [{ id: 't', label: 'True' }, { id: 'f', label: 'False' }] },
  { id: '8', type: 'open', text: LOREM },
  {
    id: '9',
    type: 'multiple',
    text: LOREM,
    options: [
      { id: 'a', label: 'Answer' },
      { id: 'b', label: 'Answer' },
      { id: 'c', label: 'Answer' },
      { id: 'd', label: 'Answer' },
    ],
  },
  { id: '10', type: 'true_false', text: LOREM, options: [{ id: 't', label: 'True' }, { id: 'f', label: 'False' }] },
]

export default function QuizPlayPage() {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [openAnswer, setOpenAnswer] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const question = useMemo(() => DEMO_QUESTIONS[currentIndex], [currentIndex])
  const total = DEMO_QUESTIONS.length
  const isLast = currentIndex === total - 1
  const isOpen = question.type === 'open'
  const canSubmit = isOpen ? true : !!selectedOption

  const handleSubmit = () => {
    const value = isOpen ? openAnswer : selectedOption
    if (value) setAnswers((prev) => ({ ...prev, [question.id]: value }))
    if (isLast) {
      // Demo: 2 correct out of 10
      router.push(`/quiz/completed?correct=2&total=${total}`)
      return
    }
    setCurrentIndex((i) => i + 1)
    setSelectedOption(null)
    setOpenAnswer('')
  }

  const handleDontKnow = () => {
    if (isLast) {
      router.push(`/quiz/completed?correct=2&total=${total}`)
      return
    }
    setCurrentIndex((i) => i + 1)
    setSelectedOption(null)
    setOpenAnswer('')
  }

  const choiceQuestion = question.type !== 'open' ? (question as ChoiceQuestion) : null
  const gridCols = choiceQuestion && choiceQuestion.options.length === 2 ? 'grid-cols-2' : 'grid-cols-2'

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white flex flex-col">
      <header className="flex items-center justify-between p-6 border-b border-[#2C2C2E]">
        <Link href="/avatars" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#6B48FF] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">Z</span>
          </div>
          <span className="text-white font-semibold text-lg">ZenkAI</span>
        </Link>
        <button
          type="button"
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#2C2C2E] text-[#A0A0A0] hover:text-white hover:bg-[#333335] transition-colors"
          aria-label="Menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM16 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM16 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-2xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">
          Domanda {currentIndex + 1}
        </h2>
        <p className="text-[#E5E5E5] text-center mb-10 leading-relaxed">{question.text}</p>

        {choiceQuestion && (
          <div className={`w-full grid ${gridCols} gap-4 mb-10`}>
            {choiceQuestion.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedOption(opt.id)}
                className={`px-5 py-4 rounded-xl font-medium text-left transition-all border-2 ${
                  selectedOption === opt.id
                    ? 'bg-[#2C2C2E] border-[#22C55E] text-white'
                    : 'bg-[#2C2C2E] border-transparent text-white hover:bg-[#333335]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {isOpen && (
          <div className="w-full mb-10">
            <input
              type="text"
              value={openAnswer}
              onChange={(e) => setOpenAnswer(e.target.value)}
              placeholder="Your answer"
              className="w-full px-5 py-4 bg-[#2C2C2E] border border-[#2C2C2E] rounded-xl text-white placeholder-[#A0A0A0] focus:outline-none focus:border-[#6B48FF]"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 w-full">
          <button
            type="button"
            onClick={handleDontKnow}
            className="px-5 py-3 bg-[#2C2C2E] text-white rounded-xl font-medium hover:bg-[#333335] transition-colors"
          >
            Don&apos;t know the answer
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-8 py-3 bg-[#6B48FF] text-white rounded-xl font-medium hover:bg-[#5A3FE6] transition-colors"
          >
            Submit
          </button>
        </div>
      </main>

      <div className="p-6">
        <button
          type="button"
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#2C2C2E] text-[#A0A0A0] hover:text-white hover:bg-[#333335] transition-colors"
          aria-label="Menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM16 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM16 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
