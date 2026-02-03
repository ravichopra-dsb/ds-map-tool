import type { FeatureLike } from "ol/Feature";

/**
 * Universal selector - ALL features with geometry are selectable
 * This allows users to select any feature on the map for inspection
 */
export const isSelectableFeature = (feature: FeatureLike): boolean => {
  const geometry = feature.getGeometry();
  return geometry !== null; // Only require geometry to exist
};

/**
 * Determines if a feature can be edited/modified.
 * Only allows editing of Polyline, Freehand Line, Arrow, and Legend features.
 * All other features can be selected but not modified.
 */
export const isEditableFeature = (feature: FeatureLike): boolean => {
  const geometry = feature.getGeometry();
  if (!geometry) return false;

  const geometryType = geometry.getType();

  // Get feature properties
  const isArrow = feature.get("isArrow");
  const isLegends = feature.get("islegends");
  const isText = feature.get("isText");

  // Editable: Arrow features
  if (isArrow) {
    return true;
  }

  // Editable: Legend features
  if (isLegends) {
    return true;
  }

  // Editable: Text features
  if (isText) {
    return true;
  }

  // Arc features: NOT editable via standard Modify interaction
  // Arc editing is handled by useArcModify hook with 3 control points
  const isArc = feature.get("isArc");
  if (isArc) {
    return false;
  }

  // NOT editable: Box, Circle, and Revision Cloud shapes (no vertex editing)
  if (feature.get("isBox") || feature.get("isCircle") || feature.get("isRevisionCloud")) {
    return false;
  }

  // Editable: LineString/MultiLineString features (Polyline, Freehand) but not icon features
  if (geometryType === "LineString" || geometryType === "MultiLineString") {
    return true;
  }

  // All other feature types are not editable
  return false;
};

/**
 * Legacy function for backward compatibility.
 * Determines if a feature can be selected based on its type.
 * Only allows selection of Polyline, Freehand Line, Arrow, and Legend features.
 * @deprecated Use isSelectableFeature() for selection and isEditableFeature() for editing
 */
export const isLegacySelectableFeature = (feature: FeatureLike): boolean => {
  const geometry = feature.getGeometry();
  if (!geometry) return false;

  const geometryType = geometry.getType();

  // Get feature properties
  const isArrow = feature.get("isArrow");
  const isLegends = feature.get("islegends");

  // Cannot select point features
  if (geometryType === "Point" || geometryType === "MultiPoint") {
    return false;
  }

  // CAN select: Arrow features
  if (isArrow) {
    return true;
  }

  // CAN select: Legend features
  if (isLegends) {
    return true;
  }

  // CAN select: LineString/MultiLineString features (Polyline, Freehand)
  if (geometryType === "LineString" || geometryType === "MultiLineString") {
    return true;
  }

  // All other feature types are not selectable
  return false;
};

/**
 * Determines if a feature supports custom line styling (width and color)
 * Only Polyline, Freehand, Arrow, Legends, and Arc LineString/MultiLineString features support custom styling
 * Excludes: Measure
 */
export const supportsCustomLineStyle = (feature: FeatureLike): boolean => {
  const geometry = feature.getGeometry();
  const geomType = geometry?.getType();
  if (!geometry || (geomType !== "LineString" && geomType !== "MultiLineString")) return false;

  // Include: Polyline, Freehand, Arrow, Legends, Arc
  const isPolyline = feature.get("isPolyline");
  const isFreehand = feature.get("isFreehand");
  const isArrow = feature.get("isArrow");
  const isLegends = feature.get("islegends");
  const isArc = feature.get("isArc");

  // Exclude: Measure
  const isMeasure = feature.get("isMeasure");

  return (isPolyline || isFreehand || isArrow || isLegends || isArc) && !isMeasure;
};

/**
 * Default line style configuration
 */
export const DEFAULT_LINE_STYLE = {
  color: "#00ff00",
  width: 4,
} as const;

/**
 * Default text style configuration
 */
export const DEFAULT_TEXT_STYLE = {
  fillColor: "#000000",
  strokeColor: "#ffffff",
} as const;

/**
 * Determines if a feature supports custom text styling (fill and stroke colors)
 * Only text features support custom text styling
 */
export const supportsTextStyle = (feature: FeatureLike): boolean => {
  return feature.get("isText") === true;
};