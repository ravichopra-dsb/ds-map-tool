import React, { useEffect, useRef } from "react";
import { useMatchProperties } from "@/hooks/useMatchProperties";
import { useOffsetTool } from "@/hooks/interactions/useOffsetTool";
import { DragPan, Select } from "ol/interaction";
import type { Draw } from "ol/interaction";
import type Map from "ol/Map";
import type VectorLayer from "ol/layer/Vector";
import { Vector as VectorSource } from "ol/source";
import { Feature } from "ol";
import type { Geometry } from "ol/geom";
import { getLength, getDistance } from "ol/sphere";
import { transform } from "ol/proj";
import type UndoRedo from "ol-ext/interaction/UndoRedo";
import Offset from "ol-ext/interaction/Offset";
import OlOverlay from "ol/Overlay";

import {
  useUndoRedo,
  useHoverInteraction,
  useSelectModify,
  useDragBoxSelection,
  useTransformTool,
  useSplitTool,
  useMergeTool,
  useArcModify,
  type MultiSelectMode,
} from "@/hooks/interactions";

import { isOffsettableFeature } from "@/utils/splitUtils";

// Re-export MergeRequestDetail for backwards compatibility
export type { MergeRequestDetail } from "@/hooks/interactions";

export interface MapInteractionsProps {
  map: Map | null;
  vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  activeTool: string;
  onFeatureSelect: (feature: Feature<Geometry> | null) => void;
  clipboardFeatures?: Feature<Geometry>[];
  onCopyFeatures?: (features: Feature<Geometry>[], isCut: boolean) => void;
  onPasteFeatures?: (
    features: Feature<Geometry>[],
    coordinates: number[],
  ) => void;
  pasteCoordinates?: number[] | null;
  onSelectInteractionReady?: (selectInteraction: Select | null) => void;
  onUndoInteractionReady?: (undoInteraction: UndoRedo | null) => void;
  onMultiSelectChange?: (features: Feature<Geometry>[]) => void;
  multiSelectMode?: MultiSelectMode;
  onSaveMapState?: () => void;  // Callback to save state after style changes
}

