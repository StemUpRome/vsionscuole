'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const FAQ_ITEMS = [
  { q: "Cosa significa 'Camera Live'?", a: "La Camera Live permette al tutor AI di vedere in tempo reale ciò che inquadri con la webcam (quaderno, formule, grafici) e di guidarti passo passo come un professore." },
  { q: 'Posso cambiare piano in futuro?', a: "Sì, puoi passare a un piano superiore o inferiore in qualsiasi momento. La differenza verrà addebitata o accreditata in proporzione." },
  { q: 'Il piano Family supporta più figli?', a: "Sì, il piano Family include fino a 4 profili studente e una dashboard per i genitori per seguire i progressi di ognuno." },
  { q: "L'AI ricorda le lezioni passate?", a: "Sì, con i piani avanzati l'AI mantiene una memoria adattiva dei tuoi errori e argomenti e personalizza gli esercizi di conseguenza." },
  { q: 'Posso disdire quando voglio?', a: "Sì, puoi disdire in qualsiasi momento. L'accesso resta attivo fino alla fine del periodo già pagato, senza ulteriori costi." },
]

export default function LandingPage() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <div className="min-h-screen min-h-dvh bg-[#1A1A1A] text-white">
      {/* Header - responsive */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1A1A1A] border-b border-[#2C2C2E] safe-area-inset-top">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-[#6B48FF] flex items-center justify-center">
              <span className="text-white font-bold text-sm">Z</span>
            </div>
            <span className="font-semibold text-base sm:text-lg text-white">ZenkAI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <button onClick={() => scrollTo('funzionalita')} className="text-sm text-[#A0A0A0] hover:text-white transition-colors py-2">
              Funzionalità
            </button>
            <button onClick={() => scrollTo('piani')} className="text-sm text-[#A0A0A0] hover:text-white transition-colors py-2">
              Piani
            </button>
            <button onClick={() => scrollTo('faq')} className="text-sm text-[#A0A0A0] hover:text-white transition-colors py-2">
              Domande
            </button>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex px-4 sm:px-5 py-2.5 min-h-[44px] items-center justify-center bg-[#6B48FF] text-white rounded-xl text-sm font-medium hover:bg-[#5A3FE6] transition-colors"
            >
              Accedi
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-white hover:bg-[#2C2C2E] transition-colors"
              aria-label={menuOpen ? 'Chiudi menu' : 'Apri menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          </div>
        </div>
        {/* Menu mobile */}
        {menuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-[#1A1A1A] border-b border-[#2C2C2E] shadow-xl">
            <nav className="flex flex-col p-4 gap-1">
              <button onClick={() => scrollTo('funzionalita')} className="text-left px-4 py-3 min-h-[48px] rounded-xl text-[#A0A0A0] hover:bg-[#2C2C2E] hover:text-white transition-colors text-base">
                Funzionalità
              </button>
              <button onClick={() => scrollTo('piani')} className="text-left px-4 py-3 min-h-[48px] rounded-xl text-[#A0A0A0] hover:bg-[#2C2C2E] hover:text-white transition-colors text-base">
                Piani
              </button>
              <button onClick={() => scrollTo('faq')} className="text-left px-4 py-3 min-h-[48px] rounded-xl text-[#A0A0A0] hover:bg-[#2C2C2E] hover:text-white transition-colors text-base">
                Domande
              </button>
              <Link href="/dashboard" className="mt-2 px-4 py-3 min-h-[48px] flex items-center justify-center bg-[#6B48FF] text-white rounded-xl font-medium hover:bg-[#5A3FE6] transition-colors text-base" onClick={() => setMenuOpen(false)}>
                Accedi
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Hero - responsive */}
      <section className="pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-[#2C2C2E] border border-[#2C2C2E] mb-6 sm:mb-8">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs sm:text-sm text-[#A0A0A0]">AI Tutor Online</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold max-w-3xl mx-auto leading-tight mb-4 sm:mb-6 text-white px-1">
          Lo Studio ha{' '}
          <span className="text-[#6B48FF]">
            Nuovi Occhi.
          </span>
        </h1>
        <p className="text-base sm:text-lg text-[#A0A0A0] max-w-xl mx-auto mb-8 sm:mb-10 px-2">
          Mostra il quaderno alla webcam. L&apos;AI vede, capisce e ti guida alla soluzione come un professore privato.
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3 sm:gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center min-h-[48px] px-6 sm:px-8 py-3.5 sm:py-4 bg-[#6B48FF] text-white rounded-xl font-semibold hover:bg-[#5A3FE6] transition-colors text-base"
          >
            Inizia Gratis
          </Link>
          <button
            type="button"
            onClick={() => scrollTo('funzionalita')}
            className="min-h-[48px] px-6 sm:px-8 py-3.5 sm:py-4 bg-[#2C2C2E] text-white rounded-xl font-semibold hover:bg-[#333335] transition-colors border border-[#2C2C2E] text-base"
          >
            Guarda Demo
          </button>
        </div>
        <button
          type="button"
          onClick={() => scrollTo('funzionalita')}
          className="mt-12 sm:mt-16 inline-flex flex-col items-center gap-1 text-[#A0A0A0] hover:text-white transition-colors min-h-[44px] justify-center"
          aria-label="Scorri in basso"
        >
          <span className="text-xs">Scorri</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      </section>

      {/* Superpoteri - responsive */}
      <section id="funzionalita" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12 text-white">Superpoteri per lo Studio</h2>
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[
            {
              icon: '📷',
              title: 'Visione Real-Time',
              desc: "Riconosce calligrafia, grafici e formule all'istante tramite webcam.",
            },
            {
              icon: '🎙️',
              title: 'Tutor Vocale',
              desc: "Spiegazioni naturali e pazienti. Puoi interromperlo e chiedere chiarimenti a voce.",
            },
            {
              icon: '🧠',
              title: 'Memoria Adattiva',
              desc: 'Ricorda i tuoi errori passati e personalizza gli esercizi futuri per te.',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="bg-[#2C2C2E] rounded-2xl p-5 sm:p-6 border border-[#2C2C2E] text-left hover:bg-[#333335] transition-colors"
            >
              <div className="text-2xl sm:text-3xl mb-3 sm:mb-4">{card.icon}</div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2">{card.title}</h3>
              <p className="text-sm text-[#A0A0A0] leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Piani Famiglia - responsive */}
      <section id="piani" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-6 text-white">Scegli il tuo piano</h2>
        <div className="flex justify-center mb-8 sm:mb-12">
          <div className="inline-flex p-1 rounded-full bg-[#2C2C2E] border border-[#2C2C2E]">
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`min-h-[44px] px-4 sm:px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${billing === 'monthly' ? 'bg-[#6B48FF] text-white' : 'text-[#A0A0A0] hover:text-white'}`}
            >
              Mensile
            </button>
            <button
              type="button"
              onClick={() => setBilling('annual')}
              className={`min-h-[44px] px-4 sm:px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${billing === 'annual' ? 'bg-[#6B48FF] text-white' : 'text-[#A0A0A0] hover:text-white'}`}
            >
              Annuale (-20%)
            </button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[
            { name: 'Starter', price: '€9,90', features: ['1 Studente', 'Tutor AI Base', 'Solo Testo'], cta: 'Scegli Starter', recommended: false },
            { name: 'Family', price: '€19,90', features: ['4 Profili Studente', 'Tutor Avanzato + Memoria', 'Dashboard Genitori'], cta: 'Attiva Family', recommended: true },
            { name: 'Premium', price: '€29,90', features: ['Tutto incluso', 'Camera Live Vision', 'Voice Mode'], cta: 'Scegli Premium', recommended: false },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-5 sm:p-6 border ${plan.recommended ? 'border-[#6B48FF] bg-[#2C2C2E]' : 'border-[#2C2C2E] bg-[#2C2C2E]'}`}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#6B48FF] rounded-full text-xs font-semibold text-white whitespace-nowrap">
                  CONSIGLIATO
                </div>
              )}
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">{plan.name}</h3>
              <p className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">{plan.price}</p>
              <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[#A0A0A0]">
                    <span>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard"
                className={`block w-full min-h-[48px] flex items-center justify-center py-3 rounded-xl text-center font-semibold transition-colors text-base ${
                  plan.recommended
                    ? 'bg-[#6B48FF] text-white hover:bg-[#5A3FE6]'
                    : 'bg-[#2C2C2E] text-white hover:bg-[#333335] border border-[#2C2C2E]'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Scuole & Corporate - responsive */}
      <section id="scuole" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 border-t border-[#2C2C2E]">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12 text-white">Scuole & Corporate</h2>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Card Scuole */}
          <div className="group relative rounded-2xl p-[1px] bg-gradient-to-br from-amber-500/40 via-orange-500/20 to-[#6B48FF]/30 overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_-8px_rgba(245,158,11,0.4)] hover:shadow-amber-500/20">
            <div className="relative h-full rounded-2xl bg-gradient-to-br from-[#2C2C2E] via-[#252528] to-[#1A1A1A] p-6 sm:p-8 flex flex-col border border-white/5">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-amber-500/25 to-orange-600/20 border border-amber-500/30 flex items-center justify-center mb-4 sm:mb-6 text-xl sm:text-2xl shadow-lg shadow-amber-500/10">
                🏫
              </div>
              <h3 className="relative text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">Per le Scuole</h3>
              <p className="relative text-[#A0A0A0] text-sm leading-relaxed mb-4 sm:mb-6 flex-1">
                Soluzioni dedicate per istituti e docenti: licenze multiple, dashboard di monitoraggio e contenuti allineati ai programmi ministeriali.
              </p>
              <a
                href="mailto:scuole@zenkai.com?subject=Richiesta informazioni - Scuole"
                className="relative inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 bg-gradient-to-r from-[#6B48FF] to-[#5A3FE6] hover:from-[#7C5AFF] hover:to-[#6B48FF] text-white rounded-xl font-medium transition-all duration-300 shadow-lg shadow-[#6B48FF]/25 hover:shadow-[#6B48FF]/40 active:scale-[0.98] sm:hover:scale-[1.02]"
              >
                Contattaci
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
          {/* Card Corporate */}
          <div className="group relative rounded-2xl p-[1px] bg-gradient-to-br from-blue-500/40 via-indigo-500/20 to-[#6B48FF]/30 overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_-8px_rgba(99,102,241,0.4)] hover:shadow-indigo-500/20">
            <div className="relative h-full rounded-2xl bg-gradient-to-br from-[#2C2C2E] via-[#252528] to-[#1A1A1A] p-6 sm:p-8 flex flex-col border border-white/5">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-blue-500/25 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center mb-4 sm:mb-6 text-xl sm:text-2xl shadow-lg shadow-blue-500/10">
                🏢
              </div>
              <h3 className="relative text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">Corporate</h3>
              <p className="relative text-[#A0A0A0] text-sm leading-relaxed mb-4 sm:mb-6 flex-1">
                Formazione aziendale, upskilling e learning on the job con tutor AI personalizzabili e report per HR.
              </p>
              <a
                href="mailto:corporate@zenkai.com?subject=Richiesta informazioni - Corporate"
                className="relative inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 bg-gradient-to-r from-[#6B48FF] to-[#5A3FE6] hover:from-[#7C5AFF] hover:to-[#6B48FF] text-white rounded-xl font-medium transition-all duration-300 shadow-lg shadow-[#6B48FF]/25 hover:shadow-[#6B48FF]/40 active:scale-[0.98] sm:hover:scale-[1.02]"
              >
                Contattaci
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ - responsive */}
      <section id="faq" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 border-t border-[#2C2C2E]">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12 text-white">Domande Frequenti</h2>
        <div className="max-w-2xl mx-auto space-y-2 sm:space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="bg-[#2C2C2E] rounded-xl border border-[#2C2C2E] overflow-hidden hover:bg-[#333335] transition-colors"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-4 sm:px-5 py-4 min-h-[48px] text-left text-white hover:bg-[#333335] transition-colors"
              >
                <span className="font-medium pr-4 text-sm sm:text-base">{item.q}</span>
                <svg
                  className={`w-5 h-5 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaq === i && (
                <div className="px-4 sm:px-5 pb-4 text-[#A0A0A0] text-sm sm:text-base leading-relaxed border-t border-[#2C2C2E] pt-2">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-4 sm:px-6 border-t border-[#2C2C2E] text-center text-sm text-[#A0A0A0] safe-area-inset-bottom">
        <p>© ZenkAI. Universal Tutor.</p>
      </footer>
    </div>
  )
}
