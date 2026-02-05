import { useEffect, useRef } from 'react';
import { Modify, Select, Translate } from 'ol/interaction';
import { Collection, Feature } from 'ol';
import { Point, LineString, Geometry } from 'ol/geom';
import type Map from 'ol/Map';
import type VectorLayer from 'ol/layer/Vector';
import { Vector as VectorSource } from 'ol/source';
import VectorLayerOL from 'ol/layer/Vector';
import { Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style';
import type { Coordinate } from 'ol/coordinate';
import { createArcGeometry, extractControlPointsFromArc } from '@/utils/arcUtils';

// Control point colors for visual distinction
const CONTROL_POINT_COLORS = {
  start: '#7ccf00',    // Green - start point
  through: '#0099ff',  // Blue - through point (determines curvature)
  end: '#fb2c36',      // Red - end point
};

const CONTROL_POINT_RADIUS = 5;

interface UseArcModifyOptions {
  map: Map | null;
  vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  selectInteraction: Select | null;
  modifyInteraction: Modify | null;
  translateInteraction: Translate | null;
}

/**
 * Check if a feature is an editable arc
 */
const isArcFeature = (feature: Feature<Geometry> | null): boolean => {
  return feature?.get('isArc') === true;
};

/**
 * Create a styled point feature for a control handle (overlay only)
 */
const createControlPointFeature = (
  coordinate: Coordinate,
  type: 'start' | 'through' | 'end',
  parentArcId: string
): Feature<Point> => {
  const point = new Feature({
    geometry: new Point(coordinate),
    isArcControlPoint: true,
    controlPointType: type,
    parentArcId: parentArcId,
  });

  point.setStyle(new Style({
    image: new CircleStyle({
      radius: CONTROL_POINT_RADIUS,
      fill: new Fill({ color: CONTROL_POINT_COLORS[type] }),
      stroke: new Stroke({ color: '#ffffff', width: 2 }),
    }),
    zIndex: 200,
  }));

  return point;
};

/**
 * Hook to handle arc-specific editing with 3 control points
 * When an arc is selected, shows 3 draggable control points (start, through, end) in an OVERLAY layer
 * These control points do NOT appear in the main feature list
 * Dragging any control point recalculates the entire arc in real-time
 */
export const useArcModify = ({
  map,
  vectorLayer,
  selectInteraction,
  modifyInteraction,
  translateInteraction,
}: UseArcModifyOptions): void => {
  // Refs for managing control point overlay
  const controlPointsRef = useRef<Feature<Point>[]>([]);
  const currentArcRef = useRef<Feature<Geometry> | null>(null);
  const arcModifyRef = useRef<Modify | null>(null);
  const controlPointCollectionRef = useRef<Collection<Feature<Point>> | null>(null);
  const isActiveRef = useRef<boolean>(false);
  const geometryListenersRef = useRef<(() => void)[]>([]);
  // Flag to prevent infinite loops when updating from external sources
  const isUpdatingFromExternalRef = useRef<boolean>(false);
  // Store last known arc control points to detect external changes
  const lastKnownControlPointsRef = useRef<Coordinate[] | null>(null);

  // Overlay layer refs - control points will ONLY exist here, not in main source
  const overlaySourceRef = useRef<VectorSource<Feature<Point>> | null>(null);
  const overlayLayerRef = useRef<VectorLayerOL<VectorSource<Feature<Point>>> | null>(null);

  useEffect(() => {
    if (!map || !vectorLayer || !selectInteraction) return;

    // Create a SEPARATE overlay source and layer for control points
    // This ensures control points don't appear in the main feature list
    const overlaySource = new VectorSource<Feature<Point>>();
    overlaySourceRef.current = overlaySource;

    const overlayLayer = new VectorLayerOL({
      source: overlaySource,
      zIndex: 1000, // Above all other layers
      properties: {
        isArcControlOverlay: true, // Mark this as special overlay
      },
    });
    overlayLayerRef.current = overlayLayer;
    map.addLayer(overlayLayer);

    // Create a collection to hold control point features for modification
    controlPointCollectionRef.current = new Collection<Feature<Point>>();

    // Create modify interaction specifically for control points
    const arcModify = new Modify({
      features: controlPointCollectionRef.current,
      pixelTolerance: 15,
    });

    arcModifyRef.current = arcModify;
    arcModify.setActive(false);
    map.addInteraction(arcModify);

    /**
     * Update arc geometry based on current control point positions
     */
    const updateArcGeometry = () => {
      const arcFeature = currentArcRef.current;
      if (!arcFeature || controlPointsRef.current.length !== 3) return;

      // Skip if we're updating from an external source (to prevent infinite loops)
      if (isUpdatingFromExternalRef.current) return;

      // Extract current positions from control point handles
      const newControlPoints: Coordinate[] = controlPointsRef.current.map(handle => {
        const geom = handle.getGeometry();
        return geom ? geom.getCoordinates() : [0, 0];
      });

      // Regenerate arc geometry with new control points
      const newArcGeometry = createArcGeometry(
        newControlPoints[0],
        newControlPoints[1],
        newControlPoints[2],
        64
      );

      // Update the arc feature geometry
      arcFeature.setGeometry(newArcGeometry);

      // Update stored control points
      arcFeature.set('arcControlPoints', newControlPoints);

      // Update last known control points
      lastKnownControlPointsRef.current = newControlPoints;
    };

    /**
     * Sync overlay control points from arc feature's stored control points
     * Used when arc is modified externally (translate, undo/redo)
     */
    const syncControlPointsFromArc = () => {
      const arcFeature = currentArcRef.current;
      if (!arcFeature || controlPointsRef.current.length !== 3) return;

      const storedPoints = arcFeature.get('arcControlPoints') as Coordinate[] | undefined;
      if (!storedPoints || storedPoints.length !== 3) return;

      // Set flag to prevent updateArcGeometry from being triggered
      isUpdatingFromExternalRef.current = true;

      // Update each control point's geometry to match stored position
      controlPointsRef.current.forEach((handle, index) => {
        const geom = handle.getGeometry();
        if (geom) {
          geom.setCoordinates(storedPoints[index]);
        }
      });

      // Update last known control points
      lastKnownControlPointsRef.current = [...storedPoints];

      // Reset flag after a microtask to ensure all change events have fired
      Promise.resolve().then(() => {
        isUpdatingFromExternalRef.current = false;
      });
    };

    /**
     * Clean up geometry change listeners
     */
    const cleanupGeometryListeners = () => {
      geometryListenersRef.current.forEach(cleanup => cleanup());
      geometryListenersRef.current = [];
    };

    // Variable to store arc geometry listener cleanup (declared early for use in clearControlPoints)
    let arcGeometryListenerCleanup: (() => void) | null = null;

    /**
     * Setup geometry change listeners for real-time arc updates
     */
    const setupGeometryListeners = () => {
      cleanupGeometryListeners();

      controlPointsRef.current.forEach(point => {
        const geom = point.getGeometry();
        if (geom) {
          const handler = () => {
            if (isActiveRef.current) {
              updateArcGeometry();
            }
          };
          geom.on('change', handler);
          geometryListenersRef.current.push(() => geom.un('change', handler));
        }
      });
    };

    /**
     * Remove existing control point handles from the overlay
     */
    const clearControlPoints = () => {
      cleanupGeometryListeners();

      // Clean up arc geometry listener
      if (arcGeometryListenerCleanup) {
        arcGeometryListenerCleanup();
        arcGeometryListenerCleanup = null;
      }

      // Clear from overlay source (NOT main vectorSource)
      controlPointsRef.current.forEach(point => {
        overlaySource.removeFeature(point);
      });
      controlPointsRef.current = [];
      controlPointCollectionRef.current?.clear();
      currentArcRef.current = null;
      isActiveRef.current = false;
      lastKnownControlPointsRef.current = null;
    };

    /**
     * Create control point handles for an arc feature in the overlay layer
     */
    const showControlPoints = (arcFeature: Feature<Geometry>) => {
      clearControlPoints();

      // Get control points - either stored or extracted from geometry
      let controlPoints = arcFeature.get('arcControlPoints') as Coordinate[] | undefined;

      // Handle legacy arcs without stored control points
      if (!controlPoints || controlPoints.length !== 3) {
        const geometry = arcFeature.getGeometry() as LineString;
        if (!geometry) return;
        const coords = geometry.getCoordinates();
        controlPoints = extractControlPointsFromArc(coords);

        // Store the extracted points for future use
        arcFeature.set('arcControlPoints', controlPoints);
      }

      if (controlPoints.length !== 3) return;

      // Use ol_uid or generate a unique ID
      const arcId = (arcFeature as any).ol_uid?.toString() || Date.now().toString();
      currentArcRef.current = arcFeature;
      isActiveRef.current = true;

      // Create the 3 control point handles in OVERLAY source only
      const types: ('start' | 'through' | 'end')[] = ['start', 'through', 'end'];
      types.forEach((type, index) => {
        const handle = createControlPointFeature(controlPoints![index], type, arcId);
        controlPointsRef.current.push(handle);

        // Add to OVERLAY source, NOT main vectorSource
        overlaySource.addFeature(handle);
        controlPointCollectionRef.current?.push(handle);
      });

      // Setup geometry change listeners for real-time updates
      setupGeometryListeners();

      // Setup listener on arc feature geometry for external changes (undo/redo)
      setupArcGeometryListener(arcFeature);

      // Store initial control points
      lastKnownControlPointsRef.current = [...controlPoints];
    };

    // Update arc geometry when modification ends (backup for real-time)
    arcModify.on('modifyend', () => {
      updateArcGeometry();
    });

    /**
     * Setup listener on the arc feature's geometry to detect external changes
     * (translate, undo/redo, etc.)
     */
    const setupArcGeometryListener = (arcFeature: Feature<Geometry>) => {
      // Clean up previous listener
      if (arcGeometryListenerCleanup) {
        arcGeometryListenerCleanup();
        arcGeometryListenerCleanup = null;
      }

      const geometry = arcFeature.getGeometry();
      if (!geometry) return;

      const handler = () => {
        // Skip if we're updating from control point drag (not external)
        if (isUpdatingFromExternalRef.current) return;

        // Check if the change came from translate or undo/redo by comparing
        // the arc's stored control points with our last known values
        const storedPoints = arcFeature.get('arcControlPoints') as Coordinate[] | undefined;
        if (!storedPoints || storedPoints.length !== 3) return;

        // If we have control points active, check if they need syncing
        if (controlPointsRef.current.length === 3) {
          const currentOverlayPoints = controlPointsRef.current.map(handle => {
            const geom = handle.getGeometry();
            return geom ? geom.getCoordinates() : [0, 0];
          });

          // Check if overlay points differ from stored points (indicating external change)
          const needsSync = storedPoints.some((stored, idx) => {
            const overlay = currentOverlayPoints[idx];
            return Math.abs(stored[0] - overlay[0]) > 0.001 ||
                   Math.abs(stored[1] - overlay[1]) > 0.001;
          });

          if (needsSync) {
            syncControlPointsFromArc();
          }
        }
      };

      geometry.on('change', handler);
      arcGeometryListenerCleanup = () => geometry.un('change', handler);
    };

    // Handle translate events to sync control points when arc is dragged
    const handleTranslating = () => {
      const arcFeature = currentArcRef.current;
      if (!arcFeature || !isActiveRef.current) return;

      // Get the arc's current geometry and extract updated control point positions
      // The arc geometry has been translated, so we need to recalculate control points
      const geometry = arcFeature.getGeometry() as LineString | null;
      if (!geometry) return;

      const coords = geometry.getCoordinates();
      if (coords.length < 3) return;

      // Update arcControlPoints based on translated geometry
      // Use first, middle, and last points as approximation
      const newControlPoints = extractControlPointsFromArc(coords);
      arcFeature.set('arcControlPoints', newControlPoints);

      // Sync overlay control points
      syncControlPointsFromArc();
    };

    const handleTranslateEnd = () => {
      const arcFeature = currentArcRef.current;
      if (!arcFeature || !isActiveRef.current) return;

      // Final sync after translate completes
      const geometry = arcFeature.getGeometry() as LineString | null;
      if (!geometry) return;

      const coords = geometry.getCoordinates();
      if (coords.length < 3) return;

      const newControlPoints = extractControlPointsFromArc(coords);
      arcFeature.set('arcControlPoints', newControlPoints);
      syncControlPointsFromArc();
    };

    // Attach translate listeners if available
    if (translateInteraction) {
      translateInteraction.on('translating', handleTranslating);
      translateInteraction.on('translateend', handleTranslateEnd);
    }

    /**
     * Handle selection changes
     */
    const handleSelect = () => {
      const selectedFeatures = selectInteraction.getFeatures().getArray();

      if (selectedFeatures.length === 1 && isArcFeature(selectedFeatures[0])) {
        // Arc selected - show control points and enable arc modify
        showControlPoints(selectedFeatures[0]);
        modifyInteraction?.setActive(false);
        arcModify.setActive(true);
      } else {
        // Non-arc or multiple selection - clear control points
        if (isActiveRef.current) {
          clearControlPoints();
          modifyInteraction?.setActive(true);
          arcModify.setActive(false);
        }
      }
    };

    // Listen for selection changes
    selectInteraction.on('select', handleSelect);

    // Also listen for programmatic selection clears
    const selectedFeatures = selectInteraction.getFeatures();
    const handleFeaturesChange = () => {
      const features = selectedFeatures.getArray();
      if (features.length === 0 && isActiveRef.current) {
        clearControlPoints();
        arcModify.setActive(false);
      }
    };
    selectedFeatures.on('remove', handleFeaturesChange);

    // Check initial state
    handleSelect();

    return () => {
      clearControlPoints();
      selectInteraction.un('select', handleSelect);
      selectedFeatures.un('remove', handleFeaturesChange);

      // Remove translate listeners
      if (translateInteraction) {
        translateInteraction.un('translating', handleTranslating);
        translateInteraction.un('translateend', handleTranslateEnd);
      }

      if (arcModifyRef.current) {
        map.removeInteraction(arcModifyRef.current);
        arcModifyRef.current = null;
      }

      // Remove overlay layer from map
      if (overlayLayerRef.current) {
        map.removeLayer(overlayLayerRef.current);
        overlayLayerRef.current = null;
      }
      overlaySourceRef.current = null;
      controlPointCollectionRef.current = null;
    };
  }, [map, vectorLayer, selectInteraction, modifyInteraction, translateInteraction]);
};
