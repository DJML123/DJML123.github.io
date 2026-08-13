import { Clock, MapPin, SearchX } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText as Text } from '@/components/ui/app-text';
import type { GeocodeResult } from '@/components/map/use-geocode-search';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';
import { Skeleton } from './skeleton';
import { Surface } from './surface';

/** `1.24` -> "1,2 km", `0.42` -> "420 m". */
function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}

function Row({
  result,
  recent,
  last,
  onSelect,
}: {
  result: GeocodeResult;
  recent: boolean;
  last: boolean;
  onSelect: (result: GeocodeResult) => void;
}) {
  const { accent } = usePrefs();
  const a = accentOf(accent);
  const Icon = recent ? Clock : MapPin;

  return (
    <Pressable
      onPress={() => onSelect(result)}
      className={
        last
          ? 'flex-row items-center gap-3 px-3.5 py-3 active:opacity-60'
          : 'flex-row items-center gap-3 border-b border-black/5 px-3.5 py-3 active:opacity-60 dark:border-white/10'
      }
    >
      {/* Tinted round tile, the same shape the avatar creator uses for every
          choice - it gives the row a fixed left edge, so a list of results
          scans as a column instead of ragged text. */}
      <View
        className="h-9 w-9 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${a.tone}1f` }}
      >
        <Icon size={16} color={a.tone} strokeWidth={2.4} />
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="text-sm font-bold text-neutral-900 dark:text-white">
          {result.title}
        </Text>
        <Text numberOfLines={1} className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
          {result.subtitle}
        </Text>
      </View>
      {result.distanceKm != null && (
        <Text className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500">
          {formatKm(result.distanceKm)}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * The search panel under the field.
 *
 * Three states, all of which used to be one: an empty field now offers the
 * user's recent places instead of nothing, a search that found nothing says so
 * instead of silently rendering an empty box, and a hit shows how far away it
 * is - which is usually the deciding factor between two places with the same
 * name.
 */
export function SearchResults({
  results,
  loading,
  query,
  recents,
  onSelect,
  onClearRecents,
}: {
  results: GeocodeResult[];
  loading: boolean;
  /** The current query, so the panel can tell "not typed yet" from "no hits". */
  query: string;
  recents: GeocodeResult[];
  onSelect: (result: GeocodeResult) => void;
  onClearRecents: () => void;
}) {
  const searching = query.trim().length >= 2;
  const showRecents = !searching && recents.length > 0;

  if (!searching && !showRecents) return null;

  return (
    <Surface variant="thick" className="mx-4 mb-2 overflow-hidden rounded-3xl">
      {showRecents && (
        <View className="flex-row items-center justify-between px-4 pb-1 pt-3">
          <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-neutral-400 dark:text-neutral-500">
            Zuletzt gesucht
          </Text>
          <Pressable onPress={onClearRecents} hitSlop={8} className="active:opacity-60">
            <Text className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500">Löschen</Text>
          </Pressable>
        </View>
      )}

      {showRecents &&
        recents.map((r, i) => (
          <Row key={r.id} result={r} recent last={i === recents.length - 1} onSelect={onSelect} />
        ))}

      {searching && loading && (
        <View className="gap-3 px-3.5 py-3.5">
          {[0, 1, 2].map((i) => (
            <View key={i} className="flex-row items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-2xl" />
              <View className="flex-1 gap-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </View>
            </View>
          ))}
        </View>
      )}

      {searching && !loading && results.length === 0 && (
        <View className="items-center px-6 py-7">
          <SearchX size={22} color="#a1a1aa" strokeWidth={2.2} />
          <Text className="mt-2 text-sm font-bold text-neutral-700 dark:text-neutral-200">Nichts gefunden</Text>
          <Text className="mt-1 text-center text-[11px] leading-4 text-neutral-400 dark:text-neutral-500">
            Prüfe die Schreibweise oder suche nach der Straße statt nach dem Namen.
          </Text>
        </View>
      )}

      {searching &&
        !loading &&
        results.map((r, i) => (
          <Row key={r.id} result={r} recent={false} last={i === results.length - 1} onSelect={onSelect} />
        ))}
    </Surface>
  );
}
