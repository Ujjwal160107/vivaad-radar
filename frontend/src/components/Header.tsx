import React from 'react';

interface HeaderProps {
  onHomeClick?: () => void;
  activeDistrict?: string;
  isDemo?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onHomeClick, activeDistrict = 'Sultanpur (UP)', isDemo = false }) => {
  return (
    <header className="w-full px-12 sm:px-20 pt-10 pb-4 flex items-center justify-between z-20 max-w-7xl mx-auto">
      <div 
        onClick={onHomeClick} 
        className="cursor-pointer group flex items-baseline gap-3 select-none"
      >
        <span className="font-serif text-2xl tracking-normal text-black font-normal">
          vivaad radar
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs font-mono">
        <div className="hidden sm:flex items-center gap-2 border border-black/40 px-2.5 py-1 bg-paper-light">
          <span className="inline-block w-2 h-2 rounded-full bg-radar-green"></span>
          <span className="text-ink-muted uppercase">District:</span>
          <span className="font-medium text-black">{activeDistrict}</span>
        </div>

        {isDemo && (
          <span className="border border-radar-amber text-radar-amber bg-radar-amber/10 px-2 py-0.5 uppercase tracking-wider font-semibold">
            Tier-3 Offline
          </span>
        )}
      </div>
    </header>
  );
};
