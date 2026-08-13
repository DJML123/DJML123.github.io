import type { Map as MaplibreMapType } from 'maplibre-gl';
import { MAKI_GLYPHS, MAKI_NAMES } from './maki-glyphs';

/**
 * Draws a pictogram for every POI in the vector tiles - restaurants, shops,
 * hairdressers, landmarks - the way Google Maps does.
 *
 * Each POI renders as ONE symbol: a coloured badge circle with a white glyph
 * inside, composited at runtime into a single image. That unit is what the
 * collision pass sees, so overlapping POIs get hidden as a whole (badge +
 * glyph together) exactly like Google Maps hides them, with the most relevant
 * one (lowest `rank`) winning - nothing is ever drawn on top of another.
 *
 * Liberty already ships POI layers, so this only kicks in for the styles that
 * don't (dark mode, satellite).
 */

export const POI_SOURCE_ID = 'openmaptiles';
export const OFM_TILES_URL = 'https://tiles.openfreemap.org/planet';
export const OFM_SPRITE = 'https://tiles.openfreemap.org/sprites/ofm_f384/ofm';
export const OFM_GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

/** The single POI symbol layer this module owns (raster styles only). */
export const OWN_POI_LAYER = 'onspot-poi';
export const OWN_POI_LAYERS = [OWN_POI_LAYER];

/** Where POIs start appearing at all. */
const POI_MINZOOM = 12.8;

const RANK = ['coalesce', ['get', 'rank'], 99];

/** Subclasses OpenMapTiles uses for stops and stations. These do not appear as
 *  classes, so they cannot be derived from the category table below. */
const TRANSIT_SUBCLASSES = [
  'bus', 'rail', 'railway', 'tram', 'subway', 'ferry', 'airport', 'bus_stop',
  'bus_station', 'railway_light', 'railway_metro', 'taxi', 'bicycle_rental',
  'car_rental', 'station', 'halt', 'tram_stop', 'platform',
];

/** Fixed-duration fade for every opacity property below, so a badge or icon
 *  popping into visibility always animates the same regardless of zoom speed.
 *  340ms rather than 220: at the shorter duration a zoom gesture read as icons
 *  blinking on, because the fade finished before the camera had settled. */
const FADE = { duration: 340 };

/** Only real point POIs, and none of the street furniture. */
const POINTS_ONLY = ['match', ['geometry-type'], ['Point', 'MultiPoint'], true, false];

/**
 * The glyph names we can actually draw - the key set of MAKI_GLYPHS (Maki
 * v8.2.0 paths embedded in maki-glyphs.ts), drawn as vector paths rather than
 * taken from a sprite (OpenFreeMap's sprite only ships placeholder circles for
 * most POI icons).
 */
const SPRITE_ICON_NAMES = MAKI_NAMES;

const TEXT_FIELD = ['coalesce', ['get', 'name:de'], ['get', 'name:latin'], ['get', 'name']];

/**
 * Google Maps' POI model, rebuilt on OpenMapTiles data.
 *
 * Google does not pick a pictogram per business type. Every place resolves to
 * one of a handful of top-level categories, and the *category* owns both the
 * icon and the colour - which is why a camera shop, a florist and a bookshop
 * all carry the same bag on Google's basemap, and why you can read the map
 * from across the room. The distinguishing detail lives in the label, not in
 * a bespoke glyph.
 *
 * Two decisions here follow directly from measuring 143,319 real POIs across
 * Berlin, Hamburg, Munich, Paris, London and Vienna (z14-15 tiles):
 *
 *  1. **Key on `class`, never on `subclass`.** OpenMapTiles already collapses
 *     ~1000 OSM tags into ~100 classes, and it does it correctly: all 59
 *     `shop=*` subclasses arrive as `class=shop`, all 52 `office=*` as
 *     `class=office`. The old table read `subclass` first, so `shop=photo`
 *     was looked up as "photo" and landed on the art-gallery glyph while its
 *     colour came from a different lookup - two independent guesses that
 *     could and did disagree. One table keyed on one field makes that class
 *     of bug impossible.
 *
 *  2. **A category may not be inferred from a raw OSM tag name.** The single
 *     worst offender was `class=art_gallery`, 3.7% of everything - of which
 *     3398 of 5261 were `subclass=artwork`, i.e. statues and murals, not
 *     galleries. That is what actually produced "half the shops look like art
 *     galleries". Those are filtered out as street furniture below, not
 *     recoloured.
 */
type PoiCategory =
  | 'food'
  | 'cafe'
  | 'bar'
  | 'shopping'
  | 'lodging'
  | 'transit'
  | 'outdoors'
  | 'sport'
  | 'culture'
  | 'health'
  | 'education'
  | 'civic'
  | 'auto'
  | 'finance'
  | 'services';

