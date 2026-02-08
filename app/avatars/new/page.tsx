'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'

const STEPS = 3
const STEP_NAMES = ['Identity', 'Knowledge', 'Behaviour'] as const

const AVATAR_IMAGES = Array.from({ length: 16 }, (_, i) => `/avatar-${i + 1}.png`)
const THUMBNAILS = AVATAR_IMAGES.slice(0, 6)

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'it', label: 'Italian' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
]

const VOICES = [
  'English - Female - Warm',
  'English - Male - Calm',
  'Italian - Female - Warm',
  'Italian - Male - Calm',
  'English - Female - Professional',
  'English - Male - Professional',
]

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
  const [voice, setVoice] = useState(VOICES[0])
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_IMAGES[0])
  const [imageSourceMode, setImageSourceMode] = useState<'gallery' | 'upload' | 'prompt'>('gallery')
  const [imagePrompt, setImagePrompt] = useState('')
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [convaiCharacterId, setConvaiCharacterId] = useState('')

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

  useEffect(() => {
    if (typeof window === 'undefined' || !editId) return
    try {
      const raw = localStorage.getItem('user_avatars')
      const avatars = raw ? JSON.parse(raw) : []
      const found = avatars.find((a: any) => String(a?.id) === String(editId))
      if (found) {
        setName(found.name ?? 'Irene')
        setLanguage(Array.isArray(found.languages) ? (found.languages[0] || 'en') : 'en')
        setVoice(found.voice ?? VOICES[0])
        setSelectedAvatar(found.image ?? AVATAR_IMAGES[0])
        setDescription(found.description ?? '')
        setKnowledgeFiles(Array.isArray(found.knowledgeFiles) ? found.knowledgeFiles : [])
        setAiModel(found.aiModel ?? 'gpt-5')
        setConvaiCharacterId(found.convaiCharacterId ?? '')
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
      alert(err instanceof Error ? err.message : 'Impossibile generare la backstory. Riprova.')
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
      voice,
      description,
      knowledgeFiles,
      aiModel,
      personality,
      convaiCharacterId: convaiCharacterId.trim() || undefined,
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

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white flex">
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-[#2C2C2E] flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-[#2C2C2E]">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="w-10 h-10 bg-[#6B48FF] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">Z</span>
            </div>
            <span className="text-white font-semibold text-lg">ZenkAI</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {STEP_NAMES.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => goToStep(i + 1)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                step === i + 1
                  ? 'bg-[#6B48FF] text-white'
                  : 'text-[#A0A0A0] hover:bg-[#2C2C2E]'
              }`}
            >
              {label === 'Identity' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
              {label === 'Knowledge' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              )}
              {label === 'Behaviour' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              )}
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-[#2C2C2E]">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-[#A0A0A0] hover:text-white text-sm transition-colors"
          >
            <span>←</span>
            <span>Back to Homepage</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Breadcrumbs + Title */}
        <div className="p-6 pb-4 border-b border-[#2C2C2E]">
          <div className="flex items-center gap-2 text-sm mb-2">
            <Link href="/avatars" className="text-[#6B48FF] hover:underline">
              {editId ? 'Modifica avatar' : 'Create avatar'}
            </Link>
            <span className="text-[#A0A0A0]">›</span>
            <span className="text-white">{STEP_NAMES[step - 1]}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {editId
              ? (step === 1 && 'Modifica identità e immagine')
              || (step === 2 && 'Modifica conoscenze')
              || (step === 3 && 'Modifica comportamento')
              : (step === 1 && 'Create your avatar')
              || (step === 2 && 'Define what your avatar knows')
              || (step === 3 && 'Define how your avatar behaves')}
          </h1>
          <p className="text-[#A0A0A0] mt-1">Step {step} of {STEPS}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1 - Identity */}
          {step === 1 && (
            <div className="flex flex-col lg:flex-row gap-8 max-w-5xl">
              <div className="flex flex-col">
                <div className="aspect-[3/4] max-w-sm rounded-2xl overflow-hidden bg-[#2C2C2E] mb-4 border border-[#2C2C2E]">
                  <img
                    src={selectedAvatar}
                    alt="Avatar"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <p className="text-xs text-[#A0A0A0] mb-2">Anteprima: questa immagine apparirà nella Room.</p>
                <div className="flex rounded-xl bg-[#2C2C2E] p-1 mb-3">
                  <button
                    type="button"
                    onClick={() => setImageSourceMode('gallery')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      imageSourceMode === 'gallery' ? 'bg-[#6B48FF] text-white' : 'text-[#A0A0A0] hover:text-white'
                    }`}
                  >
                    Galleria
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageSourceMode('upload')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      imageSourceMode === 'upload' ? 'bg-[#6B48FF] text-white' : 'text-[#A0A0A0] hover:text-white'
                    }`}
                  >
                    Carica
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageSourceMode('prompt')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      imageSourceMode === 'prompt' ? 'bg-[#6B48FF] text-white' : 'text-[#A0A0A0] hover:text-white'
                    }`}
                  >
                    Genera
                  </button>
                </div>
                {imageSourceMode === 'gallery' && (
                  <div className="grid grid-cols-6 gap-2">
                    {THUMBNAILS.map((src) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setSelectedAvatar(src)}
                        className={`aspect-square rounded-xl overflow-hidden border-2 transition-colors ${
                          selectedAvatar === src ? 'border-[#6B48FF]' : 'border-[#2C2C2E] hover:border-[#333335]'
                        }`}
                      >
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                {imageSourceMode === 'upload' && (
                  <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#2C2C2E] hover:border-[#6B48FF]/50 bg-[#2C2C2E]/50 p-6 cursor-pointer transition-colors">
                    <svg className="w-10 h-10 text-[#A0A0A0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-[#A0A0A0] text-center">Clicca o trascina un&apos;immagine</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                )}
                {imageSourceMode === 'prompt' && (
                  <div className="space-y-2">
                    <textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="Es: ritratto di un tutor amichevole, stile illustrazione, sfondo neutro"
                      rows={3}
                      className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#2C2C2E] rounded-xl text-white placeholder-[#A0A0A0] focus:outline-none focus:border-[#6B48FF] resize-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateFromPrompt}
                      disabled={!imagePrompt.trim() || isGeneratingImage}
                      className="w-full py-3 bg-[#6B48FF] text-white rounded-xl font-medium hover:bg-[#5A3FE6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isGeneratingImage ? 'Generazione in corso...' : 'Genera immagine'}
                    </button>
                    <p className="text-[10px] text-[#818CF8] mt-1">
                      Usa la chiave OpenAI (DALL-E): imposta <code className="bg-[#2C2C2E] px-1 rounded">OPENAI_API_KEY</code> in .env.local o in Netlify → Environment variables.
                    </p>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-6 min-w-[280px] sm:min-w-[320px]">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full min-w-0 px-4 py-3 bg-[#2C2C2E] border border-[#2C2C2E] rounded-xl text-white placeholder-[#A0A0A0] focus:outline-none focus:border-[#6B48FF] text-base"
                    placeholder="Avatar name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full min-w-[200px] px-4 py-3 pr-10 bg-[#2C2C2E] border border-[#2C2C2E] rounded-xl text-white focus:outline-none focus:border-[#6B48FF] text-base"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Voice</label>
                  <select
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                    className="w-full min-w-[200px] px-4 py-3 pr-10 bg-[#2C2C2E] border border-[#2C2C2E] rounded-xl text-white focus:outline-none focus:border-[#6B48FF] text-base"
                  >
                    {VOICES.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Convai Character ID</label>
                  <input
                    type="text"
                    value={convaiCharacterId}
                    onChange={(e) => setConvaiCharacterId(e.target.value)}
                    className="w-full min-w-0 px-4 py-3 bg-[#2C2C2E] border border-[#2C2C2E] rounded-xl text-white placeholder-[#A0A0A0] focus:outline-none focus:border-[#6B48FF] text-base"
                    placeholder="ID personaggio Convai (per avatar parlante)"
                  />
                  <p className="text-xs text-[#A0A0A0] mt-1">Opzionale. Inserisci l&apos;ID del personaggio da Convai per avere l&apos;avatar parlante in Room.</p>
                </div>
                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-8 py-3 bg-[#6B48FF] text-white rounded-xl font-medium hover:bg-[#5A3FE6] transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 - Knowledge */}
          {step === 2 && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-[#2C2C2E] rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-2">Description</h2>
                <div className="relative">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, descriptionCharLimit))}
                    placeholder="Describe what this avatar should know and focus on (e.g. Electronics for technical high schools, basic circuits, lab exercises)"
                    rows={5}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2C2C2E] rounded-xl text-white placeholder-[#A0A0A0] focus:outline-none focus:border-[#6B48FF] resize-none"
                  />
                  <span className="absolute top-2 right-2 text-xs text-[#A0A0A0]">
                    {description.length}/{descriptionCharLimit}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={isGeneratingDescription}
                  className="mt-3 px-4 py-2 bg-[#6B48FF] text-white rounded-xl text-sm font-medium hover:bg-[#5A3FE6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGeneratingDescription ? 'Generazione in corso...' : (description.trim() ? 'Rigenera con AI' : 'Genera con AI')}
                </button>
                <p className="text-[10px] text-[#818CF8] mt-1">
                  Usa GPT: imposta <code className="bg-[#2C2C2E] px-1 rounded">OPENAI_API_KEY</code> in .env.local o Netlify per la backstory.
                </p>
              </div>

              <div className="bg-[#2C2C2E] rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-1">Knowledge bank</h2>
                <p className="text-sm text-[#A0A0A0] mb-4">
                  These materials are used as references when answering questions.
                </p>
                <button
                  type="button"
                  onClick={addKnowledgeFile}
                  className="flex items-center gap-2 px-4 py-2 bg-[#6B48FF] text-white rounded-xl font-medium hover:bg-[#5A3FE6] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </button>
                {knowledgeFiles.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {knowledgeFiles.map((f) => (
                      <li
                        key={f.id}
                        className="flex items-center justify-between px-4 py-3 bg-[#1A1A1A] rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-[#A0A0A0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-white">{f.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeKnowledgeFile(f.id)}
                          className="p-2 text-[#A0A0A0] hover:text-white hover:bg-[#333335] rounded-lg transition-colors"
                          aria-label="Remove"
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

              <div className="bg-[#2C2C2E] rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-1">AI Model</h2>
                <p className="text-sm text-[#A0A0A0] mb-4">
                  Choose the AI model that best suits your scope
                </p>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2C2C2E] rounded-xl text-white focus:outline-none focus:border-[#6B48FF]"
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
                  className="px-8 py-3 bg-[#2C2C2E] text-white rounded-xl font-medium hover:bg-[#333335] transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-8 py-3 bg-[#6B48FF] text-white rounded-xl font-medium hover:bg-[#5A3FE6] transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3 - Behaviour */}
          {step === 3 && (
            <div className="max-w-4xl">
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1 space-y-6">
                  {TRAITS.map(({ key, label, color }) => (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-white">{label}</span>
                        <span className="text-xs text-[#A0A0A0]">{personality[key]}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={personality[key]}
                        onChange={(e) => handleTraitChange(key, parseInt(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${color} 0%, ${color} ${personality[key]}%, #2C2C2E ${personality[key]}%, #2C2C2E 100%)`,
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="w-full lg:w-80 flex-shrink-0 flex items-center justify-center">
                  <div className="w-full h-64 bg-[#2C2C2E] rounded-2xl p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#444" />
                        <PolarAngleAxis
                          dataKey="trait"
                          tick={{ fill: '#e5e5e5', fontSize: 11 }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 100]}
                          tick={{ fill: '#A0A0A0', fontSize: 10 }}
                        />
                        <Radar
                          name="Behaviour"
                          dataKey="value"
                          stroke="#6B48FF"
                          fill="#6B48FF"
                          fillOpacity={0.4}
                          strokeWidth={2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex items-center justify-between p-6 bg-[#2C2C2E] rounded-2xl">
                <div>
                  <h3 className="text-lg font-semibold text-white">Random generator</h3>
                  <p className="text-sm text-[#A0A0A0]">Generate a random personality</p>
                </div>
                <button
                  type="button"
                  onClick={handleRandomPersonality}
                  className="w-14 h-14 rounded-full bg-[#6B48FF] text-white flex items-center justify-center hover:bg-[#5A3FE6] transition-colors text-2xl font-bold"
                  aria-label="Random personality"
                >
                  ?
                </button>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-8 py-3 bg-[#2C2C2E] text-white rounded-xl font-medium hover:bg-[#333335] transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCreateAvatar}
                  className="px-8 py-3 bg-[#6B48FF] text-white rounded-xl font-medium hover:bg-[#5A3FE6] transition-colors"
                >
                  {editId ? 'Salva modifiche' : 'Create avatar'}
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
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center text-white">
        <p className="text-[#A0A0A0]">Caricamento...</p>
      </div>
    }>
      <NewAvatarContent />
    </Suspense>
  )
}
