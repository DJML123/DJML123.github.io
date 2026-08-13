import { useEffect, useState } from 'react';
import { AppText as Text } from '@/components/ui/app-text';
import type { TextProps } from 'react-native';

/**
 * Rolls a number up to its new value instead of snapping to it. Viewer counts,
 * donation totals and follower numbers all changed by replacing the text in
 * place, which reads as a glitch rather than as something happening.
 *
 * Driven by requestAnimationFrame rather than Animated: the value has to end up
 * inside a Text child, and Animated.Value can't be interpolated into one
 * without a listener + setState round-trip anyway.
 */
export function CountUp({
  value,
  duration = 700,
  format = (n: number) => n.toLocaleString('de-DE'),
  ...textProps
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
} & TextProps) {
  const [display, setDisplay] = useState(value);
  // Mount and tiny deltas shouldn't animate - a "1" counting up from 0 is
  // slower to read than just showing it. Resolved during render rather than by
  // writing state from the effect, which would cost an extra render pass.
  const shown = Math.abs(value - display) < 2 ? value : display;

  useEffect(() => {
    const from = display;
    const delta = value - from;
    if (Math.abs(delta) < 2) return;

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic - fast start, gentle landing.
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + delta * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // `display` is deliberately not a dependency: it changes every frame and
    // would restart the animation on each tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <Text {...textProps}>{format(shown)}</Text>;
}
