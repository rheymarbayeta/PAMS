export interface WorkflowStep {
  stepNumber: number;
  title: string;
  description: string;
  details: string[];
  roleRequired?: string;
  actionLink?: { href: string; label: string };
}

export interface WorkflowGuide {
  id: string;
  title: string;
  subtitle: string;
  category: 'permits' | 'citations' | 'rentals' | 'finance' | 'waterworks';
  badge: string;
  badgeColor: string;
  summary: string;
  estimatedTime: string;
  targetRoles: string[];
  steps: WorkflowStep[];
  importantNotes: string[];
}

export interface RevenueArticle {
  id: string;
  chapter: string;
  chapterTitle: string;
  articleNumber: string;
  title: string;
  legalBasis?: string;
  summary: string;
  provisions: {
    sectionNumber: string;
    heading: string;
    text: string;
    ratesTable?: { label: string; amount: string; note?: string }[];
  }[];
  tags: string[];
}

export interface ViolationItem {
  id: string;
  code: string;
  name: string;
  category: 'license' | 'operation' | 'safety' | 'parking_route' | 'miscellaneous';
  firstOffenseFine: number;
  subsequentOffenseFine?: number;
  description: string;
  settlementPeriod: string;
  actionRequired: string;
}

export interface StandardFee {
  id: string;
  name: string;
  category: string;
  amount: string;
  basis: string;
  schedule: string;
  requirements: string[];
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'applications' | 'citations' | 'rentals' | 'billing' | 'roles';
  tags: string[];
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  category: string;
  ordinanceRef?: string;
}

