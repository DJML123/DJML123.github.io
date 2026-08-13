import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import type { GeocodeResult } from './use-geocode-search';

const KEY = 'onspot-recent-searches';
const MAX = 5;

/**
 * The last few places the user actually went to.
 *
 * Search was "nicht intuitiv" partly because an empty field offered nothing at
 * all: every session started from a blank list, even though people search for
 * the same handful of places over and over. Recents turn the most common case -
 * going back somewhere - from typing into one tap.
 *
 * Persisted through localStorage on web and kept for the session on native.
 * There is no server behind this and there deliberately isn't: a list of the
 * places someone looks up is about as personal as data gets, so it stays on
 * the device.
 */
function read(): GeocodeResult[] {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Written by an older build, hand-edited, or simply corrupt - anything
    // that is not a usable result is dropped rather than crashing the header.
    return parsed.filter(
      (r): r is GeocodeResult =>
        typeof r === 'object' &&
        r !== null &&
        typeof (r as GeocodeResult).id === 'string' &&
        typeof (r as GeocodeResult).title === 'string' &&
        typeof (r as GeocodeResult).coords?.lng === 'number' &&
        typeof (r as GeocodeResult).coords?.lat === 'number'
    );
  } catch {
    return [];
  }
}

export function useRecentSearches() {
  const [recents, setRecents] = useState<GeocodeResult[]>(read);

  const remember = useCallback((result: GeocodeResult) => {
    setRecents((prev) => {
      // Distance is a property of *when* it was searched, not of the place, so
      // it is dropped - a stale "1,2 km" next to a recent is worse than none.
      const { distanceKm: _drop, ...place } = result;
      const next = [place, ...prev.filter((r) => r.id !== result.id)].slice(0, MAX);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          // Private mode or a full quota - recents just don't survive a reload.
        }
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setRecents([]);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(KEY);
      } catch {
        // Nothing to do - the in-memory list is already empty.
      }
    }
  }, []);

  return { recents, remember, clear };
}
