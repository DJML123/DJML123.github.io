import { useEffect, useRef, useState } from 'react';
import type { Coordinates } from '@/constants/mock-data';

export interface GeocodeResult {
  id: string;
  title: string;
  subtitle: string;
  coords: Coordinates;
  /** How far the hit is from the user (or the map centre when GPS is off).
   *  Undefined when neither is known - the list then simply omits it rather
   *  than printing a distance from an assumed position. */
  distanceKm?: number;
}

// Photon (komoot's open geocoder) fuzzy-matches on typos far better than
// Nominatim, but its street-name coverage has gaps (e.g. a plain street with
// no house number sometimes isn't indexed at all). Nominatim is queried in
// parallel as a second source to fill exactly those gaps; results from both
// are merged, deduped and re-ranked together.
const PHOTON_URL = 'https://photon.komoot.io/api/';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const LOCAL_BOX_DEGREES = 0.6; // roughly a 65km radius around the bias point

function formatSubtitle(props: {
  street?: string;
  housenumber?: string;
  city?: string;
  state?: string;
  country?: string;
}) {
  return [props.street && `${props.street} ${props.housenumber ?? ''}`.trim(), props.city, props.state, props.country]
    .filter(Boolean)
    .join(', ');
}

function distanceKm(a: Coordinates, b: Coordinates) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const normalize = (s: string) => s.toLowerCase().replace(/[ß]/g, 'ss').replace(/[^a-z0-9]/g, '');

/** How well a result's name matches what was typed, independent of distance -
 *  an exact/prefix match on "Pariser Straße" must always beat a same-tokens
 *  fuzzy hit like "Straße der Pariser Kommune", no matter how close it is. */
function nameMatchScore(title: string, query: string) {
  const t = normalize(title);
  const q = normalize(query);
  if (t === q) return 0;
  if (t.startsWith(q) || q.startsWith(t)) return 1;
  if (t.includes(q)) return 2;
  return 3;
}

/** A street is usually split into several OSM ways, so the same name/city
 *  shows up repeatedly - keep only the closest occurrence of each. */
function dedupe(results: GeocodeResult[]): GeocodeResult[] {
  const seen = new Map<string, GeocodeResult>();
  for (const r of results) {
    const key = `${normalize(r.title)}|${normalize(r.subtitle.split(',').slice(-2).join(','))}`;
    if (!seen.has(key)) seen.set(key, r);
  }
  return Array.from(seen.values());
}

interface PhotonFeature {
  properties: { osm_id?: number; name?: string; street?: string; housenumber?: string; city?: string; state?: string; country?: string };
  geometry: { coordinates: [number, number] };
}

interface NominatimItem {
  place_id?: number;
  name?: string;
  display_name?: string;
  lon: string;
  lat: string;
}

const isFiniteCoords = (coords: unknown): coords is [number, number] =>
  Array.isArray(coords) && coords.length === 2 && coords.every((v) => typeof v === 'number' && Number.isFinite(v));

function parsePhoton(data: { features?: PhotonFeature[] }, trimmed: string): GeocodeResult[] {
  if (!data.features) return [];
  return data.features
    .filter((f) => isFiniteCoords(f.geometry?.coordinates))
    .map((f, i) => ({
      id: `photon-${f.properties.osm_id ?? i}`,
      title: f.properties.name ?? trimmed,
      subtitle: formatSubtitle(f.properties) || 'Ort',
      coords: { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] },
    }));
}

async function fetchPhoton(query: string, loc: Coordinates | null, useBbox: boolean, signal: AbortSignal) {
  const params = new URLSearchParams({ q: query, limit: '10', lang: 'de' });
  if (loc && useBbox) {
    params.set(
      'bbox',
      `${loc.lng - LOCAL_BOX_DEGREES},${loc.lat - LOCAL_BOX_DEGREES},${loc.lng + LOCAL_BOX_DEGREES},${loc.lat + LOCAL_BOX_DEGREES}`
    );
  }
  const res = await fetch(`${PHOTON_URL}?${params.toString()}`, { signal });
  return res.json();
}