// -------------------------------------------------------------
// WORKFLOW GUIDES DATA
// -------------------------------------------------------------
export const WORKFLOW_GUIDES: WorkflowGuide[] = [
  {
    id: 'wf-permit-lifecycle',
    title: 'Business & Special Permit Application Lifecycle',
    subtitle: 'End-to-end process from filing to assessment, mayoral approval, and permit release.',
    category: 'permits',
    badge: 'Core Workflow',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    summary: 'Step-by-step guide for creating, assessing, approving, and releasing Mayor’s Permits and Special Activity Permits in Dalaguete.',
    estimatedTime: '1 - 3 Business Days',
    targetRoles: ['Application Creator', 'Assessor', 'Approver', 'Admin'],
    steps: [
      {
        stepNumber: 1,
        title: 'Create & Register Entity/Application',
        description: 'Encode applicant info, business entity particulars, and select the appropriate Permit Type.',
        details: [
          'Navigate to Applications > New Application.',
          'Search existing Entity by name or create a new registered Entity record.',
          'Select the Permit Type (e.g., Mayor’s Permit, Cell Site, Commercial, Special Event).',
          'Upload prerequisite requirements (Barangay Clearance, DTI/SEC registration, Zoning clearance).',
        ],
        roleRequired: 'Application Creator / Admin',
        actionLink: { href: '/applications/new', label: 'Create New Application' },
      },
      {
        stepNumber: 2,
        title: 'Fee Assessment & Parameter Computation',
        description: 'Assessor reviews application attributes, quantity brackets, and attaches fee schedule charges.',
        details: [
          'Open the submitted application from Applications list.',
          'Verify submitted parameters (e.g., gross sales bracket, floor area, machinery horsepower, number of units).',
          'The system auto-calculates base Mayor’s Permit fee, Computer fee, Regulatory fee, and Environmental fee according to the 2022 Revenue Code.',
          'Add any necessary special assessment charges or discounts if legislated.',
        ],
        roleRequired: 'Assessor / SuperAdmin',
        actionLink: { href: '/applications', label: 'View Pending Assessments' },
      },
      {
        stepNumber: 3,
        title: 'Approval Chain Review & Mayoral Sign-off',
        description: 'Assessed applications are routed through required department endorsements and final mayoral approval.',
        details: [
          'Approvers verify regulatory clearances (BFP Fire Safety, Sanitary, Zoning, Treasury).',
          'Review computation summary and check if any discrepancies exist.',
          'Click "Approve" or provide specific rejection remarks for rectification.',
        ],
        roleRequired: 'Approver / SuperAdmin',
        actionLink: { href: '/applications', label: 'Review Approvals' },
      },
      {
        stepNumber: 4,
        title: 'Payment Recording & Official Receipt (O.R.) Issuance',
        description: 'Municipal Treasury collects payment and records the Official Receipt number in PAMS.',
        details: [
          'Treasury cashier accepts payment (Cash, Check, or verified Online payment).',
          'Record Official Receipt Number (O.R. No.), payment date, and total amount tendered in PAMS.',
          'System updates application status to "PAID" and unlocks document generation.',
        ],
        roleRequired: 'Treasury / Cashier / Admin',
        actionLink: { href: '/finance', label: 'Finance & Payments' },
      },
      {
        stepNumber: 5,
        title: 'Document Generation & Permit Release',
        description: 'Generate the official permit document and release to the applicant.',
        details: [
          'Generate official permit document with QR security verification code and dynamic signatures.',
          'Print permit copy or send electronic verification link to applicant.',
          'Mark status as "RELEASED" with applicant signature or delivery acknowledgement.',
        ],
        roleRequired: 'Permit Officer / Admin',
        actionLink: { href: '/applications', label: 'Permit Management' },
      },
    ],
    importantNotes: [
      'Business permits renewed after January 20 are subject to a statutory 25% surcharge + 2% per month interest under Section 250.',
      'Always ensure applicant details match the registered Entity TIN and Barangay clearance.',
    ],
  },
  {
    id: 'wf-citations-management',
    title: 'Traffic & Municipal Citations Management',
    subtitle: 'Issuing violation tickets, tracking driver records, recording fines, and settling penalties.',
    category: 'citations',
    badge: 'Enforcement',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    summary: 'Protocol for traffic enforcers and treasury officers to issue citation tickets, track repeat offenders, and process settlements.',
    estimatedTime: 'Immediate / 72h Grace Period',
    targetRoles: ['Traffic Officer', 'Enforcer', 'Cashier', 'Admin'],
    steps: [
      {
        stepNumber: 1,
        title: 'Issue Citation Ticket',
        description: 'Traffic enforcer enters driver credentials, vehicle details, location, and selects violation codes.',
        details: [
          'Navigate to Citations > Create Citation.',
          'Enter Driver Full Name, License Number, Address, and Contact Number.',
          'Enter Vehicle Plate/Chassis Number, Make, Model, and Color.',
          'Select applicable violations from the 22 standardized municipal violation types.',
          'System auto-generates ticket tracking number (DG-YYYY-XXXXX) and assigns standard fine.',
        ],
        roleRequired: 'Traffic Enforcer / Admin',
        actionLink: { href: '/citations/create', label: 'Issue Citation Ticket' },
      },
      {
        stepNumber: 2,
        title: 'Review Ticket Record & Enforcer Report',
        description: 'Real-time sync to citations ledger for verification and audit tracking.',
        details: [
          'Ticket instantly registers on the central citations dashboard.',
          'Driver is given 72 hours (3 business days) to settle fine or file a formal contest.',
          'Impounded vehicles or confiscated licenses are flagged in the vehicle registry.',
        ],
        roleRequired: 'Traffic Officer / Assessor / Admin',
        actionLink: { href: '/citations', label: 'Citations Ledger' },
      },
      {
        stepNumber: 3,
        title: 'Fine Settlement & Clearance Receipt',
        description: 'Cashier receives fine payment and issues Certificate of Clearance.',
        details: [
          'Locate ticket by Citation Number or Driver License Number.',
          'Record Payment Method (Cash, Online Transfer), O.R. Number, and Amount Paid.',
          'System immediately updates ticket status to "PAID" and releases any impound flags.',
          'Print Payment Receipt & Clearance Slip for the violator.',
        ],
        roleRequired: 'Cashier / Treasury / Admin',
        actionLink: { href: '/citations/payments', label: 'Citation Payments' },
      },
    ],
    importantNotes: [
      'Failure to settle citation within 72 hours will trigger escalation to the Municipal Legal Office and LTO alarm registration.',
      'Repeat offenders within the same calendar year incur progressive penalties according to Dalaguete Traffic Ordinance.',
    ],
  },
  {
    id: 'wf-rights-and-rentals',
    title: 'Public Market & Municipal Property Rights & Rentals',
    subtitle: 'Managing lease contracts, stall rights, monthly billing, and overdue surcharge schedules.',
    category: 'rentals',
    badge: 'Revenue & Assets',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    summary: 'Complete workflow for managing Dalaguete Public Market stalls, commercial leases, rental schedules, and overdue collections.',
    estimatedTime: 'Monthly Billing Cycle',
    targetRoles: ['Market Administrator', 'Assessor', 'Treasury', 'Admin'],
    steps: [
      {
        stepNumber: 1,
        title: 'Register Lease Contract & Property Unit',
        description: 'Record leaseholder profile, market section/stall number, monthly rate, and contract validity.',
        details: [
          'Navigate to Admin > Rights & Rentals.',
          'Specify Market Section (e.g., Wet Market, Dry Goods, Meat & Fish, Commercial Booths).',
          'Enter Lessee Full Name, contact info, stall area (sq. meters), and agreed monthly rental rate.',
          'Set contract commencement and expiration dates.',
        ],
        roleRequired: 'Market Admin / Assessor',
        actionLink: { href: '/admin/rights-and-rentals', label: 'Rights & Rentals' },
      },
      {
        stepNumber: 2,
        title: 'Generate Monthly Rental Billing Statements',
        description: 'System automatically creates recurring monthly dues due on or before the 20th of each month.',
        details: [
          'System compiles monthly billing ledger across active market stall leases.',
          'View individual stall statements and batch billing reports.',
          'Stalls with outstanding balance from prior months are automatically carried over with interest calculations.',
        ],
        roleRequired: 'Treasury / Assessor',
        actionLink: { href: '/admin/rights-and-rentals', label: 'View Rental Schedules' },
      },
      {
        stepNumber: 3,
        title: 'Process Rental Payments & Overdue Surcharges',
        description: 'Record monthly rental collection and compute late surcharges if payment is made after the 20th.',
        details: [
          'If payment is made after the 20th of the current month, a 25% surcharge + 2% monthly interest is appended.',
          'Record official receipt (O.R.), amount tendered, and payment coverage period.',
          'Print lessee ledger history showing balance and payment status.',
        ],
        roleRequired: 'Treasury Cashier / Admin',
        actionLink: { href: '/admin/payments-ledger', label: 'Payments Ledger' },
      },
    ],
    importantNotes: [
      'Continuous delinquency for 3 consecutive months constitutes grounds for immediate lease revocation and repossession of stall rights under Municipal Ordinance.',
      'Subleasing or transferring stall rights without prior approval from the Municipal Mayor is strictly prohibited.',
    ],
  },
  {
    id: 'wf-waterworks-billing',
    title: 'Dalaguete Municipal Waterworks System Billing',
    subtitle: 'Consumer meter readings, tiered rate brackets, billing notices, and collections.',
    category: 'waterworks',
    badge: 'Utility Management',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    summary: 'Operational guide for reading water meters, computing graduated volume rates, and managing disconnections.',
    estimatedTime: 'Monthly Cycle',
    targetRoles: ['Waterworks Officer', 'Billing Clerk', 'Cashier'],
    steps: [
      {
        stepNumber: 1,
        title: 'Encode Monthly Meter Readings',
        description: 'Input previous and current cubic meter readings per consumer account.',
        details: [
          'Navigate to Admin > Waterworks.',
          'Select barangay/zone route and filter accounts.',
          'Input current reading (cu.m.); system verifies non-negative consumption.',
        ],
        roleRequired: 'Waterworks Staff',
        actionLink: { href: '/admin/waterworks', label: 'Waterworks Management' },
      },
      {
        stepNumber: 2,
        title: 'Rate Tier Computation & Billing Notice',
        description: 'System calculates minimum base charge plus graduated tiered rates per cubic meter consumed.',
        details: [
          'Applies consumer category rates: Residential, Commercial, or Institutional.',
          'Generates individual Statement of Account (SOA) with due date.',
        ],
        roleRequired: 'Billing Clerk / Assessor',
        actionLink: { href: '/admin/waterworks', label: 'Waterworks Billing' },
      },
      {
        stepNumber: 3,
        title: 'Payment Collection & Reconnection Orders',
        description: 'Accept water bill payments, issue receipts, and manage service reconnects.',
        details: [
          'Record collection O.R. and clear overdue water account ledger.',
          'Generate reconnection service orders for cleared accounts.',
        ],
        roleRequired: 'Cashier / Waterworks Admin',
        actionLink: { href: '/finance', label: 'Treasury Collections' },
      },
    ],
    importantNotes: [
      'Unpaid bills exceeding 30 days are issued a 48-hour Notice of Disconnection.',
      'Reconnection fee of ₱300.00 applies prior to service restoration.',
    ],
  },
];

