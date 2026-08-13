import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Compass, Heart, Radio, Users, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, View } from 'react-native';

import { AppText as Text } from '@/components/ui/app-text';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { ConfettiBurst } from '@/components/ui/confetti';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SelectCard } from '@/components/ui/select-card';
import { StepProgress } from '@/components/ui/step-progress';
import { Avatar } from '@/components/ui/avatar';
import { CREATORS, GENRES, recommendedCreators } from '@/constants/mock-data';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';
import { useSocial } from '@/constants/social-context';
import { haptics } from '@/services/haptics';

/** What the user wants out of the app. Local to the funnel - it only tailors
 *  the closing screen, so there is nothing to persist. */
const GOALS: { key: string; label: string; sublabel: string; icon: LucideIcon }[] = [
  { key: 'discover', label: 'Events entdecken', sublabel: 'Was heute in deiner Stadt läuft', icon: Compass },
  { key: 'support', label: 'Creator unterstützen', sublabel: 'Direkt spenden, ohne Umweg', icon: Heart },
  { key: 'golive', label: 'Selbst live gehen', sublabel: 'Deinen Moment übertragen', icon: Radio },
  { key: 'friends', label: 'Freunde treffen', sublabel: 'Sehen, wer gerade unterwegs ist', icon: Users },
];

const ALERTS: { key: string; label: string; sublabel: string }[] = [
  { key: 'live', label: 'Creator geht live', sublabel: 'Nur von Leuten, denen du folgst' },
  { key: 'nearby', label: 'Event in deiner Nähe', sublabel: 'Im Umkreis von 2 km' },
  { key: 'friends', label: 'Freunde starten Stream', sublabel: 'Sobald jemand aus deiner Liste sendet' },
];

/** Five input steps plus a closing screen. The counter deliberately shows the
 *  step you are *on*, so the first screen reads 0 % - nothing has been
 *  completed yet at that point. */
const STEPS = ['intro', 'genre', 'creators', 'goals', 'alerts', 'done'] as const;
type Step = (typeof STEPS)[number];
const INPUT_STEPS = STEPS.length - 1;

const STEP_LABEL: Record<Step, string> = {
  intro: 'Start',
  genre: 'Geschmack',
  creators: 'Für dich',
  goals: 'Dein Ziel',
  alerts: 'Alerts',
  done: 'Fertig',
};

