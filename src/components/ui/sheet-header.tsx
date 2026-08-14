import { ArrowLeft, X } from '@/components/ui/icons';
import { Pressable, View } from 'react-native';
import { AppText as Text } from '@/components/ui/app-text';

/**
 * Sheet header with a back affordance. Sub-menus are stacked over the profile
 * instead of replacing it: the back arrow closes only this sheet (the menu
 * underneath reappears), the X closes the whole chain.
 */
export function SheetHeader({
  title,
  subtitle,
  onBack,
  onClose,
}: {
  title: string;
  subtitle?: string;
  /** Closes only this sheet - the parent menu stays open underneath. */
  onBack?: () => void;
  /** Closes the whole modal chain. */
  onClose: () => void;
}) {
  return (
    <View className="mb-5 flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        {onBack && (
          <Pressable
            onPress={onBack}
            hitSlop={6}
            className="h-8 w-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
          >
            <ArrowLeft size={16} color="#71717a" />
          </Pressable>
        )}
        <View>
          <Text className="text-lg font-bold text-neutral-900 dark:text-white">{title}</Text>
          {subtitle && <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</Text>}
        </View>
      </View>
      <Pressable
        onPress={onClose}
        hitSlop={6}
        className="h-8 w-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
      >
        <X size={14} color="#71717a" />
      </Pressable>
    </View>
  );
}
