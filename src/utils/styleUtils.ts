import { Style, Circle as CircleStyle, Text, Icon } from "ol/style";
import Stroke from "ol/style/Stroke";
import Fill from "ol/style/Fill";
import { Feature } from "ol";
import type { Geometry } from "ol/geom";
import { Point, LineString, MultiLineString } from "ol/geom";
import { applyOpacityToColor } from "./colorUtils";
import {
  calculateIconScale,
  calculateTextScale,
  calculateIconHighlightRadius,
  calculatePointRadius,
  RESOLUTION_SCALE_DEFAULTS,
} from "./resolutionScaleUtils";

/**
 * Basic style configuration interface
 */
export interface BasicStyleConfig {
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  fillOpacity?: number;
  strokeDash?: number[];
  lineCap?: "butt" | "round" | "square";
}

/**
 * Point style configuration interface
 */
export interface PointStyleConfig {
  radius?: number;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
}

/**
 * Text style configuration interface
 */
export interface TextStyleConfig {
  text: string;
  font?: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  offsetX?: number;
  offsetY?: number;
  scale?: number;
  maxAngle?: number;
}

/**
 * Creates a basic stroke style with optional fill
 * @param config - Style configuration
 * @returns OpenLayers Style object
 */
export const createBasicStyle = (config: BasicStyleConfig): Style => {
  const stroke = config.strokeColor
    ? new Stroke({
      color: config.strokeColor,
      width: config.strokeWidth || 2,
      lineDash: config.strokeDash,
      lineCap: config.lineCap || "butt",
    })
    : undefined;

  const fill = config.fillColor
    ? new Fill({
      color: applyOpacityToColor(config.fillColor, config.fillOpacity || 1),
    })
    : undefined;

  return new Style({
    stroke,
    fill,
  });
};

/**
 * Creates a point/circle style
 * @param config - Point style configuration
 * @returns OpenLayers Style object
 */
export const createPointStyle = (config: PointStyleConfig): Style => {
  const opacity = config.opacity !== undefined ? config.opacity : 1;
  const fillColor = config.fillColor || "#ff0000";
  const strokeColor = config.strokeColor || "#ffffff";

  return new Style({
    image: new CircleStyle({
      radius: config.radius || 6,
      fill: new Fill({
        color: applyOpacityToColor(fillColor, opacity),
      }),
      stroke: new Stroke({
        color: applyOpacityToColor(strokeColor, opacity),
        width: config.strokeWidth || 2,
      }),
    }),
  });
};

/**
 * Creates a text style
 * @param config - Text style configuration
 * @returns OpenLayers Text style object
 */
export const createTextStyle = (config: TextStyleConfig): Text => {
  return new Text({
    text: config.text,
    font: config.font || "12px sans-serif",
    fill: new Fill({
      color: config.fillColor || "#000000",
    }),
    stroke: config.strokeColor
      ? new Stroke({
        color: config.strokeColor,
        width: config.strokeWidth || 2,
      })
      : undefined,
    offsetX: config.offsetX || 0,
    offsetY: config.offsetY || 0,
    scale: config.scale || 1,
    maxAngle: config.maxAngle || 45,
  });
};

/**
 * Creates a style for line geometries
 * @param strokeColor - Stroke color
 * @param strokeWidth - Stroke width
 * @param opacity - Opacity (0-1)
 * @param lineDash - Optional line dash pattern
 * @returns OpenLayers Style object
 */
export const createLineStyle = (
  strokeColor: string,
  strokeWidth: number = 2,
  opacity: number = 1,
  lineDash?: number[]
): Style => {
  return new Style({
    stroke: new Stroke({
      color: applyOpacityToColor(strokeColor, opacity),
      width: strokeWidth,
      lineDash: lineDash,
      lineCap: "butt",
    }),
  });
};

/**
 * Creates a polygon style with stroke and optional fill
 * @param strokeColor - Stroke color
 * @param strokeWidth - Stroke width
 * @param strokeOpacity - Stroke opacity (0-1)
 * @param fillColor - Optional fill color
 * @param fillOpacity - Fill opacity (0-1)
 * @param lineDash - Optional line dash pattern
 * @returns OpenLayers Style object
 */
