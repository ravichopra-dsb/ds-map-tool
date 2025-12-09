import { Style, Fill, Stroke, Text } from "ol/style";
import { Feature } from "ol";
import { Point } from "ol/geom";
import { Vector as VectorSource } from "ol/source";

/**
 * Create text style for map labels
 * @param textContent - The text content to display
 * @returns OpenLayers Style object for text
 */
export const getTextStyle = (textContent: string): Style => {
  return new Style({
    text: new Text({
      text: textContent,
      font: '14px Arial, sans-serif',
      fill: new Fill({ color: '#000000' }),
      stroke: new Stroke({
        color: '#ffffff',
        width: 3
      }),
      padding: [4, 6, 4, 6],
      textAlign: 'center',
      textBaseline: 'middle',
    }),
    zIndex: 100,
  });
};

/**
 * Handle text tool click - creates a text feature at the clicked location
 * @param vectorSource - The vector source to add the feature to
 * @param coordinate - The click coordinate in map projection
 * @param textContent - The text content to display
 */
export const handleTextClick = (
  vectorSource: VectorSource,
  coordinate: number[],
  textContent: string
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

    // Style handled by layer style function to prevent double styling conflicts
    // Note: Removed direct setStyle() call - layer style function will handle text visibility

    // Add to vector source
    vectorSource.addFeature(textFeature);

  } catch (error) {
    console.error("Error creating text feature:", error);
  }
};