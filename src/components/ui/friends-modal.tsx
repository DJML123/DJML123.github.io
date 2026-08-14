import { Image } from 'expo-image';
import { MessageCircle, Search, UserPlus, Users } from '@/components/ui/icons';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/app-text';
import { CREATORS } from '@/constants/mock-data';
import { useAuth } from '@/constants/auth-context';
import { useSocial } from '@/constants/social-context';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';
import { AnimatedSegmented } from './animated-segmented';
import { BottomSheetModal } from './bottom-sheet-modal';
import { ChatModal } from './chat-modal';

/** `128400` -> `128K`. */
function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (n >= 100_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')}K`;
  return String(n);
}

/** "jetzt" / "14:32" / "Gestern" / "Mo" - the same ladder every messenger uses,
 *  because relative time is only useful while it is still short. */
function formatWhen(at: number): string {
  const diff = Date.now() - at;
  if (diff < 60_000) return 'jetzt';
  const today = new Date();
  const then = new Date(at);
  if (then.toDateString() === today.toDateString()) {
    return `${String(then.getHours()).padStart(2, '0')}:${String(then.getMinutes()).padStart(2, '0')}`;
  }
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (then.toDateString() === yesterday.toDateString()) return 'Gestern';
  return ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][then.getDay()];
}

/** Section caption in the avatar creator's idiom - small, upper-case, muted. */
function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-2.5 mt-1 text-[11px] font-bold uppercase tracking-[1.2px] text-neutral-400 dark:text-neutral-500">
      {children}
    </Text>
  );
}

function Avatar({ url, live, size = 46 }: { url: string; live?: boolean; size?: number }) {
  return (
    <View className="relative">
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
      />
      {live && (
        <View className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white bg-red-500 px-1 py-[1px] dark:border-neutral-900">
          <Text className="text-[7px] font-black uppercase leading-[9px] text-white">Live</Text>
        </View>
      )}
    </View>
  );
}

/**
 * Friends and chats, in one sheet.
 *
 * They used to be two unrelated things: a list of creators where "Chat" was one
 * of two small buttons on every row, and a full-screen thread that appeared
 * from nowhere with no way back to the other conversations. Nothing in the app
 * ever showed that a message had arrived, and nothing listed the conversations
 * you already had - to reopen a thread you had to remember whose row it was on.
 *
 * Now the sheet has the two tabs the content actually splits into. Chats is the
 * default whenever any conversation exists, because reopening a thread is the
 * frequent action and finding a new person to follow is the rare one.
 */
