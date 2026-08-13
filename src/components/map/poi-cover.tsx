import { View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { SmartImage } from '@/components/ui/smart-image';
import { MAKI_GLYPHS } from './maki-glyphs';
import { poiVisual } from './poi-layer';

/**
 * The preview image for a place.
 *
 * Every shop the user opens has to show *something* - the reported "ich will,
 * dass jeder Laden ein Bild als Vorschau hat" - and OpenStreetMap carries a
 * photo for a low single-digit percentage of places, so a photo-or-nothing
 * card would be nothing almost every time. What it does carry for all of them
 * is a category, so the fallback is drawn from that: the same pictogram and the
 * same colour as the badge the user just tapped on the map, blown up into a
 * cover. It reads as deliberate artwork rather than a missing image, and it
 * confirms "yes, this is the thing you tapped" before a single word is read.
 *
 * The gradient is two stacked translucent layers rather than a LinearGradient:
 * NativeWind drops `className` on expo-linear-gradient in web builds, and this
 * needs to work identically on both platforms.
 */
export function PoiCover({
  poiClass,
  imageUrl,
  height = 132,
}: {
  poiClass?: string;
  /** A real photo, when OSM had one. Takes precedence over the pictogram. */
  imageUrl?: string;
  height?: number;
}) {
  const { color, glyph } = poiVisual(poiClass);
  const paths = MAKI_GLYPHS[glyph] ?? MAKI_GLYPHS.marker;

  if (imageUrl) {
    return (
      <View className="overflow-hidden rounded-2xl" style={{ height }}>
        <SmartImage source={{ uri: imageUrl }} className="h-full w-full" />
      </View>
    );
  }

  return (
    <View
      className="items-center justify-center overflow-hidden rounded-2xl"
      style={{ height, backgroundColor: color }}
    >
      {/* Highlight in the top-left corner and shade in the bottom-right, so
          the flat fill gets the same soft volume the app's other tiles have. */}
      <View
        className="absolute -left-8 -top-10 h-32 w-32 rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}
      />
      <View
        className="absolute -bottom-12 -right-6 h-28 w-28 rounded-full"
        style={{ backgroundColor: 'rgba(0,0,0,0.12)' }}
      />
      {/* The Maki glyphs are authored on a 15x15 grid. */}
      <Svg width={56} height={56} viewBox="0 0 15 15">
        <G>
          {paths.map((d, i) => (
            <Path key={i} d={d} fill="rgba(255,255,255,0.92)" />
          ))}
        </G>
      </Svg>
    </View>
  );
}
