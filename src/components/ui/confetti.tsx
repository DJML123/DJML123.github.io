import { useEffect, useMemo, useState } from 'react';
import { AppText as Text } from '@/components/ui/app-text';
import { Animated, StyleSheet } from 'react-native';
const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  angle: (i / 16) * Math.PI * 2 + Math.random() * 0.3,
  distance: 70 + (i % 5) * 26,
  emoji: ['🎉', '⭐', '🪙', '💜'][i % 4],
}));

/** One-shot confetti burst from the screen center, replays when `burstKey`
 *  changes. RN Animated only, so it also runs on web. */
export function ConfettiBurst({ burstKey }: { burstKey: number }) {
  const progress = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (!burstKey) return;
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 1000, useNativeDriver: true }).start();
  }, [burstKey, progress]);

  const transforms = useMemo(
    () =>
      PARTICLES.map((p) => ({
        translateX: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.cos(p.angle) * p.distance],
        }),
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-10, 60 + Math.sin(p.angle) * p.distance],
        }),
        scale: progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.2, 0.9] }),
        opacity: progress.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 1, 0] }),
      })),
    [progress]
  );

  if (!burstKey) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {PARTICLES.map((p, i) => (
        <Animated.View key={i} style={[styles.particle, { transform: transforms[i] as never }]}>
          <Text style={styles.emoji}>{p.emoji}</Text>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    left: '50%',
    top: '42%',
    marginLeft: -14,
    marginTop: -14,
  },
  emoji: {
    fontSize: 26,
  },
});
