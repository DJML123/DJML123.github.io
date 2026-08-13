import { useEffect, useState } from 'react';
import { useColorScheme } from 'nativewind';
import { AppText as Text } from '@/components/ui/app-text';
import { Animated, Pressable, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

/** A segmented control with a sliding pill indicator instead of just swapping background classes per option. */
export function AnimatedSegmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (key: T) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [anim] = useState(() => new Animated.Value(Math.max(0, options.findIndex((o) => o.key === value))));

  // Callers pass inline option arrays, so compare the keys instead of the array
  // identity - otherwise the spring restarts on every parent re-render.
  const optionsKey = options.map((o) => o.key).join('|');

  useEffect(() => {
    const index = Math.max(0, options.findIndex((o) => o.key === value));
    Animated.spring(anim, { toValue: index, useNativeDriver: false, speed: 18, bounciness: 7 }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, optionsKey, anim]);

  const segmentWidth = options.length > 0 ? trackWidth / options.length : 0;
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme !== 'light';

  return (
    <View
      className="flex-row rounded-full bg-neutral-200 p-1 dark:bg-neutral-700"
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      {trackWidth > 0 && (
        // Colour lives in `style`, not `className`: NativeWind does not wire
        // className through Animated.View, so the pill rendered fully
        // transparent - there was no visible "slider", only the bold/dim text
        // swap, which is why the control read as broken.
        <Animated.View
          style={{
            position: 'absolute',
            width: segmentWidth - 4,
            height: '100%',
            top: 0,
            left: 4,
            borderRadius: 999,
            backgroundColor: isDark ? '#171717' : '#ffffff',
            boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.15)',
            transform: [{ translateX: Animated.multiply(anim, segmentWidth) }],
          }}
        />
      )}
      {options.map((opt) => {
        const active = opt.key === value;
        const OptionIcon = opt.icon;
        return (
          <Pressable key={opt.key} onPress={() => onChange(opt.key)} className="flex-1 flex-row items-center justify-center gap-1 px-3 py-1.5">
            {OptionIcon && <OptionIcon size={12} color={active ? '#171717' : '#737373'} />}
            <Text
              className={
                active
                  ? 'text-xs font-bold text-neutral-900 dark:text-white'
                  : 'text-xs font-medium text-neutral-500 dark:text-neutral-400'
              }
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
