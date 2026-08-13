import { Image, type ImageProps } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton } from './skeleton';

/**
 * Avatar/photo with a shimmering placeholder underneath until the bytes land.
 * Every avatar in the app previously rendered as an empty hole while loading,
 * which on a slow connection is most of the first impression. The skeleton sits
 * behind the image rather than swapping with it, so there is no layout shift.
 */
export function SmartImage({ className, style, rounded = true, ...props }: ImageProps & { rounded?: boolean }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <View className={className} style={[style, styles.wrap]}>
      {!loaded && (
        <Skeleton
          className={rounded ? 'rounded-full' : 'rounded-2xl'}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}
      <Image
        {...props}
        style={StyleSheet.absoluteFill}
        contentFit={props.contentFit ?? 'cover'}
        transition={props.transition ?? 180}
        cachePolicy={props.cachePolicy ?? 'memory-disk'}
        onLoadEnd={() => setLoaded(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', position: 'relative' },
});
