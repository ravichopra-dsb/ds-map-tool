import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import type { GeometryTypeName } from '@/types/features';

export interface HiddenTypesState {
  pit: boolean;
  tower: boolean;
  junction: boolean;
  gp: boolean;
  triangle: boolean;
  measure: boolean;
  arrow: boolean;
  freehand: boolean;
  polyline: boolean;
  legends: boolean;
  point: boolean;
  text: boolean;
  icon: boolean;
}

interface VisibilityConfig {
  hiddenKey: keyof HiddenTypesState;
  flag: string;
  types: GeometryTypeName[];
}

const VISIBILITY_CONFIGS: VisibilityConfig[] = [
  { hiddenKey: 'pit', flag: 'isPit', types: ['MultiLineString'] },
  { hiddenKey: 'tower', flag: 'isTower', types: ['GeometryCollection'] },
  { hiddenKey: 'junction', flag: 'isJunction', types: ['GeometryCollection'] },
  { hiddenKey: 'gp', flag: 'isGP', types: ['GeometryCollection'] },
  { hiddenKey: 'triangle', flag: 'isTriangle', types: ['Polygon'] },
  { hiddenKey: 'measure', flag: 'isMeasure', types: ['LineString', 'MultiLineString'] },
  { hiddenKey: 'arrow', flag: 'isArrow', types: ['LineString', 'MultiLineString'] },
  { hiddenKey: 'freehand', flag: 'isFreehand', types: ['LineString', 'MultiLineString'] },
  { hiddenKey: 'polyline', flag: 'isPolyline', types: ['LineString', 'MultiLineString'] },
  { hiddenKey: 'legends', flag: 'islegends', types: ['LineString', 'MultiLineString'] },
  { hiddenKey: 'point', flag: 'isPoint', types: ['Point'] },
];

/**
 * Check if a feature should be hidden based on the current visibility settings
 * Consolidates 11 duplicate hidden type checks into a single utility function
 */
export const isFeatureHidden = (
  feature: Feature<Geometry>,
  hiddenTypes: Partial<HiddenTypesState>
): boolean => {
  const type = feature.getGeometry()?.getType() as GeometryTypeName | undefined;
  if (!type) return false;

  return VISIBILITY_CONFIGS.some(
    (config) =>
      hiddenTypes[config.hiddenKey] &&
      feature.get(config.flag) &&
      config.types.includes(type)
  );
};

/**
 * Check if a text feature should be hidden
 */
export const isTextFeatureHidden = (
  feature: Feature<Geometry>,
  hiddenTypes: Partial<HiddenTypesState>
): boolean => {
  const type = feature.getGeometry()?.getType();
  return !!(hiddenTypes.text && feature.get('isText') && type === 'Point');
};

/**
 * Get all visibility config entries - useful for debugging or UI
 */
export const getVisibilityConfigs = () => VISIBILITY_CONFIGS;
