import { useEffect, useState } from 'react';
import { AppText as Text } from '@/components/ui/app-text';
import { Animated, StyleSheet } from 'react-native';
/** Instagram-style double-tap heart. `burstKey` increments on every burst -
 *  a new key replays the animation. Runs on RN Animated so it works on web. */
export function HeartBurst({ burstKey }: { burstKey: number }) {
  const scale = useState(() => new Animated.Value(0))[0];
  const opacity = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (!burstKey) return;
    scale.setValue(0.4);
    opacity.setValue(1);
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, delay: 350, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [burstKey, scale, opacity]);

  if (!burstKey) return null;

  return (
    <Animated.View style={[styles.wrap, { pointerEvents: 'none' }, { opacity, transform: [{ scale }] }]}>
      <Text style={styles.heart}>❤️</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heart: {
    fontSize: 110,
    // react-native-web warns that these are deprecated in favour of the CSS
    // `textShadow` shorthand, but RN's TextStyle type has no such property yet.
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 2 },
  },
});
