'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/i18n/LocaleProvider';
import { StatusBadge } from '@/components/ui/Primitives';

interface TrackResult {
  application_number: string;
  permit_type: string;
  status: string;
  entity_name: string;
  submitted_at: string;
  issued_at: string | null;
  validity_date: string | null;
  public_message: string;
}

export default function PortalTrackPage() {
  const { t } = useI18n();
  const [applicationNumber, setApplicationNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TrackResult | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const number = applicationNumber.trim();
    if (!number) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(
        `${base}/api/portal/track?application_number=${encodeURIComponent(number)}`
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || json.error || 'Application not found');
        return;
      }
      setResult(json.data);
    } catch {
      setError('Unable to reach the server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/portal" className="flex items-center gap-3">
            <Image
              src="/dalaguete-logo.png"
              alt="PAMS"
              width={36}
              height={36}
              className="object-contain"
            />
            <span className="text-base font-bold text-slate-800">PAMS Portal</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-10">
        <h1 className="text-xl font-bold text-slate-800 mb-1">{t('portal_track')}</h1>
        <p className="text-sm text-slate-500 mb-6">Enter your application number to view its current status.</p>

        <form onSubmit={handleSearch} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <label htmlFor="application_number" className="block text-sm font-medium text-slate-700 mb-1">
              Application Number
            </label>
            <input
              id="application_number"
              type="text"
              value={applicationNumber}
              onChange={(e) => setApplicationNumber(e.target.value)}
              placeholder="e.g. APP-2026-0001"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary, #0f766e)' }}
          >
            {loading ? 'Searching…' : t('search')}
          </button>
        </form>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-800">{result.application_number}</h2>
              <StatusBadge status={result.status} />
            </div>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div>
                <dt className="text-slate-500">Permit Type</dt>
                <dd className="text-slate-800">{result.permit_type}</dd>
              </div>
              {result.entity_name && (
                <div>
                  <dt className="text-slate-500">Entity</dt>
                  <dd className="text-slate-800">{result.entity_name}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500">Submitted</dt>
                <dd className="text-slate-800">
                  {result.submitted_at ? new Date(result.submitted_at).toLocaleDateString() : '—'}
                </dd>
              </div>
              {result.issued_at && (
                <div>
                  <dt className="text-slate-500">Issued</dt>
                  <dd className="text-slate-800">{new Date(result.issued_at).toLocaleDateString()}</dd>
                </div>
              )}
              {result.validity_date && (
                <div>
                  <dt className="text-slate-500">Valid Until</dt>
                  <dd className="text-slate-800">{new Date(result.validity_date).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
            <p className="text-sm text-teal-800 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
              {result.public_message}
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          <Link href="/portal" className="text-teal-700 hover:underline">
            ← Back to portal
          </Link>
        </p>
      </main>
    </div>
  );
}
