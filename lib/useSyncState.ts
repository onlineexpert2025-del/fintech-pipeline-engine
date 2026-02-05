import { useState, useEffect, useCallback } from 'react';

export function useSyncState<T>(getter: () => T, deps: unknown[] = []): T | null {
  const [state, setState] = useState<T | null>(() => {
    try {
      return getter();
    } catch {
      return null;
    }
  });

  const refresh = useCallback(() => {
    try {
      setState(getter());
    } catch {
      setState(null);
    }
  }, [getter, ...deps]);

  useEffect(() => {
    refresh();
  }, deps);

  return state;
}
