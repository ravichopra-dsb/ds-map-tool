import type Feature from "ol/Feature";
import type { LineString } from "ol/geom";
import { getLength } from "ol/sphere";
import { extractCoordinates } from "./coordinateUtils";

export interface CustomProperty {
  id: string;
  key: string;
  value: string;
}

/**
 * Check if a string contains HTML description content (from KML)
 */
export const isHtmlDescription = (value: unknown): boolean => {
  if (!value || typeof value !== 'string') return false;
  return value.includes('<b>') && value.includes('</b>') && value.includes('<br');
};

/**
 * Parse HTML description from KML into key-value pairs.
 * Handles patterns like: <b>Label:</b> value<br/>
 * Returns empty object if description is not HTML format.
 */
export const parseHtmlDescription = (htmlDescription: unknown): Record<string, string> => {
  const result: Record<string, string> = {};

  if (!isHtmlDescription(htmlDescription)) {
    return result;
  }

  const html = htmlDescription as string;

  // Pattern to match <b>Key:</b> value<br/> or similar variations
  const pattern = /<b>([^<:]+):<\/b>\s*([^<]*?)(?:<br\s*\/?>|<img|$)/gi;

  let match;
  while ((match = pattern.exec(html)) !== null) {
    const key = match[1].trim();
    const value = match[2].trim();

    // Skip empty values
    if (key && value) {
      result[key] = value;
    }
  }

  // Extract all image URLs if present
  const imgPattern = /<img[^>]+src="([^"]+)"/gi;
  const imgMatches = [...html.matchAll(imgPattern)];
  if (imgMatches.length === 1) {
    result['Image URL'] = imgMatches[0][1];
  } else if (imgMatches.length > 1) {
    imgMatches.forEach((match, index) => {
      result[`Image URL ${index + 1}`] = match[1];
    });
  }

  return result;
};

/** Properties that cannot have their key changed */
export const PROTECTED_PROPERTY_KEYS = ["name", "long", "lat", "label"] as const;

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

/** Length unit options */
export type LengthUnit = "km" | "m";

/**
 * Format length based on selected unit
 */
export const formatLengthWithUnit = (meters: number, unit: LengthUnit): string => {
  if (unit === "m") {
    return `${meters.toFixed(3)}m`;
  }
  return `${(meters / 1000).toFixed(3)}km`;
};

/**
 * Get raw length in meters from formatted string
 */
export const parseLengthValue = (value: string): number => {
  const numMatch = value.match(/^([\d.]+)/);
  if (!numMatch) return 0;
  const num = parseFloat(numMatch[1]);
  if (value.endsWith("km")) {
    return num * 1000;
  }
  return num;
};

/** Style properties that have their own UI section */
const STYLE_PROPERTY_KEYS = [
  "lineColor",
  "lineWidth",
  "opacity",
  "strokeColor",
  "strokeWidth",
  "strokeOpacity",
  "fillColor",
  "fillOpacity",
  // Icon properties (Google Earth icons)
  "iconScale",
  "labelScale",
  "iconRotation",
  "textOffsetX",
  "textOffsetY",
  "iconUrl",
  "showLabel",
  // Revision Cloud properties
  "bulgeRatio",
  // Text properties
  "text",
  "textScale",
  "textRotation",
  "textOpacity",
  "textFillColor",
  "textStrokeColor",
  "textAlign",
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
  if (key === "label") return true;
  if (key === "lengthUnit") return true;
  if (key === "scallopRadius") return true;
  // Style properties have their own UI section in the panel
  if (isStyleProperty(key)) return true;
  return false;
};

/**
 * Extracts all displayable properties from a feature.
 * Includes coordinates (name, long, lat), label property, and custom properties.
 * Parses HTML description from KML into individual properties.
 */
export const extractAllProperties = (feature: Feature): CustomProperty[] => {
  const coords = extractCoordinates(feature);
  const properties = feature.getProperties();
  delete properties.geometry;

  const allProperties: CustomProperty[] = [];
  const geometry = feature.getGeometry();
  const geometryType = geometry?.getType();

  // Check if description contains HTML and parse it
  const description = properties.description;
  const parsedDescription = parseHtmlDescription(description);
  const hasHtmlDescription = Object.keys(parsedDescription).length > 0;

  // Add name first
  allProperties.push({ id: "prop-name", key: "name", value: coords.name });

  // Add label property (which property to use as display label)
  const labelValue = feature.get("label") || "name";
  allProperties.push({ id: "prop-label", key: "label", value: labelValue });

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
    const lengthMeters = getLength(geometry);
    const lengthUnit = (feature.get("lengthUnit") as LengthUnit) || "km";

    allProperties.push(
      { id: "prop-length", key: "length", value: formatLengthWithUnit(lengthMeters, lengthUnit) },
      { id: "prop-vertex", key: "vertex", value: String(coords.length) }
    );
  }

  // Add parsed description fields as individual properties (if HTML description exists)
  if (hasHtmlDescription) {
    Object.entries(parsedDescription).forEach(([key, value], index) => {
      allProperties.push({
        id: `prop-desc-${index}-${Date.now()}`,
        key,
        value,
      });
    });
  }

  // Add custom properties (filtered)
  // If description was parsed as HTML, exclude it from regular properties
  const filteredEntries = Object.entries(properties).filter(([key]) => {
    if (shouldExcludeProperty(key)) return false;
    // Exclude description if it was parsed as HTML
    if (key === "description" && hasHtmlDescription) return false;
    return true;
  });

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
    "label",
    "nonEditable",
    // Style properties
    "lineColor",
    "lineWidth",
    "opacity",
    "strokeColor",
    "strokeWidth",
    "strokeOpacity",
    "fillColor",
    "fillOpacity",
    "bulgeRatio",
    "originalPath",
    "scallopRadius",
    // Icon properties (Google Earth icons)
    "iconScale",
    "labelScale",
    "iconRotation",
    "textOffsetX",
    "textOffsetY",
    "iconUrl",
    "showLabel",
    // Text properties
    "text",
    "textScale",
    "textRotation",
    "textOpacity",
    "textFillColor",
    "textStrokeColor",
    "textAlign",
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

  // Handle label property
  const labelProp = properties.find((p) => p.key === "label");
  if (labelProp) {
    feature.set("label", labelProp.value.trim() || "name");
  }

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
