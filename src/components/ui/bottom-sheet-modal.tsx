import { ChevronLeft, X } from '@/components/ui/icons';
import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, PanResponder, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { AppText as Text } from '@/components/ui/app-text';

/**
 * The one bottom sheet every panel in the app uses.
 *
 * Replaces a per-modal mix of `SheetIn` + hand-rolled headers, which had three
 * problems this fixes in one place:
 *
 *  - Height was `max-h-[85%]` on a `Pressable` whose parent was not a measured
 *    box, so a long panel (settings, friends) simply grew past the bottom of
 *    the window and its last rows became unreachable. Height is now clamped
 *    against the real window height and the body scrolls inside that clamp.
 *  - Closing was instant: the sheet vanished while the backdrop faded, so the
 *    exit never matched the entrance. It now animates out and unmounts after.
 *  - There was no way to dismiss by dragging. The grabber and header are a
 *    drag surface now; past a third of the sheet's height (or on a fast
 *    flick) it slides the rest of the way down and closes.
 */
export function BottomSheetModal({
  visible,
  onClose,
  onBack,
  title,
  children,
  /** Fraction of the window the sheet may occupy at most. */
  maxHeightRatio = 0.88,
}: {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void;
  title: string;
  children: React.ReactNode;
  maxHeightRatio?: number;
}) {
  const { height: windowHeight } = useWindowDimensions();
  const sheetMaxHeight = Math.round(windowHeight * maxHeightRatio);

  // Lazy initialisers, not refs: the React Compiler disallows reading refs
  // during render, and this guarantees one Animated.Value per mount.
  const [translateY] = useState(() => new Animated.Value(windowHeight));
  const [backdrop] = useState(() => new Animated.Value(0));
  // Keeps the sheet on screen for the length of the exit animation. `visible`
  // alone would unmount it on the first frame of the close, so the slide-down
  // would never be seen. Both writes happen in callbacks (a frame callback and
  // the animation's completion), never synchronously inside the effect.
  const [lingering, setLingering] = useState(false);
  const show = visible || lingering;

  useEffect(() => {
    if (visible) {
      const frame = requestAnimationFrame(() => setLingering(true));
      translateY.setValue(windowHeight);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 4 }),
        Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
      return () => cancelAnimationFrame(frame);
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: windowHeight,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setLingering(false);
    });
  }, [visible, windowHeight, translateY, backdrop]);

  // Rebuilt each render so the closure always holds the current `onClose`
  // (no refs, which the React Compiler bans during render).
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
    onPanResponderMove: (_, g) => {
      // Downward only: dragging up must not lift the sheet off its top edge.
      translateY.setValue(Math.max(0, g.dy));
    },
    onPanResponderRelease: (_, g) => {
      const farEnough = g.dy > sheetMaxHeight / 3;
      const fastEnough = g.vy > 0.7;
      if (farEnough || fastEnough) {
        onClose();
        return;
      }
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
    },
  });

  if (!show) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Animated.View style={{ position: 'absolute', inset: 0, opacity: backdrop }}>
          <Pressable onPress={onClose} className="flex-1 bg-black/60" />
        </Animated.View>

        <Animated.View style={{ transform: [{ translateY }], maxHeight: sheetMaxHeight }}>
          {/* The entrance spring overshoots, which lifts the sheet's bottom
              edge above the screen for a few frames and used to expose the
              dark backdrop as a black bar under the sheet. This filler carries
              the sheet's own colour past the bottom edge, so there is nothing
              to expose. */}
          <View
            className="absolute left-0 right-0 h-32 bg-white dark:bg-[#141419]"
            style={{ bottom: -128 }}
          />
          <View
            className="overflow-hidden rounded-t-3xl bg-white dark:bg-[#141419]"
            style={{ maxHeight: sheetMaxHeight }}
          >
            {/* Grabber + header double as the drag surface. */}
            <View {...panResponder.panHandlers}>
              <View className="items-center pb-1 pt-3">
                <View className="h-1.5 w-11 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              </View>
              <View className="flex-row items-center justify-between px-6 pb-3 pt-2">
                <View className="flex-row items-center gap-2">
                  {onBack && (
                    <Pressable
                      onPress={onBack}
                      hitSlop={8}
                      className="h-8 w-8 items-center justify-center rounded-full bg-neutral-100 active:opacity-60 dark:bg-neutral-800"
                    >
                      <ChevronLeft size={18} color="#a1a1aa" />
                    </Pressable>
                  )}
                  <Text className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">{title}</Text>
                </View>
                <Pressable
                  onPress={onClose}
                  hitSlop={8}
                  className="h-8 w-8 items-center justify-center rounded-full bg-neutral-100 active:opacity-60 dark:bg-neutral-800"
                >
                  <X size={16} color="#a1a1aa" />
                </Pressable>
              </View>
            </View>

            {/* The body scrolls inside the clamp - this is what keeps a long
                panel from running past the bottom of the window. */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerClassName="px-6 pb-10"
              // Lets a drag that starts on a non-scrollable row still reach
              // the pan responder above.
              bounces={false}
            >
              {children}
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
