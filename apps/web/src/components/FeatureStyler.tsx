import { Style, Text, RegularShape, Circle } from "ol/style";
import Stroke from "ol/style/Stroke";
import Fill from "ol/style/Fill";
import { Point, MultiLineString, LineString, Polygon } from "ol/geom";
import { getLength } from "ol/sphere";
import { getCenter } from "ol/extent";
import type { FeatureLike } from "ol/Feature";
import type { LegendType } from "@/tools/legendsConfig";
import { getLegendById } from "@/tools/legendsConfig";
import { applyOpacityToColor } from "@/utils/colorUtils";
import { getFeatureTypeStyle } from "@/utils/featureUtils";
import { computeAlignedDimensionGeometry } from "@/utils/alignedDimensionUtils";
import {
  createPointStyle,
  createLineStyle,
  createPolygonStyle,
} from "@/utils/styleUtils";
import { getTextStyle } from "@/icons/Text";
import {
  supportsCustomLineStyle,
  DEFAULT_LINE_STYLE,
} from "@/utils/featureTypeUtils";

export type FeatureStylerFunction = (
  feature: FeatureLike,
  resolution?: number,
  selectedLegend?: LegendType,
  scaleFactor?: number,
) => Style | Style[] | null;

// Helper function to create text-along-edge style for shapes with legendType
// Extracts the exterior ring of the polygon and renders text along it
const getShapeTextStyle = (feature: FeatureLike): Style | null => {
  const legendTypeId = feature.get("legendType");
  if (!legendTypeId) return null;

  const legendType = getLegendById(legendTypeId);
  if (!legendType?.text || !legendType.textStyle) return null;

  const geometry = feature.getGeometry();
  if (!geometry) return null;

  const geomType = geometry.getType();
  if (geomType !== "Polygon" && geomType !== "MultiPolygon") return null;

  const textStyle = legendType.textStyle;

  return new Style({
    text: new Text({
      text: legendType.text,
      placement: "line",
      repeat: textStyle.repeat,
      font: textStyle.font || "bold 10px Arial",
      fill: new Fill({
        color: textStyle.fill || "#000000",
      }),
      stroke: new Stroke({
        color: textStyle.stroke || "#ffffff",
        width: textStyle.strokeWidth || 3,
      }),
      textAlign: "center",
      textBaseline: "middle",
      maxAngle: textStyle.maxAngle,
      offsetX: textStyle.offsetX || 0,
      offsetY: textStyle.offsetY || 0,
      scale: textStyle.scale || 1,
    }),
    geometry: () => {
      // Extract exterior ring as LineString for text placement along the edge
      if (geomType === "Polygon") {
        const coords = (geometry as any).getLinearRing(0)?.getCoordinates();
        if (coords) return new LineString(coords);
      } else if (geomType === "MultiPolygon") {
        // For MultiPolygon, combine all exterior rings
        const polygons = (geometry as any).getPolygons();
        const allCoords: number[][] = [];
        for (const poly of polygons) {
          const ring = poly.getLinearRing(0);
          if (ring) allCoords.push(...ring.getCoordinates());
        }
        if (allCoords.length > 0) return new LineString(allCoords);
      }
      return geometry;
    },
    zIndex: 100,
  });
};

/**
 * Build complete shape styles including legend strokeDash and zigzag patterns.
 * Extracts polygon exterior ring as LineString for zigzag rendering.
 */
