import { useEffect, useState } from 'react';
import { Animated } from 'react-native';

/**
 * Spring entrance for bottom-sheet modals. React Native's own
 * `animationType="slide"` is a linear ramp - it arrives and simply stops, which
 * is the single clearest tell of an unpolished app. This lands with a slight
 * settle instead, matching the map's PopIn and the bottom sheet's spring.
 *
 * Modals using this should be `animationType="none"`, otherwise RN's slide and
 * this spring both run and fight each other.
 */
export function SheetIn({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) {
      progress.setValue(0);
      return;
    }
    Animated.spring(progress, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 5 }).start();
  }, [visible, progress]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

/** Fade + scale entrance for the centred (dialog-style) modals. */
export function DialogIn({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) {
      progress.setValue(0);
      return;
    }
    Animated.spring(progress, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 8 }).start();
  }, [visible, progress]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}
