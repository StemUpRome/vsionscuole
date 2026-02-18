'use client'

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Checkout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Stub per integrazione futura con dashboard admin
  const addRevenue = (_: number) => {};
  const addActivity = (_a: string, _b: string, _c: string) => {};
  
  // Recuperiamo i parametri dall'URL
  const planParam = searchParams.get('plan') || 'starter';
  const intervalParam = searchParams.get('interval') || 'monthly';

  // Stato per gestire lo switch Mensile/Annuale
  const [isAnnual, setIsAnnual] = useState(intervalParam === 'year');
  const [isLoading, setIsLoading] = useState(false);
  
  // Dati simulati dei piani
  const plans: any = {
    starter: { name: 'Starter', price: 9.90, priceYear: 99, features: ['1 Studente', 'Tutor Base'] },
    family: { name: 'Family', price: 19.90, priceYear: 199, features: ['4 Studenti', 'Memoria AI', 'Dashboard Genitori'] },
    premium: { name: 'Premium', price: 29.90, priceYear: 299, features: ['Tutto incluso', 'Live Vision', 'Voice Mode'] },
  };

  const selectedPlan = plans[planParam.toLowerCase()] || plans.starter;
  
  // Calcolo prezzo dinamico
  const price = isAnnual ? selectedPlan.priceYear : selectedPlan.price;
  const billingCycle = isAnnual ? '/anno' : '/mese';

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // SIMULAZIONE PAGAMENTO
    setTimeout(() => {
      // 1. AGGIORNIAMO LA DASHBOARD ADMIN
      addRevenue(price); // Aggiunge i soldi al totale
      addActivity('Nuovo Cliente', `Ha acquistato piano ${selectedPlan.name} (${isAnnual ? 'Annuale' : 'Mensile'})`, 'payment');

      setIsLoading(false);
      router.push('/avatars');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#131314] text-gray-200 font-sans flex items-center justify-center p-4 md:p-8 selection:bg-indigo-500/30">
      
      {/* Navbar Minimal */}
      <nav className="absolute top-0 left-0 w-full p-6 z-20">
        <div 
          className="flex items-center gap-3 cursor-pointer opacity-80 hover:opacity-100 transition inline-flex" 
          onClick={() => router.back()}
        >
          <div className="w-8 h-8 rounded-full bg-[#2D2E30] flex items-center justify-center text-white text-xs font-bold border border-[#3C4043]">
            ←
          </div>
          <span className="text-sm font-medium text-gray-400">Indietro</span>
        </div>
      </nav>

      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-start animate-fade-in-up mt-16 md:mt-0">
        
        {/* COLONNA SINISTRA: RIEPILOGO ORDINE */}
        <div className="bg-[#1E1F20] border border-[#2D2E30] rounded-[2rem] p-8 md:p-10 relative overflow-hidden flex flex-col h-full">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="relative z-10 flex flex-col h-full">
            <h2 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-6">Riepilogo Ordine</h2>
            
            {/* SWITCH MENSILE / ANNUALE */}
            <div className="flex items-center gap-4 mb-6 bg-[#131314] p-2 rounded-full w-fit border border-[#2D2E30]">
              <button 
                onClick={() => setIsAnnual(false)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${!isAnnual ? 'bg-[#2D2E30] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Mensile
              </button>
              <button 
                onClick={() => setIsAnnual(true)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${isAnnual ? 'bg-[#2D2E30] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Annuale <span className="text-green-400 text-[10px]">-20%</span>
              </button>
            </div>

            <div className="text-5xl font-medium text-white mb-2 tracking-tight">
              €{price.toFixed(2)}<span className="text-lg text-gray-500 font-normal">{billingCycle}</span>
            </div>
            <div className="text-indigo-400 font-medium mb-8 text-lg">Piano {selectedPlan.name}</div>

            <div className="border-t border-[#2D2E30] py-6 space-y-4 flex-1">
              <h3 className="text-white font-bold mb-2">Cosa stai sbloccando:</h3>
              {selectedPlan.features.map((feat: string, i: number) => (
                <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-xs border border-green-500/30">✓</span>
                  {feat}
                </div>
              ))}
            </div>

            <div className="bg-[#131314] rounded-xl p-4 flex items-center gap-4 border border-[#2D2E30] mt-auto">
              <div className="text-3xl">🛡️</div>
              <div>
                <div className="text-white font-bold text-sm">Garanzia Totale</div>
                <div className="text-gray-500 text-xs">Soddisfatti o rimborsati entro 14 giorni.</div>
              </div>
            </div>
          </div>
        </div>

        {/* COLONNA DESTRA: PAGAMENTO */}
        <div className="bg-[#1E1F20] border border-[#2D2E30] rounded-[2rem] p-8 md:p-10 shadow-2xl">
          <h2 className="text-xl font-medium text-white mb-6">Dettagli Pagamento</h2>
          
          <form onSubmit={handlePayment} className="space-y-6">
            
            {/* Metodo di Pagamento */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button type="button" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2D2E30] border border-indigo-500 text-white font-medium transition-all shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                <span>💳</span> Carta
              </button>
              <button type="button" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#131314] border border-[#2D2E30] text-gray-400 hover:text-white transition-all hover:border-gray-600">
                <span></span> Pay
              </button>
            </div>

            {/* Input simulati */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email</label>
                <input 
                  type="email" required placeholder="tu@esempio.com"
                  className="w-full bg-[#131314] border border-[#2D2E30] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Dati Carta</label>
                <div className="bg-[#131314] border border-[#2D2E30] rounded-xl overflow-hidden focus-within:border-indigo-500 transition-colors">
                  <div className="flex items-center px-4 border-b border-[#2D2E30]">
                    <span className="text-gray-500 text-lg mr-2">💳</span>
                    <input 
                      type="text" placeholder="Numero Carta" 
                      className="w-full bg-transparent border-none py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-0"
                    />
                  </div>
                  <div className="flex">
                    <input 
                      type="text" placeholder="MM / AA" 
                      className="w-1/2 bg-transparent border-r border-[#2D2E30] px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-0"
                    />
                    <input 
                      type="text" placeholder="CVC" 
                      className="w-1/2 bg-transparent px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Intestatario</label>
                <input 
                  type="text" required placeholder="Nome sulla carta"
                  className="w-full bg-[#131314] border border-[#2D2E30] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Totale e Bottone */}
            <div className="pt-4">
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-4 rounded-xl bg-white text-black font-bold text-lg hover:bg-gray-200 transition-all shadow-lg flex items-center justify-center gap-2 transform active:scale-[0.98]"
              >
                {isLoading ? (
                  <span className="animate-pulse">Elaborazione...</span>
                ) : (
                  <>Paga €{price.toFixed(2)}</>
                )}
              </button>
              
              <div className="flex items-center justify-center gap-2 mt-4 text-[#4A4B4D] text-xs">
                <span>🔒 Pagamento sicuro crittografato SSL a 256-bit</span>
              </div>
            </div>

          </form>
        </div>

      </div>

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.5s ease-out; }
      `}</style>
    </div>
  );
}