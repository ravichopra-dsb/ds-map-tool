// towerFromSvg.ts
import { Feature } from "ol";
import { GeometryCollection, Polygon, LineString, type Geometry } from "ol/geom";
import { Style, Stroke, Fill } from "ol/style";
import { Vector as VectorSource } from "ol/source";

/**
 * Create an SVGPathElement in-memory and return it.
 * Throws if running outside a browser environment.
 */
function createPathElement(pathD: string): SVGPathElement {
  if (typeof document === "undefined") {
    throw new Error("createPathElement: document is undefined. This function must run in a browser.");
  }

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  // ensure the path uses the same viewBox scale; we rely on viewBox mapping separately
  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", pathD);
  svg.appendChild(path);
  // append off-DOM? Not necessary for path measurement in modern browsers,
  // but some browsers require the path to be in a document. Appending to body hidden:
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  svg.style.left = "-9999px";
  svg.style.top = "-9999px";
  document.body.appendChild(svg);
  // return the path element (we keep svg in DOM; we could remove it later)
  return path;
}

/**
 * Map SVG coordinate (x,y) in viewBox [0..viewBoxSize] into map coordinates
 * - centers the SVG around given center
 * - inverts Y (SVG downwards -> map upwards)
 */
const svgToMap = (
  x: number,
  y: number,
  center: number[],
  viewBoxSize: number,
  scale: number
): number[] => {
  const vbCenter = viewBoxSize / 2;
  const mapX = center[0] + (x - vbCenter) * scale;
  const mapY = center[1] + (vbCenter - y) * scale; // invert
  return [mapX, mapY];
};

/**
 * Sample an SVG path into an array of subpaths (each subpath is an array of [x,y] points in SVG coords).
 * - pathD: svg 'd' string
 * - viewBoxSize: typically 15 for your icon
 * - samplingStepPx: sampling resolution in SVG units (smaller = more points)
 * - jumpThresholdPx: distance in SVG units to detect a "move" (new subpath)
 *
 * Note: This uses SVGPathElement.getTotalLength()/getPointAtLength and must run in browser.
 */
export const sampleSvgPathToSubpaths = (
  pathD: string,
  _viewBoxSize: number = 15,
  samplingStepPx: number = 0.5,
  jumpThresholdPx: number = 2
): number[][][] => {
  const pathEl = createPathElement(pathD);

  // total length of the whole path (includes subpaths)
  const total = (pathEl as SVGPathElement).getTotalLength();

  // number of samples
  const steps = Math.max( Math.ceil(total / samplingStepPx), 200 );

  const subpaths: number[][][] = [];
  let currentSubpath: number[][] = [];
  let prevPoint: { x: number; y: number } | null = null;

  for (let i = 0; i <= steps; i++) {
    const l = (i / steps) * total;
    const p = (pathEl as SVGPathElement).getPointAtLength(l);

    const x = p.x;
    const y = p.y;

    if (prevPoint) {
      const dx = x - prevPoint.x;
      const dy = y - prevPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // If big jump — it's likely a move (new subpath). Start new subpath.
      if (dist > jumpThresholdPx) {
        if (currentSubpath.length) {
          subpaths.push(currentSubpath);
        }
        currentSubpath = [];
      }
    }

    currentSubpath.push([x, y]);
    prevPoint = { x, y };
  }

  if (currentSubpath.length) subpaths.push(currentSubpath);

  // Clean up: remove the temporary svg from DOM if present
  const svgParent = (pathEl as any).ownerSVGElement;
  if (svgParent && svgParent.parentNode) {
    svgParent.parentNode.removeChild(svgParent);
  }

  return subpaths;
};

/**
 * Build an OpenLayers Feature (GeometryCollection) from an SVG 'd' string.
 * - pathD: the path 'd' attribute (exactly as in your SVG)
 * - center: map coordinate center [x,y]
 * - viewBoxSize: 15 for this SVG
 * - scale: map units per svg unit (tweak to get desired size on map)
 *
 * Result: a Feature whose geometry is a GeometryCollection of Polygons/LineStrings
 * so the entire shape is selectable as a single feature.
 */
export const createFeatureFromSvgPath = (
  pathD: string,
  center: number[],
  viewBoxSize: number = 15,
  scale: number = 8,
  samplingStepPx: number = 0.4,
  jumpThresholdPx: number = 1.8
): Feature<Geometry> => {
  const subpaths = sampleSvgPathToSubpaths(pathD, viewBoxSize, samplingStepPx, jumpThresholdPx);

  const geometries: Geometry[] = [];

  for (const pts of subpaths) {
    // map sampled svg coords to map coords
    const mapped = pts.map(([x, y]) => svgToMap(x, y, center, viewBoxSize, scale));

    // determine if closed (first and last almost equal)
    const first = mapped[0];
    const last = mapped[mapped.length - 1];
    const dx = first[0] - last[0];
    const dy = first[1] - last[1];
    const distSq = dx * dx + dy * dy;

    const CLOSE_EPS = (scale * 0.6) * (scale * 0.6); // heuristic
    if (distSq < CLOSE_EPS && mapped.length >= 4) {
      // closed -> create Polygon (single ring)
      // ensure ring closed exactly
      if (!(mapped[0][0] === mapped[mapped.length - 1][0] && mapped[0][1] === mapped[mapped.length - 1][1])) {
        mapped.push([mapped[0][0], mapped[0][1]]);
      }
      geometries.push(new Polygon([mapped]));
    } else {
      // open -> LineString
      geometries.push(new LineString(mapped));
    }
  }

  const collection = new GeometryCollection(geometries);
  const feature = new Feature({ geometry: collection });

  feature.set("isTower", true);
  feature.set("nonEditable", true);

  return feature;
};

/**
 * Style that uses Stroke + Fill (no Icon) matching your SVG (black fill, black stroke).
 * You can tweak strokeWidth and fillOpacity.
 */
export const getTowerVectorStyle = (_strokeWidth = 1, fillOpacity = 0.1): Style => {
  return new Style({
    stroke: new Stroke({
      color: "#000000",
      width: 0,
    }),
    fill: new Fill({
      color: `rgba(0,0,0,${fillOpacity})`,
    }),
    zIndex: 10,
  });
};

/**
 * Convenience handler to add the tower to vector source by clicking the map.
 * - pathD: SVG path 'd' (exact string from your Tower component)
 */
export const handleTowerClickFromSvg = (
  vectorSource: VectorSource,
  coordinate: number[],
  pathD: string,
  viewBoxSize = 15,
  scale = 8
) => {
  try {
    const feat = createFeatureFromSvgPath(pathD, coordinate, viewBoxSize, scale);
    feat.setStyle(getTowerVectorStyle(1, 0.1));
    vectorSource.addFeature(feat);
  } catch (err) {
    console.error("handleTowerClickFromSvg error:", err);
  }
};
