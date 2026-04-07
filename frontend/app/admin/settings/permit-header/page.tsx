'use client';

import { useState, useEffect, useRef } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import Link from 'next/link';

// ─── Crop Modal ───────────────────────────────────────────────────────────────

interface CropRect { x: number; y: number; w: number; h: number; }

function LogoCropModal({ dataUrl, onApply, onCancel }: {
  dataUrl: string;
  onApply: (result: string) => void;
  onCancel: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
  const dragRef = useRef<{ type: string; startX: number; startY: number; startCrop: CropRect } | null>(null);

  const MAX_W = 480;

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const scale = nw > MAX_W ? MAX_W / nw : 1;
    const dw = Math.round(nw * scale), dh = Math.round(nh * scale);
    setNaturalSize({ w: nw, h: nh });
    setDisplaySize({ w: dw, h: dh });
    setCrop({ x: 0, y: 0, w: dw, h: dh });
  };

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const constrain = (c: CropRect, dw: number, dh: number): CropRect => {
    const MIN = 20;
    let { x, y, w, h } = c;
    w = clamp(w, MIN, dw); h = clamp(h, MIN, dh);
    x = clamp(x, 0, dw - w); y = clamp(y, 0, dh - h);
    w = clamp(w, MIN, dw - x); h = clamp(h, MIN, dh - y);
    return { x, y, w, h };
  };

  const startDrag = (type: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragRef.current = { type, startX: e.clientX, startY: e.clientY, startCrop: { ...crop } };
  };

  useEffect(() => {
    if (!displaySize.w) return;
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { type, startX, startY, startCrop: s } = dragRef.current;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      let c = { ...s };
      if (type === 'move')      { c.x += dx; c.y += dy; }
      else if (type === 'nw')   { c.x += dx; c.y += dy; c.w -= dx; c.h -= dy; }
      else if (type === 'ne')   { c.y += dy; c.w += dx; c.h -= dy; }
      else if (type === 'sw')   { c.x += dx; c.w -= dx; c.h += dy; }
      else if (type === 'se')   { c.w += dx; c.h += dy; }
      setCrop(constrain(c, displaySize.w, displaySize.h));
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [displaySize]);

  const handleApply = () => {
    if (!imgRef.current || !naturalSize.w) return;
    const sx = naturalSize.w / displaySize.w, sy = naturalSize.h / displaySize.h;
    const targetH = 120;
    const targetW = Math.max(1, Math.round((crop.w * sx) / (crop.h * sy) * targetH));
    const canvas = document.createElement('canvas');
    canvas.width = targetW; canvas.height = targetH;
    canvas.getContext('2d')!.drawImage(
      imgRef.current,
      crop.x * sx, crop.y * sy, crop.w * sx, crop.h * sy,
      0, 0, targetW, targetH
    );
    onApply(canvas.toDataURL('image/png'));
  };

  const handles: { type: string; style: React.CSSProperties }[] = [
    { type: 'nw', style: { top: -6, left:  -6, cursor: 'nw-resize' } },
    { type: 'ne', style: { top: -6, right: -6, cursor: 'ne-resize' } },
    { type: 'sw', style: { bottom: -6, left:  -6, cursor: 'sw-resize' } },
    { type: 'se', style: { bottom: -6, right: -6, cursor: 'se-resize' } },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Crop Logo</h3>
        <p className="text-sm text-gray-500 mb-4">Drag inside the box to move. Drag corners to resize the crop area.</p>
        <div className="flex justify-center mb-2">
          <div
            className="relative select-none overflow-hidden border border-gray-200 rounded"
            style={{ width: displaySize.w || MAX_W, height: displaySize.h || 200, background: '#eee' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={dataUrl}
              onLoad={handleImageLoad}
              draggable={false}
              alt="crop source"
              style={{ width: displaySize.w, height: displaySize.h, display: 'block' }}
            />
            {displaySize.w > 0 && (
              <>
                {/* Overlay masks */}
                <div style={{ position:'absolute', top:0, left:0, right:0, height: crop.y, background:'rgba(0,0,0,0.55)' }} />
                <div style={{ position:'absolute', top: crop.y + crop.h, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.55)' }} />
                <div style={{ position:'absolute', top: crop.y, left:0, width: crop.x, height: crop.h, background:'rgba(0,0,0,0.55)' }} />
                <div style={{ position:'absolute', top: crop.y, left: crop.x + crop.w, right:0, height: crop.h, background:'rgba(0,0,0,0.55)' }} />
                {/* Crop box */}
                <div
                  style={{ position:'absolute', top: crop.y, left: crop.x, width: crop.w, height: crop.h, border:'2px solid white', boxShadow:'0 0 0 1px rgba(0,0,0,0.4)', cursor:'move' }}
                  onMouseDown={(e) => startDrag('move', e)}
                >
                  {handles.map(h => (
                    <div key={h.type}
                      style={{ position:'absolute', width:12, height:12, background:'white', border:'1px solid rgba(0,0,0,0.4)', borderRadius:2, ...h.style }}
                      onMouseDown={(e) => startDrag(h.type, e)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center mb-4">
          {Math.round(crop.w)} × {Math.round(crop.h)} px selected
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium">
            Cancel
          </button>
          <button onClick={handleApply} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium">
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Logo Upload Card ─────────────────────────────────────────────────────────

function LogoUploadCard({ label, settingKey, savedUrl, previewDataUrl, uploading, onFileSelect, onClear }: {
  label: string;
  settingKey: string;
  savedUrl: string;
  previewDataUrl: string;
  uploading: boolean;
  onFileSelect: (key: string, file: File) => void;
  onClear: (key: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const displayUrl = previewDataUrl
    || (savedUrl ? (savedUrl.startsWith('http') ? savedUrl : `${apiBase}${savedUrl}`) : null);

  return (
    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center gap-3 hover:border-indigo-300 transition-colors">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {displayUrl ? (
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex justify-center w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayUrl} alt={label} className="h-16 w-auto max-w-full object-contain" />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-medium disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Change'}
            </button>
            <button
              onClick={() => onClear(settingKey)}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 font-medium"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center gap-2 text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-50 w-full py-4"
        >
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium">{uploading ? 'Uploading…' : 'Click to upload'}</span>
          <span className="text-xs text-gray-400">PNG, JPG, WebP up to 5 MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(settingKey, f); e.target.value = ''; }}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DEFAULT_LINES: Record<string, string> = {
  permit_header_line_1: 'REPUBLIC OF THE PHILIPPINES',
  permit_header_line_2: 'MUNICIPALITY OF DALAGUETE',
  permit_header_line_3: 'PROVINCE OF CEBU',
  permit_header_line_4: 'OFFICE OF THE MUNICIPAL MAYOR',
  permit_header_line_5: 'Tel. # 520 4141 loc. 315',
};

interface FormData {
  permit_header_logo_left: string;
  permit_header_logo_right: string;
  permit_header_line_1: string;
  permit_header_line_2: string;
  permit_header_line_3: string;
  permit_header_line_4: string;
  permit_header_line_5: string;
  permit_header_font_size: string;
  permit_header_logo_size: string;
}

export default function PermitHeaderSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    permit_header_logo_left: '',
    permit_header_logo_right: '',
    permit_header_line_1: DEFAULT_LINES.permit_header_line_1,
    permit_header_line_2: DEFAULT_LINES.permit_header_line_2,
    permit_header_line_3: DEFAULT_LINES.permit_header_line_3,
    permit_header_line_4: DEFAULT_LINES.permit_header_line_4,
    permit_header_line_5: DEFAULT_LINES.permit_header_line_5,
    permit_header_font_size: '11',
    permit_header_logo_size: '50',
  });
  const [logoPreview, setLogoPreview] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [cropModal, setCropModal] = useState<{ dataUrl: string; key: string } | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    api.get('/api/settings').then(r => {
      const d = r.data;
      setFormData({
        permit_header_logo_left:  d.permit_header_logo_left?.value  || '',
        permit_header_logo_right: d.permit_header_logo_right?.value || '',
        permit_header_line_1: d.permit_header_line_1?.value ?? DEFAULT_LINES.permit_header_line_1,
        permit_header_line_2: d.permit_header_line_2?.value ?? DEFAULT_LINES.permit_header_line_2,
        permit_header_line_3: d.permit_header_line_3?.value ?? DEFAULT_LINES.permit_header_line_3,
        permit_header_line_4: d.permit_header_line_4?.value ?? DEFAULT_LINES.permit_header_line_4,
        permit_header_line_5: d.permit_header_line_5?.value ?? DEFAULT_LINES.permit_header_line_5,
        permit_header_font_size: d.permit_header_font_size?.value ?? '11',
        permit_header_logo_size: d.permit_header_logo_size?.value ?? '50',
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleFileSelect = (key: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setCropModal({ dataUrl: e.target!.result as string, key });
    reader.readAsDataURL(file);
  };

  const handleCropApply = async (croppedDataUrl: string) => {
    const key = cropModal!.key;
    setCropModal(null);
    setLogoPreview(prev => ({ ...prev, [key]: croppedDataUrl }));
    setUploading(prev => ({ ...prev, [key]: true }));
    try {
      const blob = await (await fetch(croppedDataUrl)).blob();
      const fd = new FormData();
      fd.append('logo', blob, 'logo.png');
      const res = await api.post('/api/settings/upload-logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFormData(prev => ({ ...prev, [key]: res.data.url }));
    } catch {
      alert('Failed to upload logo. Please try again.');
      setLogoPreview(prev => { const n = { ...prev }; delete n[key]; return n; });
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleClearLogo = (key: string) => {
    setFormData(prev => ({ ...prev, [key]: '' }));
    setLogoPreview(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(formData).map(([key, value]) =>
          api.put(`/api/settings/${key}`, { value })
        )
      );
      alert('Header settings saved successfully');
    } catch {
      alert('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getLogoSrc = (key: 'permit_header_logo_left' | 'permit_header_logo_right') => {
    if (logoPreview[key]) return logoPreview[key];
    const v = formData[key];
    if (!v) return null;
    return v.startsWith('http') ? v : `${apiBase}${v}`;
  };

  const leftLogoSrc  = getLogoSrc('permit_header_logo_left');
  const rightLogoSrc = getLogoSrc('permit_header_logo_right');

  if (loading) return (
    <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
      <Layout>
        <div className="flex justify-center items-center py-20">
          <div className="h-10 w-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
        </div>
      </Layout>
    </ProtectedRoute>
  );

  return (
    <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
      <Layout>
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/admin/settings" className="hover:text-indigo-600 transition-colors">Settings</Link>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-medium text-gray-900">Permit Header</span>
          </div>

          {/* Page header */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-.293.707L13 15.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-5.586L4.293 7.707A1 1 0 014 7V5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Permit Header Settings</h1>
              <p className="text-sm text-gray-500">Customize the logo(s) and header text on permit documents</p>
            </div>
          </div>

          {/* Live Preview */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/50 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Live Preview</h2>
            <div className="border border-gray-200 rounded-xl bg-gray-50 p-6 flex justify-center">
              <div className="flex items-center gap-4">
                {leftLogoSrc && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={leftLogoSrc} alt="Left logo"
                    style={{ height: `${Math.max(20, Math.min(120, Number(formData.permit_header_logo_size) || 50))}px`, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
                  />
                )}
                {(() => {
                  const base = Math.max(6, Math.min(32, Number(formData.permit_header_font_size) || 11));
                  const line4Size = Math.round(base * 1.45);
                  return (
                    <div className="text-center leading-snug">
                      {formData.permit_header_line_1 && (
                        <div style={{ fontSize: base, fontWeight: 'bold' }}>{formData.permit_header_line_1}</div>
                      )}
                      {formData.permit_header_line_2 && (
                        <div style={{ fontSize: base, fontWeight: 'bold' }}>{formData.permit_header_line_2}</div>
                      )}
                      {formData.permit_header_line_3 && (
                        <div style={{ fontSize: base, fontWeight: 'bold' }}>{formData.permit_header_line_3}</div>
                      )}
                      {formData.permit_header_line_4 && (
                        <div style={{ fontSize: line4Size, fontWeight: 'bold', marginTop: 2 }}>{formData.permit_header_line_4}</div>
                      )}
                      {formData.permit_header_line_5 && (
                        <div style={{ fontSize: base, fontWeight: 'normal', marginTop: 2 }}>{formData.permit_header_line_5}</div>
                      )}
                    </div>
                  );
                })()}
                {rightLogoSrc && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={rightLogoSrc} alt="Right logo"
                    style={{ height: `${Math.max(20, Math.min(120, Number(formData.permit_header_logo_size) || 50))}px`, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Logo uploads */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/50 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Logos</h2>
            <p className="text-sm text-gray-500 mb-4">
              Upload one or two logos. The left logo is primary (e.g., municipality seal). After selecting a file, you can crop it before uploading.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LogoUploadCard
                label="Left Logo"
                settingKey="permit_header_logo_left"
                savedUrl={formData.permit_header_logo_left}
                previewDataUrl={logoPreview['permit_header_logo_left'] || ''}
                uploading={uploading['permit_header_logo_left'] || false}
                onFileSelect={handleFileSelect}
                onClear={handleClearLogo}
              />
              <LogoUploadCard
                label="Right Logo (optional)"
                settingKey="permit_header_logo_right"
                savedUrl={formData.permit_header_logo_right}
                previewDataUrl={logoPreview['permit_header_logo_right'] || ''}
                uploading={uploading['permit_header_logo_right'] || false}
                onFileSelect={handleFileSelect}
                onClear={handleClearLogo}
              />
            </div>
          </div>

          {/* Header text lines */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/50 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Header Text Lines</h2>
            <p className="text-sm text-gray-500 mb-4">
              Lines are printed top to bottom. Line 4 is displayed larger as the office/department name. Leave a field blank to hide that line.
            </p>

            {/* Font size control */}
            <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base Font Size
                <span className="ml-2 text-indigo-600 font-semibold">{formData.permit_header_font_size} px</span>
                <span className="ml-1 text-gray-400 font-normal text-xs">(Line 4 scales up automatically)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={7}
                  max={20}
                  step={1}
                  value={formData.permit_header_font_size}
                  onChange={(e) => setFormData(prev => ({ ...prev, permit_header_font_size: e.target.value }))}
                  className="flex-1 h-2 accent-indigo-600"
                />
                <input
                  type="number"
                  min={7}
                  max={20}
                  value={formData.permit_header_font_size}
                  onChange={(e) => {
                    const v = Math.max(7, Math.min(20, Number(e.target.value) || 11));
                    setFormData(prev => ({ ...prev, permit_header_font_size: String(v) }));
                  }}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-center text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1 px-0.5">
                <span>7 px (smaller)</span>
                <span>20 px (larger)</span>
              </div>
            </div>

            {/* Logo size control */}
            <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo Height
                <span className="ml-2 text-indigo-600 font-semibold">{formData.permit_header_logo_size} px</span>
                <span className="ml-1 text-gray-400 font-normal text-xs">(width scales automatically)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={20}
                  max={120}
                  step={2}
                  value={formData.permit_header_logo_size}
                  onChange={(e) => setFormData(prev => ({ ...prev, permit_header_logo_size: e.target.value }))}
                  className="flex-1 h-2 accent-indigo-600"
                />
                <input
                  type="number"
                  min={20}
                  max={120}
                  value={formData.permit_header_logo_size}
                  onChange={(e) => {
                    const v = Math.max(20, Math.min(120, Number(e.target.value) || 50));
                    setFormData(prev => ({ ...prev, permit_header_logo_size: String(v) }));
                  }}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-center text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1 px-0.5">
                <span>20 px (small)</span>
                <span>120 px (large)</span>
              </div>
            </div>

            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(n => {
                const key = `permit_header_line_${n}` as keyof FormData;
                return (
                  <div key={n}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Line {n}{' '}
                      {n === 4 && <span className="text-gray-400 font-normal">(office name — displayed larger)</span>}
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                      placeholder={DEFAULT_LINES[key] || ''}
                      value={formData[key]}
                      onChange={(e) => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end pb-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Settings
                </>
              )}
            </button>
          </div>

        </div>

        {/* Crop modal (portal-style) */}
        {cropModal && (
          <LogoCropModal
            dataUrl={cropModal.dataUrl}
            onApply={handleCropApply}
            onCancel={() => setCropModal(null)}
          />
        )}
      </Layout>
    </ProtectedRoute>
  );
}
