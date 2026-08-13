import { Flame } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { View } from 'react-native';
import { AppText as Text } from '@/components/ui/app-text';

/**
 * Day-streak pill. The number is the real per-calendar-day visit count from the
 * repository - it is never padded, and the chip simply disappears below 1
 * rather than showing a hollow "0 Tage".
 */
export function StreakChip({ count }: { count: number }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme !== 'light';

  if (count < 1) return null;

  // Same opaque backing as the coin chip next to it: a 15% tint over satellite
  // imagery is not a background, it is a suggestion, and the two pills have to
  // read as one set.
  return (
    <View
      className="flex-row items-center gap-1 rounded-full px-2.5 py-1.5"
      style={{
        backgroundColor: isDark ? 'rgba(28,28,34,0.92)' : 'rgba(255,255,255,0.94)',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(249,115,22,0.45)' : 'rgba(234,88,12,0.3)',
        boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <Flame size={13} color={isDark ? '#fb923c' : '#ea580c'} />
      <Text className="text-xs font-bold" style={{ color: isDark ? '#fb923c' : '#c2410c' }}>
        {count}
      </Text>
    </View>
  );
}
