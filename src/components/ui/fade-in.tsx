import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Tab-switch transition: the incoming view slides up slightly while fading
 * in. A pure crossfade reads as a screen changing; the small slide gives the
 * eye a direction of travel, which is what makes it feel like navigation
 * rather than a glitch.
 *
 * The transform is dropped once the animation finishes: React Native Web
 * leaves the end state (`translateY(0px)`) in the DOM forever, and any
 * transform on an ancestor creates a new backdrop root, which makes Chrome
 * silently drop the backdrop-filter of every glass surface below it - the
 * frosted look turns into plain transparency.
 */
export function FadeIn({ id, children }: { id: string | number; children: React.ReactNode }) {
  const [progress] = useState(() => new Animated.Value(0));
  const [entered, setEntered] = useState(true);

  useEffect(() => {
    progress.setValue(0);
    // Deliberately synchronous: the slide must re-arm before the animation
    // restarts, otherwise the transform would never re-engage on the next
    // tab switch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntered(false);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start(() => setEntered(true));
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: progress,
        ...(entered ? {} : { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }),
      }}
    >
      {children}
    </Animated.View>
  );
}
