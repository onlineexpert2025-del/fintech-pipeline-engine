import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  getGoal,
  getReceipts,
  getTransactions,
  getSetting,
  setSetting,
  exportDataAsCsv,
  exportDataAsJson,
  clearAllData,
} from '../../lib/db';
import { hasHardware, isEnrolled } from '../../lib/biometric';

export default function SettingsScreen() {
  const router = useRouter();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    setBiometricEnabled(getSetting('biometric_enabled') === 'true');
    setNotificationsEnabled(getSetting('notifications_enabled') !== 'false');
  }, []);

  const goal = getGoal();
  const receipts = getReceipts();
  const transactions = getTransactions();

  const toggleBiometric = async (v: boolean) => {
    const hasBio = await hasHardware();
    const enrolled = await isEnrolled();
    if (v && (!hasBio || !enrolled)) {
      Alert.alert('Not Available', 'Biometric authentication is not available on this device.');
      return;
    }
    setSetting('biometric_enabled', v ? 'true' : 'false');
    setBiometricEnabled(v);
  };

  const toggleNotifications = (v: boolean) => {
    setSetting('notifications_enabled', v ? 'true' : 'false');
    setNotificationsEnabled(v);
  };

  const handleExportCsv = async () => {
    const csv = exportDataAsCsv();
    try {
      await Share.share({
        message: csv,
        title: 'GoalPulse Export (CSV)',
      });
    } catch (e) {
      Alert.alert('Export', 'Could not share. Copy the data manually.');
    }
  };

  const handleExportJson = async () => {
    const json = exportDataAsJson();
    try {
      await Share.share({
        message: json,
        title: 'GoalPulse Backup (JSON)',
      });
    } catch (e) {
      Alert.alert('Backup', 'Could not share.');
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'Delete all transactions and receipts? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            clearAllData();
            Alert.alert('Done', 'All data has been cleared.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>👤</Text>
          </View>
          <View>
            <Text style={styles.cardTitle}>My Finances</Text>
            <Text style={styles.cardSubtitle}>Goal: {goal?.name || 'House'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.statRow}>
          <Text style={styles.statNum}>{transactions.length}</Text>
          <Text style={styles.statLabel}>Transactions</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statNum}>{receipts.length}</Text>
          <Text style={styles.statLabel}>Receipts</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={[styles.statNum, { color: '#22C55E' }]}>
            ${goal?.saved.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
          </Text>
          <Text style={styles.statLabel}>Saved</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>General</Text>
      <View style={styles.listCard}>
        <View style={styles.listRow}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>$</Text>
          </View>
          <Text style={styles.listTitle}>Currency</Text>
          <Text style={styles.listValue}>USD ($)</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
        <View style={styles.listRow}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>🔔</Text>
          </View>
          <Text style={styles.listTitle}>Notifications</Text>
          <Text style={styles.listValue}>Reminders & alerts</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: '#E5E7EB', true: '#22C55E' }}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Security</Text>
      <View style={styles.listCard}>
        <View style={styles.listRow}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>🔐</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.listTitle}>Biometric Lock</Text>
            <Text style={styles.listSubtitle}>Require Face ID/Fingerprint to open</Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={toggleBiometric}
            trackColor={{ false: '#E5E7EB', true: '#22C55E' }}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Data</Text>
      <View style={styles.listCard}>
        <TouchableOpacity style={styles.listRow} onPress={handleExportCsv}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>⬇</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.listTitle}>Export Data</Text>
            <Text style={styles.listSubtitle}>Download as CSV</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.listRow} onPress={handleExportJson}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>☁</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.listTitle}>Backup</Text>
            <Text style={styles.listSubtitle}>Save to JSON file</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Danger Zone</Text>
      <TouchableOpacity style={[styles.listCard, styles.dangerRow]} onPress={handleClearData}>
        <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
          <Text style={[styles.iconText, { color: '#DC2626' }]}>🗑</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.listTitle, { color: '#DC2626' }]}>Clear All Data</Text>
          <Text style={styles.listSubtitle}>Delete all transactions and receipts</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.version}>App Version 1.0.0</Text>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingTop: 56 },
  title: { fontSize: 28, fontWeight: '700', color: '#1F2937', marginHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 14, color: '#6B7280', marginHorizontal: 20, marginTop: 24, marginBottom: 8 },
  card: {
    backgroundColor: '#F9FAFB',
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: { fontSize: 18 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  cardSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  statRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  statNum: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginRight: 6 },
  statLabel: { fontSize: 14, color: '#6B7280' },
  listCard: { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 4, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  listTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', flex: 1 },
  listSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  listValue: { fontSize: 14, color: '#6B7280', marginRight: 8 },
  chevron: { fontSize: 18, color: '#9CA3AF' },
  dangerRow: { borderColor: '#FECACA' },
  version: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 24 },
});
