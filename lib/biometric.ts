import * as LocalAuthentication from 'expo-local-authentication';
import { AppState, AppStateStatus } from 'react-native';

// Global flag: when true, AppState listener should NOT trigger lock (fixes camera loop)
let isInteractingWithCamera = false;

export function setInteractingWithCamera(value: boolean) {
  isInteractingWithCamera = value;
}

export function getInteractingWithCamera() {
  return isInteractingWithCamera;
}

export async function hasHardware(): Promise<boolean> {
  return LocalAuthentication.hasHardwareAsync();
}

export async function isEnrolled(): Promise<boolean> {
  return LocalAuthentication.isEnrolledAsync();
}

export async function authenticate(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock GoalPulse',
    fallbackLabel: 'Use passcode',
  });
  return result.success;
}

export function shouldSkipLockOnAppStateChange(): boolean {
  return isInteractingWithCamera;
}
