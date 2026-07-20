export type AppParam = { param_name: string; param_value: string };
export type DateMode = 'range' | 'multiple' | 'yearly';

/** Default permit parameters by assessment attribute (ported from legacy /applications/new). */
export function getDefaultParameters(attributeName: string): AppParam[] {
  const attr = (attributeName || '').trim().toLowerCase();
  const isMahjong = attr === 'mahjong';
  const isSpecialCockfight = attr === 'special cockfight';
  const isMotorcade = attr === 'motorcade';
  const isDisco = attr === 'disco';

  let mahjongValidUntil = '';
  if (isMahjong) {
    const yearEnd = new Date(new Date().getFullYear(), 11, 31);
    mahjongValidUntil = formatDateInput(yearEnd);
  }

  if (isSpecialCockfight) {
    return [
      { param_name: 'Date', param_value: '' },
      { param_name: 'Conduct/engage in', param_value: 'Special Cockfight' },
      { param_name: 'Valid Until', param_value: '' },
      { param_name: 'SB Resolution No.', param_value: '' },
      { param_name: 'Location', param_value: '' },
    ];
  }

  if (isMotorcade) {
    return [
      { param_name: 'Date', param_value: '' },
      { param_name: 'Conduct/engage in', param_value: 'Motorcade' },
      { param_name: 'Valid Until', param_value: '' },
      { param_name: 'Route', param_value: '' },
      { param_name: 'Location', param_value: '' },
    ];
  }

  if (isDisco) {
    return [
      { param_name: 'Date', param_value: '' },
      { param_name: 'Conduct/engage in', param_value: 'Disco' },
      { param_name: 'Valid Until', param_value: '' },
      { param_name: 'Purpose', param_value: '' },
      { param_name: 'Attachment', param_value: '' },
      { param_name: 'Location', param_value: '' },
    ];
  }

  return [
    { param_name: isMahjong ? 'Location' : 'Date', param_value: '' },
    { param_name: isMahjong ? 'Color' : 'Conduct/engage in', param_value: '' },
    { param_name: 'Valid Until', param_value: mahjongValidUntil },
    { param_name: 'Attachment', param_value: '' },
    { param_name: isMahjong ? '' : 'Location', param_value: '' },
  ].filter((p) => p.param_name !== '');
}

export function formatDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
}

export function formatDateText(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatRangeMode(rangeStart: Date | null, rangeEnd: Date | null): string {
  if (!rangeStart || !rangeEnd) return '';
  return `${formatDateText(rangeStart)} up to ${formatDateText(rangeEnd)}`;
}

export function formatMultipleDatesMode(selectedDates: Date[]): string {
  if (selectedDates.length === 0) return '';

  const sorted = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
  const grouped: { [key: string]: { day: number; date: Date }[] } = {};
  sorted.forEach((date) => {
    const key = `${date.getMonth()}-${date.getFullYear()}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({ day: date.getDate(), date });
  });

  const parts: string[] = [];
  Object.keys(grouped)
    .sort()
    .forEach((key) => {
      const dates = grouped[key];
      const firstDate = dates[0].date;
      const monthYear = firstDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (dates.length === 1) {
        parts.push(
          firstDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        );
      } else {
        parts.push(`${dates.map((d) => d.day).join(', ')} ${monthYear}`);
      }
    });

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} & ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')} & ${parts[parts.length - 1]}`;
}

/** Expand range or multi-select into MM-DD-YYYY strings for calendar (Special Cockfight). */
export function buildPermittedDateStrings(
  dateMode: DateMode,
  rangeStart: Date | null,
  rangeEnd: Date | null,
  selectedDates: Date[]
): string[] {
  let individualDates: Date[] = [];
  if (dateMode === 'range' && rangeStart && rangeEnd) {
    const current = new Date(rangeStart);
    while (current <= rangeEnd) {
      individualDates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
  } else if (dateMode === 'multiple') {
    individualDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
  }
  return individualDates.map((d) => formatDateInput(d));
}

/** Apply Date text + optional permitted_dates JSON onto a parameters array. */
export function applyDateParameters(
  parameters: AppParam[],
  opts: {
    dateMode: DateMode;
    rangeStart: Date | null;
    rangeEnd: Date | null;
    selectedDates: Date[];
    isSpecialCockfight: boolean;
  }
): AppParam[] {
  const { dateMode, rangeStart, rangeEnd, selectedDates, isSpecialCockfight } = opts;
  if (dateMode === 'yearly') return parameters;

  const formattedDate =
    dateMode === 'range'
      ? formatRangeMode(rangeStart, rangeEnd)
      : formatMultipleDatesMode(selectedDates);

  if (!formattedDate) return parameters;

  const next = parameters
    .filter((p) => p.param_name !== 'permitted_dates')
    .map((p) => ({ ...p }));

  const dateIdx = next.findIndex((p) => p.param_name === 'Date');
  if (dateIdx === -1) return parameters;
  next[dateIdx].param_value = formattedDate;

  if (isSpecialCockfight) {
    const dateStrings = buildPermittedDateStrings(dateMode, rangeStart, rangeEnd, selectedDates);
    if (dateStrings.length > 0) {
      next.push({
        param_name: 'permitted_dates',
        param_value: JSON.stringify(dateStrings),
      });
    }
  }

  return next;
}

/** Count days for quantity-based assessment (Special Cockfight). */
export function countDaysFromParameters(params: AppParam[]): number | null {
  const permitted = params.find((p) => p.param_name === 'permitted_dates' && p.param_value);
  if (!permitted) return null;
  try {
    const parsed = JSON.parse(permitted.param_value);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.length;
  } catch {
    /* ignore */
  }
  return null;
}

export function formatParamLabel(name: string): string {
  if (name === 'permitted_dates') return 'Permitted Dates';
  return name;
}

/** Human-readable value for display; returns null to hide the row. */
export function formatParamDisplayValue(
  param: AppParam,
  allParams: AppParam[]
): string | null {
  if (param.param_name === 'permitted_dates') {
    // Prefer the human Date field when both exist
    const hasDate = allParams.some((p) => p.param_name === 'Date' && p.param_value);
    if (hasDate) return null;
    try {
      const parsed = JSON.parse(param.param_value);
      if (Array.isArray(parsed)) return parsed.join(', ');
    } catch {
      /* keep raw */
    }
  }
  return param.param_value || '-';
}
