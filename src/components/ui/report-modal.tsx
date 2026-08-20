import { useState } from 'react';
import { DialogIn } from './sheet-in';
import { AppText as Text } from '@/components/ui/app-text';
import { Modal, Pressable, View } from 'react-native';
import { useSocial } from '@/constants/social-context';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';
import { repo } from '@/services/repository';
import { haptics } from '@/services/haptics';

const REASONS = ['Spam', 'Unangemessener Inhalt', 'Falsche Informationen', 'Anderes'];

/** Report a spot or stream (and optionally block its author). Reports land in
 *  the repository's report log - in a real backend they would feed a
 *  moderation queue. */
export function ReportModal({
  visible,
  onClose,
  targetType,
  targetId,
  targetName,
}: {
  visible: boolean;
  onClose: () => void;
  targetType: 'spot' | 'stream';
  targetId: string;
  targetName: string;
}) {
  const { block } = useSocial();
  const { accent } = usePrefs();
  const a = accentOf(accent);
  const [reason, setReason] = useState<string | null>(null);

  const handleClose = () => {
    setReason(null);
    onClose();
  };

  const submit = () => {
    if (reason) {
      repo.addReport({ targetType, targetId, reason });
      haptics.success();
    }
    handleClose();
  };

  const submitBlock = () => {
    block(targetName);
    haptics.light();
    handleClose();
  };

  // Unmount instead of only hiding. React Native Web gives every <Modal> its
  // own portal, appended to the document in *mount* order - so a modal that
  // stays mounted from app start sits underneath every sheet opened later,
  // which is exactly why sign-up appeared behind the panel that opened it.
  // Mounting on demand puts it last in the document, i.e. on top.
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel="Schließen"
        className="flex-1 items-center justify-center bg-black/60 px-8"
      >
        <DialogIn visible={visible}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal
          className="w-full max-w-sm rounded-3xl bg-white p-6 dark:bg-[#141419]"
        >
          <Text className="mb-1 text-center text-lg font-bold text-neutral-900 dark:text-white">
            {targetType === 'spot' ? 'Ort melden' : 'Stream melden'}
          </Text>
          <Text className="mb-4 text-center text-xs text-neutral-500 dark:text-neutral-400">{targetName}</Text>

          <View className="gap-2">
            {REASONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => setReason(r)}
                accessibilityRole="radio"
                accessibilityState={{ checked: reason === r }}
                accessibilityLabel={r}
                className={
                  reason === r
                    ? 'flex-row items-center justify-between rounded-2xl px-4 py-3'
                    : 'flex-row items-center justify-between rounded-2xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800'
                }
                style={reason === r ? { backgroundColor: a.tone } : undefined}
              >
                <Text className={reason === r ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-neutral-800 dark:text-neutral-200'}>
                  {r}
                </Text>
                {reason === r && <Text className="text-white">✓</Text>}
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={submit}
            disabled={!reason}
            accessibilityRole="button"
            accessibilityLabel="Melden"
            className={
              reason
                ? 'mt-4 items-center rounded-full bg-red-500 py-3 shadow-md shadow-red-500/30'
                : 'mt-4 items-center rounded-full bg-neutral-100 py-3 opacity-50 dark:bg-neutral-800'
            }
          >
            <Text className="text-sm font-bold text-white">Melden</Text>
          </Pressable>
          <Pressable
            onPress={submitBlock}
            accessibilityRole="button"
            accessibilityLabel={`${targetName} zusätzlich blockieren`}
            className="mt-2 items-center py-2"
          >
            {/* Amber, not red: red is reserved app-wide for "live right now",
                and a destructive-looking colour on a secondary action next to a
                Live badge reads as an alert rather than an option. */}
            <Text className="text-xs font-semibold text-amber-600 dark:text-amber-500">Zusätzlich blockieren</Text>
          </Pressable>
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Abbrechen"
            className="items-center py-1"
          >
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">Abbrechen</Text>
          </Pressable>
        </Pressable>
        </DialogIn>
      </Pressable>
    </Modal>
  );
}