// -------------------------------------------------------------
// REVENUE CODE CHAPTERS & ARTICLES DATA
// -------------------------------------------------------------
export const REVENUE_CODE_ARTICLES: RevenueArticle[] = [
  {
    id: 'rev-chap-1',
    chapter: 'Chapter I',
    chapterTitle: 'General Provisions & Scope',
    articleNumber: 'Article I - III',
    title: 'Title, Scope, Construction & Definition of Terms',
    legalBasis: 'Republic Act No. 7160 (Local Government Code of 1991) & Municipal Ordinance No. 2022-XX',
    summary: 'Establishes the legal framework, jurisdiction, territorial application, and statutory definitions for all taxes, fees, and charges in the Municipality of Dalaguete.',
    provisions: [
      {
        sectionNumber: 'Sec. 1 - 3',
        heading: 'Title & Scope of Ordinance',
        text: 'This Code shall be known and cited as the "Revised Municipal Revenue Code of 2022 of the Municipality of Dalaguete, Province of Cebu." It governs the levy, assessment, and collection of all municipal taxes, regulatory fees, service charges, and rental dues within the territorial limits of Dalaguete.',
      },
      {
        sectionNumber: 'Sec. 4 - 6',
        heading: 'Construction of Provisions & Rules of Interpretation',
        text: 'Words and phrases shall be construed in their plain, ordinary meaning unless specifically defined. In case of doubt, tax provisions shall be construed strictly against the Municipality and liberally in favor of the taxpayer, while exemptions shall be strictly construed against the claimant.',
      },
      {
        sectionNumber: 'Sec. 7 - 12',
        heading: 'Key Statutory Definitions',
        text: 'Covers legal definitions for: Business, Capital Investment, Gross Sales/Receipts, Marginal Farmer/Fisherman, Operator, Public Utility, Rental, Retailer, Surcharge, and Wholesaler.',
      },
    ],
    tags: ['general', 'definitions', 'scope', 'legal basis', 'ordinance'],
  },
  {
    id: 'rev-chap-2',
    chapter: 'Chapter II',
    chapterTitle: 'Taxes on Business',
    articleNumber: 'Article I - IV',
    title: 'Graduated Business Taxes & Gross Receipts Schedules',
    legalBasis: 'LGC Sec. 143 & Municipal Revenue Code 2022',
    summary: 'Specifies the graduated tax brackets on manufacturers, wholesalers, distributors, retailers, contractors, financial institutions, and service providers operating in Dalaguete.',
    provisions: [
      {
        sectionNumber: 'Sec. 15 - 22',
        heading: 'Manufacturers, Assemblers, Repackers & Processors',
        text: 'Graduated tax rates based on gross sales or receipts for the preceding calendar year. Minimum bracket starts at gross sales less than ₱10,000 up to multi-million enterprise brackets.',
        ratesTable: [
          { label: 'Gross Sales < ₱10,000.00', amount: '₱165.00 / year', note: 'Base minimum' },
          { label: '₱10,000.00 to ₱15,000.00', amount: '₱220.00 / year' },
          { label: '₱50,000.00 to ₱75,000.00', amount: '₱1,320.00 / year' },
          { label: '₱1,000,000.00 to ₱2,000,000.00', amount: '₱13,750.00 / year' },
          { label: 'In excess of ₱6,500,000.00', amount: '₱27,500.00 + 37.5% of 1% in excess' },
        ],
      },
      {
        sectionNumber: 'Sec. 23 - 28',
        heading: 'Wholesalers, Distributors & Dealers',
        text: 'Graduated rates applicable to businesses selling in bulk or commercial lots for resale.',
        ratesTable: [
          { label: 'Gross Sales < ₱10,000.00', amount: '₱66.00 / year' },
          { label: '₱50,000.00 to ₱75,000.00', amount: '₱990.00 / year' },
          { label: '₱1,000,000.00 to ₱2,000,000.00', amount: '₱8,800.00 / year' },
          { label: 'In excess of ₱2,000,000.00', amount: '₱10,000.00 + 50% of 1% in excess' },
        ],
      },
      {
        sectionNumber: 'Sec. 29 - 34',
        heading: 'Retailers & Essential Commodities',
        text: 'Retailers with gross sales exceeding ₱50,000.00 are taxed at 2% on essential commodities (rice, corn, flour, milk, cooking oil, medicines) and 2.5% on non-essential goods per annum.',
      },
    ],
    tags: ['business tax', 'manufacturers', 'wholesalers', 'retailers', 'gross sales'],
  },
  {
    id: 'rev-chap-3',
    chapter: 'Chapter III',
    chapterTitle: 'Mayor’s Permit & Regulatory Fees',
    articleNumber: 'Article I - V',
    title: 'Mayor’s Permit Fees, Fixed Licenses & Special Activity Clearances',
    legalBasis: 'LGC Sec. 147 & Dalaguete Ordinance 2022',
    summary: 'Governs Mayor’s Permit fee schedules across various business classifications, commercial activities, industrial plants, telecom cell sites, and special public events.',
    provisions: [
      {
        sectionNumber: 'Sec. 45 - 50',
        heading: 'Mayor’s Permit Fee on Business Classifications',
        text: 'Annual permit fees assessed according to scale of capital and nature of business establishment.',
        ratesTable: [
          { label: 'Large Scale Commercial / Industrial', amount: '₱3,000.00 - ₱10,000.00 / yr' },
          { label: 'Medium Scale Enterprises', amount: '₱1,500.00 - ₱3,000.00 / yr' },
          { label: 'Small Scale / Sari-Sari Stores', amount: '₱300.00 - ₱800.00 / yr' },
          { label: 'Telecommunications Cell Sites / Towers', amount: '₱50,000.00 / tower / yr', note: 'PAMS Attribute code: Cell Site' },
          { label: 'Banking & Financial Institutions', amount: '₱5,000.00 / yr' },
          { label: 'Pawnshops & Money Remittance', amount: '₱2,500.00 / yr' },
        ],
      },
      {
        sectionNumber: 'Sec. 51 - 58',
        heading: 'Special Permits (Cockfighting, Mahjong, Disco, Public Events)',
        text: 'Regulations and fixed permit charges for holding temporary gatherings, entertainment venues, cockpits, and recreational activities.',
        ratesTable: [
          { label: 'Cockpit Annual Operation Permit', amount: '₱15,000.00 / yr' },
          { label: 'Special Cockfight (Derby / Fiesta) per day', amount: '₱1,500.00 / day' },
          { label: 'Public Benefit Disco / Dance Permit', amount: '₱500.00 / night' },
          { label: 'Mahjong / Table Games Permit', amount: '₱1,000.00 / table / yr' },
        ],
      },
      {
        sectionNumber: 'Sec. 59 - 64',
        heading: 'Sanitary Inspection & Health Examination Fees',
        text: 'Mandatory annual health card issuance (₱150.00) and sanitary inspection clearance for all food handlers, personal service establishments, and public accommodation venues.',
      },
    ],
    tags: ['mayors permit', 'cell site', 'sanitary', 'health card', 'cockpit', 'disco'],
  },
  {
    id: 'rev-chap-4',
    chapter: 'Chapter IV',
    chapterTitle: 'Service & Administrative Fees',
    articleNumber: 'Article I - VI',
    title: 'Civil Registry, Secretary Fees, Clearances & IT/Computer Processing',
    legalBasis: 'LGC Sec. 152 & Revenue Code 2022',
    summary: 'Standard schedule of fees for civil registry filings, municipal certifications, zoning clearances, computer processing fees, and document verification.',
    provisions: [
      {
        sectionNumber: 'Sec. 70 - 75',
        heading: 'Secretary Fees & Certified True Copies',
        text: 'Charges for official municipal record copies, verifications, and endorsements.',
        ratesTable: [
          { label: 'Certified True Copy of Municipal Records (per page)', amount: '₱50.00' },
          { label: 'Secretary’s Certification (General)', amount: '₱100.00' },
          { label: 'Mayor’s Clearance / Good Moral Character', amount: '₱150.00' },
          { label: 'Police / Enforcer Clearance', amount: '₱150.00' },
          { label: 'PAMS Computer / IT Processing Fee', amount: '₱200.00', note: 'Standard per application' },
        ],
      },
      {
        sectionNumber: 'Sec. 76 - 82',
        heading: 'Civil Registry Fees',
        text: 'Official fees for marriage licenses, delayed birth/death registration, legitimation, and supplemental reports.',
        ratesTable: [
          { label: 'Marriage Application Fee', amount: '₱300.00' },
          { label: 'Marriage Solemnization Fee (by Mayor)', amount: '₱500.00' },
          { label: 'Delayed Registration Filing Fee', amount: '₱250.00' },
          { label: 'Legitimation / Correction of Entry', amount: '₱1,000.00' },
        ],
      },
      {
        sectionNumber: 'Sec. 83 - 90',
        heading: 'Zoning & Locational Clearances',
        text: 'Locational clearances for residential, commercial, industrial, and agricultural constructions prior to building permit issuance.',
      },
    ],
    tags: ['civil registry', 'computer fee', 'secretary fee', 'zoning clearance', 'marriage'],
  },
  {
    id: 'rev-chap-5',
    chapter: 'Chapter V',
    chapterTitle: 'Municipal Properties & Public Market',
    articleNumber: 'Article I - IV',
    title: 'Public Market Stalls, Slaughterhouse, Cemetery & Property Rentals',
    legalBasis: 'LGC Sec. 154 & Dalaguete Market Ordinance',
    summary: 'Lease rates, rights fees, market section classifications, slaughterhouse fees, and municipal rental policies.',
    provisions: [
      {
        sectionNumber: 'Sec. 110 - 118',
        heading: 'Dalaguete Public Market Stall Classifications & Rental Rates',
        text: 'Market stalls are categorized into Sections: Wet Market (Fish, Meat, Poultry), Dry Goods & Groceries, Cooked Food / Eateries, and Commercial Perimeter Booths.',
        ratesTable: [
          { label: 'Wet Market Section (Stall/mo)', amount: '₱1,200.00 - ₱2,500.00' },
          { label: 'Dry Goods & General Merchandise (Stall/mo)', amount: '₱1,500.00 - ₱3,500.00' },
          { label: 'Perimeter Commercial Booths (Stall/mo)', amount: '₱3,000.00 - ₱6,000.00' },
          { label: 'Daily Market Transient Fee (Ambulant)', amount: '₱30.00 - ₱50.00 / day' },
        ],
      },
      {
        sectionNumber: 'Sec. 119 - 125',
        heading: 'Rental Payment Deadlines & Surcharges',
        text: 'Monthly stall rentals are due on or before the 20th day of the current month. Late payments incur a mandatory 25% surcharge plus 2% interest per month of delay.',
      },
      {
        sectionNumber: 'Sec. 126 - 135',
        heading: 'Slaughterhouse & Livestock Ante-Mortem / Post-Mortem Fees',
        text: 'Inspection, corral, and slaughter fees for cattle, swine, goats, and poultry.',
        ratesTable: [
          { label: 'Large Cattle (Slaughter & Inspection per head)', amount: '₱350.00' },
          { label: 'Hog / Swine (per head)', amount: '₱180.00' },
          { label: 'Goat / Sheep (per head)', amount: '₱100.00' },
        ],
      },
    ],
    tags: ['market stalls', 'rights and rentals', 'slaughterhouse', 'lease', 'surcharge'],
  },
  {
    id: 'rev-chap-6',
    chapter: 'Chapter VI',
    chapterTitle: 'Traffic & Municipal Citations',
    articleNumber: 'Article I - III',
    title: 'Traffic Violations, Penalties, Impounding & Enforcer Operations',
    legalBasis: 'Dalaguete Traffic Management Code & LGC Sec. 447',
    summary: 'Codified penalties for traffic infractions, driver misconduct, vehicle registration defects, and obstruction to public roadways.',
    provisions: [
      {
        sectionNumber: 'Sec. 180 - 185',
        heading: 'Citation Issuance & Standard Penalty Matrix',
        text: 'Traffic enforcers issue standard PAMS Citations with 22 classified violations. Fines range from ₱300.00 to ₱2,500.00 depending on offense gravity and recurrence.',
      },
      {
        sectionNumber: 'Sec. 186 - 190',
        heading: '72-Hour Settlement Window & Administrative Adjudication',
        text: 'Violators must settle penalties within seventy-two (72) hours at the Municipal Treasury or file a formal contest with the Traffic Adjudication Board.',
      },
      {
        sectionNumber: 'Sec. 191 - 195',
        heading: 'Impounding & Storage Fees',
        text: 'Vehicles towed or impounded for illegal parking, lack of registration, or driving under the influence incur ₱500.00 towing fee plus ₱150.00 per day storage fee.',
      },
    ],
    tags: ['citations', 'traffic fines', 'enforcers', 'impounding', 'violations'],
  },
  {
    id: 'rev-chap-7',
    chapter: 'Chapter VII',
    chapterTitle: 'Waterworks & Municipal Utilities',
    articleNumber: 'Article I - IV',
    title: 'Dalaguete Municipal Waterworks Rate Structure & Connection Dues',
    legalBasis: 'Municipal Ordinance No. 2022-W01 & LGC Sec. 154',
    summary: 'Graduated water consumption tariffs, new service connection installation charges, meter maintenance, and disconnection protocols.',
    provisions: [
      {
        sectionNumber: 'Sec. 210 - 215',
        heading: 'Water Consumption Tariffs (Per Cubic Meter)',
        text: 'Tiered pricing based on cubic meters consumed per monthly reading cycle.',
        ratesTable: [
          { label: 'Residential Minimum (0 - 10 cu.m.)', amount: '₱180.00 (Base Minimum)' },
          { label: 'Residential 11 - 20 cu.m.', amount: '₱22.00 / cu.m.' },
          { label: 'Residential 21 - 30 cu.m.', amount: '₱26.00 / cu.m.' },
          { label: 'Residential > 30 cu.m.', amount: '₱32.00 / cu.m.' },
          { label: 'Commercial / Industrial Base (0 - 10 cu.m.)', amount: '₱350.00 (Base Minimum)' },
          { label: 'Commercial > 10 cu.m.', amount: '₱45.00 / cu.m.' },
        ],
      },
      {
        sectionNumber: 'Sec. 216 - 220',
        heading: 'Connection, Meter Calibration & Reconnection Charges',
        text: 'New service line tapping (₱1,500.00), water meter testing (₱200.00), and reconnection fee following default disconnection (₱300.00).',
      },
    ],
    tags: ['waterworks', 'water rates', 'utility', 'meter reading', 'reconnection'],
  },
  {
    id: 'rev-chap-8',
    chapter: 'Chapter VIII',
    chapterTitle: 'Administrative Penalties & Collection Rules',
    articleNumber: 'Article I - III',
    title: 'Surcharges, Interest, Judicial Enforcement & Tax Remedies',
    legalBasis: 'LGC Sec. 168 - 171 & Revenue Code Sec. 250',
    summary: 'Uniform statutory rules on delinquent tax collection, 25% surcharge, 2% monthly interest (up to 72%), civil remedies, and seizure of personal property.',
    provisions: [
      {
        sectionNumber: 'Sec. 250',
        heading: 'Uniform Surcharge & Interest on Unpaid Municipal Taxes and Fees',
        text: 'A surcharge of twenty-five percent (25%) of the amount of taxes, fees, or charges not paid on time shall be collected. In addition, an interest of two percent (2%) per month of delinquency (or fraction thereof) shall be computed from the date due until fully paid, provided the total interest shall not exceed seventy-two percent (72%) or thirty-six (36) months.',
      },
      {
        sectionNumber: 'Sec. 251 - 253',
        heading: 'Remedies for Collection (Administrative Distraint & Court Action)',
        text: 'The Municipal Treasurer may enforce collection through warrant of distraint of goods/chattels, levy on real property, or by filing a civil suit in a court of competent jurisdiction.',
      },
    ],
    tags: ['surcharge', 'interest', 'penalties', 'delinquency', 'collection remedies'],
  },
];