const getShapeStyles = (
  feature: FeatureLike,
  strokeColor: string,
  strokeWidth: number,
  strokeOpacity: number,
  fillColor: string | undefined,
  fillOpacity: number,
  strokeDash: number[] | undefined,
  resolution: number = 1,
): Style | Style[] => {
  const styles: Style[] = [];
  const legendTypeId = feature.get("legendType");
  const legendType = legendTypeId ? getLegendById(legendTypeId) : null;

  // Resolve dash pattern: feature-level > legend-level
  const lineDash = strokeDash ?? legendType?.style.strokeDash;

  // Check for zigzag pattern
  const isZigzag =
    feature.get("linePattern") === "zigzag" ||
    (legendType?.linePattern === "zigzag" && legendType?.zigzagConfig);
  const zigzagConfig = feature.get("zigzagConfig") || legendType?.zigzagConfig;

  if (isZigzag && zigzagConfig) {
    // For zigzag, render the fill separately and the zigzag stroke along the exterior ring
    const geometry = feature.getGeometry();
    if (geometry) {
      // Fill style (no stroke)
      if (fillColor) {
        styles.push(
          new Style({
            fill: new Fill({
              color: applyOpacityToColor(fillColor, fillOpacity),
            }),
          }),
        );
      }

      // Extract exterior ring as LineString for zigzag
      const geomType = geometry.getType();
      let ring: LineString | null = null;
      if (geomType === "Polygon") {
        const coords = (geometry as Polygon).getLinearRing(0)?.getCoordinates();
        if (coords) ring = new LineString(coords);
      }

      if (ring) {
        const { amplitude, wavelength } = zigzagConfig;
        const amplitudeMap = amplitude * resolution;
        const halfWaveMap = (wavelength / 2) * resolution;
        const zigzagGeom = createZigzagGeometry(
          ring,
          amplitudeMap,
          halfWaveMap,
        );

        styles.push(
          new Style({
            geometry: zigzagGeom,
            stroke: new Stroke({
              color: applyOpacityToColor(strokeColor, strokeOpacity),
              width: strokeWidth,
              lineCap: "butt",
              lineJoin: "miter",
            }),
            zIndex: 1,
          }),
        );
      }
    }
  } else {
    // Standard polygon style with optional lineDash
    const baseStyle = createPolygonStyle(
      strokeColor,
      strokeWidth,
      strokeOpacity,
      fillColor,
      fillOpacity,
      lineDash,
    );
    if (Array.isArray(baseStyle)) {
      styles.push(...baseStyle);
    } else {
      styles.push(baseStyle);
    }
  }

  // Add text label if legendType is set
  const textStyle = getShapeTextStyle(feature);
  if (textStyle) {
    styles.push(textStyle);
  }

  return styles.length === 1 ? styles[0] : styles;
};

/**
 * Create a zigzag geometry from a LineString
 * Generates a triangular wave pattern along the line path
 */
export const createZigzagGeometry = (
  lineGeom: LineString,
  amplitudeMap: number,
  halfWaveMap: number,
): LineString => {
  const totalLength = lineGeom.getLength();
  if (totalLength === 0 || halfWaveMap === 0) return lineGeom;

  const numPoints = Math.ceil(totalLength / halfWaveMap);
  const zigzagCoords: number[][] = [];

  for (let i = 0; i <= numPoints; i++) {
    const fraction = Math.min((i * halfWaveMap) / totalLength, 1);
    const coord = lineGeom.getCoordinateAt(fraction);

    // Get direction by sampling nearby points
    const f1 = Math.max(fraction - 0.001, 0);
    const f2 = Math.min(fraction + 0.001, 1);
    const p1 = lineGeom.getCoordinateAt(f1);
    const p2 = lineGeom.getCoordinateAt(f2);

    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) {
      zigzagCoords.push(coord);
      continue;
    }

    // Perpendicular direction (left-hand normal)
    const px = -dy / len;
    const py = dx / len;

    // Alternate sides: even = up, odd = down
    const side = i % 2 === 0 ? 1 : -1;

    zigzagCoords.push([
      coord[0] + px * amplitudeMap * side,
      coord[1] + py * amplitudeMap * side,
    ]);
  }

  return new LineString(zigzagCoords);
};

