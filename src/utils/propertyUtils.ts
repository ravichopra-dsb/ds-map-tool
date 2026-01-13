import type Feature from "ol/Feature";
import type { LineString } from "ol/geom";
import { getLength } from "ol/sphere";
import { extractCoordinates } from "./coordinateUtils";

export interface CustomProperty {
  id: string;
  key: string;
  value: string;
}

/** Properties that cannot have their key changed */
export const PROTECTED_PROPERTY_KEYS = ["name", "long", "lat"] as const;

/**
 * Check if a property key is protected (cannot be deleted or renamed)
 */
export const isProtectedProperty = (key: string): boolean => {
  return PROTECTED_PROPERTY_KEYS.includes(
    key as (typeof PROTECTED_PROPERTY_KEYS)[number]
  );
};

/** Properties that are calculated and fully read-only (both key and value) */
export const CALCULATED_PROPERTY_KEYS = ["length", "vertex"] as const;

/**
 * Check if a property is calculated (completely read-only)
 */
export const isCalculatedProperty = (key: string): boolean => {
  return CALCULATED_PROPERTY_KEYS.includes(
    key as (typeof CALCULATED_PROPERTY_KEYS)[number]
  );
};

/**
 * Format length in meters to human-readable string
 */
const formatLength = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
};

/** Style properties that have their own UI section */
const STYLE_PROPERTY_KEYS = [
  "lineColor",
  "lineWidth",
  "strokeColor",
  "fillColor",
  "fillOpacity",
] as const;

/**
 * Check if a property is a style property (has its own UI section)
 */
export const isStyleProperty = (key: string): boolean => {
  return STYLE_PROPERTY_KEYS.includes(key as (typeof STYLE_PROPERTY_KEYS)[number]);
};

/**
 * Check if a property should be excluded from display
 */
const shouldExcludeProperty = (key: string): boolean => {
  if (key.startsWith("is")) return true;
  if (key === "nonEditable") return true;
  if (key.startsWith("_")) return true;
  if (key === "name") return true;
  // Style properties have their own UI section in the panel
  if (isStyleProperty(key)) return true;
  return false;
};

/**
 * Extracts all displayable properties from a feature.
 * Includes coordinates (name, long, lat) and custom properties.
 */
export const extractAllProperties = (feature: Feature): CustomProperty[] => {
  const coords = extractCoordinates(feature);
  const properties = feature.getProperties();
  delete properties.geometry;

  const allProperties: CustomProperty[] = [];
  const geometry = feature.getGeometry();
  const geometryType = geometry?.getType();

  // Add name first
  allProperties.push({ id: "prop-name", key: "name", value: coords.name });

  // Add lon/lat for all features except LineString
  if (geometryType !== "LineString") {
    allProperties.push(
      { id: "prop-long", key: "long", value: coords.long },
      { id: "prop-lat", key: "lat", value: coords.lat }
    );
  }

  // Add length and vertex count for LineString features
  if (geometryType === "LineString" && geometry) {
    const lineString = geometry as LineString;
    const coords = lineString.getCoordinates();
    const length = getLength(geometry);

    allProperties.push(
      { id: "prop-length", key: "length", value: formatLength(length) },
      { id: "prop-vertex", key: "vertex", value: String(coords.length) }
    );
  }

  // Add custom properties (filtered)
  const filteredEntries = Object.entries(properties).filter(
    ([key]) => !shouldExcludeProperty(key)
  );

  filteredEntries.forEach(([key, value], index) => {
    allProperties.push({
      id: `prop-${index}-${Date.now()}`,
      key,
      value: String(value),
    });
  });

  return allProperties;
};

/**
 * Applies properties to a feature, including coordinate updates.
 */
export const applyPropertiesToFeature = (
  feature: Feature,
  properties: CustomProperty[],
  updateCoordinates: (lon: number, lat: number, name: string) => void
): void => {
  // Extract coordinates from properties
  const nameProp = properties.find((p) => p.key === "name");
  const longProp = properties.find((p) => p.key === "long");
  const latProp = properties.find((p) => p.key === "lat");

  // Update coordinates if they exist
  if (longProp && latProp) {
    const lon = parseFloat(longProp.value);
    const lat = parseFloat(latProp.value);
    if (!isNaN(lon) && !isNaN(lat)) {
      updateCoordinates(lon, lat, nameProp?.value || "");
    }
  } else if (nameProp) {
    // Update name only
    if (nameProp.value.trim()) {
      feature.set("name", nameProp.value.trim());
    } else {
      feature.unset("name");
    }
  }

  // Clear existing custom properties (preserve style and system properties)
  const PRESERVED_KEYS = [
    "geometry",
    "name",
    "nonEditable",
    // Style properties
    "lineColor",
    "lineWidth",
    "strokeColor",
    "fillColor",
    "fillOpacity",
  ];

  const currentProperties = feature.getProperties();
  Object.keys(currentProperties).forEach((key) => {
    if (
      !key.startsWith("is") &&
      !key.startsWith("_") &&
      !PRESERVED_KEYS.includes(key)
    ) {
      feature.unset(key);
    }
  });

  // Set new custom properties (skip protected and style properties)
  properties.forEach((prop) => {
    const key = prop.key.trim();
    if (
      key &&
      prop.value.trim() &&
      !isProtectedProperty(key) &&
      !isStyleProperty(key)
    ) {
      feature.set(key, prop.value.trim());
    }
  });
};

/**
 * Creates a new empty custom property
 */
export const createEmptyProperty = (): CustomProperty => ({
  id: `prop-new-${Date.now()}`,
  key: "",
  value: "",
});
