import { useState, useEffect } from 'react';
import type { AppState } from '../../shared/types';

export function usePeers(): AppState | null {
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    window.electron.getState().then(setState);
    return window.electron.onStateUpdate(setState);
  }, []);

  return state;
}