/**
 * Icon + colour per category. Fifteen pictograms for the whole world, which is
 * the same order of magnitude Google's basemap uses.
 *
 * The palette is deliberately narrow in lightness (every colour sits at
 * L*≈45-55) and low in saturation. The previous set mixed a neon `#0f9d58`
 * against a muted `#5f6d7e`, so badges of equal importance shouted at
 * different volumes and the map read as confetti - the reported "die Icons
 * haben keine gute Farbe". Holding lightness constant is also what keeps the
 * white glyph legible on every single one of them, over satellite imagery as
 * well as over a pale street map.
 */
const CATEGORY_STYLE: Record<PoiCategory, { icon: string; color: string }> = {
  food: { icon: 'restaurant', color: '#c9541f' },
  cafe: { icon: 'cafe', color: '#9b5a2b' },
  bar: { icon: 'bar', color: '#a63d6d' },
  shopping: { icon: 'shop', color: '#3866c4' },
  lodging: { icon: 'lodging', color: '#c1568b' },
  transit: { icon: 'bus', color: '#2b6cb0' },
  outdoors: { icon: 'park', color: '#2f7d4f' },
  sport: { icon: 'pitch', color: '#1f8a6d' },
  culture: { icon: 'museum', color: '#7350bd' },
  health: { icon: 'hospital', color: '#c0392f' },
  education: { icon: 'school', color: '#b07d12' },
  civic: { icon: 'town_hall', color: '#5c6b7d' },
  auto: { icon: 'car', color: '#4a5c72' },
  finance: { icon: 'bank', color: '#1e7a52' },
  services: { icon: 'commercial', color: '#5a67ac' },
};

/**
 * OpenMapTiles `class` -> category. Ordered by real-world frequency (share of
 * the 76,854 POIs that survive the furniture filter) so the important buckets
 * are obvious. Together these cover 99.2%; the remaining 39 classes are 597
 * POIs total and fall through to `services`.
 */
const CLASS_CATEGORY: Record<string, PoiCategory> = {
  // Food & drink
  restaurant: 'food', fast_food: 'food', bakery: 'food', butcher: 'food',
  ice_cream: 'food', grocery: 'food', deli: 'food', marketplace: 'food',
  cafe: 'cafe',
  bar: 'bar', beer: 'bar', alcohol_shop: 'bar', nightclub: 'bar',

  // Retail. `bicycle` and `music` are OpenMapTiles classes for shop=bicycle /
  // shop=musical_instrument, not vehicles or venues.
  shop: 'shopping', clothing_store: 'shopping', bicycle: 'shopping',
  music: 'shopping', florist: 'shopping', furniture: 'shopping',
  gift: 'shopping', jewelry: 'shopping', department_store: 'shopping',
  mall: 'shopping', optician: 'shopping', hardware: 'shopping',
  doityourself: 'shopping', books: 'shopping', stationery: 'shopping',

  lodging: 'lodging', campsite: 'lodging',

  transit: 'transit', bus: 'transit', railway: 'transit', subway: 'transit',
  tram: 'transit', ferry: 'transit', ferry_terminal: 'transit',
  airport: 'transit', aerialway: 'transit', harbor: 'transit',
  bicycle_rental: 'transit', taxi: 'transit', car_rental: 'transit',

  park: 'outdoors', garden: 'outdoors', playground: 'outdoors',
  dog_park: 'outdoors', cemetery: 'outdoors', picnic_site: 'outdoors',
  nature_reserve: 'outdoors', viewpoint: 'outdoors',

  // OpenMapTiles promotes individual `sport=*` values to their own class, so
  // this list is long by necessity - measured, these were the bulk of what
  // still fell through to the default.
  pitch: 'sport', sports_centre: 'sport', swimming_pool: 'sport',
  stadium: 'sport', golf: 'sport', yoga: 'sport', tennis: 'sport',
  fitness_centre: 'sport', judo: 'sport', horse_racing: 'sport',
  swimming: 'sport', bowling: 'sport', climbing: 'sport',
  athletics: 'sport', multi: 'sport', table_tennis: 'sport', chess: 'sport',
  running: 'sport', gymnastics: 'sport', cycling: 'sport', boxing: 'sport',
  basketball: 'sport', soccer: 'sport', volleyball: 'sport', handball: 'sport',
  skateboard: 'sport', boules: 'sport', netball: 'sport', cricket: 'sport',
  equestrian: 'sport', beachvolleyball: 'sport', martial_arts: 'sport',
  dance: 'sport', badminton: 'sport', squash: 'sport', parkour: 'sport',

  museum: 'culture', art_gallery: 'culture', theatre: 'culture',
  cinema: 'culture', castle: 'culture', attraction: 'culture',
  monument: 'culture', aquarium: 'culture', zoo: 'culture',
  arts_centre: 'culture', theme_park: 'culture', escape_game: 'culture',
  water_park: 'culture', hackerspace: 'culture',

  doctors: 'health', dentist: 'health', pharmacy: 'health',
  hospital: 'health', veterinary: 'health', clinic: 'health',

  school: 'education', college: 'education', university: 'education',
  library: 'education', kindergarten: 'education', driving_school: 'education',

  town_hall: 'civic', police: 'civic', fire_station: 'civic',
  place_of_worship: 'civic', embassy: 'civic', prison: 'civic',
  courthouse: 'civic', community_centre: 'civic', ranger_station: 'civic',

  fuel: 'auto', car: 'auto', car_repair: 'auto', car_parts: 'auto',
  charging_station: 'auto', car_wash: 'auto',

  bank: 'finance', atm: 'finance', bureau_de_change: 'finance',

  office: 'services', hairdresser: 'services', laundry: 'services',
  beauty: 'services', commercial: 'services', post_office: 'services',
  travel_agency: 'services', veterinary_clinic: 'services',
};

