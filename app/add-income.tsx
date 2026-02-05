import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { addTransaction, updateGoalSaved, getGoal } from '../lib/db';

export default function AddIncomeScreen() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  const save = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid', 'Please enter a valid amount.');
      return;
    }

    addTransaction({
      type: 'income',
      amount: num,
      category: null,
      date: today,
      receipt_id: null,
      note: note || null,
    });

    const goal = getGoal();
    if (goal) {
      updateGoalSaved(goal.id, goal.saved + num);
    }

    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Income</Text>
        <TouchableOpacity onPress={save}>
          <Text style={styles.save}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Salary"
          placeholderTextColor="#9CA3AF"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  cancel: { color: '#6B7280', fontSize: 16 },
  title: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  save: { color: '#22C55E', fontSize: 16, fontWeight: '600' },
  form: { flex: 1, paddingHorizontal: 20 },
  label: { fontSize: 14, color: '#6B7280', marginTop: 20, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
  },
});