export const createPolygonStyle = (
  strokeColor: string,
  strokeWidth: number = 2,
  strokeOpacity: number = 1,
  fillColor?: string,
  fillOpacity: number = 1,
  lineDash?: number[]
): Style => {
  const stroke = new Stroke({
    color: applyOpacityToColor(strokeColor, strokeOpacity),
    width: strokeWidth,
    lineDash: lineDash,
    lineCap: "butt",
  });

  const fill = fillColor
    ? new Fill({
      color: applyOpacityToColor(fillColor, fillOpacity),
    })
    : undefined;

  return new Style({
    stroke,
    fill,
  });
};

/**
 * Hover highlight color
 */
export const HOVER_HIGHLIGHT_COLOR = "#f55927"; // Bright cyan/blue

/**
 * Vertex colors for start and end points
 */
export const VERTEX_START_COLOR = "#7ccf00"; // Green for starting vertex
export const VERTEX_END_COLOR = "#fb2c36"; // Red for ending vertex
export const VERTEX_MIDDLE_COLOR = "rgba(0, 102, 204, 0.8)"; // Blue for middle vertices

/**
 * Helper function to extract and create vertex styles for LineString/MultiLineString
 * Uses different colors for start (green), end (red), and middle (blue) vertices
 * @param geometry - The geometry to extract vertices from
 * @param vertexRadius - Radius of vertex markers
 * @returns Array of Style objects for each vertex
 */
const createVertexStylesForGeometry = (
  geometry: Geometry,
  vertexRadius: number = 4
): Style[] => {
  let coordinates: number[][] = [];

  if (geometry.getType() === "LineString") {
    coordinates = (geometry as LineString).getCoordinates();
  } else if (geometry.getType() === "MultiLineString") {
    const lineStrings = (geometry as MultiLineString).getLineStrings();
    lineStrings.forEach((lineString) => {
      coordinates = coordinates.concat(lineString.getCoordinates());
    });
  }

  if (coordinates.length === 0) return [];

  const styles: Style[] = [];
  const lastIndex = coordinates.length - 1;

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
        image: new CircleStyle({
          radius: vertexRadius,
          fill: new Fill({ color: fillColor }),
          stroke: new Stroke({ color: "#ffffff", width: 1.5 }),
        }),
        zIndex: 50,
      })
    );
  });

  return styles;
};

/**
 * Creates a hover/highlight style for a feature
 * Applies a bright outline to indicate hover state
 * @param feature - The feature to create hover style for
 * @param resolution - Optional map resolution for resolution-based scaling
 * @param resolutionScalingEnabled - Whether resolution-based scaling is enabled (default: true)
 * @returns OpenLayers Style object or array of styles
 */