// -------------------------------------------------------------
// TRAFFIC & MUNICIPAL VIOLATIONS (22 STANDARDIZED ITEMS)
// -------------------------------------------------------------
export const VIOLATIONS_REGISTRY: ViolationItem[] = [
  {
    id: 'vio-1',
    code: 'VIO-01',
    name: "No Driver's License",
    category: 'license',
    firstOffenseFine: 1000,
    subsequentOffenseFine: 2000,
    description: 'Operating a motor vehicle on any public roadway without possessing a valid driver’s license issued by LTO.',
    settlementPeriod: '72 Hours',
    actionRequired: 'Present valid driver’s license or certified driver receipt upon settlement.',
  },
  {
    id: 'vio-2',
    code: 'VIO-02',
    name: 'Over Pricing (Allowable Fare Rates)',
    category: 'operation',
    firstOffenseFine: 500,
    subsequentOffenseFine: 1000,
    description: 'Charging passengers fares exceeding the officially mandated municipal tricycle or public utility fare matrix.',
    settlementPeriod: '72 Hours',
    actionRequired: 'Refund excessive fare to passenger and settle penalty.',
  },
  {
    id: 'vio-3',
    code: 'VIO-03',
    name: 'Not in Proper Clothes / Personal Hygiene',
    category: 'operation',
    firstOffenseFine: 300,
    subsequentOffenseFine: 600,
    description: 'Operating public utility vehicles wearing sando, slippers, or without proper driver uniform/hygiene standards.',
    settlementPeriod: '72 Hours',
    actionRequired: 'Compliance briefing at Traffic Enforcement Office.',
  },
  {
    id: 'vio-4',
    code: 'VIO-04',
    name: 'Under the Influence of Liquor or Drugs',
    category: 'safety',
    firstOffenseFine: 2500,
    subsequentOffenseFine: 5000,
    description: 'Driving any motor vehicle while intoxicated with alcoholic beverages or prohibited drugs. Immediate impoundment applies.',
    settlementPeriod: 'Immediate / Formal Hearing',
    actionRequired: 'Vehicle impounded. Mandatory drug/alcohol screening report and endorsement to PNP/LTO.',
  },
  {
    id: 'vio-5',
    code: 'VIO-05',
    name: 'Smoking while Driving',
    category: 'operation',
    firstOffenseFine: 500,
    subsequentOffenseFine: 1000,
    description: 'Smoking tobacco, electronic cigarettes, or vapes while operating public conveyance or within smoke-free zones.',
    settlementPeriod: '72 Hours',
    actionRequired: 'Pay fine at Treasury Cashier.',
  },
  {
    id: 'vio-6',
    code: 'VIO-06',
    name: 'Use of Cellular Phone or Other Gadgets',
    category: 'safety',
    firstOffenseFine: 1000,
    subsequentOffenseFine: 2000,
    description: 'Distracted driving by holding mobile phones, texting, or using gadgets while vehicle is in transit.',
    settlementPeriod: '72 Hours',
    actionRequired: 'Pay fine at Municipal Treasury.',
  },
  {
    id: 'vio-7',
    code: 'VIO-07',
    name: 'Failure to Convey Passenger',
    category: 'operation',
    firstOffenseFine: 500,
    subsequentOffenseFine: 1000,
    description: 'Refusal without justifiable cause to transport passengers within designated franchise route.',
    settlementPeriod: '72 Hours',
    actionRequired: 'Submit written explanation to Franchising Board.',
  },
  {
    id: 'vio-8',
    code: 'VIO-08',
    name: 'Disregarding Traffic Signs, Signals & Markings',
    category: 'safety',
    firstOffenseFine: 500,
    subsequentOffenseFine: 1000,
    description: 'Failure to observe stop signs, traffic lights, pedestrian lanes, no-left-turn signs, or lane markings.',
    settlementPeriod: '72 Hours',
    actionRequired: 'Pay fine at Municipal Treasury.',
  },
  {
    id: 'vio-9',
    code: 'VIO-09',
    name: 'Over Speeding',
    category: 'safety',
    firstOffenseFine: 1000,
    subsequentOffenseFine: 2000,
    description: 'Exceeding municipal speed limits in urban/barangay zones (30 km/h) or highway school zones (20 km/h).',
    settlementPeriod: '72 Hours',
    actionRequired: 'Pay fine at Municipal Treasury.',
  },
  {
    id: 'vio-10',
    code: 'VIO-10',
    name: 'Drag Racing',
    category: 'safety',
    firstOffenseFine: 2500,
    subsequentOffenseFine: 5000,
    description: 'Engaging in unauthorized competitive vehicle speed contests on public streets. Immediate impoundment.',
    settlementPeriod: 'Immediate',
    actionRequired: 'Vehicle impoundment, clearance from Municipal Mayor.',
  },
  {
    id: 'vio-11',
    code: 'VIO-11',
    name: 'Counter Flow',
    category: 'safety',
    firstOffenseFine: 1000,
    subsequentOffenseFine: 2000,
    description: 'Driving against the flow of traffic on one-way designated streets or crossing double yellow solid centerlines.',
    settlementPeriod: '72 Hours',
    actionRequired: 'Pay fine at Municipal Treasury.',
  },
  {
    id: 'vio-12',
    code: 'VIO-12',
    name: 'No Protective Helmet',
    category: 'safety',
    firstOffenseFine: 500,
    subsequentOffenseFine: 1000,
    description: 'Rider or backrider failing to wear standard DOT-certified motorcycle protective safety helmet.',
    settlementPeriod: '72 Hours',
    actionRequired: 'Pay fine at Municipal Treasury.',
  },
  {
    id: 'vio-13',
    code: 'VIO-13',
    name: 'Arrogant / Discourteous Driver',
    category: 'operation',
    firstOffenseFine: 500,
    subsequentOffenseFine: 1000,
    description: 'Showing discourteous, insolent, belligerent, or threatening behavior toward passengers or traffic officers.',
    settlementPeriod: '72 Hours',
    actionRequired: 'Attending traffic ethics counseling session.',
  },
  {
    id: 'vio-14',
    code: 'VIO-14',
    name: 'No Vehicle Registration (LTO/Municipal)',
    category: 'license',
    firstOffenseFine: 1000,
    subsequentOffenseFine: 2000,
    description: 'Operating an unregistered motor vehicle or failing to carry current LTO Official Receipt / Certificate of Registration.',
    settlementPeriod: '72 Hours',
    actionRequired: 'Present valid registration papers or impoundment clearance.',
  },
  {
    id: 'vio-15',
    code: 'VIO-15',
    name: 'Out of Route / Line',
    category: 'parking_route',
    firstOffenseFine: 500,
    subsequentOffenseFine: 1000,
    description: 'Operating a public utility or tricycle outside the authorized franchise zone or designated route line.',
    settlementPeriod: '72 Hours',
    actionRequired: 'Pay fine and report to Tricycle Franchising Board.',
  },
  {
    id: 'vio-16',
    code: 'VIO-16',
    name: 'Entering National Highway without Clearance',
    category: 'parking_route',
    firstOffenseFine: 500,
    subsequentOffenseFine: 1000,
    description: 'Tricycles or motorized pedicabs traversing national highways without authorized municipal exemption lane.',
    settlementPeriod: '72 Hours',
    actionRequired: 'Pay fine at Municipal Treasury.',
  },
  {
    id: 'vio-17',
    code: 'VIO-17',
    name: 'No Reflector, Side Mirror, Horn or Bell',
    category: 'safety',
    firstOffenseFine: 300,
    subsequentOffenseFine: 600,
    description: 'Operating a vehicle lacking required safety equipment: functioning headlights, taillights, reflectors, mirrors, horn.',
    settlementPeriod: '72 Hours',
    actionRequired: 'Install safety accessories and undergo physical inspection.',
  },
  {
    id: 'vio-18',
    code: 'VIO-18',
    name: 'Obstruction to Traffic',
    category: 'parking_route',
    firstOffenseFine: 500,
    subsequentOffenseFine: 1000,
    description: 'Stopping, stalling, or leaving goods/structures on traffic lanes causing bottleneck or traffic stoppage.',
    settlementPeriod: '72 Hours',
    actionRequired: 'Clear obstruction immediately and settle penalty.',
  },
  {
    id: 'vio-19',
    code: 'VIO-19',
    name: 'Overloading (Passengers or Cargo)',
    category: 'safety',
    firstOffenseFine: 500,
    subsequentOffenseFine: 1000,
    description: 'Carrying passengers or freight exceeding the registered authorized capacity of the vehicle.',
    settlementPeriod: '72 Hours',
    actionRequired: 'Alight excess passengers/cargo and pay fine.',
  },
  {
    id: 'vio-20',
    code: 'VIO-20',
    name: 'Illegal Parking / Loading / Unloading',
    category: 'parking_route',
    firstOffenseFine: 500,
    subsequentOffenseFine: 1000,
    description: 'Parking in designated "No Parking" zones, loading/unloading outside designated passenger bays.',
    settlementPeriod: '72 Hours',
    actionRequired: 'Pay fine at Municipal Treasury.',
  },
  {
    id: 'vio-21',
    code: 'VIO-21',
    name: 'Cutting Trip / Abandoning Route',
    category: 'parking_route',
    firstOffenseFine: 500,
    subsequentOffenseFine: 1000,
    description: 'Failing to complete authorized route and forcing passengers to alight prematurely.',
    settlementPeriod: '72 Hours',
    actionRequired: 'Refund fare and pay fine.',
  },
  {
    id: 'vio-22',
    code: 'VIO-22',
    name: 'Other Municipal Ordinances Violation',
    category: 'miscellaneous',
    firstOffenseFine: 500,
    subsequentOffenseFine: 1000,
    description: 'Violating specific local municipal ordinances as cited in ticket remarks by the apprehending officer.',
    settlementPeriod: '72 Hours',
    actionRequired: 'Comply with specific directive in citation ticket.',
  },
];

