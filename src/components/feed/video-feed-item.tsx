import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText as Text } from '@/components/ui/app-text';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Heart, MapPin, TriangleAlert, UserPlus } from '@/components/ui/icons';
import { useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import type { VideoFeedItem } from '@/constants/mock-data';
import { useSocial } from '@/constants/social-context';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';
import { haptics } from '@/services/haptics';
import { notifications } from '@/services/notifications';
import { CountUp } from '../ui/count-up';
import { HeartBurst } from '../ui/heart-burst';
import { Pop } from '../ui/pop';
import { ReportModal } from '../ui/report-modal';
import { SmartImage } from '../ui/smart-image';

/** `800` -> "800 m", `2300` -> "2,3 km". */
function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

/** One slot of the right-hand action rail: icon above, label under it. */
function RailButton({
  onPress,
  label,
  children,
}: {
  onPress: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} className="items-center gap-1 active:opacity-60">
      <View className="h-12 w-12 items-center justify-center">{children}</View>
      <Text
        className="text-[10px] font-bold text-white"
        style={{ textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function VideoFeedCard({ item }: { item: VideoFeedItem }) {
  const [joined, setJoined] = useState(false);
  const { isFollowing, toggleFollow, isLiked, toggleLike } = useSocial();
  const { accent } = usePrefs();
  const a = accentOf(accent);
  const liked = isLiked(item.id);
  const following = isFollowing(item.authorName);
  const [reportVisible, setReportVisible] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const lastTapRef = useRef(0);
  const { height } = Dimensions.get('window');

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setBurstKey((k) => k + 1);
      haptics.light();
    }
    lastTapRef.current = now;
  };

  const handleJoin = () => {
    setJoined((v) => !v);
    haptics.success();
    if (!joined) {
      // Reminder ~2 min before the (mock) event start - first use triggers the
      // permission prompt, later uses just schedule silently.
      notifications.requestPermission().then(() => {
        notifications.scheduleReminder('Gleich los!', `${item.title} startet in 2 Minuten.`, 120);
      });
    }
  };

  return (
    <View style={{ height }} className="w-full items-center justify-center bg-black">
      <Pressable onPress={handleTap} className="absolute inset-0">
        <Image
          source={{ uri: item.videoThumbnail }}
          className="h-full w-full opacity-80"
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      </Pressable>
      {/* Bottom-heavy gradient instead of a flat wash: keeps the caption area
          readable while leaving the video itself bright. */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
        start={{ x: 0, y: 0.35 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <HeartBurst burstKey={burstKey} />

      {/* Status row: one line, both badges on the same baseline, clearing the
          top bar: the search field's own shadow reaches ~130px, and at top-28
          the Live badge was half-hidden behind it. */}
      <View className="absolute left-4 right-4 top-36 z-50 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          {item.isLive ? (
            <View className="flex-row items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 shadow-lg shadow-red-500/40 glow-red">
              <View className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              <Text className="text-[11px] font-bold uppercase tracking-wide text-white">Live</Text>
            </View>
          ) : (
            <View className="rounded-full bg-black/45 px-3 py-1">
              <Text className="text-[11px] font-bold uppercase tracking-wide text-white/80">Aufzeichnung</Text>
            </View>
          )}
          {/* Right next to the Live badge, because that badge is the strongest
              claim on the screen: the clip is a still image from a stock photo
              service, the viewer count and the distance are invented, and
              nothing here is being broadcast by anyone. */}
          <DemoBadge />
        </View>
        <View className="flex-row items-center gap-1 rounded-full bg-black/45 px-3 py-1">
          <MapPin size={11} color="#ffffff" />
          <Text className="text-[11px] font-semibold text-white">{formatDistance(item.distanceMeters)}</Text>
        </View>
      </View>

      {/* Right action rail: like, follow, report. Deliberately no tip button -
          a payment prompt on top of every clip in an endless feed is the thing
          that makes a feed feel like a slot machine. Tipping lives where the
          user actually chose someone: the stream's or event's detail sheet. */}
      <View className="absolute bottom-56 right-3 z-50 items-center gap-5">
        <RailButton
          onPress={() => {
            if (!liked) setBurstKey((k) => k + 1);
            toggleLike(item.id);
            haptics.light();
          }}
          // Baseline from the clip's own data plus your like, which is the
          // persisted part - it survives reloads and is never inflated.
          label={(item.likes + (liked ? 1 : 0)).toLocaleString('de-DE')}
        >
          <Heart
            size={28}
            color={liked ? '#ef4444' : '#ffffff'}
            fill={liked ? '#ef4444' : 'transparent'}
            strokeWidth={2}
          />
        </RailButton>

        <RailButton
          onPress={() => {
            toggleFollow(item.authorName);
            haptics.light();
          }}
          label={following ? 'Folgt' : 'Folgen'}
        >
          <UserPlus size={26} color={following ? a.tone : '#ffffff'} strokeWidth={2} />
        </RailButton>

        <RailButton onPress={() => setReportVisible(true)} label="Melden">
          <TriangleAlert size={24} color="#ffffff" />
        </RailButton>
      </View>

      {/* pb clears the bottom navigation bar (~86px). */}
      <View className="absolute bottom-28 left-4 right-20 z-50">
        <View className="mb-3 flex-row items-center gap-2">
          <SmartImage source={{ uri: item.authorAvatar }} className="h-9 w-9 rounded-full border border-white/40" />
          <Text className="font-bold text-white">{item.authorName}</Text>
          <Pop trigger={following}>
            <Pressable
              onPress={() => {
                toggleFollow(item.authorName);
                haptics.light();
              }}
              className={
                following
                  ? 'ml-1 rounded-full border border-white/40 bg-white/10 px-3 py-1'
                  : 'ml-1'
              }
            >
              {following ? (
                <Text className="text-xs font-bold text-white">Folgt ✓</Text>
              ) : (
                <LinearGradient
                  colors={[a.from, a.to]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    boxShadow: `0 0 14px ${a.glow}`,
                  }}
                >
                  <Text className="text-xs font-bold text-white">Folgen</Text>
                </LinearGradient>
              )}
            </Pressable>
          </Pop>
        </View>
        <Text className="mb-4 text-base text-white">{item.title}</Text>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            {item.attendeeAvatars.map((uri, i) => (
              <SmartImage
                key={uri + i}
                source={{ uri }}
                className="h-8 w-8 rounded-full border-2 border-black"
                style={{ marginLeft: i === 0 ? 0 : -10 }}
              />
            ))}
            <CountUp
              value={joined ? item.attendeeCount + 1 : item.attendeeCount}
              format={(n) => `${n.toLocaleString('de-DE')} dabei`}
              className="ml-2 text-xs text-white/80"
            />
          </View>

          <Pop trigger={joined}>
            <Pressable
              onPress={handleJoin}
              className={
                joined
                  ? 'rounded-full bg-emerald-500 px-4 py-2.5 shadow-lg glow-emerald'
                  : ''
              }
            >
              {joined ? (
                <Text className="text-sm font-bold text-white">Teilgenommen ✓</Text>
              ) : (
                <LinearGradient
                  colors={[a.from, a.to]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    boxShadow: `0 0 18px ${a.glow}, 0 8px 20px rgba(0,0,0,0.35)`,
                  }}
                >
                  <Text className="text-sm font-bold text-white">Teilnehmen</Text>
                </LinearGradient>
              )}
            </Pressable>
          </Pop>
        </View>
      </View>

      <ReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        targetType="stream"
        targetId={item.id}
        targetName={item.authorName}
      />
    </View>
  );
}