export const MapInteractions: React.FC<MapInteractionsProps> = ({
  map,
  vectorLayer,
  activeTool,
  onFeatureSelect,
  onSelectInteractionReady,
  onUndoInteractionReady,
  onMultiSelectChange,
  multiSelectMode = "shift-click",
  onSaveMapState,
}) => {
  const continuationDrawRef = useRef<Draw | null>(null);
  const isContinuingRef = useRef<boolean>(false);
  const offsetInteractionRef = useRef<Offset | null>(null);
  const offsetTooltipRef = useRef<OlOverlay | null>(null);
  const offsetTooltipElementRef = useRef<HTMLDivElement | null>(null);
  const offsetOriginalGeometryRef = useRef<Geometry | null>(null);

  // Initialize UndoRedo interaction
  useUndoRedo({
    map,
    vectorLayer,
    onReady: onUndoInteractionReady,
  });

  // Initialize select and modify interactions with multi-select support
  const { selectInteraction, modifyInteraction, translateInteraction } =
    useSelectModify({
      map,
      vectorLayer,
      multiSelectMode,
      onFeatureSelect,
      onMultiSelectChange,
      onReady: onSelectInteractionReady,
    });

  // Initialize arc-specific editing with 3 control points
  // Must be after useSelectModify to access selectInteraction and modifyInteraction
  useArcModify({
    map,
    vectorLayer,
    selectInteraction,
    modifyInteraction,
  });

  // Initialize hover interaction for feature highlighting
  // Must be after useSelectModify to access selectInteraction for disabling hover on selected features
  useHoverInteraction({
    map,
    vectorLayer,
    selectInteraction,
  });

  // Initialize DragBox for Ctrl+Drag feature selection
  useDragBoxSelection({
    map,
    vectorLayer,
    selectInteraction,
    translateInteraction,
    onFeatureSelect,
    onMultiSelectChange,
  });

  // Handle transform tool activation/deactivation
  useTransformTool({
    map,
    vectorLayer,
    isActive: activeTool === "transform",
    modifyInteraction,
  });

  // Handle split tool activation/deactivation
  useSplitTool({
    map,
    vectorLayer,
    isActive: activeTool === "split",
    selectInteraction,
    modifyInteraction,
  });

  // Handle merge tool activation/deactivation
  useMergeTool({
    map,
    vectorLayer,
    isActive: activeTool === "merge",
    selectInteraction,
    modifyInteraction,
    onFeatureSelect,
  });

  // Handle match properties tool activation/deactivation
  useMatchProperties({
    map,
    vectorLayer,
    activeTool,
    onSave: onSaveMapState,
  });

  // Handle offset tool - click to select feature and emit event for dialog
  useOffsetTool({
    map,
    vectorLayer,
    isActive: activeTool === "offset",
    selectInteraction,
    modifyInteraction,
  });

  // Handle offset tool - drag-based offset with Ctrl key for quick interactive offset
  useEffect(() => {
    if (!map || !vectorLayer) return;

    // Helper function to format offset distance
    const formatOffsetDistance = (distance: number): string => {
      const absDistance = Math.abs(distance);
      if (absDistance < 1000) {
        return `${Math.round(absDistance)}m`;
      }
      return `${(absDistance / 1000).toFixed(3)}km`;
    };

    if (activeTool === "offset") {
      // Disable select and modify during offset
      selectInteraction?.setActive(false);
      modifyInteraction?.setActive(false);

      const vectorSource = vectorLayer.getSource();
      if (!vectorSource) return;

      // Create tooltip element
      const tooltipElement = document.createElement("div");
      tooltipElement.className = "offset-tooltip";
      tooltipElement.style.cssText = `
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        font-weight: bold;
        pointer-events: none;
        white-space: nowrap;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      `;
      offsetTooltipElementRef.current = tooltipElement;

      // Create tooltip overlay
      const tooltip = new OlOverlay({
        element: tooltipElement,
        positioning: "bottom-center",
        offset: [0, -10],
        stopEvent: false,
      });
      map.addOverlay(tooltip);
      offsetTooltipRef.current = tooltip;

      // Create offset interaction for drag-based offset
      const offsetInteraction = new Offset({
        source: vectorSource,
        filter: isOffsettableFeature,
      });

      // Store original geometry on offset start
      offsetInteraction.on("offsetstart" as any, (e: any) => {
        if (e.feature) {
          const geom = e.feature.getGeometry();
          offsetOriginalGeometryRef.current = geom ? geom.clone() : null;
        }
      });

      // Update tooltip during offset drag
      offsetInteraction.on("offsetting", (e: any) => {
        if (
          offsetOriginalGeometryRef.current &&
          e.coordinate &&
          offsetTooltipElementRef.current &&
          offsetTooltipRef.current
        ) {
          // Get closest point on original geometry
          const closestPoint =
            offsetOriginalGeometryRef.current.getClosestPoint(e.coordinate);

          // Transform coordinates to WGS84 for geodesic distance calculation
          const coord1 = transform(closestPoint, "EPSG:3857", "EPSG:4326");
          const coord2 = transform(e.coordinate, "EPSG:3857", "EPSG:4326");

          // Calculate geodesic distance
          const geodesicDistance = getDistance(coord1, coord2);

          // Update tooltip
          offsetTooltipElementRef.current.textContent =
            formatOffsetDistance(geodesicDistance);
          offsetTooltipRef.current.setPosition(e.coordinate);
        }
      });

      // Handle offset end - copy properties and hide tooltip
      offsetInteraction.on("offsetend", (e: any) => {
        // Hide tooltip
        if (offsetTooltipRef.current) {
          offsetTooltipRef.current.setPosition(undefined);
        }
        offsetOriginalGeometryRef.current = null;

        const originalFeature = e.feature;
        if (!originalFeature) return;

        // Copy properties from original to the newly created offset feature
        // The offset interaction creates a new feature automatically
        // We need to find it in the source (it's the last added feature)
        const features = vectorSource.getFeatures();
        const newFeature = features[features.length - 1];

        if (newFeature && newFeature !== originalFeature) {
          // Copy all properties except geometry
          const properties = originalFeature.getProperties();
          const { geometry, ...otherProps } = properties;

          Object.entries(otherProps).forEach(([key, value]) => {
            newFeature.set(key, value);
          });

          // Append "(offset)" to name if exists
          const originalName = originalFeature.get("name");
          if (originalName) {
            newFeature.set("name", `${originalName} (offset)`);
          }

          // Recalculate distance for measure features
          if (originalFeature.get("isMeasure")) {
            newFeature.set("isMeasure", true);
            const newGeometry = newFeature.getGeometry();
            if (newGeometry) {
              const length = getLength(newGeometry);
              newFeature.set("distance", length);
            }
          }
        }
      });

      map.addInteraction(offsetInteraction as any);
      offsetInteractionRef.current = offsetInteraction;
    } else {
      // Remove offset interaction when switching away
      if (offsetInteractionRef.current) {
        map.removeInteraction(offsetInteractionRef.current as any);
        offsetInteractionRef.current = null;
      }
      // Remove tooltip overlay
      if (offsetTooltipRef.current) {
        map.removeOverlay(offsetTooltipRef.current);
        offsetTooltipRef.current = null;
      }
      offsetTooltipElementRef.current = null;
      offsetOriginalGeometryRef.current = null;
    }

    return () => {
      // Cleanup offset interaction
      if (offsetInteractionRef.current) {
        map.removeInteraction(offsetInteractionRef.current as any);
        offsetInteractionRef.current = null;
      }
      // Cleanup tooltip overlay
      if (offsetTooltipRef.current && map) {
        map.removeOverlay(offsetTooltipRef.current);
        offsetTooltipRef.current = null;
      }
      offsetTooltipElementRef.current = null;
      offsetOriginalGeometryRef.current = null;
    };
  }, [activeTool, map, vectorLayer, selectInteraction, modifyInteraction]);

  // Listen for featureDrawn events to sync Select interaction during continuous drawing
  // This ensures only the latest drawn feature shows the blue selection highlight
  useEffect(() => {
    if (!selectInteraction) return;

    const handleFeatureDrawn = (event: Event) => {
      const customEvent = event as CustomEvent;
      const feature = customEvent.detail?.feature;
      if (feature) {
        // Clear previous selection and add new feature for blue highlight
        selectInteraction.getFeatures().clear();
        selectInteraction.getFeatures().push(feature);
      }
    };

    window.addEventListener('featureDrawn', handleFeatureDrawn);
    return () => {
      window.removeEventListener('featureDrawn', handleFeatureDrawn);
    };
  }, [selectInteraction]);

  // Handle select interaction activation/deactivation based on active tool
  useEffect(() => {
    if (!map || !selectInteraction) return;

    const selectEnabledTools = ["select", "transform", "copy"];

    // Always clean up continuation mode when tool changes
    if (continuationDrawRef.current) {
      continuationDrawRef.current.abortDrawing();
      map.removeInteraction(continuationDrawRef.current);
      continuationDrawRef.current = null;
    }
    isContinuingRef.current = false;

    // Get DragPan reference
    const dragPan = map
      .getInteractions()
      .getArray()
      .find(
        (interaction): interaction is DragPan => interaction instanceof DragPan,
      );

    if (selectEnabledTools.includes(activeTool)) {
      selectInteraction.setActive(true);
    } else {
      selectInteraction.setActive(false);
      selectInteraction.getFeatures().clear();

      translateInteraction?.setActive(false);
      dragPan?.setActive(true);

      onFeatureSelect(null);
      onMultiSelectChange?.([]);
    }
  }, [
    activeTool,
    map,
    selectInteraction,
    translateInteraction,
    onFeatureSelect,
    onMultiSelectChange,
  ]);

  return null;
};

export default MapInteractions;
