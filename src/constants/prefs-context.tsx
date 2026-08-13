import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { repo } from '@/services/repository';
import type { Units } from '@/services/types';
import type { AccentKey } from './accent';
import type { ViewTab } from './mock-data';

export type { Units };

interface PrefsContextValue {
  units: Units;
  setUnits: (u: Units) => void;
  startTab: ViewTab;
  setStartTab: (t: ViewTab) => void;
  /** User-picked accent colour key - resolve it with `accentOf()`. */
  accent: AccentKey;
  setAccent: (a: AccentKey) => void;
  onboardingDone: boolean;
  setOnboardingDone: () => void;
  /** Viewer genres picked during onboarding - drives creator recommendations. */
  interests: string[];
  toggleInterest: (key: string) => void;
  /** Real per-day visit streak. */
  streak: { count: number };
  recordVisitDay: () => void;
  /** Streak milestone reached this session, published by the repository so it
   *  can be read during render instead of pushed into state from an effect. */
  milestone: number | null;
  clearMilestone: () => void;
  /** Epoch-ms end of the Plus trial, or null if none is running. */
  trialEndsAt: number | null;
  startTrial: () => void;
  /** True once the persisted state has been hydrated - gate the UI on this. */
  ready: boolean;
}

const PrefsContext = createContext<PrefsContextValue | null>(null);

/** Shared preferences. The settings screen only edits these - every consumer
 *  (bottom-bar distance units, the app's initial tab) reads the same values,
 *  so changing a setting actually does something. Persisted via repository. */
export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState(() => repo.getPrefs());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    repo.ready().then(() => {
      if (!mounted) return;
      setPrefs(repo.getPrefs());
      setReady(true);
    });
    const unsubscribe = repo.subscribe(() => setPrefs(repo.getPrefs()));
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <PrefsContext.Provider
      value={{
        units: prefs.units,
        setUnits: (u) => repo.setUnits(u),
        startTab: prefs.startTab,
        setStartTab: (t) => repo.setStartTab(t),
        accent: prefs.accent,
        setAccent: (a) => repo.setAccent(a),
        onboardingDone: prefs.onboardingDone,
        setOnboardingDone: () => repo.setOnboardingDone(),
        interests: prefs.interests,
        toggleInterest: (key) => repo.toggleInterest(key),
        streak: prefs.streak,
        recordVisitDay: () => repo.recordVisitDay(),
        milestone: prefs.milestone,
        clearMilestone: () => repo.clearPendingMilestone(),
        trialEndsAt: prefs.trialEndsAt,
        startTrial: () => repo.startTrial(),
        ready,
      }}
    >
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used within PrefsProvider');
  return ctx;
}
