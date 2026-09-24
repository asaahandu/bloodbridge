import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { LocationTrackingSession } from './api';

const STORAGE_KEY = 'bloodbridge.location-tracking-session';
let memoryValue: string | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function getWebStorage() {
  return typeof localStorage === 'undefined' ? undefined : localStorage;
}

export function subscribeToLocationTrackingSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function saveLocationTrackingSession(session: LocationTrackingSession) {
  const value = JSON.stringify(session);
  memoryValue = value;

  if (Platform.OS === 'web') {
    getWebStorage()?.setItem(STORAGE_KEY, value);
    notifyListeners();
    return;
  }

  try {
    await SecureStore.setItemAsync(STORAGE_KEY, value);
  } catch {
    // The in-memory session still supports tracking until the app restarts.
  } finally {
    notifyListeners();
  }
}

export async function getLocationTrackingSession(): Promise<LocationTrackingSession | null> {
  let value = memoryValue;
  if (Platform.OS === 'web') {
    value = getWebStorage()?.getItem(STORAGE_KEY) ?? memoryValue;
  } else {
    try {
      value = (await SecureStore.getItemAsync(STORAGE_KEY)) ?? memoryValue;
    } catch {
      value = memoryValue;
    }
  }

  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<LocationTrackingSession>;
    if (typeof parsed.userId !== 'string' || typeof parsed.token !== 'string') return null;
    return { userId: parsed.userId, token: parsed.token };
  } catch {
    return null;
  }
}

export async function clearLocationTrackingSession() {
  memoryValue = null;

  if (Platform.OS === 'web') {
    getWebStorage()?.removeItem(STORAGE_KEY);
    notifyListeners();
    return;
  }

  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch {
    // The in-memory session has already been cleared.
  } finally {
    notifyListeners();
  }
}
