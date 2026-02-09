import { useEffect, useRef, useState } from 'react';
import { Modify, Select, Translate, DragPan, Snap } from 'ol/interaction';
import type { Draw } from 'ol/interaction';
import { Collection } from 'ol';
import { click, altKeyOnly, shiftKeyOnly, always } from 'ol/events/condition';
import type Map from 'ol/Map';
import type VectorLayer from 'ol/layer/Vector';
import type { Vector as VectorSource } from 'ol/source';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { LineString } from 'ol/geom';
import { isSelectableFeature, isEditableFeature } from '@/utils/featureTypeUtils';
import { recalculateMeasureDistances, createContinuationDraw } from '@/utils/interactionUtils';
import { createSelectStyle } from '@/utils/styleUtils';
import { useToolStore } from '@/stores/useToolStore';
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
  const continuationSnapRef = useRef<Snap | null>(null);

  // Sequential vertex deletion state
  const sequentialDeleteModeRef = useRef<boolean>(false);
  const lastDeletedVertexIndexRef = useRef<number>(-1);
  const sequentialDeleteFeatureRef = useRef<Feature<Geometry> | null>(null);
  const preModifyCoordsRef = useRef<number[][] | null>(null);

  const { resolutionScalingEnabled } = useToolStore();

  useEffect(() => {
    if (!map || !vectorLayer) return;

    // Configure multi-select based on mode
    const selectConfig: any = {
      condition: click,
      layers: [vectorLayer],
      filter: isSelectableFeature,
      hitTolerance: STYLE_DEFAULTS.HIT_TOLERANCE,
      style: (feature: Feature<Geometry>, resolution: number) => {
        return createSelectStyle(feature, resolution, resolutionScalingEnabled);
      },
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

    // Capture pre-modify coordinates to detect vertex deletion
    newModifyInteraction.on('modifystart', (event) => {
      const features = event.features.getArray();
      if (features.length === 1) {
        const geom = features[0].getGeometry();
        if (geom && geom.getType() === 'LineString') {
          preModifyCoordsRef.current = (geom as LineString).getCoordinates().map(c => [...c]);
        }
      }
    });

    newModifyInteraction.on('modifyend', (event) => {
      const features = event.features.getArray();
      const measureFeatures = features.filter((feature) => feature.get('isMeasure'));
      if (measureFeatures.length > 0) {
        recalculateMeasureDistances(measureFeatures);
      }

      // Detect vertex deletion and activate sequential delete mode
      const oldCoords = preModifyCoordsRef.current;
      if (features.length === 1 && oldCoords) {
        const feature = features[0];
        const geom = feature.getGeometry();
        if (geom && geom.getType() === 'LineString') {
          const newCoords = (geom as LineString).getCoordinates();
          if (newCoords.length < oldCoords.length) {
            // Find deleted index by comparing coordinate arrays
            let deletedIndex = oldCoords.length - 1; // default: last
            for (let i = 0; i < newCoords.length; i++) {
              if (Math.abs(oldCoords[i][0] - newCoords[i][0]) > 0.0001 ||
                Math.abs(oldCoords[i][1] - newCoords[i][1]) > 0.0001) {
                deletedIndex = i;
                break;
              }
            }
            sequentialDeleteModeRef.current = true;
            sequentialDeleteFeatureRef.current = feature;
            // Start from the vertex before the one OL already deleted (going backwards)
            lastDeletedVertexIndexRef.current = deletedIndex > 0 ? deletedIndex - 1 : 0;
          }
        }
      }
      preModifyCoordsRef.current = null;
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
      // Remove snap interaction first
      if (continuationSnapRef.current) {
        map.removeInteraction(continuationSnapRef.current);
        continuationSnapRef.current = null;
      }
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

      // Create and add snap interaction for continuation drawing
      // Must be added AFTER draw interaction for proper event ordering
      continuationSnapRef.current = new Snap({
        source: vectorSource,
        pixelTolerance: 15,
        vertex: true,
        edge: true,
      });
      map.addInteraction(continuationSnapRef.current);
    };

    // Programmatically delete the next vertex in sequential mode
    const performSequentialVertexDeletion = () => {
      const feature = sequentialDeleteFeatureRef.current;
      let deleteIndex = lastDeletedVertexIndexRef.current;
      console.log("deleteIndex", deleteIndex);

      if (!feature || deleteIndex < 0) {
        sequentialDeleteModeRef.current = false;
        return;
      }

      const geom = feature.getGeometry();
      if (!geom || geom.getType() !== 'LineString') {
        sequentialDeleteModeRef.current = false;
        return;
      }

      const lineString = geom as LineString;
      const coords = lineString.getCoordinates();

      // Must have at least 2 points
      if (coords.length <= 2) {
        sequentialDeleteModeRef.current = false;
        lastDeletedVertexIndexRef.current = -1;
        return;
      }

      // Clamp to max valid index
      deleteIndex = Math.min(deleteIndex, coords.length - 1);

      // Remove the vertex at deleteIndex
      const newCoords = [
        ...coords.slice(0, deleteIndex),
        ...coords.slice(deleteIndex + 1),
      ];
      lineString.setCoordinates(newCoords);

      // Decide next delete index
      if (deleteIndex > 0) {
        // Move backward
        lastDeletedVertexIndexRef.current = deleteIndex - 1;
      } else {
        // At zero index, keep deleting at 0
        lastDeletedVertexIndexRef.current = 0;
      }

      // Recalculate measures if needed
      if (feature.get('isMeasure')) {
        recalculateMeasureDistances([feature]);
      }

      // Trigger DB save
      window.dispatchEvent(new CustomEvent('continuationComplete'));

      // Stop mode if only two points remain
      if (lineString.getCoordinates().length <= 2) {
        sequentialDeleteModeRef.current = false;
        lastDeletedVertexIndexRef.current = -1;
      }
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

    // Right-click handler for sequential vertex deletion
    const handleContextMenu = (evt: MouseEvent) => {
      if (sequentialDeleteModeRef.current) {
        evt.preventDefault();
        performSequentialVertexDeletion();
      }
    };

    const mapTarget = map.getTargetElement();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    mapTarget?.addEventListener('contextmenu', handleContextMenu);
    map.on('singleclick', handleContinuationClick);

    // Helper function to update panning and translate based on selection state
    const updateSelectionState = () => {
      const allSelectedFeatures = newSelectInteraction.getFeatures().getArray();

      currentSelectedFeatureRef.current =
        allSelectedFeatures.length === 1 ? allSelectedFeatures[0] : null;

      if (allSelectedFeatures.length > 0) {
        // Check if any selected feature is a LineString — require F6 to move those
        const hasLineString = allSelectedFeatures.some((f) => {
          const geomType = f.getGeometry()?.getType();
          return geomType === 'LineString' || geomType === 'MultiLineString';
        });
        if (hasLineString) {
          const isModifyOn = useToolStore.getState().modifyEnabled;
          translate.setActive(isModifyOn);
          dragPanRef.current?.setActive(!isModifyOn);
        } else {
          translate.setActive(true);
          dragPanRef.current?.setActive(false);
        }
      } else {
        translate.setActive(false);
        dragPanRef.current?.setActive(true);
      }

      return allSelectedFeatures;
    };

    // Select event handler (fired when user clicks to select/deselect)
    newSelectInteraction.on('select', () => {
      // Clear "newly created" flag when selecting via click (existing feature)
      useToolStore.getState().setIsNewlyCreatedFeature(false);

      // Reset sequential delete mode on any selection change
      sequentialDeleteModeRef.current = false;
      lastDeletedVertexIndexRef.current = -1;
      sequentialDeleteFeatureRef.current = null;

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

    // Subscribe to modifyEnabled changes to toggle translate (move) on F6 for LineStrings
    let prevModifyEnabled = useToolStore.getState().modifyEnabled;
    const unsubModify = useToolStore.subscribe((state) => {
      if (state.modifyEnabled !== prevModifyEnabled) {
        prevModifyEnabled = state.modifyEnabled;
        const selected = newSelectInteraction.getFeatures().getArray();
        const hasLineString = selected.some((f) => {
          const geomType = f.getGeometry()?.getType();
          return geomType === 'LineString' || geomType === 'MultiLineString';
        });
        if (hasLineString) {
          translate.setActive(state.modifyEnabled);
          dragPanRef.current?.setActive(!state.modifyEnabled);
        }
      }
    });

    // Reset modifyEnabled when all features are deselected
    selectedFeatures.on('remove', () => {
      if (selectedFeatures.getLength() === 0) {
        useToolStore.getState().setModifyEnabled(false);
      }
    });

    // Set state to trigger re-render with interaction values
    setSelectInteraction(newSelectInteraction);
    setModifyInteraction(newModifyInteraction);
    setTranslateInteraction(translate);

    onReady?.(newSelectInteraction);

    return () => {
      if (continuationSnapRef.current) {
        map.removeInteraction(continuationSnapRef.current);
        continuationSnapRef.current = null;
      }
      if (continuationDrawRef.current) {
        map.removeInteraction(continuationDrawRef.current);
        continuationDrawRef.current = null;
      }
      isContinuingRef.current = false;
      currentSelectedFeatureRef.current = null;
      isEKeyPressedRef.current = false;
      sequentialDeleteModeRef.current = false;
      lastDeletedVertexIndexRef.current = -1;
      sequentialDeleteFeatureRef.current = null;
      preModifyCoordsRef.current = null;

      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      mapTarget?.removeEventListener('contextmenu', handleContextMenu);
      map.un('singleclick', handleContinuationClick);

      // Remove features collection listener
      selectedFeatures.un('remove', handleFeaturesChange);
      unsubModify();

      // Re-enable panning on cleanup to prevent it being left disabled
      dragPanRef.current?.setActive(true);

      map.removeInteraction(newSelectInteraction);
      map.removeInteraction(newModifyInteraction);
      map.removeInteraction(translate);

      setSelectInteraction(null);
      setModifyInteraction(null);
      setTranslateInteraction(null);
    };
  }, [map, vectorLayer, onFeatureSelect, onMultiSelectChange, multiSelectMode, resolutionScalingEnabled]);

  return {
    selectInteraction,
    modifyInteraction,
    translateInteraction,
  };
};
