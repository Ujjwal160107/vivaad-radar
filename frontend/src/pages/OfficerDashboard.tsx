import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { DashboardOverview, ParcelMapResponse, SearchResultParcel, StatusBand, VillageDensity } from '../types/api';
import { AppFooter } from '../components/AppFooter';
import { ParcelMap } from '../components/ParcelMap';

interface OfficerDashboardProps {
  onBack: () => void;
  onOpenWatchlist: () => void;
  onOpenParcel: (parcelId: string) => Promise<void>;
}

function statusRank(status: StatusBand | null): number {
  if (status === 'RED') return 0;
  if (status === 'AMBER') return 1;
  return 2;
}

export const OfficerDashboard: React.FC<OfficerDashboardProps> = ({
  onBack,
  onOpenWatchlist,
  onOpenParcel,
}) => {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [villages, setVillages] = useState<VillageDensity[]>([]);
  const [mapData, setMapData] = useState<ParcelMapResponse>({ type: 'FeatureCollection', features: [] });
  const [selected, setSelected] = useState<VillageDensity | null>(null);
  const [holdings, setHoldings] = useState<SearchResultParcel[]>([]);
  const [loadingDistrict, setLoadingDistrict] = useState(true);
  const [loadingHoldings, setLoadingHoldings] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [over, heat, map] = await Promise.all([api.getOverview(), api.getHeatmap(), api.getMap()]);
        if (cancelled) return;
        setOverview(over);
        setVillages(heat.villages || []);
        setMapData(map);
      } catch {
        if (!cancelled) setError('Could not load the district ledger.');
      } finally {
        if (!cancelled) setLoadingDistrict(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectVillage = async (row: VillageDensity) => {
    setSelected(row);
    setLoadingHoldings(true);
    setError(null);
    try {
      let res = await api.searchParcels('', row.village_canon);
      if (!res.parcels?.length) {
        res = await api.searchParcels('', row.village);
      }
      const sorted = [...(res.parcels || [])].sort((a, b) => {
        const rank = statusRank(a.status) - statusRank(b.status);
        if (rank !== 0) return rank;
        return (b.confidence ?? 0) - (a.confidence ?? 0);
      });
      setHoldings(sorted);
    } catch {
      setHoldings([]);
      setError('Could not load holdings for this village.');
    } finally {
      setLoadingHoldings(false);
    }
  };

  const handleOpen = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await onOpenParcel(id);
    } catch {
      setError('Could not open that parcel.');
      setBusyId(null);
    }
  };

  const counts = overview?.status_counts;

  return (
    <div className="w-full px-8 sm:px-16 md:px-20 pb-16 max-w-7xl mx-auto">
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
          Where is land in court?
        </h1>
      </div>

      <div className="border-2 border-black bg-white mb-8 font-mono text-xs sm:text-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 divide-y sm:divide-y-0 sm:divide-x divide-black">
          <Stat label="District" value={overview?.district || 'Sultanpur'} />
          <Stat label="Parcels" value={overview?.parcels ?? '—'} />
          <Stat label="Cases" value={overview?.cases ?? '—'} />
          <Stat label="RED" value={counts?.RED ?? '—'} tone="red" />
          <Stat label="AMBER" value={counts?.AMBER ?? '—'} tone="amber" />
          <Stat label="GREEN" value={counts?.GREEN ?? '—'} tone="green" />
          <Stat label="Active suits" value={overview?.active_cases ?? '—'} />
          <Stat label="HIGH links" value={overview?.high_confidence_links ?? '—'} />
        </div>
      </div>

      {error ? (
        <div className="border-2 border-radar-red bg-[#FDE8E8] p-4 font-mono text-sm text-black mb-6">
          {error}
        </div>
      ) : null}

      <div className="border-2 border-black bg-white mb-8 overflow-hidden">
        <div className="p-4 sm:p-5 border-b-2 border-black flex items-baseline justify-between gap-4">
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider">
            Sultanpur litigation heatmap
          </h2>
          <span className="font-mono text-[10px] sm:text-xs text-ink-muted">
            density = (2·RED + AMBER) / (2·parcels)
          </span>
        </div>
        {loadingDistrict ? (
          <div className="p-8 font-mono text-sm text-ink-muted">Plotting holdings…</div>
        ) : (
          <ParcelMap
            collection={mapData}
            villages={villages}
            selectedCanon={selected?.village_canon || null}
            onSelectVillage={(canon) => {
              const row = villages.find((v) => v.village_canon === canon);
              if (row) void handleSelectVillage(row);
            }}
            onOpenParcel={(id) => void handleOpen(id)}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-2 border-black bg-white">
        <div className="lg:col-span-7 lg:border-r-2 border-black">
          <div className="p-5 sm:p-6 border-b-2 border-black flex items-baseline justify-between gap-4">
            <h2 className="font-mono text-sm font-bold uppercase tracking-wider">
              Village density cause list
            </h2>
            <span className="font-mono text-[10px] sm:text-xs text-ink-muted">
              density = (2·RED + AMBER) / (2·parcels)
            </span>
          </div>

          {loadingDistrict ? (
            <div className="p-8 font-mono text-sm text-ink-muted">Reading the district ledger…</div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              {villages.map((v, idx) => {
                const isOn = selected?.village_canon === v.village_canon;
                const total = v.parcels || 1;
                return (
                  <button
                    key={v.village_canon}
                    type="button"
                    onClick={() => handleSelectVillage(v)}
                    className={`w-full text-left p-4 sm:p-5 font-mono text-xs sm:text-sm cursor-pointer ${
                      idx < villages.length - 1 ? 'border-b-2 border-black' : ''
                    } ${isOn ? 'bg-black text-white' : 'bg-white hover:bg-paper-light text-black'}`}
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-2">
                      <span className="font-bold truncate">{v.village}</span>
                      <span className={isOn ? 'text-white/80' : 'text-ink-muted'}>
                        {v.parcels} holdings · {Math.round(v.density * 100)}%
                      </span>
                    </div>
                    <div className={`h-3 w-full border ${isOn ? 'border-white' : 'border-black'} flex`}>
                      <div className="bg-radar-red h-full" style={{ width: `${(v.RED / total) * 100}%` }} />
                      <div className="bg-radar-amber h-full" style={{ width: `${(v.AMBER / total) * 100}%` }} />
                      <div className="bg-radar-green h-full" style={{ width: `${(v.GREEN / total) * 100}%` }} />
                    </div>
                    <div className={`mt-2 flex gap-4 ${isOn ? 'text-white/80' : 'text-ink-muted'}`}>
                      <span>R {v.RED}</span>
                      <span>A {v.AMBER}</span>
                      <span>G {v.GREEN}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          <div className="p-5 sm:p-6 border-b-2 border-black lg:border-b-2">
            <h2 className="font-mono text-sm font-bold uppercase tracking-wider">
              {selected ? `Holdings · ${selected.village}` : 'Select a village'}
            </h2>
            <p className="font-mono text-xs text-ink-muted mt-2">
              GREEN means no matching active litigation was found in available records — not that the land is legally safe.
            </p>
          </div>
          {!selected ? (
            <div className="p-8 font-mono text-sm text-ink-muted">
              Hottest villages sit at the top of the cause list. Open one to inspect each gata.
            </div>
          ) : loadingHoldings ? (
            <div className="p-8 font-mono text-sm text-ink-muted">Pulling holdings…</div>
          ) : holdings.length === 0 ? (
            <div className="p-8 font-mono text-sm text-ink-muted">No parcels indexed for this village.</div>
          ) : (
            holdings.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleOpen(p.id)}
                disabled={Boolean(busyId)}
                className={`w-full text-left p-4 font-mono text-xs sm:text-sm flex items-center justify-between gap-3 hover:bg-paper-light cursor-pointer disabled:cursor-wait ${
                  idx < holdings.length - 1 ? 'border-b border-black/20' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      p.status === 'RED' ? 'bg-radar-red' : p.status === 'AMBER' ? 'bg-radar-amber' : 'bg-radar-green'
                    }`}
                  />
                  <span className="font-bold truncate">Survey {p.survey_no}</span>
                </div>
                <span className="flex-shrink-0 uppercase font-bold">
                  {busyId === p.id ? 'Opening…' : p.status || 'GREEN'}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <AppFooter onOpenDashboard={() => undefined} onOpenWatchlist={onOpenWatchlist} active="dashboard" />
    </div>
  );
};

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: 'red' | 'amber' | 'green';
}) {
  const color =
    tone === 'red' ? 'text-radar-red' : tone === 'amber' ? 'text-radar-amber' : tone === 'green' ? 'text-radar-green' : 'text-black';
  return (
    <div className="p-3 sm:p-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-muted">{label}</div>
      <div className={`font-bold text-sm sm:text-base mt-1 ${color}`}>{value}</div>
    </div>
  );
}
