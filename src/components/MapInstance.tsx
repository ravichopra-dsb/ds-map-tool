import React, { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import { Feature } from "ol";
import { Style, Text, Fill, Stroke, Icon } from "ol/style";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { OSM, XYZ, Vector as VectorSource } from "ol/source";
import { fromLonLat } from "ol/proj";
import { defaults as defaultControls } from "ol/control";
import { getFeatureStyle } from "./FeatureStyler";
import { useHiddenFeatures } from "@/hooks/useToggleObjects";
import { useHiddenFeaturesStore } from "@/stores/useHiddenFeaturesStore";
import {
  isFeatureHidden,
  isTextFeatureHidden,
} from "@/utils/features/visibilityUtils";
import { STYLE_DEFAULTS } from "@/constants/styleDefaults";
import type { Geometry } from "ol/geom";

export interface MapInstanceProps {
  onMapReady: (map: Map) => void;
  osmLayerRef: React.MutableRefObject<TileLayer<OSM> | null>;
  satelliteLayerRef: React.MutableRefObject<TileLayer<XYZ> | null>;
  vectorLayerRef: React.MutableRefObject<VectorLayer<
    VectorSource<Feature<any>>
  > | null>;
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
  const { hiddenFeatureIds } = useHiddenFeaturesStore();

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create OSM layer
    const osmLayer = new TileLayer({
      source: new OSM({
        crossOrigin: "anonymous",
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
        crossOrigin: "anonymous",
      }),
      visible: false,
    });

    // Store references for layer switching
    osmLayerRef.current = osmLayer;
    satelliteLayerRef.current = satelliteLayer;

    const vectorLayer = new VectorLayer({
      source: vectorSourceRef.current,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
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
      vectorLayerRef.current.setStyle((feature, resolution): Style | Style[] | void => {
        const type = feature.getGeometry()?.getType();
        const typedFeature = feature as Feature<Geometry>;

        // Check if feature is individually hidden (from SeparateFeatures panel)
        const featureId = String((feature as any).ol_uid);
        if (hiddenFeatureIds.has(featureId)) {
          return new Style({ stroke: undefined });
        }

        // Apply world-scaling for icon features based on resolution
        if (feature.get("isIcon") && resolution) {
          const desiredPxSize = 16;
          const referenceResolution = 1.0;
          const iconWidth = feature.get("iconWidth") || 32;
          const iconPath = feature.get("iconPath");

          // Get icon properties
          const iconOpacity = feature.get("opacity") ?? 1;
          const iconScale = feature.get("iconScale") ?? 1;
          const labelScale = feature.get("labelScale") ?? 1;
          const iconRotation = feature.get("iconRotation") ?? 0;

          if (iconPath) {
            // Calculate base scale factor from resolution
            const baseScaleFactor = (desiredPxSize / iconWidth) * (referenceResolution / resolution);
            // Apply user-defined icon scale
            const finalIconScale = baseScaleFactor * iconScale;

            const styles: Style[] = [
              new Style({
                image: new Icon({
                  src: iconPath,
                  scale: finalIconScale,
                  opacity: iconOpacity,
                  rotation: (iconRotation * Math.PI) / 180, // Convert degrees to radians
                }),
              }),
            ];

            // Add label text style if feature has a name/label
            const labelProperty = feature.get("label") || "name";
            const labelValue = feature.get(labelProperty);
            if (labelValue) {
              // Calculate label scale factor (base scale * user label scale)
              const finalLabelScale = baseScaleFactor * labelScale;
              // Scale the offset proportionally with the icon
              const baseOffsetY = -40;
              const scaledOffsetY = baseOffsetY * finalIconScale;

              styles.push(
                new Style({
                  text: new Text({
                    text: String(labelValue),
                    font: "14px Arial, sans-serif",
                    fill: new Fill({ color: "#000000" }),
                    stroke: new Stroke({ color: "#ffffff", width: 3 }),
                    textAlign: "center",
                    textBaseline: "middle",
                    offsetY: scaledOffsetY,
                    scale: finalLabelScale,
                  }),
                  zIndex: 100,
                }),
              );
            }

            return styles;
          }
        }

        // Only process text features with resolution-based visibility
        if (feature.get("isText") && type === "Point" && resolution) {
          const textContent = feature.get("text") || "Text";
          const textScale = feature.get("textScale") || 1;
          const textRotation = feature.get("textRotation") || 0;
          const textOpacity = feature.get("textOpacity") ?? 1;
          const textFillColor = feature.get("textFillColor") || "#000000";
          const textStrokeColor = feature.get("textStrokeColor") || "#ffffff";

          // Hide text when toggled off
          if (isTextFeatureHidden(typedFeature, hiddenTypes)) {
            return new Style({
              text: new Text({ text: "" }), // OpenLayers pattern: empty text = hidden
            });
          }

          // Apply world-scaling for text based on resolution (same as icon labels)
          const desiredPxSize = 16;
          const referenceResolution = 1.0;
          const baseScaleFactor = (desiredPxSize / STYLE_DEFAULTS.TEXT_FONT_SIZE) * (referenceResolution / resolution);
          const finalTextScale = baseScaleFactor * textScale;

          // Convert hex color to rgba with opacity
          const hexToRgba = (hex: string, opacity: number): string => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
          };

          // Apply opacity to custom colors
          const fillColor = hexToRgba(textFillColor, textOpacity);
          const strokeColor = hexToRgba(textStrokeColor, textOpacity);

          // Create style with resolution-based scale, rotation, and opacity
          return new Style({
            text: new Text({
              text: textContent,
              font: `${STYLE_DEFAULTS.TEXT_FONT_SIZE}px Arial, sans-serif`,
              scale: finalTextScale,
              rotation: (textRotation * Math.PI) / 180,
              fill: new Fill({ color: fillColor }),
              stroke: new Stroke({
                color: strokeColor,
                width: STYLE_DEFAULTS.TEXT_STROKE_WIDTH,
              }),
              padding: [4, 6, 4, 6],
              textAlign: "center",
              textBaseline: "middle",
            }),
            zIndex: STYLE_DEFAULTS.Z_INDEX_TEXT,
          });
        }

        // Check if feature should be hidden using consolidated visibility utility
        if (isFeatureHidden(typedFeature, hiddenTypes)) {
          return new Style({ stroke: undefined });
        }

        // Apply world-scaling for all LineString/MultiLineString features based on resolution
        if (resolution>=0.8 && (type === "LineString" || type === "MultiLineString")) {
          const desiredPxSize = 16;
          const referenceResolution = 1.0;
          const baseScaleFactor = (desiredPxSize / 16) * (referenceResolution / resolution);

          // Get base style from FeatureStyler first
          const baseStyle = getFeatureStyle(feature);
          if (!baseStyle) return baseStyle;

          // Apply resolution scaling to stroke widths
          const applyScalingToStyle = (style: Style): Style => {
            const stroke = style.getStroke();
            if (stroke) {
              const originalWidth = stroke.getWidth() || 2;
              const scaledWidth = originalWidth * baseScaleFactor;
              return new Style({
                stroke: new Stroke({
                  color: stroke.getColor(),
                  width: scaledWidth,
                  lineDash: stroke.getLineDash() || undefined,
                  lineCap: stroke.getLineCap() as CanvasLineCap || "butt",
                }),
                text: style.getText() ?? undefined,
                image: style.getImage() ?? undefined,
                fill: style.getFill() ?? undefined,
                geometry: style.getGeometry() as any,
                zIndex: style.getZIndex(),
              });
            }
            return style;
          };

          if (Array.isArray(baseStyle)) {
            return baseStyle.map(applyScalingToStyle);
          }
          return applyScalingToStyle(baseStyle);
        }

        // Handle all other feature types normally
        return getFeatureStyle(feature);
      });
    }
  }, [hiddenTypes, hiddenFeatureIds]);

  return (
    <div id="map" className="relative w-full h-screen" ref={mapContainerRef} />
  );
};

export default MapInstance;
