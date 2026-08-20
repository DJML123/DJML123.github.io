import { Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colorScheme as nativewindColorScheme, useColorScheme } from 'nativewind';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Appearance, Platform, Pressable, View } from 'react-native';

import { VideoFeed } from '@/components/feed/video-feed';
import { OnSpotMap, type OnSpotMapHandle } from '@/components/map/map-view';
import { NearbyListModal } from '@/components/map/nearby-list-modal';
import type { GeocodeResult } from '@/components/map/use-geocode-search';
import { List } from '@/components/ui/icons';
import { Surface } from '@/components/ui/surface';
import { ActivityModal } from '@/components/ui/activity-modal';
import { AuthModal } from '@/components/ui/auth-modal';
import { AvatarCreator } from '@/components/ui/avatar-creator';
import { CelebrationModal } from '@/components/ui/celebration-modal';
import { CoinsShopModal } from '@/components/ui/coins-shop-modal';
import { CreateSpotModal } from '@/components/ui/create-spot-modal';
import { DonationsModal } from '@/components/ui/donations-modal';
import { BottomNav } from '@/components/ui/bottom-nav';
import { FadeIn } from '@/components/ui/fade-in';
import { FriendsModal } from '@/components/ui/friends-modal';
import { LeaderboardModal } from '@/components/ui/leaderboard-modal';
import { MapErrorBoundary } from '@/components/ui/map-error-boundary';
import { ProfileMenu } from '@/components/ui/profile-menu';
import { SavedSpotsModal } from '@/components/ui/saved-spots-modal';
import { SettingsModal } from '@/components/ui/settings-modal';
import { SubscriptionModal } from '@/components/ui/subscription-modal';
import { TopBar } from '@/components/ui/top-bar';
import { ALL_SPOTS, avatar, type Category, type Spot, type ViewTab } from '@/constants/mock-data';
import { useAuth } from '@/constants/auth-context';
import { usePrefs } from '@/constants/prefs-context';
import { useSaved } from '@/constants/saved-context';
import { useSocial } from '@/constants/social-context';
import { repo } from '@/services/repository';

/** Mirrors STREAK_MILESTONES in the repository - used only to name the next
 *  target in the celebration copy. */
const NEXT_MILESTONE: Record<number, number | undefined> = { 3: 7, 7: 14, 14: 30, 30: 100, 100: undefined };

/** Streak milestones that unlock a permanent profile badge. */
const BADGE_BY_MILESTONE: Record<number, string> = {
  7: 'Feueranzünder 🔥',
  30: 'Unaufhaltsam ⚡',
  100: 'OnSpot-Legende 👑',
};

/** Afterdark is the default look now: the app opens dark on first visit, an
 *  explicitly picked light mode stays picked. NativeWind itself does not
 *  persist the scheme (it only flips the `dark` class on the root element),
 *  so the choice lives in this key and is re-applied before first render -
 *  no light flash on reload. */
const THEME_KEY = 'onspot-theme';

function storedTheme(): 'light' | 'dark' | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function persistTheme(theme: 'light' | 'dark') {
  if (Platform.OS !== 'web') return;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage unavailable - the scheme still applies for this session.
  }
}

const initialTheme = storedTheme() ?? 'dark';
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  // Browser: flip the `dark` class before first render (no flash). The guard
  // keeps the module safe during Expo Router's node-side render pass.
  nativewindColorScheme.set(initialTheme);
} else if (Platform.OS !== 'web') {
  // Native: force the system appearance once; the toggle keeps working as before.
  Appearance.setColorScheme('dark');
}
persistTheme(initialTheme);