export const createHoverStyle = (feature: Feature<Geometry>, resolution?: number, resolutionScalingEnabled: boolean = true): Style | Style[] => {
  const geometry = feature.getGeometry();
  if (!geometry) return new Style();

  const geometryType = geometry.getType();

  // Common hover stroke - bright cyan with increased width
  const hoverStroke = new Stroke({
    color: HOVER_HIGHLIGHT_COLOR,
    width: 4,
  });

  // For Point features (including icons)
  if (geometryType === "Point") {
    const iconSrc = feature.get("iconSrc");
    const iconPath = feature.get("iconPath"); // Icon picker features use iconPath
    const isIconFeature = feature.get("isIcon");

    if (iconSrc || iconPath || isIconFeature) {
      // Icon point - return icon with a highlight circle behind it
      const iconSource = iconSrc || iconPath;
      const userIconScale = feature.get("iconScale") ?? 1;
      const opacity = feature.get("opacity") !== undefined ? feature.get("opacity") : 1;
      const iconRotation = feature.get("iconRotation") ?? 0;

      // Apply resolution-based scaling (same as MapInstance.tsx) if enabled
      const iconWidth = feature.get("iconWidth") || RESOLUTION_SCALE_DEFAULTS.DEFAULT_ICON_WIDTH;
      let finalIconScale = userIconScale;
      let highlightRadius = 10; // Base highlight circle radius
      if (resolution && resolutionScalingEnabled) {
        finalIconScale = calculateIconScale(resolution, iconWidth, userIconScale);
        highlightRadius = calculateIconHighlightRadius(resolution, iconWidth, userIconScale);
      }

      return [
        new Style({
          image: new CircleStyle({
            radius: highlightRadius,
            fill: new Fill({ color: "rgba(245, 89, 39, 0.5)" }),
            stroke: new Stroke({
              color: HOVER_HIGHLIGHT_COLOR,
            }),
          }),
          zIndex: 1, // Circle behind icon
        }),
        new Style({
          image: new Icon({
            src: iconSource,
            scale: finalIconScale,
            anchor: [0.5, 0.5],
            anchorXUnits: "fraction",
            anchorYUnits: "fraction",
            opacity: opacity,
            rotation: (iconRotation * Math.PI) / 180,
            crossOrigin: "anonymous",
          }),
          zIndex: 0, // Icon on top
        }),
      ];
    }

    // Text feature with resolution-based scaling (same as MapInstance.tsx)
    if (feature.get("isText")) {
      const textContent = feature.get("text") || "Text";
      const textScale = feature.get("textScale") || 1;
      const textRotation = feature.get("textRotation") || 0;
      const textAlign = feature.get("textAlign") || "center";

      // Apply resolution-based scaling when resolution is available and enabled
      let finalTextScale = textScale;
      if (resolution && resolutionScalingEnabled) {
        finalTextScale = calculateTextScale(resolution, RESOLUTION_SCALE_DEFAULTS.TEXT_FONT_SIZE, textScale);
      }

      return new Style({
        text: new Text({
          text: textContent,
          font: `14px Arial, sans-serif`,
          scale: finalTextScale,
          rotation: (textRotation * Math.PI) / 180,
          fill: new Fill({ color: HOVER_HIGHLIGHT_COLOR }),
          stroke: new Stroke({
            color: "#ffffff",
            width: 4,
          }),
          padding: [4, 6, 4, 6],
          textAlign: textAlign,
          textBaseline: "middle",
        }),
        zIndex: 100,
      });
    }

    // Regular point
    return new Style({
      image: new CircleStyle({
        radius: 8,
        fill: new Fill({ color: HOVER_HIGHLIGHT_COLOR }),
        stroke: new Stroke({
          color: "#ffffff",
          width: 3,
        }),
      }),
    });
  }

  // For Polygon features
  if (geometryType === "Polygon" || geometryType === "MultiPolygon") {
    return new Style({
      stroke: hoverStroke,
      fill: new Fill({
        color: "rgba(0, 191, 255, 0)",
      }),
    });
  }

  // For LineString, MultiLineString, GeometryCollection (most common)
  // Only show stroke highlight on hover - vertices are shown only on selection
  return new Style({
    stroke: hoverStroke,
  });
};

/**
 * Creates a selection/highlight style for a feature
 * Used by the Select interaction to highlight selected features
 * Includes vertex highlighting for LineStrings
 * @param feature - The feature to create selection style for
 * @param resolution - Optional map resolution for resolution-based scaling
 * @param resolutionScalingEnabled - Whether resolution-based scaling is enabled (default: true)
 * @returns OpenLayers Style object or array of styles
 */
