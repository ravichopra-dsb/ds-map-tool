import React, { useEffect, useRef } from 'react';
import { DragPan, Select } from 'ol/interaction';
import type { Draw } from 'ol/interaction';
import type Map from 'ol/Map';
import type VectorLayer from 'ol/layer/Vector';
import { Vector as VectorSource } from 'ol/source';
import { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import type UndoRedo from 'ol-ext/interaction/UndoRedo';

import {
  useUndoRedo,
  useHoverInteraction,
  useSelectModify,
  useDragBoxSelection,
  useTransformTool,
  useSplitTool,
  useMergeTool,
  useOffsetTool,
  type MultiSelectMode,
} from '@/hooks/interactions';

// Re-export MergeRequestDetail for backwards compatibility
export type { MergeRequestDetail } from '@/hooks/interactions';

export interface MapInteractionsProps {
  map: Map | null;
  vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  activeTool: string;
  onFeatureSelect: (feature: Feature<Geometry> | null) => void;
  clipboardFeatures?: Feature<Geometry>[];
  onCopyFeatures?: (features: Feature<Geometry>[], isCut: boolean) => void;
  onPasteFeatures?: (features: Feature<Geometry>[], coordinates: number[]) => void;
  pasteCoordinates?: number[] | null;
  onSelectInteractionReady?: (selectInteraction: Select | null) => void;
  onUndoInteractionReady?: (undoInteraction: UndoRedo | null) => void;
  onMultiSelectChange?: (features: Feature<Geometry>[]) => void;
  multiSelectMode?: MultiSelectMode;
}

export const MapInteractions: React.FC<MapInteractionsProps> = ({
  map,
  vectorLayer,
  activeTool,
  onFeatureSelect,
  onSelectInteractionReady,
  onUndoInteractionReady,
  onMultiSelectChange,
  multiSelectMode = 'shift-click',
}) => {
  const continuationDrawRef = useRef<Draw | null>(null);
  const isContinuingRef = useRef<boolean>(false);

  // Initialize UndoRedo interaction
  useUndoRedo({
    map,
    vectorLayer,
    onReady: onUndoInteractionReady,
  });

  // Initialize hover interaction for feature highlighting
  useHoverInteraction({
    map,
    vectorLayer,
  });

  // Initialize select and modify interactions with multi-select support
  const { selectInteraction, modifyInteraction, translateInteraction } = useSelectModify({
    map,
    vectorLayer,
    multiSelectMode,
    onFeatureSelect,
    onMultiSelectChange,
    onReady: onSelectInteractionReady,
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
    isActive: activeTool === 'transform',
    modifyInteraction,
  });

  // Handle split tool activation/deactivation
  useSplitTool({
    map,
    vectorLayer,
    isActive: activeTool === 'split',
    selectInteraction,
    modifyInteraction,
  });

  // Handle merge tool activation/deactivation
  useMergeTool({
    map,
    vectorLayer,
    isActive: activeTool === 'merge',
    selectInteraction,
    modifyInteraction,
    onFeatureSelect,
  });

  // Handle offset tool activation/deactivation
  useOffsetTool({
    map,
    vectorLayer,
    isActive: activeTool === 'offset',
    selectInteraction,
    modifyInteraction,
  });

  // Handle select interaction activation/deactivation based on active tool
  useEffect(() => {
    if (!map || !selectInteraction) return;

    const selectEnabledTools = ['select', 'transform', 'copy'];

    // Always clean up continuation mode when tool changes
    if (continuationDrawRef.current) {
      continuationDrawRef.current.abortDrawing();
      map.removeInteraction(continuationDrawRef.current);
      continuationDrawRef.current = null;
    }
    isContinuingRef.current = false;

    // Get DragPan reference
    const dragPan = map.getInteractions().getArray().find(
      (interaction): interaction is DragPan => interaction instanceof DragPan
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
  }, [activeTool, map, selectInteraction, translateInteraction, onFeatureSelect, onMultiSelectChange]);

  return null;
};

export default MapInteractions;
