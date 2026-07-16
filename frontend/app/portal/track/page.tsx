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
  payment_eligible?: boolean;
}

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function PortalTrackPage() {
  const { t } = useI18n();
  const [applicationNumber, setApplicationNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TrackResult | null>(null);

  const [destination, setDestination] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [otp, setOtp] = useState('');
  const [debugOtp, setDebugOtp] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [amount, setAmount] = useState('');
  const [payerName, setPayerName] = useState('');
  const [intentMsg, setIntentMsg] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const number = applicationNumber.trim();
    if (!number) return;

    setLoading(true);
    setError('');
    setResult(null);
    setSessionToken('');
    setChallengeId('');
    setIntentMsg('');

    try {
      const res = await fetch(
        `${apiBase()}/api/portal/track?application_number=${encodeURIComponent(number)}`
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

  const requestOtp = async () => {
    setError('');
    setIntentMsg('');
    try {
      const res = await fetch(`${apiBase()}/api/portal/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_number: applicationNumber.trim(),
          channel: 'sms',
          destination: destination || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'OTP request failed');
        return;
      }
      setChallengeId(json.challenge_id);
      setDebugOtp(json.debug_otp || '');
      setIntentMsg(json.message || 'OTP sent');
    } catch {
      setError('OTP request failed');
    }
  };

  const verifyOtp = async () => {
    setError('');
    try {
      const res = await fetch(`${apiBase()}/api/portal/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_id: challengeId, otp }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'OTP verify failed');
        return;
      }
      setSessionToken(json.session_token);
      setIntentMsg('Verified. You can submit a payment intent.');
    } catch {
      setError('OTP verify failed');
    }
  };

  const submitIntent = async () => {
    setError('');
    try {
      const res = await fetch(`${apiBase()}/api/portal/payments/intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Portal-Session': sessionToken,
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          payer_name: payerName || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Payment intent failed');
        return;
      }
      setIntentMsg(`${json.message} (ref: ${json.intent_id})`);
    } catch {
      setError('Payment intent failed');
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
        <p className="text-sm text-slate-500 mb-6">
          Enter your application number to view status, verify via OTP, and submit a payment intent.
        </p>

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
            </dl>
            <p className="text-sm text-teal-800 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
              {result.public_message}
            </p>

            {result.payment_eligible && (
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-800">Verify & payment intent</h3>
                {!sessionToken && (
                  <>
                    <input
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="Mobile number (optional if on file)"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={requestOtp}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
                    >
                      Request OTP
                    </button>
                    {challengeId && (
                      <>
                        {debugOtp && (
                          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1">
                            Debug OTP: {debugOtp}
                          </p>
                        )}
                        <input
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          placeholder="Enter 6-digit OTP"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={verifyOtp}
                          className="w-full px-3 py-2 text-sm rounded-lg text-white"
                          style={{ backgroundColor: 'var(--primary, #0f766e)' }}
                        >
                          Verify OTP
                        </button>
                      </>
                    )}
                  </>
                )}
                {sessionToken && (
                  <>
                    <input
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="Payer name"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                    />
                    <input
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="Amount (₱)"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={submitIntent}
                      className="w-full px-3 py-2 text-sm rounded-lg text-white"
                      style={{ backgroundColor: 'var(--primary, #0f766e)' }}
                    >
                      Submit payment intent
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {intentMsg && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm">
            {intentMsg}
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
