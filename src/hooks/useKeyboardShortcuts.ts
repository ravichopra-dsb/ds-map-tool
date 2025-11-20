import { useEffect, useRef } from "react";
import type Map from "ol/Map";
import { Feature } from "ol";
import type { Geometry } from "ol/geom";
import { getCopyableFeatures } from "@/utils/interactionUtils";
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
  disabled = false,
}: KeyboardShortcutsProps) => {
  const currentCursorCoordinates = useRef<number[] | null>(null);

  useEffect(() => {
    if (disabled || !map) return;

    const handleKeyDown = (event: KeyboardEvent) => {
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
              event.preventDefault();
              onUndoOperation?.();
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
        featuresArray.forEach(feature => {
          vectorSource.removeFeature(feature);
        });
      }

      // Switch back to select tool after copy/cut operation
      if (onSetActiveTool) {
        onSetActiveTool('select');
      }
    };

    const handlePasteOperation = () => {
      if (!onPasteOperation) {
        return;
      }

      // Check if we have clipboard features
      if (clipboardFeatures.length === 0) {
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
      onPasteOperation(clipboardFeatures, coordinates);
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
    clipboardFeatures,
    onCopyOperation,
    onPasteOperation,
    onSetActiveTool,
    onUndoOperation,
    onRedoOperation,
    disabled
  ]);

  return {}; // No need to return anything for the simplified version
};