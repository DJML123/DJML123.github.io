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

/**
 * Where each city on the roster is, so "near me" is something the app can
 * actually compute.
 *
 * The creators used to carry a city *name* and nothing else, which meant every
 * suggestion the app made was global and identical no matter where the user
 * opened it - and the map only ever had content in Berlin. Coordinates turn
 * both of those into a distance calculation.
 *
 * City centres, one decimal place of precision beyond what matters: these
 * position a marker in the right district, and the roster is fictional anyway.
 */
export const CITY_COORDS: Record<string, Coordinates> = {
  // Launch market first - see LAUNCH_MARKET below.
  Berlin: { lng: 13.405, lat: 52.52 },
  Hamburg: { lng: 9.9937, lat: 53.5511 },
  München: { lng: 11.582, lat: 48.1351 },
  Köln: { lng: 6.9603, lat: 50.9375 },
  'Frankfurt am Main': { lng: 8.6821, lat: 50.1109 },
  Stuttgart: { lng: 9.1829, lat: 48.7758 },
  Düsseldorf: { lng: 6.7735, lat: 51.2277 },
  Leipzig: { lng: 12.3731, lat: 51.3397 },
  Dresden: { lng: 13.7373, lat: 51.0504 },
  Hannover: { lng: 9.732, lat: 52.3759 },
  Nürnberg: { lng: 11.0767, lat: 49.4521 },
  Bremen: { lng: 8.8017, lat: 53.0793 },
  Dortmund: { lng: 7.4653, lat: 51.5136 },
  Essen: { lng: 7.0116, lat: 51.4556 },
  Freiburg: { lng: 7.8421, lat: 47.999 },
  Münster: { lng: 7.6261, lat: 51.9607 },
  Mannheim: { lng: 8.4661, lat: 49.4875 },
  Karlsruhe: { lng: 8.4037, lat: 49.0069 },
  Bonn: { lng: 7.0982, lat: 50.7374 },
  Kiel: { lng: 10.1228, lat: 54.3233 },
  Augsburg: { lng: 10.8978, lat: 48.3705 },
  Rostock: { lng: 12.0991, lat: 54.0924 },

  // The rest of the world.
  Amsterdam: { lng: 4.9041, lat: 52.3676 },
  Athen: { lng: 23.7275, lat: 37.9838 },
  Auckland: { lng: 174.7633, lat: -36.8485 },
  Austin: { lng: -97.7431, lat: 30.2672 },
  Bali: { lng: 115.1889, lat: -8.4095 },
  Bangkok: { lng: 100.5018, lat: 13.7563 },
  Barcelona: { lng: 2.1734, lat: 41.3851 },
  Bogotá: { lng: -74.0721, lat: 4.711 },
  Budapest: { lng: 19.0402, lat: 47.4979 },
  'Buenos Aires': { lng: -58.3816, lat: -34.6037 },
  Chicago: { lng: -87.6298, lat: 41.8781 },
  Delhi: { lng: 77.1025, lat: 28.7041 },
  Dubai: { lng: 55.2708, lat: 25.2048 },
  Dublin: { lng: -6.2603, lat: 53.3498 },
  'El Chaltén': { lng: -72.8864, lat: -49.3315 },
  Helsinki: { lng: 24.9384, lat: 60.1699 },
  'Ho-Chi-Minh-Stadt': { lng: 106.6297, lat: 10.8231 },
  Innsbruck: { lng: 11.4041, lat: 47.2692 },
  Istanbul: { lng: 28.9784, lat: 41.0082 },
  Kairo: { lng: 31.2357, lat: 30.0444 },
  Kapstadt: { lng: 18.4241, lat: -33.9249 },
  Lagos: { lng: 3.3792, lat: 6.5244 },
  Lima: { lng: -77.0428, lat: -12.0464 },
  Lissabon: { lng: -9.1393, lat: 38.7223 },
  London: { lng: -0.1276, lat: 51.5072 },
  'Los Angeles': { lng: -118.2437, lat: 34.0522 },
  Mailand: { lng: 9.19, lat: 45.4642 },
  Manila: { lng: 120.9842, lat: 14.5995 },
  Marrakesch: { lng: -7.9811, lat: 31.6295 },
  'Mexiko-Stadt': { lng: -99.1332, lat: 19.4326 },
  Miami: { lng: -80.1918, lat: 25.7617 },
  Mumbai: { lng: 72.8777, lat: 19.076 },
  Nairobi: { lng: 36.8219, lat: -1.2921 },
  'New York': { lng: -74.006, lat: 40.7128 },
  Osaka: { lng: 135.5023, lat: 34.6937 },
  Paris: { lng: 2.3522, lat: 48.8566 },
  Prag: { lng: 14.4378, lat: 50.0755 },
  'Reykjavík': { lng: -21.9426, lat: 64.1466 },
  'Rio de Janeiro': { lng: -43.1729, lat: -22.9068 },
  'San Francisco': { lng: -122.4194, lat: 37.7749 },
  Seoul: { lng: 126.978, lat: 37.5665 },
  Shanghai: { lng: 121.4737, lat: 31.2304 },
  Singapur: { lng: 103.8198, lat: 1.3521 },
  Stockholm: { lng: 18.0686, lat: 59.3293 },
  Sydney: { lng: 151.2093, lat: -33.8688 },
  Taipeh: { lng: 121.5654, lat: 25.033 },
  'Tel Aviv': { lng: 34.7818, lat: 32.0853 },
  Tokio: { lng: 139.6917, lat: 35.6895 },
  Toronto: { lng: -79.3832, lat: 43.6532 },
  Warschau: { lng: 21.0122, lat: 52.2297 },
  Wien: { lng: 16.3738, lat: 48.2082 },
  'Zürich': { lng: 8.5417, lat: 47.3769 },
};

