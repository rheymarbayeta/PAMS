import apiClient from './client';
import type { WaterSupply, ConsumerAccount, MeterReading } from '../types/waterworks';

export async function login(username: string, password: string) {
  const response = await apiClient.post('/api/auth/login', { username, password });
  return response.data;
}

export async function getMySupplies(): Promise<WaterSupply[]> {
  const response = await apiClient.get('/api/waterworks/mobile/supplies');
  return response.data.data;
}

export async function getSupplyAccounts(
  supplyId: string,
  params?: { search?: string; unread_only?: boolean; page?: number; period_month?: number; period_year?: number }
): Promise<{ data: ConsumerAccount[]; pagination: { page: number; pages: number; total: number } }> {
  const response = await apiClient.get(`/api/waterworks/mobile/supplies/${supplyId}/accounts`, { params });
  return response.data;
}

export async function getAccountDetail(accountId: string) {
  const response = await apiClient.get(`/api/waterworks/mobile/accounts/${accountId}`);
  return response.data.data;
}

export async function submitReading(data: {
  account_id: string;
  current_reading: number;
  reading_date?: string;
  notes?: string;
  period_month?: number;
  period_year?: number;
}) {
  const response = await apiClient.post('/api/waterworks/mobile/readings', data);
  return response.data;
}

export async function getMyRecentReadings(page = 1): Promise<{ data: MeterReading[]; pagination: { pages: number } }> {
  const response = await apiClient.get('/api/waterworks/mobile/readings/my-recent', { params: { page, limit: 20 } });
  return response.data;
}