export function FriendsModal({
  visible,
  onClose,
  onBack,
  onRequestAuth,
}: {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void;
  onRequestAuth: () => void;
}) {
  const { isFollowing, toggleFollow, isBlocked, messages } = useSocial();
  const { canChat } = useAuth();
  const { accent } = usePrefs();
  const a = accentOf(accent);
  const [chatWith, setChatWith] = useState<string | null>(null);
  const [tab, setTab] = useState<'chats' | 'friends'>('chats');
  const [query, setQuery] = useState('');

  const visibleCreators = useMemo(() => CREATORS.filter((c) => !isBlocked(c.name)), [isBlocked]);

  /** Every thread that still has a message in it, newest first. */
  const threads = useMemo(() => {
    return Object.entries(messages)
      .map(([name, list]) => ({ name, last: list[list.length - 1] }))
      .filter((t) => t.last !== undefined && !isBlocked(t.name))
      .sort((x, y) => y.last.at - x.last.at);
  }, [messages, isBlocked]);

  const match = (name: string) => name.toLowerCase().includes(query.trim().toLowerCase());
  const followed = visibleCreators.filter((c) => isFollowing(c.name) && match(c.name));
  const suggested = visibleCreators
    .filter((c) => !isFollowing(c.name) && match(c.name))
    .sort((x, y) => y.followers - x.followers);

  const creatorOf = (name: string) => CREATORS.find((c) => c.name === name);

  return (
    <>
      <BottomSheetModal visible={visible} onClose={onClose} onBack={onBack} title="Freunde & Chats">
        <View className="mb-4">
          <AnimatedSegmented
            options={[
              { key: 'chats', label: threads.length > 0 ? `Chats (${threads.length})` : 'Chats', icon: MessageCircle },
              { key: 'friends', label: 'Freunde', icon: Users },
            ]}
            value={tab}
            onChange={setTab}
          />
        </View>

        {tab === 'chats' ? (
          threads.length === 0 ? (
            // An empty state that leads somewhere. "Noch keine Chats" on its own
            // is a dead end - the way out of it is the other tab, so the card
            // takes the user there rather than describing it.
            <View className="items-center rounded-3xl bg-neutral-100 px-6 py-9 dark:bg-neutral-800/60">
              <View
                className="h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${a.tone}26` }}
              >
                <MessageCircle size={22} color={a.tone} strokeWidth={2.3} />
              </View>
              <Text className="mt-3 text-sm font-bold text-neutral-900 dark:text-white">Noch keine Chats</Text>
              <Text className="mt-1 text-center text-[11px] leading-4 text-neutral-500 dark:text-neutral-400">
                Folge jemandem und schreib die erste Nachricht – Nachrichten verschwinden nach 24 Stunden.
              </Text>
              <Pressable
                onPress={() => setTab('friends')}
                className="mt-4 rounded-full px-4 py-2 active:opacity-80"
                style={{ backgroundColor: a.tone, boxShadow: `0 8px 20px -6px ${a.glow}` }}
              >
                <Text className="text-xs font-bold text-white">Leute finden</Text>
              </Pressable>
            </View>
          ) : (
            threads.map((t) => {
              const creator = creatorOf(t.name);
              return (
                <Pressable
                  key={t.name}
                  onPress={() => setChatWith(t.name)}
                  className="mb-2 flex-row items-center gap-3 rounded-2xl bg-neutral-100 p-3 active:opacity-70 dark:bg-neutral-800"
                >
                  <Avatar url={creator?.avatarUrl ?? ''} live={creator?.isLive} />
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-bold text-neutral-900 dark:text-white">{t.name}</Text>
                      <Text className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500">
                        {formatWhen(t.last.at)}
                      </Text>
                    </View>
                    <Text
                      numberOfLines={1}
                      className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400"
                    >
                      {t.last.from === 'me' ? 'Du: ' : ''}
                      {t.last.text}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )
        ) : (
          <>
            {/* One field for both lists below. With a worldwide creator roster,
                scrolling to find a name is the slow path. */}
            <View className="mb-4 flex-row items-center gap-2.5 rounded-2xl bg-neutral-100 px-3.5 py-2.5 dark:bg-neutral-800">
              <Search size={15} color="#9ca3af" strokeWidth={2.4} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Namen suchen"
                placeholderTextColor="#9ca3af"
                className="flex-1 text-sm text-neutral-900 dark:text-white"
              />
            </View>

            <SectionTitle>{`Du folgst (${followed.length})`}</SectionTitle>
            {followed.length === 0 && (
              <Text className="mb-4 text-xs text-neutral-400 dark:text-neutral-500">
                {query ? 'Kein Treffer.' : 'Noch niemandem gefolgt.'}
              </Text>
            )}
            {followed.map((c) => (
              <View
                key={c.name}
                className="mb-2 flex-row items-center gap-3 rounded-2xl bg-neutral-100 p-3 dark:bg-neutral-800"
              >
                <Avatar url={c.avatarUrl} live={c.isLive} />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-neutral-900 dark:text-white">{c.name}</Text>
                  <Text className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">
                    {c.flag} {c.city} · {formatFollowers(c.followers + 1)} Follower
                  </Text>
                </View>
                {/* An icon button, not a "Chat" pill: the row already carries
                    two actions and a name, and the pill made every row read as
                    a form. Unfollow moves into the thread's own header instead
                    of sitting one mis-tap away from starting a conversation. */}
                <Pressable
                  onPress={() => setChatWith(c.name)}
                  hitSlop={6}
                  className="h-10 w-10 items-center justify-center rounded-2xl active:opacity-70"
                  style={{ backgroundColor: `${a.tone}26` }}
                >
                  <MessageCircle size={17} color={a.tone} strokeWidth={2.4} />
                </Pressable>
                <Pressable
                  onPress={() => toggleFollow(c.name)}
                  className="rounded-full border border-black/10 px-3 py-1.5 active:opacity-70 dark:border-white/20"
                >
                  <Text className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                    Entfolgen
                  </Text>
                </Pressable>
              </View>
            ))}

            <SectionTitle>Vorschläge</SectionTitle>
            {suggested.length === 0 && (
              <Text className="mb-4 text-xs text-neutral-400 dark:text-neutral-500">Kein Treffer.</Text>
            )}
            {suggested.map((c) => (
              <View
                key={c.name}
                className="mb-2 flex-row items-center gap-3 rounded-2xl bg-neutral-100 p-3 dark:bg-neutral-800"
              >
                <Avatar url={c.avatarUrl} live={c.isLive} />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-neutral-900 dark:text-white">{c.name}</Text>
                  <Text className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">
                    {c.flag} {c.city} · {formatFollowers(c.followers)} Follower
                  </Text>
                </View>
                <Pressable
                  onPress={() => toggleFollow(c.name)}
                  className="flex-row items-center gap-1.5 rounded-full px-3.5 py-2 active:opacity-80"
                  style={{ backgroundColor: a.tone, boxShadow: `0 8px 20px -6px ${a.glow}` }}
                >
                  <UserPlus size={13} color="#ffffff" strokeWidth={2.6} />
                  <Text className="text-xs font-bold text-white">Folgen</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}
      </BottomSheetModal>

      {chatWith && (
        <ChatModal
          key={chatWith}
          name={chatWith}
          onClose={() => setChatWith(null)}
          locked={!canChat}
          onRequestAuth={() => {
            setChatWith(null);
            onClose();
            onRequestAuth();
          }}
        />
      )}
    </>
  );
}
