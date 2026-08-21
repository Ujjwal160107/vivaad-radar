import React from 'react';
import { CaseDetail } from '../types/api';

interface CaseDetailModalProps {
  caseData: CaseDetail | null;
  onClose: () => void;
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({ caseData, onClose }) => {
  if (!caseData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-none">
      <div className="bg-white border-2 border-black max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 relative">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-6">
          <div>
            <div className="font-mono text-xs text-ink-muted uppercase tracking-wider mb-1">
              Court Case Dossier · CNR: {caseData.id}
            </div>
            <h2 className="font-serif italic font-bold text-2xl sm:text-3xl text-black">
              {caseData.case_no}
            </h2>
            <div className="font-mono text-xs text-black mt-1">
              {caseData.court} · {caseData.case_type}
            </div>
          </div>

          <button
            onClick={onClose}
            className="font-mono text-sm border-2 border-black px-3 py-1 bg-white hover:bg-black hover:text-white transition-colors cursor-pointer"
          >
            ✕ Close
          </button>
        </div>

        {/* Case Status & Dates Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs mb-6">
          <div className="border border-black p-3 bg-paper-light">
            <span className="text-ink-muted uppercase block text-[10px]">Status</span>
            <span className="font-bold text-sm text-radar-red uppercase">{caseData.status}</span>
          </div>
          <div className="border border-black p-3 bg-paper-light">
            <span className="text-ink-muted uppercase block text-[10px]">Filing Date</span>
            <span className="font-bold text-sm text-black">{caseData.filing_date || 'N/A'}</span>
          </div>
          <div className="border border-black p-3 bg-paper-light">
            <span className="text-ink-muted uppercase block text-[10px]">Latest Order</span>
            <span className="font-bold text-sm text-black">{caseData.order_date || 'N/A'}</span>
          </div>
          <div className="border border-black p-3 bg-paper-light">
            <span className="text-ink-muted uppercase block text-[10px]">Next Hearing</span>
            <span className="font-bold text-sm text-black">{caseData.next_hearing_date || 'N/A'}</span>
            {caseData.next_hearing_source === 'derived' && (
              <span className="text-[9px] text-radar-amber block font-normal mt-0.5">[Estimated from order]</span>
            )}
          </div>
        </div>

        {/* Parties Involved */}
        <div className="border-2 border-black p-4 mb-6 bg-white">
          <h3 className="font-mono text-xs uppercase font-bold text-black border-b border-black pb-2 mb-3">
            Case Parties
          </h3>
          <div className="space-y-2 font-mono text-xs">
            {caseData.parties && caseData.parties.length > 0 ? (
              caseData.parties.map((p, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                  <span className="uppercase text-ink-muted font-semibold w-24 flex-shrink-0">
                    {p.role}:
                  </span>
                  <span className="text-black font-medium">{p.name_as_written}</span>
                </div>
              ))
            ) : (
              <span className="text-ink-muted">No party names extracted</span>
            )}
          </div>
        </div>

        {/* Chronological Court Events */}
        <div className="border-2 border-black p-4 mb-6 bg-white">
          <h3 className="font-mono text-xs uppercase font-bold text-black border-b border-black pb-2 mb-3">
            Order & Event History
          </h3>
          <div className="space-y-3 font-mono text-xs">
            {caseData.events && caseData.events.length > 0 ? (
              caseData.events.map((e, idx) => (
                <div key={idx} className="flex items-start gap-3 border-l-2 border-black pl-3 py-1">
                  <span className="font-semibold text-black flex-shrink-0">{e.date}</span>
                  <span className="uppercase text-[10px] bg-black text-white px-1.5 py-0.2 flex-shrink-0">
                    {e.event_type}
                  </span>
                  <span className="text-ink-muted flex-1">{e.note || 'Court event recorded'}</span>
                </div>
              ))
            ) : (
              <span className="text-ink-muted">No event logs available</span>
            )}
          </div>
        </div>

        {/* Provenance Footer */}
        <div className="border-t border-black/20 pt-4 flex items-center justify-between text-xs font-mono text-ink-muted">
          <span>Source: Allahabad High Court Judgments Corpus ({caseData.source_label})</span>
          <button
            onClick={onClose}
            className="bg-black text-white px-4 py-2 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
