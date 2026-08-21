import React, { useEffect, useMemo } from 'react';
import { CircleMarker, GeoJSON as LeafletGeoJSON, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { Layer } from 'leaflet';
import type { Feature, GeoJsonObject } from 'geojson';
import 'leaflet/dist/leaflet.css';
import { ParcelMapFeature, ParcelMapResponse, StatusBand, VillageDensity } from '../types/api';

const SULTANPUR: [number, number] = [26.2647, 82.0727];

const FILL: Record<StatusBand, string> = {
  RED: '#C92A2A',
  AMBER: '#D97706',
  GREEN: '#15803D',
};

function ringCentroid(ring: number[][]): [number, number] | null {
  if (!ring?.length) return null;
  let lng = 0;
  let lat = 0;
  let n = 0;
  for (const pair of ring) {
    if (!pair || pair.length < 2) continue;
    lng += pair[0];
    lat += pair[1];
    n += 1;
  }
  if (!n) return null;
  return [lat / n, lng / n];
}

function featureCentroid(feature: ParcelMapFeature): [number, number] | null {
  const geom = feature.geometry;
  if (!geom?.coordinates) return null;
  if (geom.type === 'Polygon') {
    return ringCentroid((geom.coordinates as number[][][])[0] || []);
  }
  if (geom.type === 'MultiPolygon') {
    const first = (geom.coordinates as number[][][][])[0];
    return ringCentroid(first?.[0] || []);
  }
  return null;
}

function densityFill(density: number): string {
  if (density >= 0.6) return '#C92A2A';
  if (density >= 0.3) return '#D97706';
  return '#15803D';
}

function MapEffects({
  features,
  selectedCanon,
}: {
  features: ParcelMapFeature[];
  selectedCanon: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    const subset = selectedCanon
      ? features.filter((f) => f.properties.village_canon === selectedCanon)
      : features;
    const pts = subset.map(featureCentroid).filter(Boolean) as [number, number][];
    if (pts.length === 0) {
      map.setView(SULTANPUR, 11);
      return;
    }
    map.fitBounds(pts, { padding: [28, 28], maxZoom: selectedCanon ? 14 : 12 });
  }, [features, selectedCanon, map]);

  return null;
}

interface ParcelMapProps {
  collection: ParcelMapResponse;
  villages: VillageDensity[];
  selectedCanon: string | null;
  onSelectVillage: (canon: string) => void;
  onOpenParcel: (parcelId: string) => void;
}

export const ParcelMap: React.FC<ParcelMapProps> = ({
  collection,
  villages,
  selectedCanon,
  onSelectVillage,
  onOpenParcel,
}) => {
  const features = collection.features || [];

  const villagePoints = useMemo(() => {
    const buckets: Record<string, { lat: number; lng: number; n: number }> = {};
    for (const f of features) {
      const c = featureCentroid(f);
      if (!c) continue;
      const key = f.properties.village_canon;
      const b = buckets[key] || { lat: 0, lng: 0, n: 0 };
      b.lat += c[0];
      b.lng += c[1];
      b.n += 1;
      buckets[key] = b;
    }
    return villages
      .map((v) => {
        const b = buckets[v.village_canon];
        if (!b) return null;
        return { ...v, lat: b.lat / b.n, lng: b.lng / b.n };
      })
      .filter((v): v is VillageDensity & { lat: number; lng: number } => v !== null);
  }, [features, villages]);

  const geojson = useMemo(() => {
    const rank = (s: StatusBand) => (s === 'RED' ? 2 : s === 'AMBER' ? 1 : 0);
    const sorted = [...features].sort(
      (a, b) => rank(a.properties.status) - rank(b.properties.status),
    );
    return { type: 'FeatureCollection', features: sorted } as GeoJsonObject;
  }, [features]);

  const styleFeature = (feature?: Feature) => {
    const status = (feature?.properties as { status?: StatusBand } | undefined)?.status || 'GREEN';
    const canon = (feature?.properties as { village_canon?: string } | undefined)?.village_canon;
    const dim = selectedCanon && canon !== selectedCanon;
    return {
      color: '#0A0A0A',
      weight: 1.5,
      fillColor: FILL[status],
      fillOpacity: dim ? 0.12 : 0.65,
      opacity: dim ? 0.25 : 1,
    };
  };

  const onEach = (feature: Feature, layer: Layer) => {
    const props = feature.properties as ParcelMapFeature['properties'];
    layer.bindTooltip(
      `${props.survey_no} · ${props.village} · ${props.status}`,
      { sticky: true, className: 'officer-map-tip' },
    );
    layer.on('click', () => onOpenParcel(props.id));
  };

  return (
    <div className="relative w-full h-[520px] bg-paper-dark">
      <MapContainer
        center={SULTANPUR}
        zoom={11}
        className="h-full w-full"
        zoomControl
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <MapEffects features={features} selectedCanon={selectedCanon} />
        {villagePoints.map((v) => (
          <CircleMarker
            key={v.village_canon}
            center={[v.lat, v.lng]}
            radius={10 + v.density * 28}
            pathOptions={{
              color: selectedCanon === v.village_canon ? '#0A0A0A' : densityFill(v.density),
              weight: selectedCanon === v.village_canon ? 3 : 1,
              fillColor: densityFill(v.density),
              fillOpacity: selectedCanon && selectedCanon !== v.village_canon ? 0.12 : 0.28,
            }}
            eventHandlers={{
              click: () => onSelectVillage(v.village_canon),
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1} className="officer-map-tip">
              {v.village} · {Math.round(v.density * 100)}% density
            </Tooltip>
          </CircleMarker>
        ))}
        <LeafletGeoJSON
          key={`${selectedCanon || 'all'}-${features.length}`}
          data={geojson}
          style={styleFeature}
          onEachFeature={onEach}
        />
      </MapContainer>

      <div className="absolute bottom-3 left-3 z-[1000] border-2 border-black bg-white/95 font-mono text-[10px] uppercase tracking-wider p-2.5 space-y-1">
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-radar-red" /> RED · active link</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-radar-amber" /> AMBER · verify</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-radar-green" /> GREEN · no match</div>
        <div className="text-ink-muted normal-case tracking-normal pt-1">Circles = village density. Polygons = holdings. Click a gata to open it.</div>
      </div>
    </div>
  );
};
