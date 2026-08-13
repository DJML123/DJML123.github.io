import { useEffect, useState } from 'react';
import { DialogIn } from '../ui/sheet-in';
import { AppText as Text } from '@/components/ui/app-text';
import { Modal, Pressable, View } from 'react-native';
import { COINS_PER_EURO, CREATOR_SHARE_PERCENT, creatorShareCentsFor, useDonations } from '@/constants/donations-context';
import { useCoins } from '@/constants/coins-context';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';
import { haptics } from '@/services/haptics';
import { formatEuro } from '@/services/repository';
import { ConfettiBurst } from '../ui/confetti';

/** Tip sizes in coins. 500 is the top step on purpose - it is the profile's
 *  final goal, so the biggest button here is the thing the profile asks for. */
const AMOUNTS = [100, 250, 500];

/**
 * Tip a creator, an event host or a party from the coin wallet.
 *
 * Coins - not euros - are what changes hands here: they are earned and bought
 * once, then spent across the app, so a tip costs a tap instead of a payment
 * flow. Nothing real is ever charged; the wallet is local demo state.
 */
export function DonateModal({
  visible,
  onClose,
  authorName,
}: {
  visible: boolean;
  onClose: () => void;
  authorName: string;
}) {
  const { donateCoins } = useDonations();
  const { balance } = useCoins();
  const { accent } = usePrefs();
  const a = accentOf(accent);
  const [amount, setAmount] = useState(AMOUNTS[1]);
  const [sent, setSent] = useState<number | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);

  // Reset the success state on close, so it doesn't resurface on the next open.
  const handleClose = () => {
    setSent(null);
    onClose();
  };

  const send = () => {
    if (!donateCoins(amount, authorName)) {
      haptics.error();
      return;
    }
    setSent(amount);
    setConfettiKey((k) => k + 1);
    haptics.success();
  };

  useEffect(() => {
    if (sent == null) return;
    const timer = setTimeout(handleClose, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sent]);

  // Unmount instead of only hiding. React Native Web gives every <Modal> its
  // own portal, appended to the document in *mount* order - so a modal that
  // stays mounted from app start sits underneath every sheet opened later,
  // which is exactly why sign-up appeared behind the panel that opened it.
  // Mounting on demand puts it last in the document, i.e. on top.
  if (!visible) return null;

  const short = Math.max(0, amount - balance);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable onPress={handleClose} className="flex-1 items-center justify-center bg-black/60 px-8">
        <ConfettiBurst burstKey={confettiKey} />
        <DialogIn visible={visible}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white p-6 dark:bg-[#141419]"
          >
            {sent ? (
              <View className="items-center py-6">
                <Text className="text-4xl">🪙</Text>
                <Text className="mt-3 text-base font-bold text-neutral-900 dark:text-white">
                  {sent} Coins gesendet!
                </Text>
                <Text className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">an {authorName}</Text>
              </View>
            ) : (
              <>
                <Text className="mb-1 text-center text-lg font-bold text-neutral-900 dark:text-white">
                  Coins senden
                </Text>
                <Text className="mb-5 text-center text-xs text-neutral-500 dark:text-neutral-400">
                  an {authorName}
                </Text>

                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-neutral-400 dark:text-neutral-500">
                    Betrag
                  </Text>
                  <View className="rounded-full bg-amber-500/15 px-2.5 py-1">
                    <Text className="text-[11px] font-bold text-amber-500">
                      🪙 {balance.toLocaleString('de-DE')}
                    </Text>
                  </View>
                </View>

                <View className="mb-5 flex-row gap-2">
                  {AMOUNTS.map((value) => {
                    const active = amount === value;
                    return (
                      <Pressable
                        key={value}
                        onPress={() => {
                          setAmount(value);
                          haptics.light();
                        }}
                        className="flex-1 items-center rounded-2xl py-3.5 active:opacity-80"
                        style={
                          active
                            ? { backgroundColor: a.tone, boxShadow: `0 6px 18px ${a.glow}` }
                            : { backgroundColor: 'rgba(120,120,130,0.14)' }
                        }
                      >
                        <Text
                          className="text-base font-black"
                          style={{ color: active ? '#ffffff' : undefined }}
                        >
                          {value}
                        </Text>
                        <Text
                          className="text-[10px] font-semibold"
                          style={{ color: active ? 'rgba(255,255,255,0.75)' : '#a3a3a3' }}
                        >
                          Coins
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  onPress={send}
                  disabled={short > 0}
                  className="items-center rounded-full py-3.5 active:opacity-80"
                  style={
                    short > 0
                      ? { backgroundColor: 'rgba(120,120,130,0.14)' }
                      : { backgroundColor: a.tone, boxShadow: `0 8px 22px ${a.glow}` }
                  }
                >
                  <Text
                    className="text-sm font-bold"
                    style={{ color: short > 0 ? '#a3a3a3' : '#ffffff' }}
                  >
                    {short > 0 ? `${short} Coins fehlen` : `${amount} Coins senden`}
                  </Text>
                </Pressable>

                <Text className="mt-3 text-center text-[10px] text-neutral-400 dark:text-neutral-500">
                  Entspricht {formatEuro(Math.round((amount / COINS_PER_EURO) * 100))} · {authorName} erhält{' '}
                  {formatEuro(creatorShareCentsFor(Math.round((amount / COINS_PER_EURO) * 100)))} ({CREATOR_SHARE_PERCENT} %)
                </Text>
              </>
            )}
          </Pressable>
        </DialogIn>
      </Pressable>
    </Modal>
  );
}
