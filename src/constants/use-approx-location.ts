import { useEffect, useState } from 'react';

import type { Coordinates } from './mock-data';

/**
 * Roughly where the user is, for ranking suggestions.
 *
 * Deliberately the IP lookup and *not* GPS. Two reasons: it needs no permission
 * prompt, so it can run during onboarding without a browser dialog interrupting
 * the second screen; and city-level accuracy is all a "who is near me" ranking
 * can use anyway - the creators sit at city centres, so a precise fix would be
 * thrown away by the first distance calculation.
 *
 * The map still asks for real GPS separately, for the blue dot and for routing,
 * where the precision genuinely matters.
 *
 * Resolved once per app load and shared: several screens rank against this, and
 * they must not each fire their own request.
 */
let cached: Coordinates | null = null;
let inFlight: Promise<Coordinates | null> | null = null;

async function lookup(): Promise<Coordinates | null> {
  if (cached) return cached;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
      if (!res.ok) return null;
      const data = (await res.json()) as { latitude?: number; longitude?: number };
      if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return null;
      cached = { lng: data.longitude, lat: data.latitude };
      return cached;
    } catch {
      // Offline, blocked by a content blocker, or simply slow. Callers treat
      // null as "no position yet" and fall back to the launch market.
      return null;
    } finally {
      clearTimeout(timer);
      inFlight = null;
    }
  })();
  return inFlight;
}

export function useApproxLocation(): Coordinates | null {
  const [coords, setCoords] = useState<Coordinates | null>(cached);

  useEffect(() => {
    if (coords) return;
    let active = true;
    void lookup().then((c) => {
      if (active && c) setCoords(c);
    });
    return () => {
      active = false;
    };
  }, [coords]);

  return coords;
}
