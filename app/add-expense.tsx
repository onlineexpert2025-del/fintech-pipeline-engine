import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { addTransaction, updateGoalSaved, getGoal } from '../lib/db';
import { colors, CATEGORIES, categoryIcons } from '../lib/theme';

export default function AddExpenseScreen() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & Drinks');
  const [note, setNote] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  const save = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid', 'Please enter a valid amount.');
      return;
    }

    addTransaction({
      type: 'expense',
      amount: num,
      category,
      date: today,
      receipt_id: null,
      note: note || null,
    });

    const goal = getGoal();
    if (goal) {
      updateGoalSaved(goal.id, goal.saved - num);
    }

    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Expense</Text>
        <TouchableOpacity onPress={save}>
          <Text style={styles.save}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form}>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.categories}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.categoryChip, category === c && styles.categoryChipActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={[styles.categoryChipText, category === c && styles.categoryChipTextActive]}>
                {categoryIcons[c] || '•'} {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="Add a note..."
          placeholderTextColor="#9CA3AF"
        />
      </ScrollView>
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
  cancel: { color: colors.textSecondary, fontSize: 16 },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  save: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  form: { flex: 1, paddingHorizontal: 20 },
  label: { fontSize: 14, color: colors.textSecondary, marginTop: 20, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.cardBg,
  },
  categoryChipActive: { backgroundColor: colors.primary },
  categoryChipText: { fontSize: 14, color: colors.text },
  categoryChipTextActive: { color: '#fff', fontWeight: '600' },
});