// -------------------------------------------------------------
// STANDARD FEES DIRECTORY
// -------------------------------------------------------------
export const STANDARD_FEES_DIRECTORY: StandardFee[] = [
  {
    id: 'fee-mayors',
    name: "Mayor's Permit Fee",
    category: 'Regulatory Fee',
    amount: '₱300.00 - ₱10,000.00',
    basis: 'Capital investment & business classification',
    schedule: 'Annual (due Jan 20)',
    requirements: ['DTI/SEC Registration', 'Barangay Clearance', 'Sanitary Permit', 'Zoning Clearance'],
  },
  {
    id: 'fee-comp',
    name: 'Computer Processing Fee',
    category: 'Other Charge',
    amount: '₱200.00',
    basis: 'Per application encoded into PAMS',
    schedule: 'Per Transaction',
    requirements: ['Application submission in PAMS'],
  },
  {
    id: 'fee-sanitary',
    name: 'Sanitary Inspection Fee',
    category: 'Regulatory Fee',
    amount: '₱200.00 - ₱1,500.00',
    basis: 'Establishment floor area & hazard classification',
    schedule: 'Annual',
    requirements: ['Sanitary inspection checklist', 'Health certificates of employees'],
  },
  {
    id: 'fee-health',
    name: 'Health Certificate / Examination Card',
    category: 'Regulatory Fee',
    amount: '₱150.00',
    basis: 'Per employee / food handler',
    schedule: 'Annual',
    requirements: ['Chest X-ray', 'Stool Exam', 'Urinalysis', '1x1 ID Photo'],
  },
  {
    id: 'fee-zoning',
    name: 'Zoning & Locational Clearance',
    category: 'Zoning Fees',
    amount: '₱250.00 - ₱5,000.00',
    basis: 'Project cost / floor area',
    schedule: 'Per Project / Building',
    requirements: ['Vicinity map', 'Building plan / site layout', 'Land title or lease contract'],
  },
  {
    id: 'fee-cellsite',
    name: 'Telecommunications Cell Site Fee',
    category: 'Regulatory Fee',
    amount: '₱50,000.00',
    basis: 'Per cell site tower / antenna base',
    schedule: 'Annual',
    requirements: ['NTC Permit', 'Barangay Endorsement', 'Structural Safety Certificate'],
  },
  {
    id: 'fee-garbage',
    name: 'Solid Waste & Garbage Collection Fee',
    category: 'Service Fee',
    amount: '₱500.00 - ₱3,000.00',
    basis: 'Type of business & daily waste volume',
    schedule: 'Annual',
    requirements: ['Solid Waste Management Agreement'],
  },
];

