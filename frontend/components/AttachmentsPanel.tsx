'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';

export function AttachmentsPanel({
  module,
  referenceType,
  referenceId,
}: {
  module: string;
  referenceType: string;
  referenceId: string;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/api/attachments', {
        params: { module, reference_type: referenceType, reference_id: referenceId },
      });
      setRows(res.data.data || []);
    } catch {
      setRows([]);
    }
  };

  useEffect(() => {
    if (referenceId) load();
  }, [module, referenceType, referenceId]);

  const onUpload = async (file: File | null) => {
    if (!file) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('module', module);
      fd.append('reference_type', referenceType);
      fd.append('reference_id', referenceId);
      await api.post('/api/attachments', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await load();
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const download = async (id: string, name: string) => {
    const token = localStorage.getItem('token');
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    const res = await fetch(`${base}/api/attachments/${id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">Attachments</h3>
        <label className="text-xs px-3 py-1.5 rounded-lg text-white cursor-pointer" style={{ backgroundColor: 'var(--primary)' }}>
          {uploading ? 'Uploading…' : 'Upload'}
          <input
            type="file"
            className="hidden"
            disabled={uploading}
            onChange={(e) => onUpload(e.target.files?.[0] || null)}
          />
        </label>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No files attached.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.attachment_id} className="py-2 flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-slate-700">{r.file_name}</span>
              <button
                type="button"
                className="text-xs text-teal-700 hover:underline"
                onClick={() => download(r.attachment_id, r.file_name)}
              >
                Download
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
