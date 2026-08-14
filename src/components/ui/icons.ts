/**
 * Every Lucide icon the app uses, imported one file at a time.
 *
 * `import { Search } from 'lucide-react-native'` looks like it only costs one
 * icon, but the package's entry point re-exports all 3522 of them and Metro
 * does not tree-shake that barrel - measured against the production source map,
 * Lucide was 1320 KB of the 5.6 MB web bundle, more than a quarter of it, to
 * draw the few dozen glyphs below. The package publishes an `./icons/*` subpath
 * export, so naming each file directly brings in exactly what is used.
 *
 * Import icons from this module, never from 'lucide-react-native' - the only
 * exception is the `LucideIcon` type below, which is erased at compile time and
 * therefore free.
 */
export type { LucideIcon } from 'lucide-react-native';

export { default as Activity } from 'lucide-react-native/icons/activity';
export { default as Apple } from 'lucide-react-native/icons/apple';
export { default as ArrowLeft } from 'lucide-react-native/icons/arrow-left';
export { default as Bell } from 'lucide-react-native/icons/bell';
export { default as Bike } from 'lucide-react-native/icons/bike';
export { default as Bookmark } from 'lucide-react-native/icons/bookmark';
export { default as Car } from 'lucide-react-native/icons/car';
export { default as Check } from 'lucide-react-native/icons/check';
export { default as ChevronLeft } from 'lucide-react-native/icons/chevron-left';
export { default as Clock } from 'lucide-react-native/icons/clock';
export { default as Cloud } from 'lucide-react-native/icons/cloud';
export { default as Coins } from 'lucide-react-native/icons/coins';
export { default as Compass } from 'lucide-react-native/icons/compass';
export { default as CreditCard } from 'lucide-react-native/icons/credit-card';
export { default as Crosshair } from 'lucide-react-native/icons/crosshair';
export { default as Crown } from 'lucide-react-native/icons/crown';
export { default as Dices } from 'lucide-react-native/icons/dices';
export { default as Flame } from 'lucide-react-native/icons/flame';
export { default as Footprints } from 'lucide-react-native/icons/footprints';
export { default as Gem } from 'lucide-react-native/icons/gem';
export { default as Gift } from 'lucide-react-native/icons/gift';
export { default as Globe } from 'lucide-react-native/icons/globe';
export { default as Heart } from 'lucide-react-native/icons/heart';
export { default as ImagePlus } from 'lucide-react-native/icons/image-plus';
export { default as Info } from 'lucide-react-native/icons/info';
export { default as Loader } from 'lucide-react-native/icons/loader';
export { default as LocateFixed } from 'lucide-react-native/icons/locate-fixed';
export { default as Lock } from 'lucide-react-native/icons/lock';
export { default as LogOut } from 'lucide-react-native/icons/log-out';
export { default as MailCheck } from 'lucide-react-native/icons/mail-check';
export { default as Map } from 'lucide-react-native/icons/map';
export { default as MapPin } from 'lucide-react-native/icons/map-pin';
export { default as Medal } from 'lucide-react-native/icons/medal';
export { default as MessageCircle } from 'lucide-react-native/icons/message-circle';
export { default as MonitorPlay } from 'lucide-react-native/icons/monitor-play';
export { default as Moon } from 'lucide-react-native/icons/moon';
export { default as Phone } from 'lucide-react-native/icons/phone';
export { default as Pin } from 'lucide-react-native/icons/pin';
export { default as PinOff } from 'lucide-react-native/icons/pin-off';
export { default as Plus } from 'lucide-react-native/icons/plus';
export { default as Radio } from 'lucide-react-native/icons/radio';
export { default as Rocket } from 'lucide-react-native/icons/rocket';
export { default as Ruler } from 'lucide-react-native/icons/ruler';
export { default as Search } from 'lucide-react-native/icons/search';
export { default as SearchX } from 'lucide-react-native/icons/search-x';
export { default as Send } from 'lucide-react-native/icons/send';
export { default as Settings } from 'lucide-react-native/icons/settings';
export { default as Share2 } from 'lucide-react-native/icons/share-2';
export { default as ShieldAlert } from 'lucide-react-native/icons/shield-alert';
export { default as ShieldOff } from 'lucide-react-native/icons/shield-off';
export { default as Smartphone } from 'lucide-react-native/icons/smartphone';
export { default as Smile } from 'lucide-react-native/icons/smile';
export { default as Sparkles } from 'lucide-react-native/icons/sparkles';
export { default as Sun } from 'lucide-react-native/icons/sun';
export { default as Timer } from 'lucide-react-native/icons/timer';
export { default as Trash2 } from 'lucide-react-native/icons/trash-2';
export { default as TriangleAlert } from 'lucide-react-native/icons/triangle-alert';
export { default as Trophy } from 'lucide-react-native/icons/trophy';
export { default as User } from 'lucide-react-native/icons/user';
export { default as UserPlus } from 'lucide-react-native/icons/user-plus';
export { default as Users } from 'lucide-react-native/icons/users';
export { default as Wallet } from 'lucide-react-native/icons/wallet';
export { default as Wifi } from 'lucide-react-native/icons/wifi';
export { default as X } from 'lucide-react-native/icons/x';
