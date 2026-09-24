import { type Href, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import type { AuthenticatedUser } from '@/lib/api';
import { getAuthenticatedUser } from '@/lib/auth-session';

export default function SessionEntryScreen() {
  const [session, setSession] = useState<AuthenticatedUser | null>();

  useEffect(() => {
    let active = true;

    getAuthenticatedUser()
      .then((storedSession) => {
        if (active) setSession(storedSession);
      })
      .catch(() => {
        if (active) setSession(null);
      });

    return () => {
      active = false;
    };
  }, []);

  if (session === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color="#8E1722" size="large" />
      </View>
    );
  }

  const destination = session
    ? session.role === 'hospital'
      ? '/hospitals'
      : '/donors'
    : '/login';

  return <Redirect href={destination as Href} />;
}
