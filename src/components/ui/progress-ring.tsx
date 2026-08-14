import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';

/**
 * Circular progress meter with a soft glow behind the fill.
 *
 * Driven by requestAnimationFrame rather than `Animated.createAnimatedComponent`
 * wrapping an SVG `Circle`: on web that wrapper forwards RN-internal props
 * (`collapsable={false}`) straight onto the DOM node, which React rejects with
 * "Received `false` for a non-boolean attribute `collapsable`". Sweeping a
 * plain number through state avoids the wrapper entirely, and the ring only
 * animates on an actual value change, so the extra renders are bounded.
 */
export function ProgressRing({
  progress,
  size = 96,
  strokeWidth = 9,
  children,
}: {
  /** 0..1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}) {
  const { accent } = usePrefs();
  const a = accentOf(accent);
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = Math.max(0, Math.min(1, progress));
  const [value, setValue] = useState(target);
  // Resolved during render rather than written back from the effect: a settled
  // ring simply reads the target, no extra render pass needed.
  const shown = Math.abs(target - value) < 0.001 ? target : value;

  useEffect(() => {
    const from = value;
    const delta = target - from;
    if (Math.abs(delta) < 0.001) return;

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      // easeOutCubic - quick sweep, gentle landing.
      setValue(from + delta * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // `value` changes every frame and would restart the sweep on each tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const dashoffset = circumference * (1 - shown);

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(target * 100) }}
      accessibilityLabel="Fortschritt"
    >
      {/* -90° so the sweep starts at the top rather than at 3 o'clock. The
          rotation sits on a plain View rather than on <Svg> so the SVG element
          itself receives nothing but its own geometry props. */}
      <View style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#a1a1aa"
          strokeOpacity={0.22}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Glow: same arc, thicker and faint, sitting under the crisp fill. */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={a.tone}
          strokeOpacity={0.25}
          strokeWidth={strokeWidth + 8}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashoffset}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={a.tone}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashoffset}
        />
      </Svg>
      </View>
      {children}
    </View>
  );
}
