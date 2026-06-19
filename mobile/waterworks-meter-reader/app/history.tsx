import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getMyRecentReadings } from '../src/api/waterworks';
import type { MeterReading } from '../src/types/waterworks';

const STATUS_COLORS: Record<string, string> = {
  pending: '#d97706',
  verified: '#059669',
  rejected: '#dc2626',
};

export default function HistoryScreen() {
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getMyRecentReadings();
      setReadings(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  return (
    <View style={styles.container}>
      <FlatList
        data={readings}
        keyExtractor={(item) => item.reading_id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No submissions yet</Text> : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.account}>{item.account_number}</Text>
              <Text style={[styles.status, { color: STATUS_COLORS[item.status] || '#6b7280' }]}>
                {item.status}
              </Text>
            </View>
            <Text style={styles.consumer}>{item.consumer_name}</Text>
            <Text style={styles.meta}>
              {item.reading_period_month}/{item.reading_period_year} · {item.previous_reading} → {item.current_reading} m³ ({item.consumption} m³)
            </Text>
            <Text style={styles.supply}>{item.supply_name}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  account: { fontSize: 15, fontWeight: '700' },
  status: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  consumer: { fontSize: 14, color: '#374151', marginTop: 4 },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  supply: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 40 },
});