/**
 * The market OnSpot is trying to win first.
 *
 * The plan is international - open the app anywhere and it suggests people
 * around you - but a social product only becomes worth opening once one place
 * is dense enough that there is always something happening. Spreading thin
 * across 44 countries gets you 44 empty cities. So German creators are ranked
 * ahead of equally-close foreign ones, and the roster below covers German
 * cities far more thoroughly than anywhere else.
 *
 * When Germany carries itself, drop the boost to 1 (or set it per country) and
 * the same ranking works unchanged for the next market.
 */
export const LAUNCH_MARKET = '🇩🇪';
/** How much closer a launch-market creator feels than they are, in kilometres
 *  of "virtual" head start. 400km covers Germany end to end, so within the
 *  country the ranking is effectively distance-only, and abroad the local
 *  German scene still surfaces before an equally distant foreign one. */
const LAUNCH_BOOST_KM = 400;

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
  // --- Startmarkt Deutschland -------------------------------------------
  // Deliberately smaller follower counts than the international roster: a
  // launch market is made of people with a few thousand viewers, not of
  // half-million-follower accounts, and pretending otherwise is the kind of
  // detail that makes a product feel fake to exactly the people it needs.
  { name: 'HafenLiveHH', city: 'Hamburg', flag: '🇩🇪', genres: ['travel', 'food'], followers: 8_400, isLive: true, avatarUrl: avatar('hafen-hh') },
  { name: 'IsarSessions', city: 'München', flag: '🇩🇪', genres: ['music', 'nature'], followers: 12_700, isLive: false, avatarUrl: avatar('isar') },
  { name: 'MainhattanEats', city: 'Frankfurt am Main', flag: '🇩🇪', genres: ['food', 'nightlife'], followers: 6_900, isLive: true, avatarUrl: avatar('mainhattan') },
  { name: 'KesselKlub', city: 'Stuttgart', flag: '🇩🇪', genres: ['nightlife', 'music'], followers: 5_300, isLive: false, avatarUrl: avatar('kessel') },
  { name: 'RheinRunner', city: 'Düsseldorf', flag: '🇩🇪', genres: ['sport', 'fitness'], followers: 9_100, isLive: true, avatarUrl: avatar('rhein') },
  { name: 'LeipzigLoft', city: 'Leipzig', flag: '🇩🇪', genres: ['art', 'nightlife'], followers: 14_200, isLive: true, avatarUrl: avatar('leipzig') },
  { name: 'ElbflorenzArt', city: 'Dresden', flag: '🇩🇪', genres: ['art', 'travel'], followers: 4_800, isLive: false, avatarUrl: avatar('dresden') },
  { name: 'HannoverHustle', city: 'Hannover', flag: '🇩🇪', genres: ['gaming', 'tech'], followers: 7_600, isLive: true, avatarUrl: avatar('hannover') },
  { name: 'FrankenFrames', city: 'Nürnberg', flag: '🇩🇪', genres: ['art', 'food'], followers: 3_900, isLive: false, avatarUrl: avatar('nuernberg') },
  { name: 'WeserWanderer', city: 'Bremen', flag: '🇩🇪', genres: ['nature', 'travel'], followers: 5_100, isLive: false, avatarUrl: avatar('bremen') },
  { name: 'RevierGaming', city: 'Dortmund', flag: '🇩🇪', genres: ['gaming', 'sport'], followers: 21_500, isLive: true, avatarUrl: avatar('dortmund') },
  { name: 'RuhrpottBeats', city: 'Essen', flag: '🇩🇪', genres: ['music', 'nightlife'], followers: 11_300, isLive: false, avatarUrl: avatar('essen') },
  { name: 'SchwarzwaldSteps', city: 'Freiburg', flag: '🇩🇪', genres: ['nature', 'fitness'], followers: 6_200, isLive: true, avatarUrl: avatar('freiburg') },
  { name: 'MuensterRad', city: 'Münster', flag: '🇩🇪', genres: ['sport', 'nature'], followers: 4_400, isLive: false, avatarUrl: avatar('muenster') },
  { name: 'QuadratKitchen', city: 'Mannheim', flag: '🇩🇪', genres: ['food', 'art'], followers: 3_600, isLive: false, avatarUrl: avatar('mannheim') },
  { name: 'KarlsruheCode', city: 'Karlsruhe', flag: '🇩🇪', genres: ['tech', 'gaming'], followers: 15_800, isLive: true, avatarUrl: avatar('karlsruhe') },
  { name: 'BonnBeisl', city: 'Bonn', flag: '🇩🇪', genres: ['food', 'travel'], followers: 2_900, isLive: false, avatarUrl: avatar('bonn') },
  { name: 'FoerdeFunk', city: 'Kiel', flag: '🇩🇪', genres: ['nature', 'sport'], followers: 3_300, isLive: true, avatarUrl: avatar('kiel') },
  { name: 'AugsburgAfterWork', city: 'Augsburg', flag: '🇩🇪', genres: ['nightlife', 'music'], followers: 2_400, isLive: false, avatarUrl: avatar('augsburg') },
  { name: 'OstseeOnAir', city: 'Rostock', flag: '🇩🇪', genres: ['travel', 'nature'], followers: 4_100, isLive: true, avatarUrl: avatar('rostock') },

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
/** Great-circle distance in kilometres. */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Where a creator broadcasts from. Unknown cities fall back to Berlin so a
 *  typo in the roster can never drop someone off the map silently. */
