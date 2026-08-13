import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';

/**
 * Decorative colour blobs behind hero screens (onboarding, auth). Extracted
 * from the onboarding so the start look can be reused without duplicating the
 * animation. Purely decorative - `pointerEvents="none"`, children sit above.
 *
 * `animated` drives a slow drift loop; static renders are for places where a
 * full loop would fight other animations (e.g. behind modals).
 */

export function AuroraBackground({ animated = false }: { animated?: boolean }) {
  const [drift] = useState(() => new Animated.Value(0));
  const { accent } = usePrefs();
  const a = accentOf(accent);
  const BLOBS = [
    { color: a.tone, size: 340, top: -60, left: -90, opacity: 0.3 },
    { color: a.to, size: 300, top: 320, left: 180, opacity: 0.2 },
    { color: a.from, size: 260, top: 620, left: -60, opacity: 0.25 },
  ];

  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(drift, { toValue: 0, duration: 7000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animated, drift]);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {BLOBS.map((blob, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            top: blob.top,
            left: blob.left,
            width: blob.size,
            height: blob.size,
            borderRadius: blob.size / 2,
            backgroundColor: blob.color,
            opacity: blob.opacity,
            transform: [
              {
                translateY: animated
                  ? drift.interpolate({
                      inputRange: [0, 1],
                      outputRange: i % 2 === 0 ? [0, 40] : [0, -34],
                    })
                  : 0,
              },
              {
                translateX: animated
                  ? drift.interpolate({
                      inputRange: [0, 1],
                      outputRange: i === 1 ? [0, 28] : [0, -22],
                    })
                  : 0,
              },
            ],
          }}
        />
      ))}
    </View>
  );
}
