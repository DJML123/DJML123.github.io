import '@/global.css';

import {
  Sora_200ExtraLight,
  Sora_300Light,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';
import * as Font from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ActivityProvider } from '@/constants/activity-context';
import { AuthProvider } from '@/constants/auth-context';
import { CoinsProvider } from '@/constants/coins-context';
import { DonationsProvider } from '@/constants/donations-context';
import { PrefsProvider } from '@/constants/prefs-context';
import { SavedProvider } from '@/constants/saved-context';
import { SocialProvider } from '@/constants/social-context';
import { initSync } from '@/services/sync';

/** Each weight registers as its own family (AppText picks the right one
 *  based on the fontWeight in the style). */
async function loadAppFont() {
  await Font.loadAsync({
    Sora_200ExtraLight,
    Sora_300Light,
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });
}

// On web there is no native splash screen to keep; only hide it there.
if (Platform.OS !== 'web') SplashScreen.preventAutoHideAsync();

/** Starts the backend bridge once. No-op until Supabase is configured. */
function SyncBridge() {
  useEffect(() => {
    void initSync();
  }, []);
  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadAppFont()
      .catch((err) => console.warn('[onspot] App-Font konnte nicht geladen werden:', err))
      .finally(() => {
        if (!cancelled) setFontsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded && Platform.OS !== 'web') SplashScreen.hideAsync();
  }, [fontsLoaded]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <DonationsProvider>
          <CoinsProvider>
            <SocialProvider>
              <PrefsProvider>
                <SavedProvider>
                  <ActivityProvider>
                    <AnimatedSplashOverlay />
                    <SyncBridge />
                    <Stack screenOptions={{ headerShown: false }} />
                  </ActivityProvider>
                </SavedProvider>
              </PrefsProvider>
            </SocialProvider>
          </CoinsProvider>
        </DonationsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
