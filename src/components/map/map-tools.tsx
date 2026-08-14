import { LocateFixed, Loader } from '@/components/ui/icons';
import { useColorScheme } from 'nativewind';
import { Pressable, View } from 'react-native';

import { AppText as Text } from '@/components/ui/app-text';
import { Surface } from '@/components/ui/surface';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';

/**
 * The map's whole control surface: one button.
 *
 * It used to be a column of four - zoom in, zoom out, locate, basemap. The
 * zoom pair went because the map is driven by pinch and double-tap on every
 * device it runs on, so the buttons were a permanent widget for a gesture
 * nobody was missing. The basemap button went with the basemaps: there is only
 * the satellite view now, and a switch between one option is not a switch.
 *
 * What is left sits bottom-right, directly above the attribution pill (which
 * map-controls.css lifts to 88px) rather than floating in the middle of the
 * right edge - the corner is where a map's own controls belong, and it is
 * within thumb reach on a phone.
 */
export function MapTools({
  onLocate,
  locating,
  hasLocation,
}: {
  onLocate: () => void;
  locating: boolean;
  /** Drives the button's tint - accent once we actually have a fix. */
  hasLocation: boolean;
}) {
  const { accent } = usePrefs();
  const { colorScheme } = useColorScheme();
  const a = accentOf(accent);
  // A flat mid grey disappears on satellite imagery; each theme gets the ink
  // it needs instead.
  const ink = colorScheme === 'light' ? '#3f3f46' : '#e4e4e7';

  return (
    <Pressable
      onPress={onLocate}
      hitSlop={6}
      className="absolute bottom-32 right-4 z-40 active:opacity-50"
    >
      <Surface className="h-12 w-12 items-center justify-center rounded-[20px]">
        {locating ? (
          <Loader size={21} color={a.tone} strokeWidth={2.6} />
        ) : (
          <LocateFixed size={21} color={hasLocation ? a.tone : ink} strokeWidth={2.6} />
        )}
      </Surface>
    </Pressable>
  );
}

/** Small readout: how precise the current fix is. Only shown once a real GPS
 *  accuracy is known - never a guess. */
export function AccuracyBadge({ meters }: { meters: number | null }) {
  if (meters == null) return null;
  const precise = meters <= 50;
  return (
    <Surface className="absolute bottom-40 left-4 z-50 flex-row items-center gap-1.5 rounded-full px-3 py-1.5">
      <View
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: precise ? '#10b981' : '#f59e0b' }}
      />
      <Text className="text-[10px] font-bold text-neutral-700 dark:text-neutral-200">
        {precise ? 'Genauer Standort' : 'Ungefährer Standort'} · ±{Math.round(meters)} m
      </Text>
    </Surface>
  );
}
