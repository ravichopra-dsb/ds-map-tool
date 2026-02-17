import { useEffect, useRef } from 'react';
import { Select } from 'ol/interaction';
import { pointerMove } from 'ol/events/condition';
import type Map from 'ol/Map';
import type VectorLayer from 'ol/layer/Vector';
import type { Vector as VectorSource } from 'ol/source';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { createHoverStyle } from '@/utils/styleUtils';
import { STYLE_DEFAULTS } from '@/constants/styleDefaults';
import { useToolStore } from '@/stores/useToolStore';

interface UseHoverInteractionOptions {
  map: Map | null;
  vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  selectInteraction: Select | null;
}

export const useHoverInteraction = ({
  map,
  vectorLayer,
  selectInteraction,
}: UseHoverInteractionOptions): void => {
  const hoverInteractionRef = useRef<Select | null>(null);
  const { resolutionScalingEnabled } = useToolStore();

  useEffect(() => {
    if (!map || !vectorLayer) return;

    const hoverInteraction = new Select({
      condition: pointerMove,
      layers: [vectorLayer],
      filter: (feature) => {
        // Don't trigger hover on selected features
        if (!selectInteraction) return true;
        const selectedFeatures = selectInteraction.getFeatures().getArray();
        return !selectedFeatures.includes(feature as Feature<Geometry>);
      },
      style: (feature, resolution) => {
        return createHoverStyle(feature as Feature<Geometry>, resolution, resolutionScalingEnabled);
      },
      hitTolerance: STYLE_DEFAULTS.HIT_TOLERANCE,
    });

    map.addInteraction(hoverInteraction);
    hoverInteractionRef.current = hoverInteraction;

    return () => {
      if (hoverInteractionRef.current) {
        map.removeInteraction(hoverInteractionRef.current);
        hoverInteractionRef.current = null;
      }
    };
  }, [map, vectorLayer, selectInteraction, resolutionScalingEnabled]);
};