/** Whatever the tiles hand us that isn't in the table above - 0.8% of POIs. */
const DEFAULT_CATEGORY: PoiCategory = 'services';

/**
 * The same colour and pictogram the map badge uses, for a POI's class - so a
 * place's preview card is unmistakably the thing the user just tapped on the
 * map, drawn from one table rather than a second lookup that could disagree.
 */
export function poiVisual(cls?: string): { color: string; glyph: string } {
  const style = CATEGORY_STYLE[CLASS_CATEGORY[cls ?? ''] ?? DEFAULT_CATEGORY];
  return { color: style.color, glyph: style.icon };
}

/** Every icon has to exist in the glyph set actually drawn, or the table would
 *  just move the "missing icon" problem behind a new name. */
for (const [category, { icon }] of Object.entries(CATEGORY_STYLE)) {
  if (!SPRITE_ICON_NAMES.has(icon)) {
    throw new Error(`poi-layer: CATEGORY_STYLE["${category}"] -> "${icon}" is not a known glyph`);
  }
}

// ---------------------------------------------------------------------------
// When a POI is revealed
// ---------------------------------------------------------------------------

/**
 * The reveal ramp, staged on the same fifteen categories the icons use.
 *
 * It used to run on two hand-written class lists that predate the category
 * table, and they had drifted badly: `shop` - the class that carries all 59
 * `shop=*` subclasses, i.e. the single biggest bucket on the map - was in
 * neither list, so an ordinary shop only appeared once the rank gate opened at
 * z16.6. Deriving the bands from CLASS_CATEGORY means a class can never again
 * be styled as one thing and staged as another.
 *
 * The staging itself answers a second complaint: revealing landmarks, schools,
 * parks, offices and shops together left the wide view "zugespammt", because at
 * z14 a city block contains one interesting shop and thirty things nobody
 * navigates to. So the bands are now by *errand*, not by rank:
 *
 *   z12.8  the busiest commerce only (rank < 25) - a first hint of where the
 *          high street is, a handful of badges per screen
 *   z13.6  every shop, restaurant, cafe and bar
 *   z15.4  everything else - hotels, doctors, banks, schools, parks, offices
 *   z16.6  transit stops and stations, last
 *
 * Density is not this ramp's only guard - collision placement still hides
 * overlapping badges and keeps the lowest-rank one - but staging by errand is
 * what makes the zoomed-out view legible instead of merely thinned.
 */
const classesIn = (...categories: PoiCategory[]): string[] =>
  Object.entries(CLASS_CATEGORY)
    .filter(([, cat]) => categories.includes(cat))
    .map(([cls]) => cls);

/**
 * Stops, stations and rentals, held back until last. Measured against real
 * tiles, 60-90% of bus stops and rail stations carry rank 0-4 - they hog the
 * top of the rank order while 92% of restaurants sit at rank 15+, so ranking
 * alone would fill an entire city view with transit before showing one shop.
 *
 * Derived from the category table for the same reason the bands below are:
 * the hand-written list this replaces had `ferry` but not `ferry_terminal`, so
 * harbours and ferry docks were treated as ordinary places and appeared three
 * zoom levels early.
 */
const TRANSIT_CLASSES = classesIn('transit');
const NOT_TRANSIT = [
  'all',
  ['!', ['in', ['get', 'class'], ['literal', TRANSIT_CLASSES]]],
  ['!', ['in', ['get', 'subclass'], ['literal', TRANSIT_SUBCLASSES]]],
];

/**
 * The high street: shops, restaurants, cafes, bars. These are the only things
 * on the map at the wider zooms, because they are the only things anyone looks
 * for from a whole-district view - everything else (a school, a dentist, an
 * office) is somewhere you go on purpose, having already zoomed in.
 */
const COMMERCE_CLASSES = classesIn('food', 'cafe', 'bar', 'shopping');
const COMMERCE = ['in', ['get', 'class'], ['literal', COMMERCE_CLASSES]];

/**
 * Plain-JS mirror of the `rankOpacity` step function below, for hit-testing.
 * `icon-opacity` is paint-only: MapLibre's hit-testing
 * (`queryRenderedFeatures`, click/hover) ignores it entirely and matches
 * anything passing the layer's *filter*, opacity 0 or not. Without this check
 * every POI is clickable the instant it's in the filter, even while still
 * fully faded out - the reported "kann man noch draufklicken wenn alles
 * deloadet ist".
 */
