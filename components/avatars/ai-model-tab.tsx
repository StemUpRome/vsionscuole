'use client'

interface AIModelTabProps {
  model: string
  temperature: number
  onModelChange: (model: string) => void
  onTemperatureChange: (temperature: number) => void
}

export default function AIModelTab({ model, temperature, onModelChange, onTemperatureChange }: AIModelTabProps) {
  const models = [
    { value: 'gpt-4', label: 'GPT-4', description: 'Modello più avanzato, migliore qualità' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Versione ottimizzata di GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Più veloce ed economico' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus', description: 'Alternativa avanzata' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet', description: 'Bilanciato qualità/prezzo' },
  ]

  return (
    <div className="h-full space-y-6">
      <h2 className="text-xl font-semibold text-white mb-4 drop-shadow-lg">Modello IA</h2>

      {/* Model Selection */}
      <div>
        <label className="block text-sm font-medium text-white mb-3 drop-shadow-md">
          Seleziona modello
        </label>
        <div className="space-y-2">
          {models.map((m) => (
            <label
              key={m.value}
              className={`flex items-start p-3 md:p-4 border-2 rounded-xl cursor-pointer transition-all backdrop-blur-sm shadow-lg ${
                model === m.value
                  ? 'border-blue-400 bg-gradient-to-r from-blue-400/30 to-blue-600/30'
                  : 'border-white/20 bg-white/10 hover:border-white/40 hover:bg-white/15'
              }`}
            >
              <input
                type="radio"
                name="model"
                value={m.value}
                checked={model === m.value}
                onChange={(e) => onModelChange(e.target.value)}
                className="mt-1 mr-2 md:mr-3 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white text-sm md:text-base">{m.label}</p>
                <p className="text-xs md:text-sm text-white/70">{m.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Temperature Slider */}
      <div className="space-y-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-white">
            Temperatura
          </label>
          <span className="text-sm font-semibold text-blue-300 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-lg">{temperature.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={temperature}
          onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #60a5fa 0%, #60a5fa ${temperature * 100}%, rgba(255, 255, 255, 0.2) ${temperature * 100}%, rgba(255, 255, 255, 0.2) 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-white/70">
          <span>Più deterministico (0.0)</span>
          <span>Più creativo (1.0)</span>
        </div>
        <p className="text-sm text-white/80">
          La temperatura controlla la creatività delle risposte. Valori bassi producono risposte più
          coerenti e prevedibili, valori alti producono risposte più creative e variate.
        </p>
      </div>
    </div>
  )
}
