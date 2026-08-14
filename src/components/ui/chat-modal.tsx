import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/app-text';
import { ChevronLeft, Lock, Pin, PinOff, Send, Timer } from '@/components/ui/icons';
import { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { avatar } from '@/constants/mock-data';
import { useSocial } from '@/constants/social-context';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';

/** "Noch 23 Std" / "Noch 45 Min" / "Noch <1 Min" - the Snap-style countdown
 *  until a message self-deletes (held messages have no countdown). */
function formatRemaining(ms: number): string {
  const min = Math.max(0, Math.ceil(ms / 60_000));
  if (min < 1) return 'Noch <1 Min';
  if (min < 60) return `Noch ${min} Min`;
  const h = Math.max(1, Math.round(min / 60));
  return `Noch ${h} Std`;
}
/** One-on-one thread with a followed creator. Messages are local/mock only -
 *  the "reply" is a canned auto-response (social-context.tsx), not a real
 *  person. When `locked`, the chat is replaced by the email-verification
 *  gate - chatting requires a verified account. */
export function ChatModal({
  name,
  onClose,
  locked,
  onRequestAuth,
}: {
  name: string | null;
  onClose: () => void;
  locked: boolean;
  onRequestAuth: () => void;
}) {
  if (!name) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      {/* Locked no longer means a wall. The thread is fully readable and only
          sending is gated - the user gets something real before being asked for
          anything (reciprocity). A blank "create an account to continue" screen
          takes the value hostage and is the single biggest drop-off point. */}
      <ChatThread name={name} onClose={onClose} locked={locked} onRequestAuth={onRequestAuth} />
    </Modal>
  );
}

function ChatThread({
  name,
  onClose,
  locked,
  onRequestAuth,
}: {
  name: string;
  onClose: () => void;
  locked: boolean;
  onRequestAuth: () => void;
}) {
  const { messages, sendMessage, holdMessage, isFollowing, toggleFollow } = useSocial();
  const { accent } = usePrefs();
  const a = accentOf(accent);
  const [draft, setDraft] = useState('');
  // Re-render every 30 s so expiry countdowns stay honest without the thread
  // spinning forever; the repository also prunes on a 60 s timer.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const thread = (messages[name] ?? []).filter((m) => m.held || m.expiresAt > now);

  const send = () => {
    if (!draft.trim()) return;
    sendMessage(name, draft.trim());
    setDraft('');
  };

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <View className="flex-row items-center gap-3 border-b border-black/5 px-4 pb-3 pt-14 dark:border-white/10">
        <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
          <ChevronLeft size={20} color="#52525b" />
        </Pressable>
        <Image
          source={{ uri: avatar(name) }}
          className="h-9 w-9 rounded-full"
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
        />
        <View className="flex-1">
          <Text className="text-base font-bold text-neutral-900 dark:text-white">{name}</Text>
          <Text className="text-[10px] text-neutral-400 dark:text-neutral-500">Nachrichten verschwinden nach 24 h</Text>
        </View>
        {/* Follow state belongs here rather than on the list row it used to sit
            on: in the list it was a second button one mis-tap from "Chat", and
            here it is where you are when you decide you have had enough of
            someone. */}
        <Pressable
          onPress={() => toggleFollow(name)}
          className="rounded-full px-3 py-1.5 active:opacity-70"
          style={
            isFollowing(name)
              ? { borderWidth: 1, borderColor: 'rgba(120,120,130,0.35)' }
              : { backgroundColor: a.tone }
          }
        >
          <Text
            className="text-[11px] font-bold"
            style={{ color: isFollowing(name) ? '#8a8a94' : '#ffffff' }}
          >
            {isFollowing(name) ? 'Entfolgen' : 'Folgen'}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={thread}
        keyExtractor={(m) => m.id}
        contentContainerClassName="gap-2 p-4"
        renderItem={({ item }) => (
          <View className={item.from === 'me' ? 'items-end' : 'items-start'}>
            <View
              className={
                item.from === 'me'
                  ? 'max-w-[75%] rounded-2xl rounded-br-sm px-3.5 py-2'
                  : 'max-w-[75%] rounded-2xl rounded-bl-sm bg-neutral-100 px-3.5 py-2 dark:bg-neutral-800'
              }
              style={item.from === 'me' ? { backgroundColor: a.tone } : undefined}
            >
              <Text className={item.from === 'me' ? 'text-sm text-white' : 'text-sm text-neutral-900 dark:text-white'}>
                {item.text}
              </Text>
            </View>
            <View className="mt-0.5 flex-row items-center gap-2 px-1">
              {item.held ? (
                <Text className="text-[10px]" style={{ color: a.tone }}>Gehalten</Text>
              ) : (
                <View className="flex-row items-center gap-1">
                  <Timer size={10} color="#a1a1aa" />
                  <Text className="text-[10px] text-neutral-400 dark:text-neutral-500">
                    {formatRemaining(item.expiresAt - now)}
                  </Text>
                </View>
              )}
              <Pressable
                onPress={() => holdMessage(name, item.id)}
                className="flex-row items-center gap-1 rounded-full bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800"
                hitSlop={6}
              >
                {item.held ? <Pin size={10} color={a.tone} /> : <PinOff size={10} color="#a1a1aa" />}
                <Text className="text-[10px] text-neutral-500 dark:text-neutral-400">
                  {item.held ? 'Lösen' : 'Halten'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text className="mt-10 text-center text-sm text-neutral-400 dark:text-neutral-500">
            Schreib {name} eine Nachricht
          </Text>
        }
      />

      {locked ? (
        <View className="border-t border-black/5 p-4 pb-8 dark:border-white/10">
          <View className="flex-row items-center gap-2">
            <Lock size={14} color={a.tone} />
            <Text className="flex-1 text-xs text-neutral-500 dark:text-neutral-400">
              Mitlesen geht ohne Konto. Zum Antworten brauchst du eine bestätigte E-Mail.
            </Text>
          </View>
          <Pressable
            onPress={onRequestAuth}
            className="relative mt-3 items-center overflow-hidden rounded-full py-3"
            style={{ boxShadow: `0 10px 15px -3px ${a.glow}` }}
          >
            <LinearGradient
              colors={[a.from, a.to]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text className="text-sm font-bold text-white">Konto erstellen und antworten</Text>
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View className="flex-row items-center gap-2 border-t border-black/5 p-3 pb-8 dark:border-white/10">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={send}
              placeholder="Nachricht schreiben..."
              placeholderTextColor="#9ca3af"
              className="flex-1 rounded-full bg-neutral-100 px-4 py-2.5 text-sm text-neutral-900 dark:bg-neutral-800 dark:text-white"
            />
            <Pressable onPress={send} className="relative h-10 w-10 items-center justify-center overflow-hidden rounded-full" style={{ boxShadow: `0 10px 15px -3px ${a.glow}` }}>
              <LinearGradient
                colors={[a.from, a.to]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Send size={16} color="#ffffff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