export function creatorCoords(c: Creator): Coordinates {
  return CITY_COORDS[c.city] ?? CITY_COORDS.Berlin;
}

/**
 * How far away a creator *feels*, which is what the ranking sorts on.
 *
 * Real distance, minus a head start for the launch market. Everything else
 * being equal a German creator therefore outranks a foreign one, and inside
 * Germany the boost cancels out on both sides and it is plain distance again.
 */
function rankingDistance(c: Creator, near: Coordinates): number {
  const km = distanceKm(near, creatorCoords(c));
  return c.flag === LAUNCH_MARKET ? km - LAUNCH_BOOST_KM : km;
}

/**
 * Who to suggest, in order.
 *
 * Taste first, proximity second, reach last. The old version sorted the whole
 * world by follower count, so every user on earth got the same six global
 * accounts - which is the opposite of what a "see what is happening around
 * you" app should recommend. With a location it now answers "who is near me
 * and makes the kind of thing I watch", and without one it falls back to the
 * launch market rather than to whoever is biggest.
 */
export function recommendedCreators(
  genres: string[],
  limit = 6,
  near?: Coordinates | null
): Creator[] {
  const matches =
    genres.length > 0 ? CREATORS.filter((c) => c.genres.some((g) => genres.includes(g))) : [];
  const pool = matches.length > 0 ? matches : [...CREATORS];

  if (!near) {
    // No position yet: lead with the launch market, then by reach. Note this
    // is the first screen of onboarding, where the IP lookup often has not
    // come back yet - so it must still produce a sensible list.
    return [...pool]
      .sort((a, b) => {
        const market = Number(b.flag === LAUNCH_MARKET) - Number(a.flag === LAUNCH_MARKET);
        return market !== 0 ? market : b.followers - a.followers;
      })
      .slice(0, limit);
  }

  return [...pool]
    .sort((a, b) => {
      const d = rankingDistance(a, near) - rankingDistance(b, near);
      // Within ~15km the difference is noise (same city), so reach decides.
      return Math.abs(d) > 15 ? d : b.followers - a.followers;
    })
    .slice(0, limit);
}

/**
 * Every creator, as a map marker at their city.
 *
 * This is what makes the map international. It used to hold four hard-coded
 * spots in Berlin, so opening the app anywhere else showed a basemap and
 * nothing else - no reason to come back, which is the single biggest thing
 * wrong with the product. Now each creator sits in their own city, offset by a
 * deterministic jitter so a city with several of them does not stack every
 * marker on one pixel.
 *
 * Still demo content, and labelled as such in the UI.
 */
export const CREATOR_SPOTS: Spot[] = CREATORS.map((c, i) => {
  const base = creatorCoords(c);
  // Deterministic scatter, roughly +/-2km, from the name so it never moves
  // between renders or reloads.
  const h = hashSeed(c.name);
  const jitterLng = (((h % 400) - 200) / 100) * 0.014;
  const jitterLat = ((((h >> 9) % 400) - 200) / 100) * 0.009;
  return {
    id: `creator-${i}`,
    type: 'streamer' as const,
    title: c.name,
    subtitle: c.isLive ? `Live aus ${c.city}` : `Zuletzt live • ${c.city}`,
    coords: { lng: base.lng + jitterLng, lat: base.lat + jitterLat },
    avatarUrl: c.avatarUrl,
    isLive: c.isLive,
    category: c.isLive ? ('live' as const) : ('all' as const),
    viewers: c.isLive ? Math.max(12, Math.round(c.followers / 90)) : undefined,
  };
});

/** The seeded Berlin events plus every creator on the roster. */
export const ALL_SPOTS: Spot[] = [...SPOTS, ...CREATOR_SPOTS];

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