/** `128400` -> `128K`, `1240` -> `1,2K`. */
function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (n >= 100_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')}K`;
  return String(n);
}

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const { setOnboardingDone, interests, toggleInterest } = usePrefs();
  const { isFollowing, toggleFollow } = useSocial();
  const [goals, setGoals] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<string[]>(() => ALERTS.map((a) => a.key));

  const fade = useState(() => new Animated.Value(0))[0];

  const step = STEPS[index];
  const isDone = step === 'done';
  // Steps completed so far - on the first screen that is zero, hence 0 %.
  const completed = isDone ? INPUT_STEPS : index;
  const percent = Math.round((completed / INPUT_STEPS) * 100);

  // Content fades and lifts on every step change.
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [index, fade]);

  const finish = () => {
    setOnboardingDone();
    haptics.success();
    router.replace('/');
  };

  const advance = () => {
    if (index < STEPS.length - 1) {
      setIndex((i) => i + 1);
      haptics.tap();
    } else {
      finish();
    }
  };

  const toggleGoal = (key: string) => {
    haptics.tap();
    setGoals((g) => (g.includes(key) ? g.filter((k) => k !== key) : [...g, key]));
  };

  const toggleAlert = (key: string) => {
    haptics.tap();
    setAlerts((a) => (a.includes(key) ? a.filter((k) => k !== key) : [...a, key]));
  };

  // The genre step is the one gate in the funnel: recommendations further down
  // are meaningless without at least one pick.
  const canAdvance = step !== 'genre' || interests.length > 0;
  const ctaLabel =
    step === 'genre' && interests.length === 0
      ? 'Wähle mindestens ein Genre'
      : isDone
        ? "Los geht's"
        : 'Weiter';

  return (
    <View className="flex-1 bg-[#08080c]">
      <AuroraBackground animated />
      {isDone && <ConfettiBurst burstKey={1} />}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="grow px-6 pb-4 pt-16"
      >
        <StepProgress
          step={isDone ? INPUT_STEPS : index + 1}
          total={INPUT_STEPS}
          filled={completed}
          label={`${STEP_LABEL[step]} · ${percent}%`}
        />

        {/* Animated.View carries only the transition - NativeWind ignores
            className on it, so all layout classes live on the plain View. */}
        <Animated.View
          style={{
            flex: 1,
            opacity: fade,
            transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
          }}
        >
          <View className="flex-1 pt-9">
            {step === 'intro' && <IntroStep />}
            {step === 'genre' && (
              <GenreStep selected={interests} onToggle={(k) => { haptics.tap(); toggleInterest(k); }} />
            )}
            {step === 'creators' && (
              <CreatorStep genres={interests} isFollowing={isFollowing} onToggle={toggleFollow} />
            )}
            {step === 'goals' && <GoalStep selected={goals} onToggle={toggleGoal} />}
            {step === 'alerts' && <AlertStep selected={alerts} onToggle={toggleAlert} />}
            {step === 'done' && <DoneStep genreCount={interests.length} goals={goals} alerts={alerts.length} />}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Sticky action bar - the CTA never scrolls out of reach. */}
      <View className="border-t border-white/5 px-6 pb-10 pt-4">
        <PrimaryButton label={ctaLabel} onPress={advance} disabled={!canAdvance} />
        {!isDone && (
          <Pressable onPress={finish} className="mt-3 items-center py-2">
            <Text className="text-xs font-semibold uppercase tracking-widest text-neutral-600">
              Überspringen
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Shared heading block: small accent eyebrow, heavy uppercase headline, quiet
 *  supporting line. */
function Heading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  const { accent } = usePrefs();
  const a = accentOf(accent);
  return (
    <View className="mb-7">
      <Text className="mb-2 text-[10px] font-bold uppercase tracking-[3px]" style={{ color: a.tone }}>{eyebrow}</Text>
      <Text className="text-[28px] font-black uppercase leading-[32px] tracking-tight text-white">{title}</Text>
      <Text className="mt-3 text-sm leading-5 text-neutral-400">{subtitle}</Text>
    </View>
  );
}

function IntroStep() {
  // Real figures from the roster, not marketing numbers.
  const live = CREATORS.filter((c) => c.isLive).length;
  const countries = new Set(CREATORS.map((c) => c.flag)).size;
  const { accent } = usePrefs();
  const a = accentOf(accent);

  return (
    <View>
      <LinearGradient
        colors={[a.from, a.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        // className is dropped on expo-linear-gradient in web builds.
        style={{
          height: 64,
          width: 64,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 20,
          marginBottom: 28,
          boxShadow: `0 0 32px ${a.glow}`,
        }}
      >
        <Text className="text-3xl font-black leading-none text-white">O</Text>
      </LinearGradient>

      <Heading
        eyebrow="Willkommen bei OnSpot"
        title={'Sieh, was\ngerade\npassiert'}
        subtitle="Live-Streams und Events auf einer Karte – von deiner Straße bis Tokio. In fünf Schritten auf dich zugeschnitten."
      />

      <View className="flex-row gap-2.5">
        <Stat value={String(CREATORS.length)} label="Creator" />
        <Stat value={String(live)} label="Live jetzt" accent />
        <Stat value={String(countries)} label="Länder" />
      </View>
    </View>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  const { accent: accentKey } = usePrefs();
  const a = accentOf(accentKey);
  return (
    <View
      className="flex-1 items-center rounded-2xl px-2 py-4"
      style={{
        backgroundColor: '#15151b',
        borderWidth: 1,
        borderColor: accent ? `${a.tone}59` : 'rgba(255,255,255,0.07)',
      }}
    >
      <Text className={accent ? 'text-2xl font-black' : 'text-2xl font-black text-white'} style={accent ? { color: a.tone } : undefined}>
        {value}
      </Text>
      <Text className="mt-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</Text>
    </View>
  );
}

function GenreStep({ selected, onToggle }: { selected: string[]; onToggle: (key: string) => void }) {
  return (
    <View>
      <Heading
        eyebrow="Dein Geschmack"
        title={'Was schaust\ndu am\nliebsten?'}
        subtitle="Mehrfachauswahl. Danach schlagen wir dir Creator vor, die genau das machen."
      />
      <View className="flex-row flex-wrap gap-2.5">
        {GENRES.map((g) => (
          <SelectCard
            key={g.key}
            className="w-[47%] grow"
            emoji={g.emoji}
            label={g.label}
            selected={selected.includes(g.key)}
            onPress={() => onToggle(g.key)}
          />
        ))}
      </View>
    </View>
  );
}

function CreatorStep({
  genres,
  isFollowing,
  onToggle,
}: {
  genres: string[];
  isFollowing: (name: string) => boolean;
  onToggle: (name: string) => void;
}) {
  const picks = recommendedCreators(genres, 6);
  const genreNames = GENRES.filter((g) => genres.includes(g.key))
    .map((g) => g.label)
    .join(', ');
  const { accent } = usePrefs();
  const a = accentOf(accent);

  return (
    <View>
      <Heading
        eyebrow="Für dich ausgewählt"
        title={'Diese\nCreator\npassen zu dir'}
        subtitle={genreNames ? `Basierend auf: ${genreNames}. Folgen kannst du jederzeit ändern.` : 'Die größten Namen auf der Plattform.'}
      />
      <View className="gap-2.5">
        {picks.map((c) => {
          const following = isFollowing(c.name);
          return (
            <View
              key={c.name}
              className="flex-row items-center gap-3 rounded-2xl px-3.5 py-3"
              style={{
                backgroundColor: '#15151b',
                borderWidth: 1,
                borderColor: following ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.07)',
              }}
            >
              <View className="relative">
                <Avatar name={c.name} avatarUrl={c.avatarUrl} size={44} />
                {c.isLive && (
                  <View className="absolute -bottom-0.5 -right-0.5 rounded-full bg-red-500 px-1.5 py-[1px]">
                    <Text className="text-[7px] font-black uppercase tracking-wide text-white">Live</Text>
                  </View>
                )}
              </View>

              <View className="flex-1">
                <Text className="text-sm font-bold text-white">{c.name}</Text>
                <Text className="mt-0.5 text-[11px] text-neutral-500">
                  {c.flag} {c.city} · {formatFollowers(c.followers + (following ? 1 : 0))} Follower
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  haptics.tap();
                  onToggle(c.name);
                }}
                className="active:opacity-70"
              >
                {following ? (
                  <View className="rounded-full border border-white/15 px-3.5 py-1.5">
                    <Text className="text-[11px] font-bold text-neutral-300">Folgt ✓</Text>
                  </View>
                ) : (
                  <LinearGradient
                    colors={[a.from, a.to]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7 }}
                  >
                    <Text className="text-[11px] font-bold text-white">Folgen</Text>
                  </LinearGradient>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function GoalStep({ selected, onToggle }: { selected: string[]; onToggle: (key: string) => void }) {
  return (
    <View>
      <Heading
        eyebrow="Dein Ziel"
        title={'Was willst\ndu hier\nmachen?'}
        subtitle="Damit dein Start-Feed zu dir passt. Alles lässt sich später in den Einstellungen ändern."
      />
      <View className="gap-2.5">
        {GOALS.map((g) => (
          <SelectCard
            key={g.key}
            label={g.label}
            sublabel={g.sublabel}
            selected={selected.includes(g.key)}
            onPress={() => onToggle(g.key)}
          />
        ))}
      </View>
    </View>
  );
}

function AlertStep({ selected, onToggle }: { selected: string[]; onToggle: (key: string) => void }) {
  const { accent } = usePrefs();
  const a = accentOf(accent);
  return (
    <View>
      <Heading
        eyebrow="Nichts verpassen"
        title={'Sei da,\nwenn es\npassiert'}
        subtitle="Live-Momente sind nach ein paar Minuten vorbei. Wir sagen dir Bescheid – nur bei dem, was du hier auswählst."
      />
      <View className="gap-2.5">
        {ALERTS.map((a) => (
          <SelectCard
            key={a.key}
            label={a.label}
            sublabel={a.sublabel}
            selected={selected.includes(a.key)}
            onPress={() => onToggle(a.key)}
          />
        ))}
      </View>

      <View className="mt-5 flex-row items-start gap-2.5 rounded-2xl border border-white/7 bg-white/[0.03] px-4 py-3">
        <Bell size={14} color={a.tone} />
        <Text className="flex-1 text-[11px] leading-4 text-neutral-500">
          Du kannst jede Benachrichtigung einzeln in den Einstellungen abschalten. Ohne Auswahl schicken wir dir nichts.
        </Text>
      </View>
    </View>
  );
}

function DoneStep({
  genreCount,
  goals,
  alerts,
}: {
  genreCount: number;
  goals: string[];
  alerts: number;
}) {
  const { following } = useSocial();
  const goalLabel =
    goals.length > 0
      ? GOALS.filter((g) => goals.includes(g.key))
          .map((g) => g.label)
          .join(' · ')
      : 'Erst mal umsehen';

  return (
    <View>
      <Heading
        eyebrow="Setup abgeschlossen"
        title={'Alles\nbereit'}
        subtitle="Dein Feed ist eingerichtet. Ab jetzt zählt jeder Tag, an dem du reinschaust – dein Streak startet heute."
      />

      <View className="gap-2.5">
        <Recap value={String(genreCount)} label="Genres gewählt" />
        <Recap value={String(following.length)} label="Creator, denen du folgst" />
        <Recap value={String(alerts)} label="Benachrichtigungen aktiv" />
        <Recap value={goalLabel} label="Dein Ziel" wide />
      </View>
    </View>
  );
}

function Recap({ value, label, wide }: { value: string; label: string; wide?: boolean }) {
  const { accent } = usePrefs();
  const a = accentOf(accent);
  return (
    <View
      className="flex-row items-center gap-3 rounded-2xl px-4 py-3.5"
      style={{ backgroundColor: '#15151b', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}
    >
      <Text
        className={wide ? 'flex-1 text-sm font-bold text-white' : 'w-8 text-xl font-black'}
        style={wide ? undefined : { color: a.tone }}
      >
        {value}
      </Text>
      <Text className={wide ? 'text-[11px] uppercase tracking-wider text-neutral-500' : 'flex-1 text-xs text-neutral-400'}>
        {label}
      </Text>
    </View>
  );
}
