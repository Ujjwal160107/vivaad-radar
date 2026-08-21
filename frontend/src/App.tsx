import React, { useCallback, useRef, useState } from 'react';
import { Header } from './components/Header';
import { Search } from './pages/Search';
import { Processing } from './pages/Processing';
import { ParcelPicker } from './pages/ParcelPicker';
import { Result } from './pages/Result';
import { OfficerDashboard } from './pages/OfficerDashboard';
import { Watchlist } from './pages/Watchlist';
import { api, isDemoMode } from './api/client';
import { ParcelDetail, LitigationResponse, CaseDetail, SearchResultParcel } from './types/api';
import { NOT_FOUND_CONFIDENCE } from './pages/resultModel';

const NOT_FOUND_LITIGATION: LitigationResponse = {
  parcel_id: '',
  status: 'GREEN',
  confidence: NOT_FOUND_CONFIDENCE,
  note: 'This survey number was not found in the Sultanpur court-linked parcel index.',
  closed_history: false,
  links: [],
};

export const App: React.FC = () => {
  const [view, setView] = useState<'search' | 'processing' | 'pick' | 'result' | 'dashboard' | 'watchlist'>('search');
  const [returnView, setReturnView] = useState<'search' | 'dashboard' | 'watchlist'>('search');
  const [searchTarget, setSearchTarget] = useState({ surveyNo: '', village: '' });
  const [searchedParcel, setSearchedParcel] = useState<ParcelDetail | null>(null);
  const [litigationData, setLitigationData] = useState<LitigationResponse | null>(null);
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [candidates, setCandidates] = useState<SearchResultParcel[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [searchReady, setSearchReady] = useState(false);
  const candidatesRef = useRef<SearchResultParcel[]>([]);

  const loadParcelBundle = async (parcelId: string) => {
    const [parcel, litigation] = await Promise.all([
      api.getParcel(parcelId),
      api.getLitigation(parcelId),
    ]);
    setSearchedParcel(parcel);
    setLitigationData(litigation);
    const caseId = litigation.links[0]?.case_id;
    if (caseId) {
      try {
        setCaseDetail(await api.getCase(caseId));
      } catch {
        setCaseDetail(null);
      }
    } else {
      setCaseDetail(null);
    }
    return parcel;
  };

  const handleStartSearch = async (surveyNo: string, village: string) => {
    setSearchTarget({ surveyNo, village });
    setReturnView('search');
    setView('processing');
    setNotFound(false);
    setSearchReady(false);
    setCaseDetail(null);
    setSearchedParcel(null);
    setLitigationData(null);
    setCandidates([]);
    candidatesRef.current = [];

    try {
      const searchRes = await api.searchParcels(surveyNo, village);
      const hits = searchRes.parcels || [];
      setCandidates(hits);
      candidatesRef.current = hits;

      if (hits.length === 0) {
        setNotFound(true);
        setLitigationData(NOT_FOUND_LITIGATION);
      } else if (hits.length === 1) {
        await loadParcelBundle(hits[0].id);
      }
    } catch (err) {
      console.error('Search execution failed:', err);
      setNotFound(true);
      setCandidates([]);
      candidatesRef.current = [];
      setLitigationData(NOT_FOUND_LITIGATION);
    } finally {
      setSearchReady(true);
    }
  };

  const handleProcessingComplete = useCallback(() => {
    setView(candidatesRef.current.length > 1 ? 'pick' : 'result');
  }, []);

  const handlePick = async (parcelId: string) => {
    await loadParcelBundle(parcelId);
    setNotFound(false);
    setView('result');
  };

  const handleOpenParcel = async (parcelId: string, from: 'dashboard' | 'watchlist') => {
    setReturnView(from);
    const parcel = await loadParcelBundle(parcelId);
    setSearchTarget({ surveyNo: parcel.survey_no, village: parcel.village });
    setNotFound(false);
    setView('result');
  };

  const handleGoHome = () => {
    setView('search');
    setReturnView('search');
    setNotFound(false);
    setSearchReady(false);
    setCaseDetail(null);
    setCandidates([]);
    candidatesRef.current = [];
  };

  const handleResultBack = () => {
    setView(returnView);
  };

  return (
    <div className="min-h-screen bg-grid-100 flex flex-col font-sans selection:bg-black selection:text-white">
      <Header onHomeClick={handleGoHome} activeDistrict="Sultanpur (UP)" isDemo={isDemoMode()} />

      <main className="flex-1">
        {view === 'search' && (
          <Search
            onSearch={handleStartSearch}
            onOpenDashboard={() => setView('dashboard')}
            onOpenWatchlist={() => setView('watchlist')}
          />
        )}

        {view === 'processing' && (
          <Processing
            surveyNo={searchTarget.surveyNo}
            village={searchTarget.village}
            ready={searchReady}
            onComplete={handleProcessingComplete}
          />
        )}

        {view === 'pick' && (
          <ParcelPicker
            query={searchTarget}
            parcels={candidates}
            onPick={handlePick}
            onBack={handleGoHome}
          />
        )}

        {view === 'result' && (
          <Result
            parcel={searchedParcel}
            litigation={litigationData}
            caseDetail={caseDetail}
            notFound={notFound}
            searchQuery={searchTarget}
            onBack={handleResultBack}
          />
        )}

        {view === 'dashboard' && (
          <OfficerDashboard
            onBack={handleGoHome}
            onOpenWatchlist={() => setView('watchlist')}
            onOpenParcel={(id) => handleOpenParcel(id, 'dashboard')}
          />
        )}

        {view === 'watchlist' && (
          <Watchlist
            onBack={handleGoHome}
            onOpenDashboard={() => setView('dashboard')}
            onOpenParcel={(id) => handleOpenParcel(id, 'watchlist')}
          />
        )}
      </main>
    </div>
  );
};
