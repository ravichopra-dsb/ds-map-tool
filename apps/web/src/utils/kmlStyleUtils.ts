import { Feature } from "ol";
import type { Geometry } from "ol/geom";
import type { Folder } from "@/types/folders";
import { restructureKmlWithFolders, escapeXml } from "./kmlFolderUtils";
import { getLegendById } from "@/tools/legendsConfig";

// ============================================================================
// COLOR CONVERSION UTILITIES
// ============================================================================

/**
 * Convert hex color (#RRGGBB) to KML format (AABBGGRR)
 * KML uses alpha-blue-green-red order
 */
export const hexToKmlColor = (hex: string, opacity: number = 1): string => {
  // Remove # if present
  const cleanHex = hex.replace("#", "");

  // Parse RGB components
  const r = cleanHex.substring(0, 2);
  const g = cleanHex.substring(2, 4);
  const b = cleanHex.substring(4, 6);

  // Convert opacity (0-1) to hex (00-ff)
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, "0");

  // KML format: AABBGGRR
  return `${alpha}${b}${g}${r}`;
};

/**
 * Convert KML color (AABBGGRR) to hex format (#RRGGBB) and opacity
 */
export const kmlColorToHex = (kmlColor: string): { color: string; opacity: number } => {
  // Handle missing or invalid colors
  if (!kmlColor || kmlColor.length < 8) {
    return { color: "#000000", opacity: 1 };
  }

  const alpha = kmlColor.substring(0, 2);
  const b = kmlColor.substring(2, 4);
  const g = kmlColor.substring(4, 6);
  const r = kmlColor.substring(6, 8);

  const opacity = parseInt(alpha, 16) / 255;
  const color = `#${r}${g}${b}`;

  return { color, opacity };
};

// ============================================================================
// KML STYLE EXPORT (App → Google Earth)
// ============================================================================

interface KmlStyleInfo {
  styleId: string;
  styleXml: string;
}

/**
 * Generate a KML <Style> element for a feature
 */
export const featureToKmlStyle = (feature: Feature<Geometry>, index: number): KmlStyleInfo | null => {
  const geomType = feature.getGeometry()?.getType();
  const styleId = `style_${index}`;

  // Get feature properties - resolve legend colors from config
  const legendTypeId = feature.get("legendType");
  const legendConfig = legendTypeId ? getLegendById(legendTypeId) : null;
  const lineColor = feature.get("lineColor") || feature.get("strokeColor") || legendConfig?.style.strokeColor || "#00ff00";
  const lineWidth = feature.get("lineWidth") || legendConfig?.style.strokeWidth || 2;
  const fillColor = feature.get("fillColor") || "#000000";
  const fillOpacity = feature.get("fillOpacity") ?? 0;
  const strokeOpacity = feature.get("strokeOpacity") ?? 1;
  const opacity = feature.get("opacity") ?? 1;
  const iconPath = feature.get("iconPath");
  const iconScale = feature.get("iconScale") || 1;

  let styleXml = `<Style id="${styleId}">`;

  // LineString types (Polyline, Freehand, Arrow, Arc, Measure)
  if (geomType === "LineString") {
    const kmlLineColor = hexToKmlColor(lineColor, strokeOpacity);
    styleXml += `
    <LineStyle>
      <color>${kmlLineColor}</color>
      <width>${lineWidth}</width>
    </LineStyle>`;
  }

  // Polygon types (Box, Circle, RevisionCloud)
  if (geomType === "Polygon") {
    const kmlStrokeColor = hexToKmlColor(lineColor, strokeOpacity);
    const kmlFillColor = hexToKmlColor(fillColor, fillOpacity);
    styleXml += `
    <LineStyle>
      <color>${kmlStrokeColor}</color>
      <width>${lineWidth}</width>
    </LineStyle>
    <PolyStyle>
      <color>${kmlFillColor}</color>
      <fill>1</fill>
      <outline>1</outline>
    </PolyStyle>`;
  }

  // Point types (Point, Icon, GP, Tower, etc.)
  if (geomType === "Point") {
    const kmlIconOpacity = hexToKmlColor("#ffffff", opacity);

    // Determine icon URL
    let iconHref = "http://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png";
    if (iconPath) {
      // Convert local icon path to Google Earth icon if possible
      iconHref = convertIconPathToGoogleEarth(iconPath);
    }

    styleXml += `
    <IconStyle>
      <color>${kmlIconOpacity}</color>
      <scale>${iconScale}</scale>
      <Icon>
        <href>${iconHref}</href>
      </Icon>
    </IconStyle>
    <LabelStyle>
      <scale>1</scale>
    </LabelStyle>`;
  }

  styleXml += `
</Style>`;

  return { styleId, styleXml };
};

