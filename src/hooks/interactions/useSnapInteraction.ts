import { useEffect, useRef } from "react";
import { Snap } from "ol/interaction";
import type Map from "ol/Map";
import type VectorLayer from "ol/layer/Vector";
import { Vector as VectorSource } from "ol/source";
import { Feature } from "ol";
import type { Geometry } from "ol/geom";

export interface UseSnapInteractionProps {
  map: Map | null;
  vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  /** Whether snap should be active. Default: true */
  isActive?: boolean;
  /** Pixel tolerance for snapping. Default: 12 */
  pixelTolerance?: number;
  /** Whether to snap to vertices. Default: true */
  vertex?: boolean;
  /** Whether to snap to edges. Default: true */
  edge?: boolean;
}

/**
 * Hook to manage snap interaction for LineString features
 * Enables snapping to vertices and edges of existing LineString features
 * during drawing and editing operations
 */
export const useSnapInteraction = ({
  map,
  vectorLayer,
  isActive = true,
  pixelTolerance = 15,
  vertex = true,
  edge = true,
}: UseSnapInteractionProps) => {
  const snapInteractionRef = useRef<Snap | null>(null);

  useEffect(() => {
    if (!map || !vectorLayer) return;

    const vectorSource = vectorLayer.getSource();
    if (!vectorSource) return;

    // Remove existing snap interaction if any
    if (snapInteractionRef.current) {
      map.removeInteraction(snapInteractionRef.current);
      snapInteractionRef.current = null;
    }

    if (!isActive) return;

    // Create snap interaction that snaps to all features in the vector source
    // The snap interaction automatically handles LineString vertices and edges
    const snapInteraction = new Snap({
      source: vectorSource,
      pixelTolerance,
      vertex,
      edge,
    });

    map.addInteraction(snapInteraction);
    snapInteractionRef.current = snapInteraction;

    return () => {
      if (snapInteractionRef.current && map) {
        map.removeInteraction(snapInteractionRef.current);
        snapInteractionRef.current = null;
      }
    };
  }, [map, vectorLayer, isActive, pixelTolerance, vertex, edge]);

  return {
    snapInteraction: snapInteractionRef.current,
  };
};
