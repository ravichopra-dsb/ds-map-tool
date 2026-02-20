import { useEffect, useRef } from 'react';
import { Select, Modify } from 'ol/interaction';
import Split from 'ol-ext/interaction/Split';
import type Map from 'ol/Map';
import type VectorLayer from 'ol/layer/Vector';
import type { Vector as VectorSource } from 'ol/source';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { isSplittableFeature, copyFeatureProperties } from '@/utils/splitUtils';

interface UseBreakToolOptions {
  map: Map | null;
  vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  isActive: boolean;
  selectInteraction?: Select | null;
  modifyInteraction?: Modify | null;
}

export const useBreakTool = ({
  map,
  vectorLayer,
  isActive,
  selectInteraction,
  modifyInteraction,
}: UseBreakToolOptions): void => {
  const breakInteractionRef = useRef<Split | null>(null);

  useEffect(() => {
    if (!map || !vectorLayer) return;

    if (isActive) {
      // Disable select and modify during break, clear any existing selection
      selectInteraction?.setActive(false);
      selectInteraction?.getFeatures().clear();
      modifyInteraction?.setActive(false);

      const vectorSource = vectorLayer.getSource();
      if (!vectorSource) return;

      const breakInteraction = new Split({
        sources: vectorSource,
        filter: isSplittableFeature,
        cursor: 'crosshair',
        snapDistance: 25,
      });

      // Handle split events - copy properties to new features
      breakInteraction.on('aftersplit', (e) => {
        copyFeatureProperties(e.original, e.features);
      });

      map.addInteraction(breakInteraction as any);
      breakInteractionRef.current = breakInteraction;
    } else {
      // Remove break interaction when switching away
      if (breakInteractionRef.current) {
        map.removeInteraction(breakInteractionRef.current as any);
        breakInteractionRef.current = null;
      }
    }

    return () => {
      if (breakInteractionRef.current) {
        map.removeInteraction(breakInteractionRef.current as any);
        breakInteractionRef.current = null;
      }
    };
  }, [isActive, map, vectorLayer, selectInteraction, modifyInteraction]);
};
