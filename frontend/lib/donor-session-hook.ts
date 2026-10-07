import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { getCurrentUser, type AuthenticatedUser } from './api';
import { getAuthenticatedUser, saveAuthenticatedUser } from './auth-session';

export function useDonorSession() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);

      getAuthenticatedUser()
        .then(async (session) => {
          if (!session || session.role !== 'donor') return null;
          const currentUser = await getCurrentUser(session);
          await saveAuthenticatedUser(currentUser);
          return currentUser;
        })
        .then((currentUser) => {
          if (active) setUser(currentUser);
        })
        .catch(() => {
          if (active) setUser(null);
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, []),
  );

  return { loading, user };
}
