import { Apple, Coins, CreditCard, Smartphone, Wallet } from 'lucide-react-native';
import { BottomSheetModal } from './bottom-sheet-modal';
import { AppText as Text } from '@/components/ui/app-text';
import { View } from 'react-native';
import { CREATOR_SHARE_PERCENT, creatorShareCentsFor, useDonations } from '@/constants/donations-context';
import { formatEuro } from '@/services/repository';
import type { DonationMethod } from '@/services/types';

const METHOD_ICON: Record<DonationMethod, typeof CreditCard> = {
  coins: Coins,
  card: CreditCard,
  paypal: Wallet,
  apple: Apple,
  google: Smartphone,
};

const METHOD_LABEL: Record<DonationMethod, string> = {
  coins: 'Coins',
  card: 'Karte',
  paypal: 'PayPal',
  apple: 'Apple Pay',
  google: 'Google Pay',
};

/** Small payment-method icon for the history rows. */
function MethodIcon({ method }: { method: DonationMethod }) {
  const Icon = METHOD_ICON[method];
  return <Icon size={11} color="#a1a1aa" />;
}

/** Overview of every donation made - the replacement for the old coin
 *  wallet. There is nothing to top up: money goes out only, and only through
 *  the payments seam (demo: simulated). */
export function DonationsModal({
  visible,
  onClose,
  onBack,
}: {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void;
}) {
  const { donations, totalDonatedCents } = useDonations();
  const creatorTotal = donations.reduce(
    (sum, d) => sum + (d.creatorShareCents ?? creatorShareCentsFor(d.amountCents)),
    0,
  );

  return (
    <BottomSheetModal visible={visible} onClose={onClose} onBack={onBack} title="Spenden">

          <View className="mb-5 items-center rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 p-5">
            <Text className="text-3xl font-bold text-white">{formatEuro(totalDonatedCents)}</Text>
            <Text className="mt-1 text-xs font-medium text-white/90">gespendet insgesamt</Text>
            <Text className="mt-2 text-[10px] font-semibold text-white/80">
              davon an Creator: {formatEuro(creatorTotal)} ({CREATOR_SHARE_PERCENT} %)
            </Text>
          </View>
            {donations.length === 0 ? (
              <View className="items-center rounded-2xl bg-neutral-100 px-6 py-8 dark:bg-neutral-800">
                <Text className="text-3xl">🪙</Text>
                <Text className="mt-3 text-sm font-semibold text-neutral-900 dark:text-white">
                  Noch keine Spenden
                </Text>
                <Text className="mt-1 text-center text-xs leading-5 text-neutral-500 dark:text-neutral-400">
                  Öffne einen Stream oder eine Veranstaltung auf der Karte und schick Coins –
                  ab der ersten Spende bekommst du das 🪙-Supporter-Abzeichen.
                </Text>
              </View>
            ) : (
              <View className="rounded-2xl bg-neutral-100 p-2 dark:bg-neutral-800">
                {donations.map((donation) => (
                  <View
                    key={donation.id}
                    className="flex-row items-center justify-between border-b border-black/5 px-2 py-2.5 last:border-b-0 dark:border-white/10"
                  >
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-neutral-900 dark:text-white">
                        🪙 {donation.coins ? `${donation.coins} Coins` : formatEuro(donation.amountCents)} an {donation.targetName}
                      </Text>
                      <View className="flex-row items-center gap-1">
                        <MethodIcon method={donation.method} />
                        <Text className="text-[10px] text-neutral-400 dark:text-neutral-500">
                          {METHOD_LABEL[donation.method]} •{' '}
                          {new Date(donation.at).toLocaleString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {donation.coins ? `${donation.coins} 🪙` : formatEuro(donation.amountCents)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          
    </BottomSheetModal>
  );
}
