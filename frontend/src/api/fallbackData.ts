import { LitigationResponse, ParcelDetail, CaseDetail, DashboardOverview, VillageDensity } from '../types/api';

export const FLAGSHIP_RED_PARCEL: ParcelDetail = {
  id: "P-B01",
  survey_no: "1365-1",
  khasra_no: "1365-1",
  khata_no: "KH-153",
  village: "Madanpur Panyar",
  village_canon: "madanpur paniyar",
  taluk: "Sadar",
  district: "Sultanpur",
  area: "1 bigha",
  geometry: null,
  land_events: [
    {
      event_type: "sale",
      date: "2025-11-05",
      note: "Sale deed registered during active pendency of civil suit"
    }
  ],
  owner: {
    name: "Shyam Dhar Dubey",
    father_name: "Santu"
  },
  status: "RED",
  confidence: 0.9105,
  note: "Sale registered during pendency",
  closed_history: false,
  source_label: "synthetic"
};

export const FLAGSHIP_RED_LITIGATION: LitigationResponse = {
  parcel_id: "P-B01",
  status: "RED",
  confidence: 0.9105,
  note: "Sale registered during pendency",
  closed_history: false,
  links: [
    {
      case_id: "UPHC020611812025",
      case_no: "WRIB/784/2025",
      court: "Allahabad High Court",
      case_type: "consolidation/title",
      case_status: "active",
      confidence: 0.9105,
      band: "HIGH",
      link_status: "RED",
      reason: "high-band link to active case with exact identifier match",
      evidence: {
        survey_match: "exact",
        village_match: true,
        name_similarity: 0.88,
        father_name_similarity: 0.90,
        case_type_relevance: "high"
      },
      filing_date: "2025-08-11",
      order_date: "2025-08-22",
      next_hearing: "2026-09-12",
      next_hearing_source: "derived",
      raw_text_ref: "data/input/cases.parquet"
    }
  ]
};

export const FLAGSHIP_GREEN_PARCEL: ParcelDetail = {
  id: "P-A01",
  survey_no: "88",
  khasra_no: null,
  khata_no: "KH-88",
  village: "Baraunsa",
  village_canon: "baraunsa",
  taluk: "Sadar",
  district: "Sultanpur",
  area: "0.5 bigha",
  geometry: null,
  land_events: [
    {
      event_type: "mutation",
      date: "2023-06-10",
      note: "Routine inheritance mutation"
    }
  ],
  owner: {
    name: "Ramesh Verma",
    father_name: "Sohan Lal"
  },
  status: "GREEN",
  confidence: 0.0,
  note: null,
  closed_history: false,
  source_label: "synthetic"
};

export const FLAGSHIP_GREEN_LITIGATION: LitigationResponse = {
  parcel_id: "P-A01",
  status: "GREEN",
  confidence: null,
  note: null,
  closed_history: false,
  links: []
};

export const FLAGSHIP_CASE_DETAIL: CaseDetail = {
  id: "UPHC020611812025",
  case_no: "WRIB/784/2025",
  court: "Allahabad High Court",
  case_type: "consolidation/title",
  filing_date: "2025-08-11",
  order_date: "2025-08-22",
  status: "active",
  next_hearing_date: "2026-09-12",
  next_hearing_source: "derived",
  raw_text_ref: "data/input/cases.parquet",
  source_label: "real",
  parties: [
    {
      role: "petitioner",
      name_as_written: "SHYAMDHAR DUBEY AND 9 OTHERS"
    },
    {
      role: "respondent",
      name_as_written: "DEPUTY DIRECTOR OF CONSOLIDATION, SULTANPUR"
    }
  ],
  events: [
    {
      event_type: "filed",
      date: "2025-08-11",
      note: "Writ petition filed in High Court"
    },
    {
      event_type: "interim_order",
      date: "2025-08-22",
      note: "Interim stay on consolidation order regarding Gata 153 / 1365/1"
    },
    {
      event_type: "next_hearing",
      date: "2026-09-12",
      note: "Estimated next hearing date"
    }
  ],
  linked_parcels: [
    {
      parcel_id: "P-B01",
      confidence_score: 0.9105,
      status: "RED"
    }
  ]
};

export const FALLBACK_OVERVIEW: DashboardOverview = {
  district: "Sultanpur",
  parcels: 81,
  cases: 63,
  status_counts: {
    RED: 12,
    AMBER: 38,
    GREEN: 31
  },
  active_cases: 24,
  high_confidence_links: 14,
  possible_matches: 42
};

export const FALLBACK_HEATMAP: { villages: VillageDensity[] } = {
  villages: [
    {
      village: "Madanpur Paniyar",
      village_canon: "madanpur paniyar",
      parcels: 8,
      RED: 3,
      AMBER: 4,
      GREEN: 1,
      density: 0.625
    },
    {
      village: "Kurwar",
      village_canon: "kurwar",
      parcels: 12,
      RED: 2,
      AMBER: 6,
      GREEN: 4,
      density: 0.417
    },
    {
      village: "Baraunsa",
      village_canon: "baraunsa",
      parcels: 10,
      RED: 0,
      AMBER: 2,
      GREEN: 8,
      density: 0.1
    }
  ]
};
