/** Shared citation domain constants (Phase 2 page split). */

export const VIOLATIONS = [
  "No Driver's License",
  'Over Pricing (Allowable Fare Rates)',
  'Not in Proper Clothes/Personal Hygiene',
  'Under the Influence of Liquor or Drugs',
  'Smoking while Driving',
  'Use of Cellular Phone or Other Gadgets',
  'Failure to Convey Passenger',
  'Disregarding Traffic Signs, Signals & Markings',
  'Over Speeding',
  'Drag Racing',
  'Counter Flow',
  'No Protective Helmet',
  'Arrogant Driver',
  'No Registration',
  'Out of Route/Line',
  'Entering National Highway',
  'No Reflector, Side Mirror and Horn or Bell',
  'Obstruction to Traffic',
  'Overloading',
  'Illegal Parking/Loading/Unloading',
  'Cutting Trip/Not Following Route',
  'Others',
] as const;

export type CitationListItem = {
  citation_id: string;
  ticket_number: string;
  driver_name: string;
  plate_number: string;
  violation_date: string;
  fine_amount: number;
  payment_status: string;
  is_completed?: boolean;
  violations?: string[];
  created_at?: string;
  issued_by_name?: string;
};
