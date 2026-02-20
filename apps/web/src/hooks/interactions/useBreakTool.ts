import { useEffect, useRef, useCallback } from 'react';
import type { Select, Modify } from 'ol/interaction';
import type Map from 'ol/Map';
import type VectorLayer from 'ol/layer/Vector';
import type { Vector as VectorSource } from 'ol/source';
import { Feature } from 'ol';
import { LineString } from 'ol/geom';
import type { Geometry } from 'ol/geom';
import type { Coordinate } from 'ol/coordinate';
import OlOverlay from 'ol/Overlay';
import { isSplittableFeature, copyFeatureProperties } from '@/utils/splitUtils';

interface UseBreakToolOptions {
  map: Map | null;
  vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  isActive: boolean;
  selectInteraction?: Select | null;
  modifyInteraction?: Modify | null;
}

interface BreakState {
  feature: Feature<Geometry> | null;
  firstIndex: number;       // fractional index along the linestring for first click
  firstCoord: Coordinate | null;
}

/**
 * Find the closest point on a LineString to a given coordinate.
 * Returns the fractional index (e.g., 2.4 means 40% between vertex 2 and 3)
 * and the projected coordinate on the line.
 */
function closestPointOnLine(
  lineCoords: Coordinate[],
  coord: Coordinate
): { fractionalIndex: number; point: Coordinate; distance: number } {
  let bestDist = Infinity;
  let bestFrac = 0;
  let bestPoint: Coordinate = lineCoords[0];

  for (let i = 0; i < lineCoords.length - 1; i++) {
    const a = lineCoords[i];
    const b = lineCoords[i + 1];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lenSq = dx * dx + dy * dy;

    let t = 0;
    if (lenSq > 0) {
      t = ((coord[0] - a[0]) * dx + (coord[1] - a[1]) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }

    const px = a[0] + t * dx;
    const py = a[1] + t * dy;
    const dist = Math.sqrt((coord[0] - px) ** 2 + (coord[1] - py) ** 2);

    if (dist < bestDist) {
      bestDist = dist;
      bestFrac = i + t;
      bestPoint = [px, py];
    }
  }

  return { fractionalIndex: bestFrac, point: bestPoint, distance: bestDist };
}

/**
 * Split a linestring's coordinates at a fractional index.
 * Returns the coordinate at the split point and two halves.
 */
function splitCoordsAtFraction(
  coords: Coordinate[],
  frac: number
): { before: Coordinate[]; after: Coordinate[]; splitPoint: Coordinate } {
  const segIndex = Math.floor(frac);
  const t = frac - segIndex;

  if (t < 1e-10) {
    // Exactly on a vertex
    const splitPoint = coords[segIndex];
    return {
      before: coords.slice(0, segIndex + 1),
      after: coords.slice(segIndex),
      splitPoint,
    };
  }

  // Interpolate the split point
  const a = coords[segIndex];
  const b = coords[Math.min(segIndex + 1, coords.length - 1)];
  const splitPoint: Coordinate = [
    a[0] + t * (b[0] - a[0]),
    a[1] + t * (b[1] - a[1]),
  ];

  return {
    before: [...coords.slice(0, segIndex + 1), splitPoint],
    after: [splitPoint, ...coords.slice(segIndex + 1)],
    splitPoint,
  };
}

export const useBreakTool = ({
  map,
  vectorLayer,
  isActive,
  selectInteraction,
  modifyInteraction,
}: UseBreakToolOptions): void => {
  const stateRef = useRef<BreakState>({
    feature: null,
    firstIndex: 0,
    firstCoord: null,
  });
  const markerOverlayRef = useRef<OlOverlay | null>(null);
  const markerElementRef = useRef<HTMLDivElement | null>(null);

  const resetState = useCallback(() => {
    stateRef.current = { feature: null, firstIndex: 0, firstCoord: null };
    if (markerOverlayRef.current) {
      markerOverlayRef.current.setPosition(undefined);
    }
  }, []);

  useEffect(() => {
    if (!map || !vectorLayer) return;

    if (isActive) {
      // Disable select and modify during break, clear any existing selection
      selectInteraction?.setActive(false);
      selectInteraction?.getFeatures().clear();
      modifyInteraction?.setActive(false);

      const vectorSource = vectorLayer.getSource();
      if (!vectorSource) return;

      // Create marker element for first click point
      const markerEl = document.createElement('div');
      markerEl.style.cssText = `
        width: 12px;
        height: 12px;
        background: #ff0000;
        border: 2px solid #ffffff;
        border-radius: 50%;
        pointer-events: none;
        box-shadow: 0 0 4px rgba(0,0,0,0.5);
      `;
      markerElementRef.current = markerEl;

      const markerOverlay = new OlOverlay({
        element: markerEl,
        positioning: 'center-center',
        stopEvent: false,
      });
      map.addOverlay(markerOverlay);
      markerOverlayRef.current = markerOverlay;

      // Set crosshair cursor
      const viewport = map.getViewport();
      if (viewport) viewport.style.cursor = 'crosshair';

      const handleClick = (e: any) => {
        const pixel = e.pixel;
        const coord = e.coordinate;

        // Find the closest splittable feature at click location
        let hitFeature: Feature<Geometry> | null = null;
        map.forEachFeatureAtPixel(pixel, (f) => {
          const feat = f as Feature<Geometry>;
          if (isSplittableFeature(feat)) {
            hitFeature = feat;
          }
        }, { hitTolerance: 10 });

        const state = stateRef.current;

        const clickedFeature = hitFeature as Feature<Geometry> | null;

        if (!state.feature) {
          // First click - pick the feature and mark the first point
          if (!clickedFeature) return;

          const geom = clickedFeature.getGeometry() as LineString;
          const lineCoords = geom.getCoordinates();
          const result = closestPointOnLine(lineCoords, coord);

          stateRef.current = {
            feature: clickedFeature,
            firstIndex: result.fractionalIndex,
            firstCoord: result.point,
          };

          // Show marker at the first point
          markerOverlay.setPosition(result.point);
        } else {
          // Second click - must be on the same feature
          if (clickedFeature && clickedFeature !== state.feature) {
            // Clicked a different feature - reset and start over with this one
            const geom = clickedFeature.getGeometry() as LineString;
            const lineCoords = geom.getCoordinates();
            const result = closestPointOnLine(lineCoords, coord);

            stateRef.current = {
              feature: clickedFeature,
              firstIndex: result.fractionalIndex,
              firstCoord: result.point,
            };
            markerOverlay.setPosition(result.point);
            return;
          }

          if (!clickedFeature) {
            // Clicked on empty space - reset
            resetState();
            return;
          }

          // Second click on the same feature - perform the break
          const geom = state.feature.getGeometry() as LineString;
          const lineCoords = geom.getCoordinates();
          const result = closestPointOnLine(lineCoords, coord);

          // Ensure first < second along the line
          let frac1 = state.firstIndex;
          let frac2 = result.fractionalIndex;
          if (frac1 > frac2) {
            [frac1, frac2] = [frac2, frac1];
          }

          // If both points are essentially the same, ignore
          if (Math.abs(frac2 - frac1) < 1e-6) {
            resetState();
            return;
          }

          // Split at first point to get the "before" part
          const split1 = splitCoordsAtFraction(lineCoords, frac1);

          // Split at second point (using original coords and fraction)
          const split2 = splitCoordsAtFraction(lineCoords, frac2);

          const beforeCoords = split1.before;  // start to first point
          const afterCoords = split2.after;     // second point to end

          // Create new features for the remaining parts
          const originalFeature = state.feature;
          const newFeatures: Feature<Geometry>[] = [];

          // Only add segments that have at least 2 coordinates (valid linestring)
          if (beforeCoords.length >= 2) {
            const feat1 = new Feature({
              geometry: new LineString(beforeCoords),
            });
            newFeatures.push(feat1);
          }

          if (afterCoords.length >= 2) {
            const feat2 = new Feature({
              geometry: new LineString(afterCoords),
            });
            newFeatures.push(feat2);
          }

          if (newFeatures.length > 0) {
            // Copy properties from original to new features
            copyFeatureProperties(originalFeature, newFeatures);

            // Remove original and add new parts
            vectorSource.removeFeature(originalFeature);
            newFeatures.forEach((f) => vectorSource.addFeature(f));
          }

          // Reset for next break operation
          resetState();
        }
      };

      map.on('click', handleClick);

      // Handle Escape to cancel first point selection
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          resetState();
        }
      };
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        map.un('click', handleClick);
        document.removeEventListener('keydown', handleKeyDown);

        if (markerOverlayRef.current) {
          map.removeOverlay(markerOverlayRef.current);
          markerOverlayRef.current = null;
        }
        markerElementRef.current = null;
        resetState();

        // Reset cursor
        const vp = map.getViewport();
        if (vp) vp.style.cursor = '';
      };
    } else {
      // Cleanup when deactivated
      if (markerOverlayRef.current) {
        map.removeOverlay(markerOverlayRef.current);
        markerOverlayRef.current = null;
      }
      markerElementRef.current = null;
      resetState();
    }
  }, [isActive, map, vectorLayer, selectInteraction, modifyInteraction, resetState]);
};
