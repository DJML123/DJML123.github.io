import { Coins } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { Pressable, View } from 'react-native';
import { AppText as Text } from '@/components/ui/app-text';
import { useCoins } from '@/constants/coins-context';

/**
 * Wallet pill: the live coin balance, tappable straight into the shop.
 * Always visible - a 0 is the honest starting point of the economy.
 *
 * The colour is fixed amber, not the user's accent. Two things were wrong
 * before: the fill was the accent at 10% alpha, which over aerial imagery is
 * effectively transparent (the reported "man sieht sie manchmal nicht
 * richtig"), and the accent is a user preference - on the pale accents the
 * label was accent-on-accent-tint, i.e. a colour on a wash of itself, which is
 * the worst contrast pairing there is. Coins are gold in every product that
 * has them, so the chip owns that colour outright and gets an opaque backing
 * to sit on.
 */
export function CoinChip({ onPress }: { onPress: () => void }) {
  const { balance } = useCoins();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme !== 'light';

  return (
    <Pressable onPress={onPress} hitSlop={6} className="active:opacity-70">
      {/* Opaque base under the tint: the chip floats over satellite imagery,
          which can be anything from white snow to near-black water, so it
          cannot borrow contrast from whatever is behind it. */}
      <View
        className="flex-row items-center gap-1 rounded-full px-2.5 py-1.5"
        style={{
          backgroundColor: isDark ? 'rgba(28,28,34,0.92)' : 'rgba(255,255,255,0.94)',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(245,158,11,0.45)' : 'rgba(217,119,6,0.3)',
          boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <Coins size={13} color={isDark ? '#fbbf24' : '#d97706'} />
        <Text
          className="text-xs font-bold"
          style={{ color: isDark ? '#fbbf24' : '#b45309' }}
        >
          {balance}
        </Text>
      </View>
    </Pressable>
  );
}
