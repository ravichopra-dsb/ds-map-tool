import { Feature } from "ol";
import type { FeatureLike } from "ol/Feature";
import { Geometry } from "ol/geom";
import { isTriangleFeature, triangleUtils } from "@/icons/Triangle";
import { isPitFeature, pitUtils } from "@/icons/Pit";
import { isGPFeature, gpUtils } from "@/icons/Gp";
import { isJunctionFeature, junctionUtils } from "@/icons/JunctionPoint";

/**
 * Feature type checker configuration
 */
interface FeatureTypeChecker {
  isFeature: (feature: Feature<Geometry>) => boolean;
  geometryType?: string;
}

/**
 * Feature type checker map for different icon types
 */
const FEATURE_TYPE_CHECKERS: Record<string, FeatureTypeChecker> = {
  triangle: {
    isFeature: isTriangleFeature,
    geometryType: "Polygon",
  },
  pit: {
    isFeature: isPitFeature,
    geometryType: "Polygon",
  },
  gp: {
    isFeature: isGPFeature,
    geometryType: "Polygon",
  },
  junction: {
    isFeature: isJunctionFeature,
    geometryType: "Polygon",
  },
};

/**
 * Generic function to check if a feature matches a specific type
 * @param feature - The feature to check
 * @param type - The feature type to check against
 * @returns True if the feature matches the specified type
 */
export const isFeatureType = (
  feature: FeatureLike,
  type: string
): boolean => {
  const checker = FEATURE_TYPE_CHECKERS[type];
  if (!checker) return false;

  const geometry = feature.getGeometry();
  if (!geometry) return false;

  // Check geometry type if specified
  if (checker.geometryType && geometry.getType() !== checker.geometryType) {
    return false;
  }

  // Check feature-specific conditions
  return checker.isFeature(feature as Feature<Geometry>);
};

/**
 * Get all registered feature types
 * @returns Array of feature type names
 */
export const getFeatureTypes = (): string[] => {
  return Object.keys(FEATURE_TYPE_CHECKERS);
};

/**
 * Check if a feature is any of the registered icon types
 * @param feature - The feature to check
 * @returns True if the feature is any registered icon type
 */
export const isIconFeature = (feature: FeatureLike): boolean => {
  return getFeatureTypes().some((type) => isFeatureType(feature, type));
};

/**
 * Get the style function for a specific feature type
 * @param feature - The feature to get style for
 * @returns Style function or null if not found
 */
export const getFeatureTypeStyle = (feature: FeatureLike) => {
  const geometry = feature.getGeometry();
  if (!geometry) return null;

  // Check each feature type and return its style
  if (isFeatureType(feature, "triangle")) {
    return triangleUtils.getStyle();
  }

  if (isFeatureType(feature, "pit")) {
    return pitUtils.getStyle();
  }

  if (isFeatureType(feature, "gp")) {
    return gpUtils.getStyles();
  }

  if (isFeatureType(feature, "junction")) {
    return junctionUtils.getStyles();
  }

  return null;
};