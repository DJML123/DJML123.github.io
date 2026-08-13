import { useMemo, useState } from 'react';
import { BottomSheetModal } from './bottom-sheet-modal';
import { AppText as Text } from '@/components/ui/app-text';
import { Medal } from 'lucide-react-native';
import { View } from 'react-native';
import { useDonations } from '@/constants/donations-context';
import { formatEuro } from '@/services/repository';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';

/** Weekly top-donor ranking: your real position from this week's donations,
 *  seeded opponents with fixed euro scores (a real backend would aggregate
 *  everyone's donations server-side). */
export function LeaderboardModal({
  visible,
  onClose,
  onBack,
}: {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void;
}) {
  const { donations } = useDonations();
  const { accent } = usePrefs();
  const a = accentOf(accent);
  const [weekAgo] = useState(() => Date.now() - 7 * 86400000);

  const rows = useMemo(() => {
    const myScore = donations.filter((d) => d.at >= weekAgo).reduce((sum, d) => sum + d.amountCents, 0);
    const opponents: { name: string; score: number }[] = [
      { name: 'LiveWithMax', score: 3400 },
      { name: 'ArcadeCrew', score: 2100 },
      { name: 'NightRiderTV', score: 1200 },
      { name: 'MauerparkEvents', score: 550 },
    ];
    const me = { name: 'Du', score: myScore };
    return [...opponents, me].sort((a, b) => b.score - a.score);
  }, [donations, weekAgo]);

  const rankMedal = (index: number) => {
    if (index === 0) return <Medal size={16} color="#f59e0b" fill="#f59e0b" />;
    if (index === 1) return <Medal size={16} color="#a1a1aa" fill="#a1a1aa" />;
    if (index === 2) return <Medal size={16} color="#b45309" fill="#b45309" />;
    return <Text className="w-4 text-sm font-bold">{index + 1}.</Text>;
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} onBack={onBack} title="Top-Spender">

          <View className="rounded-2xl bg-neutral-100 p-2 dark:bg-neutral-800">
            {rows.map((row, index) => {
              const isMe = row.name === 'Du';
              return (
                <View
                  key={row.name}
                  className={
                    isMe
                      ? 'flex-row items-center justify-between rounded-2xl px-3 py-3'
                      : 'flex-row items-center justify-between px-3 py-3'
                  }
                  style={isMe ? { backgroundColor: a.tone } : undefined}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-8 items-start">
                      <Text className={isMe ? 'text-sm font-bold text-white' : 'text-sm font-bold text-neutral-700 dark:text-neutral-300'}>
                        {rankMedal(index)}
                      </Text>
                    </View>
                    <Text className={isMe ? 'text-sm font-bold text-white' : 'text-sm font-semibold text-neutral-900 dark:text-white'}>
                      {row.name}
                    </Text>
                  </View>
                  <Text className={isMe ? 'text-sm font-bold text-white' : 'text-sm font-semibold text-amber-600 dark:text-amber-400'}>
                    {formatEuro(row.score)}
                  </Text>
                </View>
              );
            })}
          </View>
    </BottomSheetModal>
  );
}
