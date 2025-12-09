import React, { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import { Feature } from "ol";
import { Style, Text } from "ol/style";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { OSM, XYZ, Vector as VectorSource } from "ol/source";
import { fromLonLat } from "ol/proj";
import { defaults as defaultControls } from "ol/control";
import { getFeatureStyle } from "./FeatureStyler";
import { getTextStyle } from "../icons/Text";

export interface MapInstanceProps {
  onMapReady: (map: Map) => void;
  osmLayerRef: React.MutableRefObject<TileLayer<OSM> | null>;
  satelliteLayerRef: React.MutableRefObject<TileLayer<XYZ> | null>;
  vectorLayerRef: React.MutableRefObject<VectorLayer<VectorSource<Feature<any>>> | null>;
  vectorSourceRef: React.MutableRefObject<VectorSource<Feature<any>>>;
}

export const MapInstance: React.FC<MapInstanceProps> = ({
  onMapReady,
  osmLayerRef,
  satelliteLayerRef,
  vectorLayerRef,
  vectorSourceRef,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create OSM layer
    const osmLayer = new TileLayer({
      source: new OSM(),
      visible: true,
    });

    // Create Satellite layer using Esri World Imagery
    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attributions: "Tiles © Esri",
        maxZoom: 18,
        minZoom: 0,
      }),
      visible: false,
    });

    // Store references for layer switching
    osmLayerRef.current = osmLayer;
    satelliteLayerRef.current = satelliteLayer;

    const vectorLayer = new VectorLayer({
      source: vectorSourceRef.current,
      style: (feature, resolution) => {
        const type = feature.getGeometry()?.getType();

        // Only process text features with resolution-based visibility
        if (feature.get("isText") && type === "Point") {
          const textContent = feature.get("text") || "Text";

          // Hide text when zoomed out beyond zoom level ~8.5 (resolution 500)
          console.log("resolution : ", resolution)
          if (resolution > 50) {
            return new Style({
              text: new Text({ text: '' }) // OpenLayers pattern: empty text = hidden
            });
          }

          // Show text when zoomed in
          return getTextStyle(textContent);
        }

        // Handle all other feature types normally
        return getFeatureStyle(feature);
      },
    });

    // Store vector layer reference
    vectorLayerRef.current = vectorLayer;

    const map = new Map({
      target: mapContainerRef.current,
      layers: [osmLayer, satelliteLayer, vectorLayer],
      view: new View({
        center: fromLonLat([78.9629, 21.5937]),
        zoom: 5,
        maxZoom: 19,
        minZoom: 0,
        smoothExtentConstraint: true,
      }),
      controls: defaultControls({
        zoom: false,
        attribution: false,
        rotate: false,
      }),
    });

    onMapReady(map);

    return () => {
      map.setTarget(undefined);
    };
  }, []);

  return <div id="map" className="relative w-full h-screen" ref={mapContainerRef} />;
};

export default MapInstance;