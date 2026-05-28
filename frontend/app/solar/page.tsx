'use client';

import { useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Appliance {
  id: string;
  name: string;
  wattage: number;
  hours: number;
  quantity: number;
}

interface SystemConfig {
  systemType: 'off-grid' | 'grid-tied' | 'hybrid';
  psh: number;
  systemVoltage: 12 | 24 | 48;
  batteryType: 'lead-acid' | 'lithium';
  autonomyDays: number;
  // Panel specs
  panelBrand: string;
  panelWattage: number;
  panelVoc: number;
  panelVmp: number;
  panelIsc: number;
  panelImp: number;
  panelTempCoeff: number;  // %/°C, Pmax temperature coefficient
  // Inverter specs
  inverterBrand: string;
  inverterRatingOverride: number; // 0 = auto-calculate
  inverterEfficiency: number;     // % e.g. 95
  inverterDcInputMin: number;     // V
  inverterDcInputMax: number;     // V
  inverterMaxIsc: number;         // A  — max input short-circuit current
  inverterStartupVoltage: number; // V  — start-up / minimum MPPT voltage
  inverterMaxPvVoltage: number;   // V  — max PV input voltage (open-circuit limit)
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Copper THWN conductor ampacity at 75°C — PEC 2017 Table 3.10.15(B)(16)
const WIRE_AMPACITY = [
  { awg: '14', ampacity: 20 },
  { awg: '12', ampacity: 25 },
  { awg: '10', ampacity: 35 },
  { awg: '8',  ampacity: 50 },
  { awg: '6',  ampacity: 65 },
  { awg: '4',  ampacity: 85 },
  { awg: '3',  ampacity: 100 },
  { awg: '2',  ampacity: 115 },
  { awg: '1',  ampacity: 130 },
  { awg: '1/0', ampacity: 150 },
  { awg: '2/0', ampacity: 175 },
  { awg: '3/0', ampacity: 200 },
  { awg: '4/0', ampacity: 230 },
];

const BREAKER_SIZES = [10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 100, 125, 150, 175, 200, 225, 250];
const CC_SIZES      = [10, 20, 30, 40, 60, 80, 100];

// Typical datasheet values per panel wattage
const PANEL_SPECS: Record<number, { voc: number; vmp: number; isc: number; imp: number }> = {
  200: { voc: 24.3,  vmp: 20.4,  isc: 8.77,  imp: 8.18  },
  250: { voc: 30.6,  vmp: 25.4,  isc: 8.78,  imp: 8.25  },
  300: { voc: 39.8,  vmp: 33.2,  isc: 9.58,  imp: 9.04  },
  350: { voc: 46.5,  vmp: 38.8,  isc: 9.73,  imp: 9.02  },
  400: { voc: 49.0,  vmp: 41.2,  isc: 9.80,  imp: 9.27  },
  450: { voc: 49.6,  vmp: 41.9,  isc: 11.35, imp: 10.74 },
  500: { voc: 50.3,  vmp: 42.8,  isc: 13.15, imp: 12.43 },
  550: { voc: 50.9,  vmp: 43.3,  isc: 13.74, imp: 12.96 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWireSize(current: number): string {
  const wire = WIRE_AMPACITY.find(w => w.ampacity >= current);
  return wire ? `${wire.awg} AWG` : '4/0 AWG or larger';
}

function getNextBreakerSize(current: number): number {
  return BREAKER_SIZES.find(s => s >= current) ?? 250;
}

function getNextCCSize(current: number): number {
  return CC_SIZES.find(s => s >= current) ?? 100;
}

// ─── Default load list ────────────────────────────────────────────────────────

const DEFAULT_APPLIANCES: Appliance[] = [
  { id: '1', name: 'LED Light',       wattage: 10,  hours: 6,  quantity: 6 },
  { id: '2', name: 'Ceiling Fan',     wattage: 50,  hours: 8,  quantity: 2 },
  { id: '3', name: 'Refrigerator',    wattage: 150, hours: 24, quantity: 1 },
  { id: '4', name: 'TV (LED 32")',    wattage: 50,  hours: 6,  quantity: 1 },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SolarPage() {
  const [step, setStep] = useState(1);

  const [config, setConfig] = useState<SystemConfig>({
    systemType:   'off-grid',
    psh:          5.0,
    systemVoltage: 24,
    batteryType:  'lithium',
    autonomyDays: 1,
    // Panel
    panelBrand:   '',
    panelWattage: 400,
    panelVoc:     49.0,
    panelVmp:     41.2,
    panelIsc:     9.80,
    panelImp:     9.27,
    panelTempCoeff: -0.34,
    // Inverter
    inverterBrand:          '',
    inverterRatingOverride: 0,
    inverterEfficiency:     95,
    inverterDcInputMin:     48,
    inverterDcInputMax:     450,
    inverterMaxIsc:         15,
    inverterStartupVoltage: 90,
    inverterMaxPvVoltage:   500,
  });

  const [appliances, setAppliances] = useState<Appliance[]>(DEFAULT_APPLIANCES);
  const [newRow, setNewRow] = useState({ name: '', wattage: '', hours: '', quantity: '1' });

  // ── Bill-based load entry ──────────────────────────────────────────────────
  const [loadEntryMode, setLoadEntryMode] = useState<'manual' | 'bill'>('manual');
  const [monthlyBill, setMonthlyBill] = useState<string>('1500');
  const [ratePerKwh, setRatePerKwh] = useState<string>('11.00');
  const [estimatedPeakW, setEstimatedPeakW] = useState<string>('');

  // ── Sizing computations ────────────────────────────────────────────────────

  const sizing = useMemo(() => {
    let totalDailyEnergy: number;
    let peakDemand: number;

    let requiredPanelPower: number;

    if (loadEntryMode === 'bill') {
      const bill = Number(monthlyBill) || 0;
      const rate = Number(ratePerKwh) || 1;
      // Actual daily consumption for display purposes
      totalDailyEnergy = (bill / rate / 30) * 1000; // Wh/day
      // Panel sizing: user formula — bill / rate / 30 / PSH → kW → W
      requiredPanelPower = (bill / rate / 30 / config.psh) * 1000;
      // Peak demand: user override, or estimate from daily energy
      peakDemand = Number(estimatedPeakW) > 0
        ? Number(estimatedPeakW)
        : Math.round(totalDailyEnergy / 6);
    } else {
      totalDailyEnergy = appliances.reduce(
        (sum, a) => sum + a.wattage * a.hours * a.quantity, 0,
      );
      peakDemand = appliances.reduce(
        (sum, a) => sum + a.wattage * a.quantity, 0,
      );
      const systemEfficiency = config.inverterEfficiency / 100 * 0.85; // inverter eff × wiring/temp losses
      requiredPanelPower = totalDailyEnergy / (config.psh * systemEfficiency);
    }
    const numPanels = Math.ceil(requiredPanelPower / config.panelWattage);
    const totalPanelPower = numPanels * config.panelWattage;

    const dod = config.batteryType === 'lithium' ? 0.8 : 0.5;
    const batteryCapacityAh =
      (totalDailyEnergy * config.autonomyDays) / (config.systemVoltage * dod);
    const batteryCapacityKwh = (batteryCapacityAh * config.systemVoltage) / 1000;

    // Inverter: use manual override if set, else auto-size at 125% of peak demand
    const inverterRating = config.inverterRatingOverride > 0
      ? config.inverterRatingOverride
      : Math.ceil((peakDemand * 1.25) / 100) * 100;

    // MPPT charge controller
    const totalIsc = numPanels * config.panelIsc;
    const ccCurrentRequired = totalIsc * 1.25;
    const ccSize = getNextCCSize(Math.ceil(ccCurrentRequired));

    return {
      totalDailyEnergy,
      peakDemand,
      requiredPanelPower,
      numPanels,
      totalPanelPower,
      batteryCapacityAh,
      batteryCapacityKwh,
      inverterRating,
      ccCurrentRequired,
      ccSize,
      dod,
    };
  }, [appliances, config, loadEntryMode, monthlyBill, ratePerKwh, estimatedPeakW]);

  // ── PEC 2017 compliance ────────────────────────────────────────────────────

  const pec = useMemo(() => {
    // PEC 690.8(A): DC conductors and OCPD rated at 125% of Isc
    const dcContinuousCurrent = config.panelIsc * 1.25;
    const dcWireSize   = getWireSize(dcContinuousCurrent);
    const dcBreakerSize = getNextBreakerSize(Math.ceil(dcContinuousCurrent));

    // Battery → Inverter: (inverterRating / systemVoltage) × 125% safety
    const battToInvCurrent = (sizing.inverterRating / config.systemVoltage) * 1.25;
    const battWireSize    = getWireSize(battToInvCurrent);
    const battBreakerSize  = getNextBreakerSize(Math.ceil(battToInvCurrent));

    // AC output: inverterRating / 230V × 125%
    const acCurrent    = (sizing.inverterRating / 230) * 1.25;
    const acWireSize   = getWireSize(acCurrent);
    const acBreakerSize = getNextBreakerSize(Math.ceil(acCurrent));

    const checks = [
      {
        id: 'dc-wire',
        rule: 'PEC 2017 Rule 6.90.8(A)',
        description: 'DC Circuit Conductors — Panels to MPPT Charge Controller',
        detail: `Required: ≥ ${dcContinuousCurrent.toFixed(1)} A (125% of Isc ${config.panelIsc} A). Recommended: ${dcWireSize} THWN-2 copper.`,
        pass: true,
      },
      {
        id: 'dc-ocpd',
        rule: 'PEC 2017 Rule 6.90.9',
        description: 'DC Overcurrent Protection Device — PV Output Circuit',
        detail: `DC-rated fuse or circuit breaker: ${dcBreakerSize} A. Install at array combiner box or charge controller DC input. Must be listed for DC use.`,
        pass: true,
      },
      {
        id: 'batt-wire',
        rule: 'PEC 2017 Rule 6.90.8(D)',
        description: 'Battery-to-Inverter Conductors',
        detail: `Required: ≥ ${battToInvCurrent.toFixed(1)} A. Recommended: ${battWireSize} THWN-2 copper (keep run ≤ 1 m to minimise voltage drop).`,
        pass: config.systemType !== 'grid-tied',
        skip: config.systemType === 'grid-tied',
      },
      {
        id: 'batt-ocpd',
        rule: 'PEC 2017 Rule 6.90.9',
        description: 'Battery Overcurrent Protection Device',
        detail: `${battBreakerSize} A DC fuse installed within 150 mm of the battery positive terminal.`,
        pass: config.systemType !== 'grid-tied',
        skip: config.systemType === 'grid-tied',
      },
      {
        id: 'ac-wire',
        rule: 'PEC 2017 Rule 2.30',
        description: 'AC Output Conductors — Inverter to Load Panel (230 V / 60 Hz)',
        detail: `Required: ≥ ${acCurrent.toFixed(1)} A. Recommended: ${acWireSize} THWN copper.`,
        pass: true,
      },
      {
        id: 'ac-ocpd',
        rule: 'PEC 2017 Rule 2.40',
        description: 'AC Overcurrent Protection — Load Panel Main Breaker',
        detail: `${acBreakerSize} A AC molded-case circuit breaker (MCCB) on inverter AC output to the distribution panel.`,
        pass: true,
      },
      {
        id: 'grounding',
        rule: 'PEC 2017 Rule 6.90.47',
        description: 'Equipment Grounding & System Bonding',
        detail: 'All PV module frames, mounting racks, inverter/charge controller enclosures bonded and grounded. Grounding conductor: 6 AWG solid bare copper minimum.',
        pass: true,
      },
      {
        id: 'gfpd',
        rule: 'PEC 2017 Rule 6.90.5',
        description: 'Ground Fault Protection Device (GFPD)',
        detail: 'Ground fault protection required on all grounded PV systems. Verify charge controller/inverter has built-in GFPD; otherwise install a dedicated GFPD at the PV array.',
        pass: true,
      },
      {
        id: 'disconnect',
        rule: 'PEC 2017 Rule 6.90.15',
        description: 'PV System Disconnect Means',
        detail: 'A readily accessible, lockable DC disconnect switch must be installed between the PV array and the charge controller/inverter. Must be rated for DC current.',
        pass: true,
      },
      {
        id: 'labeling',
        rule: 'PEC 2017 Rule 6.90.17',
        description: 'Warning Labels & System Markings',
        detail: '"CAUTION: SOLAR ELECTRIC SYSTEM — SHOCK HAZARD" labels required at DC disconnect, inverter, load panel, and battery bank. Include system voltage and Isc on labels.',
        pass: sizing.numPanels > 0,
      },
    ].filter(c => !c.skip);

    const allPass = checks.every(c => c.pass);

    return {
      checks,
      allPass,
      dcContinuousCurrent,
      dcWireSize,
      dcBreakerSize,
      battToInvCurrent,
      battWireSize,
      battBreakerSize,
      acCurrent,
      acWireSize,
      acBreakerSize,
    };
  }, [sizing, config]);

  // ── Appliance CRUD ────────────────────────────────────────────────────────

  const addAppliance = () => {
    if (!newRow.name.trim() || !newRow.wattage || !newRow.hours) return;
    setAppliances(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newRow.name.trim(),
        wattage:  Number(newRow.wattage),
        hours:    Number(newRow.hours),
        quantity: Number(newRow.quantity) || 1,
      },
    ]);
    setNewRow({ name: '', wattage: '', hours: '', quantity: '1' });
  };

  const removeAppliance = (id: string) =>
    setAppliances(prev => prev.filter(a => a.id !== id));

  const updateAppliance = (
    id: string,
    field: keyof Omit<Appliance, 'id'>,
    value: string,
  ) =>
    setAppliances(prev =>
      prev.map(a =>
        a.id === id
          ? { ...a, [field]: field === 'name' ? value : Number(value) }
          : a,
      ),
    );

  // ── Panel wattage change ───────────────────────────────────────────────────

  const handlePanelWattageChange = (w: number) => {
    const spec = PANEL_SPECS[w];
    setConfig(c => ({
      ...c,
      panelWattage: w,
      panelVoc: spec?.voc ?? c.panelVoc,
      panelVmp: spec?.vmp ?? c.panelVmp,
      panelIsc: spec?.isc ?? c.panelIsc,
      panelImp: spec?.imp ?? c.panelImp,
    }));
  };

  // ── Step labels ────────────────────────────────────────────────────────────

  const STEPS = ['System Config', 'Load Entry', 'Design Results', 'PEC Compliance'];

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-4 md:p-6 max-w-5xl mx-auto">

          {/* ── Page header ── */}
          <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <svg className="h-7 w-7 text-yellow-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.7.7M5.63 18.37l-.7.7m12.74 0-.7-.7M5.63 5.63l-.7-.7M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
                Solar PV System Designer
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Size your solar installation and check compliance with PEC 2017 (2nd Edition)
              </p>
            </div>
            {step === 4 && (
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors print:hidden"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Report
              </button>
            )}
          </div>

          {/* ── Step indicator ── */}
          <div className="flex items-center mb-8 print:hidden">
            {STEPS.map((label, i) => {
              const num  = i + 1;
              const done = step > num;
              const active = step === num;
              return (
                <div key={num} className="flex items-center flex-1">
                  <button
                    onClick={() => setStep(num)}
                    className={`flex items-center gap-2 transition-colors ${
                      active ? 'text-blue-600 font-semibold'
                      : done  ? 'text-green-600'
                      : 'text-gray-400'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                      active ? 'border-blue-600 bg-blue-600 text-white'
                      : done  ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-300 text-gray-400'
                    }`}>
                      {done ? '✓' : num}
                    </span>
                    <span className="text-sm hidden sm:block">{label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${done ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* ════════════════════════════════════════════════════════════════
              STEP 1 — System Configuration
          ════════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-5">

              {/* ──────────────────────── Section: System Settings ─────────────────────── */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">⚙️ System Settings</h2>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">

                  {/* System Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">System Type</label>
                    <select
                      value={config.systemType}
                      onChange={e =>
                        setConfig(c => ({ ...c, systemType: e.target.value as SystemConfig['systemType'] }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="off-grid">Off-Grid (Solar + Battery only)</option>
                      <option value="hybrid">Hybrid (Solar + Battery + Grid backup)</option>
                      <option value="grid-tied">Grid-Tied (No battery)</option>
                    </select>
                  </div>

                  {/* PSH */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Peak Sun Hours (PSH) <span className="text-gray-400 font-normal">hrs/day</span>
                    </label>
                    <input
                      type="number" min={2} max={8} step={0.1}
                      value={config.psh}
                      onChange={e => setConfig(c => ({ ...c, psh: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Cebu / Philippines average: 4.5–5.5 hrs/day</p>
                  </div>

                  {/* DC System Voltage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">DC System Voltage</label>
                    <select
                      value={config.systemVoltage}
                      disabled={config.systemType === 'grid-tied'}
                      onChange={e =>
                        setConfig(c => ({ ...c, systemVoltage: Number(e.target.value) as SystemConfig['systemVoltage'] }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value={12}>12 V — small systems (&lt; 1 kW)</option>
                      <option value={24}>24 V — medium systems (1–3 kW)</option>
                      <option value={48}>48 V — large systems (3 kW+)</option>
                    </select>
                  </div>

                  {/* Battery Type */}
                  {config.systemType !== 'grid-tied' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Battery Type</label>
                      <select
                        value={config.batteryType}
                        onChange={e =>
                          setConfig(c => ({ ...c, batteryType: e.target.value as SystemConfig['batteryType'] }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="lithium">Lithium LiFePO4 — 80% DoD</option>
                        <option value="lead-acid">Lead-Acid (AGM / Gel) — 50% DoD</option>
                      </select>
                    </div>
                  )}

                  {/* Autonomy Days */}
                  {config.systemType !== 'grid-tied' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Days of Autonomy <span className="text-gray-400 font-normal">backup days</span>
                      </label>
                      <select
                        value={config.autonomyDays}
                        onChange={e => setConfig(c => ({ ...c, autonomyDays: Number(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={1}>1 day</option>
                        <option value={2}>2 days</option>
                        <option value={3}>3 days</option>
                      </select>
                    </div>
                  )}

                </div>
              </div>

              {/* ─────────────────────── Section: Solar Panel Specifications ───────────────── */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-xl flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">☀️ Solar Panel Specifications</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Load preset:</span>
                    <select
                      className="border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={config.panelWattage}
                      onChange={e => handlePanelWattageChange(Number(e.target.value))}
                    >
                      {Object.keys(PANEL_SPECS).map(w => (
                        <option key={w} value={w}>{w} Wp preset</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

                  {/* Brand / Model */}
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Brand / Model <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Jinko Solar JKM400M-54HL4-V"
                      value={config.panelBrand}
                      onChange={e => setConfig(c => ({ ...c, panelBrand: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Wattage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Rated Power <span className="text-gray-400 font-normal">(Wp)</span>
                    </label>
                    <input
                      type="number" min={50} max={1000} step={1}
                      value={config.panelWattage}
                      onChange={e => setConfig(c => ({ ...c, panelWattage: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Pmax at STC</p>
                  </div>

                  {/* Voc */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Voc <span className="text-gray-400 font-normal">(V)</span>
                    </label>
                    <input
                      type="number" min={10} max={100} step={0.01}
                      value={config.panelVoc}
                      onChange={e => setConfig(c => ({ ...c, panelVoc: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Open-circuit voltage</p>
                  </div>

                  {/* Vmp */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Vmp <span className="text-gray-400 font-normal">(V)</span>
                    </label>
                    <input
                      type="number" min={10} max={100} step={0.01}
                      value={config.panelVmp}
                      onChange={e => setConfig(c => ({ ...c, panelVmp: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Maximum power voltage</p>
                  </div>

                  {/* Isc */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Isc <span className="text-gray-400 font-normal">(A)</span>
                    </label>
                    <input
                      type="number" min={1} max={25} step={0.01}
                      value={config.panelIsc}
                      onChange={e => setConfig(c => ({ ...c, panelIsc: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Short-circuit current</p>
                  </div>

                  {/* Imp */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Imp <span className="text-gray-400 font-normal">(A)</span>
                    </label>
                    <input
                      type="number" min={1} max={25} step={0.01}
                      value={config.panelImp}
                      onChange={e => setConfig(c => ({ ...c, panelImp: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Maximum power current</p>
                  </div>

                  {/* Temperature coefficient */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Temp. Coeff. of Pmax <span className="text-gray-400 font-normal">(%/°C)</span>
                    </label>
                    <input
                      type="number" min={-1} max={0} step={0.01}
                      value={config.panelTempCoeff}
                      onChange={e => setConfig(c => ({ ...c, panelTempCoeff: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Typical monocrystalline: −0.34 to −0.40</p>
                  </div>

                  {/* Derived check */}
                  <div className="sm:col-span-2 lg:col-span-3 bg-gray-50 rounded-lg p-3 text-xs text-gray-500 flex flex-wrap gap-x-6 gap-y-1">
                    <span>✓ Pmax check: {(config.panelVmp * config.panelImp).toFixed(1)} W (Vmp × Imp)</span>
                    <span>✓ Fill Factor: {config.panelVoc > 0 && config.panelIsc > 0 ? ((config.panelWattage / (config.panelVoc * config.panelIsc)) * 100).toFixed(1) : '—'}%</span>
                    <span>✓ Voc / Vmp ratio: {config.panelVmp > 0 ? (config.panelVoc / config.panelVmp).toFixed(3) : '—'}</span>
                  </div>

                </div>
              </div>

              {/* ─────────────────────── Section: Inverter Specifications ────────────────────── */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">⚡ Inverter Specifications</h2>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

                  {/* Brand / Model */}
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Brand / Model <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Growatt SPF 3000TL LVM"
                      value={config.inverterBrand}
                      onChange={e => setConfig(c => ({ ...c, inverterBrand: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Rated Power Override */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Rated Power <span className="text-gray-400 font-normal">(W)</span>
                    </label>
                    <input
                      type="number" min={0} step={100}
                      value={config.inverterRatingOverride || ''}
                      onChange={e => setConfig(c => ({ ...c, inverterRatingOverride: Number(e.target.value) }))}
                      placeholder="Leave blank to auto-size"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Auto-size = peak demand × 1.25, rounded to 100 W</p>
                  </div>

                  {/* Inverter Efficiency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Inverter Efficiency <span className="text-gray-400 font-normal">(%)</span>
                    </label>
                    <input
                      type="number" min={70} max={99} step={0.1}
                      value={config.inverterEfficiency}
                      onChange={e => setConfig(c => ({ ...c, inverterEfficiency: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">From inverter datasheet; typical: 93–97%</p>
                  </div>

                  {/* DC Input Voltage Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      DC Input Voltage Range <span className="text-gray-400 font-normal">(V)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min={12} step={1}
                        value={config.inverterDcInputMin}
                        onChange={e => setConfig(c => ({ ...c, inverterDcInputMin: Number(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Min"
                      />
                      <span className="text-gray-400 flex-shrink-0">–</span>
                      <input
                        type="number" min={12} step={1}
                        value={config.inverterDcInputMax}
                        onChange={e => setConfig(c => ({ ...c, inverterDcInputMax: Number(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Max"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">From inverter datasheet (informational)</p>
                  </div>

                  {/* Max Input Short-Circuit Current */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Max. Input Short-Circuit Current <span className="text-gray-400 font-normal">(A)</span>
                    </label>
                    <input
                      type="number" min={0} step={0.1}
                      value={config.inverterMaxIsc}
                      onChange={e => setConfig(c => ({ ...c, inverterMaxIsc: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 15"
                    />
                    <p className="text-xs text-gray-400 mt-1">Max Isc the inverter/CC can accept per string input</p>
                  </div>

                  {/* Start-up Voltage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Start-up Voltage <span className="text-gray-400 font-normal">(V)</span>
                    </label>
                    <input
                      type="number" min={0} step={1}
                      value={config.inverterStartupVoltage}
                      onChange={e => setConfig(c => ({ ...c, inverterStartupVoltage: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 90"
                    />
                    <p className="text-xs text-gray-400 mt-1">Minimum PV voltage for the inverter to start operating</p>
                  </div>

                  {/* Max PV Input Voltage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Max. PV Input Voltage <span className="text-gray-400 font-normal">(V)</span>
                    </label>
                    <input
                      type="number" min={0} step={1}
                      value={config.inverterMaxPvVoltage}
                      onChange={e => setConfig(c => ({ ...c, inverterMaxPvVoltage: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Absolute maximum Voc the inverter input can withstand</p>
                  </div>

                  {/* Effective system efficiency note */}
                  <div className="sm:col-span-2 lg:col-span-3 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                    Effective system efficiency used for panel sizing:{' '}
                    <strong>{(config.inverterEfficiency / 100 * 0.85 * 100).toFixed(1)}%</strong>
                    {' '}(inverter {config.inverterEfficiency}% × 0.85 wiring &amp; temperature derating)
                  </div>

                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Next: Load Entry →
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 2 — Load Entry
          ════════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              {/* Header + mode toggle */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Electrical Load Schedule</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {loadEntryMode === 'manual'
                        ? 'Enter all loads — daily energy and peak demand are computed automatically.'
                        : 'Estimate energy use from your electric bill.'}
                    </p>
                  </div>
                  {/* Mode toggle */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1 flex-shrink-0">
                    <button
                      onClick={() => setLoadEntryMode('manual')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        loadEntryMode === 'manual'
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Manual Entry
                    </button>
                    <button
                      onClick={() => setLoadEntryMode('bill')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        loadEntryMode === 'bill'
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      From Electric Bill
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Bill-based mode ── */}
              {loadEntryMode === 'bill' && (
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {/* Monthly bill */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Average Monthly Bill
                        <span className="text-gray-400 font-normal ml-1">(PHP)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">₱</span>
                        <input
                          type="number" min={0} step={0.01}
                          value={monthlyBill}
                          onChange={e => setMonthlyBill(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="1500.00"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Enter the total amount on your Meralco / utility bill</p>
                    </div>

                    {/* Rate per kWh */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Rate per kWh
                        <span className="text-gray-400 font-normal ml-1">(PHP/kWh)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">₱</span>
                        <input
                          type="number" min={1} step={0.01}
                          value={ratePerKwh}
                          onChange={e => setRatePerKwh(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="11.00"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Typical Philippine residential rate: ₱10–₱12/kWh</p>
                    </div>

                    {/* Peak demand override */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Estimated Peak Demand
                        <span className="text-gray-400 font-normal ml-1">(W) — optional</span>
                      </label>
                      <input
                        type="number" min={0}
                        value={estimatedPeakW}
                        onChange={e => setEstimatedPeakW(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Auto-estimated"
                      />
                      <p className="text-xs text-gray-400 mt-1">Leave blank to auto-estimate from daily energy</p>
                    </div>
                  </div>

                  {/* Computed summary */}
                  {Number(monthlyBill) > 0 && Number(ratePerKwh) > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Monthly kWh</p>
                        <p className="text-lg font-bold text-blue-800 mt-0.5">
                          {(Number(monthlyBill) / Number(ratePerKwh)).toFixed(1)} kWh
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Daily Energy</p>
                        <p className="text-lg font-bold text-blue-800 mt-0.5">
                          {sizing.totalDailyEnergy.toFixed(0)} Wh/day
                        </p>
                        <p className="text-xs text-blue-500">
                          {(sizing.totalDailyEnergy / 1000).toFixed(3)} kWh/day
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Required Panel Power</p>
                        <p className="text-lg font-bold text-blue-800 mt-0.5">
                          {sizing.requiredPanelPower.toFixed(0)} W
                        </p>
                        <p className="text-xs text-blue-500">
                          Bill ÷ rate ÷ 30 ÷ {config.psh} PSH
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Est. Savings</p>
                        <p className="text-lg font-bold text-green-700 mt-0.5">
                          ₱{Number(monthlyBill).toLocaleString('en-PH', { minimumFractionDigits: 2 })}/mo
                        </p>
                        <p className="text-xs text-blue-500">If fully offset by solar</p>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <strong className="text-gray-600">Note:</strong> The bill-based method estimates total energy consumption only.
                    For a more accurate design, switch to <strong>Manual Entry</strong> to list individual loads —
                    this also gives you a more precise peak demand and inverter sizing.
                  </div>
                </div>
              )}

              {/* ── Manual entry table ── */}
              {loadEntryMode === 'manual' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Appliance / Load</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Wattage (W)</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Hrs/Day</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Daily (Wh)</th>
                      <th className="w-10 px-2 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {appliances.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <input
                            value={a.name}
                            onChange={e => updateAppliance(a.id, 'name', e.target.value)}
                            className="w-full bg-transparent text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <input
                            type="number" min={0}
                            value={a.wattage}
                            onChange={e => updateAppliance(a.id, 'wattage', e.target.value)}
                            className="w-20 bg-transparent text-sm text-right text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <input
                            type="number" min={0} max={24} step={0.5}
                            value={a.hours}
                            onChange={e => updateAppliance(a.id, 'hours', e.target.value)}
                            className="w-16 bg-transparent text-sm text-right text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <input
                            type="number" min={1}
                            value={a.quantity}
                            onChange={e => updateAppliance(a.id, 'quantity', e.target.value)}
                            className="w-12 bg-transparent text-sm text-right text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-700">
                          {(a.wattage * a.hours * a.quantity).toLocaleString()}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <button
                            onClick={() => removeAppliance(a.id)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                            title="Remove"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Add new row */}
                    <tr className="bg-blue-50">
                      <td className="px-4 py-2.5">
                        <input
                          placeholder="Appliance name…"
                          value={newRow.name}
                          onChange={e => setNewRow(p => ({ ...p, name: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && addAppliance()}
                          className="w-full border border-blue-200 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <input
                          type="number" placeholder="W"
                          value={newRow.wattage}
                          onChange={e => setNewRow(p => ({ ...p, wattage: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && addAppliance()}
                          className="w-20 border border-blue-200 rounded px-2 py-1 text-sm text-right bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <input
                          type="number" placeholder="hrs"
                          value={newRow.hours}
                          onChange={e => setNewRow(p => ({ ...p, hours: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && addAppliance()}
                          className="w-16 border border-blue-200 rounded px-2 py-1 text-sm text-right bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <input
                          type="number" placeholder="qty"
                          value={newRow.quantity}
                          onChange={e => setNewRow(p => ({ ...p, quantity: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && addAppliance()}
                          className="w-12 border border-blue-200 rounded px-2 py-1 text-sm text-right bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-400 text-xs">—</td>
                      <td className="px-2 py-2.5 text-center">
                        <button
                          onClick={addAppliance}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Add load"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  </tbody>

                  <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-700">
                        Total Daily Energy
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {sizing.totalDailyEnergy.toLocaleString()} Wh/day
                        <span className="ml-2 text-gray-400 font-normal text-xs">
                          ({(sizing.totalDailyEnergy / 1000).toFixed(2)} kWh)
                        </span>
                      </td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-4 pb-3 text-sm text-gray-500">
                        Peak Demand (all loads simultaneous)
                      </td>
                      <td className="px-4 pb-3 text-right font-semibold text-gray-700">
                        {sizing.peakDemand.toLocaleString()} W
                        <span className="ml-2 text-gray-400 font-normal text-xs">
                          ({(sizing.peakDemand / 1000).toFixed(2)} kW)
                        </span>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              )} {/* end manual mode */}

              <div className="flex justify-between p-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={
                    loadEntryMode === 'manual'
                      ? appliances.length === 0
                      : !(Number(monthlyBill) > 0 && Number(ratePerKwh) > 0)
                  }
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next: View Results →
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 3 — Design Results
          ════════════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-5">

              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Daily Energy',
                    value: `${(sizing.totalDailyEnergy / 1000).toFixed(2)} kWh`,
                    sub:   `${sizing.totalDailyEnergy.toLocaleString()} Wh/day`,
                    color: 'bg-yellow-50 border-yellow-200',
                    text:  'text-yellow-700',
                  },
                  {
                    label: 'Peak Demand',
                    value: `${(sizing.peakDemand / 1000).toFixed(2)} kW`,
                    sub:   `${sizing.peakDemand.toLocaleString()} W`,
                    color: 'bg-orange-50 border-orange-200',
                    text:  'text-orange-700',
                  },
                  {
                    label: 'Required Power',
                    value: `${sizing.requiredPanelPower.toFixed(0)} Wp`,
                    sub:   'Before panel rounding',
                    color: 'bg-blue-50 border-blue-200',
                    text:  'text-blue-700',
                  },
                  {
                    label: 'Solar Panels',
                    value: `${sizing.numPanels} panels`,
                    sub:   `× ${config.panelWattage} Wp = ${sizing.totalPanelPower.toLocaleString()} Wp`,
                    color: 'bg-green-50 border-green-200',
                    text:  'text-green-700',
                  },
                ].map(c => (
                  <div key={c.label} className={`${c.color} border rounded-xl p-4`}>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{c.label}</p>
                    <p className={`text-xl font-bold mt-1 ${c.text}`}>{c.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
                  </div>
                ))}
              </div>

              {/* System design table */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <h2 className="text-base font-semibold text-gray-800">System Design Summary</h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Component</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Specification</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-64">Basis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-800">Solar Panels</td>
                      <td className="px-6 py-3 text-gray-700">
                        <span className="font-semibold text-green-700">{sizing.numPanels} × {config.panelWattage} Wp</span>
                        <span className="text-gray-400 ml-2">= {sizing.totalPanelPower.toLocaleString()} Wp total</span>
                        {config.panelBrand && (
                          <span className="block text-xs text-gray-400 mt-0.5">{config.panelBrand}</span>
                        )}
                        <span className="block text-xs text-gray-400 mt-0.5">
                          Voc {config.panelVoc} V &nbsp;·&nbsp; Vmp {config.panelVmp} V &nbsp;·&nbsp; Isc {config.panelIsc} A &nbsp;·&nbsp; Imp {config.panelImp} A
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs">
                        {sizing.totalDailyEnergy.toLocaleString()} Wh ÷ ({config.psh} h × {(config.inverterEfficiency / 100 * 0.85 * 100).toFixed(1)}% eff.)
                        = {sizing.requiredPanelPower.toFixed(0)} Wp required
                      </td>
                    </tr>

                    {config.systemType !== 'grid-tied' && (
                      <>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-800">Battery Bank</td>
                          <td className="px-6 py-3 text-gray-700">
                            <span className="font-semibold text-blue-700">
                              {sizing.batteryCapacityAh.toFixed(0)} Ah @ {config.systemVoltage} V
                            </span>
                            <span className="text-gray-400 ml-2">
                              ≈ {sizing.batteryCapacityKwh.toFixed(2)} kWh usable
                            </span>
                          </td>
                          <td className="px-6 py-3 text-gray-500 text-xs">
                            {sizing.totalDailyEnergy.toLocaleString()} Wh × {config.autonomyDays} d
                            ÷ ({config.systemVoltage} V × {sizing.dod * 100}% DoD)
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-800">Battery Chemistry</td>
                          <td className="px-6 py-3 text-gray-700">
                            {config.batteryType === 'lithium' ? 'Lithium Iron Phosphate (LiFePO4)' : 'Lead-Acid (AGM / Gel)'}
                          </td>
                          <td className="px-6 py-3 text-gray-500 text-xs">
                            Depth of Discharge: {sizing.dod * 100}%
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-800">MPPT Charge Controller</td>
                          <td className="px-6 py-3 text-gray-700">
                            <span className="font-semibold text-purple-700">
                              {sizing.ccSize} A / {config.systemVoltage} V
                            </span>
                          </td>
                          <td className="px-6 py-3 text-gray-500 text-xs">
                            {sizing.numPanels} panels × {config.panelIsc} A × 1.25
                            = {sizing.ccCurrentRequired.toFixed(1)} A → {sizing.ccSize} A standard
                          </td>
                        </tr>
                      </>
                    )}

                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-800">
                        {config.systemType === 'grid-tied' ? 'Grid-Tie Inverter' : 'Off-Grid Inverter'}
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        <span className="font-semibold text-red-700">
                          {sizing.inverterRating.toLocaleString()} W
                        </span>
                        <span className="text-gray-400 ml-2">
                          ({(sizing.inverterRating / 1000).toFixed(1)} kVA)
                        </span>
                        {config.inverterBrand && (
                          <span className="block text-xs text-gray-400 mt-0.5">{config.inverterBrand}</span>
                        )}
                        <span className="block text-xs text-gray-400 mt-0.5">
                          Efficiency: {config.inverterEfficiency}% &nbsp;·&nbsp; DC input: {config.inverterDcInputMin}–{config.inverterDcInputMax} V
                          &nbsp;·&nbsp; Max Isc: {config.inverterMaxIsc} A &nbsp;·&nbsp; Start-up: {config.inverterStartupVoltage} V &nbsp;·&nbsp; Max PV Voc: {config.inverterMaxPvVoltage} V
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs">
                        {config.inverterRatingOverride > 0
                          ? 'User-specified'
                          : `${sizing.peakDemand.toLocaleString()} W × 1.25 safety factor → rounded up`}
                      </td>
                    </tr>

                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td className="px-6 py-3 font-semibold text-gray-800">AC System Standard</td>
                      <td className="px-6 py-3 text-gray-700 font-semibold">230 V / 60 Hz single-phase</td>
                      <td className="px-6 py-3 text-gray-500 text-xs">Philippine standard — PEC 2017</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ─── System Wiring Schematic ─── */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <h2 className="text-base font-semibold text-gray-800">System Wiring Schematic</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Block diagram — not to scale &nbsp;·&nbsp;
                    <span className="font-semibold" style={{ color: '#dc2626' }}>━━ DC</span>
                    &nbsp;·&nbsp;
                    <span className="font-semibold" style={{ color: '#92400e' }}>━━ AC</span>
                  </p>
                </div>
                <div className="p-4 bg-slate-50 overflow-x-auto">

                  {/* ── Grid-Tied Layout ── */}
                  {config.systemType === 'grid-tied' && (
                    <svg viewBox="0 0 760 185" width="100%" style={{ minWidth: 520, display: 'block', fontFamily: 'system-ui, sans-serif' }}>
                      <defs>
                        <marker id="arr-dc-gt" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                          <polygon points="0 0, 8 3, 0 6" fill="#dc2626" />
                        </marker>
                        <marker id="arr-ac-gt" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                          <polygon points="0 0, 8 3, 0 6" fill="#92400e" />
                        </marker>
                      </defs>
                      {/* Title */}
                      <text x="380" y="18" textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#64748b">
                        {`Grid-Tied PV System — ${sizing.totalPanelPower.toLocaleString()} Wp | ${(sizing.inverterRating / 1000).toFixed(1)} kW Inverter`}
                      </text>
                      {/* PV Array */}
                      <rect x="10" y="34" width="115" height="110" rx="6" fill="#fef9c3" stroke="#ca8a04" strokeWidth="1.5" />
                      <text x="67" y="60" textAnchor="middle" fontSize="12" fontWeight="700" fill="#92400e">☀ PV Array</text>
                      <text x="67" y="77" textAnchor="middle" fontSize="10" fill="#78350f">{`${sizing.numPanels} × ${config.panelWattage} Wp`}</text>
                      <text x="67" y="92" textAnchor="middle" fontSize="9" fill="#78350f">{`Voc ${config.panelVoc} V`}</text>
                      <text x="67" y="106" textAnchor="middle" fontSize="9" fill="#78350f">{`Isc ${config.panelIsc} A`}</text>
                      {config.panelBrand && <text x="67" y="120" textAnchor="middle" fontSize="8" fill="#a16207">{config.panelBrand.substring(0, 16)}</text>}
                      {/* Wire → DC Fuse */}
                      <line x1="125" y1="89" x2="190" y2="89" stroke="#dc2626" strokeWidth="2.5" markerEnd="url(#arr-dc-gt)" />
                      <text x="157" y="83" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#dc2626">{pec.dcWireSize} AWG</text>
                      {/* DC Fuse */}
                      <rect x="190" y="70" width="82" height="38" rx="5" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.5" />
                      <text x="231" y="86" textAnchor="middle" fontSize="10" fontWeight="700" fill="#dc2626">DC Fuse</text>
                      <text x="231" y="100" textAnchor="middle" fontSize="9.5" fill="#7f1d1d">{pec.dcBreakerSize} A</text>
                      {/* Wire → Inverter */}
                      <line x1="272" y1="89" x2="337" y2="89" stroke="#dc2626" strokeWidth="2.5" markerEnd="url(#arr-dc-gt)" />
                      <text x="304" y="83" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#dc2626">{pec.dcWireSize} AWG</text>
                      {/* Grid-Tie Inverter */}
                      <rect x="337" y="28" width="138" height="122" rx="6" fill="#fff1f2" stroke="#e11d48" strokeWidth="1.5" />
                      <text x="406" y="53" textAnchor="middle" fontSize="12" fontWeight="700" fill="#be123c">⚡ Inverter</text>
                      <text x="406" y="70" textAnchor="middle" fontSize="9.5" fill="#9f1239">Grid-Tied</text>
                      <text x="406" y="86" textAnchor="middle" fontSize="10" fill="#9f1239">{`${(sizing.inverterRating / 1000).toFixed(1)} kW`}</text>
                      <text x="406" y="101" textAnchor="middle" fontSize="9.5" fill="#9f1239">{`η = ${config.inverterEfficiency}%`}</text>
                      <text x="406" y="116" textAnchor="middle" fontSize="9" fill="#9f1239">{`DC ${config.inverterDcInputMin}–${config.inverterDcInputMax} V`}</text>
                      {config.inverterBrand && <text x="406" y="131" textAnchor="middle" fontSize="8.5" fill="#be123c">{config.inverterBrand.substring(0, 18)}</text>}
                      {/* Wire → AC Breaker */}
                      <line x1="475" y1="89" x2="540" y2="89" stroke="#92400e" strokeWidth="2.5" markerEnd="url(#arr-ac-gt)" />
                      <text x="507" y="83" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#92400e">{pec.acWireSize} AWG</text>
                      {/* AC Breaker */}
                      <rect x="540" y="70" width="82" height="38" rx="5" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                      <text x="581" y="86" textAnchor="middle" fontSize="10" fontWeight="700" fill="#92400e">AC Breaker</text>
                      <text x="581" y="100" textAnchor="middle" fontSize="9" fill="#78350f">{pec.acBreakerSize} A MCCB</text>
                      {/* Wire → Grid */}
                      <line x1="622" y1="89" x2="685" y2="89" stroke="#92400e" strokeWidth="2.5" markerEnd="url(#arr-ac-gt)" />
                      <text x="653" y="83" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#92400e">{pec.acWireSize} AWG</text>
                      {/* Grid */}
                      <rect x="685" y="57" width="62" height="64" rx="5" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.5" />
                      <text x="716" y="81" textAnchor="middle" fontSize="11" fontWeight="700" fill="#15803d">GRID</text>
                      <text x="716" y="97" textAnchor="middle" fontSize="9" fill="#166534">230 V / 60 Hz</text>
                      <text x="716" y="113" textAnchor="middle" fontSize="8.5" fill="#166534">Philippine Grid</text>
                    </svg>
                  )}

                  {/* ── Off-Grid / Hybrid Layout ── */}
                  {config.systemType !== 'grid-tied' && (
                    <svg viewBox="0 0 940 345" width="100%" style={{ minWidth: 620, display: 'block', fontFamily: 'system-ui, sans-serif' }}>
                      <defs>
                        <marker id="arr-dc-og" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                          <polygon points="0 0, 8 3, 0 6" fill="#dc2626" />
                        </marker>
                        <marker id="arr-ac-og" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                          <polygon points="0 0, 8 3, 0 6" fill="#92400e" />
                        </marker>
                      </defs>
                      {/* Title */}
                      <text x="470" y="18" textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#64748b">
                        {`${config.systemType === 'hybrid' ? 'Hybrid' : 'Off-Grid'} PV System — ${sizing.totalPanelPower.toLocaleString()} Wp | ${(sizing.inverterRating / 1000).toFixed(1)} kW Inverter | ${sizing.batteryCapacityAh.toFixed(0)} Ah Battery`}
                      </text>
                      {/* PV Array */}
                      <rect x="10" y="36" width="120" height="126" rx="6" fill="#fef9c3" stroke="#ca8a04" strokeWidth="1.5" />
                      <text x="70" y="62" textAnchor="middle" fontSize="12" fontWeight="700" fill="#92400e">☀ PV Array</text>
                      <text x="70" y="79" textAnchor="middle" fontSize="10" fill="#78350f">{`${sizing.numPanels} × ${config.panelWattage} Wp`}</text>
                      <text x="70" y="94" textAnchor="middle" fontSize="9" fill="#78350f">{`Voc ${config.panelVoc} V  Vmp ${config.panelVmp} V`}</text>
                      <text x="70" y="108" textAnchor="middle" fontSize="9" fill="#78350f">{`Isc ${config.panelIsc} A  Imp ${config.panelImp} A`}</text>
                      <text x="70" y="122" textAnchor="middle" fontSize="9" fill="#78350f">{`${sizing.totalPanelPower.toLocaleString()} Wp total`}</text>
                      {config.panelBrand && <text x="70" y="137" textAnchor="middle" fontSize="8" fill="#a16207">{config.panelBrand.substring(0, 17)}</text>}
                      {/* Wire → DC Fuse */}
                      <line x1="130" y1="99" x2="193" y2="99" stroke="#dc2626" strokeWidth="2.5" markerEnd="url(#arr-dc-og)" />
                      <text x="161" y="93" textAnchor="middle" fontSize="8" fontWeight="600" fill="#dc2626">{pec.dcWireSize} AWG</text>
                      {/* DC Fuse */}
                      <rect x="193" y="80" width="80" height="38" rx="5" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.5" />
                      <text x="233" y="96" textAnchor="middle" fontSize="10" fontWeight="700" fill="#dc2626">DC Fuse</text>
                      <text x="233" y="110" textAnchor="middle" fontSize="9.5" fill="#7f1d1d">{pec.dcBreakerSize} A</text>
                      {/* Wire → MPPT CC */}
                      <line x1="273" y1="99" x2="343" y2="99" stroke="#dc2626" strokeWidth="2.5" markerEnd="url(#arr-dc-og)" />
                      <text x="308" y="93" textAnchor="middle" fontSize="8" fontWeight="600" fill="#dc2626">{pec.dcWireSize} AWG</text>
                      {/* MPPT Charge Controller */}
                      <rect x="343" y="30" width="128" height="148" rx="6" fill="#f5f3ff" stroke="#7c3aed" strokeWidth="1.5" />
                      <text x="407" y="55" textAnchor="middle" fontSize="11" fontWeight="700" fill="#5b21b6">⚙ MPPT CC</text>
                      <text x="407" y="72" textAnchor="middle" fontSize="10" fill="#4c1d95">{`${sizing.ccSize} A / ${config.systemVoltage} V`}</text>
                      <text x="407" y="87" textAnchor="middle" fontSize="9" fill="#4c1d95">{`Max Voc: ${config.inverterMaxPvVoltage} V`}</text>
                      <text x="407" y="101" textAnchor="middle" fontSize="9" fill="#4c1d95">{`Max Isc: ${config.inverterMaxIsc} A`}</text>
                      <text x="407" y="115" textAnchor="middle" fontSize="9" fill="#4c1d95">{`Start-up: ${config.inverterStartupVoltage} V`}</text>
                      <text x="407" y="129" textAnchor="middle" fontSize="9" fill="#4c1d95">{`Bus: ${config.systemVoltage} V DC`}</text>
                      <text x="407" y="144" textAnchor="middle" fontSize="8.5" fill="#6d28d9">PV → CC → Batt / Load</text>
                      <text x="407" y="158" textAnchor="middle" fontSize="8" fill="#7c3aed">{`(DoD: ${sizing.dod * 100}%)`}</text>
                      {/* Wire MPPT CC → Inverter */}
                      <line x1="471" y1="99" x2="543" y2="99" stroke="#dc2626" strokeWidth="2.5" markerEnd="url(#arr-dc-og)" />
                      <text x="507" y="93" textAnchor="middle" fontSize="8" fontWeight="600" fill="#dc2626">{pec.battWireSize} AWG</text>
                      {/* Wire MPPT CC ↓ Battery Fuse (vertical) */}
                      <line x1="407" y1="178" x2="407" y2="214" stroke="#dc2626" strokeWidth="2.5" markerEnd="url(#arr-dc-og)" />
                      <text x="422" y="199" fontSize="8" fontWeight="600" fill="#dc2626">{pec.battWireSize} AWG</text>
                      {/* Battery Fuse */}
                      <rect x="367" y="214" width="80" height="38" rx="5" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.5" />
                      <text x="407" y="230" textAnchor="middle" fontSize="10" fontWeight="700" fill="#dc2626">Batt Fuse</text>
                      <text x="407" y="244" textAnchor="middle" fontSize="9.5" fill="#7f1d1d">{pec.battBreakerSize} A</text>
                      {/* Wire Battery Fuse ↓ Battery */}
                      <line x1="407" y1="252" x2="407" y2="265" stroke="#dc2626" strokeWidth="2.5" markerEnd="url(#arr-dc-og)" />
                      {/* Battery Bank */}
                      <rect x="355" y="265" width="104" height="74" rx="6" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.5" />
                      <text x="407" y="289" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1d4ed8">Battery Bank</text>
                      <text x="407" y="306" textAnchor="middle" fontSize="9.5" fill="#1e40af">{`${sizing.batteryCapacityAh.toFixed(0)} Ah @ ${config.systemVoltage} V`}</text>
                      <text x="407" y="321" textAnchor="middle" fontSize="9" fill="#1e40af">{`${sizing.batteryCapacityKwh.toFixed(2)} kWh usable`}</text>
                      <text x="407" y="333" textAnchor="middle" fontSize="8" fill="#3b82f6">{config.batteryType === 'lithium' ? 'LiFePO4 — 80% DoD' : 'Lead-Acid AGM — 50% DoD'}</text>
                      {/* Inverter */}
                      <rect x="543" y="22" width="138" height="154" rx="6" fill="#fff1f2" stroke="#e11d48" strokeWidth="1.5" />
                      <text x="612" y="48" textAnchor="middle" fontSize="12" fontWeight="700" fill="#be123c">⚡ Inverter</text>
                      <text x="612" y="65" textAnchor="middle" fontSize="9.5" fill="#9f1239">{config.systemType === 'hybrid' ? 'Hybrid Off-Grid' : 'Off-Grid'}</text>
                      <text x="612" y="81" textAnchor="middle" fontSize="10" fill="#9f1239">{`${(sizing.inverterRating / 1000).toFixed(1)} kW rated`}</text>
                      <text x="612" y="96" textAnchor="middle" fontSize="9.5" fill="#9f1239">{`η = ${config.inverterEfficiency}%`}</text>
                      <text x="612" y="111" textAnchor="middle" fontSize="9" fill="#9f1239">{`DC ${config.inverterDcInputMin}–${config.inverterDcInputMax} V`}</text>
                      <text x="612" y="126" textAnchor="middle" fontSize="9" fill="#9f1239">{`Max PV Voc: ${config.inverterMaxPvVoltage} V`}</text>
                      <text x="612" y="141" textAnchor="middle" fontSize="9" fill="#9f1239">{`Max Isc in: ${config.inverterMaxIsc} A`}</text>
                      <text x="612" y="156" textAnchor="middle" fontSize="9" fill="#9f1239">{`Start-up: ${config.inverterStartupVoltage} V`}</text>
                      {config.inverterBrand && <text x="612" y="168" textAnchor="middle" fontSize="8.5" fill="#be123c">{config.inverterBrand.substring(0, 18)}</text>}
                      {/* Wire Inverter → AC Breaker */}
                      <line x1="681" y1="99" x2="747" y2="99" stroke="#92400e" strokeWidth="2.5" markerEnd="url(#arr-ac-og)" />
                      <text x="714" y="93" textAnchor="middle" fontSize="8" fontWeight="600" fill="#92400e">{pec.acWireSize} AWG</text>
                      {/* AC Breaker */}
                      <rect x="747" y="80" width="82" height="38" rx="5" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                      <text x="788" y="96" textAnchor="middle" fontSize="10" fontWeight="700" fill="#92400e">AC Breaker</text>
                      <text x="788" y="110" textAnchor="middle" fontSize="9" fill="#78350f">{pec.acBreakerSize} A MCCB</text>
                      {/* Wire → Load */}
                      <line x1="829" y1="99" x2="882" y2="99" stroke="#92400e" strokeWidth="2.5" markerEnd="url(#arr-ac-og)" />
                      <text x="855" y="93" textAnchor="middle" fontSize="8" fontWeight="600" fill="#92400e">{pec.acWireSize} AWG</text>
                      {/* Load label */}
                      <text x="889" y="94" fontSize="11" fontWeight="700" fill="#15803d">LOAD</text>
                      <text x="889" y="108" fontSize="9" fill="#166534">PANEL</text>
                      <text x="889" y="121" fontSize="8.5" fill="#166534">230V/60Hz</text>
                    </svg>
                  )}

                </div>
              </div>

              {/* Wiring & Protection Schedule */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <h2 className="text-base font-semibold text-gray-800">Wiring &amp; Protection Schedule</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Per PEC 2017 Rule 6.90 — all conductors THWN-2 copper, all currents at 125% of design current</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Circuit</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Design Current</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">@ 125%</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Min. Wire Size</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Breaker / OCPD</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">

                      {/* DC — Panels to CC */}
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-800">
                          DC — Panels → MPPT Charge Controller
                          <span className="block text-xs font-normal text-gray-400">per string</span>
                        </td>
                        <td className="px-5 py-3 text-right text-gray-600">{config.panelIsc.toFixed(2)} A</td>
                        <td className="px-5 py-3 text-right font-semibold text-gray-800">{pec.dcContinuousCurrent.toFixed(1)} A</td>
                        <td className="px-5 py-3">
                          <span className="inline-block bg-green-100 text-green-800 font-semibold text-xs px-2 py-0.5 rounded">
                            {pec.dcWireSize} THWN-2
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-block bg-red-100 text-red-800 font-semibold text-xs px-2 py-0.5 rounded">
                            {pec.dcBreakerSize} A DC fuse
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500">At combiner box or CC input; DC-rated device required</td>
                      </tr>

                      {/* Battery → Inverter (off-grid / hybrid only) */}
                      {config.systemType !== 'grid-tied' && (
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-800">
                            DC — Battery Bank → Inverter
                            <span className="block text-xs font-normal text-gray-400">{config.systemVoltage} V DC bus</span>
                          </td>
                          <td className="px-5 py-3 text-right text-gray-600">
                            {(sizing.inverterRating / config.systemVoltage).toFixed(1)} A
                          </td>
                          <td className="px-5 py-3 text-right font-semibold text-gray-800">{pec.battToInvCurrent.toFixed(1)} A</td>
                          <td className="px-5 py-3">
                            <span className="inline-block bg-green-100 text-green-800 font-semibold text-xs px-2 py-0.5 rounded">
                              {pec.battWireSize} THWN-2
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-block bg-red-100 text-red-800 font-semibold text-xs px-2 py-0.5 rounded">
                              {pec.battBreakerSize} A DC fuse
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-500">Within 150 mm of battery (+) terminal; keep run ≤ 1 m</td>
                        </tr>
                      )}

                      {/* AC output */}
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-800">
                          AC — Inverter Output → Distribution Panel
                          <span className="block text-xs font-normal text-gray-400">230 V / 60 Hz</span>
                        </td>
                        <td className="px-5 py-3 text-right text-gray-600">
                          {(sizing.inverterRating / 230).toFixed(1)} A
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-gray-800">{pec.acCurrent.toFixed(1)} A</td>
                        <td className="px-5 py-3">
                          <span className="inline-block bg-green-100 text-green-800 font-semibold text-xs px-2 py-0.5 rounded">
                            {pec.acWireSize} THWN
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-block bg-blue-100 text-blue-800 font-semibold text-xs px-2 py-0.5 rounded">
                            {pec.acBreakerSize} A AC breaker
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500">MCCB on inverter AC output to load panel main</td>
                      </tr>

                      {/* EGC */}
                      <tr className="bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-600">
                          Equipment Grounding Conductor (EGC)
                          <span className="block text-xs font-normal text-gray-400">All metal enclosures, racks, modules</span>
                        </td>
                        <td className="px-5 py-3 text-right text-gray-400">—</td>
                        <td className="px-5 py-3 text-right text-gray-400">—</td>
                        <td className="px-5 py-3">
                          <span className="inline-block bg-yellow-100 text-yellow-800 font-semibold text-xs px-2 py-0.5 rounded">
                            6 AWG bare copper
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-400 text-xs">—</td>
                        <td className="px-5 py-3 text-xs text-gray-500">Bond all metal enclosures per PEC 6.90.47</td>
                      </tr>

                    </tbody>
                  </table>
                </div>
              </div>

              {/* Assumptions note */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-amber-800 mb-1">Design Assumptions</p>
                <ul className="list-disc ml-4 space-y-0.5 text-xs text-amber-700">
                  {loadEntryMode === 'bill' && (
                    <li>
                      Panel power from bill formula: ₱{Number(monthlyBill).toLocaleString()} ÷ ₱{ratePerKwh}/kWh ÷ 30 days ÷ {config.psh} PSH
                      = <strong>{(sizing.requiredPanelPower / 1000).toFixed(3)} kW</strong> required ({sizing.numPanels} × {config.panelWattage} Wp panels).
                      Actual daily consumption: {(sizing.totalDailyEnergy / 1000).toFixed(2)} kWh/day.
                    </li>
                  )}
                  <li>System efficiency factor {(config.inverterEfficiency / 100 * 0.85 * 100).toFixed(1)}% — inverter efficiency ({config.inverterEfficiency}%) × wiring &amp; temperature derating (0.85)</li>
                  <li>All panels in parallel on MPPT charge controller (single-string per CC input assumed)</li>
                  <li>Panel specs at STC (25 °C, 1000 W/m²){config.panelBrand ? ` — ${config.panelBrand}` : ''}: {config.panelWattage} Wp, Voc {config.panelVoc} V, Vmp {config.panelVmp} V, Isc {config.panelIsc} A, Imp {config.panelImp} A, TempCoeff {config.panelTempCoeff}%/°C</li>
                  <li>AC output: 230 V / 60 Hz single-phase (Philippine standard, PEC 2017)</li>
                </ul>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Next: PEC Compliance →
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 4 — PEC Compliance
          ════════════════════════════════════════════════════════════════ */}
          {step === 4 && (
            <div className="space-y-5">

              {/* Header banner */}
              <div className={`border rounded-xl p-4 flex items-center gap-3 ${pec.allPass ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <svg className={`h-6 w-6 flex-shrink-0 ${pec.allPass ? 'text-green-600' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div>
                  <p className={`font-semibold ${pec.allPass ? 'text-green-800' : 'text-red-800'}`}>
                    PEC 2017 Compliance Check — Philippine Electrical Code
                  </p>
                  <p className={`text-xs mt-0.5 ${pec.allPass ? 'text-green-700' : 'text-red-700'}`}>
                    Article 6.90 — Solar Photovoltaic (PV) Systems &nbsp;|&nbsp;
                    {pec.checks.filter(c => c.pass).length}/{pec.checks.length} requirements met
                  </p>
                </div>
              </div>

              {/* Conductor & OCPD schedule */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <h2 className="text-base font-semibold text-gray-800">Conductor & OCPD Schedule</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Circuit</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Design Current</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Min. Wire Size</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">OCPD Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-800">DC — Panels to Charge Controller (per string)</td>
                        <td className="px-6 py-3 text-right text-gray-700">{pec.dcContinuousCurrent.toFixed(1)} A</td>
                        <td className="px-6 py-3 font-semibold text-gray-800">{pec.dcWireSize} THWN-2</td>
                        <td className="px-6 py-3 font-semibold text-gray-800">{pec.dcBreakerSize} A DC fuse</td>
                      </tr>
                      {config.systemType !== 'grid-tied' && (
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-800">DC — Battery Bank to Inverter</td>
                          <td className="px-6 py-3 text-right text-gray-700">{pec.battToInvCurrent.toFixed(1)} A</td>
                          <td className="px-6 py-3 font-semibold text-gray-800">{pec.battWireSize} THWN-2</td>
                          <td className="px-6 py-3 font-semibold text-gray-800">{pec.battBreakerSize} A DC fuse</td>
                        </tr>
                      )}
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-800">AC — Inverter Output to Load Panel</td>
                        <td className="px-6 py-3 text-right text-gray-700">{pec.acCurrent.toFixed(1)} A</td>
                        <td className="px-6 py-3 font-semibold text-gray-800">{pec.acWireSize} THWN</td>
                        <td className="px-6 py-3 font-semibold text-gray-800">{pec.acBreakerSize} A AC breaker</td>
                      </tr>
                      <tr className="bg-blue-50">
                        <td className="px-6 py-3 font-medium text-blue-800">Equipment Grounding Conductor (EGC)</td>
                        <td className="px-6 py-3 text-right text-blue-500">—</td>
                        <td className="px-6 py-3 font-semibold text-blue-800">6 AWG solid bare copper</td>
                        <td className="px-6 py-3 text-blue-600 text-xs">Bond all metal enclosures</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Compliance checklist */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <h2 className="text-base font-semibold text-gray-800">Compliance Checklist</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {pec.checks.map(check => (
                    <div key={check.id} className="px-6 py-4 flex items-start gap-3">
                      <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                        check.pass ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {check.pass ? (
                          <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-800">{check.description}</span>
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono whitespace-nowrap">
                            {check.rule}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{check.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500">
                <p className="font-semibold text-gray-700 mb-1">Disclaimer</p>
                This tool provides preliminary design calculations for reference purposes only. All solar PV
                installations in the Philippines must be designed and signed by a licensed Professional
                Electrical Engineer (PEE) and must comply with PEC 2017 (2nd Edition), ERC regulations, and
                applicable DOE issuances. The installation is subject to inspection and approval by the
                Electrical Inspector of the Local Government Unit (LGU).
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print / Save Report
                </button>
              </div>
            </div>
          )}

        </div>
      </Layout>
    </ProtectedRoute>
  );
}
