import { Plus } from '@/components/ui/icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable } from 'react-native';
import { usePrefs } from '@/constants/prefs-context';
import { accentOf } from '@/constants/accent';

export function FabButton({ onPress, hidden = false }: { onPress: () => void; hidden?: boolean }) {
  const { accent } = usePrefs();
  const a = accentOf(accent);
  if (hidden) return null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Neuen Ort erstellen"
      className="absolute bottom-52 right-5 z-50 active:opacity-80"
    >
      <LinearGradient
        colors={[a.from, a.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        // className is dropped on expo-linear-gradient in web builds, so all
        // layout/shadow values live in style.
        style={{
          width: 56,
          height: 56,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          boxShadow: `0 0 20px ${a.glow}, 0 8px 24px rgba(0,0,0,0.35)`,
        }}
      >
        <Plus size={28} color="#ffffff" strokeWidth={2.5} />
      </LinearGradient>
    </Pressable>
  );
}
