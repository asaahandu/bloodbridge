import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { BloodRequest } from '@/components/donor-home';
import { listDonorActivity, respondToBloodRequest } from '@/lib/api';
import { getAuthenticatedUser } from '@/lib/auth-session';
import { createDonorRequestViews } from '@/lib/donor-request-view';

const DONOR_ACTIVITY_REFRESH_INTERVAL_MS = 15_000;

export type DonorDecision = 'accepted' | 'declined';

export type DonorResponse = {
  confirmedAt?: Date;
  decision: DonorDecision;
  outcome?: 'completed' | 'no_show';
  outcomeRecordedAt?: Date;
  request: BloodRequest;
  respondedAt: Date;
};

type DonorResponseContextValue = {
  error: string;
  loading: boolean;
  refresh: () => Promise<void>;
  responses: DonorResponse[];
  respondToRequest: (request: BloodRequest, decision: DonorDecision) => Promise<void>;
};

const DonorResponseContext = createContext<DonorResponseContextValue | null>(null);

export function DonorResponseProvider({ children }: { children: ReactNode }) {
  const [responses, setResponses] = useState<DonorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refreshInProgress = useRef(false);

  const loadResponses = useCallback(async (silent = false) => {
    if (refreshInProgress.current) return;
    refreshInProgress.current = true;
    if (!silent) setLoading(true);

    try {
      const session = await getAuthenticatedUser();
      if (!session || session.role !== 'donor') throw new Error('Please sign in as a donor.');
      const records = await listDonorActivity(session.authToken);
      setResponses(
        records.map((record) => ({
          decision: record.decision,
          request: createDonorRequestViews([record.request], session)[0],
          respondedAt: new Date(record.respondedAt),
          ...(record.confirmedAt ? { confirmedAt: new Date(record.confirmedAt) } : {}),
          ...(record.outcome ? { outcome: record.outcome } : {}),
          ...(record.outcomeRecordedAt
            ? { outcomeRecordedAt: new Date(record.outcomeRecordedAt) }
            : {}),
        })),
      );
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load donor activity.');
    } finally {
      refreshInProgress.current = false;
      if (!silent) setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => loadResponses(false), [loadResponses]);

  useEffect(() => {
    void refresh();
    const refreshTimer = setInterval(() => {
      void loadResponses(true);
    }, DONOR_ACTIVITY_REFRESH_INTERVAL_MS);

    return () => clearInterval(refreshTimer);
  }, [loadResponses, refresh]);

  const respondToRequest = useCallback(async (request: BloodRequest, decision: DonorDecision) => {
    const session = await getAuthenticatedUser();
    if (!session || session.role !== 'donor') throw new Error('Please sign in as a donor.');
    const activity = await respondToBloodRequest(session.authToken, request.id, decision);

    setResponses((current) => [
      {
        decision: activity.decision,
        request,
        respondedAt: new Date(activity.respondedAt),
      },
      ...current.filter((response) => response.request.id !== request.id),
    ]);
  }, []);

  const value = useMemo(
    () => ({ error, loading, refresh, responses, respondToRequest }),
    [error, loading, refresh, respondToRequest, responses],
  );

  return <DonorResponseContext.Provider value={value}>{children}</DonorResponseContext.Provider>;
}

export function useDonorResponses() {
  const context = useContext(DonorResponseContext);
  if (!context) throw new Error('useDonorResponses must be used inside DonorResponseProvider');
  return context;
}
