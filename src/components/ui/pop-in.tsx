import { useEffect, useState } from 'react';
import { Animated } from 'react-native';

/**
 * Spring-scales a floating panel into place. Used for the things that appear
 * over the map (place preview, route summary) - they used to just blink into
 * existence, which is the single most "unfinished" looking thing a map UI can
 * do.
 *
 * Starts slightly small and low rather than at zero: a panel growing from
 * nothing reads as a popup, one settling into place reads as a sheet.
 */
export function PopIn({ id, children }: { id: string | number; children: React.ReactNode }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    progress.setValue(0);
    Animated.spring(progress, {
      toValue: 1,
      useNativeDriver: true,
      speed: 16,
      bounciness: 6,
    }).start();
  }, [id, progress]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
