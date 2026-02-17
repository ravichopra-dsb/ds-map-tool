import type Map from 'ol/Map';
import { fromLonLat, toLonLat } from 'ol/proj';
import type { SearchResult } from '@/components/SearchPanel';

/**
 * Convert a search result coordinate to map projection
 */
export const convertSearchCoordinate = (
  lon: number,
  lat: number,
  _map?: Map
): [number, number] => {
  // Convert from WGS84 (lon, lat) to map projection
  const coordinate = fromLonLat([lon, lat]);
  return coordinate as [number, number];
};

/**
 * Convert map coordinate to lon/lat
 */
export const convertToLonLat = (
  coordinate: [number, number],
  _map?: Map
): [number, number] => {
  const [lon, lat] = toLonLat(coordinate);
  return [lon, lat];
};

/**
 * Format display name for search results
 */
export const formatSearchResultName = (result: SearchResult): string => {
  if (!result.display_name) return 'Unknown location';

  const parts = result.display_name.split(',');
  if (parts.length <= 2) return result.display_name;

  // Return first part (most specific) + last part (country/region)
  return `${parts[0].trim()}, ${parts[parts.length - 1].trim()}`;
};

/**
 * Get zoom level based on search result type
 */
export const getZoomForSearchResult = (_result: SearchResult): number => {
  return 11;
};

/**
 * Calculate bounding box for search result if available
 */
export const getBoundingBox = (result: SearchResult): [number, number, number, number] | null => {
  if (!result.boundingbox || result.boundingbox.length !== 4) {
    return null;
  }

  // Nominatim returns [minLat, maxLat, minLon, maxLon]
  const [minLat, maxLat, minLon, maxLon] = result.boundingbox;

  // Convert to OpenLayers format [minLon, minLat, maxLon, maxLat]
  return [minLon, minLat, maxLon, maxLat];
};

/**
 * Get search result description
 */
export const getSearchResultDescription = (result: SearchResult): string => {
  const parts = [];

  if (result.address) {
    if (result.address.city || result.address.town || result.address.village) {
      parts.push(result.address.city || result.address.town || result.address.village);
    }
    if (result.address.state || result.address.county) {
      parts.push(result.address.state || result.address.county);
    }
    if (result.address.country) {
      parts.push(result.address.country);
    }
  }

  return parts.length > 0 ? parts.join(', ') : result.display_name.split(',').slice(1).join(',').trim();
};