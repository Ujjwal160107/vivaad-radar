import React, { useState } from 'react';
import { Header } from './components/Header';
import { Search } from './pages/Search';
import { Processing } from './pages/Processing';
import { Result } from './pages/Result';
import { api } from './api/client';
import { ParcelDetail, LitigationResponse } from './types/api';

export const App: React.FC = () => {
  const [view, setView] = useState<'search' | 'processing' | 'result'>('search');
  const [searchTarget, setSearchTarget] = useState({ surveyNo: '', village: '' });
  const [searchedParcel, setSearchedParcel] = useState<ParcelDetail | null>(null);
  const [litigationData, setLitigationData] = useState<LitigationResponse | null>(null);

  const handleStartSearch = async (surveyNo: string, village: string) => {
    setSearchTarget({ surveyNo, village });
    setView('processing');

    try {
      // 1. Search for matching parcel
      const searchRes = await api.searchParcels(surveyNo, village);
      let targetParcelId = 'P-B01'; // Default flagship fallback
      
      if (searchRes.parcels && searchRes.parcels.length > 0) {
        targetParcelId = searchRes.parcels[0].id;
      } else if (surveyNo.includes('88') || village.toLowerCase().includes('baraunsa')) {
        targetParcelId = 'P-A01';
      }

      // 2. Fetch full parcel and litigation data in parallel
      const [parcel, litigation] = await Promise.all([
        api.getParcel(targetParcelId),
        api.getLitigation(targetParcelId),
      ]);

      setSearchedParcel(parcel);
      setLitigationData(litigation);
    } catch (err) {
      console.error('Search execution failed:', err);
    }
  };

  const handleProcessingComplete = () => {
    setView('result');
  };

  const handleGoHome = () => {
    setView('search');
  };

  return (
    <div className="min-h-screen bg-grid-100 flex flex-col font-sans selection:bg-black selection:text-white">
      <Header onHomeClick={handleGoHome} activeDistrict="Sultanpur (UP)" />

      <main className="flex-1">
        {view === 'search' && (
          <Search 
            onSearch={handleStartSearch}
            onOpenDashboard={() => alert('Officer Dashboard will be configured in Phase 8')}
            onOpenWatchlist={() => alert('Watchlist will be configured in Phase 8')}
          />
        )}

        {view === 'processing' && (
          <Processing
            surveyNo={searchTarget.surveyNo}
            village={searchTarget.village}
            onComplete={handleProcessingComplete}
          />
        )}

        {view === 'result' && (
          <Result
            parcel={searchedParcel}
            litigation={litigationData}
            searchQuery={searchTarget}
            onBack={handleGoHome}
          />
        )}
      </main>
    </div>
  );
};
