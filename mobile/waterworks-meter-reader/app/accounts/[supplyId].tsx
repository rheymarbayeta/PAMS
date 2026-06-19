import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { getSupplyAccounts } from '../src/api/waterworks';
import type { ConsumerAccount } from '../src/types/waterworks';

export default function AccountsScreen() {
  const { supplyId, name } = useLocalSearchParams<{ supplyId: string; name?: string }>();
  const router = useRouter();
  const [accounts, setAccounts] = useState<ConsumerAccount[]>([]);
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!supplyId) return;
    try {
      setLoading(true);
      const res = await getSupplyAccounts(supplyId, {
        search: search || undefined,
        unread_only: unreadOnly,
        limit: 50,
      });
      setAccounts(res.data);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [supplyId, search, unreadOnly]));

  return (
    <View style={styles.container}>
      {name ? <Text style={styles.supplyName}>{decodeURIComponent(name)}</Text> : null}
      <TextInput
        style={styles.search}
        placeholder="Search account, name, meter..."
        value={search}
        onChangeText={setSearch}
      />
      <TouchableOpacity
        style={[styles.filterBtn, unreadOnly && styles.filterBtnActive]}
        onPress={() => setUnreadOnly(!unreadOnly)}
      >
        <Text style={[styles.filterText, unreadOnly && styles.filterTextActive]}>
          {unreadOnly ? 'Showing unread only' : 'Show unread only'}
        </Text>
      </TouchableOpacity>
      <FlatList
        data={accounts}
        keyExtractor={(item) => item.account_id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No accounts found</Text> : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/reading/${item.account_id}?number=${encodeURIComponent(item.account_number)}&last=${item.last_reading ?? item.previous_reading ?? 0}`)}
          >
            <View style={styles.row}>
              <Text style={styles.accountNum}>{item.account_number}</Text>
              {item.has_reading_this_period ? (
                <Text style={styles.badgeDone}>Read</Text>
              ) : (
                <Text style={styles.badgePending}>Pending</Text>
              )}
            </View>
            <Text style={styles.consumer}>{item.consumer_name}</Text>
            <Text style={styles.meta}>Meter: {item.meter_number || 'N/A'} · Last: {item.last_reading ?? item.previous_reading ?? 0} m³</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  supplyName: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  search: { backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#d1d5db', marginBottom: 8 },
  filterBtn: { padding: 8, marginBottom: 12, alignSelf: 'flex-start', borderRadius: 6, backgroundColor: '#e5e7eb' },
  filterBtnActive: { backgroundColor: '#dbeafe' },
  filterText: { fontSize: 13, color: '#4b5563' },
  filterTextActive: { color: '#1e40af', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accountNum: { fontSize: 16, fontWeight: '700', color: '#111827' },
  badgeDone: { fontSize: 11, color: '#059669', fontWeight: '600' },
  badgePending: { fontSize: 11, color: '#d97706', fontWeight: '600' },
  consumer: { fontSize: 14, color: '#374151', marginTop: 4 },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 40 },
});
