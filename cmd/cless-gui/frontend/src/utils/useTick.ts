// SPDX-License-Identifier: AGPL-3.0-only
import { useState, useEffect } from 'react';

/**
 * useTick returns a monotonically increasing tick counter every intervalMs (default 30s).
 * Used by components to refresh relative time labels without re-rendering continuously.
 */
export function useTick(intervalMs = 30000): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return tick;
}
