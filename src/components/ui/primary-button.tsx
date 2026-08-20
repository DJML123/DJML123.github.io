import { useState } from 'react';
import { Animated, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from '@/components/ui/icons';
import { AppText as Text } from '@/components/ui/app-text';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';

/**
 * The app's primary call-to-action: violet→fuchsia gradient with a violet glow
 * and a bouncy press scale. One component everywhere means every screen reads
 * as the same product family as the onboarding - flat violet pills were the
 * biggest tell that a screen predated the design pass.
 */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  icon: Icon,
  className,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: LucideIcon;
  /** Width/flex adjustments (e.g. `flex-1`), padding is standardised here. */
  className?: string;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const { accent } = usePrefs();
  const a = accentOf(accent);

  const animate = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => animate(0.95)}
      onPressOut={() => animate(1)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      className={className}
    >
      <Animated.View style={{ transform: [{ scale }], width: '100%' }}>
        <LinearGradient
          colors={[a.from, a.to]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          // className is dropped on expo-linear-gradient in web builds, so all
          // layout/shadow/opacity values live in style.
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderRadius: 9999,
            paddingVertical: 14,
            paddingHorizontal: 24,
            boxShadow: `0 10px 15px -3px ${a.glow}`,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {Icon && <Icon size={16} color="#ffffff" />}
          <Text className="text-sm font-bold text-white">{label}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}
