import { Style, Stroke, Fill } from "ol/style";
import { Feature } from "ol";
import { Polygon } from "ol/geom";
import { Vector as VectorSource } from "ol/source";

export const createTrianglePolygon = (center: number[], size: number = 10): number[][][] => {
  const [cx, cy] = center;

  // Calculate triangle vertices (equilateral triangle pointing up)
  const topVertex = [cx, cy + size];
  const bottomLeft = [cx - size * 0.866, cy - size * 0.5]; // 0.866 H cos(30�)
  const bottomRight = [cx + size * 0.866, cy - size * 0.5]; // 0.866 H cos(30�)

  // Return triangle coordinates in the format OpenLayers expects
  return [[
    topVertex,
    bottomLeft,
    bottomRight,
    topVertex // Close the polygon
  ]];
};

export const getTriangleStyle = (): Style => {
  return new Style({
    stroke: new Stroke({
      color: "#000000",
      width: 2,
    }),
    fill: new Fill({ color: "#a4aaa5" }),
  });
};

export const handleTriangleClick = (
  vectorSource: VectorSource,
  coordinate: number[]
): void => {
  try {
    // Create triangle polygon geometry
    const triangleCoords = createTrianglePolygon(coordinate);
    const trianglePolygon = new Polygon(triangleCoords);

    // Create feature with triangle geometry
    const triangleFeature = new Feature({
      geometry: trianglePolygon,
    });

    // Mark as triangle feature and non-editable
    triangleFeature.set("isTriangle", true);
    triangleFeature.set("nonEditable", true);

    // Apply triangle style
    triangleFeature.setStyle(getTriangleStyle());

    // Add to vector source
    vectorSource.addFeature(triangleFeature);

  } catch (error) {
    console.error("Error creating triangle:", error);
  }
};

export const isTriangleFeature = (feature: Feature): boolean => {
  return feature.get("isTriangle") === true;
};

export const triangleUtils = {
  createPolygon: createTrianglePolygon,
  getStyle: getTriangleStyle,
  handleClick: handleTriangleClick,
  isTriangle: isTriangleFeature,
};