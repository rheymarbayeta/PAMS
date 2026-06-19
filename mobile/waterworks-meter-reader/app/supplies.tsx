import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getMySupplies } from '../src/api/waterworks';
import { clearToken } from '../src/storage/token';
import type { WaterSupply } from '../src/types/waterworks';

export default function SuppliesScreen() {
  const router = useRouter();
  const [supplies, setSupplies] = useState<WaterSupply[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getMySupplies();
      setSupplies(data);
    } catch (e: any) {
      if (e.response?.status === 401) {
        await clearToken();
        router.replace('/login');
        return;
      }
      Alert.alert('Error', e.response?.data?.error || 'Failed to load supplies');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const logout = async () => {
    await clearToken();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.push('/history')}>
          <Text style={styles.link}>My Submissions</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.linkMuted}>Logout</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={supplies}
        keyExtractor={(item) => item.supply_id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No supplies assigned to you</Text> : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/accounts/${item.supply_id}?name=${encodeURIComponent(item.supply_name)}`)}
          >
            <Text style={styles.cardTitle}>{item.supply_name}</Text>
            <Text style={styles.cardCode}>{item.supply_code}</Text>
            {item.location ? <Text style={styles.cardMeta}>{item.location}</Text> : null}
            <Text style={styles.cardCount}>{item.account_count ?? 0} active accounts</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  link: { color: '#1e40af', fontWeight: '600' },
  linkMuted: { color: '#6b7280' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  cardCode: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  cardMeta: { fontSize: 13, color: '#4b5563', marginTop: 4 },
  cardCount: { fontSize: 12, color: '#1e40af', marginTop: 8, fontWeight: '500' },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 40 },
});
