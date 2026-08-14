import { useState } from 'react';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/app-text';
import { Search, X } from '@/components/ui/icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { GeocodeResult } from '@/components/map/use-geocode-search';
import { useGeocodeSearch } from '@/components/map/use-geocode-search';
import { useRecentSearches } from '@/components/map/use-recent-searches';
import { CATEGORIES, MOCK_USER, type Category, type Coordinates, type ViewTab } from '@/constants/mock-data';
import { useAuth } from '@/constants/auth-context';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';
import { Avatar } from './avatar';
import { CoinChip } from './coin-chip';
import { SearchResults } from './search-results';
import { StreakChip } from './streak-chip';
import { Surface } from './surface';

export function TopBar({
  activeTab,
  onSelectTab,
  activeCategory,
  onSelectCategory,
  searchQuery,
  onChangeSearch,
  onSelectSearchResult,
  getBiasLocation,
  onPressProfile,
  onOpenCoins,
  streakCount,
  nearbyCount,
}: {
  activeTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  activeCategory: Category;
  onSelectCategory: (category: Category) => void;
  searchQuery: string;
  onChangeSearch: (value: string) => void;
  onSelectSearchResult: (result: GeocodeResult) => void;
  getBiasLocation: () => Coordinates | null;
  onPressProfile: () => void;
  /** Opens the coin shop (wallet pill sits next to the streak). */
  onOpenCoins: () => void;
  /** Real per-day visit streak; the chip hides itself below 1. */
  streakCount: number;
  /** Real number of spots matching the active filter - not a marketing figure. */
  nearbyCount: number;
}) {
  const { results, loading } = useGeocodeSearch(activeTab === 'map' ? searchQuery : '', getBiasLocation);
  const { recents, remember, clear } = useRecentSearches();
  const [focused, setFocused] = useState(false);
  // The panel is open while typing, and also on a focused empty field - that
  // is where the recent places live, which is the whole point of keeping them.
  const showResults =
    activeTab === 'map' && (searchQuery.trim().length >= 2 || (focused && recents.length > 0));
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme !== 'light';
  const inactiveLabel = isDark ? '#d4d4d8' : '#3f3f46';
  const { name: authName, avatarUrl, avatarColor, avatarEmoji, avatarFrame } = useAuth();
  const { accent } = usePrefs();
  const a = accentOf(accent);

  return (
    // Floating rather than a solid bar: the map is the content, and a chrome
    // strip pinned across the top permanently eats the part of it the user is
    // actually looking at. Each control now carries its own shadow instead.
    // Pulled up from pt-12 and every gap below tightened - the bar used to
    // leave a noticeably empty band above the search field once the tab
    // capsule moved down into the bottom nav.
    <View className="absolute left-0 right-0 top-0 z-50 pb-2 pt-8">
        {/* Brand row - the one place the app name always shows, so the product
            the user is inside of is never in question. The right side carries
            the real live count on the map tab (it moves with the filter) and
            a plain activity pill on the feed tab - never two stats for one
            fact. */}
        <View className="flex-row items-center justify-between px-4 pb-1.5">
          <View className="flex-row items-center gap-2">
            <LinearGradient
              colors={[a.from, a.to]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                height: 26,
                width: 26,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                // className is dropped on expo-linear-gradient in web builds,
                // so every layout/shadow value lives in style (see below).
                boxShadow: `0 0 12px ${a.glow}, 0 6px 12px -3px ${a.glow}`,
              }}
            >
              <Text className="text-sm font-black leading-none text-white">O</Text>
            </LinearGradient>
            <Text className="text-xl font-black leading-none tracking-tight text-neutral-900 dark:text-white">
              OnSpot
            </Text>
          </View>
          {/* Streak and profile sit here now. The old live-count pill is gone:
              it restated what the map already shows and left no quiet edge in
              the header. */}
          <View className="flex-row items-center gap-2">
            <StreakChip count={streakCount} />
            <CoinChip onPress={onOpenCoins} />
            <Pressable
              onPress={onPressProfile}
              accessibilityRole="button"
              accessibilityLabel="Profil öffnen"
              // Fully glow-free, in both modes: no ring, no shadow, no glow.
              // The gradient ring around the avatar is the only frame - any
              // boxShadow read as clutter over satellite and dark map alike.
              // With an OnSpot+ frame set, the frame itself replaces the ring.
              style={{ borderRadius: 999 }}
            >
              {avatarFrame ? (
                <Avatar
                  name={authName || MOCK_USER.name}
                  avatarUrl={avatarUrl}
                  color={avatarColor}
                  emoji={avatarEmoji}
                  frame={avatarFrame}
                  size={32}
                />
              ) : (
                <LinearGradient
                  colors={[a.from, a.to]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ borderRadius: 999, padding: 2 }}
                >
                  <Avatar
                    name={authName || MOCK_USER.name}
                    avatarUrl={avatarUrl}
                    color={avatarColor}
                    emoji={avatarEmoji}
                    size={32}
                  />
                </LinearGradient>
              )}
            </Pressable>
          </View>
        </View>
      {/* Search owns the full width now that the tabs moved to the bottom nav. */}
      <View className="px-4 pb-2">
        <Surface
          variant="thick"
          className="search-surface flex-row items-center gap-2.5 rounded-full px-4 py-3"
          // The focus ring is the accent, drawn on the surface itself: on a
          // floating field over a map there is no page background to dim, so
          // the only way to show focus is to light up the field.
          style={focused ? { borderWidth: 1.5, borderColor: a.tone, paddingVertical: 10.5 } : undefined}
        >
          <Search size={16} color={focused ? a.tone : '#9ca3af'} strokeWidth={2.4} />
          <TextInput
            value={searchQuery}
            onChangeText={onChangeSearch}
            onFocus={() => setFocused(true)}
            // Delayed, so a tap on a result row is not cancelled by the blur
            // unmounting the row out from under the press.
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Adresse, Ort oder Laden suchen"
            placeholderTextColor="#9ca3af"
            returnKeyType="search"
            accessibilityLabel="Suche nach Adresse, Ort oder Laden"
            className="flex-1 text-sm text-neutral-900 dark:text-white"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => onChangeSearch('')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Suche leeren"
              className="h-5 w-5 items-center justify-center rounded-full bg-black/10 active:opacity-60 dark:bg-white/15"
            >
              <X size={11} color="#71717a" strokeWidth={3} />
            </Pressable>
          )}
        </Surface>
      </View>

      {showResults && (
        <SearchResults
          results={results}
          loading={loading}
          query={searchQuery}
          recents={recents}
          onClearRecents={clear}
          onSelect={(result) => {
            remember(result);
            onChangeSearch('');
            setFocused(false);
            onSelectSearchResult(result);
          }}
        />
      )}

      {/* Category filters - only relevant for the map */}
      {activeTab === 'map' && !showResults && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 px-4"
        >
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => onSelectCategory(cat.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Filter ${cat.label}`}
                // Plain Pressable, not AnimatedPressable: the scale transform
                // on the animated wrapper creates a new backdrop root, which
                // makes Chrome drop the backdrop-filter of the glass layer
                // underneath - the pill would render see-through. The press
                // feedback comes from active:opacity instead.
                className={
                  active
                    ? `relative overflow-hidden rounded-full px-4 py-2 active:opacity-80`
                    : 'relative overflow-hidden rounded-full px-4 py-2 shadow-md shadow-black/10 active:opacity-80 dark:shadow-black/40'
                }
                // `pan-x` tells the browser this element never handles a
                // horizontal drag itself, so a swipe that starts on a pill
                // scrolls the row instead of being swallowed by the press
                // responder - which is why the row felt stuck on touch.
                style={
                  active
                    ? { boxShadow: `0 0 14px ${a.glow}`, touchAction: 'pan-x' }
                    : { touchAction: 'pan-x' }
                }
              >
                {active ? (
                  <LinearGradient
                    colors={[a.from, a.to]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                ) : (
                  <Surface className="absolute inset-0 rounded-full" />
                )}
                {/* Colour comes from `style`, not a swapped className: on web
                    NativeWind appends the new class instead of replacing the
                    old one when the string changes between renders, leaving
                    both colours on the node - and the active white then wins
                    on an inactive white pill, rendering the label invisible. */}
                <Text
                  className="text-xs font-semibold"
                  style={{ color: active ? '#ffffff' : inactiveLabel }}
                >
                  {cat.emoji} {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
