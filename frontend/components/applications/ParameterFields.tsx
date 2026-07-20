'use client';

import { useEffect, useState } from 'react';
import {
  AppParam,
  DateMode,
  applyDateParameters,
  formatDateInput,
  formatDateText,
  formatMultipleDatesMode,
  formatRangeMode,
} from '@/utils/applicationParameters';

type Props = {
  parameters: AppParam[];
  onChange: (next: AppParam[]) => void;
  address: {
    street: string;
    barangay: string;
    municipality: string;
    province: string;
    country: string;
  };
  isSpecialCockfight: boolean;
};

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function startingDayOfWeek(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

export default function ParameterFields({
  parameters,
  onChange,
  address,
  isSpecialCockfight,
}: Props) {
  const [dateMode, setDateMode] = useState<DateMode>('range');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showValidUntilPicker, setShowValidUntilPicker] = useState(false);
  const [validUntilDate, setValidUntilDate] = useState<Date | null>(null);
  const [validUntilMonth, setValidUntilMonth] = useState(new Date());
  const [sameAsAddress, setSameAsAddress] = useState(false);

  // Sync Date / permitted_dates from calendar selection
  useEffect(() => {
    const next = applyDateParameters(parameters, {
      dateMode,
      rangeStart,
      rangeEnd,
      selectedDates,
      isSpecialCockfight,
    });
    const changed =
      next.length !== parameters.length ||
      next.some(
        (p, i) =>
          p.param_name !== parameters[i]?.param_name ||
          p.param_value !== parameters[i]?.param_value
      );
    if (changed) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on date selection changes
  }, [selectedDates, rangeStart, rangeEnd, dateMode, isSpecialCockfight]);

  // Sync Location when "Same as Address" is on
  useEffect(() => {
    if (!sameAsAddress) return;
    const locationIdx = parameters.findIndex((p) => p.param_name === 'Location');
    if (locationIdx === -1) return;
    const completeAddress = [
      address.street,
      address.barangay,
      address.municipality,
      address.province,
      address.country,
    ]
      .filter((p) => p && p.trim())
      .join(', ');
    if (parameters[locationIdx].param_value === completeAddress) return;
    const next = parameters.map((p, i) =>
      i === locationIdx ? { ...p, param_value: completeAddress } : p
    );
    onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sameAsAddress, address.street, address.barangay, address.municipality, address.province, address.country]);

  const setParamValue = (index: number, value: string) => {
    const next = parameters.map((p, i) => (i === index ? { ...p, param_value: value } : p));
    onChange(next);
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    if (dateMode === 'range') {
      if (!rangeStart) {
        setRangeStart(newDate);
        setRangeEnd(null);
      } else if (!rangeEnd) {
        if (newDate < rangeStart) {
          setRangeEnd(rangeStart);
          setRangeStart(newDate);
        } else {
          setRangeEnd(newDate);
        }
      } else {
        setRangeStart(newDate);
        setRangeEnd(null);
      }
    } else if (dateMode === 'multiple') {
      const exists = selectedDates.some((d) => d.getTime() === newDate.getTime());
      setSelectedDates(
        exists
          ? selectedDates.filter((d) => d.getTime() !== newDate.getTime())
          : [...selectedDates, newDate]
      );
    }
  };

  const handleYearlyMode = () => {
    const currentYear = new Date().getFullYear();
    const yearEnd = new Date(currentYear, 11, 31);
    const next = parameters.map((p) => {
      if (p.param_name === 'Date') return { ...p, param_value: `Yearly ${currentYear}` };
      if (p.param_name === 'Valid Until') return { ...p, param_value: formatDateInput(yearEnd) };
      return p;
    });
    onChange(next.filter((p) => p.param_name !== 'permitted_dates'));
    setDateMode('yearly');
    setShowDatePicker(false);
  };

  const handleValidUntilClick = (day: number) => {
    const newDate = new Date(validUntilMonth.getFullYear(), validUntilMonth.getMonth(), day);
    setValidUntilDate(newDate);
    const idx = parameters.findIndex((p) => p.param_name === 'Valid Until');
    if (idx !== -1) setParamValue(idx, formatDateInput(newDate));
    setShowValidUntilPicker(false);
  };

  return (
    <div className="space-y-3">
      {parameters
        .filter((p) => p.param_name !== 'permitted_dates')
        .map((param) => {
          const idx = parameters.findIndex((p) => p.param_name === param.param_name);

          return (
            <div key={param.param_name} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-sm font-medium text-slate-700">{param.param_name}</label>
                {param.param_name === 'Location' && (
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameAsAddress}
                      onChange={(e) => setSameAsAddress(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    Same as address
                  </label>
                )}
              </div>

              {param.param_name === 'Date' ? (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    placeholder="Select dates…"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm cursor-pointer bg-white"
                    value={param.param_value}
                    onClick={() => setShowDatePicker((v) => !v)}
                  />
                  {showDatePicker && (
                    <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-3 w-80">
                      <div className="flex gap-1.5 mb-3">
                        {(['range', 'multiple'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setDateMode(mode)}
                            className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium capitalize ${
                              dateMode === mode
                                ? 'bg-teal-700 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={handleYearlyMode}
                          className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium ${
                            dateMode === 'yearly'
                              ? 'bg-teal-700 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          Yearly
                        </button>
                      </div>

                      {dateMode !== 'yearly' && (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <button
                              type="button"
                              className="p-1.5 hover:bg-slate-100 rounded"
                              onClick={() =>
                                setCalendarMonth(
                                  new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1)
                                )
                              }
                            >
                              ‹
                            </button>
                            <span className="text-sm font-semibold text-slate-800">
                              {calendarMonth.toLocaleDateString('en-US', {
                                month: 'long',
                                year: 'numeric',
                              })}
                            </span>
                            <button
                              type="button"
                              className="p-1.5 hover:bg-slate-100 rounded"
                              onClick={() =>
                                setCalendarMonth(
                                  new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1)
                                )
                              }
                            >
                              ›
                            </button>
                          </div>
                          <div className="grid grid-cols-7 gap-0.5 mb-2">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                              <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">
                                {d}
                              </div>
                            ))}
                            {Array.from({ length: startingDayOfWeek(calendarMonth) }).map((_, i) => (
                              <div key={`e-${i}`} />
                            ))}
                            {Array.from({ length: daysInMonth(calendarMonth) }).map((_, i) => {
                              const dayNum = i + 1;
                              const current = new Date(
                                calendarMonth.getFullYear(),
                                calendarMonth.getMonth(),
                                dayNum
                              );
                              const isSelected =
                                (dateMode === 'range' &&
                                  (current.getTime() === rangeStart?.getTime() ||
                                    current.getTime() === rangeEnd?.getTime())) ||
                                (dateMode === 'multiple' &&
                                  selectedDates.some((d) => d.getTime() === current.getTime()));
                              const inRange =
                                dateMode === 'range' &&
                                rangeStart &&
                                rangeEnd &&
                                current.getTime() > rangeStart.getTime() &&
                                current.getTime() < rangeEnd.getTime();
                              return (
                                <button
                                  key={dayNum}
                                  type="button"
                                  onClick={() => handleDateClick(dayNum)}
                                  className={`p-1.5 text-xs rounded ${
                                    isSelected
                                      ? 'bg-teal-700 text-white font-semibold'
                                      : inRange
                                        ? 'bg-teal-100 text-teal-900'
                                        : 'hover:bg-slate-100 text-slate-800'
                                  }`}
                                >
                                  {dayNum}
                                </button>
                              );
                            })}
                          </div>
                          {(dateMode === 'range' && rangeStart && rangeEnd) && (
                            <p className="text-xs text-slate-600 mb-2 bg-slate-50 rounded px-2 py-1.5">
                              {formatRangeMode(rangeStart, rangeEnd)}
                            </p>
                          )}
                          {dateMode === 'multiple' && selectedDates.length > 0 && (
                            <p className="text-xs text-slate-600 mb-2 bg-slate-50 rounded px-2 py-1.5">
                              {formatMultipleDatesMode(selectedDates)}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowDatePicker(false)}
                            className="w-full px-3 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-medium hover:bg-teal-800"
                          >
                            Done
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : param.param_name === 'Valid Until' ? (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    placeholder="Select validity date…"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm cursor-pointer bg-white"
                    value={param.param_value}
                    onClick={() => setShowValidUntilPicker((v) => !v)}
                  />
                  {showValidUntilPicker && (
                    <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-3 w-80">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          type="button"
                          className="p-1.5 hover:bg-slate-100 rounded"
                          onClick={() =>
                            setValidUntilMonth(
                              new Date(validUntilMonth.getFullYear(), validUntilMonth.getMonth() - 1)
                            )
                          }
                        >
                          ‹
                        </button>
                        <span className="text-sm font-semibold text-slate-800">
                          {validUntilMonth.toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        <button
                          type="button"
                          className="p-1.5 hover:bg-slate-100 rounded"
                          onClick={() =>
                            setValidUntilMonth(
                              new Date(validUntilMonth.getFullYear(), validUntilMonth.getMonth() + 1)
                            )
                          }
                        >
                          ›
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-0.5 mb-2">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                          <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">
                            {d}
                          </div>
                        ))}
                        {Array.from({ length: startingDayOfWeek(validUntilMonth) }).map((_, i) => (
                          <div key={`ve-${i}`} />
                        ))}
                        {Array.from({ length: daysInMonth(validUntilMonth) }).map((_, i) => {
                          const dayNum = i + 1;
                          const current = new Date(
                            validUntilMonth.getFullYear(),
                            validUntilMonth.getMonth(),
                            dayNum
                          );
                          const isSelected = validUntilDate?.getTime() === current.getTime();
                          return (
                            <button
                              key={dayNum}
                              type="button"
                              onClick={() => handleValidUntilClick(dayNum)}
                              className={`p-1.5 text-xs rounded ${
                                isSelected
                                  ? 'bg-teal-700 text-white font-semibold'
                                  : 'hover:bg-slate-100 text-slate-800'
                              }`}
                            >
                              {dayNum}
                            </button>
                          );
                        })}
                      </div>
                      {validUntilDate && (
                        <p className="text-xs text-slate-600 mb-2 bg-slate-50 rounded px-2 py-1.5">
                          {formatDateText(validUntilDate)}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowValidUntilPicker(false)}
                        className="w-full px-3 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-medium hover:bg-teal-800"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm ${
                    param.param_name === 'Location' && sameAsAddress
                      ? 'bg-slate-100 cursor-not-allowed'
                      : 'bg-white'
                  }`}
                  value={param.param_value}
                  onChange={(e) => setParamValue(idx, e.target.value)}
                  disabled={param.param_name === 'Location' && sameAsAddress}
                  readOnly={param.param_name === 'Location' && sameAsAddress}
                  placeholder={`Enter ${param.param_name.toLowerCase()}`}
                />
              )}
            </div>
          );
        })}
    </div>
  );
}
