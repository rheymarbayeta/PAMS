'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { useTheme, THEMES, Theme } from '@/contexts/ThemeContext';

function CheckIcon() {
  return (
    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function ThemeSettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
      <Layout>
        <div className="max-w-3xl">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-slate-800">Theme Settings</h1>
            <p className="mt-1 text-sm text-slate-500">
              Choose a color theme for the entire application. Your preference is saved locally.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {THEMES.map((t) => {
              const isSelected = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id as Theme)}
                  className={`relative text-left rounded-xl border-2 p-4 transition-all duration-200 focus:outline-none focus-visible:ring-2 ${
                    isSelected
                      ? 'border-transparent shadow-lg scale-[1.02]'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-md bg-white'
                  }`}
                  style={isSelected ? {
                    borderColor: t.swatches[2],
                    backgroundColor: t.swatches[4] + '18',
                  } : {}}
                  aria-pressed={isSelected}
                >
                  {/* Selected checkmark */}
                  {isSelected && (
                    <span
                      className="absolute top-3 right-3 h-7 w-7 rounded-full flex items-center justify-center shadow"
                      style={{ backgroundColor: t.swatches[2] }}
                    >
                      <CheckIcon />
                    </span>
                  )}

                  {/* Swatch strip */}
                  <div className="flex rounded-lg overflow-hidden mb-3 h-14 shadow-sm">
                    {t.swatches.map((color, i) => (
                      <div
                        key={i}
                        className="flex-1 transition-transform"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  {/* Theme info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: t.swatches[2] }}
                      />
                      <p className="font-semibold text-slate-800 text-sm">{t.name}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">{t.description}</p>
                  </div>

                  {/* Hex codes */}
                  <div className="mt-3 flex gap-1 flex-wrap">
                    {t.swatches.map((color, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: color + '22',
                          color: t.swatches[0],
                          border: `1px solid ${color}44`,
                        }}
                      >
                        {color}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-6 text-xs text-slate-400">
            Theme changes apply immediately and persist across sessions in your browser.
          </p>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