export function isPoiVisibleAtZoom(
  zoom: number,
  props: { class?: string; subclass?: string; rank?: number },
  /** True while a filter pill is active, matching FILTERED_OPACITY below -
   *  filtered POIs are fully visible from POI_MINZOOM, so they are clickable
   *  from there too. */
  filtered = false
) {
  if (zoom < POI_MINZOOM) return false;
  if (filtered) return true;
  const cls = props.class ?? '';
  const rank = props.rank ?? 99;
  const commerce = COMMERCE_CLASSES.includes(cls);
  const notTransit =
    !TRANSIT_CLASSES.includes(cls) && !TRANSIT_SUBCLASSES.includes(props.subclass ?? '');
  if (zoom < 13.6) return commerce && rank < 25;
  if (zoom < 15.4) return commerce;
  if (zoom < 16.6) return notTransit;
  return true;
}

/**
 * `step`, not `interpolate`: a place's badge should snap on as one quick fade
 * once it earns its spot, not slowly gain opacity the further you zoom past
 * its threshold. `interpolate` here previously meant "more zoomed in = more
 * opaque" for a full zoom level at a time, tying the fade to how far you
 * physically pinch rather than how long you wait - `step` makes the computed
 * value itself a hard 0-or-peak jump at each threshold, and the
 * `*-opacity-transition` on every layer below turns each jump into a fixed
 * ~220ms fade regardless of zoom speed.
 *
 * Built as a factory taking the peak opacity rather than multiplying a shared
 * expression afterwards: MapLibre requires `zoom` to be the input of a
 * *top-level* `interpolate`/`step`, so wrapping this in `['*', 0.22, ...]` is
 * rejected. Worse, `addLayer` reports that as an error event instead of
 * throwing, so the layer is silently dropped and the map just renders without
 * badges. Folding the factor into the stop outputs keeps zoom at the top.
 */
const rankOpacity = (peak: number) => [
  'step',
  ['zoom'],
  0,
  POI_MINZOOM, ['case', ['all', COMMERCE, ['<', RANK, 25]], peak, 0],
  13.6, ['case', COMMERCE, peak, 0],
  15.4, ['case', NOT_TRANSIT, peak, 0],
  16.6, peak,
];

const RANK_OPACITY = rankOpacity(1);


/** Badge ids are built with `concat`, and `replace` is not a valid MapLibre
 *  expression, so the colour has to enter the expression already stripped of
 *  its `#`. */
const ICON_PAIRS = Object.entries(CLASS_CATEGORY).flatMap(([cls, cat]) => [cls, CATEGORY_STYLE[cat].icon]);
const COLOR_PAIRS_HEX = Object.entries(CLASS_CATEGORY).flatMap(([cls, cat]) => [
  cls,
  CATEGORY_STYLE[cat].color.slice(1),
]);

const DEFAULT_ICON = CATEGORY_STYLE[DEFAULT_CATEGORY].icon;
const DEFAULT_GROUP_HEX = CATEGORY_STYLE[DEFAULT_CATEGORY].color.slice(1);

// One field, one table, two reads. Icon and colour are now guaranteed to
// describe the same category because they are looked up from the same key with
// the same fallback - there is no code path where they can disagree.
const GLYPH_NAME = ['match', ['get', 'class'], ...ICON_PAIRS, DEFAULT_ICON];
const BADGE_COLOR = ['match', ['get', 'class'], ...COLOR_PAIRS_HEX, DEFAULT_GROUP_HEX];

// ---------------------------------------------------------------------------
// Composite badge images
// ---------------------------------------------------------------------------

/**
 * Every POI renders as a single symbol: coloured circle + white glyph baked
 * into one runtime image (`badge_<glyph>_<hexcolor>`). Rendering it as a unit
 * means the collision pass hides badge and glyph together (Google-style) and
 * removes the three separate circle layers that used to draw underneath -
 * fewer layers, far less overdraw.
 *
 * Canvas size is 2x the visual size so badges stay sharp on retina screens;
 * the image is registered with pixelRatio 2, which makes MapLibre display it
 * at exactly the 42px visual size with icon-size 1 - never upscaled, so it
 * never looks soft (the old raster pipeline could get blurry past icon-size
 * 1.05).
 */
const BADGE_CANVAS = 84; // 42 visual px * 2 for retina
const BADGE_RADIUS = 21; // visual px
const GLYPH_TARGET = 24; // visual px glyph box

/** The `#rrggbb` from the color expression, without the `#`. */
function badgeColor(hex: string): string {
  return hex.replace('#', '').toLowerCase();
}

export function badgeImageId(glyph: string, hexColor: string): string {
  return `onspot-badge_${glyph}_${badgeColor(hexColor)}`;
}

/**
 * Draws one badge: coloured circle + white Maki glyph. The glyph is drawn as
 * vector paths (Path2D), never taken from a sprite - the OpenFreeMap sprite
 * this originally read only ships placeholder circles for most POI icons, so
 * badges came out as blank white discs.
 */
