'use client';

export function LoadingSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-slate-100" />
        <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-4 border-slate-600 border-t-transparent animate-spin" />
      </div>
      <p className="mt-4 text-slate-600 text-sm font-medium">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 text-center py-12 px-6">
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
    </div>
  );
}
