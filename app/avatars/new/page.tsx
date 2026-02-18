'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'

const STEPS = 3
const STEP_NAMES = ['Identità', 'Conoscenze', 'Comportamento'] as const

const AVATAR_IMAGES_FALLBACK = Array.from({ length: 16 }, (_, i) => `/avatar-${i + 1}.png`)

const LANGUAGES = [
  { value: 'it', label: 'Italiano' },
  { value: 'en', label: 'Inglese' },
  { value: 'es', label: 'Spagnolo' },
  { value: 'fr', label: 'Francese' },
  { value: 'de', label: 'Tedesco' },
]

// Voci OpenAI TTS (tts-1): usate per /api/tts in Room
const VOICES = [
  { value: 'alloy', label: 'Alloy (neutro)' },
  { value: 'nova', label: 'Nova (femminile)' },
  { value: 'onyx', label: 'Onyx (profondo)' },
  { value: 'shimmer', label: 'Shimmer' },
  { value: 'echo', label: 'Echo' },
  { value: 'fable', label: 'Fable' },
] as const

const AI_MODELS = [
  { value: 'gpt-5', label: 'ChatGPT 5.0' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'claude-3', label: 'Claude 3' },
]

const TRAITS = [
  { key: 'openness' as const, label: 'Apertura mentale', color: '#60a5fa' },
  { key: 'conscientiousness' as const, label: 'Meticolosità', color: '#f87171' },
  { key: 'extraversion' as const, label: 'Estroversione', color: '#a78bfa' },
  { key: 'agreeableness' as const, label: 'Amabilità', color: '#4ade80' },
  { key: 'neuroticism' as const, label: 'Sensibilità', color: '#e5e7eb' },
]

interface PersonalityState {
  openness: number
  conscientiousness: number
  extraversion: number
  agreeableness: number
  neuroticism: number
}

function NewAvatarContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [step, setStep] = useState(1)
  const [name, setName] = useState('Irene')
  const [language, setLanguage] = useState('en')
  const [voice, setVoice] = useState<string>(VOICES[0].value)
  const [avatarImages, setAvatarImages] = useState<string[]>(AVATAR_IMAGES_FALLBACK)
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_IMAGES_FALLBACK[0])
  const [imageSourceMode, setImageSourceMode] = useState<'gallery' | 'upload' | 'prompt'>('gallery')
  const [imagePrompt, setImagePrompt] = useState('')
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)

  const [description, setDescription] = useState('')
  const [descriptionCharLimit] = useState(2000)
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)
  const [knowledgeFiles, setKnowledgeFiles] = useState<Array<{ id: string; name: string }>>([])
  const [aiModel, setAiModel] = useState('gpt-5')

  const [personality, setPersonality] = useState<PersonalityState>({
    openness: 30,
    conscientiousness: 45,
    extraversion: 60,
    agreeableness: 65,
    neuroticism: 25,
  })

  // Carica tutti gli avatar dalla cartella public (API legge la directory)
  useEffect(() => {
    let cancelled = false
    fetch('/api/avatar-images')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data?.images) && data.images.length > 0) {
          setAvatarImages(data.images)
          setSelectedAvatar((prev) => (data.images.includes(prev) ? prev : data.images[0]))
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !editId) return
    try {
      const raw = localStorage.getItem('user_avatars')
      const avatars = raw ? JSON.parse(raw) : []
      const found = avatars.find((a: any) => String(a?.id) === String(editId))
      if (found) {
        setName(found.name ?? 'Irene')
        setLanguage(Array.isArray(found.languages) ? (found.languages[0] || 'en') : 'en')
        setVoice(typeof found.voice === 'string' && VOICES.some((v) => v.value === found.voice) ? found.voice : VOICES[0].value)
        setSelectedAvatar(found.image ?? AVATAR_IMAGES_FALLBACK[0])
        setDescription(found.description ?? '')
        setKnowledgeFiles(Array.isArray(found.knowledgeFiles) ? found.knowledgeFiles : [])
        setAiModel(found.aiModel ?? 'gpt-5')
        if (found.personality && typeof found.personality === 'object') {
          setPersonality({
            openness: Number(found.personality.openness) || 30,
            conscientiousness: Number(found.personality.conscientiousness) || 45,
            extraversion: Number(found.personality.extraversion) || 60,
            agreeableness: Number(found.personality.agreeableness) || 65,
            neuroticism: Number(found.personality.neuroticism) || 25,
          })
        }
      }
    } catch (e) {
      console.error('Error loading avatar for edit:', e)
    }
  }, [editId])

  const radarData = useMemo(
    () => [
      { trait: 'Apertura', value: personality.openness, fullMark: 100 },
      { trait: 'Meticolosità', value: personality.conscientiousness, fullMark: 100 },
      { trait: 'Estroversione', value: personality.extraversion, fullMark: 100 },
      { trait: 'Amabilità', value: personality.agreeableness, fullMark: 100 },
      { trait: 'Sensibilità', value: personality.neuroticism, fullMark: 100 },
    ],
    [personality]
  )

  const handleTraitChange = (key: keyof PersonalityState, value: number) => {
    setPersonality((prev) => ({ ...prev, [key]: value }))
  }

  const handleRandomPersonality = () => {
    setPersonality({
      openness: Math.round(Math.random() * 100),
      conscientiousness: Math.round(Math.random() * 100),
      extraversion: Math.round(Math.random() * 100),
      agreeableness: Math.round(Math.random() * 100),
      neuroticism: Math.round(Math.random() * 100),
    })
  }

  const addKnowledgeFile = () => {
    setKnowledgeFiles((prev) => [
      ...prev,
      { id: `doc-${Date.now()}`, name: `Documento ${prev.length + 1}` },
    ])
  }

  const removeKnowledgeFile = (id: string) => {
    setKnowledgeFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setSelectedAvatar(dataUrl)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleGenerateFromPrompt = async () => {
    if (!imagePrompt.trim()) return
    setIsGeneratingImage(true)
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore generazione')
      if (data.imageUrl) setSelectedAvatar(data.imageUrl)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Impossibile generare l\'immagine. Riprova.')
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const handleGenerateDescription = async () => {
    setIsGeneratingDescription(true)
    try {
      const res = await fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: description.trim() || 'avatar educativo, tutor',
          avatarName: name,
          personality,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore generazione')
      if (data.description) setDescription(data.description.slice(0, descriptionCharLimit))
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Impossibile generare la storia del personaggio. Riprova.')
    } finally {
      setIsGeneratingDescription(false)
    }
  }

  const handleCreateAvatar = () => {
    const payload = {
      id: editId || `user-${Date.now()}`,
      name,
      image: selectedAvatar,
      languages: [language],
      language,
      voice,
      description,
      knowledgeFiles,
      aiModel,
      personality,
      createdAt: (editId ? undefined : new Date().toISOString()) as string | undefined,
    }
    try {
      const existing = localStorage.getItem('user_avatars')
      const avatars: any[] = existing ? JSON.parse(existing) : []
      if (editId) {
        const idx = avatars.findIndex((a: any) => String(a?.id) === String(editId))
        const existingCreated = avatars[idx]?.createdAt
        if (idx >= 0) {
          avatars[idx] = { ...avatars[idx], ...payload, createdAt: existingCreated || new Date().toISOString() }
        } else {
          avatars.push({ ...payload, createdAt: new Date().toISOString() })
        }
      } else {
        (payload as any).createdAt = new Date().toISOString()
        avatars.push(payload)
      }
      localStorage.setItem('user_avatars', JSON.stringify(avatars))
      window.dispatchEvent(new Event('avatar-saved'))
    } catch (e) {
      console.error('Error saving avatar:', e)
    }
    router.push('/avatars')
  }

  const goToStep = (s: number) => {
    if (s >= 1 && s <= STEPS) setStep(s)
  }

  const accent = 'from-violet-500 to-blue-600'
  const cyan = 'from-cyan-400 to-blue-500'

  return (
    <div className="min-h-screen h-dvh bg-slate-950 text-white flex flex-col">
      {/* Header unico stile VERSE / gaming */}
      <header className="flex-shrink-0 sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-violet-500/20">
        <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-3">
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:shadow-violet-500/50 transition-shadow`}>
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <span className="text-white font-semibold text-lg hidden sm:inline">VERSE WEB</span>
          </Link>

          {/* Step indicator: livelli gioco */}
          <div className="flex items-center gap-1 sm:gap-2">
            {STEP_NAMES.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => goToStep(i + 1)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  step === i + 1
                    ? `bg-gradient-to-r ${accent} text-white shadow-lg shadow-violet-500/25 scale-105`
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-violet-500/20'
                }`}
              >
                <span className="hidden sm:inline">Liv.{i + 1}</span>
                <span className="sm:hidden">{i + 1}</span>
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>

          <Link
            href="/avatars"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-violet-500/20 text-sm font-medium transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Torna agli avatar</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Step 1 - Identity: UI gaming / education */}
          {step === 1 && (
            <div className="max-w-5xl mx-auto">
              <div className="mb-6 sm:mb-8">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30 mb-2">
                  Livello 1 — Identità
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  {editId ? 'Modifica identità e immagine' : 'Disegna il tuo personaggio'}
                </h1>
                <p className="text-slate-400 text-sm sm:text-base">Scegli il volto del tuo tutor e il suo nome.</p>
              </div>

              <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                {/* Colonna sinistra: ritratto + sorgente immagine */}
                <div className="lg:w-[380px] flex-shrink-0 space-y-4">
                  {/* Cornice ritratto stile "character card" */}
                  <div className="relative rounded-2xl overflow-hidden bg-slate-900/80 border-2 border-violet-500/30 shadow-xl shadow-violet-500/10 ring-2 ring-inset ring-white/5">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none z-10" />
                    <div className="aspect-[3/4] max-h-[420px]">
                      <img
                        src={selectedAvatar}
                        alt="Avatar"
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center gap-2">
                      <span className="px-2 py-1 rounded-lg bg-slate-900/90 text-slate-300 text-xs font-medium border border-violet-500/20">
                        Anteprima Room
                      </span>
                    </div>
                  </div>

                  {/* Tab Galleria / Carica / Genera — stile pulsanti gioco */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setImageSourceMode('gallery')}
                      className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 transition-all duration-200 ${
                        imageSourceMode === 'gallery'
                          ? 'border-violet-500 bg-violet-500/20 text-white shadow-lg shadow-violet-500/20'
                          : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-violet-500/40 hover:text-white'
                      }`}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      <span className="text-xs font-semibold">Galleria</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSourceMode('upload')}
                      className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 transition-all duration-200 ${
                        imageSourceMode === 'upload'
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200 shadow-lg shadow-cyan-500/20'
                          : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-cyan-500/40 hover:text-white'
                      }`}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-xs font-semibold">Carica</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSourceMode('prompt')}
                      className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 transition-all duration-200 ${
                        imageSourceMode === 'prompt'
                          ? 'border-amber-500/80 bg-amber-500/20 text-amber-200 shadow-lg shadow-amber-500/20'
                          : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-amber-500/40 hover:text-white'
                      }`}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-xs font-semibold">Genera</span>
                    </button>
                  </div>

                  {/* Contenuto per modalità selezionata */}
                  {imageSourceMode === 'gallery' && (
                    <div className="rounded-xl bg-slate-800/60 border border-violet-500/20 p-3">
                      <p className="text-xs text-slate-400 mb-3">Scegli un volto dalla galleria</p>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {avatarImages.map((src) => (
                          <button
                            key={src}
                            type="button"
                            onClick={() => setSelectedAvatar(src)}
                            className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                              selectedAvatar === src
                                ? 'border-violet-500 ring-2 ring-violet-500/50 scale-105'
                                : 'border-slate-600 hover:border-violet-500/50'
                            }`}
                          >
                            <img src={src} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {imageSourceMode === 'upload' && (
                    <label className="block rounded-xl border-2 border-dashed border-cyan-500/40 bg-slate-800/40 hover:bg-slate-800/70 hover:border-cyan-500/60 p-6 cursor-pointer transition-all group">
                      <div className="flex flex-col items-center justify-center gap-3 text-center">
                        <div className="w-14 h-14 rounded-xl bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">Trascina qui un&apos;immagine</p>
                          <p className="text-xs text-slate-400 mt-0.5">oppure clicca per scegliere</p>
                        </div>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  )}
                  {imageSourceMode === 'prompt' && (
                    <div className="rounded-xl bg-slate-800/60 border border-amber-500/30 p-4 space-y-3">
                      <p className="text-xs text-slate-400">Descrivi il personaggio: l&apos;AI lo disegnerà per te.</p>
                      <textarea
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder="Es: ritratto di un tutor amichevole, stile illustrazione educativa, sfondo neutro"
                        rows={3}
                        className="w-full px-4 py-3 bg-slate-900/80 border border-amber-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateFromPrompt}
                        disabled={!imagePrompt.trim() || isGeneratingImage}
                        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                          isGeneratingImage || !imagePrompt.trim()
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : `bg-gradient-to-r ${cyan} text-white hover:opacity-95 shadow-lg shadow-cyan-500/25`
                        }`}
                      >
                        {isGeneratingImage ? '⏳ Generazione in corso...' : '✨ Genera con AI'}
                      </button>
                      <p className="text-[10px] text-slate-500">
                        Richiede <code className="bg-slate-800 px-1 rounded">OPENAI_API_KEY</code> (DALL-E).
                      </p>
                    </div>
                  )}
                </div>

                {/* Colonna destra: Nome, Lingua, Voce */}
                <div className="flex-1 min-w-0 space-y-5">
                  <div className="rounded-2xl bg-slate-800/50 border border-violet-500/20 p-5 sm:p-6 space-y-5">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">1</span>
                      Nome e voce
                    </h2>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Nome del personaggio</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-900/80 border border-violet-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
                        placeholder="Es. Marco, Sofia..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Lingua</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-4 py-3 pr-10 bg-slate-900/80 border border-violet-500/20 rounded-xl text-white focus:outline-none focus:border-violet-500/50"
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Voce (TTS in Room)</label>
                      <select
                        value={voice}
                        onChange={(e) => setVoice(e.target.value)}
                        className="w-full px-4 py-3 pr-10 bg-slate-900/80 border border-violet-500/20 rounded-xl text-white focus:outline-none focus:border-violet-500/50"
                      >
                        {VOICES.map((v) => (
                          <option key={v.value} value={v.value}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className={`px-6 py-3 rounded-xl font-semibold bg-gradient-to-r ${accent} text-white shadow-lg shadow-violet-500/25 hover:opacity-95 transition-opacity`}
                      >
                        Avanti — Conoscenze
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 - Knowledge */}
          {step === 2 && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="mb-6 sm:mb-8">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30 mb-2">
                  Livello 2 — Conoscenze
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  {editId ? 'Modifica conoscenze' : 'Cosa sa il tuo personaggio'}
                </h1>
                <p className="text-slate-400 text-sm sm:text-base">Storia del personaggio e materiali di riferimento.</p>
              </div>
              <div className="bg-slate-800/60 rounded-2xl p-6 border border-violet-500/20 shadow-xl shadow-violet-500/5">
                <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 text-sm">2</span>
                  Descrizione / Storia del personaggio
                </h2>
                <div className="relative">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, descriptionCharLimit))}
                    placeholder="Descrivi cosa deve sapere e su cosa deve concentrarsi questo avatar (es. Elettronica per istituti tecnici, circuiti base, laboratori)"
                    rows={5}
                    className="w-full px-4 py-3 bg-slate-900/80 border border-violet-500/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-violet-500/50 resize-none"
                  />
                  <span className="absolute top-2 right-2 text-xs text-slate-400">
                    {description.length}/{descriptionCharLimit}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={isGeneratingDescription}
                  className={`mt-3 px-4 py-2 bg-gradient-to-r ${accent} text-white rounded-xl text-sm font-medium hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-lg shadow-violet-500/20`}
                >
                  {isGeneratingDescription ? 'Generazione in corso...' : (description.trim() ? 'Rigenera con AI' : 'Genera con AI')}
                </button>
                <p className="text-[10px] text-violet-300 mt-1">
                  Usa GPT: imposta <code className="bg-slate-800 px-1 rounded">OPENAI_API_KEY</code> in .env.local o Netlify per la backstory.
                </p>
              </div>

              <div className="bg-slate-800/60 rounded-2xl p-6 border border-violet-500/20 shadow-xl shadow-violet-500/5">
                <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 text-sm">3</span>
                  Banca conoscenze
                </h2>
                <p className="text-sm text-slate-400 mb-4">
                  Questi materiali vengono usati come riferimento quando l&apos;avatar risponde.
                </p>
                <button
                  type="button"
                  onClick={addKnowledgeFile}
                  className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${accent} text-white rounded-xl font-medium hover:opacity-95 shadow-lg shadow-violet-500/20 transition-opacity`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Aggiungi
                </button>
                {knowledgeFiles.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {knowledgeFiles.map((f) => (
                      <li
                        key={f.id}
                        className="flex items-center justify-between px-4 py-3 bg-slate-900/80 rounded-xl border border-violet-500/10"
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-white">{f.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeKnowledgeFile(f.id)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          aria-label="Rimuovi"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-slate-800/60 rounded-2xl p-6 border border-violet-500/20 shadow-xl shadow-violet-500/5">
                <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 text-sm">4</span>
                  Modello AI
                </h2>
                <p className="text-sm text-slate-400 mb-4">
                  Scegli il modello AI più adatto allo scopo
                </p>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/80 border border-violet-500/20 rounded-xl text-white focus:outline-none focus:border-violet-500/50"
                >
                  {AI_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-8 py-3 bg-slate-800/60 border border-violet-500/20 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
                >
                  Indietro
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className={`px-8 py-3 bg-gradient-to-r ${accent} text-white rounded-xl font-medium hover:opacity-95 shadow-lg shadow-violet-500/25 transition-opacity`}
                >
                  Avanti
                </button>
              </div>
            </div>
          )}

          {/* Step 3 - Behaviour */}
          {step === 3 && (
            <div className="max-w-4xl mx-auto">
              <div className="mb-6 sm:mb-8">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30 mb-2">
                  Livello 3 — Comportamento
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  {editId ? 'Modifica comportamento' : 'Come si comporta il tuo personaggio'}
                </h1>
                <p className="text-slate-400 text-sm sm:text-base">Personalità e stile di risposta.</p>
              </div>
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1 space-y-6">
                  {TRAITS.map(({ key, label, color }) => (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-white">{label}</span>
                        <span className="text-xs text-slate-400">{personality[key]}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={personality[key]}
                        onChange={(e) => handleTraitChange(key, parseInt(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${color} 0%, ${color} ${personality[key]}%, rgb(51 65 85) ${personality[key]}%, rgb(51 65 85) 100%)`,
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="w-full lg:w-80 flex-shrink-0 flex items-center justify-center">
                  <div className="w-full h-64 bg-slate-800/60 rounded-2xl p-4 border border-violet-500/20">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgb(100 116 139)" />
                        <PolarAngleAxis
                          dataKey="trait"
                          tick={{ fill: '#e2e8f0', fontSize: 11 }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 100]}
                          tick={{ fill: '#94a3b8', fontSize: 10 }}
                        />
                        <Radar
                          name="Comportamento"
                          dataKey="value"
                          stroke="rgb(139 92 246)"
                          fill="rgb(139 92 246)"
                          fillOpacity={0.4}
                          strokeWidth={2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex items-center justify-between p-6 bg-slate-800/60 rounded-2xl border border-violet-500/20">
                <div>
                  <h3 className="text-lg font-semibold text-white">Generatore casuale</h3>
                  <p className="text-sm text-slate-400">Genera una personalità casuale</p>
                </div>
                <button
                  type="button"
                  onClick={handleRandomPersonality}
                  className={`w-14 h-14 rounded-full bg-gradient-to-r ${accent} text-white flex items-center justify-center hover:opacity-95 shadow-lg shadow-violet-500/25 transition-opacity text-2xl font-bold`}
                  aria-label="Personalità casuale"
                >
                  ?
                </button>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-8 py-3 bg-slate-800/60 border border-violet-500/20 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
                >
                  Indietro
                </button>
                <button
                  type="button"
                  onClick={handleCreateAvatar}
                  className={`px-8 py-3 bg-gradient-to-r ${accent} text-white rounded-xl font-medium hover:opacity-95 shadow-lg shadow-violet-500/25 transition-opacity`}
                >
                  {editId ? 'Salva modifiche' : 'Crea avatar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function NewAvatarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <p className="text-slate-400">Caricamento...</p>
      </div>
    }>
      <NewAvatarContent />
    </Suspense>
  )
}
