'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import type { Layer, PathOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface BarangayCount {
  barangay: string;
  count: number;
}

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

  const countMap = new Map<string, number>(
    counts.map(c => [c.barangay.trim().toUpperCase(), c.count])
  );
  const max = Math.max(0, ...counts.map(c => c.count));

  const styleFeature = (feature: any): PathOptions => {
    const name: string = (feature?.properties?.BRGY ?? '').trim().toUpperCase();
    const count = countMap.get(name) ?? 0;
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
    const count = countMap.get(name.toUpperCase()) ?? 0;

    // Permanent centred label showing the barangay name
    (layer as any).bindTooltip(
      `<span>${displayName}</span>`,
      { permanent: true, direction: 'center', className: 'leaflet-brgy-label' }
    );

    // Hover popup showing permit count
    (layer as any).on({
      mouseover(e: any) {
        e.target.setStyle({ fillOpacity: 0.95, weight: 2, color: '#0d9488' });
        e.target.unbindTooltip();
        e.target.bindTooltip(
          `<div style="font-size:12px;font-weight:600">${displayName}</div><div style="font-size:11px">${count} permit${count !== 1 ? 's' : ''}</div>`,
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
        .leaflet-container { border-radius: 8px; }
      `}</style>
      <MapContainer
        center={[9.76, 123.52]}
        zoom={12}
        style={{ height: '100%', width: '100%', minHeight: 280 }}
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        />
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
