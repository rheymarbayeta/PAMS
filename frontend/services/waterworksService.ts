import api from './api';

export interface WaterSupply {
  supply_id: string;
  supply_code: string;
  supply_name: string;
  location?: string;
  description?: string;
  reading_day_from?: number | null;
  reading_day_to?: number | null;
  billing_day?: number | null;
  rate_per_cubic_meter: number;
  minimum_charge: number;
  billing_model?: BillingModel;
  status: 'active' | 'inactive' | 'maintenance';
  account_count?: number;
  rate_tiers?: RateTier[];
}

export type BillingModel = 'progressive' | 'bracket_flat' | 'per_unit_deduction' | 'minimum_excess';

export type AccountType = 'residential' | 'commercial' | 'institutional' | 'others';

export const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string; code: string }[] = [
  { value: 'residential', label: 'Residential', code: 'R' },
  { value: 'commercial', label: 'Commercial', code: 'C' },
  { value: 'institutional', label: 'Institutional', code: 'I' },
  { value: 'others', label: 'Others', code: 'O' },
];

export interface ConsumerAccountInput {
  account_number?: string;
  account_type?: AccountType;
  supply_id?: string;
  entity_id?: string;
  consumer_name?: string;
  address?: string;
  contact_number?: string;
  email?: string;
  meter_number?: string;
  connection_date?: string;
  status?: 'active' | 'disconnected' | 'suspended';
  previous_reading?: number;
  last_reading?: number;
  unpaid_dues?: number;
  unpaid_dues_notes?: string | null;
}

export interface ConsumerAccount {
  account_id: string;
  account_number: string;
  account_type?: AccountType;
  supply_id: string;
  entity_id?: string | null;
  linked_entity_name?: string | null;
  entity_name?: string | null;
  consumer_name: string;
  address?: string;
  contact_number?: string;
  email?: string;
  meter_number?: string;
  connection_date?: string;
  status: 'active' | 'disconnected' | 'suspended';
  previous_reading: number;
  last_reading?: number;
  last_reading_date?: string;
  unpaid_dues?: number;
  unpaid_dues_notes?: string | null;
  supply_name?: string;
  supply_code?: string;
  rate_per_cubic_meter?: number;
  minimum_charge?: number;
}

export interface MeterReading {
  reading_id: string;
  account_id: string;
  reading_date: string;
  previous_reading: number;
  current_reading: number;
  consumption: number;
  reading_period_month: number;
  reading_period_year: number;
  recorded_by: string;
  status: 'pending' | 'verified' | 'rejected';
  notes?: string;
  account_number?: string;
  consumer_name?: string;
  meter_number?: string;
  supply_name?: string;
  recorded_by_name?: string;
}

export interface WaterBill {
  bill_id: string;
  account_id: string;
  billing_month: number;
  billing_year: number;
  previous_reading: number;
  current_reading: number;
  consumption: number;
  rate_applied: number;
  amount_due: number;
  previous_balance: number;
  surcharge_amount: number;
  total_due: number;
  status: 'unpaid' | 'partial' | 'paid';
  total_paid?: number;
  account_number?: string;
  consumer_name?: string;
  supply_name?: string;
}

export interface WaterPayment {
  payment_id: string;
  account_id: string;
  bill_id?: string;
  payment_date: string;
  amount_paid: number;
  or_number?: string;
  payment_method?: string;
  notes?: string;
  account_number?: string;
  consumer_name?: string;
  supply_name?: string;
  recorded_by_name?: string;
  billing_month?: number;
  billing_year?: number;
}

