import React, { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import { Feature } from "ol";
import { Style, Text, Fill, Stroke, Icon } from "ol/style";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { OSM, XYZ, Vector as VectorSource } from "ol/source";
import { fromLonLat } from "ol/proj";
import { defaults as defaultControls } from "ol/control";
import { getFeatureStyle, createZigzagGeometry } from "./FeatureStyler";
import { getLegendById } from "@/tools/legendsConfig";
import { LineString } from "ol/geom";
import { useHiddenFeatures } from "@/hooks/useToggleObjects";
import { useHiddenFeaturesStore } from "@/stores/useHiddenFeaturesStore";
import { useToolStore } from "@/stores/useToolStore";
import {
  isFeatureHidden,
  isTextFeatureHidden,
} from "@/utils/features/visibilityUtils";
import { STYLE_DEFAULTS } from "@/constants/styleDefaults";
import {
  calculateIconScale,
  calculateTextScale,
  calculateStrokeScale,
  RESOLUTION_SCALE_DEFAULTS,
} from "@/utils/resolutionScaleUtils";
import type { Geometry } from "ol/geom";

export interface MapInstanceProps {
  onMapReady: (map: Map) => void;
  osmLayerRef: React.MutableRefObject<TileLayer<OSM> | null>;
  satelliteLayerRef: React.MutableRefObject<TileLayer<XYZ> | null>;
  vectorLayerRef: React.MutableRefObject<VectorLayer<
    VectorSource<Feature<any>>
  > | null>;
  vectorSourceRef: React.MutableRefObject<VectorSource<Feature<any>>>;
  labelsLayerRef?: React.MutableRefObject<TileLayer<XYZ> | null>;
}

export const MapInstance: React.FC<MapInstanceProps> = ({
  onMapReady,
  osmLayerRef,
  satelliteLayerRef,
  vectorLayerRef,
  vectorSourceRef,
  labelsLayerRef,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { hiddenTypes } = useHiddenFeatures();
  const { hiddenFeatureIds } = useHiddenFeaturesStore();
  const { resolutionScalingEnabled } = useToolStore();

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

     // NEW: Create Labels Overlay Layer
    // This layer contains transparent tiles with only street names and boundaries
    const labelsLayer = new TileLayer({
      source: new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        attributions: "Tiles © Esri",
        crossOrigin: "anonymous",
      }),
      // Initially hidden (should match satelliteLayer state)
      visible: false, 
      zIndex: 1, // Ensures it sits above the satellite layer
    });

    // Store references for layer switching
    osmLayerRef.current = osmLayer;
    satelliteLayerRef.current = satelliteLayer;
    if (labelsLayerRef) labelsLayerRef.current = labelsLayer;

    const vectorLayer = new VectorLayer({
      source: vectorSourceRef.current,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
    });

    // Store vector layer reference
    vectorLayerRef.current = vectorLayer;

    const map = new Map({
      target: mapContainerRef.current,
      layers: [osmLayer, satelliteLayer, labelsLayer, vectorLayer],
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
      vectorLayerRef.current.setStyle(
        (feature, resolution): Style | Style[] | void => {
          const type = feature.getGeometry()?.getType();
          const typedFeature = feature as Feature<Geometry>;

          // Check if feature is individually hidden (from SeparateFeatures panel)
          const featureId = String((feature as any).ol_uid);
          if (hiddenFeatureIds.has(featureId)) {
            return new Style({ stroke: undefined });
          }

          // Apply world-scaling for icon features based on resolution
          if (feature.get("isIcon") && resolution) {
            const iconWidth = feature.get("iconWidth") || 32;
            const iconPath = feature.get("iconPath");

            // Get icon properties
            const iconOpacity = feature.get("opacity") ?? 1;
            const iconScale = feature.get("iconScale") ?? 1;
            const labelScale = feature.get("labelScale") ?? 1;
            const textOffsetX = feature.get("textOffsetX") ?? 0;
            const textOffsetY = feature.get("textOffsetY") ?? 0;
            const iconRotation = feature.get("iconRotation") ?? 0;

            if (iconPath) {
              // Calculate final icon scale using resolution-based scaling (if enabled)
              const finalIconScale = resolutionScalingEnabled
                ? calculateIconScale(resolution, iconWidth, iconScale)
                : iconScale;

              const styles: Style[] = [
                new Style({
                  image: new Icon({
                    src: iconPath,
                    scale: finalIconScale,
                    opacity: iconOpacity,
                    rotation: (iconRotation * Math.PI) / 180, // Convert degrees to radians
                    crossOrigin: "anonymous",
                  }),
                }),
              ];

              // Add label text style if feature has a name/label and showLabel is enabled
              const showLabel = feature.get("showLabel") ?? true;
              const labelProperty = feature.get("label") || "name";
              const labelValue = feature.get(labelProperty);
              if (labelValue && showLabel) {
                // Calculate label scale factor using same icon-based scaling with label scale (if enabled)
                const finalLabelScale = resolutionScalingEnabled
                  ? calculateIconScale(resolution, iconWidth, labelScale)
                  : labelScale;
                // Scale the offset proportionally with the icon
                // User offsets must also be scaled to remain constant relative to icon size
                const baseOffsetY = -40;
                const scaledOffsetY =
                  (baseOffsetY + textOffsetY) * finalIconScale;
                const scaledOffsetX = textOffsetX * finalIconScale;

                styles.push(
                  new Style({
                    text: new Text({
                      text: String(labelValue),
                      font: "14px Arial, sans-serif",
                      fill: new Fill({ color: "#000000" }),
                      stroke: new Stroke({ color: "#ffffff", width: 3 }),
                      textAlign: "center",
                      textBaseline: "middle",
                      offsetX: scaledOffsetX,
                      offsetY: scaledOffsetY,
                      scale: finalLabelScale,
                      rotation: (iconRotation * Math.PI) / 180, // Rotate label with icon
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
            const textAlign = feature.get("textAlign") || "center";

            // Hide text when toggled off
            if (isTextFeatureHidden(typedFeature, hiddenTypes)) {
              return new Style({
                text: new Text({ text: "" }), // OpenLayers pattern: empty text = hidden
              });
            }

            // Apply world-scaling for text based on resolution (same as icon labels)
            const finalTextScale = calculateTextScale(
              resolution,
              STYLE_DEFAULTS.TEXT_FONT_SIZE,
              textScale,
            );

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
                textAlign: textAlign,
                textBaseline: "middle",
              }),
              zIndex: STYLE_DEFAULTS.Z_INDEX_TEXT,
            });
          }

          // Check if feature should be hidden using consolidated visibility utility
          if (isFeatureHidden(typedFeature, hiddenTypes)) {
            return new Style({ stroke: undefined });
          }

          // Check if this is a shape feature (Box, Circle, RevisionCloud) that needs resolution scaling
          const isShapeFeature =
            (type === "Polygon" || type === "MultiPolygon") &&
            (feature.get("isBox") ||
              feature.get("isCircle") ||
              feature.get("isRevisionCloud"));

          // Apply world-scaling for all LineString/MultiLineString and shape features based on resolution (if enabled)
          if (
            resolutionScalingEnabled &&
            (type === "LineString" ||
              type === "MultiLineString" ||
              isShapeFeature)
          ) {
            const baseScaleFactor = calculateStrokeScale(resolution!);

            // Get base style from FeatureStyler first
            const baseStyle = getFeatureStyle(feature, resolution!);
            if (!baseStyle) return baseStyle;

            // Apply resolution scaling to stroke widths, text, and zigzag geometries
            const applyScalingToStyle = (style: Style): Style => {
              const stroke = style.getStroke();
              const text = style.getText();

              // Calculate text scale for legends with text using resolution scale utilities
              let scaledText: Text | undefined = text ?? undefined;
              if (text && resolutionScalingEnabled) {
                const originalTextScale = text.getScale();
                const baseTextScale =
                  typeof originalTextScale === "number" ? originalTextScale : 1;
                const finalTextScale = calculateTextScale(
                  resolution!,
                  RESOLUTION_SCALE_DEFAULTS.TEXT_FONT_SIZE,
                  baseTextScale,
                );

                scaledText = new Text({
                  text: text.getText() as string,
                  font: text.getFont(),
                  fill: text.getFill() ?? undefined,
                  stroke: text.getStroke() ?? undefined,
                  scale: finalTextScale,
                  placement: text.getPlacement(),
                  repeat: text.getRepeat()
                    ? text.getRepeat()! * baseScaleFactor
                    : undefined,
                  textAlign: text.getTextAlign() ?? undefined,
                  textBaseline: text.getTextBaseline() ?? undefined,
                  maxAngle: text.getMaxAngle(),
                  offsetX: text.getOffsetX(),
                  offsetY: text.getOffsetY(),
                  rotation: text.getRotation(),
                });
              }

              // Scale zigzag geometry if the style has a custom geometry from a zigzag legend
              let scaledGeometry: any = style.getGeometry();
              const styleGeom = style.getGeometry();
              if (styleGeom && (feature.get("islegends") || isShapeFeature)) {
                const legendTypeId = feature.get("legendType");
                if (legendTypeId) {
                  const legendType = getLegendById(legendTypeId);
                  if (
                    legendType?.linePattern === "zigzag" &&
                    legendType.zigzagConfig
                  ) {
                    const featureGeom = feature.getGeometry();
                    if (featureGeom) {
                      const featureGeomType = featureGeom.getType();
                      const { amplitude, wavelength } = legendType.zigzagConfig;
                      const amplitudeMap =
                        amplitude * resolution! * baseScaleFactor;
                      const halfWaveMap =
                        (wavelength / 2) * resolution! * baseScaleFactor;

                      if (featureGeomType === "LineString") {
                        // Scale amplitude and wavelength by the resolution scale factor
                        scaledGeometry = createZigzagGeometry(
                          featureGeom as LineString,
                          amplitudeMap,
                          halfWaveMap,
                        );
                      } else if (featureGeomType === "Polygon") {
                        // For shapes, extract exterior ring as LineString for zigzag
                        const coords = (featureGeom as any)
                          .getLinearRing(0)
                          ?.getCoordinates();
                        if (coords) {
                          const ring = new LineString(coords);
                          scaledGeometry = createZigzagGeometry(
                            ring,
                            amplitudeMap,
                            halfWaveMap,
                          );
                        }
                      }
                    }
                  }
                }
              }

              if (stroke) {
                const originalWidth = stroke.getWidth() || 2;
                const scaledWidth = originalWidth * baseScaleFactor;
                return new Style({
                  stroke: new Stroke({
                    color: stroke.getColor(),
                    width: scaledWidth,
                    lineDash:
                      stroke.getLineDash()?.map((v) => v * baseScaleFactor) ||
                      [],
                    lineCap: (stroke.getLineCap() as CanvasLineCap) || "butt",
                  }),
                  text: scaledText,
                  image: style.getImage() ?? undefined,
                  fill: style.getFill() ?? undefined,
                  geometry: scaledGeometry,
                  zIndex: style.getZIndex(),
                });
              }

              // If no stroke but has text that was scaled, return new style with scaled text
              if (scaledText !== text) {
                return new Style({
                  text: scaledText,
                  image: style.getImage() ?? undefined,
                  fill: style.getFill() ?? undefined,
                  geometry: scaledGeometry,
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
          return getFeatureStyle(feature, resolution!);
        },
      );
    }
  }, [hiddenTypes, hiddenFeatureIds, resolutionScalingEnabled]);

  return (
    <div id="map" className="relative w-full h-screen" ref={mapContainerRef} />
  );
};

export default MapInstance;
