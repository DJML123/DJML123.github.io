
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText as Text } from '@/components/ui/app-text';
import {
  Bike,
  Car,
  Clock,
  Footprints,
  Globe,
  MapPin,
  Phone,
  Ruler,
  TriangleAlert,
  X,
} from '@/components/ui/icons';
import { useEffect, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Linking,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { KIND_HEX, SpotGlyph } from '@/components/map/spot-marker';
import { PoiCover } from '@/components/map/poi-cover';
import type { Spot } from '@/constants/mock-data';
import { usePrefs, type Units } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';
import { ReportModal } from '@/components/ui/report-modal';
import { DonateModal } from '@/components/feed/donate-modal';
import { CountUp } from '@/components/ui/count-up';
import { SmartImage } from '@/components/ui/smart-image';

export type RouteMode = 'car' | 'bike' | 'foot';

export interface RouteInfo {
  distanceKm: number;
  durationMin: number;
  mode: RouteMode;
}

const MODES: { key: RouteMode; label: string; Icon: typeof Car }[] = [
  { key: 'car', label: 'Auto', Icon: Car },
  { key: 'bike', label: 'Rad', Icon: Bike },
  { key: 'foot', label: 'Fuß', Icon: Footprints },
];


const SAFE_PROTOCOLS = ['http:', 'https:', 'tel:', 'mailto:'];

function openUrl(url: string) {
  // The URL comes from OSM/Nominatim extratags - untrusted external data. Only
  // open well-known schemes, never e.g. `javascript:` or custom handlers.
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
    const parsed = new URL(withScheme);
    if (!SAFE_PROTOCOLS.includes(parsed.protocol)) return;
    Linking.openURL(withScheme).catch(() => {});
  } catch {
    // Malformed URL - ignore it.
  }
}

