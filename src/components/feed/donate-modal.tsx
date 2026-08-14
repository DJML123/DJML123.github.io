import { useEffect, useState } from 'react';
import { DialogIn } from '../ui/sheet-in';
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/app-text';
import { Modal, Pressable, View } from 'react-native';
import { COINS_PER_EURO, CREATOR_SHARE_PERCENT, creatorShareCentsFor, useDonations } from '@/constants/donations-context';
import { useCoins } from '@/constants/coins-context';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';
import { haptics } from '@/services/haptics';
import { formatEuro } from '@/services/repository';
import { ConfettiBurst } from '../ui/confetti';

/** Tip sizes in coins. 500 is still the profile ladder's last step, but tips
 *  are not capped there: the top step reaches 5000 (50 €) so a generous donor
 *  can give more than one goal at once. The profile's "ultimate goal" counts
 *  the same total. */
const AMOUNTS = [100, 250, 500, 1000, 2500, 5000];

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
  const [custom, setCustom] = useState('');
  const [sent, setSent] = useState<number | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);

  // A typed amount overrides the preset selection as soon as it is a valid
  // coin count; empty or "0" falls back to the selected preset.
  const customCoins = parseInt(custom, 10);
  const customValid = custom.length > 0 && Number.isInteger(customCoins) && customCoins >= 1;
  const effective = customValid ? customCoins : amount;
  const short = Math.max(0, effective - balance);
  const canSend = short === 0;

  // Reset the success state on close, so it doesn't resurface on the next open.
  const handleClose = () => {
    setSent(null);
    setCustom('');
    onClose();
  };

  const send = () => {
    if (!canSend || !donateCoins(effective, authorName)) {
      haptics.error();
      return;
    }
    setSent(effective);
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

  const euroCents = Math.round((effective / COINS_PER_EURO) * 100);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleClose} accessibilityViewIsModal>
      <Pressable
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel="Spenden-Dialog schließen"
        className="flex-1 items-center justify-center bg-black/60 px-8"
      >
        {/* Decorative; the success message is announced separately. */}
        <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <ConfettiBurst burstKey={confettiKey} />
        </View>
        <DialogIn visible={visible}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white p-6 dark:bg-[#141419]"
          >
            {sent ? (
              <View className="items-center py-6" accessibilityLiveRegion="polite">
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

                <View
                  className="mb-3 flex-row flex-wrap gap-2"
                  accessibilityRole="radiogroup"
                  accessibilityLabel="Spendenbetrag wählen"
                >
                  {AMOUNTS.map((value) => {
                    const active = !customValid && effective === value;
                    return (
                      <Pressable
                        key={value}
                        onPress={() => {
                          setAmount(value);
                          setCustom('');
                          haptics.light();
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${value} Coins`}
                        className="items-center rounded-2xl py-3 active:opacity-80"
                        style={[
                          { width: '31%' },
                          active
                            ? { backgroundColor: a.tone, boxShadow: `0 6px 18px ${a.glow}` }
                            : { backgroundColor: 'rgba(120,120,130,0.14)' },
                        ]}
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

                <View className="mb-5">
                  <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-[1.2px] text-neutral-400 dark:text-neutral-500">
                    Eigener Betrag
                  </Text>
                  <TextInput
                    value={custom}
                    onChangeText={(t) => setCustom(t.replace(/\D/g, '').slice(0, 7))}
                    keyboardType="number-pad"
                    placeholder="z. B. 1000"
                    accessibilityLabel="Eigener Betrag in Coins"
                    accessibilityHint="Zahl eingeben, die du senden möchtest – bis zu deinem Guthaben"
                    className="w-full rounded-2xl bg-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-900 dark:bg-neutral-800 dark:text-white"
                    style={customValid ? { borderWidth: 1.5, borderColor: a.tone } : undefined}
                  />
                </View>

                <Pressable
                  onPress={send}
                  disabled={!canSend}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canSend }}
                  accessibilityLabel={`${effective} Coins senden`}
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
                    {short > 0 ? `${short} Coins fehlen` : `${effective} Coins senden`}
                  </Text>
                </Pressable>

                <Text className="mt-3 text-center text-[10px] text-neutral-400 dark:text-neutral-500">
                  Entspricht {formatEuro(euroCents)} · {authorName} erhält{' '}
                  {formatEuro(creatorShareCentsFor(euroCents))} ({CREATOR_SHARE_PERCENT} %)
                </Text>
              </>
            )}
          </Pressable>
        </DialogIn>
      </Pressable>
    </Modal>
  );
}
