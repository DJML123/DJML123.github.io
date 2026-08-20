import * as ImagePicker from 'expo-image-picker';
import { Check, Crown, Dices, Lock, Sparkles } from '@/components/ui/icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppText as Text } from '@/components/ui/app-text';
import { useAuth } from '@/constants/auth-context';
import { useCoins } from '@/constants/coins-context';
import { usePrefs } from '@/constants/prefs-context';
import { useSocial } from '@/constants/social-context';
import { accentOf } from '@/constants/accent';
import { haptics } from '@/services/haptics';
import type { AvatarFrame } from '@/services/types';
import { Avatar } from './avatar';
import { BottomSheetModal } from './bottom-sheet-modal';
import { PrimaryButton } from './primary-button';
import { SubscriptionModal } from './subscription-modal';

/** The full palette, free for everyone. Colors and emojis are what make the
 *  avatar *yours*; putting them behind coins made the basic avatar feel like a
 *  demo. What costs coins lives further down: the rings. */
const AVATAR_COLORS = [
  '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#84cc16',
  '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#d946ef', '#a855f7', '#64748b', '#334155',
  '#22c55e', '#eab308', '#fb7185', '#f472b6', '#38bdf8', '#2dd4bf', '#a3e635', '#fbbf24',
  '#00f5ff', '#39ff14', '#ff2ec4', '#c0c7d1', '#ffd700', '#7f00ff', '#f43f5e', '#0f172a',
];

const AVATAR_EMOJIS = [
  '😎', '🦊', '🐼', '🚀', '⚡', '🔥', '🎧', '🌈',
  '🦄', '🐸', '🦁', '🐯', '🐙', '🦋', '🐝', '🌻',
  '🍀', '⭐', '🌙', '🎨', '🕹️', '⚽', '🍕', '🧠',
  '👻', '🤖', '👑', '🌮', '🍦', '🎸', '🥷', '🦉',
  '🐳', '🪐', '🍩', '🥑', '💀', '👽', '🦹', '👾',
];

/** Section label - one style for every block, so the sheet reads as one page
 *  instead of six stacked widgets. */
function SectionTitle({ children, hint }: { children: string; hint?: React.ReactNode }) {
  return (
    <View className="mb-2.5 flex-row items-center justify-between">
      <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-neutral-400 dark:text-neutral-500">
        {children}
      </Text>
      {hint}
    </View>
  );
}

/**
 * PFP creator: build an avatar from a photo, or from color + emoji, with a
 * live preview that is the exact Avatar component used everywhere else.
 *
 * Photo, colors and emojis are free. Rings are the coin sink - the plain ones
 * cost a few hundred coins, the animated ones cost the most - and an active
 * OnSpot+ subscription unlocks all of them without spending anything.
 */
export function AvatarCreator({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  // The paywall lives next to the sheet, not inside it: a modal nested in
  // another modal's tree inherits its stacking context and its unmount.
  const [paywallVisible, setPaywallVisible] = useState(false);

  return (
    <>
      <BottomSheetModal visible={visible} onClose={onClose} title="Avatar erstellen">
        {/* Keyed by open-state so the draft re-seeds from the saved avatar on
            every open - no effect, no stale state from the last session. */}
        <CreatorBody
          key={visible ? 'open' : 'closed'}
          onClose={onClose}
          onOpenPaywall={() => setPaywallVisible(true)}
        />
      </BottomSheetModal>
      <SubscriptionModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} />
    </>
  );
}

