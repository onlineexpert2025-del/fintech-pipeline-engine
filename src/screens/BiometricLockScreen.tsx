import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, AppState, AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import * as LocalAuthentication from 'expo-local-authentication';
import { COLORS, SPACING, FONT_SIZES } from '../utils/theme';

interface BiometricLockScreenProps {
  onAuthenticated: () => void;
}

export const BiometricLockScreen: React.FC<BiometricLockScreenProps> = ({ onAuthenticated }) => {
  const [authStatus, setAuthStatus] = useState<string>('Waiting for authentication...');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('biometric');

  // Track whether the app returned from background so we can re-trigger auth
  const wasInBackground = useRef(false);
  // Cancellation flag: set to true when going to background so the stale auth result is ignored
  const cancelled = useRef(false);

  useEffect(() => {
    checkBiometricSupport();
    // Auto-trigger authentication on mount
    handleAuthentication();

    // Listen for app state changes to handle background/foreground transitions
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // Mark as cancelled so any in-flight auth resolves are ignored
      cancelled.current = true;
      wasInBackground.current = true;
      setIsAuthenticating(false);
      setAuthStatus('App went to background. Please unlock to continue.');
    } else if (nextAppState === 'active' && wasInBackground.current) {
      // Returned from background: reset and retry
      wasInBackground.current = false;
      cancelled.current = false;
      // Small delay so the screen is fully visible before prompting
      setTimeout(() => {
        handleAuthentication();
      }, 300);
    }
  };

  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        setAuthStatus('Biometric authentication not available');
        // Auto-unlock if no biometric support
        setTimeout(onAuthenticated, 1000);
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        setAuthStatus('No biometric data enrolled');
        // Auto-unlock if no biometric enrolled
        setTimeout(onAuthenticated, 1000);
        return;
      }

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Fingerprint');
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        setBiometricType('Iris');
      }
    } catch (error) {
      console.error('Error checking biometric support:', error);
      // Auto-unlock on error
      setTimeout(onAuthenticated, 1000);
    }
  };

  const handleAuthentication = async () => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    setAuthStatus('Authenticating...');

    // Snapshot the cancelled state at launch time
    const thisCancelled = cancelled;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock GoalPulse',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false, // Allow passcode fallback
        requireConfirmation: false,   // Skip "confirm" dialog on Android
      });

      // If the app went to background while this was running, ignore the result
      if (thisCancelled.current) {
        return;
      }

      if (result.success) {
        setAuthStatus('Authenticated!');
        onAuthenticated();
      } else {
        setAuthStatus('Authentication failed. Please try again.');
        setIsAuthenticating(false);
      }
    } catch (error) {
      if (thisCancelled.current) return;
      console.error('Authentication error:', error);
      setAuthStatus('An error occurred. Please try again.');
      setIsAuthenticating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="lock" size={80} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>GoalPulse is Locked</Text>
        <Text style={styles.subtitle}>
          Use {biometricType} to unlock
        </Text>

        <Text style={styles.status}>{authStatus}</Text>

        <Button
          mode="contained"
          onPress={handleAuthentication}
          disabled={isAuthenticating}
          style={styles.button}
          buttonColor={COLORS.primary}
        >
          {isAuthenticating ? 'Authenticating...' : `Unlock with ${biometricType}`}
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  status: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: SPACING.xl,
  },
});
