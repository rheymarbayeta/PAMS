'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function PortalLandingPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Image
            src="/dalaguete-logo.png"
            alt="Municipality of Dalaguete"
            width={40}
            height={40}
            className="object-contain"
          />
          <div>
            <p className="text-lg font-bold text-slate-800">PAMS Citizen Portal</p>
            <p className="text-xs text-slate-500">Permit Assessment &amp; Management System</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-xl shadow-soft border border-slate-200 p-8 text-center space-y-6">
          <div className="mx-auto h-14 w-14 rounded-xl bg-teal-700 flex items-center justify-center">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Welcome</h1>
            <p className="mt-2 text-sm text-slate-500">
              Check the status of your permit application online — no login required.
            </p>
          </div>
          <Link
            href="/portal/track"
            className="inline-flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--primary, #0f766e)' }}
          >
            Track Application
          </Link>
          <p className="text-xs text-slate-400">
            Staff login?{' '}
            <Link href="/login" className="text-teal-700 hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
