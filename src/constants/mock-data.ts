export type ViewTab = 'map' | 'video';
export type Category =
  | 'all'
  | 'live'
  | 'gaming'
  | 'food'
  | 'drinks'
  | 'coffee'
  | 'bakery'
  | 'groceries'
  | 'shopping'
  | 'culture'
  | 'sport'
  | 'outdoors'
  | 'lodging'
  | 'health'
  | 'beauty'
  | 'finance'
  | 'auto';

export type SpotType = 'streamer' | 'event' | 'place';

export type EventKind = 'gaming' | 'music' | 'food' | 'sports' | 'meetup';

export interface Coordinates {
  lng: number;
  lat: number;
}

export interface PlaceDetails {
  openingHours?: string;
  phone?: string;
  website?: string;
  cuisine?: string;
  /** A real photo of the place, when OSM happens to carry one. Most places do
   *  not, which is why the preview never depends on it - see PoiCover. */
  imageUrl?: string;
}

export interface Spot {
  id: string;
  type: SpotType;
  title: string;
  subtitle: string;
  coords: Coordinates;
  avatarUrl: string;
  isLive?: boolean;
  category: Category;
  eventKind?: EventKind;
  attendeeAvatars?: string[];
  distanceMeters?: number;
  viewers?: number;
  details?: PlaceDetails;
  /** OpenMapTiles `class` for spots that came from a map POI, so the preview
   *  can be drawn in that category's colour and pictogram. */
  poiClass?: string;
}

export interface VideoFeedItem {
  id: string;
  spotId: string;
  title: string;
  authorName: string;
  authorAvatar: string;
  videoThumbnail: string;
  isLive: boolean;
  distanceMeters: number;
  attendeeAvatars: string[];
  attendeeCount: number;
  /** Likes this clip already had before you opened it. Demo content, same as
   *  the attendee count - your own like is added on top and is the real,
   *  persisted part. */
  likes: number;
}

function hashSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

// pravatar.cc serves 70 real-looking stock portrait photos (1-70), deterministic per seed.
export const avatar = (seed: string) => `https://i.pravatar.cc/150?img=${(hashSeed(seed) % 70) + 1}`;
const thumb = (seed: string) => `https://picsum.photos/seed/${seed}/400/700`;

export const SPOTS: Spot[] = [
  {
    id: 'spot-1',
    type: 'streamer',
    title: 'LiveWithMax',
    subtitle: 'Streetfood Tour • Potsdamer Platz',
    coords: { lng: 13.3759, lat: 52.5096 },
    avatarUrl: avatar('max'),
    isLive: true,
    category: 'live',
    viewers: 1240,
    distanceMeters: 600,
  },
  {
    id: 'spot-2',
    type: 'event',
    title: 'Retro Gaming Night',
    subtitle: 'Arcade Bar • Kreuzberg',
    coords: { lng: 13.4132, lat: 52.4996 },
    avatarUrl: avatar('gaming-night'),
    category: 'gaming',
    eventKind: 'gaming',
    attendeeAvatars: [avatar('a1'), avatar('a2'), avatar('a3')],
    distanceMeters: 1200,
  },
  {
    id: 'spot-4',
    type: 'streamer',
    title: 'NightRiderTV',
    subtitle: 'City Bike Tour • Live',
    coords: { lng: 13.4050, lat: 52.5250 },
    avatarUrl: avatar('nightrider'),
    isLive: true,
    category: 'live',
    viewers: 342,
    distanceMeters: 2100,
  },
  {
    id: 'spot-5',
    type: 'event',
    title: 'Open Air Konzert',
    subtitle: 'Mauerpark • Heute 19:00',
    coords: { lng: 13.4020, lat: 52.5410 },
    avatarUrl: avatar('concert'),
    category: 'culture',
    eventKind: 'music',
    attendeeAvatars: [avatar('b1'), avatar('b2'), avatar('b3'), avatar('b4')],
    distanceMeters: 2900,
  },
];

