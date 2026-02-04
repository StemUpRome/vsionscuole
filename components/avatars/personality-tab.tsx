'use client'

import { useMemo } from 'react'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'

interface Personality {
  openness: number
  conscientiousness: number
  extraversion: number
  agreeableness: number
  neuroticism: number
}

interface PersonalityTabProps {
  personality: Personality
  onChange: (personality: Personality) => void
}

export default function PersonalityTab({ personality, onChange }: PersonalityTabProps) {
  const traits = [
    {
      key: 'openness' as keyof Personality,
      label: 'Apertura mentale',
      leftLabel: 'Non ama i cambiamenti',
      rightLabel: 'Ama esplorare',
      color: 'blue',
    },
    {
      key: 'conscientiousness' as keyof Personality,
      label: 'Meticolosità',
      leftLabel: 'Lasciar accadere le cose',
      rightLabel: 'Attenzione ai dettagli',
      color: 'red',
    },
    {
      key: 'extraversion' as keyof Personality,
      label: 'Estroversione',
      leftLabel: 'Introverso',
      rightLabel: 'Estroverso',
      color: 'purple',
    },
    {
      key: 'agreeableness' as keyof Personality,
      label: 'Amabilità',
      leftLabel: 'Competitivo',
      rightLabel: 'Amichevole',
      color: 'green',
    },
    {
      key: 'neuroticism' as keyof Personality,
      label: 'Sensibilità',
      leftLabel: 'Raramente emotivo',
      rightLabel: 'Altamente emotivo',
      color: 'white',
    },
  ]

  const handleSliderChange = (trait: keyof Personality, value: number) => {
    onChange({
      ...personality,
      [trait]: value,
    })
  }

  // Memoize radarData per ottimizzare il re-render e assicurare aggiornamenti
  const radarData = useMemo(
    () => [
      {
        trait: 'Apertura',
        value: personality.openness,
        fullMark: 100,
      },
      {
        trait: 'Meticolosità',
        value: personality.conscientiousness,
        fullMark: 100,
      },
      {
        trait: 'Estroversione',
        value: personality.extraversion,
        fullMark: 100,
      },
      {
        trait: 'Amabilità',
        value: personality.agreeableness,
        fullMark: 100,
      },
      {
        trait: 'Sensibilità',
        value: personality.neuroticism,
        fullMark: 100,
      },
    ],
    [personality.openness, personality.conscientiousness, personality.extraversion, personality.agreeableness, personality.neuroticism]
  )

  // Chiave dinamica per forzare il re-render del grafico quando cambiano i valori
  const chartKey = useMemo(
    () => `${personality.openness}-${personality.conscientiousness}-${personality.extraversion}-${personality.agreeableness}-${personality.neuroticism}`,
    [personality.openness, personality.conscientiousness, personality.extraversion, personality.agreeableness, personality.neuroticism]
  )

  const getColorGradient = (color: string, value: number) => {
    const colors: Record<string, string> = {
      blue: '#60a5fa',
      red: '#f87171',
      purple: '#a78bfa',
      green: '#4ade80',
      white: '#e5e7eb',
    }
    const colorValue = colors[color] || '#60a5fa'
    return `linear-gradient(to right, ${colorValue} 0%, ${colorValue} ${value}%, rgba(255, 255, 255, 0.2) ${value}%, rgba(255, 255, 255, 0.2) 100%)`
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 lg:gap-8">
      {/* Left Panel - Sliders */}
      <div className="w-full lg:w-1/2 space-y-4 lg:space-y-6">
        <h2 className="text-xl font-semibold text-white mb-4 drop-shadow-lg">Personalità</h2>
        
        {traits.map((trait) => (
          <div key={trait.key} className="space-y-2 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-white">{trait.label}</label>
              <span className="text-xs text-white/80 bg-black/20 backdrop-blur-sm px-2 py-1 rounded-lg">{personality[trait.key]}%</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="0"
                max="100"
                value={personality[trait.key]}
                onChange={(e) => handleSliderChange(trait.key, parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: getColorGradient(trait.color, personality[trait.key]),
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-white/70">
              <span>{trait.leftLabel}</span>
              <span>{trait.rightLabel}</span>
            </div>
          </div>
        ))}

        <div className="mt-8 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
          <label className="block text-sm font-medium text-white mb-2">
            Seleziona una personalità
          </label>
          <select className="w-full px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all">
            <option value="" className="bg-gray-800">Personalità personalizzata</option>
            <option value="teacher" className="bg-gray-800">Docente tradizionale</option>
            <option value="mentor" className="bg-gray-800">Mentore empatico</option>
            <option value="expert" className="bg-gray-800">Esperto tecnico</option>
            <option value="innovator" className="bg-gray-800">Innovatore creativo</option>
          </select>
          <p className="text-xs text-white/70 mt-2">
            Modifica i parametri per creare una nuova personalità
          </p>
        </div>
      </div>

      {/* Right Panel - Radar Chart */}
      <div className="w-full lg:w-1/2 flex items-center justify-center min-h-[300px] lg:min-h-0">
        <div className="w-full h-full max-w-md bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 md:p-6 shadow-2xl">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart key={chartKey} data={radarData}>
              <PolarGrid stroke="rgba(255, 255, 255, 0.3)" />
              <PolarAngleAxis
                dataKey="trait"
                tick={{ fill: '#ffffff', fontSize: 12, fontWeight: 500 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 10 }}
              />
              <Radar
                name="Personalità"
                dataKey="value"
                stroke="#60a5fa"
                fill="#60a5fa"
                fillOpacity={0.4}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
