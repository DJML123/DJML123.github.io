import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MaplibreMap,
  ViewAnnotation,
  type CameraRef,
  type LngLat,
  type MapRef,
} from '@maplibre/maplibre-react-native';
import type { FilterSpecification, StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import * as Location from 'expo-location';
import type { Feature, FeatureCollection, Point } from 'geojson';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import type { Category, Coordinates, Spot } from '@/constants/mock-data';
import { SATELLITE_STYLE } from './satellite-style';
import { CATEGORY_MATCH, describePoi, isPoiVisibleAtZoom, safeImageUrl } from './poi-layer';
import { AccuracyBadge, MapTools } from './map-tools';
import { LocationHint } from './location-hint';
import { SpotDetailSheet, type RouteMode } from './spot-detail-sheet';
import { SpotMarker } from './spot-marker';

const BERLIN_CENTER: Coordinates = { lng: 13.405, lat: 52.52 };

// FOSSGIS's public OSRM instances actually host separate car/bike/foot
// profiles (unlike the official demo server, which only serves driving).
const OSRM_HOST: Record<RouteMode, string> = {
  car: 'https://routing.openstreetmap.de/routed-car',
  bike: 'https://routing.openstreetmap.de/routed-bike',
  foot: 'https://routing.openstreetmap.de/routed-foot',
};

/**
 * Native maps cannot call setFilter on the loaded style (the RN wrapper
 * exposes no style-layer API), so the category pills are applied by
 * pre-filtering the style JSON itself before it is handed to Map. 3D building
 * extrusions are stripped the same way - the app is permanently flat.
 */
const ORIGINAL_POI_FILTERS = new Map<string, FilterSpecification | undefined>();

interface PreparedStyle {
  style: StyleSpecification;
  poiLayerIds: string[];
  firstSymbolId?: string;
}

function prepareStyle(base: StyleSpecification, category: Category): PreparedStyle {
  const style = JSON.parse(JSON.stringify(base)) as StyleSpecification;
  style.layers = style.layers.filter((l) => l.type !== 'fill-extrusion');

  const poiLayerIds: string[] = [];
  let firstSymbolId: string | undefined;
  for (const layer of style.layers) {
    if (layer.type === 'symbol' && firstSymbolId === undefined) firstSymbolId = layer.id;
    if (
      layer.type !== 'symbol' ||
      !('source-layer' in layer) ||
      layer['source-layer'] !== 'poi' ||
      layer.id.startsWith('onspot-')
    ) {
      continue;
    }
    poiLayerIds.push(layer.id);

    const wanted = CATEGORY_MATCH[category];
    if (!wanted || layer.id.includes('transit')) continue;
    if (!ORIGINAL_POI_FILTERS.has(layer.id)) ORIGINAL_POI_FILTERS.set(layer.id, layer.filter);
    const baseFilter = ORIGINAL_POI_FILTERS.get(layer.id);
    const match: FilterSpecification = [
      'any',
      ['in', ['get', 'class'], ['literal', wanted]],
      ['in', ['get', 'subclass'], ['literal', wanted]],
    ];
    layer.filter = baseFilter ? (['all', baseFilter, match] as FilterSpecification) : match;
  }
  return { style, poiLayerIds, firstSymbolId };
}

/** Keyless IP geolocation (city-level) as the fallback when GPS is denied or
 *  the user never granted it - the user always gets *some* "you are here"
 *  instead of a silent Berlin default. */
async function ipLocation(): Promise<Coordinates | null> {
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) return null;
    const data = (await res.json()) as { latitude?: number; longitude?: number };
    if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return null;
    return { lng: data.longitude, lat: data.latitude };
  } catch {
    return null;
  }
}

async function getCurrentPosition(): Promise<Coordinates> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) return BERLIN_CENTER;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { lng: pos.coords.longitude, lat: pos.coords.latitude };
  } catch {
    return BERLIN_CENTER;
  }
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
    /** A spot picked outside the map (e.g. from the saved list): selecting it
     *  opens the detail sheet for it. */
    externalSpotId?: string | null;
  }
