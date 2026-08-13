import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { AppText as Text } from '@/components/ui/app-text';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';

/**
 * Segmented step indicator in the style paid fitness apps use for their signup
 * funnels: an oversized current-step numeral, the total set small beside it,
 * and one bar per step rather than a single continuous track. Discrete bars
 * make the remaining work countable at a glance - a smooth bar only ever says
 * "somewhere in the middle".
 */
export function StepProgress({
  step,
  total,
  filled,
  label,
}: {
  /** 1-based, for the numeral only. */
  step: number;
  total: number;
  /** Bars to fill. Deliberately separate from `step`: standing *on* step 1
   *  means nothing is finished yet, so the track is empty while the numeral
   *  already reads 01. */
  filled: number;
  label?: string;
}) {
  const { accent } = usePrefs();
  const a = accentOf(accent);
  return (
    <View className="w-full">
      <View className="mb-3 flex-row items-end justify-between">
        <View className="flex-row items-baseline gap-1">
          <Text className="text-3xl font-black leading-none text-white">
            {String(step).padStart(2, '0')}
          </Text>
          <Text className="text-sm font-bold leading-none text-neutral-600">
            / {String(total).padStart(2, '0')}
          </Text>
        </View>
        {label && (
          <Text className="text-[10px] font-bold uppercase tracking-[2px]" style={{ color: a.tone }}>{label}</Text>
        )}
      </View>

      <View className="flex-row gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <Segment key={i} filled={i < filled} index={i} color={a.tone} />
        ))}
      </View>
    </View>
  );
}

function Segment({ filled, index, color }: { filled: boolean; index: number; color: string }) {
  const [anim] = useState(() => new Animated.Value(filled ? 1 : 0));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: filled ? 1 : 0,
      duration: 380,
      // Later segments fill slightly after earlier ones, so advancing a step
      // reads as a sweep instead of every bar snapping at once.
      delay: filled ? index * 45 : 0,
      useNativeDriver: false,
    }).start();
  }, [filled, index, anim]);

  return (
    <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
      {/* Colour in `style`: NativeWind does not wire className through
          Animated.View, which would leave a correctly sized but invisible bar. */}
      <Animated.View
        style={{
          height: '100%',
          borderRadius: 999,
          backgroundColor: color,
          opacity: anim,
          transform: [{ scaleX: anim }],
          // Grow from the left edge rather than from the centre.
          transformOrigin: 'left',
        }}
      />
    </View>
  );
}
