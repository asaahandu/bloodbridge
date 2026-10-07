import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { logoutUser, type AuthenticatedUser } from './api';

const STORAGE_KEY = 'bloodbridge.authenticated-user';
let memoryValue: string | null = null;

function getWebStorage() {
  return typeof localStorage === 'undefined' ? undefined : localStorage;
}

export async function saveAuthenticatedUser(user: AuthenticatedUser) {
  const value = JSON.stringify(user);
  memoryValue = value;

  if (Platform.OS === 'web') {
    try {
      getWebStorage()?.setItem(STORAGE_KEY, value);
    } catch {
      // The in-memory value still supports the current signed-in session.
    }
    return;
  }

  try {
    await SecureStore.setItemAsync(STORAGE_KEY, value);
  } catch {
    // The in-memory value still supports the current signed-in session.
  }
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  let value = memoryValue;

  if (Platform.OS === 'web') {
    try {
      value = getWebStorage()?.getItem(STORAGE_KEY) ?? memoryValue;
    } catch {
      value = memoryValue;
    }
  } else {
    try {
      value = (await SecureStore.getItemAsync(STORAGE_KEY)) ?? memoryValue;
    } catch {
      value = memoryValue;
    }
  }

  if (!value) return null;

  try {
    const user = JSON.parse(value) as Partial<AuthenticatedUser>;
    if (
      typeof user.id !== 'string' ||
      typeof user.authToken !== 'string' ||
      typeof user.fullName !== 'string' ||
      typeof user.email !== 'string' ||
      typeof user.phone !== 'string' ||
      typeof user.cityRegion !== 'string' ||
      (user.role !== 'donor' && user.role !== 'hospital')
    ) {
      return null;
    }

    return user as AuthenticatedUser;
  } catch {
    return null;
  }
}

export async function clearAuthenticatedUser() {
  memoryValue = null;

  if (Platform.OS === 'web') {
    try {
      getWebStorage()?.removeItem(STORAGE_KEY);
    } catch {
      // The in-memory session has already been cleared.
    }
    return;
  }

  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch {
    // The in-memory session has already been cleared.
  }
}

export async function signOutAuthenticatedUser() {
  const session = await getAuthenticatedUser();

  try {
    if (session) await logoutUser(session.authToken);
  } catch {
    // Signing out locally must still work when the backend is unavailable.
  } finally {
    await clearAuthenticatedUser();
  }
}