// -------------------------------------------------------------
// FAQS & TROUBLESHOOTING DATA
// -------------------------------------------------------------
export const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'When is the deadline for renewing business permits without penalties?',
    answer: 'Under Section 250 of the Revised Revenue Code, business permits must be renewed on or before January 20 of each year. Renewals submitted on January 21 onwards are automatically charged a 25% statutory surcharge plus a 2% monthly interest on all overdue municipal taxes and fees.',
    category: 'applications',
    tags: ['renewal', 'deadline', 'surcharge', 'january 20'],
  },
  {
    id: 'faq-2',
    question: 'How is the 25% Surcharge and 2% monthly interest computed in PAMS?',
    answer: 'The 25% surcharge is a one-time flat penalty applied to the principal assessment amount once the due date passes. In addition, an interest of 2% per month (or fraction of a month) is accumulated from the due date until full payment, up to a statutory ceiling of 72% (36 months maximum).',
    category: 'billing',
    tags: ['surcharge computation', 'interest formula', 'delinquency'],
  },
  {
    id: 'faq-3',
    question: 'What happens if a traffic citation ticket is not settled within 72 hours?',
    answer: 'Traffic citations have a 72-hour grace period for voluntary administrative settlement at the Municipal Treasury. If unsettled, the PAMS Citations system flags the driver license and vehicle plate for transmission to the Land Transportation Office (LTO) Law Enforcement Alarms and initiates summons from the Municipal Legal Office.',
    category: 'citations',
    tags: ['72 hours', 'unpaid ticket', 'lto alarm', 'impound'],
  },
  {
    id: 'faq-4',
    question: 'Can public market stall tenants sublease or transfer their rights?',
    answer: 'No. Section 120 strictly prohibits the subleasing, mortgaging, or informal transfer of market stall rights. Any transfer of rights requires formal petition to the Municipal Market Committee and executive approval by the Municipal Mayor, accompanied by payment of the prescribed transfer fee.',
    category: 'rentals',
    tags: ['sublease', 'market stall', 'transfer of rights'],
  },
  {
    id: 'faq-5',
    question: 'What are the required roles for approving and releasing a Mayor’s Permit in PAMS?',
    answer: 'An application is created by an "Application Creator" or Admin, assessed by an "Assessor", approved by an "Approver" (Department Head / Mayoral Signatory), paid at the Treasury, and officially marked released by a Permit Officer.',
    category: 'roles',
    tags: ['user roles', 'approval chain', 'workflow permissions'],
  },
  {
    id: 'faq-6',
    question: 'What is the procedure for water service reconnection after disconnection?',
    answer: 'Consumers must settle all unpaid water utility balances in full plus the official ₱300.00 reconnection fee at the Municipal Treasury. Upon recording the Official Receipt in PAMS, a Reconnection Work Order is dispatched to the Waterworks field technician for restoration within 24 hours.',
    category: 'billing',
    tags: ['waterworks', 'reconnection fee', 'soa'],
  },
];

