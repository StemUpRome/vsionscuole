/**
 * LiveModeToggle Component
 * Toggle button for enabling/disabling live vision mode
 */


export interface LiveModeToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
}

export function LiveModeToggle({
  enabled,
  onToggle,
  className = '',
}: LiveModeToggleProps) {
  return (
    <button
      onClick={() => onToggle(!enabled)}
      className={`
        relative px-4 py-2 rounded-lg font-semibold text-sm
        transition-all duration-300
        ${enabled
          ? 'bg-[#6366F1] text-white shadow-lg shadow-[#6366F1]/50'
          : 'bg-[#2a2a3a] text-gray-400 hover:bg-[#3a3a4a]'
        }
        ${className}
      `}
      title={enabled ? 'Disattiva Live Vision' : 'Attiva Live Vision'}
    >
      <div className="flex items-center gap-2">
        <div className={`
          w-2 h-2 rounded-full transition-all
          ${enabled ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}
        `} />
        <span className="uppercase tracking-wide">
          {enabled ? 'Live ON' : 'Live OFF'}
        </span>
      </div>
      {enabled && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shine" />
      )}
    </button>
  );
}

