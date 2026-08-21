import React from 'react';

interface AppFooterProps {
  onOpenDashboard?: () => void;
  onOpenWatchlist?: () => void;
  active?: 'search' | 'dashboard' | 'watchlist';
}

export const AppFooter: React.FC<AppFooterProps> = ({
  onOpenDashboard,
  onOpenWatchlist,
  active,
}) => {
  const link = (key: 'dashboard' | 'watchlist', label: string, onClick?: () => void) => {
    if (!onClick) return null;
    const isActive = active === key;
    return (
      <button
        onClick={onClick}
        className={`underline underline-offset-4 cursor-pointer ${
          isActive ? 'text-black font-semibold' : 'hover:text-black'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <footer className="w-full flex flex-wrap items-center justify-between border-t border-black/20 pt-6 mt-12 text-xs font-mono text-ink-muted max-w-6xl mx-auto">
      <div className="flex items-center gap-6">
        <span>Section 52 TPA Lis Pendens Resolver</span>
        <span className="hidden md:inline text-black/30">•</span>
        <span className="hidden md:inline">eCourts × Bhoomi Cadastral Linkage</span>
      </div>
      <div className="flex items-center gap-6 mt-3 sm:mt-0">
        {link('dashboard', 'Officer Heatmap', onOpenDashboard)}
        {link('watchlist', 'Watchlist', onOpenWatchlist)}
      </div>
    </footer>
  );
};
