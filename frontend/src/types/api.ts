export type StatusBand = 'RED' | 'AMBER' | 'GREEN';
export type ConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SearchResultParcel {
  id: string;
  survey_no: string;
  khasra_no: string | null;
  khata_no: string | null;
  village: string;
  village_canon: string;
  taluk: string | null;
  status: StatusBand | null;
  confidence: number | null;
}

export interface LandEvent {
  event_type?: string;
  type?: string;
  date: string;
  note?: string;
}

export interface ParcelDetail {
  id: string;
  survey_no: string;
  khasra_no: string | null;
  khata_no: string | null;
  village: string;
  village_canon: string;
  taluk: string | null;
  district: string;
  area: string | null;
  geometry: any | null;
  land_events: LandEvent[];
  owner: {
    name: string;
    father_name: string | null;
  } | null;
  status: StatusBand | null;
  confidence: number | null;
  note: string | null;
  closed_history: number | boolean;
  source_label: string;
}

export interface EvidenceDetail {
  survey_match?: 'exact' | 'normalized' | 'subdivision' | 'none';
  village_match?: boolean;
  name_similarity?: number;
  father_name_similarity?: number;
  weights_used?: {
    identifier?: number;
    name?: number;
    father_name?: number;
    village?: number;
    case_type?: number;
  };
  case_type_relevance?: 'high' | 'medium' | 'low' | number;
  [key: string]: any;
}

export interface LinkedCase {
  case_id: string;
  case_no: string;
  court: string;
  case_type: string;
  case_status: 'active' | 'disposed' | 'closed' | string;
  confidence: number;
  band: ConfidenceBand;
  link_status: StatusBand;
  reason?: string;
  evidence: EvidenceDetail;
  filing_date: string;
  order_date: string | null;
  next_hearing: string | null;
  next_hearing_source?: 'derived' | 'real' | null;
  raw_text_ref: string | null;
}

export interface LitigationResponse {
  parcel_id: string;
  status: StatusBand;
  confidence: number | null;
  note: string | null;
  closed_history: boolean;
  links: LinkedCase[];
}

export interface CaseParty {
  role: 'petitioner' | 'respondent' | string;
  name_as_written: string;
}

export interface CourtEvent {
  event_type: 'filed' | 'interim_order' | 'judgment' | 'next_hearing' | string;
  date: string;
  note: string | null;
}

export interface CaseDetail {
  id: string;
  case_no: string;
  court: string;
  case_type: string;
  filing_date: string;
  order_date: string | null;
  status: string;
  next_hearing_date: string | null;
  next_hearing_source?: 'derived' | 'real' | null;
  raw_text_ref: string | null;
  source_label: string;
  parties: CaseParty[];
  events: CourtEvent[];
  linked_parcels: {
    parcel_id: string;
    confidence_score: number;
    status: StatusBand;
  }[];
}

export interface DashboardOverview {
  district: string | null;
  parcels: number;
  cases: number;
  status_counts: {
    RED: number;
    AMBER: number;
    GREEN: number;
  };
  active_cases: number;
  high_confidence_links: number;
  possible_matches: number;
}

export interface VillageDensity {
  village: string;
  village_canon: string;
  parcels: number;
  RED: number;
  AMBER: number;
  GREEN: number;
  density: number;
}

export interface WatchlistItem {
  id: number;
  parcel_id: string;
  survey_no: string;
  village: string;
  subscribed_at: string;
  has_update: boolean;
}

export interface MapParcelProperties {
  id: string;
  survey_no: string;
  village: string;
  village_canon: string;
  status: StatusBand;
  confidence: number | null;
}

export interface ParcelMapFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
  properties: MapParcelProperties;
}

export interface ParcelMapResponse {
  type: 'FeatureCollection';
  features: ParcelMapFeature[];
}
