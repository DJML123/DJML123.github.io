import { Crosshair, Lock, ShieldAlert, X } from '@/components/ui/icons';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText as Text } from '@/components/ui/app-text';
import { Surface } from '@/components/ui/surface';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';

/**
 * What the app is allowed to know about where the user is.
 *
 *  - `ask`      nothing yet, and the browser will still show its dialog
 *  - `approx`   only the IP fallback fired: right city, wrong street
 *  - `denied`   the user (or the site settings) refused, permanently
 *  - `insecure` the page is on plain HTTP, where no browser hands out GPS
 */
export type LocationHintState = 'ask' | 'approx' | 'denied' | 'insecure';

/**
 * Copy per state. Each one names the actual cause and offers the one action
 * that can change it - which for `denied` and `insecure` is *not* a retry
 * button. A browser never re-prompts for a denied permission and never prompts
 * at all on an insecure origin, so a button there would fire the API, get an
 * instant error callback and leave the card exactly as it was: the reported
 * "man klickt auf GPS erlauben, es verschwindet nicht und es kommt kein Popup".
 */
const COPY: Record<
  LocationHintState,
  { icon: typeof Crosshair; title: string; body: string; action?: string }
> = {
  ask: {
    icon: Crosshair,
    title: 'Standort aktivieren',
    body: 'Damit die Karte bei dir startet und dir zeigt, was in deiner Nähe läuft.',
    action: 'Erlauben',
  },
  approx: {
    icon: Crosshair,
    title: 'Nur ungefährer Standort',
    body: 'Gerade grob über deine IP bestimmt – das trifft die Stadt, nicht die Straße.',
    action: 'Genauen Standort holen',
  },
  denied: {
    icon: ShieldAlert,
    title: 'Standort ist blockiert',
    body: 'Der Browser fragt nicht noch einmal nach. Tippe auf das Schloss neben der Adresse und stelle „Standort“ auf „Erlauben“.',
  },
  insecure: {
    icon: Lock,
    title: 'GPS braucht HTTPS',
    body: 'Diese Seite läuft über HTTP – darüber geben Browser GPS grundsätzlich nicht frei. Über eine HTTPS-Adresse ist der genaue Standort sofort da.',
  },
};

/**
 * The one card that explains the location situation, in the avatar creator's
 * idiom: a tinted round glyph tile, a bold line, a muted line, one filled pill.
 * It replaces three near-identical cards that each rendered their own layout
 * and could contradict each other on screen.
 */
export function LocationHint({
  state,
  busy,
  onRetry,
  onDismiss,
}: {
  state: LocationHintState;
  busy: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const { accent } = usePrefs();
  const a = accentOf(accent);
  const { icon: Icon, title, body, action } = COPY[state];

  return (
    <Surface variant="thick" className="absolute bottom-40 left-4 z-50 max-w-[300px] rounded-3xl p-4">
      <View className="flex-row items-start gap-3">
        <View
          className="h-9 w-9 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${a.tone}26` }}
        >
          <Icon size={17} color={a.tone} strokeWidth={2.4} />
        </View>
        <View className="flex-1">
          <Text className="text-[13px] font-bold text-neutral-900 dark:text-white">{title}</Text>
          <Text className="mt-1 text-[11px] leading-4 text-neutral-500 dark:text-neutral-400">{body}</Text>
        </View>
        <Pressable
          onPress={onDismiss}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Hinweis schließen"
          className="active:opacity-50"
        >
          <X size={15} color="#a1a1aa" />
        </Pressable>
      </View>

      {action && (
        <Pressable
          onPress={onRetry}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={action}
          className="mt-3 flex-row items-center justify-center gap-2 rounded-full py-2.5 active:opacity-80"
          style={{ backgroundColor: a.tone, boxShadow: `0 8px 20px -6px ${a.glow}` }}
        >
          {busy && <ActivityIndicator size="small" color="#ffffff" />}
          <Text className="text-xs font-bold text-white">{busy ? 'Suche…' : action}</Text>
        </Pressable>
      )}
    </Surface>
  );
}
