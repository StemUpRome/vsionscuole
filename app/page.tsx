'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const FAQ_ITEMS = [
  { q: "Cos'è VERSE 2.0?", a: "Piattaforma educativa che integra AR, VR e AI con il docente al centro. Ambienti immersivi e personalizzati per ogni ordine scolastico." },
  { q: "Cos'è il Verse Register?", a: "Strumento per creare avatar conversazionali AI: personaggi storici, scientifici o letterari che interagiscono con gli studenti. I docenti configurano conoscenze e competenze." },
  { q: "Adatto a BES e plusdotati?", a: "Sì. Contenuti e ritmo adattabili per BES; attività avanzate, Arena e Laboratori per plusdotati." },
  { q: "Su quali dispositivi?", a: "macOS, Windows e Android — desktop, tablet e mobile." },
  { q: "Cosa sono le isole del sapere?", a: "Dalla Central Hall accedi a lezioni, quiz, lavagne digitali e ologrammi per continuità didattica tra ordini scolastici." },
]

const FEATURE_CARDS = [
  { icon: '🎭', title: 'Avatar AI', desc: 'Verse Register: crea avatar che simulano Socrate, Einstein, Dante. Dialogo in tempo reale con gli studenti.' },
  { icon: '🏝️', title: 'Isole del sapere', desc: 'Central Hall, lezioni umanistiche e scientifiche, quiz, laboratori LABSTER. Percorsi personalizzati.' },
  { icon: '📈', title: 'Monitoraggio', desc: 'Statistiche, tempo di risposta, aree esplorate. Adatta i contenuti e ottimizza il percorso formativo.' },
]

const BENEFICI = [
  { icon: '🤖', title: 'Interazione attiva', desc: 'Avatar AI e risposte immediate.' },
  { icon: '🧪', title: 'Laboratorio virtuale', desc: 'Esperimenti in sicurezza (LABSTER).' },
  { icon: '📊', title: 'Quiz adattivi', desc: 'AI che si adatta al livello.' },
  { icon: '📐', title: 'Flessibilità', desc: 'Lezioni e attività alternate.' },
  { icon: '📱', title: 'Multi-device', desc: 'macOS, Windows, Android.' },
  { icon: '🥽', title: 'AR e VR', desc: 'Ambienti 3D immersivi.' },
]

