import * as Haptics from 'expo-haptics';

/** Thin wrapper so screens can fire-and-forget haptic feedback without
 *  try/catch noise. expo-haptics supports iOS, Android and web (Vibration
 *  API); all calls are silently ignored where the hardware is missing. */
export const haptics = {
  tap() {
    Haptics.selectionAsync().catch(() => {});
  },
  light() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  success() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  error() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
};
