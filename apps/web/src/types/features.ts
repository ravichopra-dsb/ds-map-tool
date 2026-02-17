export const FEATURE_FLAGS = {
  ARROW: 'isArrow',
  TEXT: 'isText',
  LEGENDS: 'islegends',  // Keep existing casing
  MEASURE: 'isMeasure',
  POINT: 'isPoint',
  POLYLINE: 'isPolyline',
  FREEHAND: 'isFreehand',
  ICON: 'isIcon',
} as const;

export type FeatureFlag = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];

export interface FeatureProperties {
  name?: string;
  isArrow?: boolean;
  isText?: boolean;
  islegends?: boolean;
  isMeasure?: boolean;
  isPoint?: boolean;
  isPolyline?: boolean;
  isFreehand?: boolean;
  isIcon?: boolean;
  distance?: number;
  legendType?: string;
  iconPath?: string;
  text?: string;
  textScale?: number;
  textRotation?: number;
  color?: string;
  width?: number;
}

export type GeometryTypeName =
  | 'Point'
  | 'LineString'
  | 'MultiLineString'
  | 'Polygon'
  | 'MultiPolygon'
  | 'GeometryCollection'
  | 'Circle';
