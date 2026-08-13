import { BottomSheetModal } from './bottom-sheet-modal';
import { AppText as Text } from '@/components/ui/app-text';
import { View } from 'react-native';
import { useActivity } from '@/constants/activity-context';

function timeAgo(at: number) {
  const diff = Date.now() - at;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  return `vor ${Math.floor(hours / 24)} Tagen`;
}

/** Personal activity feed: follows, saved spots, donations, blocks.
 *  Written by the repository whenever an action happens - this modal just
 *  mirrors it. */
export function ActivityModal({
  visible,
  onClose,
  onBack,
}: {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void;
}) {
  const { activities } = useActivity();

  return (
    <BottomSheetModal visible={visible} onClose={onClose} onBack={onBack} title="Aktivitäten">

          {activities.length === 0 ? (
            <Text className="py-10 text-center text-sm text-neutral-400 dark:text-neutral-500">
              Noch keine Aktivitäten – folge jemandem, speichere einen Ort oder spende für einen Streamer.
            </Text>
          ) : (
            <>
              {activities.map((a) => (
                <View
                  key={a.id}
                  className="mb-2 flex-row items-center gap-3 rounded-2xl bg-neutral-100 p-3 dark:bg-neutral-800"
                >
                  <Text className="text-xl">{a.emoji}</Text>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-neutral-900 dark:text-white">{a.text}</Text>
                    <Text className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">{timeAgo(a.at)}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
    </BottomSheetModal>
  );
}