// ✅ Reusable function for legends with text along line path
export const getTextAlongLineStyle = (
  feature: FeatureLike,
  legendType: LegendType,
  resolution: number = 1,
): Style[] => {
  const geometry = feature.getGeometry();
  if (!geometry) return [];

  const styles: Style[] = [];

  // Check for custom color first, fallback to legend type color
  const customColor = feature.get("lineColor");
  const strokeColor = customColor || legendType.style.strokeColor;

  // Check for custom width first, fallback to legend type width
  const customWidth = feature.get("lineWidth");
  const width =
    customWidth !== undefined ? customWidth : legendType.style.strokeWidth;

  // Check for custom opacity first, fallback to legend type opacity
  const customOpacity = feature.get("opacity");
  const opacity =
    customOpacity !== undefined ? customOpacity : legendType.style.opacity || 1;

  // Check for custom strokeDash first, fallback to legend type dash
  const customStrokeDash = feature.get("strokeDash") as number[] | undefined;
  const lineDash = customStrokeDash ?? legendType.style.strokeDash;

  // Check if this legend uses a zigzag line pattern
  const isZigzag =
    legendType.linePattern === "zigzag" && legendType.zigzagConfig;

  if (isZigzag && geometry.getType() === "LineString") {
    const { amplitude, wavelength } = legendType.zigzagConfig!;
    // Convert pixel values to map units using resolution
    const amplitudeMap = amplitude * resolution;
    const halfWaveMap = (wavelength / 2) * resolution;

    const zigzagGeom = createZigzagGeometry(
      geometry as LineString,
      amplitudeMap,
      halfWaveMap,
    );

    // Zigzag stroke style
    styles.push(
      new Style({
        geometry: zigzagGeom,
        stroke: new Stroke({
          color: applyOpacityToColor(strokeColor, opacity),
          width: width,
          lineCap: "butt",
          lineJoin: "miter",
        }),
        zIndex: 1,
      }),
    );
  } else {
    // Standard base line style from legend configuration
    styles.push(
      new Style({
        stroke: new Stroke({
          color: applyOpacityToColor(strokeColor, opacity),
          width: width,
          lineDash: lineDash,
          lineCap: "butt",
        }),
        zIndex: 1, // Base line layer
      }),
    );
  }

  // Add repeated text along the line if text is configured
  if (
    legendType.text &&
    legendType.textStyle &&
    (geometry.getType() === "LineString" ||
      geometry.getType() === "MultiLineString")
  ) {
    const textStyle = legendType.textStyle;

    // For zigzag patterns, place text along the original straight line path
    // so tick marks cross the zigzag at regular intervals
    // Use custom strokeColor for text fill/stroke when the user changes the line color
    const textFill =
      customColor && textStyle.fill === legendType.style.strokeColor
        ? customColor
        : (textStyle.fill as string);
    const textStroke =
      customColor && textStyle.stroke === legendType.style.strokeColor
        ? customColor
        : (textStyle.stroke as string);

    // For "|" text legends (powerCabel, railwayMetroCrossing), smoothly scale text strokeWidth
    // from 0 to 2.5 as line width goes from 0 to 10
    const textStrokeWidth =
      legendType.text === "|"
        ? Math.min(
            ((width ?? legendType.style.strokeWidth ?? 1) / 10) * 2.5,
            2.5,
          )
        : textStyle.strokeWidth;

    styles.push(
      new Style({
        text: new Text({
          text: legendType.text,
          placement: "line",
          repeat: textStyle.repeat,
          font: textStyle.font,
          fill: new Fill({
            color: textFill,
          }),
          stroke: new Stroke({
            color: textStroke,
            width: textStrokeWidth,
          }),
          textAlign: "center",
          textBaseline: "middle",
          maxAngle: textStyle.maxAngle,
          offsetX: textStyle.offsetX || 0,
          offsetY: textStyle.offsetY || 0,
          scale: textStyle.scale,
        }),
        zIndex: 100, // High z-index to ensure text always appears above line
      }),
    );
  }

  // Vertices are only shown on hover/selection, not in default style

  return styles;
};

// ✅ Arrow style function
export const getArrowStyle = (
  feature: FeatureLike,
  resolution: number,
  scaleFactor: number = 1,
) => {
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

  // Get custom color, width, and opacity (support custom styling)
  const customColor = feature.get("lineColor") || "#000000";
  const customWidth = feature.get("lineWidth");
  const width = customWidth !== undefined ? customWidth : 4;
  const opacity =
    feature.get("opacity") !== undefined ? feature.get("opacity") : 1;

  // Apply opacity to color
  const colorWithOpacity = applyOpacityToColor(customColor, opacity);

  const arrowRadius = 8 * scaleFactor;

  // --- FIX STARTS HERE ---

  // Calculate how far back to shift the arrow (in map units)
  // resolution = map_units / pixel. radius is in pixels.
  const offset = arrowRadius * resolution;

  // Calculate the new anchor point (center of the arrow shape)
  // We move from endPoint towards startPoint by 'offset' distance
  const anchorX = endPoint[0] - offset * Math.cos(angle);
  const anchorY = endPoint[1] - offset * Math.sin(angle);

  // Use this new point for the arrow geometry
  const arrowAnchorPoint = new Point([anchorX, anchorY]);

  // --- FIX ENDS HERE ---

  // Create arrow head using RegularShape
  const arrowHead = new RegularShape({
    points: 3,
    radius: arrowRadius,
    rotation: Math.PI / 2 - angle,
    angle: 0,
    fill: new Fill({ color: colorWithOpacity }),
  });

  // Create a shortened line that ends at the arrow center instead of endPoint
  const shortenedCoords = [...coordinates];
  shortenedCoords[shortenedCoords.length - 1] = [anchorX, anchorY];
  const shortenedLine = new LineString(shortenedCoords);

  const styles: Style[] = [
    // Line style (shortened so it doesn't poke through the arrowhead)
    new Style({
      geometry: shortenedLine,
      stroke: new Stroke({
        color: colorWithOpacity,
        width: width,
      }),
    }),
    // Arrow head style at the end point
    new Style({
      geometry: arrowAnchorPoint,
      image: arrowHead,
    }),
  ];

  // Vertices are only shown on hover/selection, not in default style

  return styles;
};