/** `1400` -> "1,4 km" or "0,9 mi" - respects the km/mi toggle in Settings. */
function formatDistance(meters: number | undefined, units: Units) {
  if (meters == null) return null;
  if (units === 'mi') {
    const miles = meters / 1609.34;
    return miles < 0.1 ? `${Math.round(meters * 3.281)} ft` : `${miles.toFixed(1).replace('.', ',')} mi`;
  }
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

/** The small corner badge on the avatar. It draws the same vector glyph the
 *  map marker does, rather than the emoji it used to: an emoji is a different
 *  typeface's artwork on every platform, so the badge on the card and the pin
 *  on the map were two different pictures of the same event. */
function CategoryBadge({ spot }: { spot: Spot }) {
  const kind = spot.eventKind ?? 'place';
  const hex = spot.isLive ? '#ef4444' : (KIND_HEX[kind] ?? '#3866c4');
  return (
    <View
      className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-sm dark:border-neutral-900"
      style={{ backgroundColor: hex }}
    >
      <SpotGlyph kind={spot.isLive && !spot.eventKind ? 'place' : kind} size={12} hex={hex} />
    </View>
  );
}

/**
 * The spot detail sheet: slides up to a fixed ~40 % height when a spot or POI
 * is picked on the map, shows its info and the routing options (mode, distance,
 * duration, navigate). Swipe down on the handle (or press X / tap the map)
 * dismisses it. Replaces the old always-visible bottom bar and the floating
 * preview/route popovers.
 */
export function SpotDetailSheet({
  spot,
  onClose,
  saved,
  onToggleSave,
  onWatch,
  route,
  onSelectMode,
  routing,
  routeError,
  onNavigate,
}: {
  spot: Spot | null;
  onClose: () => void;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
  onWatch?: (spot: Spot) => void;
  route?: RouteInfo | null;
  onSelectMode?: (mode: RouteMode) => void;
  routing?: boolean;
  routeError?: string | null;
  onNavigate?: () => void;
}) {
  const { units, accent } = usePrefs();
  const a = accentOf(accent);
  const { height: winHeight } = useWindowDimensions();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme !== 'light';
  const [reportVisible, setReportVisible] = useState(false);
  const [donateVisible, setDonateVisible] = useState(false);
  // Kept during the exit animation: once the parent clears `spot` (after the
  // spring below finishes) the last spot stays rendered until fully hidden.
  // Declared before the height below because the height depends on it - a card
  // that changed size halfway through its own exit animation would jump.
  const [closingSpot, setClosingSpot] = useState<Spot | null>(null);
  // Places carry a preview cover, which is ~150px the streamer/event cards do
  // not spend - without the taller sheet the cover would push the route buttons
  // below the fold, i.e. the one thing the card exists for.
  const isPlace = (spot ?? closingSpot)?.type === 'place';
  const sheetHeight = Math.max(260, Math.round(winHeight * (isPlace ? 0.54 : 0.4)));
  // State instead of useRef(...).current: the React Compiler disallows
  // reading refs during render, and the lazy initializer runs only once.
  const [translateY] = useState(() => new Animated.Value(sheetHeight));

  // Slide up when a spot arrives (even when switching from another spot).
  useEffect(() => {
    if (spot) {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }).start();
    }
  }, [spot, translateY]);

  const dismiss = () => {
    if (spot) setClosingSpot(spot);
    Animated.spring(translateY, {
      toValue: sheetHeight + 40,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start(() => {
      setClosingSpot(null);
      onClose();
    });
  };
  // Swipe down on the handle to dismiss; a quick flick does the same. The
  // responder is rebuilt every render so its closure always holds the current
  // `dismiss` (no refs, which the React Compiler bans during render).
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
    onPanResponderMove: (_, g) => {
      translateY.setValue(Math.max(0, g.dy));
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > sheetHeight / 3 || g.vy > 0.6) {
        dismiss();
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }).start();
      }
    },
  });

  const current = spot ?? closingSpot;
  if (!current) return null;
  const details = current.details;
  const openingHours = details?.openingHours;
  const phone = details?.phone;
  const website = details?.website;
  const distance = formatDistance(current.distanceMeters, units);
  const ringColor = current.isLive
    ? '#ef4444'
    : (KIND_HEX[current.eventKind ?? ''] ?? 'rgba(0,0,0,0.1)');

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        height: sheetHeight,
        transform: [{ translateY }],
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTopWidth: 1,
        borderTopColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
        backgroundColor: isDark ? 'rgba(10,10,10,0.97)' : 'rgba(255,255,255,0.97)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: isDark ? 0.4 : 0.16,
        shadowRadius: 28,
        elevation: 20,
      }}
    >
      <View {...panResponder.panHandlers} className="items-center py-3">
        <View className="h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-neutral-600" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-5 pb-6">
        {/* Every place gets a preview, always - a real photo when OSM has one,
            its category's pictogram on its category's colour otherwise. */}
        {isPlace && (
          <View className="mb-3">
            <PoiCover poiClass={current.poiClass} imageUrl={details?.imageUrl} />
          </View>
        )}

        <View className="flex-row items-start gap-3">
          {!isPlace && (
            <View className="relative">
              <View
                className="h-14 w-14 items-center justify-center rounded-full bg-neutral-100 p-0.5 dark:bg-neutral-800"
                style={{ borderWidth: 2, borderColor: ringColor }}
              >
                {current.avatarUrl ? (
                  <SmartImage source={{ uri: current.avatarUrl }} className="h-full w-full rounded-full" />
                ) : (
                  <MapPin size={20} color="#a1a1aa" />
                )}
              </View>
              <CategoryBadge spot={current} />
            </View>
          )}
          <View className="flex-1 pr-16">
            <Text className="text-lg font-bold leading-6 text-neutral-900 dark:text-white">{current.title}</Text>
            <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{current.subtitle}</Text>
          </View>
          <View className="absolute right-0 top-0 flex-row gap-2">
            <Pressable
              onPress={() => setReportVisible(true)}
              hitSlop={10}
              className="h-8 w-8 items-center justify-center rounded-full bg-neutral-100 active:opacity-60 dark:bg-neutral-800"
            >
              <TriangleAlert size={14} color="#71717a" />
            </Pressable>
            <Pressable
              onPress={dismiss}
              hitSlop={10}
              className="h-8 w-8 items-center justify-center rounded-full bg-neutral-100 active:opacity-60 dark:bg-neutral-800"
            >
              <X size={14} color="#71717a" />
            </Pressable>
          </View>
        </View>

        <View className="mt-3 flex-row flex-wrap items-center gap-2">
          {current.isLive ? (
            <View className="flex-row items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1">
              <View className="h-1.5 w-1.5 rounded-full bg-white" />
              <Text className="text-[10px] font-bold uppercase tracking-wide text-white">Live</Text>
            </View>
          ) : (
            // Raw `type` used to be printed here, so a shop's card said
            // "place" in English in an otherwise German app.
            <Text className="text-xs text-neutral-500 dark:text-neutral-400">
              {current.type === 'streamer' ? 'Stream' : current.type === 'event' ? 'Event' : 'Ort'}
            </Text>
          )}
          {distance && (
            <View className="flex-row items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 dark:bg-neutral-700/60">
              <MapPin size={10} color="#737373" />
              <Text className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">{distance}</Text>
            </View>
          )}
          {typeof current.viewers === 'number' && (
            <CountUp
              value={current.viewers}
              format={(n) => `${n.toLocaleString('de-DE')} Zuschauer`}
              className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
            />
          )}
        </View>

        {(openingHours || phone || website) && (
          <View className="mt-3 gap-1.5 border-t border-black/5 pt-3 dark:border-white/10">
            {openingHours && (
              <View className="flex-row items-center gap-2">
                <Clock size={14} color="#737373" />
                <Text className="flex-1 text-xs text-neutral-600 dark:text-neutral-300">{openingHours}</Text>
              </View>
            )}
            {phone && (
              <Pressable
                onPress={() => openUrl(`tel:${phone.replace(/[^\d+]/g, '')}`)}
                className="flex-row items-center gap-2"
              >
                <Phone size={14} color="#737373" />
                <Text className="text-xs" style={{ color: a.tone }}>{phone}</Text>
              </Pressable>
            )}
            {website && (
              <Pressable onPress={() => openUrl(website)} className="flex-row items-center gap-2">
                <Globe size={14} color="#737373" />
                <Text className="flex-1 text-xs" numberOfLines={1} style={{ color: a.tone }}>
                  {website}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Tipping lives here, not in the feed: by this point the user opened
            a specific stream or event on purpose. Places (shops, parks) have
            nobody to tip, so they never show it. */}
        {!route && !routing && (current.type === 'streamer' || current.type === 'event') && (
          <Pressable
            onPress={() => setDonateVisible(true)}
            className="mt-4 flex-row items-center justify-center gap-2 rounded-full py-3 active:opacity-80"
            style={{ backgroundColor: 'rgba(245,158,11,0.14)' }}
          >
            <Text className="text-sm">🪙</Text>
            <Text className="text-sm font-bold text-amber-500">
              {current.type === 'streamer' ? 'Streamer unterstützen' : 'Veranstaltung unterstützen'}
            </Text>
          </Pressable>
        )}

        {!route && !routing && (
          <View className="mt-4 flex-row gap-2">
            <Pressable
              onPress={() => onSelectMode?.('car')}
              disabled={!onSelectMode}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-full bg-neutral-100 py-2.5 dark:bg-neutral-800"
            >
              <Car size={14} color="#52525b" />
              <Text className="text-sm font-bold text-neutral-900 dark:text-white">Route</Text>
            </Pressable>
            <Pressable
              onPress={current.isLive ? () => onWatch?.(current) : () => onToggleSave?.(current.id)}
              disabled={!current.isLive && !onToggleSave}
              className="relative flex-1 items-center overflow-hidden rounded-full py-2.5"
              style={{ boxShadow: `0 10px 15px -3px ${a.glow}` }}
            >
              <LinearGradient
                colors={[a.from, a.to]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text className="text-sm font-bold text-white">
                {current.isLive ? 'Ansehen' : saved ? '✓ Gespeichert' : 'Merken'}
              </Text>
            </Pressable>
          </View>
        )}

        {(route || routing) && (
          <View className="mt-4 rounded-2xl bg-neutral-100 p-3 dark:bg-neutral-800">
            <Text className="text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Route zu {current.title}
            </Text>
            <View className="mt-2.5 flex-row gap-2">
              {MODES.map(({ key, label, Icon }) => {
                const active = route?.mode === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => onSelectMode?.(key)}
                    className={
                      active
                        ? 'flex-1 flex-row items-center justify-center gap-1 rounded-full py-2'
                        : 'flex-1 flex-row items-center justify-center gap-1 rounded-full bg-neutral-200 py-2 dark:bg-neutral-700'
                    }
                    style={active ? { backgroundColor: a.tone } : undefined}
                  >
                    <Icon size={13} color={active ? '#ffffff' : '#52525b'} />
                    <Text className={active ? 'text-xs font-bold text-white' : 'text-xs font-semibold text-neutral-700 dark:text-neutral-300'}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-3 flex-row items-center gap-4">
              {routing ? (
                <ActivityIndicator color={a.tone} />
              ) : (
                route && (
                  <>
                    <View className="flex-row items-center gap-1">
                      <Clock size={15} color="#737373" />
                      <Text className="text-sm font-semibold text-neutral-900 dark:text-white">{route.durationMin} min</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Ruler size={15} color="#737373" />
                      <Text className="text-sm font-semibold text-neutral-900 dark:text-white">{route.distanceKm} km</Text>
                    </View>
                  </>
                )
              )}
            </View>

            {routeError && (
              <View className="mt-3 rounded-2xl bg-red-50 px-3 py-2 dark:bg-red-950/50">
                <Text className="text-xs text-red-700 dark:text-red-300">{routeError}</Text>
              </View>
            )}

            <Pressable
              onPress={onNavigate}
              disabled={!onNavigate}
              className="relative mt-3 items-center overflow-hidden rounded-full py-2.5"
              style={{ boxShadow: `0 10px 15px -3px ${a.glow}` }}
            >
              <LinearGradient
                colors={[a.from, a.to]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text className="text-sm font-bold text-white">{'Los geht\'s'}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <DonateModal
        visible={donateVisible}
        onClose={() => setDonateVisible(false)}
        authorName={current.title}
      />
      <ReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        targetType="spot"
        targetId={current.id}
        targetName={current.title}
      />
    </Animated.View>
  );
}