export const VIDEO_FEED: VideoFeedItem[] = [
  {
    id: 'video-1',
    spotId: 'spot-1',
    title: 'Beste Currywurst der Stadt gefunden 🌭',
    authorName: 'LiveWithMax',
    authorAvatar: avatar('max'),
    videoThumbnail: thumb('food1'),
    isLive: true,
    distanceMeters: 800,
    attendeeAvatars: [avatar('a1'), avatar('a2'), avatar('a3')],
    attendeeCount: 128,
    likes: 4820,
  },
  {
    id: 'video-2',
    spotId: 'spot-2',
    title: 'Retro Gaming Night startet gleich 🎮',
    authorName: 'ArcadeCrew',
    authorAvatar: avatar('gaming-night'),
    videoThumbnail: thumb('game1'),
    isLive: false,
    distanceMeters: 1400,
    attendeeAvatars: [avatar('b1'), avatar('b2')],
    attendeeCount: 42,
    likes: 1170,
  },
  {
    id: 'video-3',
    spotId: 'spot-4',
    title: 'Nacht-Bike-Tour durch Berlin 🌃',
    authorName: 'NightRiderTV',
    authorAvatar: avatar('nightrider'),
    videoThumbnail: thumb('bike1'),
    isLive: true,
    distanceMeters: 2300,
    attendeeAvatars: [avatar('c1'), avatar('c2'), avatar('c3'), avatar('c4')],
    attendeeCount: 301,
    likes: 9340,
  },
  {
    id: 'video-4',
    spotId: 'spot-5',
    title: 'Open Air Konzert im Mauerpark 🎶',
    authorName: 'MauerparkEvents',
    authorAvatar: avatar('concert'),
    videoThumbnail: thumb('concert1'),
    isLive: false,
    distanceMeters: 3100,
    attendeeAvatars: [avatar('d1'), avatar('d2')],
    attendeeCount: 87,
    likes: 2260,
  },
];

/** What kind of viewer someone is. Picked during onboarding and used to
 *  recommend creators - see CREATORS below. */
export type Genre =
  | 'food'
  | 'nightlife'
  | 'gaming'
  | 'music'
  | 'sport'
  | 'travel'
  | 'art'
  | 'fitness'
  | 'tech'
  | 'nature';

export const GENRES: { key: Genre; label: string; emoji: string }[] = [
  { key: 'food', label: 'Streetfood', emoji: '🍜' },
  { key: 'nightlife', label: 'Nightlife', emoji: '🌃' },
  { key: 'gaming', label: 'Gaming', emoji: '🕹️' },
  { key: 'music', label: 'Musik', emoji: '🎧' },
  { key: 'sport', label: 'Sport', emoji: '⚽' },
  { key: 'travel', label: 'Reisen', emoji: '✈️' },
  { key: 'art', label: 'Kunst', emoji: '🎨' },
  { key: 'fitness', label: 'Fitness', emoji: '💪' },
  { key: 'tech', label: 'Tech', emoji: '💻' },
  { key: 'nature', label: 'Natur', emoji: '🏔️' },
];

export interface Creator {
  name: string;
  city: string;
  /** Flag emoji - the roster is deliberately spread across continents so the
   *  map never looks like a single-city demo. */
  flag: string;
  genres: Genre[];
  followers: number;
  isLive: boolean;
  avatarUrl: string;
}

/** Placeholder creator roster. Entirely fictional personas with stock portrait
 *  photos - no real person is represented here. Used for onboarding
 *  recommendations, the friends list and the feed. */
