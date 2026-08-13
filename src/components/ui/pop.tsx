import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

/**
 * Overshoots scale once whenever `trigger` changes. Toggling a button's colour
 * is a state change the eye can miss; a 150ms pop is what makes the tap feel
 * like it did something. Used for follow / join / save.
 *
 * Skips the very first run so a list of already-followed creators doesn't
 * pop on mount.
 */
export function Pop({ trigger, children }: { trigger: unknown; children: React.ReactNode }) {
  const [scale] = useState(() => new Animated.Value(1));
  // A ref, not state: this only has to survive between effect runs and must
  // never cause a render of its own.
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    scale.setValue(0.86);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 14 }).start();
  }, [trigger, scale]);

  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}
