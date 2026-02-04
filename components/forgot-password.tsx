'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulazione invio
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#131314] text-gray-200 font-sans flex flex-col items-center justify-center relative overflow-hidden selection:bg-indigo-500/30">
      
      {/* Navbar Minimal */}
      <nav className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-3 cursor-pointer opacity-80 hover:opacity-100 transition" onClick={() => router.push('/dashboard')}>
          <div className="w-8 h-8 rounded-full bg-[#2D2E30] flex items-center justify-center text-white text-xs font-bold border border-[#3C4043]">←</div>
          <span className="text-sm font-medium text-gray-400">Torna al Login</span>
        </div>
      </nav>

      {/* Main Card */}
      <div className="z-10 w-full max-w-md px-4 animate-fade-in-up">
        <div className="bg-[#1E1F20] border border-[#2D2E30] rounded-[2rem] p-8 md:p-10 shadow-2xl min-h-[400px] flex flex-col justify-center">
          
          {!isSubmitted ? (
            /* --- STATO 1: FORM --- */
            <>
              <div className="text-center mb-8">
                <div className="w-12 h-12 mx-auto bg-[#2D2E30] rounded-2xl flex items-center justify-center text-2xl mb-4 border border-[#3C4043]">
                  🔒
                </div>
                <h2 className="text-2xl font-medium text-white mb-2">Recupera Password</h2>
                <p className="text-gray-400 text-sm">Inserisci la tua email per ricevere le istruzioni.</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-2">Email Genitore</label>
                  <input 
                    type="email" required placeholder="nome@esempio.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#131314] border border-[#2D2E30] rounded-xl px-5 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <button type="submit" className="w-full bg-white text-black py-3.5 rounded-full font-bold text-lg hover:bg-gray-200 transition-all mt-2 shadow-lg shadow-white/5">
                  Invia Link
                </button>
              </form>
            </>
          ) : (
            /* --- STATO 2: SUCCESSO --- */
            <div className="text-center animate-fade-in-up">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl text-green-400 border border-green-500/20">
                ✓
              </div>
              <h2 className="text-2xl font-medium text-white mb-2">Email Inviata!</h2>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                Abbiamo inviato un link di ripristino a <br/>
                <span className="text-white font-medium">{email}</span>
              </p>
              
              <button 
                onClick={() => router.push('/dashboard')}
                className="w-full bg-[#2D2E30] border border-[#3C4043] text-white py-3 rounded-full font-bold hover:bg-[#3C4043] transition-all"
              >
                Torna al Login
              </button>
              
              <p className="text-xs text-gray-500 mt-6 cursor-pointer hover:text-white transition-colors" onClick={() => setIsSubmitted(false)}>
                Ho sbagliato email, riprova.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}