export const CREATORS: Creator[] = [
  { name: 'LiveWithMax', city: 'Berlin', flag: '🇩🇪', genres: ['food', 'travel'], followers: 128_400, isLive: true, avatarUrl: avatar('max') },
  { name: 'NightRiderTV', city: 'Berlin', flag: '🇩🇪', genres: ['nightlife', 'sport'], followers: 64_200, isLive: true, avatarUrl: avatar('nightrider') },
  { name: 'ArcadeCrew', city: 'Köln', flag: '🇩🇪', genres: ['gaming', 'tech'], followers: 41_900, isLive: false, avatarUrl: avatar('gaming-night') },
  { name: 'MauerparkEvents', city: 'Berlin', flag: '🇩🇪', genres: ['music', 'art'], followers: 33_100, isLive: false, avatarUrl: avatar('concert') },
  { name: 'TokyoAfterDark', city: 'Tokio', flag: '🇯🇵', genres: ['nightlife', 'food'], followers: 512_000, isLive: true, avatarUrl: avatar('tokyo') },
  { name: 'SeoulSoundz', city: 'Seoul', flag: '🇰🇷', genres: ['music', 'tech'], followers: 289_500, isLive: true, avatarUrl: avatar('seoul') },
  { name: 'BangkokBites', city: 'Bangkok', flag: '🇹🇭', genres: ['food', 'travel'], followers: 176_300, isLive: false, avatarUrl: avatar('bangkok') },
  { name: 'NYC_Rooftops', city: 'New York', flag: '🇺🇸', genres: ['nightlife', 'art'], followers: 421_800, isLive: true, avatarUrl: avatar('nyc') },
  { name: 'VenicePump', city: 'Los Angeles', flag: '🇺🇸', genres: ['fitness', 'sport'], followers: 355_200, isLive: true, avatarUrl: avatar('venice') },
  { name: 'RioBeatStreet', city: 'Rio de Janeiro', flag: '🇧🇷', genres: ['music', 'sport'], followers: 268_700, isLive: false, avatarUrl: avatar('rio') },
  { name: 'ParisEnRoute', city: 'Paris', flag: '🇫🇷', genres: ['art', 'food'], followers: 198_400, isLive: false, avatarUrl: avatar('paris') },
  { name: 'LondonLateShift', city: 'London', flag: '🇬🇧', genres: ['nightlife', 'music'], followers: 244_900, isLive: true, avatarUrl: avatar('london') },
  { name: 'AlpsUnfiltered', city: 'Innsbruck', flag: '🇦🇹', genres: ['nature', 'sport'], followers: 87_600, isLive: false, avatarUrl: avatar('alps') },
  { name: 'CairoNightMkt', city: 'Kairo', flag: '🇪🇬', genres: ['food', 'travel'], followers: 143_000, isLive: false, avatarUrl: avatar('cairo') },
  { name: 'LagosLoud', city: 'Lagos', flag: '🇳🇬', genres: ['music', 'nightlife'], followers: 311_400, isLive: true, avatarUrl: avatar('lagos') },
  { name: 'SydneySunrise', city: 'Sydney', flag: '🇦🇺', genres: ['nature', 'fitness'], followers: 129_800, isLive: false, avatarUrl: avatar('sydney') },
  { name: 'MumbaiMotion', city: 'Mumbai', flag: '🇮🇳', genres: ['travel', 'food'], followers: 402_100, isLive: true, avatarUrl: avatar('mumbai') },
  { name: 'ReykjavikRaw', city: 'Reykjavík', flag: '🇮🇸', genres: ['nature', 'art'], followers: 76_500, isLive: false, avatarUrl: avatar('reykjavik') },
  { name: 'MexCityGrind', city: 'Mexiko-Stadt', flag: '🇲🇽', genres: ['food', 'art'], followers: 221_600, isLive: true, avatarUrl: avatar('mexico') },
  { name: 'SiliconDaily', city: 'San Francisco', flag: '🇺🇸', genres: ['tech', 'gaming'], followers: 187_300, isLive: false, avatarUrl: avatar('sf') },
  { name: 'IstanbulEcho', city: 'Istanbul', flag: '🇹🇷', genres: ['food', 'music'], followers: 296_400, isLive: true, avatarUrl: avatar('istanbul') },
  { name: 'AmsterdamLoop', city: 'Amsterdam', flag: '🇳🇱', genres: ['nightlife', 'art'], followers: 158_900, isLive: false, avatarUrl: avatar('amsterdam') },
  { name: 'BarcaSunset', city: 'Barcelona', flag: '🇪🇸', genres: ['nightlife', 'sport'], followers: 274_100, isLive: true, avatarUrl: avatar('barca') },
  { name: 'MilanoModa', city: 'Mailand', flag: '🇮🇹', genres: ['art', 'travel'], followers: 233_500, isLive: false, avatarUrl: avatar('milano') },
  { name: 'StockholmStill', city: 'Stockholm', flag: '🇸🇪', genres: ['nature', 'tech'], followers: 91_200, isLive: false, avatarUrl: avatar('stockholm') },
  { name: 'WarsawGrid', city: 'Warschau', flag: '🇵🇱', genres: ['gaming', 'tech'], followers: 147_800, isLive: true, avatarUrl: avatar('warsaw') },
  { name: 'AthensGold', city: 'Athen', flag: '🇬🇷', genres: ['travel', 'food'], followers: 112_600, isLive: false, avatarUrl: avatar('athens') },
  { name: 'ZurichPeak', city: 'Zürich', flag: '🇨🇭', genres: ['nature', 'fitness'], followers: 84_300, isLive: false, avatarUrl: avatar('zurich') },
  { name: 'DubaiSkyline', city: 'Dubai', flag: '🇦🇪', genres: ['travel', 'nightlife'], followers: 486_200, isLive: true, avatarUrl: avatar('dubai') },
  { name: 'MarrakechMaze', city: 'Marrakesch', flag: '🇲🇦', genres: ['travel', 'art'], followers: 168_700, isLive: false, avatarUrl: avatar('marrakech') },
  { name: 'NairobiRun', city: 'Nairobi', flag: '🇰🇪', genres: ['sport', 'fitness'], followers: 205_300, isLive: true, avatarUrl: avatar('nairobi') },
  { name: 'CapeTownSwell', city: 'Kapstadt', flag: '🇿🇦', genres: ['nature', 'sport'], followers: 193_400, isLive: false, avatarUrl: avatar('capetown') },
  { name: 'ShanghaiNeon', city: 'Shanghai', flag: '🇨🇳', genres: ['nightlife', 'tech'], followers: 538_900, isLive: true, avatarUrl: avatar('shanghai') },
  { name: 'TaipeiNightMkt', city: 'Taipeh', flag: '🇹🇼', genres: ['food', 'gaming'], followers: 224_700, isLive: false, avatarUrl: avatar('taipei') },
  { name: 'SingaSkybar', city: 'Singapur', flag: '🇸🇬', genres: ['nightlife', 'food'], followers: 317_500, isLive: true, avatarUrl: avatar('singapore') },
  { name: 'BaliBreathe', city: 'Bali', flag: '🇮🇩', genres: ['nature', 'fitness'], followers: 372_800, isLive: false, avatarUrl: avatar('bali') },
  { name: 'ManilaMotion', city: 'Manila', flag: '🇵🇭', genres: ['music', 'travel'], followers: 259_100, isLive: true, avatarUrl: avatar('manila') },
  { name: 'SaigonStreet', city: 'Ho-Chi-Minh-Stadt', flag: '🇻🇳', genres: ['food', 'travel'], followers: 181_200, isLive: false, avatarUrl: avatar('saigon') },
  { name: 'DelhiDrums', city: 'Delhi', flag: '🇮🇳', genres: ['music', 'art'], followers: 344_600, isLive: true, avatarUrl: avatar('delhi') },
  { name: 'SeoulEsports', city: 'Seoul', flag: '🇰🇷', genres: ['gaming', 'sport'], followers: 612_300, isLive: true, avatarUrl: avatar('seoul-esports') },
  { name: 'OsakaTable', city: 'Osaka', flag: '🇯🇵', genres: ['food', 'art'], followers: 197_900, isLive: false, avatarUrl: avatar('osaka') },
  { name: 'TorontoTrails', city: 'Toronto', flag: '🇨🇦', genres: ['nature', 'sport'], followers: 136_400, isLive: false, avatarUrl: avatar('toronto') },
  { name: 'ChicagoDeep', city: 'Chicago', flag: '🇺🇸', genres: ['music', 'food'], followers: 228_800, isLive: true, avatarUrl: avatar('chicago') },
  { name: 'MiamiHeatwave', city: 'Miami', flag: '🇺🇸', genres: ['nightlife', 'fitness'], followers: 391_500, isLive: true, avatarUrl: avatar('miami') },
  { name: 'AustinAmps', city: 'Austin', flag: '🇺🇸', genres: ['music', 'tech'], followers: 174_200, isLive: false, avatarUrl: avatar('austin') },
  { name: 'BogotaBrew', city: 'Bogotá', flag: '🇨🇴', genres: ['food', 'music'], followers: 152_900, isLive: false, avatarUrl: avatar('bogota') },
  { name: 'BuenosBeats', city: 'Buenos Aires', flag: '🇦🇷', genres: ['music', 'nightlife'], followers: 287_600, isLive: true, avatarUrl: avatar('buenos') },
  { name: 'LimaLens', city: 'Lima', flag: '🇵🇪', genres: ['food', 'art'], followers: 118_300, isLive: false, avatarUrl: avatar('lima') },
  { name: 'PatagoniaWild', city: 'El Chaltén', flag: '🇦🇷', genres: ['nature', 'travel'], followers: 99_700, isLive: false, avatarUrl: avatar('patagonia') },
  { name: 'AucklandEdge', city: 'Auckland', flag: '🇳🇿', genres: ['sport', 'nature'], followers: 78_400, isLive: false, avatarUrl: avatar('auckland') },
  { name: 'HelsinkiHush', city: 'Helsinki', flag: '🇫🇮', genres: ['tech', 'nature'], followers: 66_900, isLive: false, avatarUrl: avatar('helsinki') },
  { name: 'LisbonLight', city: 'Lissabon', flag: '🇵🇹', genres: ['art', 'travel'], followers: 141_100, isLive: true, avatarUrl: avatar('lisbon') },
  { name: 'PragueAfterHours', city: 'Prag', flag: '🇨🇿', genres: ['nightlife', 'music'], followers: 129_500, isLive: false, avatarUrl: avatar('prague') },
  { name: 'BudapestBaths', city: 'Budapest', flag: '🇭🇺', genres: ['travel', 'fitness'], followers: 107_800, isLive: false, avatarUrl: avatar('budapest') },
  { name: 'DublinDaily', city: 'Dublin', flag: '🇮🇪', genres: ['music', 'nightlife'], followers: 94_600, isLive: false, avatarUrl: avatar('dublin') },
  { name: 'MunichMatchday', city: 'München', flag: '🇩🇪', genres: ['sport', 'food'], followers: 213_700, isLive: true, avatarUrl: avatar('munich') },
  { name: 'HamburgHafen', city: 'Hamburg', flag: '🇩🇪', genres: ['nightlife', 'travel'], followers: 88_200, isLive: false, avatarUrl: avatar('hamburg') },
  { name: 'ViennaStrings', city: 'Wien', flag: '🇦🇹', genres: ['music', 'art'], followers: 121_400, isLive: false, avatarUrl: avatar('vienna') },
  { name: 'TelAvivTech', city: 'Tel Aviv', flag: '🇮🇱', genres: ['tech', 'nightlife'], followers: 165_800, isLive: true, avatarUrl: avatar('telaviv') },
];

