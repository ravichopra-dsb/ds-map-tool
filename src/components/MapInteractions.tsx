import React, { useEffect, useRef } from "react";
import { Modify, Select, Translate, Snap, DragBox, DragPan } from "ol/interaction";
import { Collection } from "ol";
import { click, altKeyOnly, shiftKeyOnly, always, platformModifierKeyOnly } from "ol/events/condition";
import Transform from "ol-ext/interaction/Transform";
import UndoRedo from "ol-ext/interaction/UndoRedo";
import Split from "ol-ext/interaction/Split";
import type Map from "ol/Map";
import type VectorLayer from "ol/layer/Vector";
import { Vector as VectorSource } from "ol/source";
import { Feature } from "ol";
import type { Geometry } from "ol/geom";
import {
  isSelectableFeature,
  isEditableFeature,
} from "@/utils/featureTypeUtils";
import { recalculateMeasureDistances } from "@/utils/interactionUtils";
import {
  isSplittableFeature,
  copyFeatureProperties,
  isMergeableFeature,
  getLineEndpoints,
  findNearbyEndpoint,
  isOffsettableFeature,
} from "@/utils/splitUtils";

// Custom event interface for merge requests
export interface MergeRequestDetail {
  feature1: Feature<Geometry>;
  feature2: Feature<Geometry>;
  feature1Endpoint: "start" | "end";
  feature2Endpoint: "start" | "end";
  vectorSource: VectorSource<Feature<Geometry>>;
}

export interface MapInteractionsProps {
  map: Map | null;
  vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  activeTool: string;
  onFeatureSelect: (feature: Feature<Geometry> | null) => void;
  clipboardFeatures?: Feature<Geometry>[];
  onCopyFeatures?: (features: Feature<Geometry>[], isCut: boolean) => void;
  onPasteFeatures?: (
    features: Feature<Geometry>[],
    coordinates: number[]
  ) => void;
  pasteCoordinates?: number[] | null;
  onSelectInteractionReady?: (selectInteraction: Select | null) => void;
  onUndoInteractionReady?: (undoInteraction: UndoRedo | null) => void;
  // 🆕 Multi-select props
  onMultiSelectChange?: (features: Feature<Geometry>[]) => void;
  multiSelectMode?: "shift-click" | "always" | "custom"; // 'shift-click' = default
}

