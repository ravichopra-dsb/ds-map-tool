import { useEffect, useRef } from 'react';
import { Select, Modify } from 'ol/interaction';
import { Collection } from 'ol';
import { click } from 'ol/events/condition';
import Transform from 'ol-ext/interaction/Transform';
import type Map from 'ol/Map';
import type VectorLayer from 'ol/layer/Vector';
import type { Vector as VectorSource } from 'ol/source';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';

interface UseTransformToolOptions {
  map: Map | null;
  vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  isActive: boolean;
  modifyInteraction?: Modify | null;
}

export const useTransformTool = ({
  map,
  vectorLayer,
  isActive,
  modifyInteraction,
}: UseTransformToolOptions): void => {
  const transformInteractionRef = useRef<Transform | null>(null);
  const transformSelectInteractionRef = useRef<Select | null>(null);
  const transformFeaturesRef = useRef<Collection<Feature<Geometry>> | null>(null);

  useEffect(() => {
    if (!map || !vectorLayer) return;

    if (isActive) {
      // Deactivate modify interaction to prevent vertex editing during transform
      modifyInteraction?.setActive(false);

      // Create dedicated feature collection for transform
      transformFeaturesRef.current = new Collection<Feature<Geometry>>();

      // Create transform selection interaction
      const transformSelectInteraction = new Select({
        condition: click,
        layers: [vectorLayer],
        style: null,
      });

      transformSelectInteraction.on('select', (e) => {
        transformFeaturesRef.current?.clear();
        e.selected.forEach((feature) => {
          transformFeaturesRef.current?.push(feature);
        });
      });

      map.addInteraction(transformSelectInteraction);
      transformSelectInteractionRef.current = transformSelectInteraction;

      // Create transform interaction
      const newTransformInteraction = new Transform({
        features: transformFeaturesRef.current,
        layers: [vectorLayer],
        translate: true,
        translateFeature: true,
        rotate: true,
        scale: true,
        stretch: true,
        keepAspectRatio: (e) => e.originalEvent.shiftKey,
        hitTolerance: 3,
        filter: (feature) => {
          const isMeasure = feature.get('isMeasure');

          if (isMeasure) {
            newTransformInteraction.set('rotate', false);
            newTransformInteraction.set('scale', false);
            newTransformInteraction.set('stretch', false);
          } else {
            newTransformInteraction.set('rotate', true);
            newTransformInteraction.set('scale', true);
            newTransformInteraction.set('stretch', true);
          }

          return true;
        },
      });

      map.addInteraction(newTransformInteraction as any);
      transformInteractionRef.current = newTransformInteraction;
      newTransformInteraction.setActive(true);
    } else {
      // Remove transform interaction when switching away
      if (transformInteractionRef.current) {
        transformInteractionRef.current.setActive(false);
        if (map.getInteractions().getArray().includes(transformInteractionRef.current as any)) {
          map.removeInteraction(transformInteractionRef.current as any);
        }
        transformInteractionRef.current = null;
      }

      if (transformSelectInteractionRef.current) {
        if (map.getInteractions().getArray().includes(transformSelectInteractionRef.current)) {
          map.removeInteraction(transformSelectInteractionRef.current);
        }
        transformSelectInteractionRef.current = null;
      }

      if (transformFeaturesRef.current) {
        transformFeaturesRef.current.clear();
        transformFeaturesRef.current = null;
      }

      // Reactivate modify interaction
      modifyInteraction?.setActive(true);
    }

    return () => {
      if (transformInteractionRef.current) {
        map.removeInteraction(transformInteractionRef.current as any);
      }
      if (transformSelectInteractionRef.current) {
        map.removeInteraction(transformSelectInteractionRef.current);
      }
    };
  }, [isActive, map, vectorLayer, modifyInteraction]);
};
