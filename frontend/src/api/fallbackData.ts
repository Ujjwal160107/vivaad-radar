import { LitigationResponse, ParcelDetail, CaseDetail, DashboardOverview, VillageDensity, ParcelMapResponse } from '../types/api';

function square(lng: number, lat: number, size = 0.008) {
  return {
    type: 'Polygon' as const,
    coordinates: [[
      [lng, lat],
      [lng + size, lat],
      [lng + size, lat + size],
      [lng, lat + size],
      [lng, lat],
    ]],
  };
}

export const FLAGSHIP_RED_PARCEL: ParcelDetail = {
  id: "P-B01",
  survey_no: "1365-1",
  khasra_no: null,
  khata_no: "153",
  village: "Madanpur Panyar",
  village_canon: "madanpur paniyar",
  taluk: "Sultanpur",
  district: "Sultanpur",
  area: "1.0",
  geometry: square(82.071, 26.268, 0.01),
  land_events: [
    { type: "mutation", date: "2018-04-13" },
    { type: "sale", date: "2026-04-24", note: "Sale deed registered during active pendency" },
  ],
  owner: { name: "Shyam Dhar Dubey", father_name: "Neemar" },
  status: "RED",
  confidence: 0.9105,
  note: "High-confidence litigation connection found",
  closed_history: false,
  source_label: "synthetic",
};

export const FLAGSHIP_RED_LITIGATION: LitigationResponse = {
  parcel_id: "P-B01",
  status: "RED",
  confidence: 0.9105,
  note: "High-confidence litigation connection found",
  closed_history: false,
  links: [
    {
      case_id: "UPHC020611812025",
      case_no: "WRIB/784/2025",
      court: "Allahabad High Court",
      case_type: "succession_inheritance",
      case_status: "active",
      confidence: 0.9105,
      band: "HIGH",
      link_status: "RED",
      reason: "high confidence, identifier match, active case",
      evidence: {
        survey_match: "exact",
        village_match: true,
        name_similarity: 0.682,
        father_name_similarity: 1.0,
        case_type_relevance: 0.9,
        weights_used: {
          identifier: 0.4,
          name: 0.25,
          father_name: 0.15,
          village: 0.1,
          case_type: 0.1,
        },
      },
      filing_date: "2025-08-11",
      order_date: "2025-08-22",
      next_hearing: "2026-10-29",
      next_hearing_source: "derived",
      raw_text_ref: "data/pdf/year=2025/court=9_13/bench=cishclko/orders_2025_202100007842025_1.pdf",
    },
  ],
};

export const FLAGSHIP_GREEN_PARCEL: ParcelDetail = {
  id: "P-A01",
  survey_no: "418",
  khasra_no: null,
  khata_no: null,
  village: "Madanpur Paniyar",
  village_canon: "madanpur paniyar",
  taluk: "Sultanpur",
  district: "Sultanpur",
  area: "1.6",
  geometry: square(82.084, 26.262, 0.008),
  land_events: [{ type: "sale", date: "2021-07-14" }],
  owner: { name: "Ram Autar Verma", father_name: "Dukhi" },
  status: "GREEN",
  confidence: 0.0,
  note: "No matching active litigation found in available records",
  closed_history: false,
  source_label: "synthetic",
};

export const FLAGSHIP_GREEN_LITIGATION: LitigationResponse = {
  parcel_id: "P-A01",
  status: "GREEN",
  confidence: 0.0,
  note: "No matching active litigation found in available records",
  closed_history: false,
  links: [],
};

export const FLAGSHIP_AMBER_PARCEL: ParcelDetail = {
  id: "P-046",
  survey_no: "622",
  khasra_no: null,
  khata_no: null,
  village: "Sonari",
  village_canon: "sonari",
  taluk: "Amethi",
  district: "Sultanpur",
  area: "2.31",
  geometry: square(82.12, 26.30, 0.009),
  land_events: [{ type: "sale", date: "2024-07-14" }],
  owner: { name: "Mahrajdeen Verma", father_name: "Shyam Lal" },
  status: "AMBER",
  confidence: 1.0,
  note: "Possible connection - verification recommended; closed litigation history on record",
  closed_history: true,
  source_label: "synthetic",
};

export const FLAGSHIP_AMBER_LITIGATION: LitigationResponse = {
  parcel_id: "P-046",
  status: "AMBER",
  confidence: 1.0,
  note: "Possible connection - verification recommended; closed litigation history on record",
  closed_history: true,
  links: [
    {
      case_id: "UPHC020474292024",
      case_no: "WRIB/720/2024",
      court: "Allahabad High Court",
      case_type: "partition",
      case_status: "disposed",
      confidence: 1.0,
      band: "HIGH",
      link_status: "AMBER",
      reason: "high confidence but case is disposed",
      evidence: {
        survey_match: "exact",
        village_match: true,
        name_similarity: 1.0,
        father_name_similarity: null,
        case_type_relevance: 1.0,
        weights_used: {
          identifier: 0.4,
          name: 0.25,
          village: 0.1,
          case_type: 0.1,
        },
      },
      filing_date: "2024-07-12",
      order_date: "2024-07-16",
      next_hearing: null,
      next_hearing_source: null,
      raw_text_ref: "data/pdf/year=2024/court=9_13/bench=cishclko/orders_2024_202100007202024_1.pdf",
    },
  ],
};