/** Creators matching any of the picked genres, strongest first. With nothing
 *  picked the roster still has to produce something, so it falls back to the
 *  biggest names rather than an empty list. */
export function recommendedCreators(genres: string[], limit = 6): Creator[] {
  const ranked = [...CREATORS].sort((a, b) => b.followers - a.followers);
  if (genres.length === 0) return ranked.slice(0, limit);
  const matches = ranked.filter((c) => c.genres.some((g) => genres.includes(g)));
  return (matches.length > 0 ? matches : ranked).slice(0, limit);
}

/**
 * The filter row.
 *
 * "Vorgeschlagen" is gone: it promised a ranking the app never computed and
 * behaved identically to "Alle", so it was a pill that did nothing. What
 * replaced it is reach - the tiles carry bakeries, supermarkets, hotels,
 * pharmacies, gyms, parks and cash machines as their own classes, and every one
 * of those is a thing people actually go looking for on a map.
 *
 * Order is by how often a filter gets used, not alphabetically: the row scrolls
 * horizontally, so position is the only thing that decides whether an option is
 * ever seen.
 */
export const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
  { key: 'all', label: 'Alle', emoji: '✨' },
  { key: 'live', label: 'Live', emoji: '🔴' },
  { key: 'food', label: 'Restaurants', emoji: '🍕' },
  { key: 'coffee', label: 'Café', emoji: '☕' },
  { key: 'drinks', label: 'Bar', emoji: '🍸' },
  { key: 'bakery', label: 'Bäckerei', emoji: '🥐' },
  { key: 'groceries', label: 'Supermarkt', emoji: '🛒' },
  { key: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { key: 'health', label: 'Apotheke & Arzt', emoji: '💊' },
  { key: 'beauty', label: 'Beauty & Friseur', emoji: '💇' },
  { key: 'culture', label: 'Kultur', emoji: '🎭' },
  { key: 'outdoors', label: 'Parks', emoji: '🌳' },
  { key: 'sport', label: 'Sport', emoji: '⚽' },
  { key: 'lodging', label: 'Hotels', emoji: '🛏️' },
  { key: 'finance', label: 'Bank & Geldautomat', emoji: '🏧' },
  { key: 'auto', label: 'Tanken & Laden', emoji: '⛽' },
  { key: 'gaming', label: 'Gaming', emoji: '🎮' },
];

export const MOCK_USER = {
  id: 'user-1',
  name: 'Gast',
  avatarUrl: avatar('current-user'),
};
