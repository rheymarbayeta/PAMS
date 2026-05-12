'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import api from '@/services/api';

export interface BarangayCount {
  barangay: string;
  total: number;
  permits: { permit_type: string; count: number }[];
}

// Leaflet must be loaded client-side only (no SSR)
const MapInner = dynamic(() => import('./BarangayMapInner'), { ssr: false, loading: () => (
  <div className="h-full w-full flex items-center justify-center">
    <div className="text-sm text-slate-400 animate-pulse">Loading map…</div>
  </div>
) });

export default function BarangayMap() {
  const [counts, setCounts] = useState<BarangayCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/dashboard/permits-by-barangay')
      .then(r => setCounts(r.data))
      .catch(err => console.error('Map data error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-sm text-slate-400 animate-pulse">Loading map data…</div>
      </div>
    );
  }

  return <MapInner counts={counts} />;
}
