export type AccentKey =
  | 'violet'
  | 'blue'
  | 'indigo'
  | 'sky'
  | 'cyan'
  | 'teal'
  | 'emerald'
  | 'green'
  | 'lime'
  | 'amber'
  | 'orange'
  | 'red'
  | 'rose'
  | 'pink'
  | 'fuchsia'
  | 'slate';

export interface Accent {
  key: AccentKey;
  name: string;
  /** Gradient start (primary colour). */
  from: string;
  /** Gradient end. */
  to: string;
  /** Translucent tone for glows/shadows (rgba). */
  glow: string;
  /** Solid tone for icons, badges and the route line. */
  tone: string;
}

/** The pickable accent colours. The violet default is the brand; the others
 *  are chosen so `from`→`to` gradients keep enough contrast in both themes. */
export const ACCENTS: Accent[] = [
  { key: 'violet', name: 'Violett', from: '#8b5cf6', to: '#c026d3', glow: 'rgba(139,92,246,0.45)', tone: '#8b5cf6' },
  { key: 'blue', name: 'Blau', from: '#3b82f6', to: '#0ea5e9', glow: 'rgba(59,130,246,0.45)', tone: '#3b82f6' },
  { key: 'indigo', name: 'Indigo', from: '#6366f1', to: '#8b5cf6', glow: 'rgba(99,102,241,0.45)', tone: '#6366f1' },
  { key: 'sky', name: 'Himmelblau', from: '#38bdf8', to: '#818cf8', glow: 'rgba(56,189,248,0.45)', tone: '#38bdf8' },
  { key: 'cyan', name: 'Türkis', from: '#06b6d4', to: '#3b82f6', glow: 'rgba(6,182,212,0.45)', tone: '#06b6d4' },
  { key: 'teal', name: 'Petrol', from: '#14b8a6', to: '#0d9488', glow: 'rgba(20,184,166,0.45)', tone: '#14b8a6' },
  { key: 'emerald', name: 'Smaragd', from: '#10b981', to: '#14b8a6', glow: 'rgba(16,185,129,0.45)', tone: '#10b981' },
  { key: 'green', name: 'Grün', from: '#22c55e', to: '#16a34a', glow: 'rgba(34,197,94,0.45)', tone: '#22c55e' },
  { key: 'lime', name: 'Limette', from: '#84cc16', to: '#4d7c0f', glow: 'rgba(132,204,22,0.45)', tone: '#65a30d' },
  { key: 'amber', name: 'Bernstein', from: '#f59e0b', to: '#ea580c', glow: 'rgba(245,158,11,0.45)', tone: '#f59e0b' },
  { key: 'orange', name: 'Orange', from: '#f97316', to: '#ef4444', glow: 'rgba(249,115,22,0.45)', tone: '#f97316' },
  { key: 'red', name: 'Rot', from: '#ef4444', to: '#dc2626', glow: 'rgba(239,68,68,0.45)', tone: '#ef4444' },
  { key: 'rose', name: 'Rosa', from: '#f43f5e', to: '#e11d48', glow: 'rgba(244,63,94,0.45)', tone: '#f43f5e' },
  { key: 'pink', name: 'Pink', from: '#ec4899', to: '#f43f5e', glow: 'rgba(236,72,153,0.45)', tone: '#ec4899' },
  { key: 'fuchsia', name: 'Fuchsia', from: '#d946ef', to: '#a21caf', glow: 'rgba(217,70,239,0.45)', tone: '#d946ef' },
  { key: 'slate', name: 'Graphit', from: '#64748b', to: '#334155', glow: 'rgba(100,116,139,0.45)', tone: '#64748b' },
];

export const DEFAULT_ACCENT: AccentKey = 'violet';

/** Resolves a persisted key (possibly unknown from an older build) to a full
 *  palette, falling back to the brand violet. */
export function accentOf(key: AccentKey | undefined | null): Accent {
  return ACCENTS.find((a) => a.key === key) ?? ACCENTS[0];
}
