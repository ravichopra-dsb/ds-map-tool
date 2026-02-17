import { useEffect, useRef } from 'react';
import { Select, Modify } from 'ol/interaction';
import Split from 'ol-ext/interaction/Split';
import type Map from 'ol/Map';
import type VectorLayer from 'ol/layer/Vector';
import type { Vector as VectorSource } from 'ol/source';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { isSplittableFeature, copyFeatureProperties } from '@/utils/splitUtils';

interface UseSplitToolOptions {
  map: Map | null;
  vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  isActive: boolean;
  selectInteraction?: Select | null;
  modifyInteraction?: Modify | null;
}

export const useSplitTool = ({
  map,
  vectorLayer,
  isActive,
  selectInteraction,
  modifyInteraction,
}: UseSplitToolOptions): void => {
  const splitInteractionRef = useRef<Split | null>(null);

  useEffect(() => {
    if (!map || !vectorLayer) return;

    if (isActive) {
      // Disable select and modify during split, clear any existing selection
      selectInteraction?.setActive(false);
      selectInteraction?.getFeatures().clear();
      modifyInteraction?.setActive(false);

      const vectorSource = vectorLayer.getSource();
      if (!vectorSource) return;

      const splitInteraction = new Split({
        sources: vectorSource,
        filter: isSplittableFeature,
        cursor: 'crosshair',
        snapDistance: 25,
      });

      // Handle split events - copy properties to new features
      splitInteraction.on('aftersplit', (e) => {
        copyFeatureProperties(e.original, e.features);
      });

      map.addInteraction(splitInteraction as any);
      splitInteractionRef.current = splitInteraction;
    } else {
      // Remove split interaction when switching away
      if (splitInteractionRef.current) {
        map.removeInteraction(splitInteractionRef.current as any);
        splitInteractionRef.current = null;
      }
    }

    return () => {
      if (splitInteractionRef.current) {
        map.removeInteraction(splitInteractionRef.current as any);
        splitInteractionRef.current = null;
      }
    };
  }, [isActive, map, vectorLayer, selectInteraction, modifyInteraction]);
};
