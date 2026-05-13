'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import type { Layer, PathOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { BarangayCount } from './BarangayMap';

interface Props {
  counts: BarangayCount[];
}

function getColor(count: number, max: number): string {
  if (max === 0 || count === 0) return '#f0fdf4';
  const t = count / max;
  if (t < 0.2) return '#bbf7d0';
  if (t < 0.4) return '#4ade80';
  if (t < 0.6) return '#16a34a';
  if (t < 0.8) return '#15803d';
  return '#14532d';
}

function FitBounds({ data }: { data: any }) {
  const map = useMap();
  useEffect(() => {
    if (!data) return;
    try {
      const L = require('leaflet');
      const layer = L.geoJSON(data);
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [12, 12] });
    } catch { /* ignore */ }
  }, [data, map]);
  return null;
}

export default function BarangayMapInner({ counts }: Props) {
  const [geoData, setGeoData] = useState<any>(null);
  const [roadsData, setRoadsData] = useState<any>(null);

  useEffect(() => {
    // Fix Leaflet default icon paths broken by webpack
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const L = require('leaflet');
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    fetch('/dalaguete.geojson')
      .then(r => r.json())
      .then(data => {
        const filtered = {
          ...data,
          features: data.features.filter((f: any) => {
            const name: string = (f?.properties?.BRGY ?? '').trim().toUpperCase();
            return name !== 'FORESHORE1' && name !== 'FORESHORE2';
          }),
        };
        setGeoData(filtered);
      })
      .catch(() => console.warn('dalaguete.geojson not found — place it in frontend/public/'));

    fetch('/dalaguete-roads.geojson')
      .then(r => r.json())
      .then(setRoadsData)
      .catch(() => console.warn('dalaguete-roads.geojson not found — run convert-roads-to-geojson.js'));
  }, []);

  const countMap = new Map<string, BarangayCount>(
    counts.map(c => [c.barangay.trim().toUpperCase(), c])
  );
  const max = Math.max(0, ...counts.map(c => c.total));

  const styleFeature = (feature: any): PathOptions => {
    const name: string = (feature?.properties?.BRGY ?? '').trim().toUpperCase();
    const count = countMap.get(name)?.total ?? 0;
    return {
      fillColor: getColor(count, max),
      fillOpacity: 0.75,
      color: '#64748b',
      weight: 1,
    };
  };

  const onEachFeature = (feature: any, layer: Layer) => {
    const name: string = (feature?.properties?.BRGY ?? 'Unknown').trim();
    const displayName = name.charAt(0) + name.slice(1).toLowerCase();
    const data = countMap.get(name.toUpperCase());
    const total = data?.total ?? 0;

    const buildHoverHtml = () => {
      const permitLines = data?.permits
        .map((p, i) => `<div style="display:flex;justify-content:space-between;gap:12px"><span>${i + 1}. ${p.permit_type}</span><span style="font-weight:600">${p.count}</span></div>`)
        .join('') ?? '';
      return `
        <div style="font-size:12px;font-weight:700;margin-bottom:4px;border-bottom:1px solid #e2e8f0;padding-bottom:3px">${displayName}</div>
        ${total > 0 ? permitLines : '<div style="font-size:11px;color:#94a3b8">No applications</div>'}
        ${total > 0 ? `<div style="font-size:11px;color:#64748b;margin-top:3px;border-top:1px solid #e2e8f0;padding-top:3px">Total: ${total}</div>` : ''}
      `;
    };

    // Permanent centred label showing the barangay name
    (layer as any).bindTooltip(
      `<span>${displayName}</span>`,
      { permanent: true, direction: 'center', className: 'leaflet-brgy-label' }
    );

    // Hover popup showing permit breakdown
    (layer as any).on({
      mouseover(e: any) {
        e.target.setStyle({ fillOpacity: 0.95, weight: 2, color: '#0d9488' });
        e.target.unbindTooltip();
        e.target.bindTooltip(buildHoverHtml(),
          { sticky: true, className: 'leaflet-brgy-tooltip' }
        ).openTooltip();
      },
      mouseout(e: any) {
        e.target.setStyle(styleFeature(feature));
        e.target.unbindTooltip();
        e.target.bindTooltip(
          `<span>${displayName}</span>`,
          { permanent: true, direction: 'center', className: 'leaflet-brgy-label' }
        );
      },
    });
  };

  return (
    <>
      <style>{`
        .leaflet-brgy-label {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          font-size: 10px;
          font-weight: 700;
          color: #1e293b;
          text-shadow: 0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff;
          white-space: nowrap;
          pointer-events: none;
        }
        .leaflet-brgy-label::before { display: none !important; }
        .leaflet-brgy-tooltip {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 4px 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          pointer-events: none;
        }
        .leaflet-container {
          border-radius: 8px;
          isolation: isolate;
          z-index: 0;
        }
        .leaflet-pane,
        .leaflet-control-container { z-index: unset !important; }
        .leaflet-map-pane    { z-index: 2 !important; }
        .leaflet-tile-pane   { z-index: 2 !important; }
        .leaflet-overlay-pane{ z-index: 4 !important; }
        .leaflet-shadow-pane { z-index: 5 !important; }
        .leaflet-marker-pane { z-index: 6 !important; }
        .leaflet-tooltip-pane{ z-index: 7 !important; }
        .leaflet-popup-pane  { z-index: 8 !important; }
        .leaflet-top,
        .leaflet-bottom      { z-index: 9 !important; }
      `}</style>
      <MapContainer
        center={[9.76, 123.52]}
        zoom={11}
        style={{ height: '100%', width: '100%', minHeight: 280 }}
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        />
        {geoData && <FitBounds data={geoData} />}
        {geoData && (
          <GeoJSON
            key={geoData.features?.length}
            data={geoData}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        )}
        {roadsData && (
          <GeoJSON
            key={'roads-' + roadsData.features?.length}
            data={roadsData}
            style={() => ({ color: '#374151', weight: 1.5, opacity: 0.7, fill: false })}
            onEachFeature={(feature: any, layer: Layer) => {
              const name = feature?.properties?.Name?.trim();
              if (name) {
                (layer as any).bindTooltip(
                  `<div style="font-size:11px;font-weight:600">${name}</div>`,
                  { sticky: true, className: 'leaflet-brgy-tooltip' }
                );
              }
            }}
          />
        )}
      </MapContainer>
    </>
  );
}
