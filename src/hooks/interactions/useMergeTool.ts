import { useEffect, useRef } from 'react';
import { Modify, Select, Snap } from 'ol/interaction';
import { Collection } from 'ol';
import { click } from 'ol/events/condition';
import type Map from 'ol/Map';
import type VectorLayer from 'ol/layer/Vector';
import type { Vector as VectorSource } from 'ol/source';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { isMergeableFeature, getLineEndpoints, findNearbyEndpoint } from '@/utils/splitUtils';
import { recalculateMeasureDistances } from '@/utils/interactionUtils';

// Custom event interface for merge requests
export interface MergeRequestDetail {
  feature1: Feature<Geometry>;
  feature2: Feature<Geometry>;
  feature1Endpoint: 'start' | 'end';
  feature2Endpoint: 'start' | 'end';
  vectorSource: VectorSource<Feature<Geometry>>;
}

interface UseMergeToolOptions {
  map: Map | null;
  vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  isActive: boolean;
  selectInteraction?: Select | null;
  modifyInteraction?: Modify | null;
  onFeatureSelect?: (feature: Feature<Geometry> | null) => void;
}

const MERGE_TOLERANCE = 50;

export const useMergeTool = ({
  map,
  vectorLayer,
  isActive,
  selectInteraction,
  modifyInteraction,
  onFeatureSelect,
}: UseMergeToolOptions): void => {
  const mergeModifyInteractionRef = useRef<Modify | null>(null);
  const mergeSelectInteractionRef = useRef<Select | null>(null);
  const mergeSnapInteractionRef = useRef<Snap | null>(null);

  useEffect(() => {
    if (!map || !vectorLayer) return;

    const vectorSource = vectorLayer.getSource();
    if (!vectorSource) return;

    if (isActive) {
      // Disable the default select and modify interactions, clear any existing selection
      selectInteraction?.setActive(false);
      selectInteraction?.getFeatures().clear();
      modifyInteraction?.setActive(false);

      // Create a select interaction for merge tool
      const mergeSelectInteraction = new Select({
        condition: click,
        layers: [vectorLayer],
        filter: isMergeableFeature,
      });

      // Create editable features collection for merge modify
      const mergeEditableFeatures = new Collection<Feature<Geometry>>();

      // Create a modify interaction for merge
      const mergeModifyInteraction = new Modify({
        features: mergeEditableFeatures,
      });

      // Create a snap interaction for magnetic effect
      const mergeSnapInteraction = new Snap({
        source: vectorSource,
        pixelTolerance: 15,
        vertex: true,
        edge: false,
      });

      // Handle modify end - check for merge opportunity
      mergeModifyInteraction.on('modifyend', (event) => {
        const modifiedFeatures = event.features.getArray();

        for (const modifiedFeature of modifiedFeatures) {
          if (!isMergeableFeature(modifiedFeature)) continue;

          const endpoints = getLineEndpoints(modifiedFeature);
          if (!endpoints) continue;

          const allFeatures = vectorSource.getFeatures();

          // Check if start endpoint is near another feature's endpoint
          const startMatch = findNearbyEndpoint(
            endpoints.start,
            allFeatures,
            modifiedFeature,
            MERGE_TOLERANCE
          );

          if (startMatch) {
            const mergeEvent = new CustomEvent<MergeRequestDetail>('mergeRequest', {
              detail: {
                feature1: modifiedFeature,
                feature2: startMatch.feature,
                feature1Endpoint: 'start',
                feature2Endpoint: startMatch.endpoint,
                vectorSource,
              },
            });
            window.dispatchEvent(mergeEvent);
            return;
          }

          // Check if end endpoint is near another feature's endpoint
          const endMatch = findNearbyEndpoint(
            endpoints.end,
            allFeatures,
            modifiedFeature,
            MERGE_TOLERANCE
          );

          if (endMatch) {
            const mergeEvent = new CustomEvent<MergeRequestDetail>('mergeRequest', {
              detail: {
                feature1: modifiedFeature,
                feature2: endMatch.feature,
                feature1Endpoint: 'end',
                feature2Endpoint: endMatch.endpoint,
                vectorSource,
              },
            });
            window.dispatchEvent(mergeEvent);
            return;
          }

          // Recalculate measure distance if it's a measure feature
          if (modifiedFeature.get('isMeasure')) {
            recalculateMeasureDistances([modifiedFeature]);
          }
        }
      });

      // Handle select event
      mergeSelectInteraction.on('select', (e) => {
        mergeEditableFeatures.clear();

        e.selected.forEach((feature) => {
          if (isMergeableFeature(feature as Feature<Geometry>)) {
            mergeEditableFeatures.push(feature as Feature<Geometry>);
          }
        });

        onFeatureSelect?.((e.selected[0] as Feature<Geometry>) || null);
      });

      map.addInteraction(mergeSelectInteraction);
      map.addInteraction(mergeModifyInteraction);
      map.addInteraction(mergeSnapInteraction);

      mergeSelectInteractionRef.current = mergeSelectInteraction;
      mergeModifyInteractionRef.current = mergeModifyInteraction;
      mergeSnapInteractionRef.current = mergeSnapInteraction;
    } else {
      // Remove merge interactions when switching away
      if (mergeSnapInteractionRef.current) {
        map.removeInteraction(mergeSnapInteractionRef.current);
        mergeSnapInteractionRef.current = null;
      }
      if (mergeModifyInteractionRef.current) {
        map.removeInteraction(mergeModifyInteractionRef.current);
        mergeModifyInteractionRef.current = null;
      }
      if (mergeSelectInteractionRef.current) {
        map.removeInteraction(mergeSelectInteractionRef.current);
        mergeSelectInteractionRef.current = null;
      }
    }

    return () => {
      if (mergeSnapInteractionRef.current) {
        map.removeInteraction(mergeSnapInteractionRef.current);
        mergeSnapInteractionRef.current = null;
      }
      if (mergeModifyInteractionRef.current) {
        map.removeInteraction(mergeModifyInteractionRef.current);
        mergeModifyInteractionRef.current = null;
      }
      if (mergeSelectInteractionRef.current) {
        map.removeInteraction(mergeSelectInteractionRef.current);
        mergeSelectInteractionRef.current = null;
      }
    };
  }, [isActive, map, vectorLayer, selectInteraction, modifyInteraction, onFeatureSelect]);
};
