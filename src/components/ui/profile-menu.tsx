import { AppText as Text } from '@/components/ui/app-text';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { Activity, Bookmark, Coins, Flame, Gem, LogOut, Settings, Smile, Trophy, User, Users, type LucideIcon } from '@/components/ui/icons';
import { Pressable, View } from 'react-native';
import { useAuth } from '@/constants/auth-context';
import { useDonations } from '@/constants/donations-context';
import { MOCK_USER } from '@/constants/mock-data';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';
import { useSocial } from '@/constants/social-context';
import { formatEuro, repo } from '@/services/repository';
import { BottomSheetModal } from './bottom-sheet-modal';
import { Avatar } from './avatar';
import { CountUp } from './count-up';
import { PrimaryButton } from './primary-button';
import { ProgressRing } from './progress-ring';

interface Badge {
  emoji: string;
  label: string;
}

/**
 * Profile-strength meter. A fresh profile starts at 10% - enough that the bar
 * never opens at zero (goal-gradient), small enough that the ten steps below
 * are clearly the work: almost the whole meter is still to be earned.
 *
 * The ten steps share the remaining 90%, so the meter lands on exactly 100%
 * when everything is done. Every step is checked against real state - an
 * account that exists, an email that was actually verified, follows/saves/
 * donations/messages that actually happened. Nothing here can be satisfied by
 * simply looking at the screen, which is the difference between a progress
 * meter and a fake one.
 */
interface Step {
  label: string;
  weight: number;
  done: boolean;
}

/** Head-start share of the meter, before any step is done. */
const BASELINE = 10;

