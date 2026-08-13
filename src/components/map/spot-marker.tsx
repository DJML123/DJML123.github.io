import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import type { Spot } from '@/constants/mock-data';

/**
 * The event pictograms.
 *
 * Every one of these is now a **filled silhouette** on lucide's 24x24 grid.
 * The previous set was drawn as 2.5px outlines, which sounds fine until you do
 * the arithmetic: the glyph is scaled to 66% inside a 28px badge, so a 2.5px
 * stroke lands at about 1.1 real pixels. At that width an outline is a grey
 * suggestion of a shape, not a shape - which is why the music note "sieht
 * immernoch richtig schlecht aus" and the game controller read as a smudge.
 * A filled mass keeps its silhouette at any size, the same reason every mapping
 * product in the world draws its POI glyphs solid rather than outlined.
 *
 * Where a glyph needs interior detail (the controller's d-pad and buttons) it
 * is punched back out in the badge's own colour rather than left as a hole -
 * knockouts stay legible when the badge shrinks, thin white lines do not.
 */
function EventGlyph({ name, hex }: { name: string; hex: string }) {
  switch (name) {
    // Two beamed notes. A single note with a flag loses the flag first when it
    // shrinks and then reads as a lollipop; the beam is what makes the shape
    // unmistakably music even when the heads have merged into two dots.
    case 'music':
      return (
        <>
          <Path d="M9.4 4.9 19.6 2.6c.5-.12 1 .26 1 .78v2.5L9.4 8.4V4.9Z" fill="#ffffff" />
          <Rect x={8.4} y={5.4} width={1.9} height={10.6} fill="#ffffff" />
          <Rect x={18.7} y={3.1} width={1.9} height={9.4} fill="#ffffff" />
          <Circle cx={6.4} cy={16.6} r={3.1} fill="#ffffff" />
          <Circle cx={16.7} cy={13.1} r={3.1} fill="#ffffff" />
        </>
      );
    // A gamepad, not a joystick and not an emoji. The two grips flaring out at
    // the bottom are the part people recognise, so they carry most of the mass.
    case 'gaming':
      return (
        <>
          <Path
            d="M8.6 6.2h6.8a5.3 5.3 0 0 1 5.2 4.3l.86 4.7a2.45 2.45 0 0 1-4.45 1.83L15.5 15h-7l-1.51 2.03A2.45 2.45 0 0 1 2.54 15.2l.86-4.7A5.3 5.3 0 0 1 8.6 6.2Z"
            fill="#ffffff"
          />
          {/* D-pad and buttons, knocked out in the badge colour. */}
          <Rect x={6.2} y={10.3} width={4.4} height={1.5} rx={0.5} fill={hex} />
          <Rect x={7.65} y={8.85} width={1.5} height={4.4} rx={0.5} fill={hex} />
          <Circle cx={16.2} cy={10.4} r={1.05} fill={hex} />
          <Circle cx={18.3} cy={12.3} r={1.05} fill={hex} />
        </>
      );
    // Fork and knife, both solid. Built from rectangles so the tines stay
    // parallel and evenly spaced at every size instead of drifting the way
    // hand-fitted curves do.
    case 'food':
      return (
        <>
          <Rect x={5.2} y={2.6} width={1.4} height={5.2} rx={0.5} fill="#ffffff" />
          <Rect x={7.6} y={2.6} width={1.4} height={5.2} rx={0.5} fill="#ffffff" />
          <Rect x={10} y={2.6} width={1.4} height={5.2} rx={0.5} fill="#ffffff" />
          <Rect x={5.2} y={7.6} width={6.2} height={2} rx={1} fill="#ffffff" />
          <Rect x={7.4} y={9} width={1.8} height={12.4} rx={0.9} fill="#ffffff" />
          <Path d="M15.6 2.6c2.4 0 3.6 2.6 3.6 5.7 0 2.2-.9 3.6-2.1 4.1v8.1a1 1 0 0 1-2 0V2.6Z" fill="#ffffff" />
        </>
      );
    // A trophy, not a ball. A ball at this size is a plain white disc - the
    // seams that make it a football are exactly the thin lines that vanish -
    // whereas a cup silhouette is unambiguous down to a handful of pixels.
    case 'sports':
      return (
        <>
          <Path d="M7.6 2.6h8.8v5.1a4.4 4.4 0 0 1-8.8 0V2.6Z" fill="#ffffff" />
          <Path d="M6.4 3.8v3.5a3 3 0 0 1-1.9-2.8V3.8h1.9ZM17.6 3.8h1.9v.7a3 3 0 0 1-1.9 2.8V3.8Z" fill="#ffffff" />
          <Rect x={10.9} y={11.6} width={2.2} height={4} fill="#ffffff" />
          <Rect x={7.4} y={15.4} width={9.2} height={2.4} rx={1.2} fill="#ffffff" />
        </>
      );
    case 'meetup':
      return (
        <>
          <Circle cx={9.2} cy={7.8} r={3.4} fill="#ffffff" />
          <Path d="M3.2 20.4c0-3.2 2.7-5.6 6-5.6s6 2.4 6 5.6a.9.9 0 0 1-.9.9H4.1a.9.9 0 0 1-.9-.9Z" fill="#ffffff" />
          <Circle cx={17.2} cy={8.6} r={2.6} fill="#ffffff" />
          <Path d="M15.6 13.6c3.1-.5 5.9 1.5 5.9 4.6a.8.8 0 0 1-.8.8h-3.5c0-2.1-.6-4-1.6-5.4Z" fill="#ffffff" />
        </>
      );
    // A map pin with the hole punched through it (evenodd), which is what makes
    // it read as a pin rather than a teardrop.
    case 'place':
      return (
        <Path
          d="M12 2.2a7.2 7.2 0 0 0-7.2 7.2c0 5.3 6.4 11.7 6.68 11.97a.75.75 0 0 0 1.04 0C12.8 21.1 19.2 14.7 19.2 9.4A7.2 7.2 0 0 0 12 2.2Zm0 9.9a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4Z"
          fill="#ffffff"
          fillRule="evenodd"
        />
      );
    default:
      return <Circle cx={12} cy={12} r={5} fill="#ffffff" />;
  }
}