// ✅ Dimension style function (arrowheads on both ends)
export const getDimensionStyle = (
  feature: FeatureLike,
  resolution: number,
  scaleFactor: number = 1,
) => {
  const geometry = feature.getGeometry();
  if (!geometry) return new Style();

  let coordinates: number[][];

  if (geometry.getType() === "LineString") {
    coordinates = (geometry as any).getCoordinates();
  } else if (geometry.getType() === "MultiLineString") {
    const lineStrings = (geometry as any).getLineStrings();
    if (lineStrings.length === 0) return new Style();
    coordinates = lineStrings[lineStrings.length - 1].getCoordinates();
  } else {
    return new Style();
  }

  if (coordinates.length < 2) return new Style();

  // Get custom color, width, and opacity
  const customColor = feature.get("lineColor") || "#ff0c0c";
  const customWidth = feature.get("lineWidth");
  const width = customWidth !== undefined ? customWidth : 0.2;
  const opacity =
    feature.get("opacity") !== undefined ? feature.get("opacity") : 1;
  const colorWithOpacity = applyOpacityToColor(customColor, opacity);

  const arrowRadius = 0.5 * scaleFactor;
  const offset = arrowRadius * resolution;

  // --- END arrowhead (last segment) ---
  const endStart = coordinates[coordinates.length - 2];
  const endPoint = coordinates[coordinates.length - 1];
  const endDx = endPoint[0] - endStart[0];
  const endDy = endPoint[1] - endStart[1];
  const endAngle = Math.atan2(endDy, endDx);

  const endAnchorX = endPoint[0] - offset * Math.cos(endAngle);
  const endAnchorY = endPoint[1] - offset * Math.sin(endAngle);
  const endAnchorPoint = new Point([endAnchorX, endAnchorY]);

  const endArrowHead = new RegularShape({
    points: 3,
    radius: arrowRadius,
    rotation: Math.PI / 2 - endAngle,
    angle: 0,
    fill: new Fill({ color: colorWithOpacity }),
  });

  // --- START arrowhead (first segment, pointing backward) ---
  const startPoint = coordinates[0];
  const startNext = coordinates[1];
  const startDx = startPoint[0] - startNext[0];
  const startDy = startPoint[1] - startNext[1];
  const startAngle = Math.atan2(startDy, startDx);

  const startAnchorX = startPoint[0] - offset * Math.cos(startAngle);
  const startAnchorY = startPoint[1] - offset * Math.sin(startAngle);
  const startAnchorPoint = new Point([startAnchorX, startAnchorY]);

  const startArrowHead = new RegularShape({
    points: 3,
    radius: arrowRadius,
    rotation: Math.PI / 2 - startAngle,
    angle: 0,
    fill: new Fill({ color: colorWithOpacity }),
  });

  // Create a shortened line that doesn't poke through either arrowhead
  const shortenedCoords = [...coordinates];
  shortenedCoords[0] = [startAnchorX, startAnchorY];
  shortenedCoords[shortenedCoords.length - 1] = [endAnchorX, endAnchorY];
  const shortenedLine = new LineString(shortenedCoords);

  // Use custom dimension text if set, otherwise calculate from geometry
  const customDimensionText = (feature as any).get?.("dimensionText");
  let lengthText: string;
  if (customDimensionText !== undefined && customDimensionText !== null && customDimensionText !== "") {
    lengthText = String(customDimensionText);
  } else {
    const length = getLength(geometry as LineString);
    lengthText = length < 1000
      ? `${Math.floor(length)}`
      : `${Math.floor(length / 1000)}`;
  }

  const styles: Style[] = [
    // Line style (shortened at both ends)
    new Style({
      geometry: shortenedLine,
      stroke: new Stroke({
        color: colorWithOpacity,
        width: width,
      }),
    }),
    // Arrow head at the end
    new Style({
      geometry: endAnchorPoint,
      image: endArrowHead,
    }),
    // Arrow head at the start
    new Style({
      geometry: startAnchorPoint,
      image: startArrowHead,
    }),
    // Length text along line at midpoint (rotates with line like indianOilPipeLine)
    new Style({
      text: new Text({
        text: lengthText,
        placement: "line",
        font: "bold 1px Arial",
        fill: new Fill({ color: customColor }),
        stroke: new Stroke({
          color: "#ffffff",
          width: 0.4,
        }),
        textAlign: "center",
        textBaseline: "middle",
        offsetY: 0,
        maxAngle: Math.PI / 4,
      }),
      zIndex: 100,
    }),
  ];

  return styles;
};

