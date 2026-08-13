import { Platform } from 'react-native';

/** expo-notifications is native-only (Android/iOS). On web the module has no
 *  implementation, so it is imported lazily behind a platform check - the web
 *  bundle must not even load it. */
async function notificationsModule(): Promise<typeof import('expo-notifications') | null> {
  if (Platform.OS === 'web') return null;
  try {
    const mod = await import('expo-notifications');
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    return mod;
  } catch {
    return null;
  }
}

export const notifications = {
  /** Asks for permission on first use; resolves to whether reminders may run. */
  async requestPermission(): Promise<boolean> {
    const mod = await notificationsModule();
    if (!mod) return false;
    try {
      if (Platform.OS === 'android') {
        await mod.setNotificationChannelAsync('events', {
          name: 'Events',
          importance: mod.AndroidImportance.HIGH,
        });
      }
      const { status } = await mod.requestPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  },

  /** Schedules a one-off local reminder `secondsFromNow` from now. */
  async scheduleReminder(title: string, body: string, secondsFromNow: number): Promise<void> {
    const mod = await notificationsModule();
    if (!mod) return;
    try {
      const channelId = Platform.OS === 'android' ? 'events' : undefined;
      await mod.scheduleNotificationAsync({
        content: { title, body },
        trigger: {
          type: mod.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsFromNow,
          channelId,
        },
      });
    } catch {
      // Reminders are best-effort; never break the interaction that scheduled them.
    }
  },

  /** Cancels everything the app scheduled (e.g. on logout). */
  async cancelAll(): Promise<void> {
    const mod = await notificationsModule();
    if (!mod) return;
    try {
      await mod.cancelAllScheduledNotificationsAsync();
    } catch {
      // best-effort
    }
  },
};