export const MapInteractions: React.FC<MapInteractionsProps> = ({
  map,
  vectorLayer,
  activeTool,
  onFeatureSelect,
  onSelectInteractionReady,
  onUndoInteractionReady,
  onMultiSelectChange,
  multiSelectMode = "shift-click", // 🆕 Default mode
}) => {
  const selectInteractionRef = useRef<Select | null>(null);
  const modifyInteractionRef = useRef<Modify | null>(null);
  const transformInteractionRef = useRef<Transform | null>(null);
  const transformSelectInteractionRef = useRef<Select | null>(null);
  const transformFeaturesRef = useRef<Collection<Feature<Geometry>> | null>(
    null
  );
  const undoRedoInteractionRef = useRef<UndoRedo | null>(null);
  const splitInteractionRef = useRef<Split | null>(null);
  const mergeModifyInteractionRef = useRef<Modify | null>(null);
  const mergeSelectInteractionRef = useRef<Select | null>(null);
  const mergeSnapInteractionRef = useRef<Snap | null>(null);
  const featureSelectionDragBoxRef = useRef<DragBox | null>(null);
  const dragPanRef = useRef<DragPan | null>(null);
  const translateRef = useRef<Translate | null>(null);

  // Initialize UndoRedo interaction - only initialize once when map and vectorLayer are available
  useEffect(() => {
    // Don't re-initialize if we already have an undoRedo interaction
    if (undoRedoInteractionRef.current) return;

    if (!map || !vectorLayer) return;

    // Initialize UndoRedo interaction to track all drawing operations
    const undoRedoInteraction = new UndoRedo({
      map,
      features: vectorLayer.getSource()?.getFeaturesCollection(),
      autoTrack: true, // Automatically track drawing interactions
      maxHistorySize: 50,
    });

    // console.log("undoRedoInteraction initialized: ", undoRedoInteraction)

    map.addInteraction(undoRedoInteraction as any);
    undoRedoInteractionRef.current = undoRedoInteraction;

    // Notify parent component that undo interaction is ready
    if (onUndoInteractionReady) {
      onUndoInteractionReady(undoRedoInteraction);
    }
  }, [map, vectorLayer]); // Remove onUndoInteractionReady from dependencies

  // Cleanup undo interaction when unmounting
  useEffect(() => {
    return () => {
      if (undoRedoInteractionRef.current && map) {
        map.removeInteraction(undoRedoInteractionRef.current as any);
        undoRedoInteractionRef.current = null;
      }
    };
  }, [map]);

  // 🆕 Initialize select and modify interactions with multi-select support
  useEffect(() => {
    if (!map || !vectorLayer) return;

    // 🆕 Configure multi-select based on mode
    let selectConfig: any = {
      condition: click,
      layers: [vectorLayer],
      filter: isSelectableFeature,
    };

    if (multiSelectMode === "always") {
      // Hold Shift to toggle selection
      selectConfig.toggleCondition = shiftKeyOnly;
      selectConfig.multi = true;
    } else if (multiSelectMode === "custom") {
      // Every click toggles add/remove (always multi-select)
      selectConfig.toggleCondition = always;
      selectConfig.multi = true;
    }
    // else: default single-select mode

    const selectInteraction = new Select(selectConfig);

    // Create translate interaction and store in ref
    const translate = new Translate({
      features: selectInteraction.getFeatures(),
    });
    translateRef.current = translate;

    const editableFeatures = new Collection<Feature<Geometry>>();
    const modifyInteraction = new Modify({
      features: editableFeatures,
      deleteCondition: altKeyOnly, // Enable Alt+Click vertex deletion
    });

    // Add modify event handling for distance recalculation
    modifyInteraction.on("modifyend", (event) => {
      const features = event.features.getArray();

      // Filter for measure features and recalculate distances
      const measureFeatures = features.filter((feature) =>
        feature.get("isMeasure")
      );
      if (measureFeatures.length > 0) {
        recalculateMeasureDistances(measureFeatures);
      }
    });

    translate.setActive(false);
    map.addInteraction(selectInteraction);
    map.addInteraction(modifyInteraction);
    map.addInteraction(translate);

    // 🆕 Updated select event handler for multi-select
    selectInteraction.on("select", (e) => {
      const allSelectedFeatures = selectInteraction.getFeatures().getArray();

      // Find DragPan interaction on first selection
      if (!dragPanRef.current && map) {
        map.getInteractions().forEach((interaction) => {
          if (interaction instanceof DragPan) {
            dragPanRef.current = interaction;
          }
        });
      }

      if (allSelectedFeatures.length > 0) {
        // Enable translate for ANY selected features (single or multi)
        translateRef.current?.setActive(true);
        // Disable DragPan to prevent panning while selecting/moving features
        if (dragPanRef.current) {
          dragPanRef.current.setActive(false);
        }
      } else {
        // No selection - disable translate, re-enable panning
        translateRef.current?.setActive(false);
        if (dragPanRef.current) {
          dragPanRef.current.setActive(true);
        }
      }

      // 🆕 Send all selected features to parent
      if (onMultiSelectChange) {
        onMultiSelectChange(allSelectedFeatures);
      }

      // Backward compatibility: send first feature as primary selection
      onFeatureSelect(allSelectedFeatures[0] || null);

      // Clear editable features collection
      editableFeatures.clear();

      // Add only editable features to the modify collection
      e.selected.forEach((feature) => {
        if (isEditableFeature(feature as Feature<Geometry>)) {
          editableFeatures.push(feature as Feature<Geometry>);
        }
      });
    });

    selectInteractionRef.current = selectInteraction;
    modifyInteractionRef.current = modifyInteraction;

    // Notify parent component that select interaction is ready
    if (onSelectInteractionReady) {
      onSelectInteractionReady(selectInteraction);
    }

    return () => {
      if (selectInteractionRef.current) {
        map.removeInteraction(selectInteractionRef.current);
      }
      if (modifyInteractionRef.current) {
        map.removeInteraction(modifyInteractionRef.current);
      }
      if (translateRef.current) {
        map.removeInteraction(translateRef.current);
        translateRef.current = null;
      }
    };
  }, [
    map,
    vectorLayer,
    onFeatureSelect,
    onSelectInteractionReady,
    onMultiSelectChange,
    multiSelectMode,
  ]); // 🆕 Added deps

  // 🆕 Initialize DragBox for Ctrl+Drag feature selection
  useEffect(() => {
    if (!map || !vectorLayer || !selectInteractionRef.current) return;

    const vectorSource = vectorLayer.getSource();
    if (!vectorSource) return;

    // Create DragBox with Ctrl/Cmd modifier condition
    const dragBox = new DragBox({
      condition: platformModifierKeyOnly,
    });

    dragBox.on("boxend", () => {
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
      selectInteractionRef.current?.getFeatures().clear();
      selectedFeatures.forEach((feature) => {
        selectInteractionRef.current?.getFeatures().push(feature);
      });

      // Handle selection state - same as shift-click selection
      if (selectedFeatures.length > 0) {
        // Enable translate for dragging selected features
        translateRef.current?.setActive(true);
        // Disable DragPan to prevent panning while moving features
        if (dragPanRef.current) {
          dragPanRef.current.setActive(false);
        }
      } else {
        // No selection - disable translate, re-enable panning
        translateRef.current?.setActive(false);
        if (dragPanRef.current) {
          dragPanRef.current.setActive(true);
        }
      }

      // Notify parent about multi-selection (same as shift-click)
      if (onMultiSelectChange) {
        onMultiSelectChange(selectedFeatures);
      }

      // Backward compatibility: send first feature as primary selection
      onFeatureSelect(selectedFeatures[0] || null);
    });

    map.addInteraction(dragBox);
    featureSelectionDragBoxRef.current = dragBox;

    return () => {
      if (featureSelectionDragBoxRef.current) {
        map.removeInteraction(featureSelectionDragBoxRef.current);
        featureSelectionDragBoxRef.current = null;
      }
    };
  }, [map, vectorLayer, onMultiSelectChange, onFeatureSelect]);

  // Handle transform tool activation/deactivation (unchanged)
  useEffect(() => {
    if (!map || !vectorLayer) return;

    if (activeTool === "transform") {
      // Deactivate modify interaction to prevent vertex editing during transform
      if (modifyInteractionRef.current) {
        modifyInteractionRef.current.setActive(false);
      }

      // Create dedicated feature collection for transform
      transformFeaturesRef.current = new Collection<Feature<Geometry>>();

      // Create transform selection interaction to add features to transform collection
      const transformSelectInteraction = new Select({
        condition: click,
        layers: [vectorLayer],
        style: null,
      });

      // When transform selection happens, add features to transform collection
      transformSelectInteraction.on("select", (e) => {
        // Clear previous selection
        transformFeaturesRef.current?.clear();

        // Add newly selected features to transform collection
        e.selected.forEach((feature) => {
          transformFeaturesRef.current?.push(feature);
        });
      });

      // Add selection interaction to map
      map.addInteraction(transformSelectInteraction);
      transformSelectInteractionRef.current = transformSelectInteraction;

      // Create transform interaction with proper configuration
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
          const isMeasure = feature.get("isMeasure");

          // Disable rotate / scale / stretch if it's a measure feature
          if (isMeasure) {
            newTransformInteraction.set("rotate", false);
            newTransformInteraction.set("scale", false);
            newTransformInteraction.set("stretch", false);
          } else {
            newTransformInteraction.set("rotate", true);
            newTransformInteraction.set("scale", true);
            newTransformInteraction.set("stretch", true);
          }

          // Only allow transformation of editable features
          return true;
        },
      });

      // Add and activate transform interaction
      map.addInteraction(newTransformInteraction as any);
      transformInteractionRef.current = newTransformInteraction;
      newTransformInteraction.setActive(true);
    } else {
      // Remove transform interaction when switching away from transform tool
      if (transformInteractionRef.current) {
        transformInteractionRef.current.setActive(false);
        if (
          map
            .getInteractions()
            .getArray()
            .includes(transformInteractionRef.current as any)
        ) {
          map.removeInteraction(transformInteractionRef.current as any);
        }
        transformInteractionRef.current = null;
      }

      // Remove transform selection interaction when switching away from transform tool
      if (transformSelectInteractionRef.current) {
        if (
          map
            .getInteractions()
            .getArray()
            .includes(transformSelectInteractionRef.current)
        ) {
          map.removeInteraction(transformSelectInteractionRef.current);
        }
        transformSelectInteractionRef.current = null;
      }

      // Clear transform features collection when switching away from transform tool
      if (transformFeaturesRef.current) {
        transformFeaturesRef.current.clear();
        transformFeaturesRef.current = null;
      }

      // Reactivate modify interaction when switching away from transform tool
      if (modifyInteractionRef.current) {
        modifyInteractionRef.current.setActive(true);
      }
    }

    return () => {
      // Cleanup transform interactions
      if (transformInteractionRef.current) {
        map.removeInteraction(transformInteractionRef.current as any);
      }
      if (transformSelectInteractionRef.current) {
        map.removeInteraction(transformSelectInteractionRef.current);
      }
    };
  }, [activeTool, map, vectorLayer]);

  // Handle split tool activation/deactivation
  useEffect(() => {
    if (!map || !vectorLayer) return;

    if (activeTool === "split") {
      // Disable select and modify during split
      selectInteractionRef.current?.setActive(false);
      modifyInteractionRef.current?.setActive(false);

      const vectorSource = vectorLayer.getSource();
      if (!vectorSource) return;

      const splitInteraction = new Split({
        sources: vectorSource,
        filter: isSplittableFeature,
        cursor: "crosshair",
        snapDistance: 25,
      });

      // Handle split events - copy properties to new features
      splitInteraction.on("aftersplit", (e) => {
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
      // Cleanup split interaction
      if (splitInteractionRef.current) {
        map.removeInteraction(splitInteractionRef.current as any);
        splitInteractionRef.current = null;
      }
    };
  }, [activeTool, map, vectorLayer]);

  // Handle merge tool activation/deactivation
  useEffect(() => {
    if (!map || !vectorLayer) return;

    const vectorSource = vectorLayer.getSource();
    if (!vectorSource) return;

    if (activeTool === "merge") {
      // Disable the default select and modify interactions
      selectInteractionRef.current?.setActive(false);
      modifyInteractionRef.current?.setActive(false);

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

      // Create a snap interaction for magnetic effect - snaps to all features in the source
      const mergeSnapInteraction = new Snap({
        source: vectorSource,
        pixelTolerance: 15, // Snap distance in pixels
        vertex: true, // Snap to vertices (including endpoints)
        edge: false, // Don't snap to edges, only to vertices/endpoints
      });

      // Tolerance in map units for detecting nearby endpoints
      const MERGE_TOLERANCE = 50; // Adjust based on your map's coordinate system

      // Handle modify end - check for merge opportunity
      mergeModifyInteraction.on("modifyend", (event) => {
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
            // Emit merge request event instead of auto-merging
            const mergeEvent = new CustomEvent<MergeRequestDetail>('mergeRequest', {
              detail: {
                feature1: modifiedFeature,
                feature2: startMatch.feature,
                feature1Endpoint: "start",
                feature2Endpoint: startMatch.endpoint,
                vectorSource,
              }
            });
            window.dispatchEvent(mergeEvent);
            return; // Exit after emitting merge request
          }

          // Check if end endpoint is near another feature's endpoint
          const endMatch = findNearbyEndpoint(
            endpoints.end,
            allFeatures,
            modifiedFeature,
            MERGE_TOLERANCE
          );

          if (endMatch) {
            // Emit merge request event instead of auto-merging
            const mergeEvent = new CustomEvent<MergeRequestDetail>('mergeRequest', {
              detail: {
                feature1: modifiedFeature,
                feature2: endMatch.feature,
                feature1Endpoint: "end",
                feature2Endpoint: endMatch.endpoint,
                vectorSource,
              }
            });
            window.dispatchEvent(mergeEvent);
            return; // Exit after emitting merge request
          }

          // Recalculate measure distance if it's a measure feature
          if (modifiedFeature.get("isMeasure")) {
            recalculateMeasureDistances([modifiedFeature]);
          }
        }
      });

      // Handle select event - add selected features to modify collection
      mergeSelectInteraction.on("select", (e) => {
        mergeEditableFeatures.clear();

        e.selected.forEach((feature) => {
          if (isMergeableFeature(feature as Feature<Geometry>)) {
            mergeEditableFeatures.push(feature as Feature<Geometry>);
          }
        });

        // Notify parent of selection
        onFeatureSelect(e.selected[0] as Feature<Geometry> || null);
      });

      map.addInteraction(mergeSelectInteraction);
      map.addInteraction(mergeModifyInteraction);
      map.addInteraction(mergeSnapInteraction); // Add snap last so it takes precedence

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
      // Cleanup merge interactions
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
  }, [activeTool, map, vectorLayer, onFeatureSelect]);

  // Handle offset tool activation/deactivation
  useEffect(() => {
    if (!map || !vectorLayer) return;

    if (activeTool === "offset") {
      // Disable select and modify during offset
      selectInteractionRef.current?.setActive(false);
      modifyInteractionRef.current?.setActive(false);

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
            }
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
      // Cleanup offset click handler
      if ((map as any)._offsetClickHandler) {
        map.un('click', (map as any)._offsetClickHandler);
        delete (map as any)._offsetClickHandler;
      }
    };
  }, [activeTool, map, vectorLayer]);

  // Handle select interaction activation/deactivation
  useEffect(() => {
    if (!map || !selectInteractionRef.current) return;

    const selectEnabledTools = ["select", "transform", "copy"];

    if (selectEnabledTools.includes(activeTool)) {
      // Enable selection for select, transform, and copy tools
      selectInteractionRef.current.setActive(true);
    } else {
      // Disable selection for all other tools (drawing, navigation, icon tools, etc.)
      selectInteractionRef.current.setActive(false);
    }
  }, [activeTool, map]);

  return null; // This component doesn't render anything
};

export default MapInteractions;
