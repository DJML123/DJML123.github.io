import 'maplibre-gl/dist/maplibre-gl.css';
import './map-controls.css';

import {
  Map as MaplibreMap,
  Marker as MaplibreMarker,
  setWorkerUrl,
} from 'maplibre-gl';
import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MaplibreMapType,
  Marker as MaplibreMarkerType,
} from 'maplibre-gl';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';

import type { Category, Coordinates, Spot } from '@/constants/mock-data';
import { SATELLITE_STYLE } from './satellite-style';
import { AccuracyBadge, MapTools } from './map-tools';
import { LocationHint, type LocationHintState } from './location-hint';
import {
  addPoiLayers,
  applyPoiCategoryFilter,
  CATEGORY_MATCH,
  describePoi,
  installBadgeResolver,
  safeImageUrl,
  isPoiVisibleAtZoom,
} from './poi-layer';
import { SpotDetailSheet, type RouteMode } from './spot-detail-sheet';
import { SpotMarker } from './spot-marker';

// Metro doesn't resolve maplibre-gl's bundler-relative worker URL, which some
// browsers (Firefox) reject outright with a MIME-type error instead of
// silently falling back. Point it at a copy served from /public instead.
// Resolved relative to the current page so sub-path deployments (GitHub
// Pages etc.) find it next to the bundle too.
// This file is web-only, but Expo Router's static web export still evaluates
// it once during server-side rendering to produce the initial HTML, where
// `window` doesn't exist yet - guarded rather than crashing the whole page.
if (typeof window !== 'undefined') {
  setWorkerUrl(new URL('maplibre-gl-worker.mjs', window.location.href).toString());
}

const BERLIN_CENTER: Coordinates = { lng: 13.405, lat: 52.52 };

// One basemap, on purpose. The app used to offer OpenFreeMap's Liberty and a
// recoloured dark variant alongside the aerial view, and neither could be made
// to sit next to it: a flat vector street map and real imagery are two
// different products, and switching between them made the app look like two
// apps. The satellite view is the one that carries OnSpot's look, so it is the
// only one - which also removes the layer switcher, the style-swap teardown of
// every runtime layer, and the "which basemap am I on" question entirely.

/** Below this zoom the event/stream markers fade out. Kept low on purpose:
 *  events and streams are the app's own content, not basemap decoration, so a
 *  city-wide view should still show where things are happening - only the
 *  regional view drops them. */
const EVENT_MINZOOM = 9.5;

const ROUTE_SOURCE_ID = 'onspot-route';
const ROUTE_LAYER_ID = 'onspot-route-line';
const ROUTE_CASING_ID = 'onspot-route-casing';

// FOSSGIS's public OSRM instances actually host separate car/bike/foot
// profiles (unlike the official demo server, which only serves driving).
const OSRM_HOST: Record<RouteMode, string> = {
  car: 'https://routing.openstreetmap.de/routed-car',
  bike: 'https://routing.openstreetmap.de/routed-bike',
  foot: 'https://routing.openstreetmap.de/routed-foot',
};

const ACCURACY_SOURCE = 'onspot-accuracy';
const ACCURACY_LAYER = 'onspot-accuracy-circle';

/**
 * Draws the GPS accuracy radius as a real circle on the ground, so it grows
 * and shrinks with the map instead of staying a fixed blob of pixels.
 *
 * `circle-radius` is in screen pixels, and metres-per-pixel halves with every
 * zoom level - which is exactly what an `exponential(2)` interpolation over
 * zoom expresses. Two stops therefore describe the whole zoom range without
 * any per-frame recalculation.
 */
function drawAccuracyCircle(
  map: MaplibreMapType,
  loc: { coords: Coordinates; source: 'gps' | 'ip'; accuracy?: number }
) {
  const showable = loc.source === 'gps' && typeof loc.accuracy === 'number' && loc.accuracy > 0;
  const data = {
    type: 'FeatureCollection' as const,
    features: showable
      ? [
          {
            type: 'Feature' as const,
            properties: {},
            geometry: { type: 'Point' as const, coordinates: [loc.coords.lng, loc.coords.lat] },
          },
        ]
      : [],
  };

  const existing = map.getSource(ACCURACY_SOURCE) as GeoJSONSource | undefined;
  if (existing) {
    existing.setData(data);
  } else {
    map.addSource(ACCURACY_SOURCE, { type: 'geojson', data });
  }

  if (!showable) return;

  // Ground resolution at zoom 0 for this latitude, in metres per pixel.
  const mppAtZoom0 = (156543.03392 * Math.cos((loc.coords.lat * Math.PI) / 180)) / 1;
  const radiusAtZoom0 = (loc.accuracy as number) / mppAtZoom0;
  const radius = [
    'interpolate',
    ['exponential', 2],
    ['zoom'],
    0,
    radiusAtZoom0,
    22,
    radiusAtZoom0 * Math.pow(2, 22),
  ] as unknown as ExpressionSpecification;

  if (!map.getLayer(ACCURACY_LAYER)) {
    map.addLayer({
      id: ACCURACY_LAYER,
      type: 'circle',
      source: ACCURACY_SOURCE,
      paint: {
        'circle-color': '#3b82f6',
        'circle-opacity': 0.12,
        'circle-stroke-color': '#3b82f6',
        'circle-stroke-opacity': 0.35,
        'circle-stroke-width': 1,
        'circle-radius': radius,
      },
    });
  } else {
    map.setPaintProperty(ACCURACY_LAYER, 'circle-radius', radius);
  }
}

