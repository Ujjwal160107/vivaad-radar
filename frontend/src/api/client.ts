import {
  SearchResultParcel,
  ParcelDetail,
  LitigationResponse,
  CaseDetail,
  DashboardOverview,
  VillageDensity,
  WatchlistItem,
  ParcelMapResponse,
} from '../types/api';

import {
  FLAGSHIP_RED_PARCEL,
  FLAGSHIP_GREEN_PARCEL,
  FLAGSHIP_AMBER_PARCEL,
  FALLBACK_OVERVIEW,
  FALLBACK_HEATMAP,
  FALLBACK_MAP,
  PARCEL_FALLBACKS,
  LITIGATION_FALLBACKS,
  CASE_FALLBACKS,
} from './fallbackData';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const isDemoMode = (): boolean => {
  if (typeof window !== 'undefined') {
    return new URLSearchParams(window.location.search).get('demo') === '1';
  }
  return false;
};

async function fetchJson<T>(url: string, fallback?: T): Promise<T> {
  if (isDemoMode()) {
    if (fallback !== undefined) return fallback;
    throw new Error(`No demo payload for ${url}`);
  }
  try {
    const res = await fetch(`${BASE_URL}${url}`);
    if (res.ok) return await res.json();
    if (fallback !== undefined) {
      console.warn(`API returned ${res.status} for ${url}, using fallback.`);
      return fallback;
    }
    throw new Error(`API ${res.status} for ${url}`);
  } catch (err) {
    if (fallback !== undefined) {
      console.warn(`Fetch failed for ${url}, switching to fallback tier.`, err);
      return fallback;
    }
    throw err;
  }
}

function asSearchHit(p: ParcelDetail): SearchResultParcel {
  return {
    id: p.id,
    survey_no: p.survey_no,
    khasra_no: p.khasra_no,
    khata_no: p.khata_no,
    village: p.village,
    village_canon: p.village_canon,
    taluk: p.taluk,
    status: p.status,
    confidence: p.confidence,
  };
}

function keySurvey(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase().replace(/-/g, '/').replace(/\s+/g, '');
}

function keyPlace(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

function matchesQuery(hit: SearchResultParcel, surveyNo: string, village: string): boolean {
  const wantSurvey = keySurvey(surveyNo);
  const wantVillage = keyPlace(village);
  const surveyOk =
    !wantSurvey ||
    [hit.survey_no, hit.khasra_no, hit.khata_no].some((value) => {
      const have = keySurvey(value);
      return have && (have === wantSurvey || have.includes(wantSurvey) || wantSurvey.includes(have));
    });
  const villageOk =
    !wantVillage ||
    keyPlace(hit.village).includes(wantVillage) ||
    keyPlace(hit.village_canon).includes(wantVillage) ||
    wantVillage.includes(keyPlace(hit.village_canon));
  return surveyOk && villageOk;
}

export const api = {
  async searchParcels(surveyNo: string, village: string): Promise<{ parcels: SearchResultParcel[] }> {
    const cleanSurvey = surveyNo.trim();
    const cleanVillage = village.trim();
    const bundled = [FLAGSHIP_RED_PARCEL, FLAGSHIP_GREEN_PARCEL, FLAGSHIP_AMBER_PARCEL]
      .map(asSearchHit)
      .filter((hit) => matchesQuery(hit, cleanSurvey, cleanVillage));

    const query = new URLSearchParams();
    if (cleanSurvey) query.append('survey_no', cleanSurvey);
    if (cleanVillage) query.append('village', cleanVillage);

    return fetchJson<{ parcels: SearchResultParcel[] }>(
      `/parcels/search?${query.toString()}`,
      { parcels: bundled },
    );
  },

  async getParcel(id: string): Promise<ParcelDetail> {
    return fetchJson<ParcelDetail>(`/parcels/${id}`, PARCEL_FALLBACKS[id]);
  },

  async getLitigation(id: string): Promise<LitigationResponse> {
    return fetchJson<LitigationResponse>(`/parcels/${id}/litigation`, LITIGATION_FALLBACKS[id]);
  },

  async getCase(id: string): Promise<CaseDetail> {
    return fetchJson<CaseDetail>(`/cases/${id}`, CASE_FALLBACKS[id]);
  },

  async getOverview(): Promise<DashboardOverview> {
    return fetchJson<DashboardOverview>('/dashboard/overview', FALLBACK_OVERVIEW);
  },

  async getHeatmap(): Promise<{ villages: VillageDensity[] }> {
    return fetchJson<{ villages: VillageDensity[] }>('/dashboard/heatmap', FALLBACK_HEATMAP);
  },

  async getMap(): Promise<ParcelMapResponse> {
    return fetchJson<ParcelMapResponse>('/dashboard/map', FALLBACK_MAP);
  },

  async getWatchlist(): Promise<{ items: WatchlistItem[] }> {
    return fetchJson<{ items: WatchlistItem[] }>('/watchlist', {
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
