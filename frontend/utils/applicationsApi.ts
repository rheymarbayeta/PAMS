/**
 * Normalize GET /api/applications responses.
 * Phase 1 returns { data, pagination }; older callers expected a bare array.
 */
export function unwrapApplicationsList(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && Array.isArray((payload as any).data)) {
    return (payload as any).data;
  }
  if (payload && typeof payload === 'object' && Array.isArray((payload as any).applications)) {
    return (payload as any).applications;
  }
  return [];
}
