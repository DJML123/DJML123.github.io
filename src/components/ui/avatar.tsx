import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { AppText as Text } from '@/components/ui/app-text';
import type { AvatarFrame } from '@/services/types';

/** Plus-only ring colors. `aurora` also animates (rotating gradient). */
const FRAME_COLORS: Record<AvatarFrame, [string, string, ...string[]]> = {
  neon: ['#00f5ff', '#8b5cf6'],
  gold: ['#ffe259', '#b8860b'],
  rainbow: ['#ff2e63', '#ffb800', '#39ff14', '#00f5ff', '#7f00ff'],
  aurora: ['#00f5ff', '#7f00ff', '#ff2ec4', '#39ff14'],
  pulse: ['#ff2e63', '#ff9f1c'],
  orbit: ['#1e3a8a', '#38bdf8'],
};

/** Which rings move. Used by the creator to label the animated tier. */
export const ANIMATED_FRAMES: AvatarFrame[] = ['aurora', 'pulse', 'orbit'];

/** Animated rotating-gradient ring, clipped to a circle around the avatar.
 *  The gradient square is oversized so the rotation never leaves a gap. */
function AuroraRing({ size, pad }: { size: number; pad: number }) {
  const [spin] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const side = (size + pad * 2) * 1.6;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: side,
        height: side,
        top: (size + pad * 2 - side) / 2,
        left: (size + pad * 2 - side) / 2,
        transform: [{ rotate }],
        borderRadius: side / 2,
      }}
    >
      <LinearGradient
        colors={FRAME_COLORS.aurora}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, borderRadius: side / 2 }}
      />
    </Animated.View>
  );
}

/** Breathing halo: a second ring that scales and fades on a loop, so the
 *  avatar reads as "live" without anything spinning. */
function PulseHalo({ outer }: { outer: number }) {
  const [beat] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(beat, { toValue: 1, duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(beat, { toValue: 0, duration: 900, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [beat]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: outer,
        height: outer,
        borderRadius: outer / 2,
        borderWidth: 2,
        borderColor: FRAME_COLORS.pulse[0],
        opacity: beat.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0.15] }),
        transform: [{ scale: beat.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }],
      }}
    />
  );
}

/** A single dot travelling around the ring. The dot sits at the top of a
 *  full-size square that rotates, which is cheaper and rounder than animating
 *  sin/cos offsets per frame. */
function OrbitDot({ outer }: { outer: number }) {
  const [spin] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const dot = Math.max(4, Math.round(outer * 0.14));
  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: outer,
        height: outer,
        alignItems: 'center',
        transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      }}
    >
      <View
        style={{
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: '#ffffff',
          boxShadow: '0 0 8px rgba(255,255,255,0.95)',
        }}
      />
    </Animated.View>
  );
}

/**
 * One avatar everywhere. With an uploaded image it renders the photo; without
 * one it renders the PFP-creator build: a colored circle carrying an emoji
 * (or, if none was picked, the name's initial). `MOCK_USER` URLs are plain
 * pictures, so every call site just hands the logged-in user's values over.
 * A `frame` (OnSpot+ cosmetic) draws a gradient ring around either variant.
 */
export function Avatar({
  name = '',
  avatarUrl,
  color = '#8b5cf6',
  emoji,
  size = 44,
  border = false,
  frame,
}: {
  name?: string;
  avatarUrl?: string | null;
  color?: string | null;
  emoji?: string | null;
  size?: number;
  border?: boolean;
  frame?: AvatarFrame | null;
}) {
  const shape = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...(border && !frame ? { borderWidth: 2, borderColor: '#a78bfa' } : null),
  } as const;

  const content = avatarUrl ? (
    <Image
      source={{ uri: avatarUrl }}
      style={shape}
      contentFit="cover"
      transition={150}
      cachePolicy="memory-disk"
      accessibilityLabel={name ? `Profilbild von ${name}` : 'Profilbild'}
    />
  ) : (
    <View
      style={[{ backgroundColor: color ?? '#8b5cf6', alignItems: 'center', justifyContent: 'center' }, shape]}
    >
      <Text
        style={{
          fontSize: Math.round(size * (emoji ? 0.42 : 0.4)),
          fontWeight: '800',
          color: '#ffffff',
          lineHeight: Math.round(size * 0.55),
        }}
      >
        {emoji ?? (name.trim() ? name.trim()[0].toUpperCase() : '?')}
      </Text>
    </View>
  );

  if (!frame) return content;

  const pad = Math.max(3, Math.round(size * 0.07));
  const outer = size + pad * 2;

  return (
    <View
      style={{
        width: outer,
        height: outer,
        borderRadius: outer / 2,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {frame === 'aurora' ? (
        <AuroraRing size={size} pad={pad} />
      ) : frame === 'pulse' ? (
        <>
          <LinearGradient
            colors={FRAME_COLORS.pulse}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: outer / 2 }}
          />
          <PulseHalo outer={outer} />
        </>
      ) : frame === 'orbit' ? (
        <>
          <LinearGradient
            colors={FRAME_COLORS.orbit}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: outer / 2 }}
          />
          <OrbitDot outer={outer} />
        </>
      ) : (
        <LinearGradient
          colors={FRAME_COLORS[frame]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: outer / 2,
            boxShadow: frame === 'neon' ? `0 0 14px ${FRAME_COLORS.neon[0]}88` : undefined,
          }}
        />
      )}
      <View
        style={{
          borderRadius: (size + pad * 2) / 2,
          padding: pad,
          backgroundColor: 'transparent',
        }}
      >
        {content}
      </View>
    </View>
  );
}