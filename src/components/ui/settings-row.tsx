import { useEffect, useState } from 'react';
import { Animated } from 'react-native';

/**
 * Fades and slides a settings section up into place, staggered by `index`
 * from when the modal opens - the small delay-cascade between rows is what
 * makes a settings screen feel considered rather than just "on/off, all
 * at once".
 */
export function SettingsRow({
  index,
  visible,
  children,
}: {
  index: number;
  visible: boolean;
  children: React.ReactNode;
}) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) {
      progress.setValue(0);
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: 320,
      delay: 60 + index * 45,
      useNativeDriver: true,
    }).start();
  }, [visible, index, progress]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}
