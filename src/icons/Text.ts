import { Style, Fill, Stroke, Text } from "ol/style";
import { Feature } from "ol";
import { Point } from "ol/geom";
import { Vector as VectorSource } from "ol/source";
import { useFolderStore } from "@/stores/useFolderStore";

/**
 * Convert hex color to rgba with opacity
 */
const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Create text style for map labels
 * @param textContent - The text content to display
 * @param scale - Optional scale factor (default: 1)
 * @param rotation - Optional rotation in degrees (default: 0)
 * @param opacity - Optional opacity 0-1 (default: 1)
 * @param customFillColor - Optional custom fill color (default: #000000)
 * @param customStrokeColor - Optional custom stroke color (default: #ffffff)
 * @returns OpenLayers Style object for text
 */
export const getTextStyle = (
  textContent: string,
  scale: number = 1,
  rotation: number = 0,
  opacity: number = 1,
  customFillColor: string = '#000000',
  customStrokeColor: string = '#ffffff'
): Style => {
  // Convert rotation from degrees to radians
  const rotationRadians = (rotation * Math.PI) / 180;

  // Apply opacity to colors
  const fillColor = hexToRgba(customFillColor, opacity);
  const strokeColor = hexToRgba(customStrokeColor, opacity);

  return new Style({
    text: new Text({
      text: textContent,
      font: '14px Arial, sans-serif',
      fill: new Fill({ color: fillColor }),
      stroke: new Stroke({
        color: strokeColor,
        width: 3
      }),
      padding: [4, 6, 4, 6],
      textAlign: 'center',
      textBaseline: 'middle',
      scale: scale,
      rotation: rotationRadians,
    }),
    zIndex: 100,
  });
};

/**
 * Handle text tool click - creates a text feature at the clicked location
 * @param vectorSource - The vector source to add the feature to
 * @param coordinate - The click coordinate in map projection
 * @param textContent - The text content to display
 * @param scale - Optional scale factor for text size (default: 1)
 * @param rotation - Optional rotation angle in degrees (default: 0)
 * @param opacity - Optional opacity 0-1 (default: 1)
 * @param fillColor - Optional fill color (default: #000000)
 * @param strokeColor - Optional stroke color (default: #ffffff)
 */
export const handleTextClick = (
  vectorSource: VectorSource,
  coordinate: number[],
  textContent: string,
  scale?: number,
  rotation?: number,
  opacity?: number,
  fillColor?: string,
  strokeColor?: string
): void => {
  try {
    // Create point geometry for text
    const pointGeometry = new Point(coordinate);

    // Create feature with point geometry
    const textFeature = new Feature({
      geometry: pointGeometry,
      text: textContent,
    });

    // Mark as text feature and editable
    textFeature.set("isText", true);
    textFeature.set("editable", true);

    // Store text properties on feature
    textFeature.set("textScale", scale || 1);
    textFeature.set("textRotation", rotation || 0);
    textFeature.set("textOpacity", opacity ?? 1);
    textFeature.set("textFillColor", fillColor || "#000000");
    textFeature.set("textStrokeColor", strokeColor || "#ffffff");

    // Set active folder ID if one is selected
    const activeFolderId = useFolderStore.getState().activeFolderId;
    if (activeFolderId) {
      textFeature.set("folderId", activeFolderId);
    }

    // Style handled by layer style function to prevent double styling conflicts
    // Note: Removed direct setStyle() call - layer style function will handle text visibility

    // Add to vector source
    vectorSource.addFeature(textFeature);

  } catch (error) {
    console.error("Error creating text feature:", error);
  }
};