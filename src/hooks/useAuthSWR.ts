import useSWR, { type SWRConfiguration, type KeyedMutator } from 'swr';
import { useAuth } from '@/context/AuthContext';

type AuthFetcher = (url: string, token: string) => Promise<unknown>;

const defaultFetcher: AuthFetcher = async (url, token) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

interface UseAuthSWRResult<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  mutate: KeyedMutator<T>;
}

export function useAuthSWR<T = unknown>(
  url: string | null,
  options?: SWRConfiguration & { fetcher?: AuthFetcher },
): UseAuthSWRResult<T> {
  const { user } = useAuth();
  const fetcher = options?.fetcher ?? defaultFetcher;

  const { data, error, isLoading, mutate } = useSWR<T>(
    user && url ? [url, user.uid] : null,
    async ([u]: [string, string]) => {
      const token = await user!.getIdToken();
      return fetcher(u, token) as Promise<T>;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
      ...options,
    },
  );

  return { data, error, isLoading, mutate };
}
