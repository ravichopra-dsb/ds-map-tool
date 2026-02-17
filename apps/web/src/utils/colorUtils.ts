/**
 * Color utility functions for map styling
 */

/**
 * Applies opacity to a hex color by converting it to rgba format
 * @param color - Base hex color (e.g., "#ff0000")
 * @param opacity - Opacity value between 0 and 1
 * @returns Color string with opacity applied
 */
export const applyOpacityToColor = (color: string, opacity: number): string => {
  if (opacity >= 1) return color;

  return color + Math.round(opacity * 255).toString(16).padStart(2, "0");
};

/**
 * Creates a stroke style with configurable opacity
 * @param color - Base color for the stroke
 * @param width - Stroke width
 * @param opacity - Opacity value (0-1)
 * @param lineDash - Optional line dash pattern
 * @returns Stroke style object
 */
export const createStrokeStyle = (
  color: string,
  width: number,
  opacity: number = 1,
  lineDash?: number[]
) => {
  return {
    color: applyOpacityToColor(color, opacity),
    width,
    lineDash: lineDash || [],
    lineCap: "butt" as const,
  };
};