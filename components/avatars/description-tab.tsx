'use client'

import { useState } from 'react'

interface DescriptionTabProps {
  description: string
  onChange: (description: string) => void
  avatarName?: string
  personality?: {
    openness: number
    conscientiousness: number
    extraversion: number
    agreeableness: number
    neuroticism: number
  }
}

export default function DescriptionTab({ description, onChange, avatarName, personality }: DescriptionTabProps) {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedDescription, setGeneratedDescription] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Inserisci un prompt per generare la descrizione')
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedDescription(null)

    try {
      const response = await fetch('/api/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          avatarName,
          personality,
        }),
      })

      if (!response.ok) {
        throw new Error('Errore nella generazione')
      }

      const data = await response.json()
      setGeneratedDescription(data.description)
    } catch (err) {
      console.error('Error generating description:', err)
      setError('Errore nella generazione della descrizione. Riprova.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleConfirm = () => {
    if (generatedDescription) {
      onChange(generatedDescription)
      setGeneratedDescription(null)
      setPrompt('')
    }
  }

  const handleRegenerate = () => {
    setGeneratedDescription(null)
    handleGenerate()
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2 drop-shadow-lg">Descrizione Avatar</h2>
        <p className="text-sm text-white/80 mb-4 drop-shadow-sm">
          Scrivi la backstory e le caratteristiche del tuo avatar, oppure usa l&apos;AI per generarla automaticamente.
        </p>
      </div>

      {/* AI Generation Section */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 shadow-xl">
        <label className="block text-sm font-medium text-white mb-2">
          Genera con AI (opzionale)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleGenerate()
              }
            }}
            placeholder="Es: Docente di matematica esperto, paziente, con stile didattico innovativo..."
            disabled={isGenerating}
            className="flex-1 px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all text-sm"
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-400/90 hover:to-blue-600/90 text-white rounded-xl transition-all font-medium shadow-lg hover:shadow-xl border border-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generando...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Genera</span>
              </>
            )}
          </button>
        </div>
        {error && (
          <p className="text-red-300 text-sm mt-2">{error}</p>
        )}
      </div>

      {/* Generated Description Preview */}
      {generatedDescription && (
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm rounded-2xl border-2 border-blue-400/50 p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Descrizione generata dall&apos;AI
            </h3>
          </div>
          <div className="bg-black/20 rounded-xl p-4 mb-3 max-h-60 overflow-y-auto">
            <p className="text-white text-sm whitespace-pre-wrap">{generatedDescription}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl transition-all font-medium shadow-lg hover:shadow-xl border border-green-400/50 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Conferma e usa questa descrizione
            </button>
            <button
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all font-medium border border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Rigenera
            </button>
          </div>
        </div>
      )}

      {/* Manual Description Textarea */}
      <div className="relative flex-1 min-h-0">
        <label className="block text-sm font-medium text-white mb-2">
          Descrizione manuale
        </label>
        <textarea
          value={description}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Inserisci qui la descrizione completa dell'avatar, includendo:
- Background professionale
- Esperienza e competenze
- Stile di insegnamento
- Approccio pedagogico
- Caratteristiche distintive..."
          className="w-full h-full min-h-[300px] md:min-h-[400px] px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 resize-none shadow-xl transition-all text-sm md:text-base"
        />
        <div className="absolute bottom-4 right-4 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/20">
          <span className="text-sm text-white/80">
            Caratteri: {description.length}
          </span>
        </div>
      </div>
    </div>
  )
}
