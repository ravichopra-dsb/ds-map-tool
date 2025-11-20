import { Style, Circle as CircleStyle, Text } from "ol/style";
import Stroke from "ol/style/Stroke";
import Fill from "ol/style/Fill";
import { applyOpacityToColor } from "./colorUtils";

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
  return new Style({
    image: new CircleStyle({
      radius: config.radius || 6,
      fill: new Fill({
        color: config.fillColor || "#ff0000",
      }),
      stroke: new Stroke({
        color: config.strokeColor || "#ffffff",
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