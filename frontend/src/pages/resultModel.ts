import { CaseDetail, CaseParty, LandEvent, LinkedCase, ParcelDetail } from '../types/api';

export const NOT_FOUND_CONFIDENCE = 0.97;

export function landEventKind(e: LandEvent): string {
  return (e.type || e.event_type || '').toLowerCase();
}

export function partyCaption(parties: CaseParty[] | undefined): string {
  if (!parties?.length) return '';
  const pet = parties.filter((p) => /petitioner|plaintiff/i.test(p.role));
  const res = parties.filter((p) => /respondent|defendant/i.test(p.role));
  if (pet[0] && res[0]) return `${pet[0].name_as_written} v. ${res[0].name_as_written}`;
  return parties.map((p) => p.name_as_written).join(' · ');
}

export function pct(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value * 100)}%`;
}

export function surveyMatchLabel(match: string | undefined): string {
  if (match === 'exact') return 'Exact match via survey normalization';
  if (match === 'subdivision') return 'Parent/child after sub-division';
  if (match === 'normalized') return 'Normalized identifier match';
  if (match === 'none') return 'No identifier match';
  return match || 'Not scored';
}

export type TimelineCard = {
  date: string;
  title: string;
  detail: string;
  kind: 'court' | 'sale' | 'hearing' | 'clean' | 'mutation';
  insideSuit?: boolean;
};

export function buildTimeline(
  link: LinkedCase | undefined,
  parcel: ParcelDetail | null,
  caseDetail: CaseDetail | null,
): TimelineCard[] {
  const cards: TimelineCard[] = [];
  const filed = link?.filing_date || caseDetail?.filing_date;
  const order = link?.order_date || caseDetail?.order_date;
  const hearing = link?.next_hearing || caseDetail?.next_hearing_date;
  const derived = (link?.next_hearing_source || caseDetail?.next_hearing_source) === 'derived';
  const court = link?.court || caseDetail?.court || 'High Court';
  const caseNo = link?.case_no || caseDetail?.case_no || '';
  const disposed = (link?.case_status || caseDetail?.status) !== 'active';

  if (filed) {
    cards.push({
      date: filed,
      title: disposed ? 'Suit filed' : 'Civil writ filed',
      detail: `${caseNo}${court ? ` · ${court}` : ''}`.trim(),
      kind: 'court',
    });
  }
  if (order) {
    cards.push({
      date: order,
      title: disposed ? 'Judgment & disposal' : 'Interim order on record',
      detail: caseDetail?.case_type || link?.case_type || 'Latest order',
      kind: 'court',
    });
  }

  const events = parcel?.land_events || [];
  for (const e of events) {
    const kind = landEventKind(e);
    if (!e.date) continue;
    const inside = Boolean(filed && e.date >= filed && (!hearing || e.date <= hearing || !disposed));
    if (kind === 'sale' || kind === 'transfer') {
      cards.push({
        date: e.date,
        title: 'Sale deed registered',
        detail: inside
          ? 'Transfer executed during active pendency. Buyer bound by decree.'
          : (e.note || 'Registered conveyance on the land record'),
        kind: 'sale',
        insideSuit: inside && !disposed,
      });
    } else if (kind === 'mutation') {
      cards.push({
        date: e.date,
        title: 'Revenue mutation recorded',
        detail: e.note || 'State revenue registry',
        kind: 'mutation',
      });
    }
  }

  if (hearing && !disposed) {
    cards.push({
      date: hearing,
      title: derived ? 'Estimated hearing' : 'Next hearing',
      detail: derived ? '[Derived from latest order date]' : 'Listed on the court calendar',
      kind: 'hearing',
    });
  }

  cards.sort((a, b) => a.date.localeCompare(b.date));
  return cards;
}
