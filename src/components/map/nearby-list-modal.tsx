import { Pressable, View } from 'react-native';

import { AppText as Text } from '@/components/ui/app-text';
import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { DemoBadge } from '@/components/ui/demo-badge';
import { MapPin } from '@/components/ui/icons';
import { KIND_HEX, SpotGlyph } from '@/components/map/spot-marker';
import type { Spot } from '@/constants/mock-data';
import { distanceKm } from '@/constants/mock-data';
import { useApproxLocation } from '@/constants/use-approx-location';

/** `1.24` -> "1,2 km", `0.42` -> "420 m". Same formatting the search results
 *  list uses, so a distance reads the same wherever it appears. */
function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}

const PLACE_HEX = '#3866c4';

function Row({
  spot,
  distance,
  last,
  onPress,
}: {
  spot: Spot;
  /** null when no position is known yet - the row then simply omits it. */
  distance: number | null;
  last: boolean;
  onPress: () => void;
}) {
  const kind = spot.type === 'event' ? (spot.eventKind ?? 'meetup') : 'place';
  const hex = spot.isLive ? '#ef4444' : spot.type === 'place' ? PLACE_HEX : (KIND_HEX[kind] ?? PLACE_HEX);
  const kindLabel = spot.type === 'streamer' ? 'Stream' : spot.type === 'event' ? 'Event' : 'Ort';

  // Built once here rather than left to the screen reader to piece together
  // from the row's visible fragments (title, live badge, distance chip) -
  // those are laid out for sighted scanning, not for being read in order.
  const label = [
    spot.title,
    kindLabel,
    spot.isLive ? 'live' : null,
    spot.subtitle,
    distance != null ? `${formatKm(distance)} entfernt` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={
        last
          ? 'flex-row items-center gap-3 px-3.5 py-3 active:opacity-60'
          : 'flex-row items-center gap-3 border-b border-black/5 px-3.5 py-3 active:opacity-60 dark:border-white/10'
      }
    >
      <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: hex }}>
        {spot.type === 'place' ? (
          <MapPin size={17} color="#ffffff" strokeWidth={2.4} />
        ) : (
          <SpotGlyph kind={kind} size={17} hex={hex} />
        )}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text numberOfLines={1} className="flex-1 text-sm font-bold text-neutral-900 dark:text-white">
            {spot.title}
          </Text>
          {spot.isLive && (
            <View className="flex-row items-center gap-1 rounded-full bg-red-500 px-1.5 py-[1px]">
              <View className="h-1 w-1 rounded-full bg-white" />
              <Text className="text-[8px] font-black uppercase tracking-wide text-white">Live</Text>
            </View>
          )}
          {spot.type !== 'place' && <DemoBadge tone="light" />}
        </View>
        <Text numberOfLines={1} className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
          {spot.subtitle}
        </Text>
      </View>
      {distance != null && (
        <Text className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500">{formatKm(distance)}</Text>
      )}
    </Pressable>
  );
}

/**
 * A text equivalent of what the map shows: every stream, event and place
 * currently on screen, as a real, navigable list.
 *
 * The map itself is a `<canvas>` - there is no way to make a canvas
 * accessible to a screen reader or keyboard user, so the only honest fix is
 * an equivalent view of the same data, not an accessible canvas. This list
 * covers the app's own content (streams, events, places the user or someone
 * else created) because that is what `spots` actually contains; the shops,
 * restaurants and other real-world POIs drawn straight from the map's vector
 * tiles live only on the canvas and are not part of this data - they are
 * OpenStreetMap's own content, reachable by search instead.
 *
 * Sorted by distance once a position is known (see useApproxLocation), so the
 * list matches what "near me" means on the map - nearest first, exactly like
 * every other ranked list in the app.
 */
export function NearbyListModal({
  visible,
  onClose,
  spots,
  onSelectSpot,
}: {
  visible: boolean;
  onClose: () => void;
  spots: Spot[];
  onSelectSpot: (spot: Spot) => void;
}) {
  const near = useApproxLocation();

  const ordered = near
    ? [...spots].sort((a, b) => distanceKm(near, a.coords) - distanceKm(near, b.coords))
    : spots;

  return (
    <BottomSheetModal visible={visible} onClose={onClose} title="In der Nähe">
      {ordered.length === 0 ? (
        <Text className="py-8 text-center text-sm text-neutral-400 dark:text-neutral-500">
          Für diesen Filter ist gerade nichts in der Liste.
        </Text>
      ) : (
        <View className="overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800">
          {ordered.map((spot, i) => (
            <Row
              key={spot.id}
              spot={spot}
              distance={near ? distanceKm(near, spot.coords) : null}
              last={i === ordered.length - 1}
              onPress={() => {
                onSelectSpot(spot);
                onClose();
              }}
            />
          ))}
        </View>
      )}
    </BottomSheetModal>
  );
}
