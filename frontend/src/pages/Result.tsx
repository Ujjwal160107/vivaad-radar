import React, { useState } from 'react';
import { ParcelDetail, LitigationResponse, CaseDetail } from '../types/api';
import { api } from '../api/client';
import { CaseDetailModal } from '../components/CaseDetailModal';
import {
  NOT_FOUND_CONFIDENCE,
  buildTimeline,
  partyCaption,
  pct,
  surveyMatchLabel,
  TimelineCard,
} from './resultModel';

interface ResultProps {
  parcel: ParcelDetail | null;
  litigation: LitigationResponse | null;
  caseDetail: CaseDetail | null;
  notFound: boolean;
  searchQuery: { surveyNo: string; village: string };
  onBack: () => void;
}

function TimelineGrid({ cards, columns }: { cards: TimelineCard[]; columns: string }) {
  if (!cards.length) return null;
  return (
    <div className={`grid grid-cols-1 ${columns} gap-6 relative z-10`}>
      {cards.map((card) => {
        const saleHit = card.kind === 'sale' && card.insideSuit;
        const hearing = card.kind === 'hearing';
        const clean = card.kind === 'clean';
        return (
          <div
            key={`${card.date}-${card.title}`}
            className={`border-2 p-4 shadow-none ${
              saleHit
                ? 'bg-[#FDE8E8] border-radar-red'
                : clean
                  ? 'bg-[#DCFCE7] border-radar-green'
                  : 'bg-white border-black'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full mb-3 -mt-6 border-2 border-white ${
                saleHit ? 'bg-radar-red animate-ping' : clean ? 'bg-radar-green' : 'bg-black'
              }`}
            />
            <span
              className={`text-xs uppercase block font-semibold ${
                saleHit ? 'text-radar-red font-bold' : hearing ? 'text-ink-muted' : 'text-ink-muted'
              }`}
            >
              {card.date}
              {saleHit ? ' (INSIDE SUIT)' : ''}
            </span>
            <span className="font-bold text-black block text-sm mt-0.5">{card.title}</span>
            <span className={`text-xs block mt-1 ${saleHit ? 'text-radar-red font-medium' : 'text-ink-muted'}`}>
              {saleHit ? `⚠️ ${card.detail}` : card.detail}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export const Result: React.FC<ResultProps> = ({
  parcel,
  litigation,
  caseDetail,
  notFound,
  searchQuery,
  onBack,
}) => {
  const [selectedCase, setSelectedCase] = useState<CaseDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [watchlistSubscribed, setWatchlistSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const displaySurvey = parcel?.survey_no || searchQuery.surveyNo || '—';
  const displayVillage = parcel?.village || searchQuery.village || 'Sultanpur';
  const status = notFound ? 'GREEN' : (litigation?.status || parcel?.status || 'GREEN');
  const linkedCases = litigation?.links || [];
  const primaryLink = linkedCases[0];
  const confidencePercent = Math.round(
    (litigation?.confidence ?? (notFound ? NOT_FOUND_CONFIDENCE : 0)) * 100,
  );
  const caption = partyCaption(caseDetail?.parties);
  const why =
    notFound
      ? 'This survey number does not appear in the Sultanpur court-linked parcel index, and no order in the Allahabad High Court land-matter corpus cites it. No candidate litigation link was generated.'
      : (litigation?.note || primaryLink?.reason || 'No matching active litigation found in available records.');
  const evidence = primaryLink?.evidence;
  const weights = evidence?.weights_used || {};
  const courtSurvey = evidence?.survey_match && evidence.survey_match !== 'none'
    ? (parcel?.survey_no || displaySurvey).replace(/-/g, '/')
    : 'No identifier cited';
  const timeline = notFound
    ? ([
        {
          date: new Date().toISOString().slice(0, 10),
          title: 'Index sweep complete',
          detail: `Survey ${displaySurvey} · ${displayVillage} — 0 hits in 38 Sultanpur cases`,
          kind: 'clean' as const,
        },
        {
          date: 'Current',
          title: 'No dispute on indexed record',
          detail: 'Parcel is not referenced in pending or disposed land matters in this corpus',
          kind: 'clean' as const,
        },
      ])
    : buildTimeline(primaryLink, parcel, caseDetail);

  const handleOpenCaseModal = async (caseId?: string) => {
    const id = caseId || primaryLink?.case_id;
    if (!id) return;
    try {
      const detail = caseDetail && caseDetail.id === id ? caseDetail : await api.getCase(id);
      setSelectedCase(detail);
      setIsModalOpen(true);
    } catch (err) {
      console.error('Failed to load case detail', err);
    }
  };

  const handleWatchlist = async () => {
    if (!parcel?.id) return;
    setIsSubscribing(true);
    try {
      await api.subscribeWatchlist(parcel.id);
      setWatchlistSubscribed(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubscribing(false);
    }
  };

  const statusTitle = notFound
    ? 'Parcel not found in court records'
    : status === 'RED'
      ? 'Possible active litigation'
      : status === 'AMBER'
        ? 'Possible litigation connection'
        : 'No matching active litigation';

  const statusBlurb = notFound
    ? 'No indexed High Court order names this survey number. Evidence suggests the parcel is not currently in a land dispute in this corpus.'
    : status === 'RED'
      ? 'Strong evidence links this parcel to an active court case.'
      : status === 'AMBER'
        ? 'Candidate matches found in court records; verification recommended.'
        : 'No matching active litigation found in available records.';

  const colClass =
    timeline.length >= 4 ? 'sm:grid-cols-4' : timeline.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';

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
          Survey No. {displaySurvey} • {displayVillage}
        </h1>
      </div>

      <div className="border-2 border-black bg-white shadow-none w-full mb-12">
        <div className="grid grid-cols-1 md:grid-cols-12 border-b-2 border-black">
          <div className="md:col-span-4 flex flex-col md:border-r-2 border-black">
            <div className={`p-6 sm:p-7 border-b-2 border-black flex-1 ${
              status === 'RED' ? 'bg-[#FDE8E8]' : status === 'AMBER' ? 'bg-[#FEF3C7]' : 'bg-[#DCFCE7]'
            }`}>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="font-mono text-base font-bold text-black tracking-tight">{statusTitle}</span>
                <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${
                  status === 'RED' ? 'bg-[#DC2626]' : status === 'AMBER' ? 'bg-[#D97706]' : 'bg-[#16A34A]'
                }`} />
              </div>
              <p className="font-mono text-sm text-black leading-relaxed">{statusBlurb}</p>
            </div>
            <div className="p-6 sm:p-7 bg-white font-mono text-sm sm:text-base space-y-2.5">
              <div>
                <span className="text-black">Confidence rate </span>
                <span className="font-bold text-black ml-2">{confidencePercent}%</span>
              </div>
              <div>
                <span className="text-black">Linked cases found </span>
                <span className="font-bold text-black ml-2">{linkedCases.length}</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-8 p-6 sm:p-8 bg-white flex flex-col justify-between">
            <div>
              <h3 className="font-mono text-sm sm:text-base font-bold uppercase tracking-wider text-black mb-3">
                WHY THIS RESULT?
              </h3>
              <p className="font-mono text-sm sm:text-base text-black leading-relaxed mb-8">{why}</p>
            </div>
            <div className="grid grid-cols-2 gap-8 font-mono text-sm sm:text-base">
              <div>
                <span className="font-bold text-black block mb-2">Your search</span>
                <div className="text-black">{displaySurvey}</div>
                <div className="text-black">{displayVillage}</div>
              </div>
              <div>
                <span className="font-bold text-black block mb-2">Court documents</span>
                {primaryLink ? (
                  <>
                    <div className="text-black">{primaryLink.case_no}</div>
                    <div className="text-black">{primaryLink.court}</div>
                  </>
                ) : (
                  <>
                    <div className="text-black">No records linked</div>
                    <div className="text-black">No disputes on file</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch justify-between bg-white">
          <div className="p-6 sm:p-7 flex-1 font-mono text-sm sm:text-base text-black flex items-center">
            {primaryLink ? (
              <p className="leading-relaxed">
                <span className="font-bold">{primaryLink.case_no}</span>
                {caption ? <span className="ml-3">{caption}</span> : null}
              </p>
            ) : (
              <p className="text-ink-muted">
                {notFound
                  ? 'Clean record: this survey number is not referenced in indexed High Court land matters.'
                  : 'Clean record: no pending civil suits or High Court orders reference this parcel.'}
              </p>
            )}
          </div>
          {primaryLink ? (
            <button
              onClick={() => handleOpenCaseModal(primaryLink.case_id)}
              className="bg-black hover:bg-neutral-800 active:bg-neutral-950 text-white px-8 py-6 font-mono text-sm sm:text-base font-bold flex items-center justify-center gap-3 transition-colors cursor-pointer rounded-none select-none flex-shrink-0"
            >
              <span>Full details</span>
            </button>
          ) : (
            <div className="bg-paper-light border-l-2 border-black px-8 py-6 font-mono text-sm text-radar-green font-bold flex items-center justify-center flex-shrink-0">
              ✓ Clear Status
            </div>
          )}
        </div>
      </div>

      <div className="border-2 border-black bg-white shadow-none w-full">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div className="flex items-center gap-3">
              <h3 className="font-mono text-sm sm:text-base uppercase font-bold text-black tracking-wider">
                SECTION 52 TPA LIS PENDENS TIMELINE
              </h3>
              <span className="bg-black text-white text-xs font-mono uppercase px-2.5 py-1 font-bold">
                {status === 'RED' ? 'CRITICAL INVESTIGATION TIMELINE' : 'CHAIN OF CUSTODY TIMELINE'}
              </span>
            </div>
          </div>
        </div>
        <div className="w-full border-b-2 border-black" />
        <div className="p-6 sm:p-8 bg-white">
          <div className="relative pt-4 pb-2 font-mono text-xs sm:text-sm">
            <div className="h-0.5 bg-black w-full absolute top-8 left-0 z-0" />
            <TimelineGrid cards={timeline} columns={colClass} />
          </div>
        </div>

        <div className="w-full border-b-2 border-black" />
        <div className="p-6 sm:p-8">
          <h3 className="font-mono text-sm sm:text-base uppercase font-bold text-black tracking-wider mb-5">
            EVIDENCE LINKAGE BREAKDOWN
          </h3>
          <div className="border-2 border-black overflow-x-auto">
            <table className="w-full text-left font-mono text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-paper-dark border-b-2 border-black text-black">
                  <th className="p-3.5 font-bold">MATCH DIMENSION</th>
                  <th className="p-3.5 font-bold">LAND RECORD</th>
                  <th className="p-3.5 font-bold">COURT RECORD</th>
                  <th className="p-3.5 font-bold">RESOLVER LOGIC</th>
                  <th className="p-3.5 font-bold text-right">WEIGHT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {primaryLink && evidence ? (
                  <>
                    <tr>
                      <td className="p-3.5 font-bold text-black">Survey Identifier</td>
                      <td className="p-3.5 text-ink-muted">{parcel?.survey_no || displaySurvey}</td>
                      <td className="p-3.5 text-black">{courtSurvey}</td>
                      <td className="p-3.5 text-radar-green font-semibold">{surveyMatchLabel(evidence.survey_match)}</td>
                      <td className="p-3.5 text-right font-bold">{weights.identifier ?? 0.4}</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-black">Village / Location</td>
                      <td className="p-3.5 text-ink-muted">{parcel?.village || displayVillage}</td>
                      <td className="p-3.5 text-black">{parcel?.village_canon || primaryLink.court}</td>
                      <td className="p-3.5 text-radar-green font-semibold">
                        {evidence.village_match ? 'Village gazetteer match' : 'Village unconfirmed'}
                      </td>
                      <td className="p-3.5 text-right font-bold">{weights.village ?? 0.1}</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-black">Party Name Overlap</td>
                      <td className="p-3.5 text-ink-muted">{parcel?.owner?.name || '—'}</td>
                      <td className="p-3.5 text-black">{caseDetail?.parties?.[0]?.name_as_written || caption || '—'}</td>
                      <td className="p-3.5 text-black">{pct(evidence.name_similarity)} token-sort similarity</td>
                      <td className="p-3.5 text-right font-bold">{weights.name ?? 0.25}</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-black">Patronymic (Father)</td>
                      <td className="p-3.5 text-ink-muted">{parcel?.owner?.father_name || '—'}</td>
                      <td className="p-3.5 text-black">
                        {evidence.father_name_similarity == null ? 'Not extracted from order' : pct(evidence.father_name_similarity)}
                      </td>
                      <td className="p-3.5 text-black">
                        {evidence.father_name_similarity == null ? 'Feature absent — weight redistributed' : `${pct(evidence.father_name_similarity)} string overlap`}
                      </td>
                      <td className="p-3.5 text-right font-bold">{weights.father_name ?? '—'}</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-black">Case Matter Relevance</td>
                      <td className="p-3.5 text-ink-muted">Land / revenue holding</td>
                      <td className="p-3.5 text-black">{primaryLink.case_type}</td>
                      <td className="p-3.5 font-bold">{String(evidence.case_type_relevance ?? 'scored')}</td>
                      <td className="p-3.5 text-right font-bold">{weights.case_type ?? 0.1}</td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr>
                      <td className="p-3.5 font-bold text-black">Survey Identifier</td>
                      <td className="p-3.5 text-black">{displaySurvey}</td>
                      <td className="p-3.5 text-ink-muted">No occurrences</td>
                      <td className="p-3.5 text-radar-green font-semibold">0 court disputes indexed</td>
                      <td className="p-3.5 text-right font-bold">—</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-black">Party Name Match</td>
                      <td className="p-3.5 text-black">{parcel?.owner?.name || 'Not on land index'}</td>
                      <td className="p-3.5 text-ink-muted">No occurrences</td>
                      <td className="p-3.5 text-radar-green font-semibold">0 litigation links found</td>
                      <td className="p-3.5 text-right font-bold">—</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-full border-b-2 border-black" />
        <div className="p-6 sm:p-8 flex flex-col md:flex-row items-start justify-between gap-8">
          <div className="flex-1 font-mono text-xs sm:text-sm text-ink-muted space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-black font-bold uppercase">Data Provenance:</span>
              <span className="border-2 border-black px-2 py-0.5 bg-paper-light text-black font-medium">
                Allahabad High Court Public Records
              </span>
              <span className="border-2 border-black px-2 py-0.5 bg-paper-light text-black font-medium">
                {parcel?.source_label === 'synthetic' ? 'Synthetic land record (seeded)' : 'State Revenue Land Registry'}
              </span>
            </div>
            <p className="leading-relaxed">
              <strong className="text-black">Public Legal Notice:</strong> GREEN means no matching active litigation was found in available records — not that the land is legally safe. This report presents evidence and match confidence, not a title guarantee. Consult a qualified advocate.
            </p>
          </div>
          {parcel?.id ? (
            <div className="flex-shrink-0">
              <button
                onClick={handleWatchlist}
                disabled={watchlistSubscribed || isSubscribing}
                className={`font-mono text-sm px-6 py-4 border-2 border-black font-bold flex items-center gap-2.5 transition-colors cursor-pointer select-none ${
                  watchlistSubscribed
                    ? 'bg-radar-green text-white border-radar-green cursor-default'
                    : 'bg-white hover:bg-black hover:text-white text-black'
                }`}
              >
                <span>{watchlistSubscribed ? '✓ Monitoring this Parcel' : isSubscribing ? 'Subscribing...' : '+ Monitor this Parcel'}</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {isModalOpen && (
        <CaseDetailModal caseData={selectedCase} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};
