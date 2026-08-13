import { Component, type ReactNode } from 'react';
import { AppText as Text } from '@/components/ui/app-text';
import { View } from 'react-native';
export class MapErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View className="absolute inset-0 items-center justify-center bg-neutral-900">
          <Text className="text-white/70">Karte konnte nicht geladen werden.</Text>
          {__DEV__ && (
            <Text className="mt-2 max-w-xs text-center text-xs text-red-400">{this.state.error.message}</Text>
          )}
        </View>
      );
    }
    return this.props.children;
  }
}
