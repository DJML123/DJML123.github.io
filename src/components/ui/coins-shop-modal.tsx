import { Gift, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Share, TextInput, View } from 'react-native';import { AppText as Text } from '@/components/ui/app-text';
import { useCoins } from '@/constants/coins-context';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';
import { haptics } from '@/services/haptics';
import { formatEuro } from '@/services/repository';
import { BottomSheetModal } from './bottom-sheet-modal';
import { PrimaryButton } from './primary-button';

/** Coin shop: buy packs, redeem an invite code, see how to earn more. */
export function CoinsShopModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { accent } = usePrefs();
  const a = accentOf(accent);
  const { balance, packs, referralCode, processing, buyPack, redeem } = useCoins();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState<string | null>(null);

  const shareCode = () => {
    haptics.light();
    void Share.share({
      message: `Lade OnSpot herunter und hol dir 100 Coins: ${referralCode}`,
    }).catch(() => {});
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} title="Coins">
      <View className="mb-4 flex-row items-center justify-between rounded-2xl px-4 py-3" style={{ backgroundColor: `${a.tone}14` }}>
        <View>
          <Text className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Dein Guthaben</Text>
          <Text className="text-2xl font-black" style={{ color: a.tone }}>
            {balance} 🪙
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Coins bekommst du</Text>
          <Text className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Im Kauf oder per Einladung
          </Text>
        </View>
      </View>

      <Text className="mb-2 text-sm font-bold text-neutral-900 dark:text-white">Coins kaufen</Text>
      <View className="mb-4 gap-2">
        {packs.map((pack) => (
          <View
            key={pack.id}
            className="flex-row items-center gap-3 rounded-2xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800"
          >
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-sm font-bold text-neutral-900 dark:text-white">{pack.name}</Text>
                {pack.badge && (
                  <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${a.tone}22` }}>
                    <Text className="text-[9px] font-bold" style={{ color: a.tone }}>
                      {pack.badge}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="mt-0.5 text-[11px] leading-4 text-neutral-500 dark:text-neutral-400">{pack.tagline}</Text>
              <Text className="mt-1 text-xs font-bold text-amber-500">{pack.coins} Coins</Text>
            </View>
            <Pressable
              onPress={() => void buyPack(pack.id)}
              disabled={processing}
              className="rounded-full px-4 py-2.5 active:opacity-70"
              style={{ backgroundColor: a.tone, boxShadow: `0 4px 10px -2px ${a.glow}` }}
            >
              <Text className="text-xs font-bold text-white">
                {processing ? '…' : formatEuro(pack.priceCents)}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>

      <Text className="mb-2 text-sm font-bold text-neutral-900 dark:text-white">Freunde einladen</Text>
      <View className="mb-2 flex-row items-center gap-2">
        <View className="flex-1 rounded-2xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
          <Text className="text-sm font-bold tracking-widest text-neutral-900 dark:text-white">{referralCode}</Text>
        </View>
        <Pressable
          onPress={shareCode}
          className="h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${a.tone}1a` }}
        >
          <Share2 size={17} color={a.tone} />
        </Pressable>
      </View>
      <Text className="mb-3 text-[11px] leading-4 text-neutral-500 dark:text-neutral-400">
        5 Freunde mit deinem Code einladen = 500 Coins. Jeder Code nur einmal.
      </Text>

      <Text className="mb-2 text-sm font-bold text-neutral-900 dark:text-white">Code einlösen</Text>
      <TextInput
        placeholder="z. B. ONS-A1B2C3"
        placeholderTextColor="#9ca3af"
        value={code}
        onChangeText={(v) => {
          setCode(v);
          setMessage(null);
        }}
        autoCapitalize="characters"
        className="mb-2 rounded-2xl bg-neutral-100 px-4 py-3 text-neutral-900 dark:bg-neutral-800 dark:text-white"
      />
      {message && (
        <Text className="mb-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">{message}</Text>
      )}
      {redeemed && (
        <View className="mb-2 flex-row items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
          <Gift size={15} color={a.tone} />
          <Text className="flex-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            Eingelöst: {redeemed}
          </Text>
          <Text className="text-xs font-bold text-amber-500">+100 🪙</Text>
        </View>
      )}
      <PrimaryButton
        label="Einlösen"
        onPress={() => {
          const result = redeem(code);
          setMessage(result.message);
          if (result.ok) setRedeemed(code.trim().toUpperCase());
          haptics.light();
        }}
        disabled={!code.trim()}
        className="mb-2"
      />

      <Text className="mb-2 text-sm font-bold text-neutral-900 dark:text-white">So bekommst du Coins</Text>
      <View className="flex-row gap-2">
        <View className="flex-1 items-center rounded-2xl bg-neutral-100 px-2 py-2.5 dark:bg-neutral-800">
          <Text className="text-lg font-black text-amber-500">+100</Text>
          <Text className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
            🎁 pro eingelöstem Code
          </Text>
        </View>
        <View className="flex-1 items-center rounded-2xl bg-neutral-100 px-2 py-2.5 dark:bg-neutral-800">
          <Text className="text-lg font-black text-amber-500">5×100</Text>
          <Text className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
            👥 wenn Freunde deinen Code nutzen
          </Text>
        </View>
      </View>
      <Text className="mt-2 text-center text-[10px] text-neutral-400 dark:text-neutral-500">
        Coins sind eine gekaufte Währung — sie gibt es nur im Shop oder einmalig pro eingelöstem Code.
      </Text>
      <View className="h-2" />
    </BottomSheetModal>
  );
}
