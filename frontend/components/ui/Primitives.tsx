'use client';

import React from 'react';

export function StatusBadge({
  status,
  toneMap,
}: {
  status: string;
  toneMap?: Record<string, string>;
}) {
  const defaults: Record<string, string> = {
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Approved: 'bg-teal-50 text-teal-700 border-teal-200',
    Rejected: 'bg-red-50 text-red-700 border-red-200',
    Issued: 'bg-sky-50 text-sky-700 border-sky-200',
    Released: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  const cls = (toneMap && toneMap[status]) || defaults[status] || 'bg-slate-50 text-slate-700 border-slate-200';
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${cls}`}>
      {status}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const base = 'inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50';
  const variants = {
    primary: 'text-white',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      style={variant === 'primary' ? { backgroundColor: 'var(--primary)' } : undefined}
      {...props}
    >
      {children}
    </button>
  );
}

export function Surface({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border p-4 ${className}`}
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--surface-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {label}
      </span>
      {children}
      {hint && (
        <span className="block text-xs" style={{ color: 'var(--text-secondary)' }}>
          {hint}
        </span>
      )}
    </label>
  );
}

export function TextField({
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--primary-ring)] ${className}`}
      style={{
        borderColor: 'var(--surface-border)',
        borderRadius: 'var(--radius-md)',
      }}
      {...props}
    />
  );
}