export const getAlignedDimensionStyle = (
  feature: FeatureLike,
  resolution: number,
  scaleFactor: number = 1,
) => {
  const geometry = feature.getGeometry();
  if (!geometry || geometry.getType() !== "LineString") return new Style();

  const coords = (geometry as LineString).getCoordinates();
  if (coords.length < 2) return new Style();

  const p1 = coords[0];
  const p2 = coords[1];
  const offsetDistance = feature.get("offsetDistance") || 0;

  if (Math.abs(offsetDistance) < 1e-6) return new Style();

  const customColor = feature.get("lineColor") || "#ff0c0c";
  const customWidth = feature.get("lineWidth") ?? 0.2;
  const opacity = feature.get("opacity") ?? 1;
  const colorWithOpacity = applyOpacityToColor(customColor, opacity);

  const dimGeom = computeAlignedDimensionGeometry(p1, p2, offsetDistance, resolution);
  const arrowRadius = 0.5 * scaleFactor;
  const arrowOffset = arrowRadius * resolution;

  // Text: custom or calculated
  const customDimensionText = feature.get("dimensionText");
  let lengthText: string;
  if (customDimensionText !== undefined && customDimensionText !== null && customDimensionText !== "") {
    lengthText = String(customDimensionText);
  } else {
    const length = getLength(new LineString([p1, p2]));
    lengthText = length < 1000
      ? `${Math.floor(length)}`
      : `${Math.floor(length / 1000)}`;
  }

  const [dimP1, dimP2] = dimGeom.dimensionLine;
  const dimDx = dimP2[0] - dimP1[0];
  const dimDy = dimP2[1] - dimP1[1];
  const dimAngle = Math.atan2(dimDy, dimDx);

  // Shorten dimension line at both ends for arrowheads
  const shortenedDimP1: number[] = [
    dimP1[0] + arrowOffset * Math.cos(dimAngle),
    dimP1[1] + arrowOffset * Math.sin(dimAngle),
  ];
  const shortenedDimP2: number[] = [
    dimP2[0] - arrowOffset * Math.cos(dimAngle),
    dimP2[1] - arrowOffset * Math.sin(dimAngle),
  ];

  // Text rotation: keep text readable (not upside-down)
  let textRotation = -dimGeom.textRotation;
  if (dimGeom.textRotation > Math.PI / 2) textRotation += Math.PI;
  if (dimGeom.textRotation < -Math.PI / 2) textRotation -= Math.PI;

  const styles: Style[] = [
    // Extension line 1
    new Style({
      geometry: new LineString(dimGeom.extensionLine1),
      stroke: new Stroke({ color: colorWithOpacity, width: customWidth }),
    }),
    // Extension line 2
    new Style({
      geometry: new LineString(dimGeom.extensionLine2),
      stroke: new Stroke({ color: colorWithOpacity, width: customWidth }),
    }),
    // Dimension line (shortened)
    new Style({
      geometry: new LineString([shortenedDimP1, shortenedDimP2]),
      stroke: new Stroke({ color: colorWithOpacity, width: customWidth }),
    }),
    // Arrow at start of dimension line (pointing outward)
    new Style({
      geometry: new Point(dimP1),
      image: new RegularShape({
        points: 3,
        radius: arrowRadius,
        rotation: Math.PI / 2 - dimAngle + Math.PI,
        angle: 0,
        fill: new Fill({ color: colorWithOpacity }),
      }),
    }),
    // Arrow at end of dimension line
    new Style({
      geometry: new Point(dimP2),
      image: new RegularShape({
        points: 3,
        radius: arrowRadius,
        rotation: Math.PI / 2 - dimAngle,
        angle: 0,
        fill: new Fill({ color: colorWithOpacity }),
      }),
    }),
    // Distance text at midpoint
    new Style({
      geometry: new Point(dimGeom.textPosition),
      text: new Text({
        text: lengthText,
        font: "bold 1px Arial",
        fill: new Fill({ color: customColor }),
        stroke: new Stroke({ color: "#ffffff", width: 0.4 }),
        rotation: textRotation,
        textAlign: "center",
        textBaseline: "bottom",
        offsetY: -1,
      }),
      zIndex: 100,
    }),
  ];

  return styles;
};

