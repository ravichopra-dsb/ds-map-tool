/**
 * Offset Utilities
 * Custom implementations for creating parallel offset geometries
 * Based on the algorithm from ol-ext/src/geom/GeomUtils.js
 * @see http://stackoverflow.com/a/11970006/796832
 */

import Feature from "ol/Feature";
import { LineString, Polygon } from "ol/geom";
import type { Geometry } from "ol/geom";
import type { Coordinate } from "ol/coordinate";
import { getLength } from "ol/sphere";
import { transform } from "ol/proj";
import { getCenter } from "ol/extent";

// ============== COORDINATE UTILITIES ==============

/**
 * Calculate distance between two 2D points
 */
export const distanceBetweenPoints = (p1: Coordinate, p2: Coordinate): number => {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Check if two coordinates are equal
 */
export const coordsAreEqual = (p1: Coordinate, p2: Coordinate): boolean => {
    return p1[0] === p2[0] && p1[1] === p2[1];
};

// ============== CORE OFFSET ALGORITHM ==============

/**
 * Offset a polyline (array of coordinates) by a given distance
 * Positive offset = right side of the line direction
 * Negative offset = left side of the line direction
 * 
 * @param coords - Array of coordinates forming the line/polygon ring
 * @param offset - Offset distance in map units (positive = right, negative = left)
 * @returns New array of offset coordinates
 */
export const offsetCoordinates = (coords: Coordinate[], offset: number): Coordinate[] => {
    const path: Coordinate[] = [];
    let N = coords.length - 1;
    let max = N;
    let mi: number, mi1: number, li: number, li1: number;
    let ri: number, ri1: number, si: number, si1: number;
    let Xi1: number, Yi1: number;
    let p0: Coordinate, p1: Coordinate, p2: Coordinate;

    const isClosed = coordsAreEqual(coords[0], coords[N]);

    // Handle open paths - add offset for first point
    if (!isClosed) {
        p0 = coords[0];
        p1 = coords[1];
        const dist = distanceBetweenPoints(p0, p1);
        p2 = [
            p0[0] + ((p1[1] - p0[1]) / dist) * offset,
            p0[1] - ((p1[0] - p0[0]) / dist) * offset,
        ];
        path.push(p2);
        // Temporarily extend the array for the loop
        coords = [...coords, coords[N]];
        N++;
        max--;
    }

    // Process internal vertices
    for (let i = 0; i < max; i++) {
        p0 = coords[i];
        p1 = coords[(i + 1) % N];
        p2 = coords[(i + 2) % N];

        // Calculate slopes
        mi = (p1[1] - p0[1]) / (p1[0] - p0[0]);
        mi1 = (p2[1] - p1[1]) / (p2[0] - p1[0]);

        // Prevent alignments (parallel segments)
        if (Math.abs(mi - mi1) > 1e-10) {
            li = Math.sqrt((p1[0] - p0[0]) ** 2 + (p1[1] - p0[1]) ** 2);
            li1 = Math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2);

            ri = p0[0] + (offset * (p1[1] - p0[1])) / li;
            ri1 = p1[0] + (offset * (p2[1] - p1[1])) / li1;
            si = p0[1] - (offset * (p1[0] - p0[0])) / li;
            si1 = p1[1] - (offset * (p2[0] - p1[0])) / li1;

            Xi1 = (mi1 * ri1 - mi * ri + si - si1) / (mi1 - mi);
            Yi1 = (mi * mi1 * (ri1 - ri) + mi1 * si - mi * si1) / (mi1 - mi);

            // Correction for vertical lines
            if (p1[0] - p0[0] === 0) {
                Xi1 = p1[0] + (offset * (p1[1] - p0[1])) / Math.abs(p1[1] - p0[1]);
                Yi1 = mi1 * Xi1 - mi1 * ri1 + si1;
            }
            if (p2[0] - p1[0] === 0) {
                Xi1 = p2[0] + (offset * (p2[1] - p1[1])) / Math.abs(p2[1] - p1[1]);
                Yi1 = mi * Xi1 - mi * ri + si;
            }

            path.push([Xi1, Yi1]);
        }
    }

    // Handle closing
    if (isClosed) {
        path.push(path[0]);
    } else {
        // Remove the temporary extension
        coords = coords.slice(0, -1);
        p0 = coords[coords.length - 1];
        p1 = coords[coords.length - 2];
        const dist = distanceBetweenPoints(p0, p1);
        p2 = [
            p0[0] - ((p1[1] - p0[1]) / dist) * offset,
            p0[1] + ((p1[0] - p0[0]) / dist) * offset,
        ];
        path.push(p2);
    }

    return path;
};

/**
 * Find the segment that contains a given point
 */
export const findSegmentAtPoint = (
    pt: Coordinate,
    coords: Coordinate[]
): { index: number; segment: [Coordinate, Coordinate] | null } => {
    for (let i = 0; i < coords.length - 1; i++) {
        const p0 = coords[i];
        const p1 = coords[i + 1];

        if (coordsAreEqual(pt, p0) || coordsAreEqual(pt, p1)) {
            return { index: i, segment: [p0, p1] };
        }

        const d0 = distanceBetweenPoints(p0, p1);
        const v0 = [(p1[0] - p0[0]) / d0, (p1[1] - p0[1]) / d0];
        const d1 = distanceBetweenPoints(p0, pt);
        const v1 = [(pt[0] - p0[0]) / d1, (pt[1] - p0[1]) / d1];

        // Check if point lies on segment (cross product near zero)
        if (Math.abs(v0[0] * v1[1] - v0[1] * v1[0]) < 1e-10) {
            return { index: i, segment: [p0, p1] };
        }
    }

    return { index: -1, segment: null };
};

