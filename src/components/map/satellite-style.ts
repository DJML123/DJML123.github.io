import type { StyleSpecification } from 'maplibre-gl';
import { OFM_GLYPHS, OFM_SPRITE, OFM_TILES_URL } from './poi-layer';

// Esri's free World Imagery for a real satellite view - keyless, no vector
// style needed. Raster styles carry no sprite or glyph endpoint of their own,
// but the POI icons and labels drawn on top need both, so point at
// OpenFreeMap's. The vector source rides along for roads and place names:
// bare imagery is pretty but impossible to navigate, which is why Google's
// satellite view keeps its road network and labels too.
export const SATELLITE_STYLE: StyleSpecification = {
  version: 8 as const,
  glyphs: OFM_GLYPHS,
  sprite: OFM_SPRITE,
  sources: {
    esri: {
      type: 'raster' as const,
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      // Esri's imagery genuinely runs out around z20 in most places - past
      // that it serves an actual 200 OK "Map data not yet available" tile
      // (a grey placeholder baked into the image, not an HTTP error, so
      // MapLibre has no way to detect and skip it on its own). Capping
      // maxzoom here makes MapLibre stop requesting new tiles at 20 and
      // instead upscale the last real one, the same over-zoom behaviour
      // every slippy map uses past a source's native resolution - blurry
      // past z20 instead of a broken grey tile.
      maxzoom: 20,
      attribution: 'Esri, Maxar, Earthstar Geographics',
    },
    openmaptiles: { type: 'vector' as const, url: OFM_TILES_URL },
  },
  layers: [
    { id: 'esri-satellite', type: 'raster' as const, source: 'esri' },
    {
      // Roads as translucent white ribbons: enough to read the street grid
      // through, without turning the imagery into a normal map.
      id: 'sat-roads',
      type: 'line' as const,
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 12,
      filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'], true, false],
      layout: { 'line-join': 'round' as const, 'line-cap': 'round' as const },
      paint: {
        'line-color': 'rgba(255,255,255,0.55)',
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.6, 16, 2.2, 19, 5],
      },
    },
    {
      // 3D building volumes were removed entirely: without a proprietary
      // photogrammetry provider the extruded blocks never looked right. The
      // satellite view stays flat - real aerial imagery with a translucent
      // road grid is all it needs.
      id: 'sat-road-labels',
      type: 'symbol' as const,
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      minzoom: 14,
      layout: {
        'symbol-placement': 'line' as const,
        'text-field': ['coalesce', ['get', 'name:de'], ['get', 'name']],
        'text-font': ['Noto Sans Regular'],
        'text-size': 11,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': 'rgba(0,0,0,0.75)',
        'text-halo-width': 1.3,
      },
    },
    {
      id: 'sat-place-labels',
      type: 'symbol' as const,
      source: 'openmaptiles',
      'source-layer': 'place',
      maxzoom: 15,
      filter: ['match', ['get', 'class'], ['city', 'town', 'suburb', 'neighbourhood'], true, false],
      layout: {
        'text-field': ['coalesce', ['get', 'name:de'], ['get', 'name']],
        'text-font': ['Noto Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 8, 12, 14, 15],
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': 'rgba(0,0,0,0.8)',
        'text-halo-width': 1.5,
      },
    },
  ],
};
