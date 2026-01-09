import { create } from 'zustand';
import type Map from 'ol/Map';
import type VectorLayer from 'ol/layer/Vector';
import type TileLayer from 'ol/layer/Tile';
import type { OSM, XYZ, Vector as VectorSource } from 'ol/source';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';

export type MapViewType = 'osm' | 'satellite';

interface MapState {
  // State
  map: Map | null;
  vectorSource: VectorSource<Feature<Geometry>> | null;
  vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  osmLayer: TileLayer<OSM> | null;
  satelliteLayer: TileLayer<XYZ> | null;
  currentMapView: MapViewType;
  isTransitioning: boolean;

  // Actions
  setMap: (map: Map | null) => void;
  setVectorSource: (source: VectorSource<Feature<Geometry>>) => void;
  setVectorLayer: (layer: VectorLayer<VectorSource<Feature<Geometry>>>) => void;
  setLayers: (osm: TileLayer<OSM>, satellite: TileLayer<XYZ>) => void;
  switchMapView: (view: MapViewType) => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  map: null,
  vectorSource: null,
  vectorLayer: null,
  osmLayer: null,
  satelliteLayer: null,
  currentMapView: 'osm',
  isTransitioning: false,

  setMap: (map) => set({ map }),
  setVectorSource: (vectorSource) => set({ vectorSource }),
  setVectorLayer: (vectorLayer) => set({ vectorLayer }),
  setLayers: (osmLayer, satelliteLayer) => set({ osmLayer, satelliteLayer }),

  switchMapView: (newView) => {
    const { osmLayer, satelliteLayer, currentMapView } = get();
    if (!osmLayer || !satelliteLayer || newView === currentMapView) return;

    set({ isTransitioning: true, currentMapView: newView });

    if (newView === 'osm') {
      // Fade out satellite, fade in OSM
      satelliteLayer.setOpacity(1);
      osmLayer.setOpacity(0);
      osmLayer.setVisible(true);

      setTimeout(() => {
        satelliteLayer.setOpacity(0);
        osmLayer.setOpacity(1);
      }, 50);

      setTimeout(() => {
        satelliteLayer.setVisible(false);
        set({ isTransitioning: false });
      }, 250);
    } else {
      // Fade out OSM, fade in satellite
      osmLayer.setOpacity(1);
      satelliteLayer.setOpacity(0);
      satelliteLayer.setVisible(true);

      setTimeout(() => {
        osmLayer.setOpacity(0);
        satelliteLayer.setOpacity(1);
      }, 50);

      setTimeout(() => {
        osmLayer.setVisible(false);
        set({ isTransitioning: false });
      }, 250);
    }
  },
}));