function renderBadge(ctx: CanvasRenderingContext2D, glyphName: string, hexColor: string) {
  const c = BADGE_CANVAS / 2;
  ctx.clearRect(0, 0, BADGE_CANVAS, BADGE_CANVAS);

  // Coloured circle.
  ctx.beginPath();
  ctx.arc(c, c, BADGE_RADIUS * 2, 0, Math.PI * 2);
  ctx.fillStyle = `#${hexColor}`;
  ctx.fill();
  // White rim.
  ctx.beginPath();
  ctx.arc(c, c, BADGE_RADIUS * 2, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();
  // Soft drop shadow.
  ctx.beginPath();
  ctx.arc(c, c + 2, BADGE_RADIUS * 2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fill();

  // White glyph: Maki paths are fill-based in a 15x15 grid; scale them into
  // the badge centre (48px of the 84px canvas = 24px visual).
  const paths = MAKI_GLYPHS[glyphName] ?? MAKI_GLYPHS.marker;
  const glyphSize = GLYPH_TARGET * 2;
  const scale = glyphSize / 15;
  ctx.save();
  ctx.translate(c - glyphSize / 2, c - glyphSize / 2);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  for (const d of paths) {
    ctx.fill(new Path2D(d));
  }
  ctx.restore();
}

function toImageData(canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Replaces MapLibre's missing-image resolver: instead of aliasing unknown
 * names to the generic pin, it builds the composite badge for the requested
 * `onspot-badge_<glyph>_<color>` id on demand. The glyph comes from the
 * embedded Maki vector paths, so nothing depends on the style sprite (whose
 * POI icons are placeholder circles on OpenFreeMap) or on load timing - the
 * badge is drawn synchronously every time.
 */
export function installBadgeResolver(map: MaplibreMapType) {
  map.setMissingStyleImageResolver((id) => {
    if (map.hasImage(id)) return;
    const match = /^onspot-badge_(.+)_([0-9a-f]{6})$/.exec(id);
    if (!match) return;
    const canvas = document.createElement('canvas');
    canvas.width = BADGE_CANVAS;
    canvas.height = BADGE_CANVAS;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderBadge(ctx, match[1], match[2]);
    map.addImage(id, toImageData(canvas), { pixelRatio: 2 });
  });
}

/**
 * Badge ids are referenced by an expression, so MapLibre asks the resolver
 * for them lazily. The expression builds `onspot-badge_<glyph>_<color>` from
 * the feature's class/subclass - BADGE_COLOR already yields the hex without
 * its `#`, so the id needs no `replace` (which the expression parser does not
 * know and rejects at style load).
 */
const ICON_IMAGE = ['image', ['concat', 'onspot-badge_', GLYPH_NAME, '_', BADGE_COLOR]];

/**
 * Badge size by zoom. The badge image is 42 visual px, which is the right size
 * for a POI you are standing next to and far too big for one three districts
 * away - at the wider zooms the old flat 0.95 made a handful of shops look like
 * pins stabbed into the city ("die Icons sind zu groß wenn man weit weg ist").
 *
 * Ramping from 0.5 (21px) to 0.86 (36px) also does collision work for free:
 * smaller badges pack more places into the same street before the placement
 * pass starts dropping them. Every stop stays at or below 1x, so the
 * runtime-composited image is never upsampled and stays crisp throughout.
 */
const ICON_SIZE = [
  'interpolate',
  ['linear'],
  ['zoom'],
  13, 0.5,
  15, 0.62,
  16.5, 0.75,
  18, 0.86,
];

/**
 * Collision priority: the lower a POI's OpenMapTiles rank, the earlier it is
 * placed and the more likely it wins the space when badges overlap - Google's
 * "the relevant ones first" rule. Transit's late reveal is handled by the
 * opacity ramps above; this key only breaks ties in the placement pass.
 */
const SORT_KEY = ['coalesce', ['get', 'rank'], 99];

/**
 * Street furniture and micro-POIs that OSM mappers tag exhaustively but a map
 * reader never looks for - waste baskets, bike racks, bollards. Google's own
 * maps don't show these either below a dedicated "more" layer. Filtering them
 * out here also declutters real POIs that would otherwise be hidden under a
 * pile of bin icons.
 */
/**
 * Street furniture: things OpenMapTiles ships in the `poi` layer that Google
 * Maps does not draw as a place, because nobody navigates to one. Measured
 * across 143,319 real POIs in six cities, these are **46.4% of everything the
 * tiles contain** - bicycle parking alone is 10.5%, waste baskets 7.6%,
 * bollards 7.2%. Dropping them is the single biggest reason Google's map looks
 * calm and ours looked like confetti.
 */
const HIDDEN_CLASSES = [
  // Measured top offenders, in frequency order.
  'bicycle_parking', 'waste_basket', 'bollard', 'gate', 'parking',
  'motorcycle_parking', 'recycling', 'entrance', 'shelter', 'toilets',
  'lift_gate', 'drinking_water', 'telephone', 'cycle_barrier',
  // `information` is 2763 POIs of which board/guidepost/map are 2497 - notice
  // boards and signposts, not tourist information offices.
  'information',
  // `post` is 1778 of which post_box + parcel_locker are 1583 - mailboxes.
  'post',
  // Land use that leaks into the POI layer.
  'brownfield', 'landuse',
  // Long tail of barriers and micro-infrastructure.
  'roadblock', 'picnic_table', 'bench', 'give_way', 'stop', 'traffic_signals',
  'street_lamp', 'milestone', 'level_crossing', 'fire_hydrant', 'manhole',
  'waste_disposal', 'vending_machine', 'bicycle_repair_station', 'grit_bin',
  'defibrillator', 'survey_point', 'stile', 'kissing_gate', 'block', 'chicane',
  'parking_space', 'swing_gate', 'motorcycle_barrier', 'hunting_stand',
  'watering_place', 'clock', 'tree', 'sally_port',
];

/**
 * Subclass-level exclusions, for classes that are worth keeping overall but
 * carry a majority of non-places. `artwork` is the important one: 3398 of the
 * 5261 features in `class=art_gallery` are statues and murals, which is what
 * made shops appear to be "shown as art galleries" - the class was 65% not-a-
 * gallery to begin with.
 */
const HIDDEN_SUBCLASSES = [
  'artwork', 'post_box', 'parcel_locker', 'board', 'guidepost', 'map',
  'route_marker', 'stele', 'tactile_model', 'tactile_map', 'notice',
  'glass_cabinet', 'map_board',
];

const NOT_HIDDEN = [
  '!',
  [
    'any',
    ['in', ['get', 'class'], ['literal', HIDDEN_CLASSES]],
    ['in', ['get', 'subclass'], ['literal', HIDDEN_SUBCLASSES]],
  ],
];

/** The style's own POI symbol layers, if it has any. */
function nativePoiLayers(map: MaplibreMapType) {
  return map
    .getStyle()
    .layers.filter(
      (l) => 'source-layer' in l && l['source-layer'] === 'poi' && !l.id.startsWith('onspot-') && l.type === 'symbol'
    );
}

/**
 * Adds POI badge layers when the style lacks them. Safe to call repeatedly -
 * `setStyle` wipes everything the app added, so this runs again after every
 * style swap.
 */
export function addPoiLayers(map: MaplibreMapType, isDark: boolean) {
  const native = nativePoiLayers(map);
  const poiFilter = ['all', POINTS_ONLY, NOT_HIDDEN];

  if (native.length > 0) {
    // Liberty splits its POIs across three rank layers. Everything is folded
    // onto the first one and the other two are switched off, so the map draws
    // one symbol layer instead of three - the rank staging lives in
    // RANK_OPACITY now, a step function paired with the transition below.
    // `native` is in draw order, so take the *last* candidate: Liberty stacks
    // poi_r20 (least important) lowest and poi_r1 highest, and the surviving
    // layer should keep the topmost slot so POI badges still draw above the
    // rest of the basemap.
    const candidates = native.filter((l) => !l.id.includes('transit'));
    const primary = candidates[candidates.length - 1];
    if (!primary) return;

    // Everything below is idempotent but not free, and this runs on style
    // events. The badge existing means this style was already set up, so bail
    // out rather than re-validating a dozen expressions per event.
    if (map.getLayer('onspot-badge-setup')) return;

    for (const layer of native) {
      if (layer.id === primary.id || layer.id.includes('transit')) continue;
      map.setLayoutProperty(layer.id, 'visibility', 'none');
    }

    // Liberty has no icon fallback, so classes missing from the sprite
    // (office, atm, ferry_terminal, ...) come out as bare labels. Swap in the
    // badge expression that always resolves to something.
    map.setLayoutProperty(primary.id, 'icon-image', ICON_IMAGE as never);
    map.setLayoutProperty(primary.id, 'icon-size', ICON_SIZE as never);
    map.setLayoutProperty(primary.id, 'symbol-sort-key', SORT_KEY as never);
    // Collision placement is back ON (the old allow-overlap/ignore-placement
    // drew every badge on top of every other): overlapping badges hide, the
    // most relevant wins - Google Maps behaviour.
    map.setLayoutProperty(primary.id, 'icon-allow-overlap', false);
    map.setLayoutProperty(primary.id, 'icon-ignore-placement', false);
    // The other half of that behaviour, and the half Liberty does not set:
    // when a label has no room, Google drops the *label* and keeps the icon
    // rather than removing the place from the map. Without this the badge and
    // its text are one indivisible box, so a long name in a dense street takes
    // the whole POI down with it.
    map.setLayoutProperty(primary.id, 'text-optional', true);
    map.setPaintProperty(primary.id, 'icon-opacity', RANK_OPACITY as never);
    map.setPaintProperty(primary.id, 'icon-opacity-transition', FADE as never);
    map.setPaintProperty(primary.id, 'text-opacity', RANK_OPACITY as never);
    map.setPaintProperty(primary.id, 'text-opacity-transition', FADE as never);
    map.setFilter(primary.id, poiFilter as never);
    map.setLayerZoomRange(primary.id, POI_MINZOOM, 24);

    map.addLayer({ id: 'onspot-badge-setup', type: 'background', paint: { 'background-opacity': 0 } });
    return;
  }

  if (map.getLayer(OWN_POI_LAYER)) return;

  if (!map.getSource(POI_SOURCE_ID)) {
    map.addSource(POI_SOURCE_ID, { type: 'vector', url: OFM_TILES_URL });
  }

  map.addLayer({
    id: OWN_POI_LAYER,
    type: 'symbol',
    source: POI_SOURCE_ID,
    'source-layer': 'poi',
    minzoom: POI_MINZOOM,
    filter: poiFilter as never,
    layout: {
      'icon-image': ICON_IMAGE as never,
      'icon-size': ICON_SIZE as never,
      'symbol-sort-key': SORT_KEY as never,
      'text-field': TEXT_FIELD as never,
      // Bold, not Regular. The label is set at 11-13px over aerial imagery,
      // where a regular weight's thin stems land on roughly one screen pixel
      // and the SDF renderer has to fake the rest with grey - which is exactly
      // what read as "pixelige Kacke". A bold stem covers a full pixel and
      // comes out sharp. (OpenFreeMap's glyph endpoint serves Regular, Bold
      // and Italic only; there is no Medium to reach for.)
      'text-font': ['Noto Sans Bold'],
      // Google's arrangement: the name sits beside its icon and only stacks
      // above or below it when the side is taken. `text-variable-anchor` lets
      // the placement pass try each position in turn, so a dense street keeps
      // its labels instead of dropping them.
      'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
      'text-radial-offset': 0.75,
      'text-justify': 'auto',
      'text-max-width': 8,
      'text-size': ['interpolate', ['linear'], ['zoom'], 14, 11, 17, 13] as never,
      'text-letter-spacing': 0.01,
      'text-optional': true,
      'text-padding': 4,
    },
    paint: {
      // Dark basemaps and satellite imagery both need light text on a dark
      // halo; the light basemap is the other way round.
      'text-color': isDark ? '#ffffff' : '#3f3f46',
      'text-halo-color': isDark ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.95)',
      'text-halo-width': 1.4,
      // No blur at all: a blurred halo is a soft grey fringe around every
      // glyph, and a soft fringe at 11px is indistinguishable from a badly
      // scaled bitmap. A hard halo keeps the letterforms' edges.
      'text-halo-blur': 0,
      'icon-opacity': RANK_OPACITY as never,
      'icon-opacity-transition': FADE,
      'text-opacity': RANK_OPACITY as never,
      'text-opacity-transition': FADE,
    },
  });
}

/** Which POI classes/subclasses belong to each filter pill. Shared with the
 *  native map, which pre-filters the style JSON instead of calling setFilter. */
export const CATEGORY_MATCH: Record<string, string[]> = {
  food: ['restaurant', 'fast_food', 'pizza', 'burger', 'sushi', 'food_court', 'bbq', 'deli', 'kebab', 'noodle'],
  coffee: ['cafe', 'coffee', 'tea', 'ice_cream'],
  drinks: ['bar', 'beer', 'pub', 'biergarten', 'nightclub', 'wine', 'alcohol', 'alcohol_shop'],
  bakery: ['bakery', 'pastry', 'confectionery', 'chocolate'],
  groceries: ['grocery', 'supermarket', 'convenience', 'greengrocer', 'butcher', 'marketplace', 'kiosk', 'frozen_food', 'health_food'],
  shopping: [
    'shop', 'clothing_store', 'clothes', 'shoes', 'department_store', 'mall', 'gift',
    'jewelry', 'books', 'stationery', 'furniture', 'florist', 'toys', 'electronics',
    'mobile_phone', 'computer', 'hardware', 'doityourself', 'optician', 'bicycle',
    'music', 'sports', 'second_hand', 'variety_store', 'pet', 'perfumery',
  ],
  health: ['pharmacy', 'doctors', 'dentist', 'hospital', 'clinic', 'veterinary', 'chemist', 'optometrist'],
  beauty: ['hairdresser', 'beauty', 'massage', 'nail_salon', 'tattoo', 'cosmetics', 'spa'],
  culture: ['museum', 'art_gallery', 'theatre', 'cinema', 'library', 'attraction', 'monument', 'castle', 'gallery', 'arts_centre', 'zoo', 'aquarium', 'theme_park'],
  outdoors: ['park', 'garden', 'playground', 'dog_park', 'nature_reserve', 'picnic_site', 'viewpoint', 'water_park'],
  sport: [
    'pitch', 'stadium', 'swimming', 'swimming_pool', 'tennis', 'golf', 'soccer', 'basketball',
    'fitness_centre', 'sports_centre', 'climbing', 'bowling', 'yoga', 'martial_arts', 'dance',
  ],
  lodging: ['lodging', 'hotel', 'hostel', 'guest_house', 'motel', 'campsite', 'apartment', 'bed_and_breakfast'],
  finance: ['bank', 'atm', 'bureau_de_change'],
  auto: ['fuel', 'charging_station', 'car_repair', 'car_wash', 'car', 'car_parts', 'car_rental'],
};

/**
 * Opacity ramp for when a filter pill is active. The staged reveal above holds
 * everything that is not a shop back until z15.4, which is right for the
 * unfiltered map and wrong the moment the user asks for pharmacies: they have
 * said what they want, so the "don't spam the wide view" argument no longer
 * applies and the answer should be on screen at whatever zoom they are at.
 */
const FILTERED_OPACITY = ['step', ['zoom'], 0, POI_MINZOOM, 1];

/**
 * Restricts the POI layers to one filter pill's categories, or shows everything
 * when the category has no POI equivalent (Alle, Live, Gaming).
 */
export function applyPoiCategoryFilter(map: MaplibreMapType, category: string) {
  const wanted = CATEGORY_MATCH[category];
  const layers = [
    ...nativePoiLayers(map).map((l) => l.id),
    ...OWN_POI_LAYERS.filter((id) => map.getLayer(id)),
  ];

  for (const id of layers) {
    if (id.includes('transit')) continue;
    const base = BASE_FILTERS.get(id) ?? (map.getFilter(id) as unknown[] | undefined);
    if (base && !BASE_FILTERS.has(id)) BASE_FILTERS.set(id, base);

    const opacity = wanted ? FILTERED_OPACITY : RANK_OPACITY;
    map.setPaintProperty(id, 'icon-opacity', opacity as never);
    map.setPaintProperty(id, 'text-opacity', opacity as never);

    if (!wanted) {
      map.setFilter(id, (BASE_FILTERS.get(id) ?? null) as never);
      continue;
    }
    const match = [
      'any',
      ['in', ['get', 'class'], ['literal', wanted]],
      ['in', ['get', 'subclass'], ['literal', wanted]],
    ];
    const combined = base ? ['all', base, match] : match;
    map.setFilter(id, combined as never);
  }
}

/** Each layer's original filter, so a category can be cleared again. */
const BASE_FILTERS = new Map<string, unknown[] | undefined>();

/**
 * OSM's `image` tag, if it is something safe to load as an image. The value is
 * free text typed by a mapper, so it can be anything at all - a `javascript:`
 * URL, a Flickr page rather than a photo, or plain prose. Only absolute HTTPS
 * URLs are accepted; everything else falls through to the drawn cover, which
 * is always available.
 */
export function safeImageUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** German label for a POI class/subclass, for the preview card. */
export function describePoi(cls?: string, subclass?: string) {
  const key = subclass || cls || '';
  const NAMES: Record<string, string> = {
    hairdresser: 'Friseur',
    restaurant: 'Restaurant',
    fast_food: 'Imbiss',
    cafe: 'Café',
    bar: 'Bar',
    pub: 'Kneipe',
    biergarten: 'Biergarten',
    bakery: 'Bäckerei',
    butcher: 'Metzgerei',
    confectionery: 'Süßwaren',
    supermarket: 'Supermarkt',
    convenience: 'Spätkauf',
    greengrocer: 'Obst & Gemüse',
    clothes: 'Bekleidung',
    shoes: 'Schuhe',
    jewelry: 'Schmuck',
    pharmacy: 'Apotheke',
    doctors: 'Arztpraxis',
    dentist: 'Zahnarzt',
    veterinary: 'Tierarzt',
    hospital: 'Krankenhaus',
    bank: 'Bank',
    atm: 'Geldautomat',
    post_office: 'Post',
    fuel: 'Tankstelle',
    parking: 'Parkplatz',
    car_repair: 'Autowerkstatt',
    car: 'Autohaus',
    hotel: 'Hotel',
    hostel: 'Hostel',
    guest_house: 'Pension',
    museum: 'Museum',
    gallery: 'Galerie',
    cinema: 'Kino',
    theatre: 'Theater',
    library: 'Bibliothek',
    school: 'Schule',
    university: 'Universität',
    kindergarten: 'Kita',
    place_of_worship: 'Kirche',
    park: 'Park',
    playground: 'Spielplatz',
    florist: 'Blumenladen',
    furniture: 'Möbelhaus',
    optician: 'Optiker',
    hardware: 'Baumarkt',
    doityourself: 'Baumarkt',
    books: 'Buchladen',
    laundry: 'Wäscherei',
    beauty: 'Kosmetikstudio',
    fitness_centre: 'Fitnessstudio',
    sports_centre: 'Sportzentrum',
    swimming_pool: 'Schwimmbad',
    police: 'Polizei',
    fire_station: 'Feuerwehr',
    townhall: 'Rathaus',
    bus: 'Bushaltestelle',
    rail: 'Bahnhof',
    subway: 'U-Bahn',
    tram: 'Straßenbahn',
    airport: 'Flughafen',
    attraction: 'Sehenswürdigkeit',
    monument: 'Denkmal',
    castle: 'Schloss',
    viewpoint: 'Aussichtspunkt',
    toilets: 'Toilette',
  };
  if (NAMES[key]) return NAMES[key];
  const pretty = key.replace(/_/g, ' ').trim();
  return pretty ? pretty.charAt(0).toUpperCase() + pretty.slice(1) : 'Ort';
}