export const FLAGSHIP_CASE_DETAIL: CaseDetail = {
  id: "UPHC020611812025",
  case_no: "WRIB/784/2025",
  court: "Allahabad High Court",
  case_type: "succession_inheritance",
  filing_date: "2025-08-11",
  order_date: "2025-08-22",
  status: "active",
  next_hearing_date: "2026-10-29",
  next_hearing_source: "derived",
  raw_text_ref: "data/pdf/year=2025/court=9_13/bench=cishclko/orders_2025_202100007842025_1.pdf",
  source_label: "real",
  parties: [
    { role: "petitioner", name_as_written: "SHYAMDHAR DUBEY AND 9 OTHERS" },
    { role: "respondent", name_as_written: "DEPUTY DIRECTOR OF CONSOLIDATION, SULTANPUR AND OTHERS" },
  ],
  events: [
    { event_type: "filed", date: "2025-08-11", note: "Case filed" },
    { event_type: "interim_order", date: "2025-08-22", note: "Latest order on record" },
    { event_type: "next_hearing", date: "2026-10-29", note: "Next hearing" },
  ],
  linked_parcels: [{ parcel_id: "P-B01", confidence_score: 0.9105, status: "RED" }],
};

export const AMBER_CASE_DETAIL: CaseDetail = {
  id: "UPHC020474292024",
  case_no: "WRIB/720/2024",
  court: "Allahabad High Court",
  case_type: "partition",
  filing_date: "2024-07-12",
  order_date: "2024-07-16",
  status: "disposed",
  next_hearing_date: null,
  next_hearing_source: null,
  raw_text_ref: "data/pdf/year=2024/court=9_13/bench=cishclko/orders_2024_202100007202024_1.pdf",
  source_label: "real",
  parties: [
    { role: "petitioner", name_as_written: "MAHRAJDEEN VERMA" },
    { role: "respondent", name_as_written: "STATE OF U.P. THRU. PRIN. / ADDL CHIEF SECY. REVENUE, LUCKNOW AND OTHERS" },
  ],
  events: [
    { event_type: "filed", date: "2024-07-12", note: "Case filed" },
    { event_type: "judgment", date: "2024-07-16", note: "Latest order on record" },
  ],
  linked_parcels: [{ parcel_id: "P-046", confidence_score: 1.0, status: "AMBER" }],
};

export const FALLBACK_OVERVIEW: DashboardOverview = {
  district: "Sultanpur",
  parcels: 135,
  cases: 38,
  status_counts: { RED: 12, AMBER: 62, GREEN: 61 },
  active_cases: 8,
  high_confidence_links: 43,
  possible_matches: 41,
};

export const FALLBACK_HEATMAP: { villages: VillageDensity[] } = {
  villages: [
    {
      village: "Madanpur Paniyar",
      village_canon: "madanpur paniyar",
      parcels: 2,
      RED: 1,
      AMBER: 0,
      GREEN: 1,
      density: 0.5,
    },
    {
      village: "Sonari",
      village_canon: "sonari",
      parcels: 1,
      RED: 0,
      AMBER: 1,
      GREEN: 0,
      density: 0.5,
    },
  ],
};

export const FALLBACK_MAP: ParcelMapResponse = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: FLAGSHIP_RED_PARCEL.geometry,
      properties: {
        id: "P-B01",
        survey_no: "1365-1",
        village: "Madanpur Panyar",
        village_canon: "madanpur paniyar",
        status: "RED",
        confidence: 0.9105,
      },
    },
    {
      type: "Feature",
      geometry: FLAGSHIP_GREEN_PARCEL.geometry,
      properties: {
        id: "P-A01",
        survey_no: "418",
        village: "Madanpur Paniyar",
        village_canon: "madanpur paniyar",
        status: "GREEN",
        confidence: 0.0,
      },
    },
    {
      type: "Feature",
      geometry: FLAGSHIP_AMBER_PARCEL.geometry,
      properties: {
        id: "P-046",
        survey_no: "622",
        village: "Sonari",
        village_canon: "sonari",
        status: "AMBER",
        confidence: 1.0,
      },
    },
  ],
};

export const PARCEL_FALLBACKS: Record<string, ParcelDetail> = {
  "P-B01": FLAGSHIP_RED_PARCEL,
  "P-A01": FLAGSHIP_GREEN_PARCEL,
  "P-046": FLAGSHIP_AMBER_PARCEL,
};

export const LITIGATION_FALLBACKS: Record<string, LitigationResponse> = {
  "P-B01": FLAGSHIP_RED_LITIGATION,
  "P-A01": FLAGSHIP_GREEN_LITIGATION,
  "P-046": FLAGSHIP_AMBER_LITIGATION,
};

export const CASE_FALLBACKS: Record<string, CaseDetail> = {
  UPHC020611812025: FLAGSHIP_CASE_DETAIL,
  UPHC020474292024: AMBER_CASE_DETAIL,
};