function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(BERLIN_CENTER);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
      () => resolve(BERLIN_CENTER),
      // High accuracy: this feeds routing origins, where a city-block error
      // changes the first turn.
      // maximumAge 0: a cached fix from minutes ago is exactly what makes
      // the dot land a street away. Always ask the device for a fresh one.
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

/**
 * Why precise positioning is unavailable, when it is. Browsers refuse
 * `navigator.geolocation` outright on a page that is not a secure context -
 * `http://192.168.x.x:8090` from a phone is exactly that case, and the API
 * then either throws or silently never calls back. `enableHighAccuracy` has no
 * effect there: there is nothing to be accurate with.
 *
 * That distinction has to reach the UI. Reporting "ungefährer Standort"
 * without saying it is the transport's fault sends the user hunting for a
 * setting that would not have helped.
 */
export type LocationBlocker = 'insecure-context' | 'unsupported' | 'denied' | 'timeout' | null;

/** True when the browser will actually hand out GPS on this origin. */
function canUsePreciseLocation(): boolean {
  if (typeof window === 'undefined' || !navigator.geolocation) return false;
  // localhost is treated as secure by every browser, which is why this works
  // on the dev machine and fails on a phone over the LAN.
  return window.isSecureContext === true;
}

/** Like getCurrentPosition, but reports *why* it failed so the UI can offer
 *  the fix that actually applies. */
function probeCurrentPosition(): Promise<{
  coords: Coordinates;
  granted: boolean;
  available: boolean;
  accuracy?: number;
  blocker: LocationBlocker;
}> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ coords: BERLIN_CENTER, granted: false, available: false, blocker: 'unsupported' });
      return;
    }
    if (!canUsePreciseLocation()) {
      resolve({ coords: BERLIN_CENTER, granted: false, available: false, blocker: 'insecure-context' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          coords: { lng: pos.coords.longitude, lat: pos.coords.latitude },
          granted: true,
          available: true,
          accuracy: pos.coords.accuracy,
          blocker: null,
        }),
      (err) =>
        resolve({
          coords: BERLIN_CENTER,
          granted: false,
          available: true,
          blocker: err.code === err.PERMISSION_DENIED ? 'denied' : 'timeout',
        }),
      // maximumAge 0: a cached fix from minutes ago is exactly what makes
      // the dot land a street away. Always ask the device for a fresh one.
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

/** Zoom level at which a circle of `accuracy` metres fills about a third of a
 *  375px-wide screen. Locking to a fixed zoom 15 was the reason a 5-metre fix
 *  and a 2-kilometre fix looked identical: the map said "here" with the same
 *  confidence either way. Deriving it means a precise fix zooms in close and a
 *  vague one stays pulled back, which is what actually reads as accurate. */
function zoomForAccuracy(accuracy: number | undefined): number {
  if (!accuracy || !Number.isFinite(accuracy) || accuracy <= 0) return 15;
  // metres per pixel at zoom 0 on the equator, halved per zoom level.
  const metresPerPixel = (accuracy * 2) / 120;
  const zoom = Math.log2(156543.03392 / metresPerPixel);
  return Math.min(18, Math.max(11, zoom));
}

/** Keyless IP geolocation (city-level) as the fallback for HTTP/LAN pages,
 *  where browsers block navigator.geolocation entirely. HTTPS subresources
 *  are allowed from an HTTP page, so this still works there - the user always
 *  gets *some* "you are here" instead of a silent Berlin default. */
async function ipLocation(): Promise<Coordinates | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { latitude?: number; longitude?: number };
    if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return null;
    return { lng: data.longitude, lat: data.latitude };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function bearingBetween(a: Coordinates, b: Coordinates) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const phi1 = toRad(a.lat);
  const phi2 = toRad(b.lat);
  const deltaLambda = toRad(b.lng - a.lng);
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function addOrUpdateRouteLayer(map: MaplibreMapType, coordinates: [number, number][]) {
  const geojson = {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates },
  };

  const existing = map.getSource(ROUTE_SOURCE_ID) as GeoJSONSource | undefined;
  if (existing) {
    existing.setData(geojson);
    return;
  }

  map.addSource(ROUTE_SOURCE_ID, { type: 'geojson', data: geojson });

  // Slot the route beneath the first symbol layer so street names and POI
  // icons stay readable on top of it, the way every real navigation app draws
  // it - a flat line added last would bury them.
  const firstSymbol = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;

  const width = ['interpolate', ['linear'], ['zoom'], 10, 3, 14, 6, 18, 11];

  // Darker casing under a lighter core: that outline is what keeps the route
  // legible over both pale streets and dark satellite imagery.
  map.addLayer(
    {
      id: ROUTE_CASING_ID,
      type: 'line',
      source: ROUTE_SOURCE_ID,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#1e40af',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 5, 14, 9, 18, 15] as never,
        'line-opacity': 0.9,
      },
    },
    firstSymbol
  );

  map.addLayer(
    {
      id: ROUTE_LAYER_ID,
      type: 'line',
      source: ROUTE_SOURCE_ID,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#3b82f6', 'line-width': width as never },
    },
    firstSymbol
  );
}