/** Event kinds, with the label and colour used everywhere they appear. The
 *  emoji table this replaces is gone: an emoji is a different typeface's
 *  artwork per platform, so the same event rendered as three different
 *  pictures depending on the device. */
export const KIND_HEX: Record<string, string> = {
  gaming: '#7350bd',
  music: '#c2417c',
  food: '#c9541f',
  sports: '#1f8a6d',
  meetup: '#3866c4',
};

export const KIND_LABEL: Record<string, string> = {
  gaming: 'Gaming',
  music: 'Musik',
  food: 'Essen',
  sports: 'Sport',
  meetup: 'Meetup',
};

const PLACE_HEX = '#3866c4';

/**
 * The glyph on its own, for use outside the map - the detail sheet's category
 * badge draws exactly the same artwork the user tapped, at whatever size the
 * caller needs.
 */
export function SpotGlyph({
  kind,
  size = 16,
  hex,
}: {
  kind: string;
  size?: number;
  /** Background the glyph sits on, so its knockouts match. */
  hex?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <EventGlyph name={kind} hex={hex ?? KIND_HEX[kind] ?? PLACE_HEX} />
    </Svg>
  );
}

/** Coloured badge circle with a white vector glyph, a thin white rim and a
 *  soft shadow - the Google Maps pin look, sharp at every zoom. */
function BadgePin({ glyph, hex, live, size = 32 }: { glyph: string; hex: string; live?: boolean; size?: number }) {
  return (
    <View className="items-center">
      <View
        className={`rounded-full bg-white p-[2px] shadow-md ${live ? 'border-2 border-red-500' : ''}`}
        style={{
          width: size,
          height: size,
          // Static halo on live badges - the marker reads as "lit" without the
          // constant ping animation, which read as noise on a map full of pins.
          boxShadow: live ? '0 0 14px 2px rgba(239,68,68,0.55)' : undefined,
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 28 28">
          <Circle cx={14} cy={14} r={12.5} fill={hex} stroke="#ffffff" strokeWidth={1.6} />
          {/* Every glyph above is drawn on lucide's 24x24 grid, but the badge
              is a 28x28 box - without this transform the artwork sat in the
              top-left corner and ran over the circle's edge. Centre it, then
              scale to ~64% so it clears the rim. */}
          <G transform="translate(14 14) scale(0.64) translate(-12 -12)">
            <EventGlyph name={glyph} hex={hex} />
          </G>
        </Svg>
      </View>
    </View>
  );
}

export function SpotMarker({ spot, onPress }: { spot: Spot; onPress: () => void }) {
  if (spot.type === 'streamer') {
    return (
      <Pressable onPress={onPress} className="items-center">
        {/* No ping ring: a map with several live streamers turned into a field
            of expanding circles. The red rim plus the static halo below already
            say "live" without anything moving. */}
        <View
          className={
            spot.isLive
              ? 'h-10 w-10 rounded-full border-2 border-red-500 p-[2px] shadow-md'
              : 'h-9 w-9 rounded-full border-2 border-white p-[2px] shadow-md dark:border-neutral-800'
          }
          style={
            spot.isLive
              ? { boxShadow: '0 0 16px 2px rgba(239,68,68,0.5)' }
              : undefined
          }
        >
          <Image
            source={{ uri: spot.avatarUrl }}
            className="h-full w-full rounded-full"
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
          />
        </View>
      </Pressable>
    );
  }

  if (spot.type === 'event') {
    return (
      <Pressable onPress={onPress} className="items-center">
        <BadgePin glyph={spot.eventKind ?? 'meetup'} hex={KIND_HEX[spot.eventKind ?? ''] ?? PLACE_HEX} live={spot.isLive} />
      </Pressable>
    );
  }

  // Places the user created or picked from search. Real map POIs are drawn from
  // the vector tiles instead (see poi-layer.ts), so this must stay a neutral
  // pin - it used to be a plate icon, which labelled every park and skatepark
  // a restaurant.
  return (
    <Pressable onPress={onPress} className="items-center">
      <BadgePin glyph="place" hex={PLACE_HEX} />
    </Pressable>
  );
}