async function fetchNominatim(query: string, loc: Coordinates | null, signal: AbortSignal): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({ q: query, format: 'jsonv2', limit: '8', addressdetails: '1' });
  if (loc) {
    params.set(
      'viewbox',
      `${loc.lng - LOCAL_BOX_DEGREES},${loc.lat + LOCAL_BOX_DEGREES},${loc.lng + LOCAL_BOX_DEGREES},${loc.lat - LOCAL_BOX_DEGREES}`
    );
    params.set('bounded', '1');
  }
  const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  const data: NominatimItem[] = await res.json();
  return data
    .map((item, i) => ({
      id: `nominatim-${item.place_id ?? i}`,
      title: item.name || item.display_name?.split(',')[0] || query,
      subtitle: item.display_name || 'Ort',
      coords: { lng: parseFloat(item.lon), lat: parseFloat(item.lat) },
    }))
    .filter((r) => isFiniteCoords([r.coords.lng, r.coords.lat]));
}

/** Real GPS location wins when available (that's "where I actually am"); the
 *  visible map center is only a fallback for when geolocation is denied. */
function useRealLocation() {
  const ref = useRef<Coordinates | null>(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        ref.current = { lng: pos.coords.longitude, lat: pos.coords.latitude };
      },
      () => {},
      { timeout: 4000, maximumAge: 10 * 60 * 1000 }
    );
  }, []);
  return ref;
}

export function useGeocodeSearch(query: string, getFallbackLocation: () => Coordinates | null) {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);
  const getFallbackRef = useRef(getFallbackLocation);
  const realLocationRef = useRealLocation();

  // Keep the callback current without writing to the ref during render.
  useEffect(() => {
    getFallbackRef.current = getFallbackLocation;
  });

  const trimmed = query.trim();

  // A query shorter than two characters can never produce results. Clear the
  // list during render (guarded, so it fires once per transition) instead of
  // in an effect - the in-flight request itself is invalidated below.
  if (trimmed.length < 2 && (results.length > 0 || loading)) {
    setResults([]);
    setLoading(false);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const controller = new AbortController();

    if (trimmed.length < 2) {
      // Invalidate any in-flight request too, otherwise its stale results
      // resurface after the query has been cleared.
      requestId.current++;
      return () => controller.abort();
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const thisRequest = ++requestId.current;
      try {
        const loc = realLocationRef.current ?? getFallbackRef.current();

        const [photonData, nominatimResults] = await Promise.all([
          fetchPhoton(trimmed, loc, true, controller.signal)
            .then(async (data) => {
              if (!data.features?.length && loc) return fetchPhoton(trimmed, loc, false, controller.signal);
              return data;
            })
            // One provider being down must not discard the other's results.
            .catch(() => ({ features: [] } as { features?: PhotonFeature[] })),
          fetchNominatim(trimmed, loc, controller.signal).catch(() => [] as GeocodeResult[]),
        ]);
        if (thisRequest !== requestId.current) return;

        const combined = [...parsePhoton(photonData, trimmed), ...nominatimResults];
        let parsed = dedupe(combined);
        parsed = parsed.sort((a, b) => {
          const scoreDiff = nameMatchScore(a.title, trimmed) - nameMatchScore(b.title, trimmed);
          if (scoreDiff !== 0) return scoreDiff;
          if (loc) return distanceKm(loc, a.coords) - distanceKm(loc, b.coords);
          return 0;
        });
        setResults(
          parsed
            .slice(0, 6)
            .map((r) => (loc ? { ...r, distanceKm: distanceKm(loc, r.coords) } : r))
        );
      } catch {
        if (thisRequest === requestId.current && !controller.signal.aborted) setResults([]);
      } finally {
        if (thisRequest === requestId.current && !controller.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      controller.abort();
    };
  }, [query, trimmed, realLocationRef]);

  return { results, loading };
}