export const createSelectStyle = (feature: Feature<Geometry>, resolution?: number, resolutionScalingEnabled: boolean = true): Style | Style[] => {
  const geometry = feature.getGeometry();
  if (!geometry) return new Style();

  const geometryType = geometry.getType();

  // Selection highlight stroke - bright blue
  const selectStroke = new Stroke({
    color: "#0099ff",
    width: 5,
  });

  // For Point features
  if (geometryType === "Point") {
    const iconSrc = feature.get("iconSrc");
    const iconPath = feature.get("iconPath"); // Icon picker features use iconPath
    const isIconFeature = feature.get("isIcon");

    if (iconSrc || iconPath || isIconFeature) {
      const iconSource = iconSrc || iconPath;
      const userIconScale = feature.get("iconScale") ?? 1;
      const opacity = feature.get("opacity") !== undefined ? feature.get("opacity") : 1;
      const iconRotation = feature.get("iconRotation") ?? 0;

      // Apply resolution-based scaling (same as MapInstance.tsx) if enabled
      const iconWidth = feature.get("iconWidth") || RESOLUTION_SCALE_DEFAULTS.DEFAULT_ICON_WIDTH;
      let finalIconScale = userIconScale;
      let highlightRadius = 10; // Base highlight circle radius
      if (resolution && resolutionScalingEnabled) {
        finalIconScale = calculateIconScale(resolution, iconWidth, userIconScale);
        highlightRadius = calculateIconHighlightRadius(resolution, iconWidth, userIconScale);
      }

      return [
        new Style({
          image: new CircleStyle({
            radius: highlightRadius,
            fill: new Fill({ color: "rgba(0, 153, 255, 0.5)" }),
            stroke: new Stroke({
              color: "#0099ff",
            }),
          }),
          zIndex: 1, // Circle behind icon
        }),
        new Style({
          image: new Icon({
            src: iconSource,
            scale: finalIconScale,
            anchor: [0.5, 0.5],
            anchorXUnits: "fraction",
            anchorYUnits: "fraction",
            opacity: opacity,
            rotation: (iconRotation * Math.PI) / 180,
            crossOrigin: "anonymous",
          }),
          zIndex: 0, // Icon on top
        }),
      ];
    }

    // Text feature with resolution-based scaling (same as hover style)
    if (feature.get("isText")) {
      const textContent = feature.get("text") || "Text";
      const textScale = feature.get("textScale") || 1;
      const textRotation = feature.get("textRotation") || 0;
      const textAlign = feature.get("textAlign") || "center";

      // Apply resolution-based scaling when resolution is available and enabled
      let finalTextScale = textScale;
      if (resolution && resolutionScalingEnabled) {
        finalTextScale = calculateTextScale(resolution, RESOLUTION_SCALE_DEFAULTS.TEXT_FONT_SIZE, textScale);
      }

      return new Style({
        text: new Text({
          text: textContent,
          font: `14px Arial, sans-serif`,
          scale: finalTextScale,
          rotation: (textRotation * Math.PI) / 180,
          fill: new Fill({ color: "#0099ff" }),
          stroke: new Stroke({
            color: "#ffffff",
            width: 4,
          }),
          padding: [4, 6, 4, 6],
          textAlign: textAlign,
          textBaseline: "middle",
        }),
        zIndex: 100,
      });
    }

    // Regular point - apply resolution-based scaling for CircleStyle if enabled
    const pointRadius = (resolution && resolutionScalingEnabled) ? calculatePointRadius(resolution) : 9;

    return new Style({
      image: new CircleStyle({
        radius: pointRadius,
        fill: new Fill({ color: "#0099ff" }),
        stroke: new Stroke({
          color: "#ffffff",
          width: 3,
        }),
      }),
    });
  }

  // For Polygon features
  if (geometryType === "Polygon" || geometryType === "MultiPolygon") {
    return new Style({
      stroke: selectStroke,
      fill: new Fill({
        color: "rgba(0, 153, 255, 0.1)",
      }),
    });
  }

  // For Arc features - show only stroke highlight, no vertex markers
  // Arc vertices are handled by useArcModify with 3 colored control points
  if (feature.get('isArc')) {
    return new Style({
      stroke: selectStroke,
    });
  }

  // For LineString, MultiLineString, GeometryCollection
  const styles: Style[] = [
    new Style({
      stroke: selectStroke,
    }),
  ];

  // Add vertex highlighting for LineStrings and MultiLineStrings
  if (geometryType === "LineString" || geometryType === "MultiLineString") {
    const vertexStyles = createVertexStylesForGeometry(geometry);
    styles.push(...vertexStyles);
  }

  return styles;
};