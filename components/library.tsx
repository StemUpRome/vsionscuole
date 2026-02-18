import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobal } from '../context/GlobalContext';

export default function Library() {
  const navigate = useNavigate();
  const { files, results, addFile, removeFile } = useGlobal();
  const [activeTab, setActiveTab] = useState<'files' | 'results'>('files');
  const [isDragging, setIsDragging] = useState(false);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) Array.from(e.dataTransfer.files).forEach(addFile);
  };
  const handleBrowseClick = () => { fileInputRef.current?.click(); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) Array.from(e.target.files).forEach(addFile);
  };

  return (
    <div className="min-h-screen bg-[#131314] text-gray-200 font-sans p-6 selection:bg-indigo-500/30" onClick={() => setActiveMenu(null)}>
      
      {/* Header */}
      <header className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/avatars')}>
            <div className="w-10 h-10 rounded-full bg-[#2D2E30] flex items-center justify-center text-white font-bold border border-[#3C4043]">←</div>
            <h1 className="text-2xl font-medium text-white">Studio & Quiz</h1>
          </div>
          <button onClick={() => navigate('/quiz')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-full font-bold shadow-lg transition-all flex items-center gap-2">
            <span>🎮</span> Gioca
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-8 border-b border-[#2D2E30]">
          <button onClick={() => setActiveTab('files')} className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'files' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            📚 Materiali ({files.length})
          </button>
          <button onClick={() => setActiveTab('results')} className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'results' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            🏆 I miei Voti ({results.length})
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
        
        {/* --- VISTA MATERIALI --- */}
        {activeTab === 'files' && (
          <>
            <div 
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              onClick={(e) => { e.stopPropagation(); handleBrowseClick(); }}
              className={`border-2 border-dashed rounded-[2rem] h-64 flex flex-col items-center justify-center transition-all cursor-pointer group relative overflow-hidden ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-[#3C4043] bg-[#1E1F20] hover:border-gray-500'}`}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept=".pdf,.doc,.docx,.txt,.jpg,.png" />
              <div className="w-16 h-16 bg-[#2D2E30] rounded-full flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">📂</div>
              <h3 className="text-lg font-bold text-white mb-2">Trascina qui i tuoi file</h3>
              <p className="text-sm text-gray-400 mb-6">PDF, Word, JPG, TXT</p>
              <button className="px-6 py-2 bg-white text-black rounded-full text-sm font-bold hover:bg-gray-200 transition shadow-lg">O seleziona dal PC</button>
            </div>

            <div className="grid gap-4">
              {files.length === 0 ? <div className="text-center py-10 text-gray-600 italic">Nessun file caricato.</div> : files.map((file) => (
                <div key={file.id} className="bg-[#1E1F20] border border-[#2D2E30] p-4 rounded-2xl flex items-center justify-between hover:border-[#3C4043] transition">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xs shadow-inner ${file.type.includes('PDF') ? 'bg-red-500/10 text-red-400' : 'bg-gray-500/10 text-gray-400'}`}>{file.type.substring(0, 3)}</div>
                    <div><div className="font-bold text-white text-sm">{file.name}</div><div className="text-xs text-gray-500">{file.size} • {file.uploadDate}</div></div>
                  </div>
                  <div className="flex items-center gap-4">
                    {file.status === 'ready' ? <span className="text-green-500 text-xs font-bold">✓ Pronto</span> : <span className="text-yellow-500 text-xs font-bold animate-pulse">Analisi...</span>}
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === file.id ? null : file.id); }} className="w-8 h-8 rounded-full hover:bg-[#2D2E30] flex items-center justify-center text-gray-500 hover:text-white">⋮</button>
                      {activeMenu === file.id && (
                        <div className="absolute right-0 mt-2 w-32 bg-[#252628] border border-[#3C4043] rounded-xl shadow-xl z-10 overflow-hidden">
                          <button onClick={() => removeFile(file.id)} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-[#2D2E30] font-medium">🗑️ Elimina</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* --- VISTA VOTI --- */}
        {activeTab === 'results' && (
          <div className="space-y-4">
            {results.length === 0 ? (
              <div className="text-center py-10 text-gray-500 italic">Non hai ancora completato nessun quiz.</div>
            ) : (
              results.map((res) => (
                <div key={res.id} className="bg-[#1E1F20] border border-[#2D2E30] p-6 rounded-2xl flex items-center justify-between hover:border-[#3C4043] transition">
                  <div className="flex items-center gap-5">
                    <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold border-2 ${res.accuracy >= 80 ? 'bg-green-500/10 border-green-500 text-green-400' : res.accuracy >= 60 ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400' : 'bg-red-500/10 border-red-500 text-red-400'}`}>
                      <span className="text-xl">{res.accuracy}%</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{res.subject}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="px-2 py-0.5 rounded-md bg-[#2D2E30] border border-[#3C4043]">{res.difficulty}</span>
                        <span>• {res.date}</span>
                        <span>• {res.score} XP</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Risposte</div>
                    <div className="font-bold text-white">{res.correctAnswers} <span className="text-gray-600">/ {res.totalQuestions}</span></div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </main>
      <style>{`@keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in-up { animation: fade-in-up 0.5s ease-out; }`}</style>
    </div>
  );
}