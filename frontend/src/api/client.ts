import {
  SearchResultParcel,
  ParcelDetail,
  LitigationResponse,
  CaseDetail,
  DashboardOverview,
  VillageDensity,
  WatchlistItem,
} from '../types/api';

import {
  FLAGSHIP_RED_PARCEL,
  FLAGSHIP_RED_LITIGATION,
  FLAGSHIP_GREEN_PARCEL,
  FLAGSHIP_GREEN_LITIGATION,
  FLAGSHIP_CASE_DETAIL,
  FALLBACK_OVERVIEW,
  FALLBACK_HEATMAP,
} from './fallbackData';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const isDemoTier3 = (): boolean => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return params.get('demo') === '1';
  }
  return false;
};

async function fetchWithFallback<T>(url: string, fallbackValue: T, options?: RequestInit): Promise<T> {
  if (isDemoTier3()) {
    return fallbackValue;
  }
  try {
    const res = await fetch(`${BASE_URL}${url}`, options);
    if (!res.ok) {
      console.warn(`API returned ${res.status} for ${url}, using fallback.`);
      return fallbackValue;
    }
    return await res.json();
  } catch (err) {
    console.warn(`Fetch failed for ${url}, switching to fallback tier.`, err);
    return fallbackValue;
  }
}

export const api = {
  async searchParcels(surveyNo: string, village: string): Promise<{ parcels: SearchResultParcel[] }> {
    const cleanSurvey = surveyNo.trim();
    const cleanVillage = village.trim();

    const fallbackResults: SearchResultParcel[] = [];
    if (cleanSurvey.includes('1365') || cleanVillage.toLowerCase().includes('madan')) {
      fallbackResults.push({
        id: FLAGSHIP_RED_PARCEL.id,
        survey_no: FLAGSHIP_RED_PARCEL.survey_no,
        khasra_no: FLAGSHIP_RED_PARCEL.khasra_no,
        khata_no: FLAGSHIP_RED_PARCEL.khata_no,
        village: FLAGSHIP_RED_PARCEL.village,
        village_canon: FLAGSHIP_RED_PARCEL.village_canon,
        taluk: FLAGSHIP_RED_PARCEL.taluk,
        status: FLAGSHIP_RED_PARCEL.status,
        confidence: FLAGSHIP_RED_PARCEL.confidence,
      });
    }
    if (cleanSurvey.includes('88') || cleanVillage.toLowerCase().includes('baraunsa')) {
      fallbackResults.push({
        id: FLAGSHIP_GREEN_PARCEL.id,
        survey_no: FLAGSHIP_GREEN_PARCEL.survey_no,
        khasra_no: FLAGSHIP_GREEN_PARCEL.khasra_no,
        khata_no: FLAGSHIP_GREEN_PARCEL.khata_no,
        village: FLAGSHIP_GREEN_PARCEL.village,
        village_canon: FLAGSHIP_GREEN_PARCEL.village_canon,
        taluk: FLAGSHIP_GREEN_PARCEL.taluk,
        status: FLAGSHIP_GREEN_PARCEL.status,
        confidence: FLAGSHIP_GREEN_PARCEL.confidence,
      });
    }

    const query = new URLSearchParams();
    if (cleanSurvey) query.append('survey_no', cleanSurvey);
    if (cleanVillage) query.append('village', cleanVillage);

    return fetchWithFallback<{ parcels: SearchResultParcel[] }>(
      `/parcels/search?${query.toString()}`,
      { parcels: fallbackResults.length > 0 ? fallbackResults : [
        {
          id: FLAGSHIP_RED_PARCEL.id,
          survey_no: FLAGSHIP_RED_PARCEL.survey_no,
          khasra_no: FLAGSHIP_RED_PARCEL.khasra_no,
          khata_no: FLAGSHIP_RED_PARCEL.khata_no,
          village: FLAGSHIP_RED_PARCEL.village,
          village_canon: FLAGSHIP_RED_PARCEL.village_canon,
          taluk: FLAGSHIP_RED_PARCEL.taluk,
          status: FLAGSHIP_RED_PARCEL.status,
          confidence: FLAGSHIP_RED_PARCEL.confidence,
        }
      ]}
    );
  },

  async getParcel(id: string): Promise<ParcelDetail> {
    const fallback = id === 'P-A01' ? FLAGSHIP_GREEN_PARCEL : FLAGSHIP_RED_PARCEL;
    return fetchWithFallback<ParcelDetail>(`/parcels/${id}`, fallback);
  },

  async getLitigation(id: string): Promise<LitigationResponse> {
    const fallback = id === 'P-A01' ? FLAGSHIP_GREEN_LITIGATION : FLAGSHIP_RED_LITIGATION;
    return fetchWithFallback<LitigationResponse>(`/parcels/${id}/litigation`, fallback);
  },

  async getCase(id: string): Promise<CaseDetail> {
    return fetchWithFallback<CaseDetail>(`/cases/${id}`, FLAGSHIP_CASE_DETAIL);
  },

  async getOverview(): Promise<DashboardOverview> {
    return fetchWithFallback<DashboardOverview>('/dashboard/overview', FALLBACK_OVERVIEW);
  },

  async getHeatmap(): Promise<{ villages: VillageDensity[] }> {
    return fetchWithFallback<{ villages: VillageDensity[] }>('/dashboard/heatmap', FALLBACK_HEATMAP);
  },

  async getWatchlist(): Promise<{ items: WatchlistItem[] }> {
    return fetchWithFallback<{ items: WatchlistItem[] }>('/watchlist', {
      items: [
        {
          id: 1,
          parcel_id: 'P-B01',
          survey_no: '1365-1',
          village: 'Madanpur Panyar',
          subscribed_at: '2026-08-20',
          has_update: true,
        },
      ],
    });
  },

  async subscribeWatchlist(parcelId: string): Promise<{ id: number; parcel_id: string; subscribed_at: string }> {
    try {
      const res = await fetch(`${BASE_URL}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parcel_id: parcelId }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Watchlist subscribe failed, falling back to mock response', e);
    }
    return {
      id: Math.floor(Math.random() * 1000) + 10,
      parcel_id: parcelId,
      subscribed_at: new Date().toISOString().split('T')[0],
    };
  },
};
