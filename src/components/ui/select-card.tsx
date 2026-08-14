import { useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from '@/components/ui/icons';
import { AppText as Text } from '@/components/ui/app-text';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';

/**
 * Selectable tile for the onboarding funnel. Unselected it is a quiet dark
 * card; selected it gains a violet border, a gradient wash and a check badge -
 * the same "this one is locked in" treatment paid fitness apps use on their
 * goal pickers, where the selection has to stay obvious while scrolling past a
 * dozen siblings.
 *
 * Two layouts, because two different shapes of choice use this card:
 *
 *  - `row` (default) puts emoji, text and the check on one line. Right for the
 *    full-width lists, where a headline plus a line of explanation needs the
 *    horizontal room.
 *  - `tile` stacks the emoji above a centred label and moves the check into the
 *    corner. Required for the two-column grid: measured on the live site, a
 *    47%-wide card at 375px leaves the label exactly 49px once the emoji, two
 *    gaps, the padding and the 22px check circle have taken their share - and
 *    React Native Web's default `overflow-wrap: break-word` then splits the
 *    word itself rather than overflowing, which is why the genre step read
 *    "Street/food", "Nightli/fe" and "Gamin/g". Stacking hands the label the
 *    card's full inner width (~122px), and nothing has to be truncated.
 */
export function SelectCard({
  emoji,
  label,
  sublabel,
  selected,
  onPress,
  className,
  layout = 'row',
}: {
  emoji?: string;
  label: string;
  sublabel?: string;
  selected: boolean;
  onPress: () => void;
  className?: string;
  layout?: 'row' | 'tile';
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const { accent } = usePrefs();
  const a = accentOf(accent);

  const animate = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 8 }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animate(0.96)}
      onPressOut={() => animate(1)}
      className={className}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View
          className="relative overflow-hidden rounded-2xl px-4 py-3.5"
          style={{
            borderWidth: 1.5,
            borderColor: selected ? a.tone : 'rgba(255,255,255,0.08)',
            backgroundColor: selected ? `${a.tone}1a` : '#15151b',
            boxShadow: selected ? `0 0 20px ${a.glow}` : 'none',
          }}
        >
          {layout === 'tile' ? (
            <View className="items-center py-1">
              {emoji && <Text className="text-[26px] leading-none">{emoji}</Text>}
              <Text
                // The label owns the full width here, so a long word wraps
                // between words instead of being split inside one.
                className={
                  selected
                    ? 'mt-2 text-center text-sm font-bold text-white'
                    : 'mt-2 text-center text-sm font-semibold text-neutral-300'
                }
              >
                {label}
              </Text>
              {sublabel && (
                <Text className="mt-0.5 text-center text-[11px] text-neutral-500">{sublabel}</Text>
              )}
              {/* Absolute, so the check never competes with the label for
                  width - the whole reason the row layout ran out of room. Held
                  a few pixels inside the corner because the card clips its
                  overflow against a 16px radius. */}
              {selected && (
                <LinearGradient
                  colors={[a.from, a.to]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    height: 18,
                    width: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 999,
                  }}
                >
                  <Check size={11} color="#ffffff" strokeWidth={3} />
                </LinearGradient>
              )}
            </View>
          ) : (
            <View className="flex-row items-center gap-3">
              {emoji && <Text className="text-2xl leading-none">{emoji}</Text>}
              <View className="flex-1">
                <Text
                  className={
                    selected
                      ? 'text-sm font-bold text-white'
                      : 'text-sm font-semibold text-neutral-300'
                  }
                >
                  {label}
                </Text>
                {sublabel && (
                  <Text className="mt-0.5 text-[11px] text-neutral-500">{sublabel}</Text>
                )}
              </View>

              {selected ? (
                <LinearGradient
                  colors={[a.from, a.to]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  // className is dropped on expo-linear-gradient in web builds.
                  style={{ height: 22, width: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 999 }}
                >
                  <Check size={13} color="#ffffff" strokeWidth={3} />
                </LinearGradient>
              ) : (
                <View className="h-[22px] w-[22px] rounded-full border-2 border-white/15" />
              )}
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}
