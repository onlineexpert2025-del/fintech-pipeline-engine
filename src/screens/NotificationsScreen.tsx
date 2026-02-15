import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, Alert, Platform, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, FONT_SIZES } from '../utils/theme';
import {
  scheduleDailyReminder,
  cancelDailyReminder,
  requestNotificationPermissions,
} from '../services/notificationService';

interface NotificationSettings {
  dailyReminder: boolean;
  dailyReminderHour: number;
  dailyReminderMinute: number;
  overspendingAlert: boolean;
  overspendingLimit: number;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  dailyReminder: false,
  dailyReminderHour: 20,
  dailyReminderMinute: 0,
  overspendingAlert: true,
  overspendingLimit: 100,
};

export const NotificationsScreen: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempHour, setTempHour] = useState(20);
  const [tempMinute, setTempMinute] = useState(0);
  const [showLimitInput, setShowLimitInput] = useState(false);
  const [tempLimit, setTempLimit] = useState('100');

  useEffect(() => {
    loadSettings();
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    if (Platform.OS === 'web') {
      setPermissionGranted(false);
      return;
    }
    const granted = await requestNotificationPermissions();
    setPermissionGranted(granted);
  };

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('notification_settings_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (e) {
      console.error('Failed to load notification settings:', e);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem('notification_settings_v2', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (e) {
      console.error('Failed to save notification settings:', e);
    }
  };

  const toggleDailyReminder = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not Available',
        'Local notifications only work in standalone builds (APK/AAB/IPA). Build the app with EAS to enable this feature.'
      );
      return;
    }

    if (!permissionGranted) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert('Permission Required', 'Please enable notifications in your device settings.');
        return;
      }
      setPermissionGranted(true);
    }

    const newValue = !settings.dailyReminder;
    const newSettings = { ...settings, dailyReminder: newValue };

    if (newValue) {
      // Schedule daily reminder
      const identifier = await scheduleDailyReminder(settings.dailyReminderHour, settings.dailyReminderMinute);

      if (identifier) {
        saveSettings(newSettings);
        Alert.alert('✅ Reminder Set', `Daily expense reminder scheduled for ${formatTime(settings.dailyReminderHour, settings.dailyReminderMinute)}`);
      } else {
        Alert.alert('Error', 'Failed to schedule reminder. Please check notification permissions.');
      }
    } else {
      // Cancel daily reminder
      await cancelDailyReminder();
      saveSettings(newSettings);
      Alert.alert('Reminder Cancelled', 'Daily expense reminder has been turned off.');
    }
  };

  const openTimePicker = () => {
    setTempHour(settings.dailyReminderHour);
    setTempMinute(settings.dailyReminderMinute);
    setShowTimePicker(true);
  };

  const saveTime = async () => {
    const newSettings = { ...settings, dailyReminderHour: tempHour, dailyReminderMinute: tempMinute };
    
    if (settings.dailyReminder) {
      // Reschedule with new time
      await cancelDailyReminder();
      await scheduleDailyReminder(tempHour, tempMinute);
    }
    
    saveSettings(newSettings);
    setShowTimePicker(false);
    Alert.alert('⏰ Time Updated', `Daily reminder will now trigger at ${formatTime(tempHour, tempMinute)}`);
  };

  const formatTime = (hour: number, minute: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  };

  const toggleOverspendingAlert = () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not Available',
        'Local notifications only work in standalone builds. Build with EAS to enable this feature.'
      );
      return;
    }

    const newSettings = { ...settings, overspendingAlert: !settings.overspendingAlert };
    saveSettings(newSettings);
  };

  const openLimitInput = () => {
    setTempLimit(settings.overspendingLimit.toString());
    setShowLimitInput(true);
  };

  const saveLimit = () => {
    const limit = parseFloat(tempLimit) || 100;
    const newSettings = { ...settings, overspendingLimit: limit };
    saveSettings(newSettings);
    setShowLimitInput(false);
    Alert.alert('✅ Limit Updated', `Overspending alert will trigger when daily spending exceeds $${limit.toFixed(2)}`);
  };

  const currentTimeLabel = formatTime(settings.dailyReminderHour, settings.dailyReminderMinute);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.infoCard}>
          <MaterialIcons
            name={Platform.OS === 'web' ? 'info-outline' : permissionGranted ? 'check-circle' : 'info-outline'}
            size={20}
            color={Platform.OS === 'web' ? COLORS.warning : permissionGranted ? COLORS.success : COLORS.primary}
          />
          <Text style={styles.infoText}>
            {Platform.OS === 'web'
              ? 'Local notifications only work in standalone builds (APK/AAB). Build with EAS to enable notifications.'
              : permissionGranted
              ? 'Notifications are enabled and will work when app is installed.'
              : 'Notification permissions are required. Tap settings below to enable.'}
          </Text>
        </View>

        {/* Daily Reminders Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Reminders</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="notifications-active" size={24} color={COLORS.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Daily Expense Reminder</Text>
                <Text style={styles.settingDescription}>Get reminded to log your expenses</Text>
              </View>
            </View>
            <Switch
              value={settings.dailyReminder}
              onValueChange={toggleDailyReminder}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
              disabled={Platform.OS === 'web'}
            />
          </View>

          {settings.dailyReminder && (
            <Pressable style={styles.timeSelector} onPress={openTimePicker}>
              <View style={styles.timeSelectorContent}>
                <MaterialIcons name="access-time" size={20} color={COLORS.textSecondary} />
                <Text style={styles.timeSelectorLabel}>Reminder Time</Text>
                <Text style={styles.timeSelectorValue}>{currentTimeLabel}</Text>
                <MaterialIcons name="chevron-right" size={20} color={COLORS.textLight} />
              </View>
            </Pressable>
          )}
        </View>

        {/* Alerts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alerts</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="warning" size={24} color={COLORS.error} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Overspending Alerts</Text>
                <Text style={styles.settingDescription}>Get notified when daily spending exceeds limit</Text>
              </View>
            </View>
            <Switch
              value={settings.overspendingAlert}
              onValueChange={toggleOverspendingAlert}
              trackColor={{ false: COLORS.border, true: COLORS.error }}
              thumbColor={COLORS.white}
              disabled={Platform.OS === 'web'}
            />
          </View>

          {/* FIX #6: Overspending Limit Input */}
          {settings.overspendingAlert && (
            <Pressable style={styles.timeSelector} onPress={openLimitInput}>
              <View style={styles.timeSelectorContent}>
                <MaterialIcons name="attach-money" size={20} color={COLORS.textSecondary} />
                <Text style={styles.timeSelectorLabel}>Daily Spending Limit</Text>
                <Text style={styles.timeSelectorValue}>${settings.overspendingLimit.toFixed(2)}</Text>
                <MaterialIcons name="chevron-right" size={20} color={COLORS.textLight} />
              </View>
            </Pressable>
          )}
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>How it Works</Text>
          <View style={styles.helpItem}>
            <MaterialIcons name="check" size={16} color={COLORS.success} />
            <Text style={styles.helpText}>Daily reminders sent at your chosen time</Text>
          </View>
          <View style={styles.helpItem}>
            <MaterialIcons name="check" size={16} color={COLORS.success} />
            <Text style={styles.helpText}>Overspending alerts triggered automatically</Text>
          </View>
          <View style={styles.helpItem}>
            <MaterialIcons name="check" size={16} color={COLORS.success} />
            <Text style={styles.helpText}>Goal achievement notifications</Text>
          </View>
          <View style={styles.helpItem}>
            <MaterialIcons name="check" size={16} color={COLORS.success} />
            <Text style={styles.helpText}>All notifications work offline (local only)</Text>
          </View>
        </View>
      </ScrollView>

      {/* FIX #5: Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select Reminder Time</Text>
            
            <View style={styles.timePickerContainer}>
              {/* Hour Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Hour</Text>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <Pressable
                      key={i}
                      style={[
                        styles.pickerItem,
                        tempHour === i && styles.pickerItemSelected
                      ]}
                      onPress={() => setTempHour(i)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        tempHour === i && styles.pickerItemTextSelected
                      ]}>
                        {i % 12 || 12} {i >= 12 ? 'PM' : 'AM'}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Minute Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Minute</Text>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {[0, 15, 30, 45].map((m) => (
                    <Pressable
                      key={m}
                      style={[
                        styles.pickerItem,
                        tempMinute === m && styles.pickerItemSelected
                      ]}
                      onPress={() => setTempMinute(m)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        tempMinute === m && styles.pickerItemTextSelected
                      ]}>
                        :{m.toString().padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Button mode="outlined" onPress={() => setShowTimePicker(false)}>
                Cancel
              </Button>
              <Button mode="contained" onPress={saveTime}>
                Save
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* FIX #6: Spending Limit Input Modal */}
      <Modal
        visible={showLimitInput}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLimitInput(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Set Spending Limit</Text>
            <Text style={styles.modalSubtitle}>
              Alert me when daily spending exceeds:
            </Text>
            
            <View style={styles.limitInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.limitInput}
                value={tempLimit}
                onChangeText={setTempLimit}
                keyboardType="decimal-pad"
                placeholder="100.00"
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            <View style={styles.modalButtons}>
              <Button mode="outlined" onPress={() => setShowLimitInput(false)}>
                Cancel
              </Button>
              <Button mode="contained" onPress={saveLimit}>
                Save
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary + '20',
    padding: SPACING.md,
    margin: SPACING.lg,
    borderRadius: 12,
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    lineHeight: 18,
  },
  section: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  settingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  timeSelector: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  timeSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  timeSelectorLabel: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  timeSelectorValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  helpSection: {
    margin: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  helpTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  helpText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  // Modal styles for time picker and limit input
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginVertical: SPACING.md,
  },
  pickerColumn: {
    alignItems: 'center',
    flex: 1,
  },
  pickerLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  pickerScroll: {
    maxHeight: 200,
    width: '100%',
  },
  pickerItem: {
    padding: SPACING.sm,
    borderRadius: 8,
    marginVertical: 2,
    alignItems: 'center',
  },
  pickerItemSelected: {
    backgroundColor: COLORS.primary + '20',
  },
  pickerItemText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  pickerItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  limitInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    marginVertical: SPACING.md,
  },
  currencySymbol: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: SPACING.sm,
  },
  limitInput: {
    flex: 1,
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.text,
    paddingVertical: SPACING.md,
  },
});