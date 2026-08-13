import { Flame, Gem, Rocket, ShieldOff, Sparkles, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';
import { BottomSheetModal } from './bottom-sheet-modal';
import { AppText as Text } from '@/components/ui/app-text';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSocial } from '@/constants/social-context';
import { PrimaryButton } from './primary-button';

/**
 * What Plus actually does, not just what free lacks. Each line is something
 * that visibly happens elsewhere in the app rather than an abstract promise -
 * the 💎 badge really is the one `profile-menu.tsx` adds once `subscribed` is
 * true, not a made-up perk that only exists on this screen.
 */
const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Gem,
    title: 'Plus-Abzeichen',
    description: 'Lila Diamant neben deinem Namen im Profil - sichtbar für jeden, der dich sieht.',
  },
  {
    icon: Sparkles,
    title: 'Supporter-Status',
    description: 'Creator sehen sofort, dass du das Projekt unterstützt, sobald du spendest.',
  },
  {
    icon: ShieldOff,
    title: 'Werbefrei',
    description: 'Dein Feed bleibt dauerhaft ohne gesponserte Inhalte, auch wenn wir später welche einführen.',
  },
  {
    icon: Rocket,
    title: 'Früher Zugriff',
    description: 'Neue Features zuerst, bevor sie für alle live gehen.',
  },
];

/** "6 Tage 04:12:33" from a raw remainder. */
function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const clock = `${pad(h)}:${pad(m)}:${pad(s)}`;
  if (days > 0) return `${days} ${days === 1 ? 'Tag' : 'Tage'} ${clock}`;
  return clock;
}

/**
 * Demo checkout only - no payment processor is wired up (no Stripe/App Store/
 * Play Billing), so this cannot and does not charge real money. Subscribing and
 * starting the trial only flip local state, same as every other mock toggle.
 */
export function SubscriptionModal({
  visible,
  onClose,
  onBack,
}: {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void;
}) {
  const { subscribed, setSubscribed } = useSocial();
  const { trialEndsAt, startTrial, accent } = usePrefs();
  const a = accentOf(accent);
  const [now, setNow] = useState(() => Date.now());

  // Ticks only while the sheet is open - a timer behind a closed modal would
  // re-render the tree once a second for nothing.
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [visible]);

  // `trialActive` is the running countdown; `trialUsed` covers the expired
  // trial too, so an ended trial never re-offers the trial button (there is no
  // second trial) - it only leaves the loss-framing: upgrade or risk it.
  const trialActive = trialEndsAt != null && trialEndsAt > now;
  const trialUsed = trialEndsAt != null;

  return (
    <BottomSheetModal visible={visible} onClose={onClose} onBack={onBack} title="OnSpot Plus">

          <View className="relative items-center overflow-hidden rounded-2xl p-5" style={{ boxShadow: `0 10px 25px -5px ${a.glow}` }}>
            <LinearGradient
              colors={[a.from, a.to]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text className="text-3xl font-bold text-white">4,99 €</Text>
            <Text className="text-xs font-medium text-white/80">pro Monat, jederzeit kündbar</Text>
            <View className="mt-2 rounded-full bg-white/15 px-3 py-1">
              <Text className="text-[11px] font-semibold text-white">das sind 13 Cent am Tag</Text>
            </View>
          </View>

          {/* Countdown is the real persisted remainder of the trial window, so
              it keeps counting correctly across reloads and never turns into a
              manufactured "ends today". */}
          {trialActive && (
            <View className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl bg-amber-500/15 px-4 py-3">
              <Flame size={15} color="#f97316" />
              <Text className="text-sm font-bold text-amber-600 dark:text-amber-400">
                Testmodus – noch {formatRemaining(trialEndsAt! - now)}
              </Text>
            </View>
          )}

          <Text className="mb-3 mt-5 text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {subscribed ? 'Aktiv auf deinem Konto' : 'Was Plus tut'}
          </Text>
          <View className="gap-3">
            {FEATURES.map((f) => (
              <View key={f.title} className="flex-row items-start gap-3">
                <View
                  className="mt-0.5 h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: subscribed ? 'rgba(16,185,129,0.15)' : `${a.tone}1f` }}
                >
                  <f.icon size={15} color={subscribed ? '#10b981' : a.tone} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-neutral-900 dark:text-white">{f.title}</Text>
                  <Text className="mt-0.5 text-xs leading-4 text-neutral-500 dark:text-neutral-400">
                    {f.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {subscribed ? (
            <Pressable
              onPress={() => setSubscribed(false)}
              className="mt-6 items-center rounded-full border border-black/10 py-3.5 dark:border-white/20"
            >
              <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">Abo kündigen</Text>
            </Pressable>
          ) : trialActive || trialUsed ? (
            <>
              <PrimaryButton
                label="Jetzt Plus holen – 4,99 €/Monat"
                onPress={() => setSubscribed(true)}
                className="mt-6"
              />
              <Pressable onPress={onClose} className="mt-2 items-center py-2">
                <Text className="text-sm text-neutral-500 dark:text-neutral-400">Ich riskiere es</Text>
              </Pressable>
              <Text className="mt-1 text-center text-[11px] text-neutral-400 dark:text-neutral-500">
                {trialActive
                  ? 'Test endet automatisch – keine Zahlung, keine Kündigung nötig.'
                  : 'Dein Test ist beendet – ohne Plus bleiben dir diese Punkte vorenthalten.'}
              </Text>
            </>
          ) : (
            <>
              {/* Value first, payment later: the trial hands over the whole
                  product before asking for anything (reciprocity). */}
              <PrimaryButton
                label="7 Tage kostenlos testen"
                onPress={() => {
                  startTrial();
                  onClose();
                }}
                className="mt-6"
              />
              <Pressable
                onPress={() => setSubscribed(true)}
                className="mt-2 items-center rounded-full border border-black/10 py-3 dark:border-white/20"
              >
                <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                  Gleich Plus holen – 4,99 €/Monat
                </Text>
              </Pressable>
              {/* Naming the choice instead of offering a neutral "maybe later"
                  makes declining a decision rather than a reflex. */}
              <Pressable onPress={onClose} className="mt-1 items-center py-2">
                <Text className="text-sm text-neutral-500 dark:text-neutral-400">Ich bleibe bei Werbung</Text>
              </Pressable>
            </>
          )}
    </BottomSheetModal>
  );
}
