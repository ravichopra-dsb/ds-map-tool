import { Style, Text, RegularShape } from "ol/style";
import Stroke from "ol/style/Stroke";
import Fill from "ol/style/Fill";
import { Point } from "ol/geom";
import { getCenter } from "ol/extent";
import type { FeatureLike } from "ol/Feature";
import type { LegendType } from "@/tools/legendsConfig";
import { getLegendById } from "@/tools/legendsConfig";
import { applyOpacityToColor } from "@/utils/colorUtils";
import { getFeatureTypeStyle } from "@/utils/featureUtils";
import { createPointStyle, createLineStyle, createPolygonStyle } from "@/utils/styleUtils";
import { getTextStyle } from "@/icons/Text";
import { supportsCustomLineStyle, DEFAULT_LINE_STYLE } from "@/utils/featureTypeUtils";

export type FeatureStylerFunction = (feature: FeatureLike, selectedLegend?: LegendType) => Style | Style[] | null;

// ✅ Reusable function for legends with text along line path
export const getTextAlongLineStyle = (
  feature: FeatureLike,
  legendType: LegendType
): Style[] => {
  const geometry = feature.getGeometry();
  if (!geometry) return [];

  const styles: Style[] = [];

  // Check for custom color first, fallback to legend type color
  const customColor = feature.get("lineColor");
  const strokeColor = customColor || legendType.style.strokeColor;

  // Check for custom width first, fallback to legend type width
  const customWidth = feature.get("lineWidth");
  const width = customWidth !== undefined ? customWidth : legendType.style.strokeWidth;

  // Base line style from legend configuration
  styles.push(
    new Style({
      stroke: new Stroke({
        color: strokeColor,
        width: width,
        lineDash: legendType.style.strokeDash,
        lineCap: "butt",
      }),
      zIndex: 1, // Base line layer
    })
  );

  // Add repeated text along the line if text is configured
  if (
    legendType.text &&
    legendType.textStyle &&
    (geometry.getType() === "LineString" ||
      geometry.getType() === "MultiLineString")
  ) {
    const textStyle = legendType.textStyle;

    // For dash centering, we need to account for text starting position
    // Since OpenLayers doesn't support along-line offset, we use mathematical alignment
    styles.push(
      new Style({
        text: new Text({
          text: legendType.text,
          placement: "line",
          repeat: textStyle.repeat,
          font: textStyle.font,
          fill: new Fill({
            color: textStyle.fill,
          }),
          stroke: new Stroke({
            color: textStyle.stroke,
            width: textStyle.strokeWidth,
          }),
          textAlign: "center",
          textBaseline: "middle",
          maxAngle: textStyle.maxAngle,
          offsetX: textStyle.offsetX || 0, // Perpendicular offset only
          offsetY: textStyle.offsetY || 0,
          scale: textStyle.scale,
        }),
        zIndex: 100, // High z-index to ensure text always appears above line
      })
    );
  }

  return styles;
};

// ✅ Arrow style function
export const getArrowStyle = (feature: FeatureLike) => {
  const geometry = feature.getGeometry();
  if (!geometry) return new Style();

  let coordinates: number[][];

  if (geometry.getType() === "LineString") {
    coordinates = (geometry as any).getCoordinates();
  } else if (geometry.getType() === "MultiLineString") {
    // For MultiLineString, use the last line segment
    const lineStrings = (geometry as any).getLineStrings();
    if (lineStrings.length === 0) return new Style();
    coordinates = lineStrings[lineStrings.length - 1].getCoordinates();
  } else {
    return new Style();
  }

  if (coordinates.length < 2) return new Style();

  // Get the last segment for arrow direction
  const startPoint = coordinates[coordinates.length - 2];
  const endPoint = coordinates[coordinates.length - 1];

  // Calculate angle for arrow head
  const dx = endPoint[0] - startPoint[0];
  const dy = endPoint[1] - startPoint[1];
  const angle = Math.atan2(dy, dx);

  // Get custom color and width (support custom styling)
  const customColor = feature.get("lineColor") || "#000000";
  const customWidth = feature.get("lineWidth");
  const width = customWidth !== undefined ? customWidth : 4;

  // Create arrow head using RegularShape
  const arrowHead = new RegularShape({
    points: 3,
    radius: 8,
    rotation: -angle,
    angle: 10,
    displacement: [0, 0],
    fill: new Fill({ color: customColor }),
  });

  return [
    // Line style
    new Style({
      stroke: new Stroke({
        color: customColor,
        width: width,
      }),
    }),
    // Arrow head style at the end point
    new Style({
      geometry: new Point(endPoint),
      image: arrowHead,
    }),
  ];
};

/**
 * Check if a feature should display a label
 * Supports Point features and icon features (GP, Tower, Junction, Triangle, Pit)
 */
