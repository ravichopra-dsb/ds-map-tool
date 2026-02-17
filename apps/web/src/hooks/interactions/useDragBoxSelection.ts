import { useEffect, useRef } from 'react';
import { DragBox, Select, Translate, DragPan } from 'ol/interaction';
import { platformModifierKeyOnly } from 'ol/events/condition';
import type Map from 'ol/Map';
import type VectorLayer from 'ol/layer/Vector';
import type { Vector as VectorSource } from 'ol/source';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { isSelectableFeature } from '@/utils/featureTypeUtils';

interface UseDragBoxSelectionOptions {
  map: Map | null;
  vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  selectInteraction: Select | null;
  translateInteraction?: Translate | null;
  onFeatureSelect: (feature: Feature<Geometry> | null) => void;
  onMultiSelectChange?: (features: Feature<Geometry>[]) => void;
}

export const useDragBoxSelection = ({
  map,
  vectorLayer,
  selectInteraction,
  translateInteraction,
  onFeatureSelect,
  onMultiSelectChange,
}: UseDragBoxSelectionOptions): void => {
  const dragBoxRef = useRef<DragBox | null>(null);
  const dragPanRef = useRef<DragPan | null>(null);
  // Track drag start/end coordinates for direction-based selection
  const startCoordRef = useRef<[number, number]>([0, 0]);
  const endCoordRef = useRef<[number, number]>([0, 0]);

  useEffect(() => {
    if (!map || !vectorLayer || !selectInteraction) return;

    const vectorSource = vectorLayer.getSource();
    if (!vectorSource) return;

    // Get DragPan reference
    map.getInteractions().forEach((interaction) => {
      if (interaction instanceof DragPan) {
        dragPanRef.current = interaction;
      }
    });

    // Create DragBox with Ctrl/Cmd modifier condition
    const dragBox = new DragBox({
      condition: platformModifierKeyOnly,
    });

    // Track start position when drag begins
    dragBox.on('boxstart', (event) => {
      const dragBoxEvent = event as any;
      startCoordRef.current = dragBoxEvent.coordinate;
      selectInteraction.getFeatures().clear();
    });

    // Track end position and determine selection mode based on drag direction
    dragBox.on('boxend', (event) => {
      const dragBoxEvent = event as any;
      endCoordRef.current = dragBoxEvent.coordinate;

      const extent = dragBox.getGeometry()?.getExtent();
      if (!extent) return;

      const startY = startCoordRef.current[1];
      const endY = endCoordRef.current[1];
      // Upward drag (in map coordinates, higher Y = upward) = intersecting selection
      // Downward drag = full containment selection
      const isUpwardDrag = endY > startY;

      let selectedFeatures: Feature<Geometry>[] = [];

      if (isUpwardDrag) {
        // UPWARD: Select all intersecting features
        vectorSource.forEachFeatureIntersectingExtent(extent, (feature) => {
          if (isSelectableFeature(feature as Feature<Geometry>)) {
            selectedFeatures.push(feature as Feature<Geometry>);
          }
        });
      } else {
        // DOWNWARD: Select only fully contained features
        const rotation = map.getView().getRotation();
        const oblique = rotation % (Math.PI / 2) !== 0;

        // Get candidates that intersect the extent
        const candidates: Feature<Geometry>[] = [];
        vectorSource.forEachFeatureIntersectingExtent(extent, (feature) => {
          if (isSelectableFeature(feature as Feature<Geometry>)) {
            candidates.push(feature as Feature<Geometry>);
          }
        });

        // Filter for full containment
        candidates.forEach((feature) => {
          let geom = feature.getGeometry()!.clone();
          if (oblique) {
            const center = map.getView().getCenter() || [0, 0];
            geom.rotate(-rotation, center);
          }
          const featExtent = geom.getExtent();

          // Check if feature extent is fully within the drag box extent
          if (
            featExtent[0] >= extent[0] &&
            featExtent[2] <= extent[2] &&
            featExtent[1] >= extent[1] &&
            featExtent[3] <= extent[3]
          ) {
            selectedFeatures.push(feature);
          }
        });
      }

      // Clear current selection and add new features
      selectInteraction.getFeatures().clear();
      selectedFeatures.forEach((feature) => {
        selectInteraction.getFeatures().push(feature);
      });

      // Handle selection state
      if (selectedFeatures.length > 0) {
        translateInteraction?.setActive(true);
        dragPanRef.current?.setActive(false);
      } else {
        translateInteraction?.setActive(false);
        dragPanRef.current?.setActive(true);
      }

      onMultiSelectChange?.(selectedFeatures);
      onFeatureSelect(selectedFeatures[0] || null);
    });

    map.addInteraction(dragBox);
    dragBoxRef.current = dragBox;

    return () => {
      if (dragBoxRef.current) {
        map.removeInteraction(dragBoxRef.current);
        dragBoxRef.current = null;
      }
    };
  }, [map, vectorLayer, selectInteraction, translateInteraction, onMultiSelectChange, onFeatureSelect]);
};
