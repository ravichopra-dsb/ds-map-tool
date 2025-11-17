import { Style, Text, RegularShape } from "ol/style";
import Stroke from "ol/style/Stroke";
import Fill from "ol/style/Fill";
import { Point } from "ol/geom";
import type { FeatureLike } from "ol/Feature";
import type { LegendType } from "@/tools/legendsConfig";
import { getLegendById } from "@/tools/legendsConfig";
import { applyOpacityToColor } from "@/utils/colorUtils";
import { getFeatureTypeStyle } from "@/utils/featureUtils";
import { createPointStyle, createLineStyle } from "@/utils/styleUtils";

export type FeatureStylerFunction = (feature: FeatureLike, selectedLegend?: LegendType) => Style | Style[] | null;

// ✅ Reusable function for legends with text along line path
export const getTextAlongLineStyle = (
  feature: FeatureLike,
  legendType: LegendType
): Style[] => {
  const geometry = feature.getGeometry();
  if (!geometry) return [];

  const styles: Style[] = [];

  // Base line style from legend configuration
  styles.push(
    new Style({
      stroke: new Stroke({
        color: legendType.style.strokeColor,
        width: legendType.style.strokeWidth,
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

  // Create arrow head using RegularShape
  const arrowHead = new RegularShape({
    points: 3,
    radius: 8,
    rotation: -angle,
    angle: 10,
    displacement: [0, 0],
    fill: new Fill({ color: "#000000" }),
  });

  return [
    // Line style
    new Style({
      stroke: new Stroke({
        color: "#000000",
        width: 4,
      }),
    }),
    // Arrow head style at the end point
    new Style({
      geometry: new Point(endPoint),
      image: arrowHead,
    }),
  ];
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

  // Handle icon features using utility
  const iconStyle = getFeatureTypeStyle(feature);
  if (iconStyle) {
    return iconStyle;
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
    const strokeColor = legendType.style.strokeColor || "#000000";

    styles.push(
      new Style({
        stroke: new Stroke({
          color: applyOpacityToColor(strokeColor, opacity),
          width: legendType.style.strokeWidth || 2,
          lineDash: legendType.style.strokeDash || [5, 5],
          lineCap: "butt",
        }),
      })
    );
    return styles;
  }

  if (type === "LineString" || type === "MultiLineString") {
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