// -------------------------------------------------------------
// REVENUE & LEGAL GLOSSARY
// -------------------------------------------------------------
export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: 'Assessment Notice',
    definition: 'An official written computation issued by the Municipal Assessor determining the exact amount of taxes, fees, and regulatory charges due from a taxpayer.',
    category: 'Taxation',
    ordinanceRef: 'Sec. 18',
  },
  {
    term: 'Capital Investment',
    definition: 'Total funds, resources, machinery, and property invested by a business enterprise to commence or expand operations within Dalaguete.',
    category: 'Business',
    ordinanceRef: 'Sec. 8',
  },
  {
    term: 'Distraint of Personal Property',
    definition: 'The statutory seizure of personal goods, chattels, or bank accounts of a delinquent taxpayer by the Municipal Treasurer to satisfy unpaid taxes.',
    category: 'Legal Remedy',
    ordinanceRef: 'Sec. 251',
  },
  {
    term: 'Gross Sales / Receipts',
    definition: 'The total monetary value received or accrued from goods sold, services rendered, or property leased, without deductions for cost of sales or overhead.',
    category: 'Accounting',
    ordinanceRef: 'Sec. 10',
  },
  {
    term: 'Locational Clearance',
    definition: 'A written clearance issued by the Municipal Planning and Development Office certifying that a proposed building or enterprise conforms to the Comprehensive Land Use Plan.',
    category: 'Zoning',
    ordinanceRef: 'Sec. 83',
  },
  {
    term: 'Official Receipt (O.R.)',
    definition: 'An accountable government receipt issued by the Municipal Treasury validating that lawful payment has been credited to municipal funds.',
    category: 'Treasury',
    ordinanceRef: 'Sec. 14',
  },
  {
    term: 'Situs of Taxation',
    definition: 'The territorial jurisdiction or geographic locality where a taxable transaction, property, or business entity has legal standing to be taxed.',
    category: 'Tax Law',
    ordinanceRef: 'Sec. 33',
  },
  {
    term: 'Surcharge',
    definition: 'A mandatory punitive charge of twenty-five percent (25%) levied on top of any unpaid tax, fee, or rental due that was not settled on or before the due date.',
    category: 'Penalties',
    ordinanceRef: 'Sec. 250',
  },
];
