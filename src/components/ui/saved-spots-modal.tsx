import { MapPin } from '@/components/ui/icons';
import { BottomSheetModal } from './bottom-sheet-modal';
import { AppText as Text } from '@/components/ui/app-text';
import { Pressable, View } from 'react-native';
import type { Spot } from '@/constants/mock-data';

export function SavedSpotsModal({
  visible,
  onClose,
  onBack,
  spots,
  onSelectSpot,
}: {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void;
  spots: Spot[];
  onSelectSpot: (spot: Spot) => void;
}) {
  return (
    <BottomSheetModal visible={visible} onClose={onClose} onBack={onBack} title="Gespeicherte Orte">
            {spots.length === 0 && (
              <Text className="py-8 text-center text-sm text-neutral-400 dark:text-neutral-500">
                Noch keine Orte gespeichert – tippe auf der Karte auf „Merken“.
              </Text>
            )}
            {spots.map((spot) => (
              <Pressable
                key={spot.id}
                onPress={() => {
                  onClose();
                  onSelectSpot(spot);
                }}
                className="mb-2 flex-row items-center gap-3 rounded-2xl bg-neutral-100 p-2.5 dark:bg-neutral-800"
              >
                <MapPin size={18} color="#a1a1aa" />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-neutral-900 dark:text-white">{spot.title}</Text>
                  <Text className="text-xs text-neutral-500 dark:text-neutral-400">{spot.subtitle}</Text>
                </View>
                <Text className="text-xs capitalize text-neutral-400 dark:text-neutral-500">{spot.type}</Text>
              </Pressable>
            ))}
          
    </BottomSheetModal>
  );
}
