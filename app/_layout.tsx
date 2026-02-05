import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { initDb, getSetting } from '../lib/db';
import { hasHardware, isEnrolled, authenticate, shouldSkipLockOnAppStateChange } from '../lib/biometric';

initDb();

export default function RootLayout() {
  const [isLocked, setIsLocked] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(true);

  useEffect(() => {
    const biometricEnabled = getSetting('biometric_enabled') === 'true';
    if (!biometricEnabled) {
      setNeedsAuth(false);
      return;
    }

    const checkAuth = async () => {
      const hasBio = await hasHardware();
      const enrolled = await isEnrolled();
      if (!hasBio || !enrolled) {
        setNeedsAuth(false);
        return;
      }
      setNeedsAuth(true);
      setIsLocked(true);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!needsAuth) return;

    const handleAppStateChange = (next: AppStateStatus) => {
      if (shouldSkipLockOnAppStateChange()) return;
      if (next === 'background' || next === 'inactive') {
        setIsLocked(true);
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [needsAuth]);

  const handleUnlock = async () => {
    const ok = await authenticate();
    if (ok) setIsLocked(false);
  };

  if (needsAuth && isLocked) {
    return (
      <View style={styles.lockScreen}>
        <StatusBar style="dark" />
        <Text style={styles.lockTitle}>GoalPulse</Text>
        <Text style={styles.lockSubtitle}>Tap to unlock</Text>
        <TouchableOpacity style={styles.unlockBtn} onPress={handleUnlock} activeOpacity={0.8}>
          <Text style={styles.unlockBtnText}>Unlock</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-expense" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-income" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  lockScreen: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockTitle: { fontSize: 28, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  lockSubtitle: { fontSize: 16, color: '#6B7280', marginBottom: 24 },
  unlockBtn: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  unlockBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
