'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UploadModal } from '@/components/quiz/upload-modal'
import { ExistingDocumentsModal, type DocItem } from '@/components/quiz/existing-documents-modal'

const STEPS = 3
const QUIZ_FORMATS = [
  { id: 'single', label: 'Single choice' },
  { id: 'multiple', label: 'Multiple choice' },
  { id: 'closed', label: 'Closed answers' },
  { id: 'open', label: 'Open answers' },
] as const

export default function CreateQuizPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [prompt, setPrompt] = useState('')
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [selectedFormats, setSelectedFormats] = useState<string[]>([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showExistingModal, setShowExistingModal] = useState(false)
  const [attachedDocs, setAttachedDocs] = useState<DocItem[]>([])

  const progress = (step / STEPS) * 100

  const toggleFormat = (id: string) => {
    setSelectedFormats((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]))
  }

  const handleNext = () => {
    if (step < STEPS) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleCreateQuiz = () => {
    // TODO: call API to create quiz, then redirect to play
    router.push(`/quiz/play?formats=${selectedFormats.join(',')}`)
  }

  const handleUploadFile = (file: File) => {
    setAttachedDocs((prev) => [...prev, { id: `file-${Date.now()}`, name: file.name }])
    setShowUploadModal(false)
  }

  const handleExistingFile = () => {
    setShowUploadModal(false)
    setShowExistingModal(true)
  }

  const handleExistingSelect = (selected: DocItem[]) => {
    setAttachedDocs((prev) => [...prev, ...selected])
    setShowExistingModal(false)
  }

  const removeAttachedDoc = (id: string) => {
    setAttachedDocs((prev) => prev.filter((d) => d.id !== id))
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-[#2C2C2E]">
        <Link href="/avatars" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#6B48FF] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">Z</span>
          </div>
          <span className="text-white font-semibold text-lg">ZenkAI</span>
        </Link>
      </header>

      {/* Progress bar */}
      <div className="h-1 w-full bg-[#2C2C2E]">
        <div
          className="h-full bg-[#6B48FF] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-2xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">Create a quiz</h1>

        {step === 1 && (
          <>
            <p className="text-[#A0A0A0] text-center mb-6">
              Upload a file, use one from your materials or write a prompt yourself
            </p>
            <div className="w-full relative">
              <div className="w-full min-h-[180px] px-5 py-4 bg-[#2C2C2E] border border-[#2C2C2E] rounded-2xl focus-within:border-[#6B48FF] transition-colors flex flex-col">
                {attachedDocs.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {attachedDocs.map((doc) => (
                      <span
                        key={doc.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1A1A1A] rounded-full text-sm text-white"
                      >
                        <svg className="w-4 h-4 text-[#A0A0A0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {doc.name}
                        <button
                          type="button"
                          onClick={() => removeAttachedDoc(doc.id)}
                          className="p-0.5 rounded hover:bg-[#2C2C2E] text-[#A0A0A0] hover:text-white"
                          aria-label="Remove"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Write a prompt"
                  rows={4}
                  className="flex-1 w-full bg-transparent text-white placeholder-[#A0A0A0] focus:outline-none resize-none"
                />
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="self-start w-8 h-8 flex items-center justify-center rounded-lg bg-[#1A1A1A] text-[#A0A0A0] hover:text-white hover:bg-[#2C2C2E] transition-colors"
                  title="Upload or attach"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="mt-8 flex gap-4 w-full justify-end">
              <button
                type="button"
                onClick={handleNext}
                className="px-8 py-3 bg-[#6B48FF] text-white rounded-xl font-medium hover:bg-[#5A3FE6] transition-colors"
              >
                Next
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-[#A0A0A0] text-center mb-6">
              Explain the level of difficulty and the target of this quiz
            </p>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Additional informations"
              rows={6}
              className="w-full px-5 py-4 bg-[#2C2C2E] border border-[#2C2C2E] rounded-2xl text-white placeholder-[#A0A0A0] focus:outline-none focus:border-[#6B48FF] transition-colors resize-none mb-8"
            />
            <div className="flex gap-4 w-full justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="px-8 py-3 bg-[#2C2C2E] text-white rounded-xl font-medium hover:bg-[#333335] transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="px-8 py-3 bg-[#6B48FF] text-white rounded-xl font-medium hover:bg-[#5A3FE6] transition-colors"
              >
                Next
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-[#A0A0A0] text-center mb-8">You can combine different question types.</p>
            <div className="grid grid-cols-2 gap-4 w-full mb-10">
              {QUIZ_FORMATS.map((format) => (
                <button
                  key={format.id}
                  type="button"
                  onClick={() => toggleFormat(format.id)}
                  className={`px-5 py-4 rounded-xl font-medium transition-all ${
                    selectedFormats.includes(format.id)
                      ? 'bg-[#6B48FF] text-white border-2 border-[#6B48FF]'
                      : 'bg-[#2C2C2E] text-white border-2 border-transparent hover:bg-[#333335]'
                  }`}
                >
                  {format.label}
                </button>
              ))}
            </div>
            <div className="flex gap-4 w-full justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="px-8 py-3 bg-[#2C2C2E] text-white rounded-xl font-medium hover:bg-[#333335] transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCreateQuiz}
                className="px-8 py-3 bg-[#6B48FF] text-white rounded-xl font-medium hover:bg-[#5A3FE6] transition-colors"
              >
                Create quiz
              </button>
            </div>
          </>
        )}
      </main>

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadFile={handleUploadFile}
        onExistingFile={handleExistingFile}
      />
      <ExistingDocumentsModal
        isOpen={showExistingModal}
        onClose={() => setShowExistingModal(false)}
        onSelect={handleExistingSelect}
      />
    </div>
  )
}
