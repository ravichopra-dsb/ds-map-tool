import { useEffect, useRef, useState } from 'react';
import { Modify, Select, Translate, DragPan } from 'ol/interaction';
import type { Draw } from 'ol/interaction';
import { Collection } from 'ol';
import { click, altKeyOnly, shiftKeyOnly, always } from 'ol/events/condition';
import type Map from 'ol/Map';
import type VectorLayer from 'ol/layer/Vector';
import type { Vector as VectorSource } from 'ol/source';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { isSelectableFeature, isEditableFeature } from '@/utils/featureTypeUtils';
import { recalculateMeasureDistances, createContinuationDraw } from '@/utils/interactionUtils';
import { createSelectStyle } from '@/utils/styleUtils';
import {
  isContinuableFeature,
  detectEndpointClick,
  getLineStringType,
  extendLineStringCoordinates,
} from '@/utils/splitUtils';
import { STYLE_DEFAULTS } from '@/constants/styleDefaults';

export type MultiSelectMode = 'shift-click' | 'always' | 'custom';

interface UseSelectModifyOptions {
  map: Map | null;
  vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  multiSelectMode?: MultiSelectMode;
  onFeatureSelect: (feature: Feature<Geometry> | null) => void;
  onMultiSelectChange?: (features: Feature<Geometry>[]) => void;
  onReady?: (selectInteraction: Select | null) => void;
}

interface UseSelectModifyReturn {
  selectInteraction: Select | null;
  modifyInteraction: Modify | null;
  translateInteraction: Translate | null;
}

export const useSelectModify = ({
  map,
  vectorLayer,
  multiSelectMode = 'shift-click',
  onFeatureSelect,
  onMultiSelectChange,
  onReady,
}: UseSelectModifyOptions): UseSelectModifyReturn => {
  const [selectInteraction, setSelectInteraction] = useState<Select | null>(null);
  const [modifyInteraction, setModifyInteraction] = useState<Modify | null>(null);
  const [translateInteraction, setTranslateInteraction] = useState<Translate | null>(null);

  const dragPanRef = useRef<DragPan | null>(null);
  const continuationDrawRef = useRef<Draw | null>(null);
  const isContinuingRef = useRef<boolean>(false);
  const currentSelectedFeatureRef = useRef<Feature<Geometry> | null>(null);

  useEffect(() => {
    if (!map || !vectorLayer) return;

    // Configure multi-select based on mode
    const selectConfig: any = {
      condition: click,
      layers: [vectorLayer],
      filter: isSelectableFeature,
      hitTolerance: STYLE_DEFAULTS.HIT_TOLERANCE,
      style: createSelectStyle,
    };

    if (multiSelectMode === 'always') {
      selectConfig.toggleCondition = shiftKeyOnly;
      selectConfig.multi = true;
    } else if (multiSelectMode === 'custom') {
      selectConfig.toggleCondition = always;
      selectConfig.multi = true;
    }

    const newSelectInteraction = new Select(selectConfig);

    const translate = new Translate({
      features: newSelectInteraction.getFeatures(),
    });

    const editableFeatures = new Collection<Feature<Geometry>>();
    const newModifyInteraction = new Modify({
      features: editableFeatures,
      deleteCondition: altKeyOnly,
    });

    newModifyInteraction.on('modifyend', (event) => {
      const features = event.features.getArray();
      const measureFeatures = features.filter((feature) => feature.get('isMeasure'));
      if (measureFeatures.length > 0) {
        recalculateMeasureDistances(measureFeatures);
      }
    });

    translate.setActive(false);
    map.addInteraction(newSelectInteraction);
    map.addInteraction(newModifyInteraction);
    map.addInteraction(translate);

    // Initialize DragPan reference
    map.getInteractions().forEach((interaction) => {
      if (interaction instanceof DragPan) {
        dragPanRef.current = interaction;
      }
    });

    // Helper function to end continuation mode
    const endContinuation = () => {
      if (continuationDrawRef.current) {
        map.removeInteraction(continuationDrawRef.current);
        continuationDrawRef.current = null;
      }
      isContinuingRef.current = false;
      newModifyInteraction.setActive(true);
    };

    // Helper function to start continuation from an endpoint
    const startContinuation = (feature: Feature<Geometry>, endpoint: 'start' | 'end') => {
      const vectorSource = vectorLayer.getSource();
      if (!vectorSource) return;

      isContinuingRef.current = true;
      newModifyInteraction.setActive(false);

      const featureType = getLineStringType(feature);

      continuationDrawRef.current = createContinuationDraw(vectorSource, {
        feature,
        endpoint,
        featureType: featureType || 'polyline',
        onComplete: (newCoords) => {
          extendLineStringCoordinates(feature, newCoords, endpoint);
          endContinuation();
        },
        onCancel: () => {
          endContinuation();
        },
      });

      map.addInteraction(continuationDrawRef.current);
    };

    // Click handler for endpoint detection
    const handleEndpointClick = (evt: any) => {
      if (isContinuingRef.current) return;

      const selectedFeature = currentSelectedFeatureRef.current;
      if (!selectedFeature || !isContinuableFeature(selectedFeature)) return;

      const coordinate = evt.coordinate;
      const clickedEndpoint = detectEndpointClick(selectedFeature, coordinate, 50);

      if (clickedEndpoint) {
        startContinuation(selectedFeature, clickedEndpoint);
      }
    };

    map.on('singleclick', handleEndpointClick);

    // Select event handler
    newSelectInteraction.on('select', () => {
      const allSelectedFeatures = newSelectInteraction.getFeatures().getArray();

      currentSelectedFeatureRef.current =
        allSelectedFeatures.length === 1 ? allSelectedFeatures[0] : null;

      if (allSelectedFeatures.length > 0) {
        translate.setActive(true);
        dragPanRef.current?.setActive(false);
      } else {
        translate.setActive(false);
        dragPanRef.current?.setActive(true);
      }

      onMultiSelectChange?.(allSelectedFeatures);
      onFeatureSelect(allSelectedFeatures[0] || null);

      editableFeatures.clear();
      allSelectedFeatures.forEach((feature) => {
        if (isEditableFeature(feature)) {
          editableFeatures.push(feature);
        }
      });
    });

    // Set state to trigger re-render with interaction values
    setSelectInteraction(newSelectInteraction);
    setModifyInteraction(newModifyInteraction);
    setTranslateInteraction(translate);

    onReady?.(newSelectInteraction);

    return () => {
      if (continuationDrawRef.current) {
        map.removeInteraction(continuationDrawRef.current);
        continuationDrawRef.current = null;
      }
      isContinuingRef.current = false;
      currentSelectedFeatureRef.current = null;

      map.un('singleclick', handleEndpointClick);

      map.removeInteraction(newSelectInteraction);
      map.removeInteraction(newModifyInteraction);
      map.removeInteraction(translate);

      setSelectInteraction(null);
      setModifyInteraction(null);
      setTranslateInteraction(null);
    };
  }, [map, vectorLayer, onFeatureSelect, onMultiSelectChange, multiSelectMode]);

  return {
    selectInteraction,
    modifyInteraction,
    translateInteraction,
  };
};