export function ProfileMenu({
  visible,
  onClose,
  isLoggedIn,
  userName,
  savedCount,
  streakCount,
  onOpenSavedSpots,
  onOpenActivity,
  onOpenLeaderboard,
  onOpenSettings,
  onOpenDonations,
  onOpenFriends,
  onOpenSubscription,
  onOpenLogin,
  onOpenAvatarCreator,
  onLogout,
}: {
  visible: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  userName?: string;
  savedCount: number;
  /** Real per-day visit streak from the repository. */
  streakCount: number;
  onOpenSavedSpots: () => void;
  onOpenActivity: () => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
  onOpenDonations: () => void;
  onOpenFriends: () => void;
  onOpenSubscription: () => void;
  onOpenLogin: () => void;
  onOpenAvatarCreator: () => void;
  onLogout: () => void;
}) {
  const { donations, totalDonatedCents, totalDonatedCoins } = useDonations();
  const { following, subscribed, messages } = useSocial();
  const { status, avatarUrl, avatarColor, avatarEmoji, avatarFrame } = useAuth();
  const { accent } = usePrefs();
  const a = accentOf(accent);

  const hasSentMessage = Object.values(messages).some((thread) => thread.some((m) => m.from === 'me'));
  const hasCustomAvatar = Boolean(avatarUrl || avatarEmoji);
  // Weights sum to 90 - together with the 10% baseline that's exactly 100%.
  //
  // Ten steps, not six, and the order is the order they get harder: an account
  // is one form, the last step is 500 coins given away. Every one is checked
  // against real persisted state, so nothing here can be satisfied by looking
  // at the screen. The final step is deliberately the app's whole point -
  // supporting somebody - rather than another profile field.
  const steps: Step[] = [
    { label: 'Konto erstellen', weight: 9, done: status !== 'guest' },
    { label: 'E-Mail bestätigen', weight: 9, done: status === 'verified' },
    { label: 'Avatar gestalten', weight: 8, done: hasCustomAvatar },
    { label: '5 Creatorn folgen', weight: 9, done: following.length >= 5 },
    { label: '3 Orte speichern', weight: 9, done: savedCount >= 3 },
    { label: 'Erste Chat-Nachricht', weight: 8, done: hasSentMessage },
    { label: '7 Tage am Stück da', weight: 9, done: streakCount >= 7 },
    { label: 'Rahmen freischalten', weight: 9, done: Boolean(avatarFrame) },
    { label: 'Erste Coins senden', weight: 9, done: totalDonatedCoins > 0 },
    // Heaviest step on purpose: the last one is also the biggest jump.
    { label: '500 Coins gespendet', weight: 11, done: totalDonatedCoins >= 500 },
  ];
  const strength = BASELINE + steps.reduce((sum, s) => (s.done ? sum + s.weight : sum), 0);
  const nextStep = steps.find((s) => !s.done);

  const badges: Badge[] = [];
  if (repo.isUnlocked('badge:streak-7')) badges.push({ emoji: '🔥', label: 'Feueranzünder' });
  if (repo.isUnlocked('badge:streak-30')) badges.push({ emoji: '⚡', label: 'Unaufhaltsam' });
  if (repo.isUnlocked('badge:streak-100')) badges.push({ emoji: '👑', label: 'OnSpot-Legende' });
  if (donations.length >= 1) badges.push({ emoji: '🪙', label: 'Supporter' });
  if (following.length >= 5) badges.push({ emoji: '👥', label: 'Netzwerker' });
  if (subscribed) badges.push({ emoji: '💎', label: 'Plus' });

  return (
    // Same sheet as every other panel: it slides up from the bottom, slides
    // back down on close and can be swiped away. It used to cross-fade in
    // place, which made the jump to Settings feel like two unrelated screens.
    <BottomSheetModal visible={visible} onClose={onClose} title="Profil">
          <View className="mb-3 flex-row items-center gap-3 px-2">
            {avatarFrame ? (
              <Avatar
                name={userName || MOCK_USER.name}
                avatarUrl={avatarUrl}
                color={avatarColor}
                emoji={avatarEmoji}
                size={56}
                frame={avatarFrame}
              />
            ) : (
            <LinearGradient
              colors={[a.from, a.to]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 999, padding: 2 }}
            >
              <Avatar
                name={userName || MOCK_USER.name}
                avatarUrl={avatarUrl}
                color={avatarColor}
                emoji={avatarEmoji}
                size={56}
              />
            </LinearGradient>
            )}
            <View className="flex-1">
              <Text className="text-base font-bold text-neutral-900 dark:text-white">
                {isLoggedIn ? userName || MOCK_USER.name : 'Gast'}
              </Text>
              {badges.length > 0 && (
                <View className="mt-1.5 flex-row flex-wrap gap-1">
                  {badges.map((badge) => (
                    <View key={badge.label} className="rounded-full bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
                      <Text className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-300">
                        {badge.emoji} {badge.label}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Bento: profile strength and the live numbers in one glance. Same
              data the menu always showed - the strength ring, the six steps,
              streak, saves and donations - just laid out as tiles. */}
          <View className="mb-3 flex-row gap-2 px-1">
            <View className="flex-1 rounded-2xl bg-neutral-100 p-3.5 dark:bg-neutral-800">
              <ProgressRing progress={strength / 100} size={64}>
                <Text className="text-base font-bold text-neutral-900 dark:text-white">{strength}%</Text>
              </ProgressRing>
              <Text className="mt-2 text-sm font-bold text-neutral-900 dark:text-white">Profil-Stärke</Text>
              <View className="mt-1.5 flex-row flex-wrap gap-1">
                {steps.map((s) => (
                  <View
                    key={s.label}
                    className={
                      s.done
                        ? 'h-2 w-2 rounded-full'
                        : s.label === nextStep?.label
                          ? 'h-2 w-2 rounded-full border-2'
                          : 'h-2 w-2 rounded-full bg-neutral-300 dark:bg-neutral-600'
                    }
                    style={
                      s.done
                        ? { backgroundColor: a.tone }
                        : s.label === nextStep?.label
                          ? { borderColor: a.tone }
                          : undefined
                    }
                  />
                ))}
              </View>
              {nextStep ? (
                <>
                  <Text className="mt-1.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                    Nächster: {nextStep.label}
                  </Text>
                  {/* The end goal stays visible from the very first percent, so
                      the meter is a route to something and not just a bar. */}
                  <Text className="mt-0.5 text-[10px] font-semibold text-amber-500">
                    Ziel: {Math.min(totalDonatedCoins, 500)}/500 Coins gespendet
                  </Text>
                </>
              ) : (
                <Text className="mt-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Profil komplett 🎉
                </Text>
              )}
            </View>
            <View className="flex-1 gap-2">
              <View className="flex-row gap-2">
                <View className="flex-1 items-center rounded-2xl bg-neutral-100 p-3 dark:bg-neutral-800">
                  <Text className="text-2xl font-black text-amber-500 dark:text-amber-400">{streakCount}</Text>
                  <View className="mt-0.5 flex-row items-center gap-1">
                    <Flame size={10} color="#f97316" />
                    <Text className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">Streak</Text>
                  </View>
                </View>
                <View className="flex-1 items-center rounded-2xl bg-neutral-100 p-3 dark:bg-neutral-800">
                  <Text className="text-2xl font-black" style={{ color: a.tone }}>{savedCount}</Text>
                  <View className="mt-0.5 flex-row items-center gap-1">
                    <Bookmark size={10} color={a.tone} />
                    <Text className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">Gespeichert</Text>
                  </View>
                </View>
              </View>
              <View className="flex-1 flex-row items-center gap-2.5 rounded-2xl bg-neutral-100 px-4 dark:bg-neutral-800">
                <Text className="text-xl">🪙</Text>
                <View>
                  <Text className="text-xl font-black text-amber-500 dark:text-amber-400">
                    <CountUp
                      value={totalDonatedCents}
                      duration={800}
                      format={(cents) => formatEuro(Math.round(cents))}
                    />
                  </Text>
                  <Text className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">gespendet</Text>
                </View>
              </View>
            </View>
          </View>

          {!isLoggedIn && (
            <PrimaryButton
              label="Anmelden / Registrieren"
              onPress={onOpenLogin}
              icon={User}
              className="mb-2"
            />
          )}

          {/* Right after the login CTA, not buried sixth - it's the one row
              here that changes what the product does. */}
          <MenuRow icon={Gem} label={subscribed ? 'OnSpot Plus ✓' : 'OnSpot Plus - 4,99€/Monat'} onPress={onOpenSubscription} highlight />
          <MenuRow icon={Smile} label="Avatar erstellen" onPress={onOpenAvatarCreator} />
          <MenuRow icon={Activity} label="Aktivitäten" onPress={onOpenActivity} />
          <MenuRow icon={Trophy} label="Top-Spender" onPress={onOpenLeaderboard} />
          <MenuRow icon={Settings} label="Einstellungen" onPress={onOpenSettings} />
          <MenuRow icon={Coins} label="Meine Spenden" onPress={onOpenDonations} />
          <MenuRow icon={Users} label={`Freunde (${following.length})`} onPress={onOpenFriends} />
          <MenuRow icon={Bookmark} label={`Gespeicherte Orte (${savedCount})`} onPress={onOpenSavedSpots} />

          {isLoggedIn && <MenuRow icon={LogOut} label="Abmelden" onPress={onLogout} destructive />}
    </BottomSheetModal>
  );
}

function MenuRow({
  icon: Icon,
  label,
  onPress,
  destructive,
  highlight,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  /** Brand-tinted row (e.g. the Plus upsell). */
  highlight?: boolean;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme !== 'light';
  const { accent } = usePrefs();
  const a = accentOf(accent);
  const iconColor = destructive ? '#ef4444' : highlight ? a.tone : isDark ? '#a78bfa' : '#7c3aed';
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-2xl px-4 py-3.5 active:bg-neutral-100 dark:active:bg-neutral-800${
        highlight ? '' : ''
      }`}
      style={highlight ? { backgroundColor: `${a.tone}1a` } : undefined}
    >
      <Icon size={18} color={iconColor} />
      <Text className={destructive ? 'text-sm font-semibold text-red-500' : 'text-sm font-semibold text-neutral-800 dark:text-neutral-200'}>
        {label}
      </Text>
    </Pressable>
  );
}
