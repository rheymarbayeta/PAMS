export interface WaterSupply {
  supply_id: string;
  supply_code: string;
  supply_name: string;
  location?: string;
  status: string;
  reading_day_from?: number | null;
  reading_day_to?: number | null;
  billing_day?: number | null;
  account_count?: number;
}

export interface ConsumerAccount {
  account_id: string;
  account_number: string;
  consumer_name: string;
  meter_number?: string;
  address?: string;
  last_reading?: number;
  last_reading_date?: string;
  previous_reading?: number;
  has_reading_this_period?: number;
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
  status: string;
  notes?: string;
  account_number?: string;
  consumer_name?: string;
  supply_name?: string;
  created_at?: string;
}

export interface UserInfo {
  user_id: string;
  username: string;
  full_name: string;
  roles: string[];
}
