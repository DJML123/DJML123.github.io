import { useState } from 'react';
import { DialogIn } from './sheet-in';
import { ImagePlus, MailCheck, Trash2 } from '@/components/ui/icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/app-text';
import { useAuth } from '@/constants/auth-context';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';
import { isBackendConfigured } from '@/services/api';
import { haptics } from '@/services/haptics';
import { AuroraBackground } from './aurora-background';
import { Avatar } from './avatar';
import { PrimaryButton } from './primary-button';

/** Avatar colours offered on the first registration step. */
const AVATAR_COLORS = ['#8b5cf6', '#f97316', '#10b981', '#ef4444', '#0ea5e9'];

/** Emoji picker for the PFP creator - a photo is optional, so an emoji-on-
 *  color is the no-upload avatar that still looks deliberate. */
const AVATAR_EMOJIS = ['😎', '🦊', '🐼', '🚀', '⚡', '🔥', '🎧', '🌈'];

export function AuthModal({
  visible,
  onClose,
  onAuthenticated,
}: {
  visible: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}) {
  const { signUp, signIn, confirmVerification, resendVerification } = useAuth();
  const { accent } = usePrefs();
  const a = accentOf(accent);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  // 0 = "Du" (name + colour + avatar), 1 = "Konto" (credentials). Login skips this.
  const [step, setStep] = useState(0);
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [avatarEmoji, setAvatarEmoji] = useState<string | null>(null);
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(null);

  /** Uploaded photos become data URIs on web (a blob: URL would die on
   *  reload) and file URIs on native - both persist through the repo. */
  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.base64) {
      setAvatarPhoto(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
    } else if (asset.uri) {
      setAvatarPhoto(asset.uri);
    }
    haptics.light();
  };

  const resetForm = () => {
    setMode('login');
    setName('');
    setEmail('');
    setPassword('');
    setError(null);
    setPendingEmail(null);
    setResent(false);
    setStep(0);
    setAvatarColor(AVATAR_COLORS[0]);
    setAvatarEmoji(null);
    setAvatarPhoto(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const finish = () => {
    resetForm();
    onAuthenticated();
  };

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const result =
        mode === 'register'
          ? await signUp(email, password, name, { color: avatarColor, emoji: avatarEmoji ?? undefined, avatarUrl: avatarPhoto ?? undefined })
          : await signIn(email, password);
      if (!result.ok) {
        setError(result.error);
        haptics.error();
        return;
      }
      if (result.pendingVerification) {
        setPendingEmail(email.trim().toLowerCase());
        haptics.light();
        return;
      }
      haptics.success();
      finish();
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await confirmVerification();
      haptics.success();
      finish();
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!pendingEmail) return;
    await resendVerification(pendingEmail);
    setResent(true);
  };

  // Unmount instead of only hiding. React Native Web gives every <Modal> its
  // own portal, appended to the document in *mount* order - so a modal that
  // stays mounted from app start sits underneath every sheet opened later,
  // which is exactly why sign-up appeared behind the panel that opened it.
  // Mounting on demand puts it last in the document, i.e. on top.
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        {/* Decorative aurora behind the card - static here, the card is the
            focus; the onboarding gets the animated version. */}
        <AuroraBackground animated={false} />
        <DialogIn visible={visible}>
        <View className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#141419]">
          {pendingEmail ? (
            <View className="items-center py-4">
              <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: `${a.tone}1f` }}>
                <MailCheck size={28} color={a.tone} />
              </View>
              <Text className="mt-4 text-center text-lg font-bold text-neutral-900 dark:text-white">
                Bestätige deine E-Mail
              </Text>
              <Text className="mt-2 text-center text-xs leading-5 text-neutral-500 dark:text-neutral-400">
                Wir haben einen Bestätigungslink an {pendingEmail} gesendet. Nach dem Klick kannst du dich
                einloggen.
              </Text>

              {!isBackendConfigured() && (
                <PrimaryButton
                  label={busy ? 'Bitte warten …' : 'E-Mail bestätigen'}
                  onPress={confirm}
                  disabled={busy}
                  className="mt-5 w-full"
                />
              )}

              {isBackendConfigured() && (
                <PrimaryButton
                  label="E-Mail erneut senden"
                  onPress={resend}
                  disabled={busy}
                  className="mt-5 w-full"
                />
              )}
              {resent && (
                <Text className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                  Neue E-Mail gesendet – bitte Postfach prüfen.
                </Text>
              )}

              <Pressable onPress={handleClose} className="mt-3 items-center py-2">
                <Text className="text-sm text-neutral-500 dark:text-neutral-400">Später</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View className="mb-5 flex-row rounded-full bg-neutral-100 p-1.5 dark:bg-neutral-800">
                <Pressable
                  onPress={() => setMode('login')}
                  className={mode === 'login' ? 'relative flex-1 overflow-hidden rounded-full py-2.5' : 'flex-1 py-2.5'}
                  style={mode === 'login' ? { boxShadow: `0 4px 10px -2px ${a.glow}` } : undefined}
                >
                  {mode === 'login' && (
                    <LinearGradient
                      colors={[a.from, a.to]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <Text
                    className={
                      mode === 'login'
                        ? 'text-center text-sm font-bold text-white'
                        : 'text-center text-sm font-semibold text-neutral-500 dark:text-neutral-400'
                    }
                  >
                    Login
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode('register')}
                  className={mode === 'register' ? 'relative flex-1 overflow-hidden rounded-full py-2.5' : 'flex-1 py-2.5'}
                  style={mode === 'register' ? { boxShadow: `0 4px 10px -2px ${a.glow}` } : undefined}
                >
                  {mode === 'register' && (
                    <LinearGradient
                      colors={[a.from, a.to]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <Text
                    className={
                      mode === 'register'
                        ? 'text-center text-sm font-bold text-white'
                        : 'text-center text-sm font-semibold text-neutral-500 dark:text-neutral-400'
                    }
                  >
                    Registrieren
                  </Text>
                </Pressable>
              </View>

              {/* Registration is split so the first screen is the user's own:
                  they name themselves and pick a colour before being asked for
                  credentials. Having built something makes leaving feel like
                  abandoning it rather than skipping a form (IKEA effect). */}
              {mode === 'register' && (
                <View className="mb-4 flex-row items-center justify-center gap-2">
                  {['Du', 'Konto'].map((label, i) => (
                    <View key={label} className="flex-row items-center gap-2">
                      <View
                        className={i <= step ? 'h-2 w-2 rounded-full' : 'h-2 w-2 rounded-full bg-neutral-300 dark:bg-neutral-700'}
                        style={i <= step ? { backgroundColor: a.tone } : undefined}
                      />
                      <Text
                        className={
                          i <= step
                            ? 'text-[11px] font-bold'
                            : 'text-[11px] font-medium text-neutral-400 dark:text-neutral-500'
                        }
                        style={i <= step ? { color: a.tone } : undefined}
                      >
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {mode === 'register' && step === 0 ? (
                <>
                  {/* PFP creator: upload a photo, or build one from color +
                      emoji. The preview is the exact Avatar component used
                      everywhere else, so what the user sees here is what the
                      app will show. */}
                  <View className="mb-4 items-center">
                    <Avatar
                      name={name}
                      avatarUrl={avatarPhoto}
                      color={avatarColor}
                      emoji={avatarEmoji}
                      size={84}
                      border
                    />
                  </View>
                  <TextInput
                    placeholder="Wie heißt du?"
                    placeholderTextColor="#9ca3af"
                    value={name}
                    onChangeText={setName}
                    className="mb-3 rounded-2xl bg-neutral-100 px-4 py-3 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                  />
                  <Pressable
                    onPress={pickPhoto}
                    className="mb-4 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed py-3"
                    style={{ borderColor: a.tone }}
                  >
                    <ImagePlus size={16} color={a.tone} />
                    <Text className="text-xs font-semibold" style={{ color: a.tone }}>
                      {avatarPhoto ? 'Foto ersetzen' : 'Foto hochladen'}
                    </Text>
                    {avatarPhoto && (
                      <Pressable onPress={() => setAvatarPhoto(null)} hitSlop={8}>
                        <Trash2 size={14} color="#71717a" />
                      </Pressable>
                    )}
                  </Pressable>
                  <Text className="mb-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    Deine Farbe
                  </Text>
                  <View className="mb-3 flex-row justify-center gap-3">
                    {AVATAR_COLORS.map((c) => (
                      <Pressable
                        key={c}
                        onPress={() => setAvatarColor(c)}
                        className={
                          avatarColor === c
                            ? 'h-10 w-10 rounded-full border-[3px] border-neutral-900 dark:border-white'
                            : 'h-10 w-10 rounded-full'
                        }
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </View>
                  <Text className="mb-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    Dein Emoji
                  </Text>
                  {/* Fixed quarter-width columns instead of centred wrapping:
                      eight 36px chips plus gaps are wider than the card, so a
                      centred row broke into 6 + 2 and the short second row sat
                      off-grid. Four per row is two even rows. */}
                  <View className="mb-5 flex-row flex-wrap gap-y-2">
                    {AVATAR_EMOJIS.map((e) => (
                      <Pressable key={e} onPress={() => setAvatarEmoji(e)} className="w-1/4 items-center">
                        <View
                          className={
                            avatarEmoji === e
                              ? 'h-9 w-9 items-center justify-center rounded-full border-2'
                              : 'h-9 w-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800'
                          }
                          style={
                            avatarEmoji === e
                              ? { borderColor: a.tone, backgroundColor: `${a.tone}1f` }
                              : undefined
                          }
                        >
                          <Text className="text-base">{e}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                  <PrimaryButton
                    label="Weiter"
                    onPress={() => setStep(1)}
                    disabled={!name.trim()}
                    className="mb-3"
                  />
                  <Pressable onPress={handleClose} className="items-center py-2">
                    <Text className="text-sm text-neutral-500 dark:text-neutral-400">Abbrechen</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <TextInput
                    placeholder="E-Mail"
                    placeholderTextColor="#9ca3af"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    className="mb-3 rounded-2xl bg-neutral-100 px-4 py-3 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                  />
                  <TextInput
                    placeholder="Passwort"
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    className="mb-2 rounded-2xl bg-neutral-100 px-4 py-3 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                  />

                  {error && <Text className="mb-3 text-xs text-red-500">{error}</Text>}

                  <PrimaryButton
                    label={busy ? 'Bitte warten …' : mode === 'login' ? 'Einloggen' : 'Konto erstellen'}
                    onPress={submit}
                    disabled={busy}
                    className="mb-3"
                  />
                  {mode === 'register' ? (
                    <Pressable onPress={() => setStep(0)} className="items-center py-2">
                      <Text className="text-sm text-neutral-500 dark:text-neutral-400">Zurück</Text>
                    </Pressable>
                  ) : (
                    <Pressable onPress={handleClose} className="items-center py-2">
                      <Text className="text-sm text-neutral-500 dark:text-neutral-400">Abbrechen</Text>
                    </Pressable>
                  )}
                </>
              )}
            </>
          )}
        </View>
        </DialogIn>
      </View>
    </Modal>
  );
}