const shouldShowLabel = (feature: FeatureLike): boolean => {
  // Skip features that already have their own text display systems
  if (feature.get("isArrow") ||
      feature.get("isText") ||
      feature.get("islegends") ||
      feature.get("isMeasure")) {
    return false;
  }

  const geometry = feature.getGeometry();
  if (!geometry) return false;

  const geometryType = geometry.getType();

  // Point geometry (standard points and custom icons)
  if (geometryType === "Point") return true;

  // Icon features with non-Point geometry
  if (feature.get("isTriangle") && geometryType === "Polygon") return true;
  if (feature.get("isPit") && geometryType === "MultiLineString") return true;
  if ((feature.get("isGP") || feature.get("isTower") || feature.get("isJunction"))
      && geometryType === "GeometryCollection") return true;

  return false;
};


/**
 * Create text style for feature labels
 * Uses the 'label' property to determine which property to display as label
 */
const getLabelTextStyle = (feature: FeatureLike): Style | null => {
  // Get which property to use as label (default to "name")
  const labelProperty = feature.get("label") || "name";
  const labelValue = feature.get(labelProperty);

  // If no value for the selected property, don't show label
  if (!labelValue) return null;

  const geometry = feature.getGeometry();
  if (!geometry) return null;

  const geometryType = geometry.getType();
  let labelGeometry: Point;

  if (geometryType === "Point") {
    labelGeometry = geometry as Point;
  } else {
    // For non-Point geometries, use center of extent
    const extent = geometry.getExtent();
    const center = getCenter(extent);
    labelGeometry = new Point(center);
  }

  // Adjust offset based on geometry type
  let offsetY = -15;
  if (geometryType !== "Point") offsetY = -20;

  return new Style({
    text: new Text({
      text: String(labelValue),
      font: "14px Arial, sans-serif",
      fill: new Fill({ color: "#000000" }),
      stroke: new Stroke({ color: "#ffffff", width: 3 }),
      textAlign: "center",
      textBaseline: "middle",
      offsetY: offsetY,
    }),
    geometry: labelGeometry,
    zIndex: 100, // High z-index to ensure text appears above features
  });
};

// ✅ Custom feature styles (used for GeoJSON, KML, and KMZ)
export const getFeatureStyle = (
  feature: FeatureLike,
  selectedLegend?: LegendType
) => {
  const type = feature.getGeometry()?.getType();
  const isArrow = feature.get("isArrow");

  if (isArrow && (type === "LineString" || type === "MultiLineString")) {
    return getArrowStyle(feature);
  }

  // Handle measure features
  if (feature.get("isMeasure") && (type === "LineString" || type === "MultiLineString")) {
    return getMeasureTextStyle(feature);
  }

  // Handle text features
  if (feature.get("isText") && type === "Point") {
    const textContent = feature.get("text") || "Text";
    return getTextStyle(textContent);
  }

  // Handle icon features using utility
  const iconStyle = getFeatureTypeStyle(feature);
  if (iconStyle) {
    // Check if icon feature should also show a label
    if (shouldShowLabel(feature)) {
      const labelTextStyle = getLabelTextStyle(feature);
      if (labelTextStyle) {
        // Combine icon style with label text style
        if (Array.isArray(iconStyle)) {
          return [...iconStyle, labelTextStyle];
        }
        return [iconStyle, labelTextStyle];
      }
    }
    return iconStyle;
  }

  // Handle Box features
  if (feature.get("isBox") && (type === "Polygon" || type === "MultiPolygon")) {
    const strokeColor = feature.get("strokeColor") || "#000000";
    const fillColor = feature.get("fillColor") || "#ffffff";
    const fillOpacity = feature.get("fillOpacity") !== undefined ? feature.get("fillOpacity") : 0;
    return createPolygonStyle(strokeColor, 2, 1, fillColor, fillOpacity);
  }

  // Handle Circle features
  if (feature.get("isCircle") && (type === "Polygon" || type === "MultiPolygon")) {
    const strokeColor = feature.get("strokeColor") || "#000000";
    const fillColor = feature.get("fillColor") || "#ffffff";
    const fillOpacity = feature.get("fillOpacity") !== undefined ? feature.get("fillOpacity") : 0;
    return createPolygonStyle(strokeColor, 2, 1, fillColor, fillOpacity);
  }

  // Handle Revision Cloud features
  if (feature.get("isRevisionCloud") && (type === "Polygon" || type === "MultiPolygon")) {
    const strokeColor = feature.get("strokeColor") || "#ff0000";
    const fillColor = feature.get("fillColor");
    const fillOpacity = feature.get("fillOpacity") !== undefined ? feature.get("fillOpacity") : 0;
    return createPolygonStyle(strokeColor, 2, 1, fillColor, fillOpacity);
  }

  if (
    feature.get("islegends") &&
    (type === "LineString" || type === "MultiLineString")
  ) {
    const legendTypeId = feature.get("legendType");
    let legendType: LegendType | undefined;

    if (legendTypeId) {
      // Use the configuration to get the legend type
      legendType = getLegendById(legendTypeId);
    } else if (selectedLegend) {
      // Use the currently selected legend
      legendType = selectedLegend;
    }

    // If no legend type is found, don't render the feature
    if (!legendType) {
      return [];
    }

    // Check if legend has text configured and use text styling function
    if (legendType.text) {
      return getTextAlongLineStyle(feature, legendType);
    }

    const styles: Style[] = [];
    const opacity = legendType.style.opacity || 1;

    // Check for custom color first, fallback to legend type color
    const customColor = feature.get("lineColor");
    const strokeColor = customColor || legendType.style.strokeColor || "#000000";

    // Check for custom width first, fallback to legend type width
    const customWidth = feature.get("lineWidth");
    const width = customWidth !== undefined ? customWidth : (legendType.style.strokeWidth || 2);

    styles.push(
      new Style({
        stroke: new Stroke({
          color: applyOpacityToColor(strokeColor, opacity),
          width: width,
          lineDash: legendType.style.strokeDash || [5, 5],
          lineCap: "butt",
        }),
      })
    );
    return styles;
  }

  // Handle label display for Point and icon features
  if (shouldShowLabel(feature)) {
    const baseStyle = type === "LineString" || type === "MultiLineString"
      ? createLineStyle("#00ff00", 4)
      : type === "Point" || type === "MultiPoint"
      ? createPointStyle({
          radius: 6,
          fillColor: "#ff0000",
          strokeColor: "#ffffff",
          strokeWidth: 2,
        })
      : getFeatureTypeStyle(feature) || new Style();

    const labelTextStyle = getLabelTextStyle(feature);

    if (labelTextStyle) {
      // If baseStyle is already an array, append text style
      if (Array.isArray(baseStyle)) {
        return [...baseStyle, labelTextStyle];
      }
      // Otherwise, convert to array
      return [baseStyle, labelTextStyle];
    }

    return baseStyle;
  }

  // Handle Arc features
  if (feature.get("isArc") && (type === "LineString" || type === "MultiLineString")) {
    const strokeColor = feature.get("lineColor") || "#00ff00";
    const strokeWidth = feature.get("lineWidth") !== undefined ? feature.get("lineWidth") : 4;
    return createLineStyle(strokeColor, strokeWidth);
  }

  if (type === "LineString" || type === "MultiLineString") {
    // Check for custom line styling (Polyline/Freehand only)
    if (supportsCustomLineStyle(feature)) {
      const customColor = feature.get("lineColor");
      const customWidth = feature.get("lineWidth");

      // Use custom values if set, otherwise use defaults
      const color = customColor || DEFAULT_LINE_STYLE.color;
      const width = customWidth !== undefined ? customWidth : DEFAULT_LINE_STYLE.width;

      return createLineStyle(color, width);
    }

    // Fallback for other LineString types
    return createLineStyle("#00ff00", 4);
  }

  if (type === "Point" || type === "MultiPoint") {
    return createPointStyle({
      radius: 6,
      fillColor: "#ff0000",
      strokeColor: "#ffffff",
      strokeWidth: 2,
    });
  }
};

