import api from './api';

export interface WaterSupply {
  supply_id: string;
  supply_code: string;
  supply_name: string;
  location?: string;
  description?: string;
  rate_per_cubic_meter: number;
  minimum_charge: number;
  status: 'active' | 'inactive' | 'maintenance';
  account_count?: number;
}

export interface ConsumerAccount {
  account_id: string;
  account_number: string;
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

  getSupply: async (id: string) => {
    const response = await api.get<{ data: WaterSupply }>(`/api/waterworks/water-supplies/${id}`);
    return response.data.data;
  },

  createSupply: async (data: Partial<WaterSupply>) => {
    const response = await api.post('/api/waterworks/water-supplies', data);
    return response.data;
  },

  updateSupply: async (id: string, data: Partial<WaterSupply>) => {
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

  createAccount: async (data: Partial<ConsumerAccount>) => {
    const response = await api.post('/api/waterworks/accounts', data);
    return response.data;
  },

  updateAccount: async (id: string, data: Partial<ConsumerAccount>) => {
    const response = await api.put(`/api/waterworks/accounts/${id}`, data);
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
};

export interface RateTier {
  tier_id: string;
  tier_order: number;
  from_m3: number;
  to_m3: number | null;
  charge_type: 'minimum' | 'per_cubic';
  rate_amount: number;
  description?: string;
}

export default waterworksService;
