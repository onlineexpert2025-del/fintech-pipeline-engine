import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { getReceipts } from '../../../lib/db';

export default function ReceiptsScreen() {
  const router = useRouter();
  const receipts = getReceipts();

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m || '1', 10) - 1]} ${parseInt(day || '1', 10)}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Receipts</Text>

      <TouchableOpacity
        style={styles.scanBtn}
        onPress={() => router.push('/scan')}
      >
        <Text style={styles.scanBtnText}>+ Scan Receipt</Text>
      </TouchableOpacity>

      {receipts.map((r) => (
        <TouchableOpacity
          key={r.id}
          style={styles.receiptCard}
          onPress={() => router.push(`/(tabs)/receipts/${r.id}`)}
        >
          <Text style={styles.receiptIcon}>📁</Text>
          <View style={styles.receiptInfo}>
            <Text style={styles.receiptDate}>{formatDate(r.date)}</Text>
            <Text style={styles.receiptCount}>1 receipt</Text>
          </View>
          <Text style={styles.receiptAmount}>${r.amount.toFixed(2)}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}

      {receipts.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No receipts yet. Scan one to get started.</Text>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingTop: 56 },
  title: { fontSize: 28, fontWeight: '700', color: '#1F2937', marginHorizontal: 20, marginBottom: 20 },
  scanBtn: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#22C55E',
    borderRadius: 12,
    alignItems: 'center',
  },
  scanBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  receiptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
  },
  receiptIcon: { fontSize: 24, marginRight: 12 },
  receiptInfo: { flex: 1 },
  receiptDate: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  receiptCount: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  receiptAmount: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginRight: 8 },
  chevron: { fontSize: 20, color: '#9CA3AF' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6B7280', textAlign: 'center' },
});