/**
 * Convert app icon path to Google Earth compatible URL
 */
const convertIconPathToGoogleEarth = (iconPath: string): string => {
  // If it's already a Google URL, return as-is
  if (iconPath.startsWith("http://maps.google.com") || iconPath.startsWith("https://")) {
    return iconPath;
  }

  return "https://ds-map-tool.vercel.app" + iconPath;
};

/**
 * Inject KML <Style> elements into KML string for Google Earth compatibility
 * Optionally restructures KML with folder hierarchy if folders are provided
 */
export const injectKmlStyles = (
  kmlString: string,
  features: Feature<Geometry>[],
  folders?: Record<string, Folder>
): string => {
  // Generate styles for each feature
  const styles: KmlStyleInfo[] = [];
  const styleUrls: Map<Feature<Geometry>, string> = new Map();

  features.forEach((feature, index) => {
    const styleInfo = featureToKmlStyle(feature, index);
    if (styleInfo) {
      styles.push(styleInfo);
      styleUrls.set(feature, `#${styleInfo.styleId}`);
    }
  });

  // Build styles XML block
  const stylesXml = styles.map(s => s.styleXml).join("\n");

  // Ensure <Document> wrapper exists (OpenLayers may omit it for single features)
  let documentMatch = kmlString.match(/<Document[^>]*>/);
  if (!documentMatch) {
    // Wrap all content inside <kml> with a <Document> element
    kmlString = kmlString.replace(
      /(<kml[^>]*>)/,
      "$1\n<Document>"
    );
    kmlString = kmlString.replace(
      /<\/kml>/,
      "</Document>\n</kml>"
    );
    documentMatch = kmlString.match(/<Document[^>]*>/);
    if (!documentMatch) {
      console.warn("Could not create <Document> tag in KML");
      return kmlString;
    }
  }

  const insertPos = (documentMatch.index || 0) + documentMatch[0].length;

  // Insert styles after <Document>
  let result = kmlString.slice(0, insertPos) + "\n" + stylesXml + kmlString.slice(insertPos);

  // Add styleUrl references to each Placemark and update names for text features
  // Match Placemarks and their ExtendedData to correlate with features
  let featureIndex = 0;
  result = result.replace(/<Placemark>([\s\S]*?)<\/Placemark>/g, (match) => {
    const feature = features[featureIndex];
    const styleUrl = styleUrls.get(feature);
    featureIndex++;

    let placemarkContent = match;

    // Add styleUrl after <Placemark>
    if (styleUrl) {
      placemarkContent = placemarkContent.replace(
        /<Placemark>/,
        `<Placemark>\n    <styleUrl>${styleUrl}</styleUrl>`
      );
    }

    // =======================================================
    // FIX: Inject strokeDash into KML ExtendedData
    // =======================================================
    const dashArray = feature.get("strokeDash");
    if (Array.isArray(dashArray) && dashArray.length > 0) {
      const dashString = dashArray.join(','); // Convert [16, 12] back to "16,12"

      // Check if ExtendedData already exists
      if (placemarkContent.includes("<ExtendedData>")) {
        // Append to existing ExtendedData
        placemarkContent = placemarkContent.replace(
          /(<\/ExtendedData>)/,
          `    <Data name="strokeDash"><value>${dashString}</value></Data>\n$1`
        );
      } else {
        // Create new ExtendedData block (insert before closing Placemark)
        placemarkContent = placemarkContent.replace(
          /(<\/Placemark>)/,
          `    <ExtendedData>\n    <Data name="strokeDash"><value>${dashString}</value></Data>\n    </ExtendedData>\n$1`
        );
      }
    }
    // =======================================================

    // For text features, update the <name> element with the text content
    if (feature.get("isText")) {
      const textContent = feature.get("text");
      if (textContent) {
        // Replace existing <name> element or add one
        if (placemarkContent.includes("<name>")) {
          placemarkContent = placemarkContent.replace(
            /<name>[\s\S]*?<\/name>/,
            `<name>${escapeXml(textContent)}</name>`
          );
        } else {
          placemarkContent = placemarkContent.replace(
            /<Placemark>/,
            `<Placemark>\n    <name>${escapeXml(textContent)}</name>`
          );
        }
      }
    }

    return placemarkContent;
  });

  // If folders provided, restructure KML with folder hierarchy
  if (folders && Object.keys(folders).length > 0) {
    return restructureKmlWithFolders(result, folders, features);
  }

  return result;
};

