'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { PageHeader, Button } from '@/components/ui/Primitives';
import { LoadingSpinner } from '@/components/ui/PageStates';
import api from '@/services/api';

interface Channel {
  id: string;
  enabled: boolean;
  mode?: string;
}

interface IntegrationEvent {
  id?: string;
  channel?: string;
  event_type?: string;
  status?: string;
  created_at?: string;
  payload?: unknown;
}

export default function IntegrationsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [smsForm, setSmsForm] = useState({ to: '', message: '' });
  const [smsResult, setSmsResult] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [chRes, evRes] = await Promise.all([
        api.get('/api/integrations/channels'),
        api.get('/api/integrations/events', { params: { limit: 20 } }),
      ]);
      setChannels(chRes.data.data || []);
      setEvents(evRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsForm.to.trim() || !smsForm.message.trim()) return;
    try {
      setSending(true);
      setSmsResult('');
      const res = await api.post('/api/integrations/sms', smsForm);
      setSmsResult(res.data.message || 'SMS queued successfully');
      setSmsForm({ to: '', message: '' });
      await load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to send SMS';
      setSmsResult(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <ProtectedRoute allowedPermissions={['settings', 'integrations_manage']}>
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <PageHeader
            title="Integrations"
            description="External channels and event log"
          />

          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              <section>
                <h2 className="text-sm font-semibold text-slate-700 mb-3">Channels</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {channels.map((ch) => (
                    <div
                      key={ch.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-slate-800 uppercase text-sm">{ch.id}</p>
                        {ch.mode && <p className="text-xs text-slate-500">Mode: {ch.mode}</p>}
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          ch.enabled
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-50 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {ch.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white border border-slate-200 rounded-xl p-4">
                <h2 className="text-sm font-semibold text-slate-700 mb-3">Send SMS</h2>
                <form onSubmit={handleSendSms} className="space-y-3">
                  <input
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Phone number (e.g. +639171234567)"
                    value={smsForm.to}
                    onChange={(e) => setSmsForm({ ...smsForm, to: e.target.value })}
                    required
                  />
                  <textarea
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[80px]"
                    placeholder="Message"
                    value={smsForm.message}
                    onChange={(e) => setSmsForm({ ...smsForm, message: e.target.value })}
                    required
                  />
                  <Button type="submit" disabled={sending}>
                    {sending ? 'Sending…' : 'Send SMS'}
                  </Button>
                  {smsResult && (
                    <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                      {smsResult}
                    </p>
                  )}
                </form>
              </section>

              <section>
                <h2 className="text-sm font-semibold text-slate-700 mb-3">Recent Events</h2>
                {events.length === 0 ? (
                  <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-4">
                    No integration events yet.
                  </p>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {events.map((ev, i) => (
                      <div key={ev.id || i} className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-800">
                            {ev.channel || 'unknown'} — {ev.event_type || 'event'}
                          </span>
                          <span className="text-xs text-slate-400">
                            {ev.created_at ? new Date(ev.created_at).toLocaleString() : ''}
                          </span>
                        </div>
                        {ev.status && (
                          <p className="text-xs text-slate-500 mt-0.5">Status: {ev.status}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
