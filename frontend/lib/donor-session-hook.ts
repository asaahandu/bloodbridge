import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { getCurrentUser, type AuthenticatedUser } from './api';
import { getAuthenticatedUser, saveAuthenticatedUser } from './auth-session';

export function useDonorSession() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const session = await getAuthenticatedUser();
      if (!session || session.role !== 'donor') {
        setUser(null);
        return;
      }

      const currentUser = await getCurrentUser(session);
      await saveAuthenticatedUser(currentUser);
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { loading, setUser, user };
}
