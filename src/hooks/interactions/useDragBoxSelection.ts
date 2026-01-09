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

    dragBox.on('boxend', () => {
      const extent = dragBox.getGeometry()?.getExtent();
      if (!extent) return;

      // Find all features intersecting the drag box extent
      const selectedFeatures: Feature<Geometry>[] = [];
      vectorSource.forEachFeatureIntersectingExtent(extent, (feature) => {
        if (isSelectableFeature(feature as Feature<Geometry>)) {
          selectedFeatures.push(feature as Feature<Geometry>);
        }
      });

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
