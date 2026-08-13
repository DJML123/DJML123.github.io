import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { repo } from '@/services/repository';

interface SavedContextValue {
  savedIds: string[];
  isSaved: (id: string) => boolean;
  toggleSaved: (id: string) => void;
}

const SavedContext = createContext<SavedContextValue | null>(null);

/** "Gespeicherte Orte" state, lifted out of the screen so the map card, the
 *  profile menu and the saved-spots modal all read the same persisted list. */
export function SavedProvider({ children }: { children: ReactNode }) {
  const [savedIds, setSavedIds] = useState<string[]>(() => repo.getSavedIds());

  useEffect(() => {
    repo.ready().then(() => setSavedIds(repo.getSavedIds()));
    const unsubscribe = repo.subscribe(() => setSavedIds(repo.getSavedIds()));
    return unsubscribe;
  }, []);

  const isSaved = (id: string) => savedIds.includes(id);
  const toggleSaved = (id: string) => repo.toggleSaved(id);

  return <SavedContext.Provider value={{ savedIds, isSaved, toggleSaved }}>{children}</SavedContext.Provider>;
}

export function useSaved() {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error('useSaved must be used within SavedProvider');
  return ctx;
}
