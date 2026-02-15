import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import FileSystem with fallback for legacy compatibility
let FileSystem: any = null;
try {
  FileSystem = require('expo-file-system/legacy');
} catch (e) {
  try {
    FileSystem = require('expo-file-system');
  } catch (e2) {
    console.log('FileSystem not available');
  }
}
import Constants from 'expo-constants';
import { useApp } from '../context/AppContext';
import { COLORS, SPACING, FONT_SIZES, formatMoney, getCurrencyByCode } from '../utils/theme';
import { setSystemInteraction } from '../utils/systemInteraction';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { goal, stats, transactions, receipts, currency, clearAllData, refreshData, setGoal, addTransaction, addReceipt, setCurrency } = useApp();
  const [versionModalVisible, setVersionModalVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const currencyInfo = getCurrencyByCode(currency);

  useEffect(() => {
    checkBiometricAvailability();
    loadBiometricSetting();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setBiometricAvailable(false);
    }
  };

  const loadBiometricSetting = async () => {
    try {
      const enabled = await AsyncStorage.getItem('biometricEnabled');
      setBiometricEnabled(enabled === 'true');
    } catch (error) {
      console.error('Error loading biometric setting:', error);
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (!biometricAvailable) {
      Alert.alert(
        'Biometric Authentication Unavailable',
        'Your device does not support biometric authentication or you have not set it up yet.'
      );
      return;
    }

    if (value) {
      // Test authentication before enabling
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Verify your identity to enable biometric lock',
        });

        if (result.success) {
          await AsyncStorage.setItem('biometricEnabled', 'true');
          setBiometricEnabled(true);
          Alert.alert('Biometric Lock Enabled', 'Your app will now require biometric authentication to open.');
        } else {
          Alert.alert('Authentication Failed', 'Could not verify your identity.');
        }
      } catch (error) {
        console.error('Biometric authentication error:', error);
        Alert.alert('Error', 'An error occurred during authentication.');
      }
    } else {
      await AsyncStorage.setItem('biometricEnabled', 'false');
      setBiometricEnabled(false);
      Alert.alert('Biometric Lock Disabled', 'Your app will no longer require biometric authentication.');
    }
  };

  const handleExportData = async () => {
    if (isExporting) return;
    setIsExporting(true);
    
    // FIX #7: Set system interaction flag to prevent biometric lock
    setSystemInteraction(true);

    try {
      // Generate CSV content
      let csvContent = 'Type,Amount,Category,Source,Notes,Date\n';
      
      transactions.forEach(t => {
        const row = [
          t.type,
          t.amount.toString(),
          t.category || '',
          t.source || '',
          (t.notes || '').replace(/,/g, ';').replace(/\n/g, ' '),
          t.date,
        ].map(field => `"${field}"`).join(',');
        csvContent += row + '\n';
      });

      // Add receipts section
      csvContent += '\n\nReceipts\n';
      csvContent += 'Store,Amount,Category,Date,Items\n';
      receipts.forEach(r => {
        const row = [
          r.storeName || 'Unknown',
          r.totalAmount.toString(),
          r.category || '',
          r.date,
          (r.items || '').replace(/,/g, ';').replace(/\n/g, ' '),
        ].map(field => `"${field}"`).join(',');
        csvContent += row + '\n';
      });

      const date = new Date().toISOString().split('T')[0];
      const fileName = `goalpulse_export_${date}.csv`;
      
      if (Platform.OS === 'web') {
        // Web: trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        Alert.alert('Export Complete', `File downloaded as ${fileName}`);
      } else {
        // Native: save and share
        if (!FileSystem) {
          throw new Error('FileSystem module not available');
        }
        
        const filePath = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(filePath, csvContent, {
          encoding: 'utf8',
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath, {
            mimeType: 'text/csv',
            dialogTitle: 'Export GoalPulse Data',
          });
        } else {
          Alert.alert('Export Complete', `File saved to: ${filePath}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Export error (full):', errorMsg, error);
      Alert.alert('Export Failed', `Could not export data: ${errorMsg}`);
    } finally {
      setIsExporting(false);
      // Clear system interaction flag after a delay
      setTimeout(() => setSystemInteraction(false), 2000);
    }
  };

  const handleBackup = async () => {
    // FIX #7: Set system interaction flag to prevent biometric lock
    setSystemInteraction(true);
    
    try {
      const backupData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        goal,
        transactions,
        receipts,
        currency,
      };

      const date = new Date().toISOString().split('T')[0];
      const fileName = `goalpulse_backup_${date}.json`;
      const jsonContent = JSON.stringify(backupData, null, 2);

      if (Platform.OS === 'web') {
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        Alert.alert('Backup Complete', `Backup downloaded as ${fileName}`);
      } else {
        if (!FileSystem) {
          throw new Error('FileSystem module not available');
        }
        
        const filePath = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(filePath, jsonContent, {
          encoding: 'utf8',
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath, {
            mimeType: 'application/json',
            dialogTitle: 'Backup GoalPulse Data',
          });
        } else {
          Alert.alert('Backup Complete', `File saved to: ${filePath}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Backup error (full):', errorMsg, error);
      Alert.alert('Backup Failed', `Could not create backup: ${errorMsg}`);
    } finally {
      // Clear system interaction flag after a delay
      setTimeout(() => setSystemInteraction(false), 2000);
    }
  };

  const handleRestore = async () => {
    // FIX #7: Set system interaction flag to prevent biometric lock
    setSystemInteraction(true);
    
    try {
      if (!FileSystem) {
        Alert.alert('Error', 'File system not available on this platform');
        setSystemInteraction(false);
        return;
      }
      
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setTimeout(() => setSystemInteraction(false), 1000);
        return;
      }

      const fileUri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'utf8',
      });
      const backupData = JSON.parse(content);

      if (!backupData.version || !backupData.transactions) {
        Alert.alert('Invalid Backup', 'This file is not a valid GoalPulse backup.');
        setTimeout(() => setSystemInteraction(false), 1000);
        return;
      }

      Alert.alert(
        'Restore Backup',
        `This will replace all current data with backup from ${backupData.exportDate?.split('T')[0] || 'unknown date'}. Continue?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setTimeout(() => setSystemInteraction(false), 1000) },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              try {
                // Clear current data first
                await clearAllData();
                
                // Restore goal if exists
                if (backupData.goal) {
                  await setGoal({
                    name: backupData.goal.name || 'My Goal',
                    targetAmount: backupData.goal.targetAmount || 0,
                    monthlySavingsTarget: backupData.goal.monthlySavingsTarget || 0,
                    deadline: backupData.goal.deadline || null,
                  });
                }
                
                // Restore transactions
                if (backupData.transactions && Array.isArray(backupData.transactions)) {
                  for (const transaction of backupData.transactions) {
                    await addTransaction(transaction);
                  }
                }
                
                // Restore receipts
                if (backupData.receipts && Array.isArray(backupData.receipts)) {
                  for (const receipt of backupData.receipts) {
                    await addReceipt(receipt);
                  }
                }
                
                // Restore currency setting
                if (backupData.currency) {
                  await setCurrency(backupData.currency);
                }
                
                Alert.alert('Restore Complete', `Successfully restored ${backupData.transactions?.length || 0} transactions and ${backupData.receipts?.length || 0} receipts.`);
              } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                console.error('Restore execution error (full):', errorMsg, err);
                Alert.alert('Restore Error', `Could not complete restore: ${errorMsg}`);
              }
            },
          },
        ]
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Restore error (full):', errorMsg, error);
      Alert.alert('Restore Failed', `Could not restore backup: ${errorMsg}`);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to delete all your data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            Alert.alert('Data Cleared', 'All your data has been deleted.');
          },
        },
      ]
    );
  };

  const showVersionInfo = () => {
    setVersionModalVisible(true);
  };

  const SettingItem = ({ icon, title, subtitle, onPress, danger = false, showChevron = true }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    danger?: boolean;
    showChevron?: boolean;
  }) => (
    <Pressable style={styles.settingItem} onPress={onPress}>
      <View style={[styles.settingIcon, danger && styles.dangerIcon]}>
        <MaterialIcons name={icon as any} size={24} color={danger ? COLORS.error : COLORS.primary} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, danger && styles.dangerText]}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {showChevron && <MaterialIcons name="chevron-right" size={24} color={COLORS.textLight} />}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Summary */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={40} color={COLORS.primary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>My Finances</Text>
            <Text style={styles.profileGoal}>
              Goal: {goal?.name || 'Not set'}
            </Text>
          </View>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{transactions.length}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{receipts.length}</Text>
            <Text style={styles.statLabel}>Receipts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>
              {formatMoney(stats.totalSaved, currency)}
            </Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
        </View>

        {/* Settings Sections */}
        <Text style={styles.sectionTitle}>General</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="attach-money"
            title="Currency"
            subtitle={`${currencyInfo.code} (${currencyInfo.symbol})`}
            onPress={() => navigation.navigate('Currency')}
          />
          <SettingItem
            icon="notifications"
            title="Notifications"
            subtitle="Reminders & alerts"
            onPress={() => navigation.navigate('Notifications')}
          />
        </View>

        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.settingsGroup}>
          <View style={styles.settingItem}>
            <View style={[styles.iconContainer, { backgroundColor: COLORS.primary + '20' }]}>
              <MaterialIcons name="fingerprint" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Biometric Lock</Text>
              <Text style={styles.settingSubtitle}>
                {biometricAvailable ? 'Require Face ID/Fingerprint to open' : 'Not available on this device'}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={!biometricAvailable}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={biometricEnabled ? COLORS.primary : COLORS.textLight}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="file-download"
            title="Export Data"
            subtitle={isExporting ? 'Exporting...' : 'Download as CSV'}
            onPress={handleExportData}
          />
          <SettingItem
            icon="backup"
            title="Backup"
            subtitle="Save to JSON file"
            onPress={handleBackup}
          />
          <SettingItem
            icon="restore"
            title="Restore"
            subtitle="Import from backup file"
            onPress={handleRestore}
          />
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="info"
            title="App Version"
            subtitle="1.0.0"
            onPress={showVersionInfo}
          />
          <SettingItem
            icon="privacy-tip"
            title="Privacy Policy"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <SettingItem
            icon="description"
            title="Terms of Service"
            onPress={() => navigation.navigate('Terms')}
          />
        </View>

        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="delete-forever"
            title="Clear All Data"
            subtitle="Delete all transactions and receipts"
            onPress={handleClearData}
            danger
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>GoalPulse</Text>
          <Text style={styles.footerSubtext}>Your Personal Savings Tracker</Text>
        </View>
      </ScrollView>

      {/* Version Modal */}
      <Modal
        visible={versionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVersionModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setVersionModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="info" size={40} color={COLORS.primary} />
              <Text style={styles.modalTitle}>GoalPulse</Text>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Version</Text>
                <Text style={styles.infoValue}>1.0.0</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Build</Text>
                <Text style={styles.infoValue}>{Constants.expoConfig?.version || '1.0.0'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Platform</Text>
                <Text style={styles.infoValue}>{Platform.OS}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>SDK</Text>
                <Text style={styles.infoValue}>{Constants.expoConfig?.sdkVersion || 'N/A'}</Text>
              </View>
            </View>
            <Pressable style={styles.modalButton} onPress={() => setVersionModalVisible(false)}>
              <Text style={styles.modalButtonText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: SPACING.lg,
    borderRadius: 16,
    padding: SPACING.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  profileName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  profileGoal: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    borderRadius: 12,
    padding: SPACING.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  settingsGroup: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerIcon: {
    backgroundColor: '#FEE2E2',
  },
  settingInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  settingTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.text,
  },
  dangerText: {
    color: COLORS.error,
  },
  settingSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  footerText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  footerSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    width: '85%',
    maxWidth: 340,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  modalBody: {
    marginBottom: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.text,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});
