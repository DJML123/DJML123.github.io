import { useEffect, useState } from 'react';
import { Animated, StyleSheet, type ViewStyle } from 'react-native';

/** Shimmering placeholder block for loading states. RN Animated so it works
 *  on web too; the loop runs once and rewinds rather than restarting, so it
 *  doesn't fight React's concurrent renderer. */
export function Skeleton({ className, style }: { className?: string; style?: ViewStyle }) {
  const pulse = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      className={className ?? 'h-4 rounded-full'}
      style={[styles.base, style, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] }) }]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#cbd5e1',
  },
});
