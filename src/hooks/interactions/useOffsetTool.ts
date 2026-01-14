import { useEffect } from 'react';
import { Select, Modify } from 'ol/interaction';
import type Map from 'ol/Map';
import type VectorLayer from 'ol/layer/Vector';
import type { Vector as VectorSource } from 'ol/source';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { isOffsettableFeature } from '@/utils/splitUtils';

interface UseOffsetToolOptions {
  map: Map | null;
  vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  isActive: boolean;
  selectInteraction?: Select | null;
  modifyInteraction?: Modify | null;
}

export const useOffsetTool = ({
  map,
  vectorLayer,
  isActive,
  selectInteraction,
  modifyInteraction,
}: UseOffsetToolOptions): void => {
  useEffect(() => {
    if (!map || !vectorLayer) return;

    if (isActive) {
      // Disable select and modify during offset, clear any existing selection
      selectInteraction?.setActive(false);
      selectInteraction?.getFeatures().clear();
      modifyInteraction?.setActive(false);

      const vectorSource = vectorLayer.getSource();
      if (!vectorSource) return;

      // Add click handler for offset tool
      const offsetClickHandler = (evt: any) => {
        const pixel = evt.pixel;
        const features: Feature<Geometry>[] = [];

        map.forEachFeatureAtPixel(pixel, (feature) => {
          if (isOffsettableFeature(feature as Feature<Geometry>)) {
            features.push(feature as Feature<Geometry>);
          }
        });

        if (features.length > 0) {
          // Emit custom event to open offset dialog
          const offsetEvent = new CustomEvent('offsetRequest', {
            detail: {
              feature: features[0],
              vectorSource,
            },
          });
          window.dispatchEvent(offsetEvent);
        }
      };

      map.on('click', offsetClickHandler);

      // Store the handler for cleanup
      (map as any)._offsetClickHandler = offsetClickHandler;
    } else {
      // Remove offset click handler when switching away
      if ((map as any)._offsetClickHandler) {
        map.un('click', (map as any)._offsetClickHandler);
        delete (map as any)._offsetClickHandler;
      }
    }

    return () => {
      if ((map as any)._offsetClickHandler) {
        map.un('click', (map as any)._offsetClickHandler);
        delete (map as any)._offsetClickHandler;
      }
    };
  }, [isActive, map, vectorLayer, selectInteraction, modifyInteraction]);
};
