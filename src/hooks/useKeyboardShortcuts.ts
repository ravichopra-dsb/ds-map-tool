import { useEffect, useRef } from "react";
import type Map from "ol/Map";
import { Feature } from "ol";
import type { Geometry } from "ol/geom";
import { getCopyableFeatures, isDrawing } from "@/utils/interactionUtils";
import { Select } from "ol/interaction";

export interface KeyboardShortcutsProps {
  map: Map | null;
  vectorSource: any;
  selectInteraction: Select | null;
  clipboardFeatures: Feature<Geometry>[];
  onCopyOperation?: (features: Feature<Geometry>[], isCut: boolean) => void;
  onPasteOperation?: (features: Feature<Geometry>[], coordinates: number[]) => void;
  onSetActiveTool?: (tool: string) => void;
  onUndoOperation?: () => void;
  onRedoOperation?: () => void;
  onClearSelection?: () => void;
  onDeleteOperation?: () => void;
  disabled?: boolean;
}

export const useKeyboardShortcuts = ({
  map,
  vectorSource,
  selectInteraction,
  clipboardFeatures,
  onCopyOperation,
  onPasteOperation,
  onSetActiveTool,
  onUndoOperation,
  onRedoOperation,
  onClearSelection,
  onDeleteOperation,
  disabled = false,
}: KeyboardShortcutsProps) => {
  const currentCursorCoordinates = useRef<number[] | null>(null);

  // Use ref to always have the latest clipboard features (avoids stale closure)
  const clipboardFeaturesRef = useRef<Feature<Geometry>[]>(clipboardFeatures);
  clipboardFeaturesRef.current = clipboardFeatures;

  useEffect(() => {
    if (disabled || !map) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Handle Delete and Backspace keys (NOT with Ctrl modifier)
      if ((event.key === 'Delete' || event.key === 'Backspace') && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        handleDeleteOperation();
        return;
      }

      // Handle Ctrl/Cmd + key combinations
      if ((event.ctrlKey || event.metaKey) && !event.altKey) {
        switch (event.key.toLowerCase()) {
          case 'c':
            // Copy operation
            event.preventDefault();
            handleCopyOperation(false);
            break;

          case 'x':
            // Cut operation
            event.preventDefault();
            handleCopyOperation(true);
            break;

          case 'v':
            // Paste operation - paste at current cursor position
            event.preventDefault();
            handlePasteOperation();
            break;

          case 'z':
            // Undo operation
            if (!event.shiftKey) {
              // Don't trigger global undo if we're currently drawing
              // The draw-specific handler will handle Ctrl+Z during drawing
              if (!isDrawing()) {
                event.preventDefault();
                onUndoOperation?.();
              }
            }
            break;

          case 'y':
            // Redo operation
            event.preventDefault();
            onRedoOperation?.();
            break;
        }
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      // Continuously track cursor position for paste operations
      const coordinates = map.getCoordinateFromPixel([event.clientX, event.clientY]);
      currentCursorCoordinates.current = coordinates;
    };

    const handleCopyOperation = (isCut: boolean) => {
      if (!selectInteraction || !vectorSource) return;

      const selectedFeatures = selectInteraction.getFeatures();
      if (selectedFeatures.getLength() === 0) return;

      const featuresArray = getCopyableFeatures(selectedFeatures.getArray());

      // if (featuresArray.length === 0) return;

      // Call the copy operation handler
      if (onCopyOperation) {
        onCopyOperation(featuresArray, isCut);
      }

      // If this is a cut operation, remove the features from the source
      if (isCut) {
        // Clear selection FIRST before removing features to prevent stale references
        selectInteraction.getFeatures().clear();
        onClearSelection?.();

        // Then remove features from source
        featuresArray.forEach(feature => {
          vectorSource.removeFeature(feature);
        });
      }

      // Switch back to select tool after copy/cut operation
      if (onSetActiveTool) {
        onSetActiveTool('select');
      }
    };

    const handleDeleteOperation = () => {
      if (!selectInteraction || !vectorSource) return;

      const selectedFeatures = selectInteraction.getFeatures();
      if (selectedFeatures.getLength() === 0) return;

      // Get a copy of the array before clearing
      const featuresArray = selectedFeatures.getArray().slice();

      // Clear selection FIRST
      selectedFeatures.clear();
      onClearSelection?.();

      // Remove all selected features
      featuresArray.forEach(feature => {
        vectorSource.removeFeature(feature);
      });

      // Notify parent to update state
      onDeleteOperation?.();
    };

    const handlePasteOperation = () => {
      if (!onPasteOperation) {
        return;
      }

      // Use ref to get latest clipboard features (avoids stale closure)
      const currentClipboardFeatures = clipboardFeaturesRef.current;

      // Check if we have clipboard features
      if (currentClipboardFeatures.length === 0) {
        console.warn('No features in clipboard to paste');
        return;
      }

      // Get current cursor coordinates
      let coordinates = currentCursorCoordinates.current;

      // Fallback to map center if cursor not over map
      if (!coordinates && map) {
        const view = map.getView();
        const center = view.getCenter();
        if (center) {
          coordinates = center;
        }
      }

      if (!coordinates) {
        console.warn('No coordinates available for paste operation');
        return;
      }

      // Trigger paste operation with actual clipboard features at cursor position
      onPasteOperation(currentClipboardFeatures, coordinates);
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    map.getViewport().addEventListener('mousemove', handleMouseMove);

    return () => {
      // Remove event listeners
      document.removeEventListener('keydown', handleKeyDown);
      map.getViewport().removeEventListener('mousemove', handleMouseMove);
    };
  }, [
    map,
    vectorSource,
    selectInteraction,
    // clipboardFeatures removed - using ref instead to avoid stale closure
    onCopyOperation,
    onPasteOperation,
    onSetActiveTool,
    onUndoOperation,
    onRedoOperation,
    onClearSelection,
    onDeleteOperation,
    disabled
  ]);

  return {}; // No need to return anything for the simplified version
};