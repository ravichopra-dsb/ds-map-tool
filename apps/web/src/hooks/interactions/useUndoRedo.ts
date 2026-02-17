import { useEffect, useRef } from 'react';
import type Map from 'ol/Map';
import type VectorLayer from 'ol/layer/Vector';
import type { Vector as VectorSource } from 'ol/source';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import UndoRedo from 'ol-ext/interaction/UndoRedo';

interface UseUndoRedoOptions {
  map: Map | null;
  vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  onReady?: (undoInteraction: UndoRedo | null) => void;
}

interface UseUndoRedoReturn {
  undoRedo: UndoRedo | null;
}

export const useUndoRedo = ({
  map,
  vectorLayer,
  onReady,
}: UseUndoRedoOptions): UseUndoRedoReturn => {
  const undoRedoRef = useRef<UndoRedo | null>(null);

  // Initialize UndoRedo interaction - only initialize once when map and vectorLayer are available
  useEffect(() => {
    // Don't re-initialize if we already have an undoRedo interaction
    if (undoRedoRef.current) return;
    if (!map || !vectorLayer) return;

    const undoRedoInteraction = new UndoRedo({
      map,
      features: vectorLayer.getSource()?.getFeaturesCollection(),
      autoTrack: true,
      maxHistorySize: 50,
    });

    map.addInteraction(undoRedoInteraction as any);
    undoRedoRef.current = undoRedoInteraction;

    onReady?.(undoRedoInteraction);
  }, [map, vectorLayer]);

  // Cleanup undo interaction when unmounting
  useEffect(() => {
    return () => {
      if (undoRedoRef.current && map) {
        map.removeInteraction(undoRedoRef.current as any);
        undoRedoRef.current = null;
      }
    };
  }, [map]);

  return { undoRedo: undoRedoRef.current };
};
