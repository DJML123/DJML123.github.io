import { LinearGradient } from 'expo-linear-gradient';
import { Bookmark, Map, MonitorPlay, Plus, Users, type LucideIcon } from '@/components/ui/icons';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { Animated, Pressable, View } from 'react-native';

import { AppText as Text } from '@/components/ui/app-text';
import type { ViewTab } from '@/constants/mock-data';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';

export type NavAction = 'friends' | 'saved' | 'create';

const LEFT: { key: ViewTab; label: string; icon: LucideIcon }[] = [
  { key: 'map', label: 'Karte', icon: Map },
  { key: 'video', label: 'Feed', icon: MonitorPlay },
];

const RIGHT: { key: Extract<NavAction, 'friends' | 'saved'>; label: string; icon: LucideIcon }[] = [
  { key: 'friends', label: 'Freunde', icon: Users },
  { key: 'saved', label: 'Gespeichert', icon: Bookmark },
];

/**
 * Primary navigation. It lives at the bottom because that is the half of the
 * screen a thumb actually reaches, and because the top of a map app belongs to
 * search - the old floating tab capsule spent prime real estate on two buttons.
 *
 * The centre "create" button is raised out of the bar: it used to be a loose
 * floating circle that collided with whatever the active screen put in the
 * bottom-right corner.
 */
export function BottomNav({
  activeTab,
  onSelectTab,
  onAction,
  savedCount,
  friendCount,
  hidden = false,
}: {
  activeTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onAction: (action: NavAction) => void;
  savedCount: number;
  friendCount: number;
  /** Hidden while a sheet owns the bottom of the screen. */
  hidden?: boolean;
}) {
  // Read directly rather than trusted to `dark:` classes: this bar's own
  // background/border were hardcoded near-black regardless of theme, which is
  // why switching to light mode left it looking untouched. Called before the
  // early return below - React requires every hook to run on every render,
  // and `hidden` can flip between renders of the same component instance.
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme !== 'light';

  if (hidden) return null;

  return (
    <View
      accessibilityRole="tablist"
      className="absolute bottom-0 left-0 right-0 z-40 flex-row items-end justify-around px-2 pb-7 pt-2"
      style={{
        backgroundColor: isDark ? 'rgba(10,10,14,0.92)' : 'rgba(255,255,255,0.94)',
        borderTopWidth: 1,
        borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
        boxShadow: isDark ? 'none' : '0 -2px 12px rgba(0,0,0,0.06)',
      }}
    >
      {LEFT.map((t) => (
        <NavItem
          key={t.key}
          icon={t.icon}
          label={t.label}
          active={activeTab === t.key}
          isDark={isDark}
          onPress={() => onSelectTab(t.key)}
        />
      ))}

      <CreateButton isDark={isDark} onPress={() => onAction('create')} />

      {RIGHT.map((a) => (
        <NavItem
          key={a.key}
          icon={a.icon}
          label={a.label}
          badge={a.key === 'friends' ? friendCount : savedCount}
          isDark={isDark}
          onPress={() => onAction(a.key)}
        />
      ))}
    </View>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  badge,
  isDark,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  badge?: number;
  isDark: boolean;
  onPress: () => void;
}) {
  const { accent } = usePrefs();
  const a = accentOf(accent);
  const tint = active ? a.tone : isDark ? '#71717a' : '#9ca3af';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      className="flex-1 items-center gap-1 py-1 active:opacity-60"
    >
      <View className="relative">
        <Icon size={21} color={tint} strokeWidth={active ? 2.4 : 2} />
        {badge != null && badge > 0 && (
          <View className="absolute -right-2.5 -top-1.5 min-w-[16px] items-center rounded-full px-1" style={{ backgroundColor: a.tone }}>
            <Text className="text-[9px] font-bold leading-[14px] text-white">{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      {/* Colour in `style`: NativeWind appends rather than replaces a swapped
          className on web, so both colours would end up on the node. */}
      <Text className="text-[10px] font-bold" style={{ color: tint }}>
        {label}
      </Text>
      {/* Active marker sits under the label so the row keeps one baseline. */}
      <View
        className="h-[3px] w-5 rounded-full"
        style={{ backgroundColor: active ? a.tone : 'transparent' }}
      />
    </Pressable>
  );
}

function CreateButton({ isDark, onPress }: { isDark: boolean; onPress: () => void }) {
  const [scale] = useState(() => new Animated.Value(1));
  const { accent } = usePrefs();
  const a = accentOf(accent);
  const animate = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 10 }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animate(0.9)}
      onPressOut={() => animate(1)}
      accessibilityRole="button"
      accessibilityLabel="Neuen Ort erstellen"
      className="flex-1 items-center"
    >
      <Animated.View style={{ transform: [{ scale }], marginTop: -18 }}>
        <LinearGradient
          colors={[a.from, a.to]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          // className is dropped on expo-linear-gradient in web builds. The
          // ring colour matches the bar behind it so the button still reads
          // as "cut out of the bar" in light mode instead of keeping a dark
          // ring that only worked against the old always-dark background.
          style={{
            height: 52,
            width: 52,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            borderWidth: 4,
            borderColor: isDark ? '#0a0a0e' : '#ffffff',
            boxShadow: `0 0 24px ${a.glow}`,
          }}
        >
          <Plus size={24} color="#ffffff" strokeWidth={2.8} />
        </LinearGradient>
      </Animated.View>
      <Text className="mt-1 text-[10px] font-bold text-neutral-500">Erstellen</Text>
      <View className="h-[3px] w-5" />
    </Pressable>
  );
}