// Vertex colors for start and end points
const VERTEX_START_COLOR = "#7ccf00"; // Green for starting vertex
const VERTEX_END_COLOR = "#fb2c36"; // Red for ending vertex
const VERTEX_MIDDLE_COLOR = "rgba(0, 102, 204, 0.8)"; // Blue for middle vertices

// ✅ Vertex highlighting for LineStrings
// Only used for hover/selection styles, not default feature styles
export const getLineStringVertexStyle = (feature: FeatureLike): Style[] => {
  const geometry = feature.getGeometry();
  if (!geometry) return [];

  let coordinates: number[][] = [];

  // Extract coordinates from LineString or MultiLineString
  if (geometry.getType() === "LineString") {
    coordinates = (geometry as LineString).getCoordinates();
  } else if (geometry.getType() === "MultiLineString") {
    const lineStrings = (geometry as MultiLineString).getLineStrings();
    lineStrings.forEach((lineString) => {
      coordinates = coordinates.concat(lineString.getCoordinates());
    });
  } else {
    return [];
  }

  if (coordinates.length === 0) return [];

  const styles: Style[] = [];
  const lastIndex = coordinates.length - 1;

  // Create a small circle marker for each vertex with position-based coloring
  coordinates.forEach((coord, index) => {
    // Determine color based on position
    let fillColor: string;
    if (index === 0) {
      fillColor = VERTEX_START_COLOR; // Green for start
    } else if (index === lastIndex) {
      fillColor = VERTEX_END_COLOR; // Red for end
    } else {
      fillColor = VERTEX_MIDDLE_COLOR; // Blue for middle
    }

    styles.push(
      new Style({
        geometry: new Point(coord),
        image: new Circle({
          radius: 4,
          fill: new Fill({ color: fillColor }),
          stroke: new Stroke({ color: "#ffffff", width: 1.5 }),
        }),
        zIndex: 50, // High z-index to appear above the line
      }),
    );
  });

  return styles;
};

/**
 * Check if a feature should display a label
 * Supports Point features and icon features (GP, Tower, Junction, Triangle, Pit)
 */