// Lista statica per deploy: l'API in serverless spesso non può leggere public. Tutti gli avatar in public (escluso logo).
const AVATAR_IMAGES_STATIC = [
  '/avatar-1.png', '/avatar-2.png', '/avatar-3.png', '/avatar-4.png', '/avatar-6.png', '/avatar-7.png', '/avatar-8.png', '/avatar-9.png',
  '/avatar-12.png', '/avatar-13.png', '/avatar-14.png', '/avatar-15.png', '/avatar-16.png',
  '/ChatGPT_Image_9_feb_2026__06_45_50-removebg-preview.png',
  '/ChatGPT_Image_9_feb_2026__06_47_04-removebg-preview.png',
  '/ChatGPT_Image_9_feb_2026__06_48_25-removebg-preview.png',
  '/ChatGPT_Image_9_feb_2026__06_52_15-removebg-preview.png',
  '/ChatGPT_Image_9_feb_2026__07_06_23-removebg-preview.png',
  '/ChatGPT_Image_9_feb_2026__07_08_08-removebg-preview.png',
  '/Gemini_Generated_Image_36h07e36h07e36h0-removebg-preview.png',
  '/Gemini_Generated_Image_3njulb3njulb3nju-removebg-preview.png',
  '/Gemini_Generated_Image_3uc6cu3uc6cu3uc6-removebg-preview.png',
  '/Gemini_Generated_Image_8b5bit8b5bit8b5b-removebg-preview.png',
  '/Gemini_Generated_Image_a7lz64a7lz64a7lz-removebg-preview.png',
  '/Gemini_Generated_Image_ahuu35ahuu35ahuu-removebg-preview.png',
  '/Gemini_Generated_Image_an0825an0825an08-removebg-preview.png',
  '/Gemini_Generated_Image_ba0q2eba0q2eba0q-removebg-preview.png',
  '/Gemini_Generated_Image_ca0z2oca0z2oca0z-removebg-preview.png',
  '/Gemini_Generated_Image_cusk1ccusk1ccusk-removebg-preview.png',
  '/Gemini_Generated_Image_d1mbe8d1mbe8d1mb-removebg-preview.png',
  '/Gemini_Generated_Image_d85gmrd85gmrd85g-removebg-preview.png',
  '/Gemini_Generated_Image_dl6ds3dl6ds3dl6d-removebg-preview.png',
  '/Gemini_Generated_Image_e16scje16scje16s-removebg-preview.png',
  '/Gemini_Generated_Image_ha4rxha4rxha4rxh-removebg-preview.png',
  '/Gemini_Generated_Image_m3pl97m3pl97m3pl-removebg-preview.png',
  '/Gemini_Generated_Image_mihd90mihd90mihd-removebg-preview.png',
  '/Gemini_Generated_Image_rizeqlrizeqlrize-removebg-preview.png',
  '/Gemini_Generated_Image_smhomlsmhomlsmho-removebg-preview.png',
  '/Gemini_Generated_Image_w3zteyw3zteyw3zt-removebg-preview.png',
  '/Gemini_Generated_Image_w3zteyw3zteyw3zt-removebg-preview%20(1).png',
  '/Gemini_Generated_Image_xqv6u8xqv6u8xqv6-removebg-preview.png',
  '/Gemini_Generated_Image_yfaphfyfaphfyfap-removebg-preview.png',
  '/Gemini_Generated_Image_z34romz34romz34r-removebg-preview.png',
  '/Gemini_Generated_Image_z4dthez4dthez4dt-removebg-preview.png',
  '/Gemini_Generated_Image_zzi9wzzi9wzzi9wz-removebg-preview.png',
]

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarImages, setAvatarImages] = useState<string[]>(AVATAR_IMAGES_STATIC)

  useEffect(() => {
    let cancelled = false
    fetch('/api/avatar-images')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data?.images) && data.images.length > 0)
          setAvatarImages(data.images)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const accent = 'from-violet-500 to-blue-600'

  return (
    <div className="min-h-screen min-h-dvh bg-slate-950 text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-violet-500/20 safe-area-inset-top">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${accent} flex items-center justify-center shadow-lg shadow-violet-500/30`}>
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="font-semibold text-base sm:text-lg text-white">VERSE WEB</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <button onClick={() => scrollTo('descrizione')} className="text-sm text-slate-400 hover:text-white transition-colors py-2">Descrizione</button>
            <button onClick={() => scrollTo('benefici')} className="text-sm text-slate-400 hover:text-white transition-colors py-2">Benefici</button>
            <button onClick={() => scrollTo('faq')} className="text-sm text-slate-400 hover:text-white transition-colors py-2">FAQ</button>
          </nav>
          <Link href="/avatars" className={`hidden sm:inline-flex px-4 sm:px-5 py-2.5 min-h-[44px] items-center justify-center bg-gradient-to-r ${accent} text-white rounded-xl text-sm font-medium hover:opacity-95 transition-opacity shadow-lg shadow-violet-500/25`}>
            Accedi
          </Link>
          <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-white hover:bg-slate-800 transition-colors" aria-label={menuOpen ? 'Chiudi menu' : 'Apri menu'} aria-expanded={menuOpen}>
            {menuOpen ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-slate-950 border-b border-violet-500/20 shadow-xl">
            <nav className="flex flex-col p-4 gap-1">
              <button onClick={() => scrollTo('descrizione')} className="text-left px-4 py-3 min-h-[48px] rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-base">Descrizione</button>
              <button onClick={() => scrollTo('benefici')} className="text-left px-4 py-3 min-h-[48px] rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-base">Benefici</button>
              <button onClick={() => scrollTo('faq')} className="text-left px-4 py-3 min-h-[48px] rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-base">FAQ</button>
              <Link href="/avatars" className={`mt-2 px-4 py-3 min-h-[48px] flex items-center justify-center bg-gradient-to-r ${accent} text-white rounded-xl font-medium hover:opacity-95 text-base`} onClick={() => setMenuOpen(false)}>Accedi</Link>
            </nav>
          </div>
        )}
      </header>

      {/* Hero + immagine */}
      <section className="pt-24 sm:pt-28 pb-12 sm:pb-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-slate-800/80 border border-violet-500/30 mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              <span className="text-xs sm:text-sm text-slate-300">AR · VR · AI</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4 text-white">
              Innovazione Didattica con{' '}
              <span className={`bg-gradient-to-r ${accent} bg-clip-text text-transparent`}>AR, VR e AI</span>
            </h1>
            <p className="text-slate-300 max-w-lg mb-8 text-sm sm:text-base">
              Avatar storici, scienziati famosi, personaggi di fantasia: dialoga in più lingue con le figure che hanno fatto la storia e la cultura. Il nostro punto di forza.
            </p>
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              <Link href="/avatars" className={`inline-flex items-center justify-center min-h-[48px] px-6 py-3.5 bg-gradient-to-r ${accent} text-white rounded-xl font-semibold hover:opacity-95 transition-opacity shadow-lg shadow-violet-500/25`}>
                Accedi a VERSE WEB
              </Link>
              <button type="button" onClick={() => scrollTo('descrizione')} className="min-h-[48px] px-6 py-3.5 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition-colors border border-violet-500/20">
                Scopri di più
              </button>
            </div>
          </div>
          <div className="flex-1 w-full max-w-lg mx-auto lg:max-w-none">
            <div className="relative rounded-2xl overflow-hidden border border-violet-500/30 shadow-2xl shadow-violet-500/20 aspect-[4/3] bg-slate-800">
              <Image
                src="https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80"
                alt="Avatar storici e personaggi: dialoga con le grandi figure della storia e della cultura"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 text-left">
                <p className="text-white/95 text-sm font-medium drop-shadow-lg">Socrate, Einstein, Dante, Cleopatra — in un click.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Descrizione: 3 card con effetti */}
      <section id="descrizione" className="py-12 sm:py-16 px-4 sm:px-6 border-t border-violet-500/10">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 text-white">La piattaforma</h2>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURE_CARDS.map((card) => (
            <div
              key={card.title}
              className="group relative rounded-2xl p-6 bg-slate-800/60 border border-violet-500/20 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-500/10"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="relative text-3xl mb-4">{card.icon}</div>
              <h3 className="relative text-lg font-semibold text-white mb-2">{card.title}</h3>
              <p className="relative text-sm text-slate-300 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Avatar e multilinguismo — punto di forza */}
        <div className="max-w-5xl mx-auto mt-16">
          <div className="rounded-2xl overflow-hidden border border-violet-500/20 shadow-xl grid grid-cols-1 md:grid-cols-2">
            <div className="relative aspect-video min-h-[200px] bg-slate-800">
              <Image
                src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&q=80"
                alt="Multilinguismo: avatars e contenuti in più lingue per una didattica senza confini"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/40 to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 right-3 text-left">
                <p className="text-white/95 text-sm font-medium drop-shadow-lg">Una piattaforma, tutte le lingue.</p>
              </div>
            </div>
            <div className="p-6 sm:p-8 flex flex-col justify-center bg-slate-800/80 backdrop-blur-sm">
              <h3 className="text-xl font-bold text-white mb-3">Avatar e multilinguismo</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-4">
                I nostri punti di forza: avatar personalizzabili — storici, scienziati, personaggi di fantasia — e contenuti in più lingue. Didattica inclusiva e senza confini.
              </p>
              <p className="text-slate-400 text-xs">BES e plusdotati: ritmo e contenuti adattabili. Quiz AI, laboratori LABSTER, monitoraggio integrato.</p>
            </div>
          </div>
        </div>

        {/* Configura il tuo avatar — carousel con lista statica per deploy + effetti sulle card */}
        <div className="max-w-5xl mx-auto mt-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2 text-white">Configura il tuo avatar</h2>
          <p className="text-center text-slate-400 text-sm mb-6">Scegli un volto, personalizza nome, voce e backstory. Poi usalo nella Room.</p>
          <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide scroll-smooth snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {avatarImages.map((src, index) => (
              <div key={`${src}-${index}`} className="flex-shrink-0 w-32 sm:w-40 snap-center group">
                <div className="relative rounded-xl overflow-hidden border-2 border-violet-500/30 aspect-[3/4] bg-slate-800 transition-all duration-300 group-hover:border-violet-400 group-hover:scale-[1.08] group-hover:shadow-2xl group-hover:shadow-violet-500/30 group-hover:ring-2 group-hover:ring-violet-400/50">
                  <Image src={src} alt={`Avatar ${index + 1}`} fill className="object-cover object-top transition-transform duration-300 group-hover:scale-105" sizes="160px" unoptimized />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-6">
            <Link
              href="/avatars/new"
              className="inline-flex items-center justify-center min-h-[48px] px-6 py-3 bg-gradient-to-r from-violet-500 to-blue-600 text-white rounded-xl font-semibold hover:opacity-95 transition-opacity shadow-lg shadow-violet-500/25"
            >
              Crea il tuo avatar
            </Link>
          </div>
        </div>
      </section>

      {/* Benefici: card con effetti */}
      <section id="benefici" className="py-12 sm:py-16 px-4 sm:px-6 border-t border-violet-500/10">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 text-white">Benefici</h2>
        <div className="max-w-4xl mx-auto grid grid-cols-2 lg:grid-cols-3 gap-4">
          {BENEFICI.map((card) => (
            <div
              key={card.title}
              className="group rounded-xl p-5 bg-slate-800/60 border border-violet-500/20 transition-all duration-300 hover:scale-[1.03] hover:border-violet-400/40 hover:shadow-lg hover:shadow-violet-500/15"
            >
              <span className="text-2xl block mb-2">{card.icon}</span>
              <h3 className="text-sm font-semibold text-white mb-1">{card.title}</h3>
              <p className="text-xs text-slate-400 leading-snug">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ compatta */}
      <section id="faq" className="py-12 sm:py-16 px-4 sm:px-6 border-t border-violet-500/10">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 text-white">FAQ</h2>
        <div className="max-w-2xl mx-auto space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="rounded-xl bg-slate-800/60 border border-violet-500/20 overflow-hidden transition-all duration-200 hover:border-violet-500/40">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3.5 min-h-[48px] text-left text-white hover:bg-slate-800/80 transition-colors"
              >
                <span className="font-medium pr-4 text-sm">{item.q}</span>
                <svg className={`w-5 h-5 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaq === i && (
                <div className="px-4 pb-3.5 text-slate-400 text-sm leading-relaxed border-t border-violet-500/20 pt-2">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-4 border-t border-violet-500/10 text-center text-sm text-slate-400 safe-area-inset-bottom">
        <p>© VERSE WEB. Innovazione didattica con AR, VR e AI.</p>
        <a href="https://www.verse-edu.com/privacy" target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-violet-400 hover:text-violet-300 underline">Privacy</a>
      </footer>
    </div>
  )
}
