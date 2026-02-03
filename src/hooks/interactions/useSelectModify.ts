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
  const isEKeyPressedRef = useRef<boolean>(false);

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
      pixelTolerance: STYLE_DEFAULTS.MODIFY_PIXEL_TOLERANCE,
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

    // Helper function to end continuation mode and trigger save
    const endContinuation = (shouldSave: boolean = false) => {
      if (continuationDrawRef.current) {
        map.removeInteraction(continuationDrawRef.current);
        continuationDrawRef.current = null;
      }
      isContinuingRef.current = false;
      newModifyInteraction.setActive(true);

      // Dispatch event to trigger database save after successful continuation
      if (shouldSave) {
        window.dispatchEvent(new CustomEvent('continuationComplete'));
      }
    };

    // Helper function to start continuation from a specific endpoint
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
          endContinuation(true); // Save after successful continuation
        },
        onCancel: () => {
          endContinuation(false); // Don't save on cancel
        },
      });

      map.addInteraction(continuationDrawRef.current);
    };

    // Track 'e' key state for continuation shortcut
    const handleKeyDown = (evt: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = evt.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (evt.key === 'e' || evt.key === 'E') {
        isEKeyPressedRef.current = true;
      }

      // Handle Escape to finish continuation (keep drawn coordinates, like normal mode)
      if (evt.key === 'Escape' && isContinuingRef.current) {
        evt.preventDefault();
        evt.stopImmediatePropagation();
        if (continuationDrawRef.current) {
          continuationDrawRef.current.finishDrawing();
        }
      }
    };

    const handleKeyUp = (evt: KeyboardEvent) => {
      if (evt.key === 'e' || evt.key === 'E') {
        isEKeyPressedRef.current = false;
      }
    };

    // Click handler for e + click continuation
    const handleContinuationClick = (evt: any) => {
      // Only trigger if 'e' key is held and we're not already continuing
      if (!isEKeyPressedRef.current || isContinuingRef.current) return;

      const selectedFeature = currentSelectedFeatureRef.current;
      if (!selectedFeature || !isContinuableFeature(selectedFeature)) return;

      // Detect which endpoint was clicked (tolerance in pixels)
      const coordinate = evt.coordinate;
      const clickedEndpoint = detectEndpointClick(selectedFeature, coordinate, 15);

      // Only start continuation if click is within tolerance of an endpoint
      if (!clickedEndpoint) return;

      startContinuation(selectedFeature, clickedEndpoint);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    map.on('singleclick', handleContinuationClick);

    // Helper function to update panning and translate based on selection state
    const updateSelectionState = () => {
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

      return allSelectedFeatures;
    };

    // Select event handler (fired when user clicks to select/deselect)
    newSelectInteraction.on('select', () => {
      const allSelectedFeatures = updateSelectionState();

      onMultiSelectChange?.(allSelectedFeatures);
      onFeatureSelect(allSelectedFeatures[0] || null);

      editableFeatures.clear();
      allSelectedFeatures.forEach((feature) => {
        if (isEditableFeature(feature)) {
          editableFeatures.push(feature);
        }
      });
    });

    // Listen to features collection changes to handle programmatic clears
    // (e.g., Delete key, Cut operation, tool switches)
    // This ensures panning is re-enabled even when clear() is called directly
    const selectedFeatures = newSelectInteraction.getFeatures();

    const handleFeaturesChange = () => {
      updateSelectionState();
    };

    selectedFeatures.on('remove', handleFeaturesChange);

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
      isEKeyPressedRef.current = false;

      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      map.un('singleclick', handleContinuationClick);

      // Remove features collection listener
      selectedFeatures.un('remove', handleFeaturesChange);

      // Re-enable panning on cleanup to prevent it being left disabled
      dragPanRef.current?.setActive(true);

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
