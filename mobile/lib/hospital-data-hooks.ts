import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  type AuthenticatedUser,
  getCurrentUser,
  listHospitalBloodRequests,
  type StoredBloodRequest,
} from './api';
import { getAuthenticatedUser, saveAuthenticatedUser } from './auth-session';

export function useHospitalRequests(status: 'active' | 'history' | 'all') {
  const [requests, setRequests] = useState<StoredBloodRequest[]>([]);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const session = await getAuthenticatedUser();
      if (!session || session.role !== 'hospital') throw new Error('Please sign in as a hospital.');

      const data = await listHospitalBloodRequests(session.authToken, status);
      setUser(session);
      setRequests(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load hospital requests.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { error, loading, refresh, requests, user };
}

export function useHospitalAccount() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const session = await getAuthenticatedUser();
      if (!session || session.role !== 'hospital') throw new Error('Please sign in as a hospital.');

      const currentUser = await getCurrentUser(session);
      await saveAuthenticatedUser(currentUser);
      setUser(currentUser);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load hospital profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { error, loading, refresh, user };
}