function removeRouteLayer(map: MaplibreMapType) {
  for (const id of [ROUTE_LAYER_ID, ROUTE_CASING_ID]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
}

export interface OnSpotMapHandle {
  flyToSpot: (spot: Spot) => void;
  flyToCoords: (coords: Coordinates, title: string, subtitle: string) => void;
  getCenter: () => Coordinates;
}

export const OnSpotMap = forwardRef<
  OnSpotMapHandle,
  {
    spots: Spot[];
    isDark: boolean;
    category: Category;
    active?: boolean;
    savedIds?: string[];
    onToggleSave?: (id: string) => void;
    onWatch?: (spot: Spot) => void;
    onOverlayOpenChange?: (open: boolean) => void;
    /** A spot picked outside the map (e.g. from the saved list): flying to it
     *  opens the detail sheet for it. */
    externalSpotId?: string | null;
  }
>(function OnSpotMap(
  { spots, isDark, category, active = true, savedIds, onToggleSave, onWatch, onOverlayOpenChange, externalSpotId },
  ref
) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<MaplibreMapType | null>(null);
    const markerRoots = useRef<{ root: ReturnType<typeof createRoot>; marker: MaplibreMarkerType }[]>([]);
    const navMarkerRef = useRef<MaplibreMarkerType | null>(null);
    const searchMarkerRef = useRef<MaplibreMarkerType | null>(null);
    const routeAbortRef = useRef<AbortController | null>(null);
    const enrichAbortRef = useRef<AbortController | null>(null);
    const routeOriginRef = useRef<Coordinates | null>(null);
    const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
    const [routing, setRouting] = useState(false);
    const [routeError, setRouteError] = useState<string | null>(null);
    const [route, setRoute] = useState<{ spot: Spot; distanceKm: number; durationMin: number; mode: RouteMode } | null>(
      null
    );
    const [mapReady, setMapReady] = useState(0);

    // Shown once when the browser denied geolocation, so the user can enable
    // it from the map instead of being silently parked on the Berlin default.
    const [locationHint, setLocationHint] = useState(false);
    // When only the IP fallback fired, the map knows roughly where the user
    // is - a slim chip explains the reduced accuracy instead of the big card.
    const [ipHint, setIpHint] = useState(false);
    /** Why precise positioning is unavailable, so the hint can name the real
     *  cause instead of implying a permission the user never got asked for. */
    const [blocker, setBlocker] = useState<LocationBlocker>(null);
    // The user's position, from GPS (granted) or the IP fallback. Rendered as
    // the blue "you are here" dot; `ip` source shows violet to signal that it
    // is only city-level accurate.
    const [userLocation, setUserLocation] = useState<{ coords: Coordinates; source: 'gps' | 'ip' } | null>(null);
    const [locating, setLocating] = useState(false);
    /** Reported GPS accuracy in metres, or null when only the IP fallback ran
     *  (that has no meaningful radius to draw). */
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const userLocationRef = useRef<{ coords: Coordinates; source: 'gps' | 'ip' } | null>(null);
    const userMarkerRef = useRef<MaplibreMarkerType | null>(null);
    const userDotRef = useRef<HTMLDivElement | null>(null);
    const watchIdRef = useRef<number | null>(null);
    /** True while the camera should keep re-centering on every GPS update.
     *  Set by the locate button, cleared as soon as the user pans or zooms
     *  themselves - fighting the user for the camera is worse than not
     *  following at all. */
    const followRef = useRef(false);
    // The map's own event handlers are registered once, so they read the
    // current filter through a ref instead of a stale closure.
    const categoryRef = useRef(category);
    categoryRef.current = category;

    /** Places (or moves) the "you are here" dot. MapLibre owns the marker
     *  element's transform/opacity, so the dot's animation lives in CSS on
     *  the inner element. */
    const updateUserLocation = (loc: { coords: Coordinates; source: 'gps' | 'ip'; accuracy?: number }) => {
      userLocationRef.current = loc;
      setUserLocation(loc);
      setAccuracy(loc.source === 'gps' && typeof loc.accuracy === 'number' ? loc.accuracy : null);
      const map = mapRef.current;
      if (!map) return;
      drawAccuracyCircle(map, loc);
      // Follow mode: keep the dot centred as the fix moves. easeTo (not flyTo)
      // because consecutive GPS updates are metres apart - a fly animation
      // would zoom out and back in for a step's worth of movement.
      if (followRef.current && loc.source === 'gps') {
        map.easeTo({ center: [loc.coords.lng, loc.coords.lat], duration: 700, essential: true });
      }
      const className = `onspot-user-dot${loc.source === 'ip' ? ' onspot-user-dot--ip' : ''}`;
      if (!userMarkerRef.current) {
        const el = document.createElement('div');
        const dot = document.createElement('div');
        dot.className = className;
        el.appendChild(dot);
        userDotRef.current = dot;
        userMarkerRef.current = new MaplibreMarker({ element: el, anchor: 'center' })
          .setLngLat([loc.coords.lng, loc.coords.lat])
          .addTo(map);
      } else {
        userMarkerRef.current.setLngLat([loc.coords.lng, loc.coords.lat]);
        if (userDotRef.current) userDotRef.current.className = className;
      }
    };

    /** Live tracking: once GPS is granted, the dot follows the user instead
     *  of only updating when the locate button is pressed. */
    const startWatching = () => {
      if (watchIdRef.current !== null || !navigator.geolocation) return;
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) =>
          updateUserLocation({
            coords: { lng: pos.coords.longitude, lat: pos.coords.latitude },
            source: 'gps',
            accuracy: pos.coords.accuracy,
          }),
        () => {},
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    };

    /** First-launch positioning: GPS if granted, IP fallback otherwise, so
     *  the camera always starts at (roughly) the user - never on Berlin
     *  without a word. */
    const initLocation = async () => {
      const probe = await probeCurrentPosition();
      const map = mapRef.current;
      if (!map) return;
      if (probe.granted) {
        updateUserLocation({ coords: probe.coords, source: 'gps', accuracy: probe.accuracy });
        map.flyTo({ center: [probe.coords.lng, probe.coords.lat], zoom: 12.5, duration: 1200, essential: true });
        startWatching();
        followRef.current = true;
        return;
      }
      setBlocker(probe.blocker);
      const ip = await ipLocation();
      if (!map) return;
      if (ip) {
        updateUserLocation({ coords: ip, source: 'ip' });
        map.flyTo({ center: [ip.lng, ip.lat], zoom: 11, duration: 1200, essential: true });
        setIpHint(true);
      } else {
        setLocationHint(true);
      }
    };

    /** Locate button + "Erlauben": get a fix and centre the camera on it.
     *
     *  Every exit path below now leaves the hint in a state that matches what
     *  just happened. It used to be possible to press "GPS erlauben", have the
     *  browser refuse silently (a denied permission is never re-prompted - the
     *  API calls the error callback immediately, no dialog), fly to the known
     *  IP position and leave the very same card on screen with the very same
     *  button. That is the reported "es verschwindet nicht und es kommt kein
     *  Popup": the button was doing exactly nothing, twice. */
    const handleLocate = async () => {
      setLocating(true);
      try {
        const probe = await probeCurrentPosition();
        const map = mapRef.current;
        setBlocker(probe.blocker);
        if (probe.granted) {
          updateUserLocation({ coords: probe.coords, source: 'gps', accuracy: probe.accuracy });
          setLocationHint(false);
          setIpHint(false);
          startWatching();
          followRef.current = true;
          map?.flyTo({
            center: [probe.coords.lng, probe.coords.lat],
            zoom: zoomForAccuracy(probe.accuracy),
            duration: 900,
            essential: true,
          });
          return;
        }
        // Not granted. The card stays up, but `blocker` has just been set, so
        // it re-renders as the state that actually applies - "blockiert, hier
        // schaltest du es wieder frei" rather than another dead retry button.
        const known = userLocationRef.current;
        if (known) {
          setLocationHint(false);
          setIpHint(true);
          map?.flyTo({ center: [known.coords.lng, known.coords.lat], zoom: 13, duration: 900, essential: true });
          return;
        }
        const ip = await ipLocation();
        if (ip) {
          updateUserLocation({ coords: ip, source: 'ip' });
          setLocationHint(false);
          setIpHint(true);
          map?.flyTo({ center: [ip.lng, ip.lat], zoom: 11, duration: 900, essential: true });
        } else {
          setIpHint(false);
          setLocationHint(true);
        }
      } finally {
        setLocating(false);
      }
    };

    // Real places used to be fetched from Overpass/Nominatim and drawn as DOM
    // markers on top of the map. The vector tiles already carry every one of
    // them with a proper icon, so that overlay only produced duplicates - a
    // plate badge stamped over each shop's real symbol.

    /** Vector tiles carry only name/class, so opening hours and contact details
     *  are fetched on demand once a POI is actually opened. */
    const enrichPoi = async (name: string, coords: Coordinates) => {
      enrichAbortRef.current?.abort();
      const controller = new AbortController();
      enrichAbortRef.current = controller;
      try {
        const params = new URLSearchParams({
          format: 'jsonv2',
          lat: String(coords.lat),
          lon: String(coords.lng),
          zoom: '18',
          extratags: '1',
          addressdetails: '1',
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (controller.signal.aborted) return;
        const tags: Record<string, string> = data.extratags ?? {};
        const address = data.address ?? {};
        setSelectedSpot((current) => {
          // Match by coordinates, not title - two POIs with the same name are
          // common, and an earlier request would otherwise enrich the wrong card.
          if (!current || current.coords.lng !== coords.lng || current.coords.lat !== coords.lat) return current;
          return {
            ...current,
            subtitle: address.road
              ? `${current.subtitle} • ${address.road} ${address.house_number ?? ''}`.trim()
              : current.subtitle,
            details: {
              openingHours: tags.opening_hours,
              phone: tags.phone ?? tags['contact:phone'],
              website: tags.website ?? tags['contact:website'],
              cuisine: tags.cuisine,
              imageUrl: safeImageUrl(tags.image),
            },
          };
        });
      } catch {
        // Details are a bonus - the card is already usable without them.
      }
    };

    const cancelRoute = () => {
      routeAbortRef.current?.abort();
      const map = mapRef.current;
      if (map) removeRouteLayer(map);
      hideNavArrow();
      setRoute(null);
      setRouteError(null);
    };

    useImperativeHandle(ref, () => ({
      flyToSpot(spot: Spot) {
        searchMarkerRef.current?.remove();
        cancelRoute();
        mapRef.current?.flyTo({ center: [spot.coords.lng, spot.coords.lat], zoom: 15, duration: 900 });
        setSelectedSpot(spot);
      },
      flyToCoords(coords: Coordinates, title: string, subtitle: string) {
        const map = mapRef.current;
        if (!map) return;
        map.flyTo({ center: [coords.lng, coords.lat], zoom: 15, duration: 900 });

        searchMarkerRef.current?.remove();
        const el = document.createElement('div');
        el.style.width = '36px';
        el.style.height = '36px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.fontSize = '30px';
        el.style.filter = 'drop-shadow(0 3px 4px rgba(0,0,0,0.35))';
        el.textContent = '📍';
        searchMarkerRef.current = new MaplibreMarker({ element: el, anchor: 'bottom' })
          .setLngLat([coords.lng, coords.lat])
          .addTo(map);

        setSelectedSpot({
          id: `search-${coords.lng}-${coords.lat}`,
          type: 'place',
          title,
          subtitle,
          coords,
          avatarUrl: '',
          category: 'all',
        });
      },
      getCenter() {
        const center = mapRef.current?.getCenter();
        return center ? { lng: center.lng, lat: center.lat } : BERLIN_CENTER;
      },
    }));

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      const map = new MaplibreMap({
        container: containerRef.current,
        style: SATELLITE_STYLE,
        center: [BERLIN_CENTER.lng, BERLIN_CENTER.lat],
        zoom: 13.5,
      // The OpenFreeMap tiles carry POI data only up to zoom 14; MapLibre
      // overzooms them at most ~5 levels, past which the map would render
      // without a single place icon. 18.5 stays inside the supported range.
      maxZoom: 18.5,
      // Flat map, permanently: no tilt gesture, no programmatic pitch - the
      // 3D view was removed because extruded volumes without a real provider
      // looked worse than a clean 2D map.
      pitch: 0,
      maxPitch: 0,
      touchPitch: false,
      attributionControl: { compact: true },
    });
      mapRef.current = map;

      // Every POI badge (`onspot-badge_<glyph>_<color>`) is composited on
      // demand by the resolver: the sprite glyph may arrive after the style
      // swap, and MapLibre retries missing images on the next placement pass,
      // so the badge shows up as soon as its parts exist.
      installBadgeResolver(map);

      // MapLibre's compact attribution mounts *expanded* and only collapses on
      // the first outside click, so a fresh map always opened with the
      // OpenFreeMap credit spread across the bottom edge. Dropping the class
      // MapLibre sets for that state starts it collapsed, as the small ⓘ pill
      // styled in map-controls.css - the credit stays one tap away, which is
      // all the licence requires.
      map.on('load', () => {
        map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
        setMapReady((n) => n + 1);
        // First launch starts at the user's position, zoomed out enough that
        // everything around them is in view at once - the premium "the map
        // knows where I am" moment. GPS when permitted, IP city-level
        // otherwise, and the hint card only if even that fails.
        void initLocation();
      });

      // A style swap wipes everything the app added, so the POI layers get
      // (re)attached whenever a style finishes parsing. `styledata` fires for
      // every paint/layout tweak (including our own setFilter calls), so it
      // is debounced rather than run per event - running the setup per event
      // caused needless expression re-validation and a potential filter loop.
      const ensurePoiLayers = () => {
        try {
          // `true` for the dark-label branch, always: the basemap is aerial
          // imagery, which is dark everywhere regardless of the app's theme, so
          // POI labels are white-on-dark-halo whether the user runs the app in
          // light or dark mode.
          addPoiLayers(map, true);
          applyPoiCategoryFilter(map, categoryRef.current);
          hide3D(map);
        } catch (err) {
          // Early `styledata` events fire before the style is complete, so a
          // failure here is usually just "too early" and the next event
          // succeeds. It is logged rather than swallowed because a genuine
          // expression error looks identical otherwise, and silently produced
          // a map with no POI badges at all until it was tracked down.
          console.warn('[onspot] POI/building setup deferred:', err);
        }
      };
      map.on('style.load', ensurePoiLayers);
      let styleTimer: ReturnType<typeof setTimeout> | null = null;
      map.on('styledata', () => {
        if (styleTimer) clearTimeout(styleTimer);
        styleTimer = setTimeout(ensurePoiLayers, 250);
      });

      // The vector styles ship their own 3D building extrusion (fill-
      // extrusion layers). With the tilt feature gone they only ever render
      // as flat grey slabs, so every one of them is switched off.
      const hide3D = (m: MaplibreMapType) => {
        for (const layer of m.getStyle().layers) {
          if (layer.type === 'fill-extrusion' && m.getLayer(layer.id)) {
            m.setLayoutProperty(layer.id, 'visibility', 'none');
          }
        }
      };

      // Matched on the source-layer rather than a layer id so this keeps
      // working whatever the POI layer ends up being called.
      const poiFeatureAt = (point: Parameters<typeof map.queryRenderedFeatures>[0]) =>
        map
          .queryRenderedFeatures(point)
          .find(
            (f) =>
              f.layer &&
              'source-layer' in f.layer &&
              f.layer['source-layer'] === 'poi' &&
              isPoiVisibleAtZoom(
                map.getZoom(),
                f.properties ?? {},
                CATEGORY_MATCH[categoryRef.current] !== undefined
              )
          );

      // `originalEvent` is only set when the move came from a real gesture -
      // our own easeTo/flyTo calls have none, so following does not cancel
      // itself on the very first frame it animates.
      const releaseFollow = (e: { originalEvent?: unknown }) => {
        if (e.originalEvent) followRef.current = false;
      };
      map.on('dragstart', releaseFollow);
      map.on('zoomstart', releaseFollow);
      map.on('rotatestart', releaseFollow);

      map.on('click', (e) => {
        const feature = poiFeatureAt(e.point);
        if (!feature) {
          // Tapping empty map space dismisses the sheet and any active route.
          setSelectedSpot(null);
          cancelRoute();
          return;
        }
        const props = feature.properties ?? {};
        const name = (props['name:de'] as string) || (props.name as string);
        if (!name) return;
        const coords = { lng: e.lngLat.lng, lat: e.lngLat.lat };
        searchMarkerRef.current?.remove();
        cancelRoute();
        setSelectedSpot({
          id: `poi-${feature.id ?? `${coords.lng},${coords.lat}`}`,
          type: 'place',
          title: name,
          subtitle: describePoi(props.class as string, props.subclass as string),
          coords,
          avatarUrl: '',
          category: 'all',
          poiClass: props.class as string,
        });
        enrichPoi(name, coords);
      });

      // queryRenderedFeatures over the whole canvas on every mouse move is
      // the biggest interactive FPS killer there is, so the hover test is
      // throttled to ~8 scans per second.
      let lastHoverAt = 0;
      let lastHoverPoint: Parameters<typeof map.queryRenderedFeatures>[0] | null = null;
      map.on('mousemove', (e) => {
        const now = performance.now();
        if (now - lastHoverAt < 80) {
          lastHoverPoint = e.point;
          return;
        }
        lastHoverAt = now;
        const point = lastHoverPoint ?? e.point;
        lastHoverPoint = null;
        map.getCanvas().style.cursor = poiFeatureAt(point) ? 'pointer' : '';
      });

      return () => {
        routeAbortRef.current?.abort();
        enrichAbortRef.current?.abort();
        if (styleTimer) clearTimeout(styleTimer);
        searchMarkerRef.current?.remove();
        navMarkerRef.current?.remove();
        if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        userMarkerRef.current?.remove();
        markerRoots.current.forEach(({ marker }) => marker.remove());
        map.remove();
        mapRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    // The map component stays mounted across tab switches and is only hidden;
    // once it becomes visible again its container may have changed size while
    // display:none, so ask MapLibre to re-measure.
    useEffect(() => {
      if (active) mapRef.current?.resize();
    }, [active]);

    // Let the parent hide the FAB (and anything else) while a card, route
    // panel or layer picker is open. The callback lives in a ref so its
    // identity changing doesn't fire the effect.
    const onOverlayOpenChangeRef = useRef(onOverlayOpenChange);
    onOverlayOpenChangeRef.current = onOverlayOpenChange;
    useEffect(() => {
      onOverlayOpenChangeRef.current?.(selectedSpot !== null || route !== null);
    }, [selectedSpot, route]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      const previous = markerRoots.current;
      previous.forEach(({ marker }) => marker.remove());

      const created = spots.map((spot) => {
        const el = document.createElement('div');
        el.style.cursor = 'pointer';

        // MapLibre owns the marker element's `transform` (for positioning) and
        // rewrites its `opacity` every frame for occlusion fading, so anything
        // set on `el` directly gets clobbered. The fade lives on an inner
        // wrapper the library never touches.
        const inner = document.createElement('div');
        inner.style.transition = 'opacity 220ms ease-out, transform 220ms ease-out';
        inner.style.transformOrigin = 'center';
        el.appendChild(inner);

        const root = createRoot(inner);
        root.render(<SpotMarker spot={spot} onPress={() => setSelectedSpot(spot)} />);

        // MapLibre's marker element intercepts pointer events for drag-handling,
        // which can swallow RN Web's synthetic click before it reaches Pressable.
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedSpot(spot);
        });

        const marker = new MaplibreMarker({ element: el, anchor: 'center' }).setLngLat([
          spot.coords.lng,
          spot.coords.lat,
        ]);
        marker.addTo(map);

        return { marker, root };
      });
      markerRoots.current = created;

      // Markers are DOM elements, so they have no minzoom of their own - this
      // applies one. Driven off `zoom` (fires continuously while zooming) so
      // the CSS transition above has something to animate.
      const applyZoomVisibility = () => {
        const visible = map.getZoom() >= EVENT_MINZOOM;
        for (const { marker } of created) {
          const el = marker.getElement();
          const inner = el.firstElementChild as HTMLElement | null;
          if (inner) {
            inner.style.opacity = visible ? '1' : '0';
            inner.style.transform = `scale(${visible ? 1 : 0.6})`;
          }
          el.style.pointerEvents = visible ? 'auto' : 'none';
        }
      };
      applyZoomVisibility();
      map.on('zoom', applyZoomVisibility);

      // react-dom warns if a root is unmounted synchronously during another
      // component's commit phase, so defer it to a separate task.
      setTimeout(() => {
        previous.forEach(({ root }) => root.unmount());
      }, 0);

      return () => {
        map.off('zoom', applyZoomVisibility);
        created.forEach(({ marker }) => marker.remove());
        setTimeout(() => {
          created.forEach(({ root }) => root.unmount());
        }, 0);
      };
    }, [spots]);

    // Filter pills now narrow the tile-drawn POIs instead of fetching a
    // separate set of places.
    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;
      try {
        applyPoiCategoryFilter(map, category);
      } catch {
        // Style still loading - the styledata handler re-applies it below.
      }
    }, [category, mapReady]);

    // A spot chosen from outside (saved list, search result): open its sheet.
    // Skipped while another tab is active - "Ansehen" switches to the feed and
    // would otherwise immediately re-open the sheet behind it (and keep the
    // bottom nav hidden). When the map tab comes back, the spot re-selects.
    useEffect(() => {
      if (!externalSpotId || !active) return;
      const spot = spots.find((s) => s.id === externalSpotId);
      if (spot) setSelectedSpot(spot);
      // Only the id matters - re-running on spots changes would re-select the
      // same spot and re-trigger the sheet animation for no reason.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [externalSpotId, active]);

    const showNavArrow = (at: Coordinates, headingTo: Coordinates) => {
      const map = mapRef.current;
      if (!map) return;
      const bearing = bearingBetween(at, headingTo);

      if (!navMarkerRef.current) {
        const el = document.createElement('div');
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.fontSize = '28px';
        el.style.filter = 'drop-shadow(0 2px 4px rgba(37,99,235,0.6))';
        el.textContent = '➤';
        el.style.color = '#2563eb';
        navMarkerRef.current = new MaplibreMarker({ element: el, anchor: 'center', rotationAlignment: 'map' });
      }
      navMarkerRef.current.setLngLat([at.lng, at.lat]).setRotation(bearing - 90).addTo(map);
    };

    const hideNavArrow = () => {
      navMarkerRef.current?.remove();
    };

    const handleRoute = async (spot: Spot, mode: RouteMode = 'car') => {
      const map = mapRef.current;
      if (!map) return;
      routeAbortRef.current?.abort();
      const controller = new AbortController();
      routeAbortRef.current = controller;
      setRouting(true);
      setRouteError(null);
      try {
        // Route origin: the tracked user position when we have one, otherwise
        // a fresh fix (which itself falls back to Berlin when blocked).
        const origin = userLocationRef.current?.coords ?? (await getCurrentPosition());
        if (controller.signal.aborted) return;
        routeOriginRef.current = origin;
        const url = `${OSRM_HOST[mode]}/route/v1/driving/${origin.lng},${origin.lat};${spot.coords.lng},${spot.coords.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          setRouteError('Route konnte nicht geladen werden (Server-Fehler).');
          return;
        }
        const data = await res.json();
        const leg = data?.routes?.[0];
        if (!leg || !Array.isArray(leg.geometry?.coordinates) || leg.geometry.coordinates.length < 2) {
          setRouteError('Keine Route gefunden – versuche einen anderen Ort.');
          return;
        }

        const coords: [number, number][] = leg.geometry.coordinates;
        if (!coords.every((c) => Array.isArray(c) && c.length === 2 && c.every(Number.isFinite))) {
          setRouteError('Keine Route gefunden – versuche einen anderen Ort.');
          return;
        }

        addOrUpdateRouteLayer(map, coords);
        setRoute({
          spot,
          mode,
          distanceKm: Number.isFinite(leg.distance) ? Math.round((leg.distance / 1000) * 10) / 10 : 0,
          durationMin: Number.isFinite(leg.duration) ? Math.round(leg.duration / 60) : 0,
        });
        setSelectedSpot(null);

        showNavArrow(origin, { lng: coords[1][0], lat: coords[1][1] });

        let sw: [number, number] = [origin.lng, origin.lat];
        let ne: [number, number] = [origin.lng, origin.lat];
        for (const [lng, lat] of coords) {
          sw = [Math.min(sw[0], lng), Math.min(sw[1], lat)];
          ne = [Math.max(ne[0], lng), Math.max(ne[1], lat)];
        }
        // fitBounds throws on degenerate (origin ≈ destination) bounds.
        if (sw[0] !== ne[0] || sw[1] !== ne[1]) {
          map.fitBounds([sw, ne], { padding: 80, duration: 800 });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setRouteError('Route konnte nicht geladen werden. Bitte später erneut versuchen.');
      } finally {
        if (controller.signal.aborted) return;
        setRouting(false);
      }
    };

    // One card, one state. `blocker` is what actually decides the wording -
    // whether the card was raised because nothing is known yet or because only
    // the IP fallback fired just picks the starting point.
    const hint: LocationHintState | null =
      blocker === 'insecure-context' && (locationHint || ipHint)
        ? 'insecure'
        : blocker === 'denied' && (locationHint || ipHint)
          ? 'denied'
          : locationHint
            ? 'ask'
            : ipHint
              ? 'approx'
              : null;

    return (
      <View className="absolute inset-0 z-0">
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        {hint && selectedSpot === null && route === null && (
          <LocationHint
            state={hint}
            busy={locating}
            onRetry={() => void handleLocate()}
            onDismiss={() => {
              setLocationHint(false);
              setIpHint(false);
            }}
          />
        )}
        {/* One control, and only while the map is the thing on screen: with a
            detail sheet or a route open it would float over content the user
            is actually reading. */}
        {selectedSpot === null && route === null && (
          <>
            <MapTools
              onLocate={() => void handleLocate()}
              locating={locating}
              hasLocation={userLocation !== null}
            />
            <AccuracyBadge meters={accuracy} />
          </>
        )}
        <SpotDetailSheet
          spot={selectedSpot}
          saved={selectedSpot ? (savedIds?.includes(selectedSpot.id) ?? false) : false}
          onToggleSave={onToggleSave}
          onWatch={(spot) => {
            setSelectedSpot(null);
            cancelRoute();
            onWatch?.(spot);
          }}
          onClose={() => {
            setSelectedSpot(null);
            cancelRoute();
          }}
          route={route}
          onSelectMode={(mode) => {
            if (selectedSpot) handleRoute(selectedSpot, mode);
          }}
          routing={routing}
          routeError={routeError}
          onNavigate={() => {
            if (!route) return;
            const origin = routeOriginRef.current;
            if (!origin) return;
            const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${route.spot.coords.lat},${route.spot.coords.lng}`;
            window.open(url, '_blank', 'noopener');
          }}
        />
      </View>
    );
  }
);
