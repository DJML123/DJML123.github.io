import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  confirmDemoVerification,
  getAuth,
  initAuth,
  resendVerification,
  signIn as authSignIn,
  signOut as authSignOut,
  signUp as authSignUp,
  subscribeAuth,
  updateAvatar as authUpdateAvatar,
  type AuthResult,
  type AuthSnapshot,
  type AuthStatus,
  type AvatarSelection,
} from '@/services/auth';

interface AuthContextValue extends AuthSnapshot {
  /** Chat gate: only email-verified accounts can chat. */
  canChat: boolean;
  signUp: (email: string, password: string, name: string, avatar?: AvatarSelection) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  updateAvatar: (avatar: AvatarSelection) => Promise<void>;
  confirmVerification: () => Promise<void>;
  resendVerification: (email: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Single source of truth for the login state: mirrors src/services/auth.ts
 *  (which itself mirrors the Supabase session) into React state. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<AuthSnapshot>(() => getAuth());

  useEffect(() => {
    initAuth();
    const unsubscribe = subscribeAuth(setSnap);
    return unsubscribe;
  }, []);

  const value: AuthContextValue = {
    ...snap,
    canChat: snap.status === 'verified',
    signUp: authSignUp,
    signIn: authSignIn,
    signOut: authSignOut,
    updateAvatar: authUpdateAvatar,
    confirmVerification: confirmDemoVerification,
    resendVerification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export type { AuthStatus };
