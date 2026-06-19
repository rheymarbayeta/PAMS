import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { submitReading } from '../src/api/waterworks';

export default function ReadingScreen() {
  const { accountId, number, last } = useLocalSearchParams<{ accountId: string; number?: string; last?: string }>();
  const router = useRouter();
  const previousReading = parseFloat(last || '0') || 0;
  const now = new Date();

  const [currentReading, setCurrentReading] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const consumption = currentReading ? Math.max(0, parseFloat(currentReading) - previousReading) : 0;

  const handleSubmit = async () => {
    const current = parseFloat(currentReading);
    if (Number.isNaN(current) || current < 0) {
      Alert.alert('Validation', 'Enter a valid current reading');
      return;
    }
    if (current < previousReading) {
      Alert.alert('Validation', `Current reading cannot be less than previous (${previousReading})`);
      return;
    }
    try {
      setLoading(true);
      await submitReading({
        account_id: accountId!,
        current_reading: current,
        notes: notes || undefined,
        period_month: now.getMonth() + 1,
        period_year: now.getFullYear(),
        reading_date: now.toISOString().split('T')[0],
      });
      Alert.alert('Success', 'Reading submitted for verification', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to submit reading');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={styles.label}>Account</Text>
        <Text style={styles.value}>{number ? decodeURIComponent(number) : accountId}</Text>

        <Text style={styles.label}>Previous Reading (m³)</Text>
        <Text style={styles.valueLarge}>{previousReading}</Text>

        <Text style={styles.label}>Current Reading (m³) *</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="Enter meter reading"
          value={currentReading}
          onChangeText={setCurrentReading}
        />

        <Text style={styles.label}>Consumption (m³)</Text>
        <Text style={styles.consumption}>{consumption.toFixed(2)}</Text>

        <Text style={styles.label}>Period</Text>
        <Text style={styles.value}>{now.getMonth() + 1}/{now.getFullYear()}</Text>

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notes]}
          multiline
          placeholder="Any remarks..."
          value={notes}
          onChangeText={setNotes}
        />

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Submitting...' : 'Submit Reading'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  label: { fontSize: 12, color: '#6b7280', marginTop: 12, marginBottom: 4, textTransform: 'uppercase' },
  value: { fontSize: 16, color: '#111827' },
  valueLarge: { fontSize: 28, fontWeight: '700', color: '#1e40af' },
  consumption: { fontSize: 20, fontWeight: '600', color: '#059669' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 14, fontSize: 18 },
  notes: { minHeight: 80, textAlignVertical: 'top', fontSize: 14 },
  button: { backgroundColor: '#1e40af', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
