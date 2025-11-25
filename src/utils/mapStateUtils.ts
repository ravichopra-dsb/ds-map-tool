import type Map from "ol/Map";
import type { Extent } from "ol/extent";
import type { MapViewType } from "@/components/MapViewToggle";

export const fitMapToFeatures = (map: Map, extent: Extent): void => {
  map.getView().fit(extent, {
    duration: 1000,
    padding: [50, 50, 50, 50],
    maxZoom: 18,
  });
};

export const restoreMapView = (
  map: Map,
  mapState: { center: [number, number]; zoom: number; viewMode: MapViewType },
  onViewChange: (mode: MapViewType) => void
): void => {
  const view = map.getView();
  const { center, zoom, viewMode } = mapState;

  if (center && zoom !== undefined) {
    view.setCenter(center);
    view.setZoom(zoom);
  }

  if (viewMode) {
    onViewChange(viewMode);
  }
};