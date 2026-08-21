import React, { useState } from 'react';
import { SearchResultParcel, StatusBand } from '../types/api';

interface ParcelPickerProps {
  query: { surveyNo: string; village: string };
  parcels: SearchResultParcel[];
  onPick: (parcelId: string) => Promise<void>;
  onBack: () => void;
}

function statusDot(status: StatusBand | null): string {
  if (status === 'RED') return 'bg-radar-red';
  if (status === 'AMBER') return 'bg-radar-amber';
  return 'bg-radar-green';
}

function statusLabel(status: StatusBand | null): string {
  if (status === 'RED') return 'RED';
  if (status === 'AMBER') return 'AMBER';
  return 'GREEN';
}

export const ParcelPicker: React.FC<ParcelPickerProps> = ({ query, parcels, onPick, onBack }) => {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePick = async (id: string) => {
    if (busyId) return;
    setError(null);
    setBusyId(id);
    try {
      await onPick(id);
    } catch {
      setError('Could not open that parcel from the index. Pick another, or go back.');
      setBusyId(null);
    }
  };

  return (
    <div className="w-full px-8 sm:px-16 md:px-20 pb-24 max-w-6xl mx-auto">
      <div className="flex items-center gap-6 pt-10 pb-10">
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
          {parcels.length} parcels match this search
        </h1>
      </div>

      <p className="font-mono text-sm text-ink-muted mb-6">
        Query: {query.surveyNo || 'any survey'} · {query.village || 'any village'}. Pick one holding to open the dossier.
      </p>

      {error ? (
        <div className="border-2 border-radar-red bg-[#FDE8E8] p-4 font-mono text-sm text-black mb-6">
          {error}
        </div>
      ) : null}

      <div className="border-2 border-black bg-white">
        {parcels.map((p, idx) => (
          <button
            key={p.id}
            type="button"
            onClick={() => handlePick(p.id)}
            disabled={Boolean(busyId)}
            className={`w-full text-left p-5 sm:p-6 font-mono text-sm flex flex-wrap items-center justify-between gap-4 hover:bg-paper-light transition-colors cursor-pointer disabled:cursor-wait ${
              idx < parcels.length - 1 ? 'border-b-2 border-black' : ''
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${statusDot(p.status)}`} />
              <div>
                <div className="text-black font-bold">
                  Survey {p.survey_no} · {p.village}
                </div>
                <div className="text-ink-muted text-xs mt-1">
                  {p.taluk ? `${p.taluk} · ` : ''}{p.id}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6 flex-shrink-0">
              <span className="uppercase font-bold tracking-wider">{statusLabel(p.status)}</span>
              <span className="text-ink-muted">
                {p.confidence != null ? `${Math.round(p.confidence * 100)}%` : '—'}
              </span>
              <span className="font-bold">
                {busyId === p.id ? 'Opening…' : 'Open →'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