>(function OnSpotMap(
  { spots, isDark, category, active = true, savedIds, onToggleSave, onWatch, onOverlayOpenChange, externalSpotId },
  ref
) {
    const mapRef = useRef<MapRef>(null);
    const cameraRef = useRef<CameraRef>(null);
    const routeAbortRef = useRef<AbortController | null>(null);
    const enrichAbortRef = useRef<AbortController | null>(null);
    const routeOriginRef = useRef<Coordinates | null>(null);
    const locationSubRef = useRef<Location.LocationSubscription | null>(null);
    const userLocationRef = useRef<{ coords: Coordinates; source: 'gps' | 'ip' } | null>(null);
    /** Latest viewport centre, kept for the synchronous getCenter handle. */
    const centerRef = useRef<Coordinates | null>(null);

    const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
    const [routing, setRouting] = useState(false);
    const [routeError, setRouteError] = useState<string | null>(null);
    const [route, setRoute] = useState<{
      spot: Spot;
      distanceKm: number;
      durationMin: number;
      mode: RouteMode;
      coords: [number, number][];
    } | null>(null);
    const [mapReady, setMapReady] = useState(0);
    const [styleState, setStyleState] = useState<PreparedStyle>(() => prepareStyle(SATELLITE_STYLE, category));
    const poiLayerIdsRef = useRef<string[]>(styleState.poiLayerIds);
    const firstSymbolIdRef = useRef<string | undefined>(styleState.firstSymbolId);

    const [locationHint, setLocationHint] = useState(false);
    const [ipHint, setIpHint] = useState(false);
    const [userLocation, setUserLocation] = useState<{ coords: Coordinates; source: 'gps' | 'ip' } | null>(null);
    const [locating, setLocating] = useState(false);
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const [searchMarker, setSearchMarker] = useState<Coordinates | null>(null);

    /** Places (or moves) the "you are here" dot; `ip` source shows violet to
     *  signal that it is only city-level accurate. */
    const updateUserLocation = (loc: { coords: Coordinates; source: 'gps' | 'ip'; accuracy?: number }) => {
      userLocationRef.current = loc;
      setUserLocation(loc);
      setAccuracy(loc.source === 'gps' && typeof loc.accuracy === 'number' ? loc.accuracy : null);
    };

    /** Live tracking: once GPS is granted, the dot follows the user instead
     *  of only updating when the locate button is pressed. */
    const startWatching = () => {
      if (locationSubRef.current) return;
      void Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 3 },
        (pos) =>
          updateUserLocation({
            coords: { lng: pos.coords.longitude, lat: pos.coords.latitude },
            source: 'gps',
            accuracy: pos.coords.accuracy ?? undefined,
          })
      ).then((sub) => {
        locationSubRef.current = sub;
      });
    };

    /** First-launch positioning: GPS if granted, IP fallback otherwise, so
     *  the camera always starts at (roughly) the user - never on Berlin
     *  without a word. */
    const initLocation = async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) {
          const ip = await ipLocation();
          if (ip) {
            updateUserLocation({ coords: ip, source: 'ip' });
            cameraRef.current?.flyTo({ center: [ip.lng, ip.lat], zoom: 11, duration: 1200 });
            setIpHint(true);
          } else {
            setLocationHint(true);
          }
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const coords = { lng: pos.coords.longitude, lat: pos.coords.latitude };
        updateUserLocation({ coords, source: 'gps', accuracy: pos.coords.accuracy ?? undefined });
        cameraRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom: 12.5, duration: 1200 });
        startWatching();
      } catch {
        setLocationHint(true);
      }
    };

    /** Locate button + "Erlauben": get a fix and centre the camera on it. */
    const handleLocate = async () => {
      setLocating(true);
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.granted) {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const coords = { lng: pos.coords.longitude, lat: pos.coords.latitude };
          updateUserLocation({ coords, source: 'gps', accuracy: pos.coords.accuracy ?? undefined });
          setLocationHint(false);
          setIpHint(false);
          startWatching();
          cameraRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom: 15, duration: 900 });
          return;
        }
        const known = userLocationRef.current;
        if (known) {
          cameraRef.current?.flyTo({ center: [known.coords.lng, known.coords.lat], zoom: 15, duration: 900 });
          return;
        }
        const ip = await ipLocation();
        if (ip) {
          updateUserLocation({ coords: ip, source: 'ip' });
          setLocationHint(false);
          setIpHint(true);
          cameraRef.current?.flyTo({ center: [ip.lng, ip.lat], zoom: 11, duration: 900 });
        } else {
          setLocationHint(true);
        }
      } finally {
        setLocating(false);
      }
    };

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
      setRoute(null);
      setRouteError(null);
    };

    useImperativeHandle(ref, () => ({
      flyToSpot(spot: Spot) {
        setSearchMarker(null);
        cancelRoute();
        cameraRef.current?.flyTo({ center: [spot.coords.lng, spot.coords.lat], zoom: 15, duration: 900 });
        setSelectedSpot(spot);
      },
      flyToCoords(coords: Coordinates, title: string, subtitle: string) {
        cancelRoute();
        cameraRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom: 15, duration: 900 });
        setSearchMarker(coords);
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
        const center = centerRef.current;
        return center ? { lng: center.lng, lat: center.lat } : BERLIN_CENTER;
      },
    }));

    // Only the filter pill changes the prepared style now - there is a single
    // basemap (the aerial view), so nothing else can swap it out from under
    // the runtime layers.
    useEffect(() => {
      const prepared = prepareStyle(SATELLITE_STYLE, category);
      setStyleState(prepared);
      poiLayerIdsRef.current = prepared.poiLayerIds;
      firstSymbolIdRef.current = prepared.firstSymbolId;
    }, [category]);

    // First-launch positioning once the first style finished parsing. The
    // callback lives in a ref so its identity changing doesn't re-fire the
    // effect on every render.
    const initLocationRef = useRef(initLocation);
    initLocationRef.current = initLocation;
    useEffect(() => {
      if (mapReady === 0) return;
      void initLocationRef.current();
    }, [mapReady]);

    useEffect(() => {
      return () => {
        routeAbortRef.current?.abort();
        enrichAbortRef.current?.abort();
        locationSubRef.current?.remove();
      };
    }, []);

    /** The GPS accuracy radius as a real circle on the ground, so it grows and
     *  shrinks with the map instead of staying a fixed blob of pixels. */
    const accuracyExpression = useMemo(() => {
      if (accuracy === null || !userLocation) return null;
      const lat = userLocation.coords.lat;
      const mppAtZoom0 = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 1;
      const radiusAtZoom0 = accuracy / mppAtZoom0;
      return [
        'interpolate',
        ['exponential', 2],
        ['zoom'],
        0,
        radiusAtZoom0,
        22,
        radiusAtZoom0 * Math.pow(2, 22),
      ] as never;
    }, [accuracy, userLocation]);

    const accuracyData = useMemo<FeatureCollection>(() => {
      const point = userLocation
        ? [{ type: 'Point' as const, coordinates: [userLocation.coords.lng, userLocation.coords.lat] as [number, number] }]
        : [];
      return {
        type: 'FeatureCollection',
        features: point.map((geometry) => ({ type: 'Feature' as const, properties: {}, geometry })),
      };
    }, [userLocation]);

    const routeData = useMemo<Feature | null>(() => {
      if (!route) return null;
      return {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: route.coords },
      };
    }, [route]);

    /** Tapping empty map space dismisses the sheet and any active route;
     *  tapping a POI (on dark/light styles, which carry them) opens its card. */
    const handleMapPress = async (e: { nativeEvent: { lngLat: LngLat; point: [number, number] } }) => {
      const { lngLat, point } = e.nativeEvent;
      setSelectedSpot(null);
      setSearchMarker(null);
      cancelRoute();
      if (poiLayerIdsRef.current.length === 0) return;
      try {
        const map = mapRef.current;
        if (!map) return;
        const pixel = point ?? (await map.project(lngLat));
        const zoom = await map.getZoom();
        const features = await map.queryRenderedFeatures(pixel, { layers: poiLayerIdsRef.current });
        const feature = features.find(
          (f) =>
            f.properties &&
            isPoiVisibleAtZoom(
              zoom,
              f.properties as { class?: string; subclass?: string; rank?: number },
              CATEGORY_MATCH[category] !== undefined
            )
        );
        if (!feature || !feature.properties) return;
        const props = feature.properties as Record<string, unknown>;
        const name = (props['name:de'] as string) || (props.name as string);
        if (!name) return;
        const geometry = feature.geometry as Point | undefined;
        if (!geometry || geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) return;
        const coords = { lng: geometry.coordinates[0], lat: geometry.coordinates[1] };
        setSelectedSpot({
          id: `poi-${coords.lng},${coords.lat}`,
          type: 'place',
          title: name,
          subtitle: describePoi(props.class as string, props.subclass as string),
          coords,
          avatarUrl: '',
          category: 'all',
          poiClass: props.class as string,
        });
        void enrichPoi(name, coords);
      } catch {
        // Query before the style finished parsing - ignore and stay dismissed.
      }
    };

    const handleRoute = async (spot: Spot, mode: RouteMode = 'car') => {
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

        setRoute({
          spot,
          mode,
          distanceKm: Number.isFinite(leg.distance) ? Math.round((leg.distance / 1000) * 10) / 10 : 0,
          durationMin: Number.isFinite(leg.duration) ? Math.round(leg.duration / 60) : 0,
          coords,
        });
        setSelectedSpot(null);
        setSearchMarker(null);

        let sw: [number, number] = [origin.lng, origin.lat];
        let ne: [number, number] = [origin.lng, origin.lat];
        for (const [lng, lat] of coords) {
          sw = [Math.min(sw[0], lng), Math.min(sw[1], lat)];
          ne = [Math.max(ne[0], lng), Math.max(ne[1], lat)];
        }
        // fitBounds throws on degenerate (origin ≈ destination) bounds.
        if (sw[0] !== ne[0] || sw[1] !== ne[1]) {
          cameraRef.current?.fitBounds([sw[0], sw[1], ne[0], ne[1]], {
            padding: { top: 80, right: 40, bottom: 80, left: 40 },
            duration: 800,
          });
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setRouteError('Route konnte nicht geladen werden. Bitte später erneut versuchen.');
      } finally {
        if (controller.signal.aborted) return;
        setRouting(false);
      }
    };

    const routeWidth = ['interpolate', ['linear'], ['zoom'], 10, 3, 14, 6, 18, 11] as never;
    const casingWidth = ['interpolate', ['linear'], ['zoom'], 10, 5, 14, 9, 18, 15] as never;

    const showMapTools = selectedSpot === null && route === null;
    const onOverlayOpenChangeRef = useRef(onOverlayOpenChange);
    onOverlayOpenChangeRef.current = onOverlayOpenChange;
    useEffect(() => {
      onOverlayOpenChangeRef.current?.(selectedSpot !== null || route !== null);
    }, [selectedSpot, route]);

    // A spot chosen from outside (saved list, search result): open its sheet.
    useEffect(() => {
      if (!externalSpotId || !active) return;
      const spot = spots.find((s) => s.id === externalSpotId);
      if (spot) setSelectedSpot(spot);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [externalSpotId, active]);

    // The detail sheet only needs the summary fields; the coords stay here.
    const sheetRoute = route
      ? { spot: route.spot, distanceKm: route.distanceKm, durationMin: route.durationMin, mode: route.mode }
      : null;

    return (
      <View className="absolute inset-0 z-0">
        <MaplibreMap
          ref={mapRef}
          mapStyle={styleState.style}
          onPress={handleMapPress}
          onDidFinishLoadingStyle={() => setMapReady((n) => n + 1)}
          onDidFailLoadingMap={() => setMapReady((n) => n + 1)}
          onRegionDidChange={(e) => {
            const [lng, lat] = e.nativeEvent.center;
            centerRef.current = { lng, lat };
          }}
          attributionPosition={{ bottom: 8, right: 8 }}
          touchPitch={false}
          logoPosition={{ top: 8, right: 8 }}
        >
          <Camera
            ref={cameraRef}
            initialViewState={{ center: [BERLIN_CENTER.lng, BERLIN_CENTER.lat], zoom: 13.5, pitch: 0, bearing: 0 }}
            minZoom={3}
            maxZoom={18.5}
          />

          {/* Route line: casing + core, slotted under the first symbol layer
              so street names and POI icons stay readable on top of it. */}
          {routeData && (
            <GeoJSONSource id="onspot-route" data={routeData}>
              <Layer
                id="onspot-route-casing"
                type="line"
                beforeId={firstSymbolIdRef.current}
                layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                paint={{ 'line-color': '#1e40af', 'line-width': casingWidth, 'line-opacity': 0.9 }}
              />
              <Layer
                id="onspot-route-line"
                type="line"
                beforeId={firstSymbolIdRef.current}
                layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                paint={{ 'line-color': '#3b82f6', 'line-width': routeWidth }}
              />
            </GeoJSONSource>
          )}

          {/* GPS accuracy radius, drawn on the ground so it scales with zoom. */}
          {accuracyExpression && (
            <GeoJSONSource id="onspot-accuracy" data={accuracyData}>
              <Layer
                id="onspot-accuracy-circle"
                type="circle"
                paint={{
                  'circle-color': '#3b82f6',
                  'circle-opacity': 0.12,
                  'circle-stroke-color': '#3b82f6',
                  'circle-stroke-opacity': 0.35,
                  'circle-stroke-width': 1,
                  'circle-radius': accuracyExpression,
                }}
              />
            </GeoJSONSource>
          )}

          {/* Spot pins: the same React component the web map renders, as a
              true native view annotation - no DOM bridge involved. */}
          {spots.map((spot) => (
            <ViewAnnotation
              key={spot.id}
              id={`spot-${spot.id}`}
              lngLat={[spot.coords.lng, spot.coords.lat]}
              anchor="center"
              onPress={() => {
                setSelectedSpot(spot);
              }}
            >
              <SpotMarker spot={spot} onPress={() => setSelectedSpot(spot)} />
            </ViewAnnotation>
          ))}

          {/* Search result pin (📍) for coords picked outside the map. */}
          {searchMarker && (
            <ViewAnnotation
              id="onspot-search-pin"
              lngLat={[searchMarker.lng, searchMarker.lat]}
              anchor="bottom"
            >
              <View className="p-2 text-3xl">📍</View>
            </ViewAnnotation>
          )}

          {/* "You are here": blue dot from GPS, violet when only IP-known. */}
          {userLocation && (
            <ViewAnnotation
              id="onspot-user-dot"
              lngLat={[userLocation.coords.lng, userLocation.coords.lat]}
              anchor="center"
            >
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: userLocation.source === 'gps' ? '#3b82f6' : '#8b5cf6',
                  borderWidth: 3,
                  borderColor: '#ffffff',
                  shadowColor: '#000',
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 4,
                }}
              />
            </ViewAnnotation>
          )}
        </MaplibreMap>

        {(locationHint || ipHint) && selectedSpot === null && route === null && (
          <LocationHint
            state={locationHint ? 'ask' : 'approx'}
            busy={locating}
            onRetry={() => void handleLocate()}
            onDismiss={() => {
              setLocationHint(false);
              setIpHint(false);
            }}
          />
        )}
        {showMapTools && (
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
          route={sheetRoute}
          onSelectMode={(mode) => {
            if (selectedSpot) void handleRoute(selectedSpot, mode);
          }}
          routing={routing}
          routeError={routeError}
          onNavigate={() => {
            if (!route) return;
            const origin = routeOriginRef.current;
            if (!origin) return;
            const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${route.spot.coords.lat},${route.spot.coords.lng}`;
            void Linking.openURL(url).catch(() => {});
          }}
        />
      </View>
    );
  }
);
