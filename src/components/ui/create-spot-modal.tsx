import { useState } from 'react';
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/app-text';
import { Pressable, View } from 'react-native';
import { BottomSheetModal } from './bottom-sheet-modal';
import { PrimaryButton } from './primary-button';
import type { SpotType } from '@/constants/mock-data';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';

const TYPES: { key: SpotType; label: string; emoji: string; hint: string }[] = [
  // Hints stay under ~16 characters: three tiles across a 375px phone leave
  // about that much room before `numberOfLines={1}` starts cutting words off.
  { key: 'streamer', label: 'Stream', emoji: '🔴', hint: 'Live unterwegs' },
  { key: 'event', label: 'Event', emoji: '🎉', hint: 'Party & Konzert' },
  { key: 'place', label: 'Ort', emoji: '📍', hint: 'Tipp für andere' },
];

/** Pre-filled description per type. Two empty text fields are two decisions
 *  before anything happens; a filled one is a suggestion the user only has to
 *  scan and correct - a much cheaper task than composing from nothing. Most
 *  people never change a sensible default, and read it as a recommendation. */
const DEFAULT_SUBTITLE: Record<SpotType, string> = {
  streamer: 'Live aus meiner Umgebung',
  event: 'Heute Abend • In deiner Nähe',
  place: 'Empfehlenswerter Ort in der Nähe',
};

const TITLE_HINT: Record<SpotType, string> = {
  streamer: 'z. B. Abendrunde durch Kreuzberg',
  event: 'z. B. Open Air im Mauerpark',
  place: 'z. B. Bester Döner der Stadt',
};

/** Same section caption as the avatar creator - small, upper-case, muted. It is
 *  what makes a form read as a set of decisions rather than a wall of fields. */
function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-2.5 text-[11px] font-bold uppercase tracking-[1.2px] text-neutral-400 dark:text-neutral-500">
      {children}
    </Text>
  );
}

export function CreateSpotModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: { type: SpotType; title: string; subtitle: string }) => void;
}) {
  // 'event' is the most common pick, so it is selected rather than offered.
  const [type, setType] = useState<SpotType>('event');
  const { accent } = usePrefs();
  const a = accentOf(accent);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState(DEFAULT_SUBTITLE.event);
  // Once the user writes their own description we stop overwriting it; before
  // that, switching type swaps in that type's default.
  const [subtitleTouched, setSubtitleTouched] = useState(false);

  const pickType = (next: SpotType) => {
    setType(next);
    if (!subtitleTouched) setSubtitle(DEFAULT_SUBTITLE[next]);
  };

  const submit = () => {
    if (!title.trim()) return;
    onCreate({ type, title: title.trim(), subtitle: subtitle.trim() });
    setTitle('');
    setSubtitle(DEFAULT_SUBTITLE[type]);
    setSubtitleTouched(false);
  };

  // BottomSheetModal, not a bare <Modal>: it brings the grabber, the
  // swipe-down-to-dismiss pan responder and the tappable backdrop that this
  // sheet used to lack - it could only be closed through its "Abbrechen" row.
  return (
    <BottomSheetModal visible={visible} onClose={onClose} title="Neu erstellen" maxHeightRatio={0.8}>
      <SectionTitle>Was möchtest du teilen?</SectionTitle>
      {/* Three tiles rather than a pill row: the type decides everything below
          it, so it gets the space a headline decision deserves - and unlike the
          old horizontal scroller, no option can sit off-screen. */}
      <View className="mb-6 flex-row gap-2.5">
        {TYPES.map((t) => {
          const active = type === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => pickType(t.key)}
              className="flex-1 items-center rounded-2xl px-2 py-4 active:opacity-80"
              style={
                active
                  ? { backgroundColor: a.tone, boxShadow: `0 8px 20px -6px ${a.glow}` }
                  : { backgroundColor: 'rgba(120,120,130,0.12)' }
              }
            >
              <Text className="text-2xl">{t.emoji}</Text>
              <Text
                className="mt-1.5 text-sm font-bold"
                style={{ color: active ? '#ffffff' : undefined }}
              >
                {t.label}
              </Text>
              <Text
                numberOfLines={1}
                className="mt-0.5 w-full text-center text-[10px] font-semibold"
                style={{ color: active ? 'rgba(255,255,255,0.75)' : '#a3a3a3' }}
              >
                {t.hint}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle>Titel</SectionTitle>
      <TextInput
        placeholder={TITLE_HINT[type]}
        placeholderTextColor="#9ca3af"
        value={title}
        onChangeText={setTitle}
        className="mb-6 rounded-2xl bg-neutral-100 px-4 py-3.5 text-neutral-900 dark:bg-neutral-800 dark:text-white"
      />

      <SectionTitle>Beschreibung</SectionTitle>
      <TextInput
        placeholder="Beschreibung / Ort"
        placeholderTextColor="#9ca3af"
        value={subtitle}
        onChangeText={(v) => {
          setSubtitle(v);
          setSubtitleTouched(true);
        }}
        className="rounded-2xl bg-neutral-100 px-4 py-3.5 text-neutral-900 dark:bg-neutral-800 dark:text-white"
      />
      <Text className="mb-6 mt-2 px-1 text-[11px] text-neutral-400 dark:text-neutral-500">
        Vorausgefüllt – ändere nur, was nicht passt.
      </Text>

      {/* The button names the outcome instead of the mechanism: the user
          sees what will exist after the tap, not what the code does. */}
      <PrimaryButton
        label={`${TYPES.find((t) => t.key === type)?.label} auf der Karte veröffentlichen`}
        onPress={submit}
        disabled={!title.trim()}
      />
      <Text className="mt-3 text-center text-[10px] text-neutral-400 dark:text-neutral-500">
        Zum Schließen nach unten wischen oder oben antippen.
      </Text>
    </BottomSheetModal>
  );
}
