import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { repo } from '@/services/repository';
import type { ChatMessage } from '@/services/types';

interface SocialContextValue {
  isFollowing: (name: string) => boolean;
  /** Whether this user liked that feed item, and the toggle. */
  isLiked: (videoId: string) => boolean;
  toggleLike: (videoId: string) => void;
  toggleFollow: (name: string) => void;
  following: string[];
  isBlocked: (name: string) => boolean;
  blocked: string[];
  block: (name: string) => void;
  unblock: (name: string) => void;
  messages: Record<string, ChatMessage[]>;
  sendMessage: (name: string, text: string) => void;
  holdMessage: (thread: string, id: string) => void;
  subscribed: boolean;
  setSubscribed: (v: boolean) => void;
}

const SocialContext = createContext<SocialContextValue | null>(null);

/** Snap-style: chat messages auto-delete 24 h after sending unless held. */
const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000;

const CANNED_REPLIES = [
  'Hey! Bin gerade live, schau vorbei 👋',
  'Danke fürs Folgen! 🙌',
  'Bin in 10 Minuten wieder unterwegs.',
  'Cool, dass du dabei bist!',
];

/** All social state lives here (not per-component, e.g. video-feed-item used
 *  to keep its own local "following" boolean) so the Freunde list, the video
 *  feed's follow button, and the chat all agree on the same state. Persisted
 *  through the repository - follows, chats and blocks survive a reload. */
export function SocialProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => ({
    following: repo.getFollowing(),
    likedVideos: repo.getLikedVideos(),
    blocked: repo.getBlocked(),
    messages: repo.getMessages(),
    subscribed: repo.isSubscribed(),
  }));

  useEffect(() => {
    repo.ready().then(() => {
      setState({
        following: repo.getFollowing(),
        likedVideos: repo.getLikedVideos(),
        blocked: repo.getBlocked(),
        messages: repo.getMessages(),
        subscribed: repo.isSubscribed(),
      });
    });
    const unsubscribe = repo.subscribe(() =>
      setState({
        following: repo.getFollowing(),
        likedVideos: repo.getLikedVideos(),
        blocked: repo.getBlocked(),
        messages: repo.getMessages(),
        subscribed: repo.isSubscribed(),
      })
    );
    // Snap-style expiry: drop expired, non-held messages every minute. When
    // one actually expired the repository mutates, which fires the listener
    // above and re-renders consumers.
    const prune = setInterval(() => {
      repo.pruneExpiredMessages();
    }, 60_000);
    return () => {
      unsubscribe();
      clearInterval(prune);
    };
  }, []);

  const isFollowing = (name: string) => state.following.includes(name);
  const isLiked = (videoId: string) => state.likedVideos.includes(videoId);
  const toggleLike = (videoId: string) => repo.toggleLike(videoId);
  const isBlocked = (name: string) => state.blocked.includes(name);

  const toggleFollow = (name: string) => repo.toggleFollow(name);

  const block = (name: string) => repo.block(name);

  const unblock = (name: string) => repo.unblock(name);

  const sendMessage = (name: string, text: string) => {
    const mine: ChatMessage = { id: `m-${Date.now()}`, from: 'me', text, at: Date.now(), expiresAt: Date.now() + MESSAGE_TTL_MS };
    repo.appendMessage(name, mine);
    // A canned auto-reply after a short delay makes the thread feel alive
    // without a real backend - clearly not a real person responding.
    setTimeout(() => {
      const reply: ChatMessage = {
        id: `r-${Date.now()}`,
        from: 'them',
        text: CANNED_REPLIES[Math.floor(Math.random() * CANNED_REPLIES.length)],
        at: Date.now(),
        expiresAt: Date.now() + MESSAGE_TTL_MS,
      };
      repo.appendMessage(name, reply);
    }, 1200);
  };

  const holdMessage = (thread: string, id: string) => repo.holdMessage(thread, id);

  const setSubscribed = (v: boolean) => repo.setSubscribed(v);

  return (
    <SocialContext.Provider
      value={{
        isFollowing,
        isLiked,
        toggleLike,
        toggleFollow,
        following: state.following,
        isBlocked,
        blocked: state.blocked,
        block,
        unblock,
        messages: state.messages,
        sendMessage,
        holdMessage,
        subscribed: state.subscribed,
        setSubscribed,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used within SocialProvider');
  return ctx;
}
