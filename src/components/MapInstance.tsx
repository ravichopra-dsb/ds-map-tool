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
    });

    // Store vector layer reference
    vectorLayerRef.current = vectorLayer;

    const map = new Map({
      target: mapContainerRef.current,
      layers: [osmLayer, satelliteLayer, vectorLayer],
      view: new View({
        center: fromLonLat([78.9629, 21.5937]),
        zoom: 5,
        maxZoom: 22,
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
      vectorLayerRef.current.setStyle((feature, resolution) => {
        const type = feature.getGeometry()?.getType();

        // Only process text features with resolution-based visibility
        if (feature.get("isText") && type === "Point") {
          const textContent = feature.get("text") || "Text";
          const textScale = feature.get("textScale") || 1;
          const textRotation = feature.get("textRotation") || 0;

          // Hide text when zoomed out beyond zoom level ~8.5 (resolution 500)
          if (hiddenTypes["text"]) {
            return new Style({
              text: new Text({ text: '' }) // OpenLayers pattern: empty text = hidden
            });
          }

          // Create style with individual scale and rotation
          return new Style({
            text: new Text({
              text: textContent,
              font: `${14 * textScale}px Arial, sans-serif`,
              scale: textScale,
              rotation: textRotation * Math.PI / 180,
              fill: new Fill({ color: '#000000' }),
              stroke: new Stroke({
                color: '#ffffff',
                width: 3
              }),
              padding: [4, 6, 4, 6],
              textAlign: 'center',
              textBaseline: 'middle',
            }),
            zIndex: 100,
          });
        }
        
        if (hiddenTypes["pit"] && feature.get("isPit") && type === "MultiLineString") return new Style({stroke: null,})
        if (hiddenTypes["tower"] && feature.get("isTower") && type === "GeometryCollection") return new Style({stroke: null,})
        if (hiddenTypes["junction"] && feature.get("isJunction") && type === "GeometryCollection") return new Style({stroke: null,})
        if (hiddenTypes["gp"] && feature.get("isGP") && type === "GeometryCollection") return new Style({stroke: null,})
        if (hiddenTypes["triangle"] && feature.get("isTriangle") && type === "Polygon") return new Style({stroke: null,})
        if (hiddenTypes["measure"] && feature.get("isMeasure") && (type === "LineString" || type === "MultiLineString")) return new Style({stroke: null,})
        if (hiddenTypes["arrow"] && feature.get("isArrow") && (type === "LineString" || type === "MultiLineString")) return new Style({stroke: null,})
        if (hiddenTypes["freehand"] && feature.get("isFreehand") && (type === "LineString" || type === "MultiLineString")) return new Style({stroke: null,})
        if (hiddenTypes["polyline"] && feature.get("isPolyline") && (type === "LineString" || type === "MultiLineString")) return new Style({stroke: null,})
        if (hiddenTypes["legends"] && feature.get("islegends") && (type === "LineString" || type === "MultiLineString")) return new Style({stroke: null,})
        if (hiddenTypes["point"] && feature.get("isPoint")  && type === "Point") return new Style({stroke: null,})

        // Handle all other feature types normally
        return getFeatureStyle(feature);
      });
    }
  }, [hiddenTypes]);

  return <div id="map" className="relative w-full h-screen" ref={mapContainerRef} />;
};

export default MapInstance;