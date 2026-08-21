import React, { useState } from 'react';

interface SearchProps {
  onSearch: (surveyNo: string, village: string) => void;
  onOpenDashboard?: () => void;
  onOpenWatchlist?: () => void;
}

export const Search: React.FC<SearchProps> = ({ onSearch, onOpenDashboard, onOpenWatchlist }) => {
  const [surveyNo, setSurveyNo] = useState('');
  const [village, setVillage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!surveyNo.trim() && !village.trim()) {
      onSearch('1365/1', 'Madanpur Paniyar');
      return;
    }
    onSearch(surveyNo.trim(), village.trim());
  };

  const handleQuickPick = (quickSurvey: string, quickVillage: string) => {
    setSurveyNo(quickSurvey);
    setVillage(quickVillage);
    onSearch(quickSurvey, quickVillage);
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col justify-between px-12 sm:px-20 pb-10">
      {/* Centered Main Stage */}
      <div className="w-full flex-1 flex flex-col justify-center items-start max-w-6xl mx-auto my-auto">
        {/* Main Headline */}
        <h1 className="font-serif italic font-bold text-4xl sm:text-5xl md:text-6xl text-black tracking-tight mb-8 select-none">
          Is this land in court?
        </h1>

        {/* 70% Width 2px Solid Crisp Search Bar */}
        <form onSubmit={handleSubmit} className="w-full sm:w-[70vw] max-w-5xl">
          <div className="flex flex-col sm:flex-row items-stretch border-2 border-black bg-white shadow-none w-full">
            {/* Survey / Gata Input */}
            <input
              type="text"
              value={surveyNo}
              onChange={(e) => setSurveyNo(e.target.value)}
              placeholder="Survey / Gata Number..."
              className="font-mono text-base px-6 py-4 flex-1 bg-white placeholder:text-ink-subtle text-black border-b-2 sm:border-b-0 sm:border-r-2 border-black rounded-none focus:bg-[#FFFDF9]"
            />

            {/* Village Input */}
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder="Village..."
              className="font-mono text-base px-6 py-4 w-full sm:w-72 md:w-80 bg-white placeholder:text-ink-subtle text-black border-b-2 sm:border-b-0 sm:border-r-2 border-black rounded-none focus:bg-[#FFFDF9]"
            />

            {/* Sharp Pointy Arrow Button */}
            <button
              type="submit"
              title="Search litigation records"
              className="bg-black hover:bg-neutral-800 active:bg-neutral-950 text-white px-8 py-4 flex items-center justify-center transition-colors cursor-pointer rounded-none select-none group min-w-[76px]"
            >
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="square"
                strokeLinejoin="miter"
                className="transform group-hover:translate-x-1.5 transition-transform"
              >
                <line x1="4" y1="12" x2="20" y2="12" />
                <polyline points="14 6 20 12 14 18" />
              </svg>
            </button>
          </div>
        </form>

        {/* Curated Demo Shortcuts in a single line without wrapping */}
        <div className="mt-8 flex flex-nowrap items-center gap-3 text-xs font-mono text-ink-muted w-full sm:w-[70vw] max-w-5xl overflow-x-auto whitespace-nowrap py-1">
          <span className="uppercase text-ink-subtle tracking-wider flex-shrink-0">Demo quick-select:</span>
          
          <button
            type="button"
            onClick={() => handleQuickPick('1365/1', 'Madanpur Paniyar')}
            className="border border-black/40 hover:border-black bg-paper-light hover:bg-white px-3 py-1.5 text-black transition-colors flex items-center gap-2 flex-shrink-0"
          >
            <span className="w-2 h-2 rounded-full bg-radar-red"></span>
            <span>1365/1 (Madanpur Paniyar)</span>
            <span className="text-[10px] text-ink-muted uppercase font-semibold">[Flagship RED]</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickPick('88', 'Baraunsa')}
            className="border border-black/40 hover:border-black bg-paper-light hover:bg-white px-3 py-1.5 text-black transition-colors flex items-center gap-2 flex-shrink-0"
          >
            <span className="w-2 h-2 rounded-full bg-radar-green"></span>
            <span>88 (Baraunsa)</span>
            <span className="text-[10px] text-ink-muted uppercase font-semibold">[Clean GREEN]</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickPick('142/3', 'Kurwar')}
            className="border border-black/40 hover:border-black bg-paper-light hover:bg-white px-3 py-1.5 text-black transition-colors flex items-center gap-2 flex-shrink-0"
          >
            <span className="w-2 h-2 rounded-full bg-radar-amber"></span>
            <span>142/3 (Kurwar)</span>
            <span className="text-[10px] text-ink-muted uppercase font-semibold">[Decoy AMBER]</span>
          </button>
        </div>
      </div>

      {/* Footer Navigation Bar */}
      <footer className="w-full flex flex-wrap items-center justify-between border-t border-black/20 pt-6 mt-12 text-xs font-mono text-ink-muted max-w-6xl mx-auto">
        <div className="flex items-center gap-6">
          <span>Section 52 TPA Lis Pendens Resolver</span>
          <span className="hidden md:inline text-black/30">•</span>
          <span className="hidden md:inline">eCourts × Bhoomi Cadastral Linkage</span>
        </div>

        <div className="flex items-center gap-6 mt-3 sm:mt-0">
          {onOpenDashboard && (
            <button
              onClick={onOpenDashboard}
              className="hover:text-black underline underline-offset-4 cursor-pointer"
            >
              Officer Heatmap
            </button>
          )}
          {onOpenWatchlist && (
            <button
              onClick={onOpenWatchlist}
              className="hover:text-black underline underline-offset-4 cursor-pointer"
            >
              Watchlist
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
