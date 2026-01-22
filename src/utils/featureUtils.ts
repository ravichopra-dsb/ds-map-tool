import { Feature } from "ol";
import type { FeatureLike } from "ol/Feature";
import { Geometry } from "ol/geom";
import { Style, Icon } from "ol/style";

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
const FEATURE_TYPE_CHECKERS: Record<string, FeatureTypeChecker> = {};

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

  // Get opacity from feature (default to 1)
  const opacity = feature.get("opacity") !== undefined ? feature.get("opacity") : 1;

  // Handle custom icon features from icon picker
  if (feature.get("isIcon")) {
    const iconPath = feature.get("iconPath");
    if (iconPath) {
      return new Style({
        image: new Icon({
          src: iconPath,
          scale: 0.5,
          anchor: [0.5, 0.5],
          anchorXUnits: "fraction",
          anchorYUnits: "fraction",
          opacity: opacity, // Apply opacity to icon
        }),
      });
    }
  }

  return null;
};