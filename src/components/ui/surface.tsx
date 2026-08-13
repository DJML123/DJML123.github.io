import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useColorScheme } from 'nativewind';

export type SurfaceVariant = 'regular' | 'thick';

/** Solid surface panel - the glass look is gone by decision: real backdrop
 *  blur across browsers/native turned out fragile and looked flat anyway, so
 *  the chrome sits on clean, solid cards instead (Google-Maps style). The
 *  variant prop survives for the material thickness it used to express, but
 *  only tune the border/shadow subtly now. */
export function Surface({
  children,
  style,
  className,
  variant = 'regular',
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; className?: string; variant?: SurfaceVariant }>) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme !== 'light';

  if (Platform.OS === 'web') {
    return (
      <View
        className={className}
        style={[
          styles.clip,
          isDark
            ? variant === 'thick'
              ? styles.webDarkThick
              : styles.webDark
            : variant === 'thick'
              ? styles.webLightThick
              : styles.webLight,
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <View
      className={className}
      style={[styles.clip, isDark ? styles.nativeDark : styles.nativeLight, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // overflow hidden lets the surface honour borderRadius on every platform.
  clip: { overflow: 'hidden' },
  webLight: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.14)',
  },
  webLightThick: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.10), 0 12px 32px rgba(0,0,0,0.16)',
  },
  webDark: {
    backgroundColor: '#1c1c22',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.30), 0 12px 32px rgba(0,0,0,0.40)',
  },
  webDarkThick: {
    backgroundColor: '#22222a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.30), 0 12px 32px rgba(0,0,0,0.42)',
  },
  nativeLight: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  nativeDark: {
    backgroundColor: '#1c1c22',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
});
