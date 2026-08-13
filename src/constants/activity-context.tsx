import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { repo } from '@/services/repository';
import type { ActivityItem } from '@/services/types';

interface ActivityContextValue {
  activities: ActivityItem[];
}

const ActivityContext = createContext<ActivityContextValue | null>(null);

/** Read-only mirror of the repository's activity feed (follows, saved spots,
 *  donations, blocks). Every write happens in the repository, so the
 *  feed stays consistent no matter which screen triggered the action. */
export function ActivityProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<ActivityItem[]>(() => repo.getActivities());

  useEffect(() => {
    repo.ready().then(() => setActivities(repo.getActivities()));
    const unsubscribe = repo.subscribe(() => setActivities(repo.getActivities()));
    return unsubscribe;
  }, []);

  return <ActivityContext.Provider value={{ activities }}>{children}</ActivityContext.Provider>;
}

export function useActivity() {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error('useActivity must be used within ActivityProvider');
  return ctx;
}
