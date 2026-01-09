import type Feature from "ol/Feature";
import type Geometry from "ol/geom/Geometry";
import type { FeatureLike } from "ol/Feature";
import { isTriangleFeature } from "@/icons/Triangle";
import { isPitFeature } from "@/icons/Pit";
import { isGPFeature } from "@/icons/Gp";
import { isJunctionFeature } from "@/icons/JunctionPoint";

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

  // NOT editable: Special icon features (Triangle, Pit, GP, Junction)
  if (
    isTriangleFeature(feature as Feature<Geometry>) ||
    isPitFeature(feature as Feature<Geometry>) ||
    isGPFeature(feature as Feature<Geometry>) ||
    isJunctionFeature(feature as Feature<Geometry>)
  ) {
    return false;
  }

  // NOT editable: Box and Circle shapes (no vertex editing)
  if (feature.get("isBox") || feature.get("isCircle")) {
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
  const isTower = feature.get("isTower");

  // Cannot select point features
  if (geometryType === "Point" || geometryType === "MultiPoint") {
    return false;
  }

  // Cannot select special icon features (Triangle, Pit, GP, Junction)
  if (
    isTriangleFeature(feature as Feature<Geometry>) ||
    isPitFeature(feature as Feature<Geometry>) ||
    isGPFeature(feature as Feature<Geometry>) ||
    isJunctionFeature(feature as Feature<Geometry>)
  ) {
    return false;
  }

  // Cannot select tower features
  if (isTower) {
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
 * Only Polyline and Freehand LineString features support custom styling
 * Excludes: Measure, Arrow, Legends
 */
export const supportsCustomLineStyle = (feature: FeatureLike): boolean => {
  const geometry = feature.getGeometry();
  if (!geometry || geometry.getType() !== "LineString") return false;

  // Include: Polyline and Freehand
  const isPolyline = feature.get("isPolyline");
  const isFreehand = feature.get("isFreehand");
  const isArrow = feature.get("isArrow");
  const isLegends = feature.get("islegends");

  // Exclude: Measure, Arrow, Legends
  const isMeasure = feature.get("isMeasure");

  return (isPolyline || isFreehand || isArrow || isLegends) && !isMeasure;
};

/**
 * Default line style configuration
 */
export const DEFAULT_LINE_STYLE = {
  color: "#00ff00",
  width: 4,
} as const;