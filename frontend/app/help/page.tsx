'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import {
  WORKFLOW_GUIDES,
  VIOLATIONS_REGISTRY,
  STANDARD_FEES_DIRECTORY,
  FAQ_ITEMS,
  GLOSSARY_TERMS,
  WorkflowGuide,
  ViolationItem,
} from './helpData';
import { ALL_REVENUE_CODE_SECTIONS, FullOrdinanceSection } from './revenueCodeAllSections';

type TabType = 'revenue-code' | 'workflows' | 'calculators' | 'faqs' | 'glossary';

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<TabType>('revenue-code');
  const [globalSearch, setGlobalSearch] = useState('');

  // Revenue Code filter & viewer states
  const [selectedChapter, setSelectedChapter] = useState<string>('all');
  const [jumpSectionNumber, setJumpSectionNumber] = useState<string>('');
  const [expandedSectionNum, setExpandedSectionNum] = useState<number | null>(1);
  const [copiedSectionNum, setCopiedSectionNum] = useState<number | null>(null);
  const [readerSection, setReaderSection] = useState<FullOrdinanceSection | null>(null);

  // Workflow selection state
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(WORKFLOW_GUIDES[0].id);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  // Violation finder filter state
  const [violationCategory, setViolationCategory] = useState<string>('all');
  const [selectedViolation, setSelectedViolation] = useState<ViolationItem | null>(VIOLATIONS_REGISTRY[0]);

  // Calculator states
  const [calcPrincipal, setCalcPrincipal] = useState<number>(1000);
  const [calcDueDate, setCalcDueDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    return d.toISOString().split('T')[0];
  });
  const [calcPayDate, setCalcPayDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // FAQ category filter
  const [faqCategory, setFaqCategory] = useState<string>('all');
  const [openFaqId, setOpenFaqId] = useState<string | null>(FAQ_ITEMS[0].id);

  // Glossary letter filter
  const [glossaryLetter, setGlossaryLetter] = useState<string>('ALL');

  // Search queries normalized
  const query = globalSearch.trim().toLowerCase();

  // All unique chapters list
  const chaptersList = useMemo(() => {
    const map = new Map<string, string>();
    ALL_REVENUE_CODE_SECTIONS.forEach((s) => {
      if (!map.has(s.chapter)) {
        map.set(s.chapter, s.chapterTitle);
      }
    });
    return Array.from(map.entries()).map(([chapter, chapterTitle]) => ({ chapter, chapterTitle }));
  }, []);

  // Filtered Revenue Code Sections across ALL 254 Sections
  const filteredSections = useMemo(() => {
    return ALL_REVENUE_CODE_SECTIONS.filter((sec) => {
      const matchesChapter = selectedChapter === 'all' || sec.chapter === selectedChapter;
      const matchesJump = !jumpSectionNumber || sec.sectionNumber === Number(jumpSectionNumber);
      const matchesQuery =
        !query ||
        sec.sectionNumber.toString() === query ||
        `sec ${sec.sectionNumber}`.includes(query) ||
        `section ${sec.sectionNumber}`.includes(query) ||
        sec.title.toLowerCase().includes(query) ||
        sec.chapter.toLowerCase().includes(query) ||
        sec.chapterTitle.toLowerCase().includes(query) ||
        sec.fullText.toLowerCase().includes(query);

      return matchesChapter && matchesJump && matchesQuery;
    });
  }, [selectedChapter, jumpSectionNumber, query]);

  // Filtered workflows
  const filteredWorkflows = useMemo(() => {
    if (!query) return WORKFLOW_GUIDES;
    return WORKFLOW_GUIDES.filter(
      (w) =>
        w.title.toLowerCase().includes(query) ||
        w.subtitle.toLowerCase().includes(query) ||
        w.summary.toLowerCase().includes(query) ||
        w.steps.some((s) => s.title.toLowerCase().includes(query) || s.description.toLowerCase().includes(query))
    );
  }, [query]);

  // Current active workflow object
  const currentWorkflow = useMemo(() => {
    const found = filteredWorkflows.find((w) => w.id === selectedWorkflowId);
    return found || filteredWorkflows[0] || WORKFLOW_GUIDES[0];
  }, [filteredWorkflows, selectedWorkflowId]);

  // Filtered Violations
  const filteredViolations = useMemo(() => {
    return VIOLATIONS_REGISTRY.filter((v) => {
      const matchesCat = violationCategory === 'all' || v.category === violationCategory;
      const matchesQuery =
        !query ||
        v.name.toLowerCase().includes(query) ||
        v.code.toLowerCase().includes(query) ||
        v.description.toLowerCase().includes(query);
      return matchesCat && matchesQuery;
    });
  }, [violationCategory, query]);

  // Surcharge & Interest Computation
  const calculationResult = useMemo(() => {
    const p = Math.max(0, Number(calcPrincipal) || 0);
    const due = new Date(calcDueDate);
    const pay = new Date(calcPayDate);

    if (isNaN(due.getTime()) || isNaN(pay.getTime()) || pay <= due) {
      return {
        monthsLate: 0,
        surchargeAmount: 0,
        interestRate: 0,
        interestAmount: 0,
        totalAmount: p,
        isOverdue: false,
      };
    }

    const diffTime = pay.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const monthsLate = Math.min(36, Math.max(1, Math.ceil(diffDays / 30)));

    const surchargeAmount = p * 0.25;
    const interestRate = Math.min(0.72, monthsLate * 0.02);
    const interestAmount = p * interestRate;
    const totalAmount = p + surchargeAmount + interestAmount;

    return {
      monthsLate,
      surchargeAmount,
      interestRate: interestRate * 100,
      interestAmount,
      totalAmount,
      isOverdue: true,
    };
  }, [calcPrincipal, calcDueDate, calcPayDate]);

  // Filtered FAQs
  const filteredFaqs = useMemo(() => {
    return FAQ_ITEMS.filter((f) => {
      const matchesCat = faqCategory === 'all' || f.category === faqCategory;
      const matchesQuery =
        !query ||
        f.question.toLowerCase().includes(query) ||
        f.answer.toLowerCase().includes(query) ||
        f.tags.some((t) => t.toLowerCase().includes(query));
      return matchesCat && matchesQuery;
    });
  }, [faqCategory, query]);

  // Filtered Glossary
  const filteredGlossary = useMemo(() => {
    return GLOSSARY_TERMS.filter((g) => {
      const matchesLetter =
        glossaryLetter === 'ALL' || g.term.toUpperCase().startsWith(glossaryLetter);
      const matchesQuery =
        !query ||
        g.term.toLowerCase().includes(query) ||
        g.definition.toLowerCase().includes(query) ||
        g.category.toLowerCase().includes(query);
      return matchesLetter && matchesQuery;
    });
  }, [glossaryLetter, query]);

  // Copy citation helper
  const handleCopyCitation = (sec: FullOrdinanceSection) => {
    const text = `Section ${sec.sectionNumber}. ${sec.title} — ${sec.chapter}: ${sec.chapterTitle}, 2022 Revised Revenue Code of Dalaguete, Cebu.`;
    navigator.clipboard.writeText(text);
    setCopiedSectionNum(sec.sectionNumber);
    setTimeout(() => setCopiedSectionNum(null), 2500);
  };

  // Helper to highlight searched terms
  const highlightText = (text: string, highlight: string) => {
    if (!highlight || !highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-amber-200 text-slate-900 rounded px-0.5 font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-3 py-4 sm:px-6 sm:py-8 max-w-7xl mx-auto space-y-6">
          
          {/* Header Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-slate-950 via-sky-950 to-slate-900 p-6 sm:p-10 text-white shadow-xl shadow-sky-950/15">
            {/* Ambient Lighting */}
            <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />
            <div className="absolute right-1/3 -bottom-20 h-60 w-60 rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-300 text-xs font-semibold uppercase tracking-wider">
                  <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
                  Full Digital Ordinance &amp; Search Portal
                </div>
                <div className="text-xs text-sky-300/80 font-medium">
                  Tax Ordinance No. XLVII · Municipality of Dalaguete, Cebu
                </div>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-2">
                Revised Municipal Revenue Code &amp; Help Center
              </h1>
              <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed mb-6">
                All <strong>254 Sections</strong>, <strong>16 Chapters</strong>, and statutory schedules of Dalaguete&apos;s Revenue Code are fully indexed and searchable online in real time.
              </p>

              {/* Global Search Bar */}
              <div className="relative max-w-3xl">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="search"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Search any section, fee schedule, violation (e.g. 'surcharge', 'Sec. 250', 'cell site', 'wholesalers', 'market stall')..."
                  className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white/15 transition-all shadow-inner"
                />
                {globalSearch && (
                  <button
                    onClick={() => setGlobalSearch('')}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white text-xs font-bold"
                  >
                    Clear ✕
                  </button>
                )}
              </div>

              {/* Quick Metrics Bar */}
              <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-300">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  </div>
                  <div>
                    <span className="font-extrabold text-white block text-sm sm:text-base">254 Sections</span>
                    <span className="text-slate-400 text-[11px]">16 Complete Chapters</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-300">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <span className="font-extrabold text-white block text-sm sm:text-base">100% Indexed</span>
                    <span className="text-slate-400 text-[11px]">No PDF Viewer Required</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-300">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <span className="font-extrabold text-white block text-sm sm:text-base">22 Violations</span>
                    <span className="text-slate-400 text-[11px]">Traffic Citations Schedule</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <span className="font-extrabold text-white block text-sm sm:text-base">Sec. 250</span>
                    <span className="text-slate-400 text-[11px]">25% Surcharge + 2% Int.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Interactive Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setActiveTab('revenue-code')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'revenue-code'
                  ? 'bg-sky-700 text-white shadow-md shadow-sky-700/20'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Complete Revenue Code ({filteredSections.length}/{ALL_REVENUE_CODE_SECTIONS.length})
            </button>

            <button
              onClick={() => setActiveTab('workflows')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'workflows'
                  ? 'bg-sky-700 text-white shadow-md shadow-sky-700/20'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              PAMS System Workflows
            </button>

            <button
              onClick={() => setActiveTab('calculators')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'calculators'
                  ? 'bg-sky-700 text-white shadow-md shadow-sky-700/20'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Calculators &amp; Penalties
            </button>

            <button
              onClick={() => setActiveTab('faqs')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'faqs'
                  ? 'bg-sky-700 text-white shadow-md shadow-sky-700/20'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              FAQs &amp; Staff Guidance
            </button>

            <button
              onClick={() => setActiveTab('glossary')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'glossary'
                  ? 'bg-sky-700 text-white shadow-md shadow-sky-700/20'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              Glossary
            </button>
          </div>

          {/* TAB 1: COMPLETE REVENUE CODE EXPLORER (ALL 254 SECTIONS) */}
          {activeTab === 'revenue-code' && (
            <div className="space-y-6">
              
              {/* Controls: Chapter Selector & Quick Section Jump */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span>Showing</span>
                    <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-bold">
                      {filteredSections.length}
                    </span>
                    <span>of {ALL_REVENUE_CODE_SECTIONS.length} Sections</span>
                  </div>

                  {/* Section Jump Input */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-600">Jump to Section #:</label>
                    <input
                      type="number"
                      min="1"
                      max="254"
                      placeholder="e.g. 250"
                      value={jumpSectionNumber}
                      onChange={(e) => setJumpSectionNumber(e.target.value)}
                      className="w-24 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
                    />
                    {jumpSectionNumber && (
                      <button
                        onClick={() => setJumpSectionNumber('')}
                        className="text-xs text-slate-400 hover:text-slate-700 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Chapter Filter Buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                  <button
                    onClick={() => {
                      setSelectedChapter('all');
                      setJumpSectionNumber('');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedChapter === 'all'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Chapters ({ALL_REVENUE_CODE_SECTIONS.length})
                  </button>
                  {chaptersList.map(({ chapter, chapterTitle }) => (
                    <button
                      key={chapter}
                      onClick={() => {
                        setSelectedChapter(chapter);
                        setJumpSectionNumber('');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        selectedChapter === chapter
                          ? 'bg-sky-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title={chapterTitle}
                    >
                      {chapter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sections Accordion List */}
              <div className="space-y-3">
                {filteredSections.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
                    <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl font-bold">
                      🔍
                    </div>
                    <p className="text-base font-semibold text-slate-800">
                      No ordinance sections match &ldquo;{globalSearch}&rdquo;
                    </p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Try searching with keywords like &ldquo;surcharge&rdquo;, &ldquo;cockpit&rdquo;, &ldquo;market stall&rdquo;, &ldquo;water&rdquo;, &ldquo;tricycle&rdquo;, or section number &ldquo;250&rdquo;.
                    </p>
                    <button
                      onClick={() => {
                        setGlobalSearch('');
                        setSelectedChapter('all');
                        setJumpSectionNumber('');
                      }}
                      className="px-4 py-2 rounded-xl bg-sky-700 text-white text-xs font-semibold hover:bg-sky-800"
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : (
                  filteredSections.map((sec) => {
                    const isExpanded = expandedSectionNum === sec.sectionNumber;
                    return (
                      <div
                        key={sec.sectionNumber}
                        id={`section-${sec.sectionNumber}`}
                        className={`bg-white rounded-2xl border transition-all ${
                          isExpanded
                            ? 'border-sky-400 shadow-md ring-2 ring-sky-100/50'
                            : 'border-slate-200 hover:border-slate-300 shadow-sm'
                        }`}
                      >
                        {/* Section Header Row */}
                        <div
                          onClick={() => setExpandedSectionNum(isExpanded ? null : sec.sectionNumber)}
                          className="cursor-pointer p-4 sm:p-5 flex items-start justify-between gap-4 select-none"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-800 font-extrabold text-xs">
                                Section {sec.sectionNumber}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                                {sec.chapter}
                              </span>
                              <span className="text-[11px] text-slate-400 hidden sm:inline">
                                · {sec.chapterTitle}
                              </span>
                            </div>
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                              {highlightText(sec.title, query)}
                            </h3>
                            {!isExpanded && (
                              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                {highlightText(sec.summary, query)}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyCitation(sec);
                              }}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-slate-900 text-xs font-medium transition-colors"
                              title="Copy ordinance citation"
                            >
                              {copiedSectionNum === sec.sectionNumber ? 'Copied ✓' : 'Copy'}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReaderSection(sec);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-semibold transition-colors hidden sm:inline-block"
                              title="Open Full Reader Mode"
                            >
                              Reader Mode ↗
                            </button>

                            <span className="p-1 text-slate-400">
                              <svg
                                className={`h-5 w-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </span>
                          </div>
                        </div>

                        {/* Full Text Expanded View */}
                        {isExpanded && (
                          <div className="px-5 pb-6 pt-3 border-t border-slate-100 bg-slate-50/50 space-y-4">
                            <div className="rounded-2xl bg-white border border-slate-200/80 p-4 sm:p-6 shadow-inner text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-normal">
                              {highlightText(sec.fullText, query)}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
                              <span className="text-slate-400 italic">
                                Legal Reference: Tax Ordinance No. XLVII, Municipality of Dalaguete
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setReaderSection(sec)}
                                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
                                >
                                  Open in Focus View ↗
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExpandedSectionNum(null)}
                                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                  Collapse ▲
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SYSTEM WORKFLOWS */}
          {activeTab === 'workflows' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left sidebar: Workflow cards list */}
              <div className="lg:col-span-4 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Select Workflow</h2>
                  <span className="text-xs text-slate-400">{filteredWorkflows.length} available</span>
                </div>

                {filteredWorkflows.map((wf) => {
                  const isSelected = wf.id === currentWorkflow.id;
                  return (
                    <div
                      key={wf.id}
                      onClick={() => {
                        setSelectedWorkflowId(wf.id);
                        setActiveStepIndex(0);
                      }}
                      className={`cursor-pointer rounded-2xl p-4 transition-all border text-left ${
                        isSelected
                          ? 'bg-white border-sky-500 shadow-md ring-2 ring-sky-100'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${wf.badgeColor}`}>
                          {wf.badge}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">{wf.steps.length} Steps</span>
                      </div>
                      <h3 className={`text-sm font-bold mb-1 ${isSelected ? 'text-sky-900' : 'text-slate-800'}`}>
                        {wf.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {wf.subtitle}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Right main area: Selected Workflow Interactive Stepper */}
              <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-3 py-0.5 rounded-full border ${currentWorkflow.badgeColor}`}>
                        {currentWorkflow.badge}
                      </span>
                      <span className="text-xs text-slate-400">⏱️ Est. Timeline: {currentWorkflow.estimatedTime}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                      {currentWorkflow.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      {currentWorkflow.summary}
                    </p>
                  </div>
                </div>

                {/* Target Roles Pill List */}
                <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-600">Authorized Roles:</span>
                  {currentWorkflow.targetRoles.map((role) => (
                    <span key={role} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                      {role}
                    </span>
                  ))}
                </div>

                {/* Stepper Navigation */}
                <div className="mb-8">
                  <div className="flex items-center overflow-x-auto pb-2 gap-2 sm:gap-4">
                    {currentWorkflow.steps.map((s, idx) => {
                      const isCurrent = idx === activeStepIndex;
                      const isDone = idx < activeStepIndex;
                      return (
                        <button
                          key={s.stepNumber}
                          onClick={() => setActiveStepIndex(idx)}
                          className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                            isCurrent
                              ? 'bg-sky-700 text-white shadow-sm ring-2 ring-sky-200'
                              : isDone
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                            isCurrent
                              ? 'bg-white text-sky-800'
                              : isDone
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {isDone ? '✓' : s.stepNumber}
                          </span>
                          <span>Step {s.stepNumber}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Step Details Card */}
                {currentWorkflow.steps[activeStepIndex] && (
                  <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/50 via-white to-slate-50 p-5 sm:p-6 mb-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
                          Step {currentWorkflow.steps[activeStepIndex].stepNumber} of {currentWorkflow.steps.length}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                          {currentWorkflow.steps[activeStepIndex].title}
                        </h3>
                      </div>
                      {currentWorkflow.steps[activeStepIndex].roleRequired && (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 border border-sky-200">
                          👤 {currentWorkflow.steps[activeStepIndex].roleRequired}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed mb-4">
                      {currentWorkflow.steps[activeStepIndex].description}
                    </p>

                    <div className="space-y-2 mb-5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Action Checklist:</h4>
                      <ul className="space-y-2">
                        {currentWorkflow.steps[activeStepIndex].details.map((detail, dIdx) => (
                          <li key={dIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                            <span className="h-5 w-5 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                              ✓
                            </span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Step Action Button */}
                    {currentWorkflow.steps[activeStepIndex].actionLink && (
                      <div className="pt-3 border-t border-sky-100 flex items-center justify-between gap-3">
                        <Link
                          href={currentWorkflow.steps[activeStepIndex].actionLink!.href}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold transition-colors shadow-sm"
                        >
                          <span>{currentWorkflow.steps[activeStepIndex].actionLink!.label}</span>
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </Link>

                        <div className="flex items-center gap-2">
                          <button
                            disabled={activeStepIndex === 0}
                            onClick={() => setActiveStepIndex((i) => Math.max(0, i - 1))}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            ← Previous
                          </button>
                          <button
                            disabled={activeStepIndex === currentWorkflow.steps.length - 1}
                            onClick={() => setActiveStepIndex((i) => Math.min(currentWorkflow.steps.length - 1, i + 1))}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Next Step →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Important Notes Box */}
                {currentWorkflow.importantNotes.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      Important Municipal Compliance Directives
                    </div>
                    <ul className="space-y-1.5 text-xs text-amber-900/90 leading-relaxed">
                      {currentWorkflow.importantNotes.map((note, nIdx) => (
                        <li key={nIdx} className="flex items-start gap-2">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CALCULATORS & INTERACTIVE TOOLS */}
          {activeTab === 'calculators' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Surcharge & Interest Calculator Card */}
              <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-700">Revenue Code Sec. 250</span>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                      Surcharge &amp; Late Interest Calculator
                    </h2>
                  </div>
                  <div className="p-2 rounded-2xl bg-sky-50 text-sky-700">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Compute statutory delinquency penalties on business taxes, market stall rentals, or municipal fees.
                  Formula: <strong>Principal + 25% Surcharge + (2%/month Interest capped at 72%)</strong>.
                </p>

                <div className="space-y-4 text-xs sm:text-sm">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Principal Fee / Tax Amount (₱)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={calcPrincipal}
                      onChange={(e) => setCalcPrincipal(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none text-slate-900 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Original Due Date
                      </label>
                      <input
                        type="date"
                        value={calcDueDate}
                        onChange={(e) => setCalcDueDate(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Payment / Settlement Date
                      </label>
                      <input
                        type="date"
                        value={calcPayDate}
                        onChange={(e) => setCalcPayDate(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Calculation Output Box */}
                <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-slate-900 to-sky-950 p-5 text-white space-y-3 shadow-md">
                  <div className="flex items-center justify-between text-xs text-sky-200 border-b border-white/10 pb-2">
                    <span>Delinquency Duration:</span>
                    <span className="font-bold text-white">
                      {calculationResult.monthsLate} Month(s) Overdue
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block">Principal:</span>
                      <span className="font-semibold text-white">
                        ₱{calcPrincipal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">25% Surcharge:</span>
                      <span className="font-semibold text-amber-300">
                        + ₱{calculationResult.surchargeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Interest ({calculationResult.interestRate.toFixed(1)}%):</span>
                      <span className="font-semibold text-rose-300">
                        + ₱{calculationResult.interestAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Status:</span>
                      <span className={`font-semibold ${calculationResult.isOverdue ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {calculationResult.isOverdue ? 'Delinquent / Penalized' : 'On-Time / No Penalty'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-sky-300 uppercase tracking-wider block font-bold">Total Assessment Due</span>
                      <span className="text-2xl font-extrabold text-white">
                        ₱{calculationResult.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <Link
                      href="/finance"
                      className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors"
                    >
                      Record Payment →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Traffic Violation & Citation Penalty Finder */}
              <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Traffic Ordinance Schedule</span>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                      Citation Violation &amp; Fine Finder
                    </h2>
                  </div>
                  <div className="p-2 rounded-2xl bg-rose-50 text-rose-700">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {['all', 'license', 'safety', 'operation', 'parking_route'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setViolationCategory(cat)}
                      className={`px-3 py-1 rounded-lg font-semibold capitalize transition-all ${
                        violationCategory === cat
                          ? 'bg-rose-700 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {/* Violation Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Traffic / Municipal Infraction ({filteredViolations.length} available)
                  </label>
                  <select
                    value={selectedViolation?.id || ''}
                    onChange={(e) => {
                      const v = VIOLATIONS_REGISTRY.find((item) => item.id === e.target.value);
                      if (v) setSelectedViolation(v);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none"
                  >
                    {filteredViolations.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.code} - {v.name} (₱{v.firstOffenseFine})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Violation Details Card */}
                {selectedViolation && (
                  <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/50 via-white to-slate-50 p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
                          {selectedViolation.code}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-1">
                          {selectedViolation.name}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">1st Offense Fine</span>
                        <span className="text-xl font-extrabold text-rose-700">
                          ₱{selectedViolation.firstOffenseFine.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {selectedViolation.description}
                    </p>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-rose-100">
                      <div>
                        <span className="font-bold text-slate-600 block">Settlement Window:</span>
                        <span className="text-slate-800">{selectedViolation.settlementPeriod}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-600 block">Subsequent Offense:</span>
                        <span className="text-slate-800">
                          {selectedViolation.subsequentOffenseFine ? `₱${selectedViolation.subsequentOffenseFine.toLocaleString()}` : 'Double fine / Legal Action'}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-white border border-rose-200/80 p-3 text-xs text-rose-950">
                      <strong className="block mb-0.5">Required Action:</strong>
                      {selectedViolation.actionRequired}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Link
                        href="/citations/create"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold transition-colors"
                      >
                        <span>Issue Citation Ticket</span>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </Link>
                      <Link
                        href="/citations"
                        className="text-xs font-medium text-slate-600 hover:text-slate-900"
                      >
                        View Citations Ledger →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Standard Fees Matrix Section */}
              <div className="lg:col-span-12 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Standard Municipal Fees Directory</h2>
                    <p className="text-xs text-slate-500">Quick reference of standard statutory fees and required prerequisites in Dalaguete.</p>
                  </div>
                  <Link
                    href="/admin/fees"
                    className="text-xs font-semibold text-sky-700 hover:text-sky-900"
                  >
                    Manage System Fees →
                  </Link>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Fee Name</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Standard Amount</th>
                        <th className="px-4 py-3">Assessment Basis</th>
                        <th className="px-4 py-3">Prerequisites</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {STANDARD_FEES_DIRECTORY.map((fee) => (
                        <tr key={fee.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 font-bold text-slate-900">{fee.name}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-xs">
                              {fee.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-sky-700">{fee.amount}</td>
                          <td className="px-4 py-3 text-slate-600 text-xs">{fee.basis}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {fee.requirements.join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: FAQS & GUIDANCE */}
          {activeTab === 'faqs' && (
            <div className="space-y-6">
              {/* Category selector */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {[
                  { id: 'all', label: 'All Questions' },
                  { id: 'applications', label: 'Permits & Applications' },
                  { id: 'billing', label: 'Billing & Surcharges' },
                  { id: 'citations', label: 'Citations & Enforcers' },
                  { id: 'rentals', label: 'Market & Rentals' },
                  { id: 'roles', label: 'User Roles & Approvals' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setFaqCategory(c.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      faqCategory === c.id
                        ? 'bg-sky-700 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* FAQ Accordion List */}
              <div className="space-y-3">
                {filteredFaqs.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-500">
                    No FAQs matched your search criteria.
                  </div>
                ) : (
                  filteredFaqs.map((faq) => {
                    const isOpen = openFaqId === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all"
                      >
                        <button
                          onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                          className="w-full text-left p-5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                        >
                          <span className="font-bold text-sm sm:text-base text-slate-900">
                            {faq.question}
                          </span>
                          <span className="p-1 rounded-full bg-slate-100 text-slate-500 flex-shrink-0">
                            <svg
                              className={`h-4 w-4 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </span>
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-700 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                            <p>{faq.answer}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-200/60">
                              <span className="text-[10px] uppercase font-bold text-slate-400">Related:</span>
                              {faq.tags.map((t) => (
                                <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 5: GLOSSARY */}
          {activeTab === 'glossary' && (
            <div className="space-y-6">
              {/* Alphabetical Picker */}
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {['ALL', ...Array.from(new Set(GLOSSARY_TERMS.map((t) => t.term[0].toUpperCase()))).sort()].map((letter) => (
                  <button
                    key={letter}
                    onClick={() => setGlossaryLetter(letter)}
                    className={`h-8 w-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center flex-shrink-0 ${
                      glossaryLetter === letter
                        ? 'bg-sky-700 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {letter}
                  </button>
                ))}
              </div>

              {/* Glossary Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredGlossary.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2 hover:border-sky-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-slate-900">{item.term}</h3>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {item.category}
                        </span>
                        {item.ordinanceRef && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100">
                            {item.ordinanceRef}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {item.definition}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* READER MODAL / FULL FOCUS DRAWER */}
          {readerSection && (
            <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
                {/* Modal Header */}
                <div className="p-5 sm:p-6 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-sky-700 text-white font-extrabold text-xs">
                        Section {readerSection.sectionNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-semibold text-xs">
                        {readerSection.chapter}: {readerSection.chapterTitle}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-xl font-extrabold text-slate-900 mt-1">
                      {readerSection.title}
                    </h2>
                  </div>
                  <button
                    onClick={() => setReaderSection(null)}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Content Body */}
                <div className="p-6 sm:p-8 overflow-y-auto space-y-4 text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-normal">
                  {readerSection.fullText}
                </div>

                {/* Modal Footer */}
                <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 italic">
                    Dalaguete Revised Municipal Revenue Code of 2022
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyCitation(readerSection)}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
                    >
                      {copiedSectionNum === readerSection.sectionNumber ? 'Copied Citation ✓' : 'Copy Citation'}
                    </button>
                    <button
                      onClick={() => setReaderSection(null)}
                      className="px-4 py-2 rounded-xl bg-sky-700 text-white font-bold text-xs hover:bg-sky-800 transition-colors"
                    >
                      Close Focus View
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick System Navigation Footer Bar */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
              Quick Shortcuts to PAMS Modules
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs font-semibold">
              <Link
                href="/applications/new"
                className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-800 transition-all text-center block"
              >
                📝 New Application
              </Link>
              <Link
                href="/applications"
                className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-800 transition-all text-center block"
              >
                📋 Applications List
              </Link>
              <Link
                href="/citations/create"
                className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-800 transition-all text-center block"
              >
                🚨 Issue Citation
              </Link>
              <Link
                href="/admin/rights-and-rentals"
                className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-800 transition-all text-center block"
              >
                🏪 Rights &amp; Rentals
              </Link>
              <Link
                href="/finance"
                className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800 transition-all text-center block"
              >
                💳 Treasury &amp; Finance
              </Link>
              <Link
                href="/reports/hub"
                className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-800 transition-all text-center block"
              >
                📊 Reports Hub
              </Link>
            </div>
          </div>

        </div>
      </Layout>
    </ProtectedRoute>
  );
}