export interface SupplyReader {
  assignment_id: string;
  supply_id: string;
  user_id: string;
  supply_name?: string;
  full_name?: string;
  username?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

const waterworksService = {
  getSupplies: async (params?: Record<string, string | number>) => {
    const response = await api.get<PaginatedResponse<WaterSupply>>('/api/waterworks/water-supplies', { params });
    return response.data;
  },

  getNextSupplyCode: async () => {
    const response = await api.get<{ data: { supply_code: string } }>('/api/waterworks/water-supplies/next-code');
    return response.data.data.supply_code;
  },

  getSupply: async (id: string) => {
    const response = await api.get<{ data: WaterSupply }>(`/api/waterworks/water-supplies/${id}`);
    return response.data.data;
  },

  createSupply: async (data: WaterSupplyInput) => {
    const response = await api.post('/api/waterworks/water-supplies', data);
    return response.data;
  },

  updateSupply: async (id: string, data: WaterSupplyInput) => {
    const response = await api.put(`/api/waterworks/water-supplies/${id}`, data);
    return response.data;
  },

  deleteSupply: async (id: string) => {
    const response = await api.delete(`/api/waterworks/water-supplies/${id}`);
    return response.data;
  },

  getAccounts: async (params?: Record<string, string | number>) => {
    const response = await api.get<PaginatedResponse<ConsumerAccount>>('/api/waterworks/accounts', { params });
    return response.data;
  },

  getAccount: async (id: string) => {
    const response = await api.get<{ data: ConsumerAccount }>(`/api/waterworks/accounts/${id}`);
    return response.data.data;
  },

  getAccountSummary: async (id: string) => {
    const response = await api.get('/api/waterworks/accounts/' + id + '/summary');
    return response.data.data;
  },

  getNextAccountNumber: async (supplyId: string, accountType: AccountType = 'residential') => {
    const response = await api.get<{ data: { account_number: string; account_type: AccountType; type_code: string } }>(
      '/api/waterworks/accounts/next-number',
      { params: { supply_id: supplyId, account_type: accountType } }
    );
    return response.data.data;
  },

  createAccount: async (data: ConsumerAccountInput) => {
    const response = await api.post('/api/waterworks/accounts', data);
    return response.data;
  },

  updateAccount: async (id: string, data: ConsumerAccountInput) => {
    const response = await api.put(`/api/waterworks/accounts/${id}`, data);
    return response.data;
  },

  deleteAccount: async (id: string) => {
    const response = await api.delete(`/api/waterworks/accounts/${id}`);
    return response.data;
  },

  getReadings: async (params?: Record<string, string | number>) => {
    const response = await api.get<PaginatedResponse<MeterReading>>('/api/waterworks/readings', { params });
    return response.data;
  },

  createReading: async (data: Record<string, unknown>) => {
    const response = await api.post('/api/waterworks/readings', data);
    return response.data;
  },

  verifyReading: async (id: string, action: 'verify' | 'reject', rejection_reason?: string) => {
    const response = await api.put(`/api/waterworks/readings/${id}/verify`, { action, rejection_reason });
    return response.data;
  },

  getBills: async (params?: Record<string, string | number>) => {
    const response = await api.get<PaginatedResponse<WaterBill>>('/api/waterworks/bills', { params });
    return response.data;
  },

  generateBills: async (data: { billing_month: number; billing_year: number; supply_id?: string; account_ids?: string[] }) => {
    const response = await api.post('/api/waterworks/bills/generate', data);
    return response.data;
  },

  getBillingStatement: async (accountId: string, month: number, year: number) => {
    const response = await api.get(`/api/waterworks/accounts/${accountId}/billing`, { params: { month, year } });
    return response.data.data;
  },

  getPayments: async (params?: Record<string, string | number>) => {
    const response = await api.get<PaginatedResponse<WaterPayment>>('/api/waterworks/payments', { params });
    return response.data;
  },

  recordPayment: async (accountId: string, data: Record<string, unknown>) => {
    const response = await api.post(`/api/waterworks/accounts/${accountId}/payments`, data);
    return response.data;
  },

  getCollectionSummary: async (params?: Record<string, string | number>) => {
    const response = await api.get('/api/waterworks/reports/collection-summary', { params });
    return response.data.data;
  },

  getSupplyReaders: async (params?: Record<string, string>) => {
    const response = await api.get<{ data: SupplyReader[] }>('/api/waterworks/supply-readers', { params });
    return response.data.data;
  },

  assignReader: async (supply_id: string, user_id: string) => {
    const response = await api.post('/api/waterworks/supply-readers', { supply_id, user_id });
    return response.data;
  },

  removeReader: async (assignmentId: string) => {
    const response = await api.delete(`/api/waterworks/supply-readers/${assignmentId}`);
    return response.data;
  },

  getRateTiers: async (supplyId?: string) => {
    const response = await api.get<{ data: RateTier[] }>('/api/waterworks/rate-tiers', {
      params: supplyId ? { supply_id: supplyId } : undefined,
    });
    return response.data.data;
  },

  getRateComputation: async (supplyId: string) => {
    const response = await api.get<{ data: RateComputationPayload }>(
      `/api/waterworks/supplies/${supplyId}/rate-computation`
    );
    return response.data.data;
  },

  saveRateComputation: async (supplyId: string, data: RateComputationInput) => {
    const response = await api.put<{ data: RateComputationPayload }>(
      `/api/waterworks/supplies/${supplyId}/rate-computation`,
      data
    );
    return response.data.data;
  },

  applyRateComputation: async (
    supplyId: string,
    classification: 'tapstand' | 'residential' | 'commercial' = 'residential'
  ) => {
    const response = await api.post(`/api/waterworks/supplies/${supplyId}/rate-computation/apply`, {
      classification,
    });
    return response.data;
  },
};

export interface RateComputationStaffRow {
  staff_id?: string;
  role_name: string;
  headcount: number;
  monthly_rate: number;
  sort_order?: number;
  total?: number;
}

export interface RateComputationOpexRow {
  opex_id?: string;
  category_name: string;
  amount_monthly: number;
  sort_order?: number;
}

export interface RateComputationAssetRow {
  asset_id?: string;
  component_name: string;
  cost: number;
  service_life_years: number;
  depreciable_percent: number;
  sort_order?: number;
  depreciation_yearly?: number;
  depreciation_monthly?: number;
}

export interface RateComputationInput {
  household_count?: number;
  avg_household_size?: number;
  liters_per_person_day?: number;
  days_per_month?: number;
  inflation_rate_percent?: number;
  amortization_monthly?: number;
  min_volume_m3?: number;
  excess_block_size_m3?: number;
  escalation_percent?: number;
  markup_tapstand_percent?: number;
  markup_residential_percent?: number;
  markup_commercial_percent?: number;
  notes?: string | null;
  staff?: RateComputationStaffRow[];
  opex?: RateComputationOpexRow[];
  assets?: RateComputationAssetRow[];
}

export interface RateComputationPayload extends RateComputationInput {
  supply: { supply_id: string; supply_code: string; supply_name: string };
  worksheet?: Record<string, unknown> | null;
  computation: any;
  is_default?: boolean;
}

export interface RateTier {
  tier_id: string;
  tier_order: number;
  from_m3: number;
  to_m3: number | null;
  charge_type: 'minimum' | 'per_cubic' | 'flat_bracket' | 'deduction';
  rate_amount: number;
  description?: string;
}

export type RateTierInput = Omit<RateTier, 'tier_id'> & { tier_id?: string };

export interface WaterSupplyInput {
  supply_code?: string;
  supply_name?: string;
  location?: string;
  description?: string;
  reading_day_from?: number | null;
  reading_day_to?: number | null;
  billing_day?: number | null;
  status?: WaterSupply['status'];
  billing_model?: BillingModel;
  base_unit_rate?: number;
  rate_tiers?: RateTierInput[];
}

export default waterworksService;
