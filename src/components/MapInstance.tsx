import React, { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import { Feature } from "ol";
import { Style, Text, Fill, Stroke } from "ol/style";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { OSM, XYZ, Vector as VectorSource } from "ol/source";
import { fromLonLat } from "ol/proj";
import { defaults as defaultControls } from "ol/control";
import { getFeatureStyle } from "./FeatureStyler";
import { useHiddenFeatures } from "@/hooks/useToggleObjects";
import { isFeatureHidden, isTextFeatureHidden } from "@/utils/features/visibilityUtils";
import { STYLE_DEFAULTS } from "@/constants/styleDefaults";
import type { Geometry } from "ol/geom";

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
  const { hiddenTypes } = useHiddenFeatures();

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create OSM layer
    const osmLayer = new TileLayer({
      source: new OSM({
        crossOrigin: 'anonymous',
      }),
      visible: true,
    });

    // Create Satellite layer using Esri World Imagery
    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attributions: "Tiles © Esri",
        maxZoom: 18,
        minZoom: 0,
        crossOrigin: 'anonymous',
      }),
      visible: false,
    });

    // Store references for layer switching
    osmLayerRef.current = osmLayer;
    satelliteLayerRef.current = satelliteLayer;

    const vectorLayer = new VectorLayer({
      source: vectorSourceRef.current,
    });

    // Store vector layer reference
    vectorLayerRef.current = vectorLayer;

    const map = new Map({
      target: mapContainerRef.current,
      layers: [osmLayer, satelliteLayer, vectorLayer],
      view: new View({
        center: fromLonLat([78.9629, 21.5937]),
        zoom: 5,
        maxZoom: 30,
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

  useEffect(() => {
    if (vectorLayerRef.current) {
      vectorLayerRef.current.setStyle((feature) => {
        const type = feature.getGeometry()?.getType();
        const typedFeature = feature as Feature<Geometry>;

        // Only process text features with resolution-based visibility
        if (feature.get("isText") && type === "Point") {
          const textContent = feature.get("text") || "Text";
          const textScale = feature.get("textScale") || 1;
          const textRotation = feature.get("textRotation") || 0;
          const textOpacity = feature.get("textOpacity") ?? 1;

          // Hide text when toggled off
          if (isTextFeatureHidden(typedFeature, hiddenTypes)) {
            return new Style({
              text: new Text({ text: '' }) // OpenLayers pattern: empty text = hidden
            });
          }

          // Apply opacity to colors
          const fillColor = `rgba(0, 0, 0, ${textOpacity})`;
          const strokeColor = `rgba(255, 255, 255, ${textOpacity})`;

          // Create style with individual scale, rotation, and opacity
          return new Style({
            text: new Text({
              text: textContent,
              font: `${STYLE_DEFAULTS.TEXT_FONT_SIZE * textScale}px Arial, sans-serif`,
              scale: textScale,
              rotation: textRotation * Math.PI / 180,
              fill: new Fill({ color: fillColor }),
              stroke: new Stroke({
                color: strokeColor,
                width: STYLE_DEFAULTS.TEXT_STROKE_WIDTH
              }),
              padding: [4, 6, 4, 6],
              textAlign: 'center',
              textBaseline: 'middle',
            }),
            zIndex: STYLE_DEFAULTS.Z_INDEX_TEXT,
          });
        }

        // Check if feature should be hidden using consolidated visibility utility
        if (isFeatureHidden(typedFeature, hiddenTypes)) {
          return new Style({ stroke: undefined });
        }

        // Handle all other feature types normally
        return getFeatureStyle(feature);
      });
    }
  }, [hiddenTypes]);

  return <div id="map" className="relative w-full h-screen" ref={mapContainerRef} />;
};

export default MapInstance;