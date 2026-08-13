import { useEffect, useState } from 'react';
import { Animated, Pressable } from 'react-native';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';

const TRACK_WIDTH = 46;
const TRACK_HEIGHT = 26;
const THUMB_SIZE = 22;
const PADDING = 2;

/**
 * A from-scratch iOS-style toggle instead of RN's built-in `Switch` - the
 * built-in one renders as the platform's native control on web (an actual
 * `<input type="checkbox">` styled by the browser), which looks completely
 * out of place next to the rest of this UI. This one animates both the thumb
 * position and the track color on every change.
 */
export function AnimatedSwitch({ value, onValueChange }: { value: boolean; onValueChange: (next: boolean) => void }) {
  const [anim] = useState(() => new Animated.Value(value ? 1 : 0));
  const { accent } = usePrefs();
  const a = accentOf(accent);

  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      useNativeDriver: false, // color/width interpolation isn't supported by the native driver
      speed: 22,
      bounciness: 6,
    }).start();
  }, [value, anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [PADDING, TRACK_WIDTH - THUMB_SIZE - PADDING],
  });
  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(120,120,128,0.32)', a.tone],
  });

  return (
    <Pressable onPress={() => onValueChange(!value)} hitSlop={8}>
      <Animated.View
        style={{
          width: TRACK_WIDTH,
          height: TRACK_HEIGHT,
          borderRadius: TRACK_HEIGHT / 2,
          backgroundColor: trackColor,
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: THUMB_SIZE / 2,
            backgroundColor: '#ffffff',
            transform: [{ translateX }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.25,
            shadowRadius: 2,
            elevation: 2,
          }}
        />
      </Animated.View>
    </Pressable>
  );
}
