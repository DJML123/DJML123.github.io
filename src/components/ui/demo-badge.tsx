import { View } from 'react-native';

import { AppText as Text } from '@/components/ui/app-text';

/**
 * Marks content that is not real.
 *
 * OnSpot ships with a demo roster - creators, streams, events, viewer counts,
 * distances, follower numbers. All of it is invented, and until now the app
 * presented it exactly the way it would present live data: "26 LIVE JETZT",
 * "4.820" likes, "800 m" away, "128 dabei". On a page anyone on the internet
 * can open, that stops being placeholder content and becomes a claim about a
 * platform that does not exist yet.
 *
 * The fix is not to hide the demo data - an empty app demonstrates nothing -
 * but to label it. Every fabricated figure now sits next to a marker saying so.
 * That costs a little polish and buys the one thing a product cannot get back
 * once it is gone, which is being believed.
 */
export function DemoBadge({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  return (
    <View
      className="rounded-full px-2 py-[3px]"
      style={{
        backgroundColor: tone === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(120,120,130,0.16)',
        borderWidth: 1,
        borderColor: tone === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(120,120,130,0.3)',
      }}
    >
      <Text
        className="text-[9px] font-black uppercase tracking-[1.2px]"
        style={{ color: tone === 'dark' ? 'rgba(255,255,255,0.85)' : '#8a8a94' }}
      >
        Demo
      </Text>
    </View>
  );
}

/** The long form, for screens that have room to explain it once. */
export function DemoNote({ className = '' }: { className?: string }) {
  return (
    <Text className={`text-[11px] leading-4 text-neutral-500 ${className}`}>
      Hinweis: OnSpot ist im Aufbau. Creator, Streams, Events und alle Zahlen
      hier sind Beispieldaten – echte Karten- und Ortsdaten kommen von
      OpenStreetMap.
    </Text>
  );
}
