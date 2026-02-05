import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getReceipt, deleteReceipt } from '../../../lib/db';

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const receipt = id ? getReceipt(parseInt(id, 10)) : null;

  if (!receipt) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Receipt not found</Text>
      </View>
    );
  }

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m || '1', 10) - 1]} ${parseInt(day || '1', 10)}`;
  };

  const handleDelete = () => {
    Alert.alert('Delete Receipt', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteReceipt(receipt.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receipt Details</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
          <Text style={styles.deleteIcon}>🗑</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.imageContainer}>
        <Image source={{ uri: receipt.image_uri }} style={styles.image} resizeMode="contain" />
      </View>

      <View style={styles.details}>
        <View style={styles.row}>
          <Text style={styles.label}>Store</Text>
          <Text style={styles.value}>{receipt.store || 'Unknown'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Amount</Text>
          <Text style={[styles.value, styles.amount]}>{receipt.amount.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{formatDate(receipt.date)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerBtn: { padding: 8 },
  headerBtnText: { fontSize: 20, color: '#1F2937' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  deleteIcon: { fontSize: 20 },
  imageContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  image: { width: '100%', height: 300, borderRadius: 8 },
  details: { padding: 20 },
  row: { marginBottom: 16 },
  label: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  value: { fontSize: 18, color: '#1F2937', fontWeight: '500' },
  amount: { color: '#22C55E', fontWeight: '700', fontSize: 24 },
  error: { padding: 20, color: '#EF4444' },
});