// ============================================================================
// KML STYLE IMPORT (Google Earth → App)
// ============================================================================

export interface ParsedKmlStyle {
  lineColor?: string;
  lineWidth?: number;
  strokeColor?: string;
  strokeOpacity?: number;
  fillColor?: string;
  fillOpacity?: number;
  iconHref?: string;
  iconScale?: number;
  labelScale?: number;
}

/**
 * Parse KML styles from KML text
 * Returns a map of styleId → style properties
 */
export const parseKmlStyles = (kmlText: string): Map<string, ParsedKmlStyle> => {
  const styleMap = new Map<string, ParsedKmlStyle>();
  const styleMaps = new Map<string, string>(); // StyleMap id → normal style id

  // Parse using DOMParser
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlText, "text/xml");

  // First, parse StyleMap elements to get normal style references
  const styleMapElements = doc.querySelectorAll("StyleMap");
  styleMapElements.forEach((styleMapEl) => {
    const id = styleMapEl.getAttribute("id");
    if (!id) return;

    // Find the normal style (not highlight)
    const pairs = styleMapEl.querySelectorAll("Pair");
    pairs.forEach((pair) => {
      const key = pair.querySelector("key")?.textContent;
      if (key === "normal") {
        const styleUrl = pair.querySelector("styleUrl")?.textContent;
        if (styleUrl) {
          // Remove # prefix
          styleMaps.set(id, styleUrl.replace("#", ""));
        }
      }
    });
  });

  // Parse Style elements
  const styleElements = doc.querySelectorAll("Style");
  styleElements.forEach((styleEl) => {
    const id = styleEl.getAttribute("id");
    if (!id) return;

    const style: ParsedKmlStyle = {};

    // Parse LineStyle
    const lineStyle = styleEl.querySelector("LineStyle");
    if (lineStyle) {
      const colorEl = lineStyle.querySelector("color");
      if (colorEl?.textContent) {
        const { color, opacity } = kmlColorToHex(colorEl.textContent);
        style.lineColor = color;
        style.strokeColor = color;
        style.strokeOpacity = opacity;
      }

      const widthEl = lineStyle.querySelector("width");
      if (widthEl?.textContent) {
        style.lineWidth = parseFloat(widthEl.textContent);
      }
    }

    // Parse PolyStyle
    const polyStyle = styleEl.querySelector("PolyStyle");
    if (polyStyle) {
      const colorEl = polyStyle.querySelector("color");
      if (colorEl?.textContent) {
        const { color, opacity } = kmlColorToHex(colorEl.textContent);
        style.fillColor = color;
        style.fillOpacity = opacity;
      }
    }

    // Parse IconStyle
    const iconStyle = styleEl.querySelector("IconStyle");
    if (iconStyle) {
      const iconEl = iconStyle.querySelector("Icon > href");
      if (iconEl?.textContent) {
        style.iconHref = iconEl.textContent;
      }

      const scaleEl = iconStyle.querySelector("scale");
      if (scaleEl?.textContent) {
        const parsed = parseFloat(scaleEl.textContent);
        if (!isNaN(parsed)) style.iconScale = parsed;
      }
    }

    // Parse LabelStyle
    const labelStyle = styleEl.querySelector("LabelStyle");
    if (labelStyle) {
      const scaleEl = labelStyle.querySelector("scale");
      if (scaleEl?.textContent) {
        style.labelScale = parseFloat(scaleEl.textContent);
      }
    }

    styleMap.set(id, style);
  });

  // Resolve StyleMap references - add them with their referenced styles
  styleMaps.forEach((normalStyleId, styleMapId) => {
    const normalStyle = styleMap.get(normalStyleId);
    if (normalStyle) {
      styleMap.set(styleMapId, normalStyle);
    }
  });

  return styleMap;
};

/**
 * Parse styleUrl references from Placemarks in KML
 * Returns a map of placemark index → styleId
 */