export default function OnSpotScreen() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme !== 'light';
  const { startTab, ready, onboardingDone, streak, recordVisitDay, milestone, clearMilestone } =
    usePrefs();
  const { savedIds, toggleSaved } = useSaved();
  const { following } = useSocial();
  const { status, name, signOut } = useAuth();
  const isLoggedIn = status === 'verified';
  const [activeTab, setActiveTab] = useState<ViewTab>(startTab);
  // The user picks the filter themselves; "Alle" (the default) shows everything.
  const [category, setCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [spots, setSpots] = useState<Spot[]>(ALL_SPOTS);
  const [mapOverlayOpen, setMapOverlayOpen] = useState(false);
  const [activeSpotId, setActiveSpotId] = useState<string | undefined>();
  const [authVisible, setAuthVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [avatarCreatorVisible, setAvatarCreatorVisible] = useState(false);
  const [coinsShopVisible, setCoinsShopVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [donationsVisible, setDonationsVisible] = useState(false);
  const [friendsVisible, setFriendsVisible] = useState(false);
  const [subscriptionVisible, setSubscriptionVisible] = useState(false);
  const [savedVisible, setSavedVisible] = useState(false);
  const [activityVisible, setActivityVisible] = useState(false);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [nearbyListVisible, setNearbyListVisible] = useState(false);

  const mapRef = useRef<OnSpotMapHandle>(null);

  const filteredSpots = useMemo(() => {
    return category === 'all' ? spots : spots.filter((s) => s.category === category);
  }, [spots, category]);

  const savedSpots = useMemo(() => spots.filter((s) => savedIds.includes(s.id)), [spots, savedIds]);

  // Counts today's visit exactly once per calendar day. Any milestone reached
  // is published through the repository's subscription and read from context,
  // so nothing has to be pushed into local state from here.
  useEffect(() => {
    if (!ready) return;
    recordVisitDay();
  }, [ready, recordVisitDay]);

  // Gate: wait for hydration, then bounce first-time users to onboarding.
  if (!ready) {
    return <View className="flex-1 bg-neutral-100 dark:bg-neutral-950" />;
  }
  if (!onboardingDone) {
    return <Redirect href="/onboarding" />;
  }

  const handleSelectSpot = (spot: Spot) => {
    setActiveSpotId(spot.id);
    repo.recordVisit(spot.id);
    mapRef.current?.flyToSpot(spot);
  };

  const handleSelectSearchResult = (result: GeocodeResult) => {
    setActiveSpotId(undefined);
    mapRef.current?.flyToCoords(result.coords, result.title, result.subtitle);
  };

  const handleCreate = ({ type, title, subtitle }: { type: Spot['type']; title: string; subtitle: string }) => {
    const newSpot: Spot = {
      id: `spot-${Date.now()}`,
      type,
      title,
      subtitle: subtitle || 'Neu erstellt',
      // Where the user is actually looking, not Berlin. Creating a spot in
      // Hamburg used to drop it 250km away, which made the feature useless
      // anywhere but the one city the demo data was written for.
      coords: (() => {
        const center = mapRef.current?.getCenter();
        const base = center ?? { lng: 13.405, lat: 52.52 };
        return {
          lng: base.lng + (Math.random() - 0.5) * 0.02,
          lat: base.lat + (Math.random() - 0.5) * 0.02,
        };
      })(),
      avatarUrl: avatar(title + Date.now()),
      category: 'all',
      isLive: type === 'streamer',
    };
    setSpots((prev) => [newSpot, ...prev]);
    setCreateVisible(false);
  };

  return (
    <View role="main" className="flex-1 overflow-hidden bg-neutral-100 dark:bg-neutral-950">
      <FadeIn id={activeTab}>
        {/*
          The map stays mounted across tab switches - unmounting it tears down
          the whole MapLibre instance (tile caches, layers, markers) and resets
          the user's layer/tilt/route state on every tab flip. It is only hidden
          while the video feed is active.
        */}
        <View className="flex-1" style={activeTab === 'video' ? { display: 'none' } : undefined}>
          <MapErrorBoundary>
            <OnSpotMap
              ref={mapRef}
              spots={filteredSpots}
              isDark={isDark}
              category={category}
              active={activeTab === 'map'}
              savedIds={savedIds}
              onToggleSave={toggleSaved}
              externalSpotId={activeSpotId}
              onWatch={(spot) => {
                setActiveSpotId(spot.id);
                setActiveTab('video');
              }}
              onOverlayOpenChange={setMapOverlayOpen}
            />
          </MapErrorBoundary>
          {/* A text equivalent of what the map shows. The map itself is a
              <canvas> - there is no way to make a canvas accessible, so this
              is the honest fix: the same streams/events/places as a real,
              readable, keyboard-reachable list. Sits directly above the map's
              own locate button (bottom-32) in the same right-hand column, and
              only while there is something on top of the map to hide: a
              detail sheet or route already owns that space. */}
          {activeTab === 'map' && !mapOverlayOpen && (
            <Pressable
              onPress={() => setNearbyListVisible(true)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Liste ansehen: alles in der Nähe als Text"
              className="absolute bottom-48 right-4 z-40 active:opacity-50"
            >
              <Surface className="h-12 w-12 items-center justify-center rounded-[20px]">
                <List size={20} color={isDark ? '#e4e4e7' : '#3f3f46'} strokeWidth={2.4} />
              </Surface>
            </Pressable>
          )}
        </View>
        <View className="flex-1" style={activeTab === 'map' ? { display: 'none' } : undefined}>
          <VideoFeed />
        </View>

        {/* Afterdark chrome. The dark scrim keeps the floating bar legible
            over bright map areas (a gradient, not a blur). Light mode gets no
            scrim and no washes at all - a white gradient over a light map
            reads as a smudge, and the violet blobs belong to the dark look.
            Both are pointer-transparent and kept small - full-screen fixed
            overlays (the old grain) force a full composite on every frame and
            stutter the map/feed. */}
        {isDark && <View className="top-scrim-dark" />}
        {isDark && (
          <LinearGradient
            colors={['rgba(139,92,246,0.20)', 'rgba(139,92,246,0)']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              top: -70,
              right: -70,
              width: 260,
              height: 260,
              borderRadius: 130,
            }}
          />
        )}
        {isDark && (
          <LinearGradient
            colors={['rgba(192,38,211,0.14)', 'rgba(192,38,211,0)']}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              bottom: -80,
              left: -80,
              width: 280,
              height: 280,
              borderRadius: 140,
            }}
          />
        )}
      </FadeIn>

      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeCategory={category}
        onSelectCategory={setCategory}
        searchQuery={searchQuery}
        onChangeSearch={setSearchQuery}
        onSelectSearchResult={handleSelectSearchResult}
        getBiasLocation={() => mapRef.current?.getCenter() ?? null}
        onPressProfile={() => setProfileVisible(true)}
        streakCount={streak.count}
        nearbyCount={filteredSpots.length}
        onOpenCoins={() => setCoinsShopVisible(true)}
      />

      {/* Primary navigation. Hidden while the map's detail sheet owns the
          bottom of the screen, so the two never stack. */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        hidden={mapOverlayOpen}
        savedCount={savedIds.length}
        friendCount={following.length}
        onAction={(action) => {
          if (action === 'create') setCreateVisible(true);
          if (action === 'friends') setFriendsVisible(true);
          if (action === 'saved') setSavedVisible(true);
        }}
      />

      {/* Closing a panel closes exactly that panel. Every one of these used
          to also close its parent, so dismissing Settings threw away the
          Profile sheet underneath it and dropped the user back on the map. */}
      <ProfileMenu
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
        isLoggedIn={isLoggedIn}
        userName={name || undefined}
        savedCount={savedIds.length}
        streakCount={streak.count}
        onOpenSavedSpots={() => setSavedVisible(true)}
        onOpenActivity={() => setActivityVisible(true)}
        onOpenLeaderboard={() => setLeaderboardVisible(true)}
        onOpenSettings={() => setSettingsVisible(true)}
        onOpenDonations={() => setDonationsVisible(true)}
        onOpenFriends={() => setFriendsVisible(true)}
        onOpenSubscription={() => setSubscriptionVisible(true)}
        onOpenLogin={() => setAuthVisible(true)}
        onOpenAvatarCreator={() => setAvatarCreatorVisible(true)}
        onLogout={() => {
          void signOut();
          setProfileVisible(false);
        }}
      />

      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onBack={() => setSettingsVisible(false)}
        isDark={isDark}
        onToggleTheme={() => {
          const next = isDark ? 'light' : 'dark';
          setColorScheme(next);
          persistTheme(next);
        }}
        onOpenFriends={() => setFriendsVisible(true)}
        onOpenSubscription={() => setSubscriptionVisible(true)}
      />

      <DonationsModal
        visible={donationsVisible}
        onClose={() => setDonationsVisible(false)}
        onBack={() => setDonationsVisible(false)}
      />
      <FriendsModal
        visible={friendsVisible}
        onClose={() => setFriendsVisible(false)}
        onBack={() => setFriendsVisible(false)}
        onRequestAuth={() => setAuthVisible(true)}
      />
      <SubscriptionModal
        visible={subscriptionVisible}
        onClose={() => setSubscriptionVisible(false)}
        onBack={() => setSubscriptionVisible(false)}
      />
      <SavedSpotsModal
        visible={savedVisible}
        onClose={() => setSavedVisible(false)}
        onBack={() => setSavedVisible(false)}
        spots={savedSpots}
        onSelectSpot={handleSelectSpot}
      />
      <ActivityModal
        visible={activityVisible}
        onClose={() => setActivityVisible(false)}
        onBack={() => setActivityVisible(false)}
      />
      <LeaderboardModal
        visible={leaderboardVisible}
        onClose={() => setLeaderboardVisible(false)}
        onBack={() => setLeaderboardVisible(false)}
      />

      <AuthModal
        visible={authVisible}
        onClose={() => setAuthVisible(false)}
        onAuthenticated={() => setAuthVisible(false)}
      />

      <AvatarCreator
        visible={avatarCreatorVisible}
        onClose={() => setAvatarCreatorVisible(false)}
      />

      <CoinsShopModal
        visible={coinsShopVisible}
        onClose={() => setCoinsShopVisible(false)}
      />

      <CreateSpotModal visible={createVisible} onClose={() => setCreateVisible(false)} onCreate={handleCreate} />

      <NearbyListModal
        visible={nearbyListVisible}
        onClose={() => setNearbyListVisible(false)}
        spots={filteredSpots}
        onSelectSpot={handleSelectSpot}
      />

      <CelebrationModal
        visible={milestone != null}
        emoji="🔥"
        title={`${milestone ?? 0}-Tage-Streak!`}
        subtitle={
          milestone != null && BADGE_BY_MILESTONE[milestone]
            ? `Profil-Badge freigeschaltet: ${BADGE_BY_MILESTONE[milestone]}`
            : milestone != null && NEXT_MILESTONE[milestone]
              ? `Weiter so – der nächste Meilenstein sind ${NEXT_MILESTONE[milestone]} Tage.`
              : 'Stärkster Meilenstein erreicht. Respekt.'
        }
        onClose={clearMilestone}
      />
    </View>
  );
}