// ============== FEATURE OFFSET FUNCTIONS ==============

export type OffsetSide = "left" | "right" | "inward" | "outward";

/**
 * Offset a LineString feature
 * @param feature - The LineString feature to offset
 * @param distanceMapUnits - Distance in map units (EPSG:3857 meters)
 * @param side - "left" or "right" relative to line direction
 * @returns New offset LineString geometry
 */
export const offsetLineString = (
    geometry: LineString,
    distanceMapUnits: number,
    side: "left" | "right"
): LineString => {
    const coords = geometry.getCoordinates();

    // Left side = negative offset, Right side = positive offset
    const offset = side === "left" ? -distanceMapUnits : distanceMapUnits;

    const offsetCoords = offsetCoordinates(coords, offset);
    return new LineString(offsetCoords);
};

/**
 * Offset a Polygon feature
 * For polygons, inward = shrink, outward = expand
 * @param geometry - The Polygon geometry to offset
 * @param distanceMapUnits - Distance in map units (EPSG:3857 meters)
 * @param side - "inward" (shrink) or "outward" (expand)
 * @returns New offset Polygon geometry
 */
export const offsetPolygon = (
    geometry: Polygon,
    distanceMapUnits: number,
    side: "inward" | "outward"
): Polygon => {
    const rings = geometry.getCoordinates();
    const offsetRings: Coordinate[][] = [];

    for (let i = 0; i < rings.length; i++) {
        // For exterior ring (i=0): outward = positive, inward = negative
        // For interior rings (holes): opposite direction
        let offset: number;
        if (i === 0) {
            offset = side === "outward" ? distanceMapUnits : -distanceMapUnits;
        } else {
            offset = side === "outward" ? -distanceMapUnits : distanceMapUnits;
        }

        offsetRings.push(offsetCoordinates(rings[i], offset));
    }

    return new Polygon(offsetRings);
};

/**
 * Create an offset copy of a feature
 * Main entry point for offset operations
 * 
 * @param originalFeature - The feature to offset
 * @param distanceMeters - Distance in meters (will be converted to map units)
 * @param side - Side for offset: left/right for lines, inward/outward for polygons
 * @returns New feature with offset geometry and copied properties
 */
export const createOffsetFeature = (
    originalFeature: Feature<Geometry>,
    distanceMeters: number,
    side: OffsetSide
): Feature<Geometry> | null => {
    const geometry = originalFeature.getGeometry();
    if (!geometry) return null;

    const geometryType = geometry.getType();
    let offsetGeometry: Geometry | null = null;

    // In EPSG:3857 (Web Mercator), map units ≠ meters except at the equator
    // Calculate scale factor based on geometry's center latitude
    const extent = geometry.getExtent();
    const center = getCenter(extent);
    const centerWGS84 = transform(center, "EPSG:3857", "EPSG:4326");
    const latitude = centerWGS84[1];

    // Web Mercator scale factor: 1 / cos(latitude in radians)
    // This converts meters to map units at the given latitude
    const scaleFactor = 1 / Math.cos((latitude * Math.PI) / 180);
    const distanceMapUnits = distanceMeters * scaleFactor;

    switch (geometryType) {
        case "LineString": {
            if (side !== "left" && side !== "right") {
                console.warn("LineString offset requires 'left' or 'right' side");
                return null;
            }
            offsetGeometry = offsetLineString(
                geometry as LineString,
                distanceMapUnits,
                side
            );
            break;
        }
        case "Polygon": {
            if (side !== "inward" && side !== "outward") {
                console.warn("Polygon offset requires 'inward' or 'outward' side");
                return null;
            }
            offsetGeometry = offsetPolygon(
                geometry as Polygon,
                distanceMapUnits,
                side
            );
            break;
        }
        default:
            console.warn(`Unsupported geometry type for offset: ${geometryType}`);
            return null;
    }

    // Create new feature with offset geometry
    const newFeature = new Feature({
        geometry: offsetGeometry,
    });

    // Copy all properties from original (except geometry)
    const properties = originalFeature.getProperties();
    const { geometry: _, ...otherProps } = properties;

    Object.entries(otherProps).forEach(([key, value]) => {
        newFeature.set(key, value);
    });

    // Append "(offset)" to name if exists
    const originalName = originalFeature.get("name");
    if (originalName) {
        newFeature.set("name", `${originalName} (offset)`);
    }

    // Recalculate distance for measure features
    if (originalFeature.get("isMeasure") && offsetGeometry) {
        newFeature.set("isMeasure", true);
        const length = getLength(offsetGeometry);
        newFeature.set("distance", length);
    }

    return newFeature;
};

/**
 * Get the appropriate side options based on geometry type
 */
export const getOffsetSideOptions = (
    geometryType: string
): { value: OffsetSide; label: string }[] => {
    if (geometryType === "LineString") {
        return [
            { value: "left", label: "Left" },
            { value: "right", label: "Right" },
        ];
    }
    // Polygon, Circle (rendered as Polygon)
    return [
        { value: "outward", label: "Outward" },
        { value: "inward", label: "Inward" },
    ];
};
