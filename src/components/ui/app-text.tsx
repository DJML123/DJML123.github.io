import { Animated, Text as NativeText, TextInput as NativeTextInput, type StyleProp, type TextInputProps, type TextProps, type TextStyle } from 'react-native';
/**
 * Sora-aware Text/TextInput.
 *
 * @expo-google-fonts registers each weight as its own family
 * (Sora_400Regular, Sora_700Bold, ...) and expo-font's loadAsync does not
 * support weight-mapped families, so RN's fontFamily + fontWeight pairing
 * would pick the wrong face. NativeWind 4 also compiles `font-bold` and
 * friends into CSS classes on web - the style prop carries no fontWeight -
 * so the weight has to come from the className string, with the inline style
 * as a fallback for native builds.
 *
 * Sora over Space Grotesk / Plus Jakarta Sans: it is the geometric grotesque
 * the Afterdark look is built on - squared terminals, a large x-height and
 * a strong 800 that keeps the oversized headlines deliberate instead of
 * synthetically bolded.
 */

const WEIGHT_BY_CLASS: Record<string, string> = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
};

const FONT_WEIGHTS: Record<string, string> = {
  '100': 'Sora_200ExtraLight',
  '200': 'Sora_200ExtraLight',
  '300': 'Sora_300Light',
  '400': 'Sora_400Regular',
  '500': 'Sora_500Medium',
  '600': 'Sora_600SemiBold',
  '700': 'Sora_700Bold',
  '800': 'Sora_800ExtraBold',
  '900': 'Sora_800ExtraBold',
};

function weightFromClassName(className?: string): string | null {
  if (!className) return null;
  const match = className.match(/font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)/);
  if (!match) return null;
  return WEIGHT_BY_CLASS[match[1]];
}

function resolveFontFamily(style?: StyleProp<TextStyle>, className?: string): string {
  const fromClass = weightFromClassName(className);
  if (fromClass) return FONT_WEIGHTS[fromClass];
  const flat = (Array.isArray(style) ? style : style ? [style] : []) as TextStyle[];
  for (let i = flat.length - 1; i >= 0; i--) {
    const entry = flat[i];
    if (!entry || typeof entry !== 'object') continue;
    const weight = (entry as TextStyle).fontWeight;
    if (weight != null && FONT_WEIGHTS[String(weight)]) return FONT_WEIGHTS[String(weight)];
  }
  return 'Sora_400Regular';
}

export function AppText(props: TextProps) {
  const { style, className, ...rest } = props;
  return <NativeText {...rest} className={className} style={[{ fontFamily: resolveFontFamily(style, className) }, style]} />;
}

export function AppTextInput(props: TextInputProps) {
  const { style, className, ...rest } = props;
  return <NativeTextInput {...rest} className={className} style={[{ fontFamily: resolveFontFamily(style, className) }, style]} />;
}

/** Animated.Text wrapped with Sora support (legacy name kept in docs - the
 *  font family was Outfit, then Space Grotesk, before the Afterdark switch). */
export const AnimatedOutfitText = Animated.createAnimatedComponent(AppText);
