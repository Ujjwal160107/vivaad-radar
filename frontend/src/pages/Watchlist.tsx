import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { WatchlistItem } from '../types/api';
import { AppFooter } from '../components/AppFooter';

interface WatchlistProps {
  onBack: () => void;
  onOpenDashboard: () => void;
  onOpenParcel: (parcelId: string) => Promise<void>;
}

export const Watchlist: React.FC<WatchlistProps> = ({ onBack, onOpenDashboard, onOpenParcel }) => {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getWatchlist();
        if (cancelled) return;
        const rows = [...(res.items || [])].sort((a, b) => Number(b.has_update) - Number(a.has_update));
        setItems(rows);
      } catch {
        if (!cancelled) setError('Could not load the watchlist.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpen = async (parcelId: string) => {
    if (busyId) return;
    setBusyId(parcelId);
    try {
      await onOpenParcel(parcelId);
    } catch {
      setError('Could not open that parcel.');
      setBusyId(null);
    }
  };

  return (
    <div className="w-full px-8 sm:px-16 md:px-20 pb-16 max-w-6xl mx-auto">
      <div className="flex items-center gap-6 pt-10 pb-8">
        <button
          onClick={onBack}
          title="Return to search"
          className="bg-black hover:bg-neutral-800 text-white w-14 h-14 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="square" strokeLinejoin="miter">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="font-serif italic font-bold text-3xl sm:text-4xl md:text-5xl text-black tracking-tight select-none">
          Watchlist
        </h1>
      </div>

      <p className="font-mono text-sm text-ink-muted mb-6 max-w-3xl">
        Subscriptions are stored against this demo officer. The update stamp is a scripted flag — not a live court notification.
      </p>

      {error ? (
        <div className="border-2 border-radar-red bg-[#FDE8E8] p-4 font-mono text-sm text-black mb-6">
          {error}
        </div>
      ) : null}

      <div className="border-2 border-black bg-white">
        {loading ? (
          <div className="p-8 font-mono text-sm text-ink-muted">Reading subscriptions…</div>
        ) : items.length === 0 ? (
          <div className="p-8 font-mono text-sm text-ink-muted space-y-2">
            <p>No parcels on the watchlist yet.</p>
            <p>Open a result and use <span className="text-black font-bold">Monitor this Parcel</span>.</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleOpen(item.parcel_id)}
              disabled={Boolean(busyId)}
              className={`w-full text-left p-5 sm:p-6 font-mono text-sm flex flex-wrap items-center justify-between gap-4 hover:bg-paper-light cursor-pointer disabled:cursor-wait ${
                idx < items.length - 1 ? 'border-b-2 border-black' : ''
              }`}
            >
              <div>
                <div className="text-black font-bold">
                  Survey {item.survey_no} · {item.village}
                </div>
                <div className="text-ink-muted text-xs mt-1">
                  Subscribed {item.subscribed_at} · {item.parcel_id}
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                {item.has_update ? (
                  <span className="border-2 border-black bg-[#FEF3C7] text-black px-2 py-1 text-[10px] uppercase font-bold tracking-wider">
                    Order update
                  </span>
                ) : (
                  <span className="text-ink-muted text-xs uppercase">Quiet</span>
                )}
                <span className="font-bold">{busyId === item.parcel_id ? 'Opening…' : 'Open →'}</span>
              </div>
            </button>
          ))
        )}
      </div>

      <AppFooter onOpenDashboard={onOpenDashboard} onOpenWatchlist={() => undefined} active="watchlist" />
    </div>
  );
};