export const parsePlacemarkStyles = (kmlText: string): Map<number, string> => {
  const placemarkStyles = new Map<number, string>();

  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlText, "text/xml");

  const placemarks = doc.querySelectorAll("Placemark");
  placemarks.forEach((placemark, index) => {
    const styleUrl = placemark.querySelector("styleUrl")?.textContent;
    if (styleUrl) {
      // Remove # prefix
      placemarkStyles.set(index, styleUrl.replace("#", ""));
    }
  });

  return placemarkStyles;
};

/**
 * Apply parsed KML styles to OpenLayers features
 */
export const applyKmlStylesToFeatures = (
  features: Feature<Geometry>[],
  styleMap: Map<string, ParsedKmlStyle>,
  placemarkStyles: Map<number, string>
): void => {
  features.forEach((feature, index) => {
    // =======================================================
    // =======================================================
    const rawDash = feature.get("strokeDash");
    if (typeof rawDash === "string") {
      // Convert "16,12" string to [16, 12] number array
      const dashArray = rawDash.split(',').map(Number);
      // Handle cases where parsing might fail (e.g., empty string)
      if (dashArray.length >    // FIX: Parse strokeDash from ExtendedData ("16,12" -> [16, 12])
        0 && !dashArray.some(isNaN)) {
        feature.set("strokeDash", dashArray);
      } else {
        feature.set("strokeDash", null); // Clear invalid data
      }
    }
    // =======================================================

    // Skip features that already have custom styles (from ExtendedData)
    if (feature.get("lineColor") || feature.get("strokeColor") || feature.get("fillColor")) {
      return;
    }

    // Skip legend features - their styles come from legendsConfig.ts via legendType
    if (feature.get("islegends") && feature.get("legendType")) {
      return;
    }

    const styleId = placemarkStyles.get(index);
    if (!styleId) return;

    const style = styleMap.get(styleId);
    if (!style) return;

    const geomType = feature.getGeometry()?.getType();

    // Apply line styles
    if (style.lineColor) {
      feature.set("lineColor", style.lineColor);
    }
    if (style.strokeColor) {
      feature.set("strokeColor", style.strokeColor);
    }
    if (style.lineWidth !== undefined) {
      feature.set("lineWidth", style.lineWidth);
    }
    if (style.strokeOpacity !== undefined) {
      feature.set("strokeOpacity", style.strokeOpacity);
    }

    // Apply fill styles for polygons
    if (geomType === "Polygon") {
      if (style.fillColor) {
        feature.set("fillColor", style.fillColor);
      }
      if (style.fillOpacity !== undefined) {
        feature.set("fillOpacity", style.fillOpacity);
      }
    }

    // Apply icon styles for points
    if (geomType === "Point") {
      if (style.iconHref) {
        // Use the Google Earth icon URL directly for display in the app
        const iconPath = convertGoogleEarthToAppIcon(style.iconHref);
        feature.set("iconPath", iconPath);
        feature.set("isIcon", true);
      }
      if (style.iconScale !== undefined) {
        feature.set("iconScale", style.iconScale);
      }
    }

    // Mark feature type based on geometry if not already set
    if (!feature.get("featureType")) {
      feature.set("featureType", geomType);
    }

    // Set type flags for proper rendering
    if ((geomType === "LineString" || geomType === "MultiLineString") && !feature.get("isPolyline") && !feature.get("isFreehand") && !feature.get("isArrow") && !feature.get("isDimension")) {
      feature.set("isPolyline", true);
    }
    if (geomType === "Point" && !feature.get("isPoint") && !feature.get("isIcon")) {
      feature.set("isPoint", true);
    }
  });
};

/**
 * Convert Google Earth icon URL to app icon path
 * Maps remote/external icon URLs back to local paths when possible for offline support
 */
const convertGoogleEarthToAppIcon = (googleIconUrl: string): string => {
  // Strip file:/// protocol prefix (from local KML files)
  if (googleIconUrl.startsWith("file:///")) {
    const filePath = googleIconUrl.replace("file:///", "");
    const iconIndex = filePath.indexOf("google_earth_icons");
    if (iconIndex !== -1) {
      return "/" + filePath.substring(iconIndex).replace(/\\/g, "/");
    }
  }

  // Map deployed app URLs back to local paths
  if (googleIconUrl.includes("ds-map-tool.vercel.app/google_earth_icons/")) {
    const iconIndex = googleIconUrl.indexOf("google_earth_icons");
    return "/" + googleIconUrl.substring(iconIndex);
  }

  return googleIconUrl;
};