const shouldShowLabel = (feature: FeatureLike): boolean => {
  // Skip features that already have their own text display systems
  if (
    feature.get("isArrow") ||
    feature.get("isDimension") ||
    feature.get("isAlignedDimension") ||
    feature.get("isText") ||
    feature.get("islegends") ||
    feature.get("isMeasure")
  ) {
    return false;
  }

  const geometry = feature.getGeometry();
  if (!geometry) return false;

  const geometryType = geometry.getType();

  // Point geometry (standard points and custom icons)
  if (geometryType === "Point") return true;

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
  resolution: number = 1,
  selectedLegend?: LegendType,
  scaleFactor: number = 1,
) => {
  const type = feature.getGeometry()?.getType();
  const isArrow = feature.get("isArrow");
  const isDimension = feature.get("isDimension");
  const isAlignedDimension = feature.get("isAlignedDimension");

  if (isAlignedDimension && type === "LineString") {
    return getAlignedDimensionStyle(feature, resolution, scaleFactor);
  }

  if (isArrow && (type === "LineString" || type === "MultiLineString")) {
    return getArrowStyle(feature, resolution, scaleFactor);
  }

  if (isDimension && (type === "LineString" || type === "MultiLineString")) {
    return getDimensionStyle(feature, resolution, scaleFactor);
  }

  // Handle measure features
  if (
    feature.get("isMeasure") &&
    (type === "LineString" || type === "MultiLineString")
  ) {
    return getMeasureTextStyle(feature);
  }

  // Handle text features
  if (feature.get("isText") && type === "Point") {
    const textContent = feature.get("text") || "Text";
    const textScale = feature.get("textScale") ?? 1;
    const textRotation = feature.get("textRotation") ?? 0;
    const textOpacity = feature.get("textOpacity") ?? 1;
    const textFillColor = feature.get("textFillColor") || "#000000";
    const textStrokeColor = feature.get("textStrokeColor") || "#ffffff";
    const textAlign = feature.get("textAlign") || "center";
    return getTextStyle(
      textContent,
      textScale,
      textRotation,
      textOpacity,
      textFillColor,
      textStrokeColor,
      textAlign,
    );
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
    const strokeWidth =
      feature.get("strokeWidth") !== undefined ? feature.get("strokeWidth") : 2;
    const strokeOpacity =
      feature.get("strokeOpacity") !== undefined
        ? feature.get("strokeOpacity")
        : 1;
    const fillColor = feature.get("fillColor") || "#ffffff";
    const fillOpacity =
      feature.get("fillOpacity") !== undefined ? feature.get("fillOpacity") : 0;
    const strokeDash = feature.get("strokeDash") as number[] | undefined;
    return getShapeStyles(
      feature,
      strokeColor,
      strokeWidth,
      strokeOpacity,
      fillColor,
      fillOpacity,
      strokeDash,
      resolution,
    );
  }

  // Handle Circle features
  if (
    feature.get("isCircle") &&
    (type === "Polygon" || type === "MultiPolygon")
  ) {
    const strokeColor = feature.get("strokeColor") || "#000000";
    const strokeWidth =
      feature.get("strokeWidth") !== undefined ? feature.get("strokeWidth") : 2;
    const strokeOpacity =
      feature.get("strokeOpacity") !== undefined
        ? feature.get("strokeOpacity")
        : 1;
    const fillColor = feature.get("fillColor") || "#ffffff";
    const fillOpacity =
      feature.get("fillOpacity") !== undefined ? feature.get("fillOpacity") : 0;
    const strokeDash = feature.get("strokeDash") as number[] | undefined;
    return getShapeStyles(
      feature,
      strokeColor,
      strokeWidth,
      strokeOpacity,
      fillColor,
      fillOpacity,
      strokeDash,
      resolution,
    );
  }

  // Handle Revision Cloud features
  if (
    feature.get("isRevisionCloud") &&
    (type === "Polygon" || type === "MultiPolygon")
  ) {
    const strokeColor = feature.get("strokeColor") || "#00ff00";
    const strokeWidth =
      feature.get("strokeWidth") !== undefined ? feature.get("strokeWidth") : 2;
    const strokeOpacity =
      feature.get("strokeOpacity") !== undefined
        ? feature.get("strokeOpacity")
        : 1;
    const fillColor = feature.get("fillColor");
    const fillOpacity =
      feature.get("fillOpacity") !== undefined ? feature.get("fillOpacity") : 0;
    const strokeDash = feature.get("strokeDash") as number[] | undefined;
    return getShapeStyles(
      feature,
      strokeColor,
      strokeWidth,
      strokeOpacity,
      fillColor,
      fillOpacity,
      strokeDash,
      resolution,
    );
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

    // If no legend type is found, fall back to feature's own properties
    if (!legendType) {
      const fallbackColor =
        feature.get("lineColor") || feature.get("strokeColor") || "#00ff00";
      const fallbackWidth = feature.get("lineWidth") ?? 2;
      const fallbackOpacity =
        feature.get("opacity") ?? feature.get("strokeOpacity") ?? 1;
      const fallbackDash = feature.get("strokeDash") as number[] | undefined;

      return [
        new Style({
          stroke: new Stroke({
            color: applyOpacityToColor(fallbackColor, fallbackOpacity),
            width: fallbackWidth,
            lineDash: fallbackDash ?? [],
            lineCap: "butt",
          }),
        }),
      ];
    }

    // Check if legend has text or zigzag pattern configured
    if (legendType.text || legendType.linePattern) {
      return getTextAlongLineStyle(feature, legendType, resolution);
    }

    const styles: Style[] = [];

    // Check for custom opacity first, fallback to legend type opacity
    const customOpacity = feature.get("opacity");
    const opacity =
      customOpacity !== undefined
        ? customOpacity
        : legendType.style.opacity || 1;

    // Check for custom color first, fallback to legend type color
    const customColor = feature.get("lineColor");
    const strokeColor =
      customColor || legendType.style.strokeColor || "#000000";

    // Check for custom width first, fallback to legend type width
    const customWidth = feature.get("lineWidth");
    const width =
      customWidth !== undefined
        ? customWidth
        : legendType.style.strokeWidth || 2;

    // Check for custom strokeDash first, fallback to legend type dash
    const customStrokeDash = feature.get("strokeDash") as number[] | undefined;
    const lineDash = customStrokeDash ?? legendType.style.strokeDash ?? [5, 5];

    styles.push(
      new Style({
        stroke: new Stroke({
          color: applyOpacityToColor(strokeColor, opacity),
          width: width,
          lineDash: lineDash,
          lineCap: "butt",
        }),
      }),
    );

    // Vertices are only shown on hover/selection, not in default style

    return styles;
  }

  // Handle label display for Point and icon features
  if (shouldShowLabel(feature)) {
    const baseStyle =
      type === "LineString" || type === "MultiLineString"
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
  if (
    feature.get("isArc") &&
    (type === "LineString" || type === "MultiLineString")
  ) {
    const strokeColor = feature.get("lineColor") || "#00ff00";
    const strokeWidth =
      feature.get("lineWidth") !== undefined ? feature.get("lineWidth") : 4;
    const opacity =
      feature.get("opacity") !== undefined ? feature.get("opacity") : 1;
    const strokeDash = feature.get("strokeDash") as number[] | undefined;
    return createLineStyle(strokeColor, strokeWidth, opacity, strokeDash);
  }

  if (type === "LineString" || type === "MultiLineString") {
    const styles: Style[] = [];

    // Check for custom line styling (Polyline/Freehand only)
    if (supportsCustomLineStyle(feature)) {
      const customColor = feature.get("lineColor");
      const customWidth = feature.get("lineWidth");
      const opacity =
        feature.get("opacity") !== undefined ? feature.get("opacity") : 1;
      const strokeDash = feature.get("strokeDash") as number[] | undefined;

      // Use custom values if set, otherwise use defaults
      const color = customColor || DEFAULT_LINE_STYLE.color;
      const width =
        customWidth !== undefined ? customWidth : DEFAULT_LINE_STYLE.width;

      const lineStyle = createLineStyle(color, width, opacity, strokeDash);
      if (Array.isArray(lineStyle)) {
        styles.push(...lineStyle);
      } else {
        styles.push(lineStyle);
      }
    } else {
      // Fallback for other LineString types
      const lineStyle = createLineStyle("#00ff00", 4);
      if (Array.isArray(lineStyle)) {
        styles.push(...lineStyle);
      } else {
        styles.push(lineStyle);
      }
    }

    // Vertices are only shown on hover/selection, not in default style

    return styles;
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
 * Format distance with unit switching
 * @param distance - Distance in meters
 * @param unit - Optional unit ('km' or 'm'). If not set, auto-switches based on distance.
 * @returns Formatted distance string
 */
const formatDistance = (distance: number, unit?: string): string => {
  // If unit is explicitly set, use it
  if (unit === "m") {
    return `${distance.toFixed(3)}m`;
  }
  if (unit === "km") {
    return `${(distance / 1000).toFixed(3)}km`;
  }
  // Default: auto-switch based on distance
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  } else {
    return `${(distance / 1000).toFixed(3)}km`;
  }
};

/**
 * Create measure text styling for distance display at end point
 * @param feature - Feature with distance property
 * @returns Style array with line and distance text
 */
export const getMeasureTextStyle = (feature: FeatureLike): Style[] => {
  const geometry = feature.getGeometry();
  const distance = feature.get("distance");

  if (!geometry || distance === undefined) return [];

  if (geometry.getType() !== "LineString") return [];

  const lineString = geometry as any;
  const coordinates = lineString.getCoordinates();

  if (coordinates.length < 2) return [];

  // Get the end point (last coordinate)
  const endPoint = coordinates[coordinates.length - 1];
  const lengthUnit = feature.get("lengthUnit");
  const formattedDistance = formatDistance(distance, lengthUnit);

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
      }),
    );
  }

  // Add text label at end point
  styles.push(
    new Style({
      text: new Text({
        text: formattedDistance,
        font: "bold 12px Arial, sans-serif",
        fill: new Fill({ color: "#000000" }),
        stroke: new Stroke({
          color: "#ffffff",
          width: 3,
        }),
        backgroundFill: new Fill({ color: "rgba(255, 255, 255, 0.8)" }),
        padding: [2, 4, 2, 4],
        textAlign: "left",
        textBaseline: "middle",
        offsetX: 8, // Offset slightly to the right of the end point
        offsetY: 0,
      }),
      geometry: new Point(endPoint),
      zIndex: 11,
    }),
  );

  // Vertices are only shown on hover/selection, not in default style

  return styles;
};
