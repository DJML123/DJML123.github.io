import { useEffect, useState } from 'react';
import { Animated, Modal, View } from 'react-native';
import { AppText as Text } from '@/components/ui/app-text';
import { ConfettiBurst } from './confetti';
import { PrimaryButton } from './primary-button';

/**
 * Full-screen "you just hit something" moment: confetti, a spring-scaled card
 * and a glowing button. Only ever fired for milestones the user genuinely
 * reached - see repository.recordVisitDay, which returns a milestone at most
 * once per streak length.
 */
export function CelebrationModal({
  visible,
  emoji,
  title,
  subtitle,
  onClose,
}: {
  visible: boolean;
  emoji: string;
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  const [scale] = useState(() => new Animated.Value(0));
  // Derived, not stored: the modal is mounted per milestone and unmounts when
  // dismissed, so `visible` flipping to true is itself the burst trigger.
  const burstKey = visible ? 1 : 0;

  useEffect(() => {
    if (!visible) {
      scale.setValue(0);
      return;
    }
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 14 }).start();
  }, [visible, scale]);

  // Unmount instead of only hiding. React Native Web gives every <Modal> its
  // own portal, appended to the document in *mount* order - so a modal that
  // stays mounted from app start sits underneath every sheet opened later,
  // which is exactly why sign-up appeared behind the panel that opened it.
  // Mounting on demand puts it last in the document, i.e. on top.
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/70 px-8">
        <ConfettiBurst burstKey={burstKey} />
        <Animated.View style={{ transform: [{ scale }], width: '100%', maxWidth: 340 }}>
          <View className="items-center rounded-3xl bg-white p-7 shadow-2xl dark:bg-[#141419]">
            <Text className="text-6xl">{emoji}</Text>
            <Text className="mt-4 text-center text-xl font-bold text-neutral-900 dark:text-white">{title}</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-neutral-500 dark:text-neutral-400">
              {subtitle}
            </Text>
            <PrimaryButton label="Weiter" onPress={onClose} className="mt-6 w-full" />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
