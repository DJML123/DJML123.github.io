import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomSheetModal } from './bottom-sheet-modal';
import { AppText as Text } from '@/components/ui/app-text';
import { Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Bell, Cloud, Coins, Gem, Info, Lock, Map, MapPin, MonitorPlay, Moon, Radio, Rocket, Ruler, Sun, Users, Wifi, type LucideIcon } from '@/components/ui/icons';
import { usePrefs } from '@/constants/prefs-context';
import { useSocial } from '@/constants/social-context';
import { ACCENTS, accentOf } from '@/constants/accent';
import { getSyncStatus, subscribeSyncStatus, type SyncStatus } from '@/services/sync';
import { AnimatedSegmented } from './animated-segmented';
import { AnimatedSwitch } from './animated-switch';
import { SettingsRow } from './settings-row';

const SYNC_LABEL: Record<SyncStatus, string> = {
  off: 'Lokal (kein Backend)',
  connecting: 'Verbinde …',
  synced: 'Synchronisiert ✓',
  error: 'Offline-Modus',
};

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View className="mt-3 rounded-2xl bg-neutral-100 px-4 py-4 dark:bg-neutral-800">{children}</View>;
}

function ToggleRow({
  icon: Icon,
  title,
  subtitle,
  value,
  onValueChange,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-1 flex-row items-center gap-3">
        <Icon size={18} color="#71717a" />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</Text>
          <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</Text>
        </View>
      </View>
      <AnimatedSwitch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function SubToggle({
  icon: Icon,
  label,
  value,
  onValueChange,
}: {
  icon: LucideIcon;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between py-2 pl-9">
      <View className="flex-row items-center gap-2">
        <Icon size={13} color="#71717a" />
        <Text className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{label}</Text>
      </View>
      <AnimatedSwitch value={value} onValueChange={onValueChange} />
    </View>
  );
}

export function SettingsModal({
  visible,
  onClose,
  onBack,
  isDark,
  onToggleTheme,
  onOpenFriends,
  onOpenSubscription,
}: {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenFriends: () => void;
  onOpenSubscription: () => void;
}) {
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [notifyLive, setNotifyLive] = useState(true);
  const [notifyFollowers, setNotifyFollowers] = useState(true);
  const [notifyCoins, setNotifyCoins] = useState(false);
  const [locationOn, setLocationOn] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);
  // Shared, not local: these are the two settings here that actually do
  // something - they drive the distance units in the bottom bar and the tab
  // the app opens on.
  const { units, setUnits, startTab, setStartTab, accent, setAccent } = usePrefs();
  const { following, subscribed } = useSocial();
  const accentPalette = accentOf(accent);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus());

  useEffect(() => subscribeSyncStatus(setSyncStatus), []);

  return (
    <BottomSheetModal visible={visible} onClose={onClose} onBack={onBack} title="Einstellungen">
          {/* Plus sits first and carries the gradient - it is the one row here
              that changes what the product does, and it used to be buried
              second-from-last between the units toggle and the about link. */}
          <SettingsRow index={0} visible={visible}>
            <Pressable onPress={onOpenSubscription} className="mt-3 active:opacity-90">
              <View
                className="relative overflow-hidden rounded-2xl p-4"
                style={{ boxShadow: `0 0 28px ${accentPalette.glow}` }}
              >
                <LinearGradient
                  colors={[accentPalette.from, accentPalette.to]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-white/20">
                    <Gem size={20} color="#ffffff" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-base font-black text-white">OnSpot Plus</Text>
                      {subscribed && (
                        <View className="rounded-full bg-white/25 px-2 py-0.5">
                          <Text className="text-[9px] font-black uppercase tracking-wider text-white">Aktiv</Text>
                        </View>
                      )}
                    </View>
                    <Text className="mt-0.5 text-[11px] leading-4 text-white/80">
                      {subscribed
                        ? 'Werbefrei, Abzeichen und früher Zugriff sind aktiv.'
                        : 'Werbefrei, Supporter-Badge, früher Zugriff – 4,99 €/Monat.'}
                    </Text>
                  </View>
                  <Text className="text-lg font-bold text-white/70">›</Text>
                </View>
              </View>
            </Pressable>
          </SettingsRow>

          <SettingsRow index={1} visible={visible}>
            <SectionCard>
              <Pressable onPress={onOpenFriends} className="flex-row items-center justify-between py-1">
                <View className="flex-row items-center gap-3">
                  <Users size={18} color="#71717a" />
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-white">Freunde</Text>
                </View>
                <Text className="text-xs text-neutral-400 dark:text-neutral-500">{following.length} folgst du ›</Text>
              </Pressable>
            </SectionCard>
          </SettingsRow>

          <SettingsRow index={2} visible={visible}>
            <SectionCard>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  {isDark ? <Moon size={18} color="#71717a" /> : <Sun size={18} color="#71717a" />}
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-white">Erscheinungsbild</Text>
                </View>
                <View className="w-36">
                  <AnimatedSegmented
                    options={[
                      { key: 'light', label: 'Hell', icon: Sun },
                      { key: 'dark', label: 'Dunkel', icon: Moon },
                    ]}
                    value={isDark ? 'dark' : 'light'}
                    onChange={(v) => {
                      if ((v === 'dark') !== isDark) onToggleTheme();
                    }}
                  />
                </View>
              </View>
            </SectionCard>
          </SettingsRow>

          <SettingsRow index={3} visible={visible}>
            <SectionCard>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <Gem size={18} color="#71717a" />
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-white">Akzentfarbe</Text>
                </View>
              </View>
              <View className="mt-3 flex-row flex-wrap justify-between gap-x-1 gap-y-3">
                {ACCENTS.map((a) => {
                  const active = accentOf(accent).key === a.key;
                  return (
                    <Pressable
                      key={a.key}
                      onPress={() => setAccent(a.key)}
                      hitSlop={4}
                      className="w-[11%] items-center justify-center"
                      accessibilityLabel={a.name}
                    >
                      <View
                        className="h-8 w-8 rounded-full"
                        style={{
                          backgroundColor: a.from,
                          borderWidth: active ? 2 : 1,
                          borderColor: active ? '#ffffff' : 'transparent',
                          boxShadow: active
                            ? `0 0 0 2px ${a.from}, 0 2px 8px ${a.glow}`
                            : '0 1px 3px rgba(0,0,0,0.2)',
                        }}
                      />
                      {active && (
                        <Text className="mt-0.5 text-center text-[9px] leading-tight font-bold text-neutral-900 dark:text-white">
                          {a.name}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </SectionCard>
          </SettingsRow>

          <SettingsRow index={4} visible={visible}>
            <SectionCard>
              <ToggleRow
                icon={Bell}
                title="Benachrichtigungen"
                subtitle="Push-Benachrichtigungen für Aktivität in deiner Nähe"
                value={notificationsOn}
                onValueChange={setNotificationsOn}
              />
              {notificationsOn && (
                <View className="mt-1 border-t border-black/5 pt-1 dark:border-white/10">
                  <SubToggle icon={Radio} label="Live-Events in der Nähe" value={notifyLive} onValueChange={setNotifyLive} />
                  <SubToggle icon={Users} label="Neue Follower" value={notifyFollowers} onValueChange={setNotifyFollowers} />
                  <SubToggle icon={Coins} label="Spenden" value={notifyCoins} onValueChange={setNotifyCoins} />
                </View>
              )}
            </SectionCard>
          </SettingsRow>

          <SettingsRow index={5} visible={visible}>
            <SectionCard>
              <ToggleRow
                icon={MapPin}
                title="Standort"
                subtitle="Wird für Vorschläge und Navigation in der Nähe verwendet"
                value={locationOn}
                onValueChange={setLocationOn}
              />
            </SectionCard>
          </SettingsRow>

          <SettingsRow index={6} visible={visible}>
            <SectionCard>
              <ToggleRow
                icon={Wifi}
                title="Datensparmodus"
                subtitle="Weniger Kartendetails und niedrigere Video-Qualität im Feed"
                value={dataSaver}
                onValueChange={setDataSaver}
              />
            </SectionCard>
          </SettingsRow>

          <SettingsRow index={7} visible={visible}>
            <SectionCard>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <Ruler size={18} color="#71717a" />
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-white">Einheiten</Text>
                </View>
                <View className="w-28">
                  <AnimatedSegmented
                    options={[
                      { key: 'km', label: 'km' },
                      { key: 'mi', label: 'mi' },
                    ]}
                    value={units}
                    onChange={setUnits}
                  />
                </View>
              </View>
            </SectionCard>
          </SettingsRow>

          <SettingsRow index={8} visible={visible}>
            <SectionCard>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <Rocket size={18} color="#71717a" />
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-white">Start auf</Text>
                </View>
                <View className="w-40">
                  <AnimatedSegmented
                    options={[
                      { key: 'map', label: 'Karte', icon: Map },
                      { key: 'video', label: 'Feed', icon: MonitorPlay },
                    ]}
                    value={startTab}
                    onChange={setStartTab}
                  />
                </View>
              </View>
            </SectionCard>
          </SettingsRow>

          <SettingsRow index={9} visible={visible}>
            <SectionCard>
              <Pressable
                onPress={() => Linking.openURL('https://github.com').catch(() => {})}
                className="flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-3">
                  <Info size={18} color="#71717a" />
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-white">Über OnSpot</Text>
                </View>
                <Text className="text-xs text-neutral-400 dark:text-neutral-500">Version 1.0.0 ›</Text>
              </Pressable>
              <View className="mt-3 flex-row items-center justify-between border-t border-black/5 pt-3 dark:border-white/10">
                <View className="flex-row items-center gap-3">
                  <Cloud size={18} color="#71717a" />
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-white">Backend-Sync</Text>
                </View>
                <Text className="text-xs text-neutral-400 dark:text-neutral-500">{SYNC_LABEL[syncStatus]}</Text>
              </View>
              <Pressable
                onPress={() => setPrivacyVisible(true)}
                className="mt-3 flex-row items-center justify-between border-t border-black/5 pt-3 dark:border-white/10"
              >
                <View className="flex-row items-center gap-3">
                  <Lock size={18} color="#71717a" />
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-white">Datenschutz</Text>
                </View>
                <Text className="text-xs text-neutral-400 dark:text-neutral-500">Details ›</Text>
              </Pressable>
            </SectionCard>
          </SettingsRow>
          

          {privacyVisible && (
            <Modal visible transparent animationType="fade" onRequestClose={() => setPrivacyVisible(false)}>
              <Pressable onPress={() => setPrivacyVisible(false)} className="flex-1 items-center justify-center bg-black/60 px-8">
                <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-3xl bg-white p-6 dark:bg-[#141419]">
                  <Text className="mb-3 text-lg font-bold text-neutral-900 dark:text-white">Datenschutz</Text>
                  <Text className="text-xs leading-5 text-neutral-600 dark:text-neutral-300">
                    Ohne konfiguriertes Backend bleiben Standort, Profil, Spenden,
                    Freundesliste und Chats ausschließlich lokal auf deinem Gerät (AsyncStorage). Ist ein
                    Supabase-Backend konfiguriert, wird der App-Zustand unter einem anonymen Pseudonym
                    (vom Server vergeben, keine E-Mail/Name nötig) verschlüsselt über HTTPS in die Cloud
                    synchronisiert.
                    {'\n\n'}
                    Kartendaten (OpenFreeMap/MapLibre) und Suchergebnisse (Photon/Nominatim) rufen
                    öffentliche OSM-Dienste auf; dabei können deine IP-Adresse und der angefragte
                    Kartenausschnitt an deren Betreiber übertragen werden.
                    {'\n\n'}
                    Du kannst alle lokalen Daten jederzeit löschen, indem du den App-Datenspeicher
                    zurücksetzt. In einer späteren Version mit eigenem Konto gilt eine eigene
                    Datenschutzerklärung.
                  </Text>
                  <Pressable
                    onPress={() => setPrivacyVisible(false)}
                    className="mt-4 items-center rounded-full py-2.5"
                    style={{ backgroundColor: accentPalette.tone }}
                  >
                    <Text className="text-sm font-bold text-white">Schließen</Text>
                  </Pressable>
                </Pressable>
              </Pressable>
            </Modal>
          )}
    </BottomSheetModal>
  );
}
