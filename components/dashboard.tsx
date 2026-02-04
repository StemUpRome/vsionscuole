import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import { useGlobal } from '../context/GlobalContext';
import CardCollection from '../components/CardCollection';
import MiniGamesSection from '../components/MiniGamesSection';
import DailyTutor from '../components/DailyTutor';
import ActivityTimeline from '../components/ActivityTimeline';

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentStudent } = useAuth();
  const { progress, achievements, updateAchievement, updateProgressFromResults, updateStreak } = useGamification();
  const { results } = useGlobal();

  // Filtra risultati per studente corrente
  const studentResults = results.filter(r => r.studentId === currentStudent?.id);
  
  // Calcolo Media Precisione
  const avgAccuracy = studentResults.length > 0 
    ? Math.round(studentResults.reduce((acc, curr) => acc + curr.accuracy, 0) / studentResults.length) 
    : 0;

  // Aggiorna progressi quando i risultati cambiano
  React.useEffect(() => {
    if (!progress) return;

    // Aggiorna streak giornaliero
    updateStreak();

    // Aggiorna progressi dai risultati quiz
    if (studentResults.length > 0) {
      updateProgressFromResults(studentResults);
    }

    // Achievement: Primi Passi
    if (studentResults.length >= 1) {
      updateAchievement('ach_001', 1);
    }

    // Achievement: Quiz Master
    updateAchievement('ach_003', studentResults.length);

    // Achievement: Perfettista
    const perfectScores = studentResults.filter(r => r.accuracy === 100).length;
    updateAchievement('ach_004', perfectScores);

    // Achievement: Studente Avanzato
    updateAchievement('ach_005', progress.level);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentResults.length, progress?.level]);

  if (!progress || !currentStudent) {
    return (
      <div className="min-h-screen bg-[#131314] flex items-center justify-center">
        <div className="text-white">Caricamento...</div>
      </div>
    );
  }

  const currentLevel = progress.level;
  const currentLevelProgress = (progress.xp / progress.xpForNextLevel) * 100;

  // Configurazione Card Attività
  const activities = [
    { 
      id: 'homework', 
      title: 'Aiuto Compiti', 
      desc: 'Fotocamera Live', 
      icon: '📷', 
      path: '/room/homework',
      color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
    },
    { 
      id: 'library', 
      title: 'Studio & Quiz', 
      desc: 'Carica e Gioca', 
      icon: '🧠', 
      path: '/library', 
      color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
    }
  ];

  return (
    <div className="min-h-screen bg-[#131314] text-gray-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      
      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 z-50 bg-[#131314]/90 backdrop-blur-md border-b border-[#2D2E30] px-3 sm:px-6 h-16 sm:h-20 flex justify-between items-center">
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#2D2E30] flex items-center justify-center text-white text-xs sm:text-sm font-bold border border-[#3C4043]">
            👁️
          </div>
          <span className="text-lg sm:text-xl font-medium tracking-tight text-white">ZenkAI</span>
        </div>

        {/* Profilo & Streak */}
        <div className="flex items-center gap-2 sm:gap-6">
          <div className="hidden sm:flex items-center gap-2 bg-[#1E1F20] px-3 py-1.5 rounded-full border border-[#2D2E30]">
            <span className="text-orange-500 animate-pulse">🔥</span>
            <span className="text-sm font-bold text-white">{progress.currentStreak} Giorni</span>
          </div>
          
          <div className="group relative cursor-pointer" onClick={() => navigate('/settings')}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs sm:text-base shadow-lg border-2 border-[#131314] ring-2 ring-[#2D2E30] group-hover:ring-gray-500 transition-all">
              {currentStudent.name.charAt(0)}
            </div>
          </div>
        </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-8">
        
        {/* === SECTION 1: HERO GAMIFICATION === */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 animate-fade-in-up">
          
          {/* LEVEL CARD */}
          <div className="col-span-1 md:col-span-2 bg-[#1E1F20] border border-[#2D2E30] rounded-xl sm:rounded-[2rem] p-4 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-end gap-4 sm:gap-6">
              <div className="w-full sm:w-auto">
                <p className="text-gray-400 text-xs sm:text-sm font-medium mb-1">Bentornato, {currentStudent.name} 👋</p>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">Livello {currentLevel}</h1>
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <span className="text-indigo-400 font-bold text-xs sm:text-sm">{progress.xp} XP</span>
                  <span className="text-gray-600 text-[10px] sm:text-xs">/ {progress.xpForNextLevel} XP prossimi</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full sm:w-64 h-2 sm:h-3 bg-[#2D2E30] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out" style={{ width: `${currentLevelProgress}%` }}></div>
                </div>
              </div>
              
              <div className="hidden sm:block">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-3xl sm:text-4xl shadow-2xl shadow-indigo-500/20 animate-bounce-slow">
                  🚀
                </div>
              </div>
            </div>
          </div>

          {/* COACH AI / PIANO MIGLIORAMENTO */}
          <div className="bg-gradient-to-br from-[#1E1F20] to-[#161618] border border-[#2D2E30] rounded-xl sm:rounded-[2rem] p-4 sm:p-6 flex flex-col justify-between relative overflow-hidden">
             <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-500/10 rounded-full blur-[40px]"></div>
             
             <div>
               <div className="flex items-center gap-2 mb-4">
                 <span className="text-xl">🤖</span>
                 <h3 className="font-bold text-white text-sm uppercase tracking-wide">Coach AI</h3>
               </div>
               
               {avgAccuracy === 0 ? (
                 <p className="text-gray-400 text-sm leading-relaxed">
                   Non ho ancora abbastanza dati. <br/>
                   <span className="text-white font-medium">Completa il primo Quiz!</span>
                 </p>
               ) : avgAccuracy < 60 ? (
                 <div className="space-y-2">
                   <p className="text-sm text-yellow-500 font-bold">⚠️ Piano di Recupero</p>
                   <p className="text-xs text-gray-400">La precisione è bassa ({avgAccuracy}%). Rileggi gli appunti prima di riprovare il quiz.</p>
                 </div>
               ) : (
                 <div className="space-y-2">
                   <p className="text-sm text-green-400 font-bold">🚀 Ottimo lavoro!</p>
                   <p className="text-xs text-gray-400">La tua media è alta ({avgAccuracy}%). Prova ad aumentare la difficoltà a "Difficile".</p>
                 </div>
               )}
             </div>

             <button onClick={() => navigate('/library')} className="mt-4 w-full py-2 bg-[#2D2E30] hover:bg-[#3C4043] rounded-xl text-xs font-bold text-white transition">
               Vai al Piano
             </button>
          </div>
        </div>

        {/* === SECTION 2: ACTIONS === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          
          {/* Action Cards */}
          {activities.map((item) => (
            <div 
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`group bg-[#1E1F20] border border-[#2D2E30] hover:border-gray-500 rounded-xl sm:rounded-[2rem] p-4 sm:p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] relative overflow-hidden`}
            >
              <div className="flex justify-between items-start mb-12">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl border ${item.color}`}>
                  {item.icon}
                </div>
                <div className="w-8 h-8 rounded-full bg-[#2D2E30] flex items-center justify-center text-gray-400 group-hover:text-white transition">↗</div>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{item.title}</h3>
              <p className="text-xs text-gray-400">{item.desc}</p>
            </div>
          ))}

          {/* Upgrade Banner (Compact) */}
          <div 
            onClick={() => navigate('/upgrade')}
            className="group bg-[#1E1F20]/50 border border-[#2D2E30] border-dashed rounded-[2rem] p-6 cursor-pointer hover:bg-[#1E1F20] transition-all flex flex-col justify-center items-center text-center gap-3"
          >
            <div className="w-10 h-10 bg-[#2D2E30] rounded-full flex items-center justify-center text-lg text-gray-500 group-hover:text-indigo-400 transition-colors">🔒</div>
            <div>
              <h3 className="text-sm font-bold text-gray-400 group-hover:text-white">Sblocca Tutto</h3>
              <p className="text-[10px] text-gray-500">Lingue, Quaderno e altro.</p>
            </div>
          </div>
        </div>

        {/* === SECTION 3: ACHIEVEMENTS === */}
        <div className="bg-[#1E1F20] border border-[#2D2E30] rounded-xl sm:rounded-[2rem] p-4 sm:p-8 animate-fade-in-up delay-100">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-bold text-white">I tuoi Trofei 🏆</h2>
            <span className="text-[10px] sm:text-xs text-gray-500">
              {achievements.filter(a => a.unlocked).length} / {achievements.length} Sbloccati
            </span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            {achievements.map((achievement) => (
              <div 
                key={achievement.id} 
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
                  achievement.unlocked 
                    ? 'bg-[#131314] border-[#3C4043] opacity-100' 
                    : 'bg-[#131314]/50 border-[#2D2E30] opacity-40 grayscale'
                }`}
              >
                <div className="text-3xl mb-3 drop-shadow-md">{achievement.icon}</div>
                <div className="text-sm font-bold text-white text-center">{achievement.name}</div>
                <div className="text-[10px] text-gray-500 text-center mt-1">{achievement.description}</div>
                
                {!achievement.unlocked && (
                  <div className="mt-2 w-full bg-[#2D2E30] rounded-full h-1.5">
                    <div 
                      className="bg-indigo-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                    />
                  </div>
                )}
                
                {achievement.unlocked && (
                  <div className="mt-2 text-[10px] text-green-400 font-bold uppercase tracking-wider">✓ Sbloccato</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* === SECTION 4: DAILY TUTOR === */}
        <DailyTutor />

        {/* === SECTION 5: ACTIVITY TIMELINE === */}
        <ActivityTimeline />

        {/* === SECTION 6: CARD COLLECTION === */}
        <CardCollection />

        {/* === SECTION 7: MINI-GAMES === */}
        <MiniGamesSection />

      </main>

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(-5%); }
          50% { transform: translateY(5%); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-bounce-slow { animation: bounce-slow 3s infinite ease-in-out; }
      `}</style>
    </div>
  );
}
