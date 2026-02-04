import { useEffect, useRef } from 'react';
import { Modify, Select } from 'ol/interaction';
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
}: UseArcModifyOptions): void => {
  // Refs for managing control point overlay
  const controlPointsRef = useRef<Feature<Point>[]>([]);
  const currentArcRef = useRef<Feature<Geometry> | null>(null);
  const arcModifyRef = useRef<Modify | null>(null);
  const controlPointCollectionRef = useRef<Collection<Feature<Point>> | null>(null);
  const isActiveRef = useRef<boolean>(false);
  const geometryListenersRef = useRef<(() => void)[]>([]);

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
    };

    /**
     * Clean up geometry change listeners
     */
    const cleanupGeometryListeners = () => {
      geometryListenersRef.current.forEach(cleanup => cleanup());
      geometryListenersRef.current = [];
    };

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

      // Clear from overlay source (NOT main vectorSource)
      controlPointsRef.current.forEach(point => {
        overlaySource.removeFeature(point);
      });
      controlPointsRef.current = [];
      controlPointCollectionRef.current?.clear();
      currentArcRef.current = null;
      isActiveRef.current = false;
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
    };

    // Update arc geometry when modification ends (backup for real-time)
    arcModify.on('modifyend', () => {
      updateArcGeometry();
    });

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
  }, [map, vectorLayer, selectInteraction, modifyInteraction]);
};