function CreatorBody({ onClose, onOpenPaywall }: { onClose: () => void; onOpenPaywall: () => void }) {
  const { name, avatarUrl, avatarColor, avatarEmoji, avatarFrame, updateAvatar } = useAuth();
  const { accent } = usePrefs();
  const a = accentOf(accent);
  const { balance, frames, isOwned, buyItem } = useCoins();
  const { subscribed } = useSocial();

  const [color, setColor] = useState<string>(avatarColor ?? AVATAR_COLORS[0]);
  const [emoji, setEmoji] = useState<string | null>(avatarEmoji);
  const [photo, setPhoto] = useState<string | null>(avatarUrl);
  const [frame, setFrame] = useState<AvatarFrame | null>(avatarFrame);
  /** Set when a purchase failed for lack of coins, cleared on the next tap. */
  const [shortOf, setShortOf] = useState<number | null>(null);

  /** Uploaded photos become data URIs on web (a blob: URL would die on
   *  reload) and file URIs on native - same contract as the sign-up flow. */
  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.base64) {
      setPhoto(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
    } else if (asset.uri) {
      setPhoto(asset.uri);
    }
    haptics.light();
  };

  const randomize = () => {
    setColor(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
    setEmoji(AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)]);
    haptics.light();
  };

  const save = async () => {
    haptics.light();
    await updateAvatar({
      color,
      emoji: emoji ?? undefined,
      avatarUrl: photo ?? undefined,
      frame,
    });
    onClose();
  };

  /** A ring is usable when it was bought with coins or while OnSpot+ runs. */
  const frameUnlocked = (key: string) => subscribed || isOwned(key);

  const pickFrame = (item: (typeof frames)[number]) => {
    setShortOf(null);
    if (frameUnlocked(item.key)) {
      setFrame(item.id);
      haptics.light();
      return;
    }
    if (buyItem(item.key, item.coins)) {
      setFrame(item.id);
      haptics.success();
      return;
    }
    setShortOf(item.coins - balance);
    haptics.error();
  };

  const plainFrames = frames.filter((f) => !f.animated);
  const animatedFrames = frames.filter((f) => f.animated);

  return (
    <View>
      {/* Preview first and big: every control below changes this one thing. */}
      <View className="mb-6 items-center">
        <Avatar name={name} avatarUrl={photo} color={color} emoji={emoji} frame={frame} size={104} />
        <Pressable
          onPress={randomize}
          accessibilityRole="button"
          accessibilityLabel="Zufälligen Avatar würfeln"
          className="mt-4 flex-row items-center gap-1.5 rounded-full px-3.5 py-2 active:opacity-70"
          style={{ backgroundColor: `${a.tone}1a` }}
        >
          <Dices size={13} color={a.tone} />
          <Text className="text-xs font-bold" style={{ color: a.tone }}>
            Zufällig
          </Text>
        </Pressable>
      </View>

      <SectionTitle>Foto</SectionTitle>
      {photo ? (
        <View className="mb-6 flex-row items-center gap-3 rounded-2xl bg-neutral-100 p-2.5 dark:bg-neutral-800/70">
          <Avatar name={name} avatarUrl={photo} size={38} />
          <Text className="flex-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            Eigenes Profilbild
          </Text>
          <Pressable
            onPress={() => void pickPhoto()}
            accessibilityRole="button"
            accessibilityLabel="Foto ersetzen"
            className="rounded-full px-3 py-1.5 active:opacity-70"
            style={{ backgroundColor: `${a.tone}1a` }}
          >
            <Text className="text-[11px] font-bold" style={{ color: a.tone }}>
              Ersetzen
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setPhoto(null);
              haptics.light();
            }}
            accessibilityRole="button"
            accessibilityLabel="Foto entfernen"
            className="rounded-full bg-neutral-200 px-3 py-1.5 active:opacity-70 dark:bg-neutral-700"
          >
            <Text className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300">Entfernen</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => void pickPhoto()}
          accessibilityRole="button"
          accessibilityLabel="Foto hochladen"
          className="mb-6 items-center rounded-2xl border border-dashed py-4 active:opacity-70"
          style={{ borderColor: `${a.tone}80`, backgroundColor: `${a.tone}0d` }}
        >
          <Text className="text-xs font-bold" style={{ color: a.tone }}>
            📷 Foto hochladen
          </Text>
          <Text className="mt-1 text-[10px] text-neutral-400 dark:text-neutral-500">
            Kostenlos – oder unten aus Farbe + Emoji bauen
          </Text>
        </Pressable>
      )}

      <SectionTitle>Farbe</SectionTitle>
      <View className="mb-6 flex-row flex-wrap gap-y-3">
        {AVATAR_COLORS.map((c) => {
          const active = color === c;
          return (
            <Pressable
              key={c}
              onPress={() => {
                setColor(c);
                haptics.light();
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`Farbe ${c}`}
              className="w-[12.5%] items-center justify-center"
            >
              <View
                className="h-8 w-8 items-center justify-center rounded-full"
                style={{
                  backgroundColor: c,
                  boxShadow: active ? `0 0 0 2px #ffffff, 0 0 0 4px ${c}` : '0 1px 3px rgba(0,0,0,0.25)',
                }}
              >
                {active && <Check size={14} color="#ffffff" strokeWidth={3} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle>Emoji</SectionTitle>
      <View className="mb-6 flex-row flex-wrap gap-y-3">
        {AVATAR_EMOJIS.map((e) => {
          const active = emoji === e;
          return (
            <Pressable
              key={e}
              onPress={() => {
                setEmoji(active ? null : e);
                haptics.light();
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`Emoji ${e}`}
              className="w-[12.5%] items-center justify-center"
            >
              <View
                className="h-8 w-8 items-center justify-center rounded-full"
                style={
                  active
                    ? { backgroundColor: `${a.tone}26`, borderWidth: 2, borderColor: a.tone }
                    : { backgroundColor: 'transparent', borderWidth: 2, borderColor: 'transparent' }
                }
              >
                <Text className="text-base">{e}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* The coin sink. Price is on the tile, so nothing is a surprise tap. */}
      <SectionTitle
        hint={
          <View className="flex-row items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1">
            <Text className="text-[11px] font-bold text-amber-500">🪙 {balance.toLocaleString('de-DE')}</Text>
          </View>
        }
      >
        Rahmen
      </SectionTitle>

      <View className="mb-3 flex-row flex-wrap gap-y-4">
        <FrameTile
          label="Ohne"
          active={frame === null}
          onPress={() => {
            setFrame(null);
            setShortOf(null);
            haptics.light();
          }}
        >
          <View
            className="h-14 w-14 items-center justify-center rounded-full border border-dashed"
            style={{ borderColor: frame === null ? a.tone : '#a3a3a3' }}
          >
            <Text className="text-[10px] font-bold text-neutral-400">–</Text>
          </View>
        </FrameTile>

        {plainFrames.map((item) => (
          <FrameTile
            key={item.key}
            label={item.name}
            price={frameUnlocked(item.key) ? undefined : item.coins}
            active={frame === item.id}
            onPress={() => pickFrame(item)}
          >
            <Avatar name={name} avatarUrl={photo} color={color} emoji={emoji} frame={item.id} size={48} />
            {!frameUnlocked(item.key) && <LockBadge />}
          </FrameTile>
        ))}
      </View>

      <View className="mb-2 flex-row items-center gap-1.5">
        <Sparkles size={12} color="#f59e0b" />
        <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-amber-500">Animiert</Text>
      </View>
      <View className="mb-3 flex-row flex-wrap gap-y-4">
        {animatedFrames.map((item) => (
          <FrameTile
            key={item.key}
            label={item.name}
            price={frameUnlocked(item.key) ? undefined : item.coins}
            active={frame === item.id}
            onPress={() => pickFrame(item)}
          >
            <Avatar name={name} avatarUrl={photo} color={color} emoji={emoji} frame={item.id} size={48} />
            {!frameUnlocked(item.key) && <LockBadge />}
          </FrameTile>
        ))}
      </View>

      {shortOf !== null && (
        <Text className="mb-3 text-center text-[11px] font-semibold text-red-500">
          Dir fehlen noch {shortOf.toLocaleString('de-DE')} Coins.
        </Text>
      )}

      {!subscribed && (
        <Pressable
          onPress={onOpenPaywall}
          accessibilityRole="button"
          accessibilityLabel="Mehr über OnSpot+ erfahren"
          className="mb-5 flex-row items-center gap-2.5 rounded-2xl px-4 py-3 active:opacity-70"
          style={{ backgroundColor: `${a.tone}14` }}
        >
          <Crown size={15} color={a.tone} />
          <Text className="flex-1 text-[11px] font-medium leading-4 text-neutral-600 dark:text-neutral-300">
            Mit OnSpot+ sind alle Rahmen freigeschaltet, solange das Abo läuft.
          </Text>
          <Text className="text-xs font-bold" style={{ color: a.tone }}>
            Mehr
          </Text>
        </Pressable>
      )}

      <PrimaryButton label="Speichern" onPress={() => void save()} className="mb-2" />
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Abbrechen"
        className="items-center py-2 active:opacity-60"
      >
        <Text className="text-sm text-neutral-500 dark:text-neutral-400">Abbrechen</Text>
      </Pressable>
    </View>
  );
}

/** Small dark scrim + padlock over a ring the user does not own yet. */
function LockBadge() {
  return (
    <View className="absolute inset-0 items-center justify-center">
      <View className="h-6 w-6 items-center justify-center rounded-full bg-neutral-950/70">
        <Lock size={11} color="#ffffff" />
      </View>
    </View>
  );
}

/** One ring option: preview on top, name under it, price under that. Fixed
 *  quarter-width columns so a row of three and a row of four still line up. */
function FrameTile({
  label,
  price,
  active,
  onPress,
  children,
}: {
  label: string;
  price?: number;
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const { accent } = usePrefs();
  const a = accentOf(accent);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={price !== undefined ? `${label}, ${price} Coins` : label}
      className="w-1/4 items-center active:opacity-70"
    >
      <View className="items-center justify-center">{children}</View>
      <Text
        numberOfLines={1}
        className="mt-1.5 w-full text-center text-[10px] font-bold"
        style={{ color: active ? a.tone : '#a3a3a3' }}
      >
        {label}
      </Text>
      {price !== undefined ? (
        <Text className="text-[10px] font-bold text-amber-500">{price.toLocaleString('de-DE')} 🪙</Text>
      ) : (
        <Text className="text-[10px] font-semibold text-emerald-500">{active ? 'aktiv' : 'frei'}</Text>
      )}
    </Pressable>
  );
}
