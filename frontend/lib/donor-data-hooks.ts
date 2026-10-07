import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import type { BloodRequest } from '@/components/donor-home';

import {
  getCurrentUser,
  listActiveBloodRequests,
  type AuthenticatedUser,
} from './api';
import { getAuthenticatedUser, saveAuthenticatedUser } from './auth-session';
import { createDonorRequestViews } from './donor-request-view';

const DONOR_DASHBOARD_REFRESH_INTERVAL_MS = 15_000;

export function useDonorRequests() {
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refreshInProgress = useRef(false);

  const loadDashboard = useCallback(async (silent = false) => {
    if (refreshInProgress.current) return;
    refreshInProgress.current = true;
    if (!silent) setLoading(true);

    try {
      const session = await getAuthenticatedUser();
      if (!session || session.role !== 'donor') throw new Error('Please sign in as a donor.');
      if (!session.bloodType) throw new Error('Add your blood type before viewing matched requests.');

      const [currentUser, storedRequests] = await Promise.all([
        getCurrentUser(session),
        listActiveBloodRequests(session.authToken),
      ]);
      await saveAuthenticatedUser(currentUser);
      setUser(currentUser);
      setRequests(createDonorRequestViews(storedRequests, currentUser));
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load blood requests.');
    } finally {
      refreshInProgress.current = false;
      if (!silent) setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => loadDashboard(false), [loadDashboard]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      const refreshTimer = setInterval(() => {
        void loadDashboard(true);
      }, DONOR_DASHBOARD_REFRESH_INTERVAL_MS);

      return () => clearInterval(refreshTimer);
    }, [loadDashboard, refresh]),
  );

  return { error, loading, refresh, requests, user };
}