/**
 * Format distance with automatic unit switching
 * @param distance - Distance in meters
 * @returns Formatted distance string
 */
const formatDistance = (distance: number): string => {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  } else {
    return `${(distance / 1000).toFixed(1)}km`;
  }
};

/**
 * Create measure text styling for distance display at end point
 * @param feature - Feature with distance property
 * @returns Style array with line and distance text
 */
export const getMeasureTextStyle = (feature: FeatureLike): Style[] => {
  const geometry = feature.getGeometry();
  const distance = feature.get('distance');

  if (!geometry || distance === undefined) return [];

  if (geometry.getType() !== 'LineString') return [];

  const lineString = geometry as any;
  const coordinates = lineString.getCoordinates();

  if (coordinates.length < 2) return [];

  // Get the end point (last coordinate)
  const endPoint = coordinates[coordinates.length - 1];
  const formattedDistance = formatDistance(distance);

  const styles: Style[] = [];

  // Add the line style
  const measureLegend = getLegendById("measure");
  if (measureLegend) {
    styles.push(
      new Style({
        stroke: new Stroke({
          color: measureLegend.style.strokeColor || "#3b4352",
          width: measureLegend.style.strokeWidth || 2,
          lineDash: measureLegend.style.strokeDash || [12, 8],
          lineCap: "round",
        }),
        zIndex: 10,
      })
    );
  }

  // Add text label at end point
  styles.push(
    new Style({
      text: new Text({
        text: formattedDistance,
        font: 'bold 12px Arial, sans-serif',
        fill: new Fill({ color: '#000000' }),
        stroke: new Stroke({
          color: '#ffffff',
          width: 3
        }),
        backgroundFill: new Fill({ color: 'rgba(255, 255, 255, 0.8)' }),
        padding: [2, 4, 2, 4],
        textAlign: 'left',
        textBaseline: 'middle',
        offsetX: 8, // Offset slightly to the right of the end point
        offsetY: 0,
      }),
      geometry: new Point(endPoint),
      zIndex: 11,
    })
  );

  return styles;
};