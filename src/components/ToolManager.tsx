import React, { useEffect, useRef } from "react";
import { Draw, Snap } from "ol/interaction";
import { Feature } from "ol";
import { LineString } from "ol/geom";
import type Map from "ol/Map";
import { Vector as VectorSource } from "ol/source";
import type { Geometry } from "ol/geom";
import type { LegendType } from "@/tools/legendsConfig";
import { getLegendById } from "@/tools/legendsConfig";
import { useToolStore } from "@/stores/useToolStore";
import {
  createPointDraw,
  createPolylineDraw,
  createFreehandDraw,
  createArrowDraw,
  createLegendDraw,
  createMeasureDraw,
  createBoxDraw,
  createCircleDraw,
  createArcDraw,
  createRevisionCloudDraw,
} from "@/utils/interactionUtils";
import { createLineStyle } from "@/utils/styleUtils";
import { useClickHandlerManager } from "@/hooks/useClickHandlerManager";
import { getCursorForTool } from "@/utils/cursorUtils";
import { getTextAlongLineStyle } from "./FeatureStyler";
import { handleIconClick } from "@/icons/IconPicker";

export interface ToolManagerProps {
  map: Map | null;
  vectorSource: VectorSource<Feature<Geometry>>;
  activeTool: string;
  selectedLegend?: LegendType;
  selectedIconPath?: string;
  lineColor?: string;
  lineWidth?: number;
  onToolChange: (tool: string) => void;
  onFeatureSelect?: (feature: Feature | null) => void;
}

export const ToolManager: React.FC<ToolManagerProps> = ({
  map,
  vectorSource,
  activeTool,
  selectedLegend,
  selectedIconPath,
  lineColor,
  lineWidth,
  onToolChange,
  onFeatureSelect,
}) => {
  const drawInteractionRef = useRef<Draw | null>(null);
  const snapInteractionRef = useRef<Snap | null>(null);
  const { registerClickHandler, removeAllClickHandlers } =
    useClickHandlerManager();

  // Helper to add snap interaction after draw - must be added AFTER draw for proper event ordering
  const addSnapInteraction = () => {
    if (!map) return;

    // Remove existing snap interaction
    if (snapInteractionRef.current) {
      map.removeInteraction(snapInteractionRef.current);
      snapInteractionRef.current = null;
    }

    // Create and add snap interaction AFTER draw
    snapInteractionRef.current = new Snap({
      source: vectorSource,
      pixelTolerance: 15,
      vertex: true,
      edge: true,
    });
    map.addInteraction(snapInteractionRef.current);
  };

  // Auto-activate legends tool when selectedLegend changes
  useEffect(() => {
    if (selectedLegend) {
      // Remove any existing draw interaction first
      if (drawInteractionRef.current) {
        map?.removeInteraction(drawInteractionRef.current);
        drawInteractionRef.current = null;
      }
      // Then activate the legends tool with the selected legend
      onToolChange("legends");
    }
  }, [selectedLegend, map, onToolChange]);

  // Auto-activate icons tool when selectedIconPath changes
  useEffect(() => {
    if (selectedIconPath) {
      if (drawInteractionRef.current) {
        map?.removeInteraction(drawInteractionRef.current);
        drawInteractionRef.current = null;
      }
      onToolChange("icons");
    }
  }, [selectedIconPath, map, onToolChange]);

  // Handle tool activation
  useEffect(() => {
    if (!map) return;

    // Remove existing draw and snap interactions
    if (drawInteractionRef.current) {
      map.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }
    if (snapInteractionRef.current) {
      map.removeInteraction(snapInteractionRef.current);
      snapInteractionRef.current = null;
    }

    // Remove all click handlers using the hook
    removeAllClickHandlers(map);

    // Apply cursor for the active tool
    const cursor = getCursorForTool(activeTool);
    const mapElement = map.getTargetElement();
    if (mapElement) {
      mapElement.style.cursor = cursor;
    }

    switch (activeTool) {
      case "point":
        drawInteractionRef.current = createPointDraw(vectorSource, (event) => {
          // Select the newly created point feature
          if (onFeatureSelect && event.feature) {
            // Pause drawing and open properties panel in edit mode
            useToolStore.getState().setIsNewlyCreatedFeature(true);
            useToolStore.getState().pauseDrawing('point');
            onFeatureSelect(event.feature);
            // Dispatch event to sync Select interaction for blue highlight
            window.dispatchEvent(new CustomEvent('featureDrawn', {
              detail: { feature: event.feature }
            }));
          }
        });
        map.addInteraction(drawInteractionRef.current);
        addSnapInteraction();
        break;

      case "polyline":
        drawInteractionRef.current = createPolylineDraw(
          vectorSource,
          (event) => {
            if (onFeatureSelect && event.feature) {
              // Pause drawing and open properties panel in edit mode
              useToolStore.getState().setIsNewlyCreatedFeature(true);
              useToolStore.getState().pauseDrawing('polyline');
              onFeatureSelect(event.feature);
              // Dispatch event to sync Select interaction for blue highlight
              window.dispatchEvent(new CustomEvent('featureDrawn', {
                detail: { feature: event.feature }
              }));
            }
          },
          lineColor,
          lineWidth
        );
        map.addInteraction(drawInteractionRef.current);
        addSnapInteraction();
        break;

      case "freehand":
        drawInteractionRef.current = createFreehandDraw(
          vectorSource,
          (event) => {
            if (onFeatureSelect && event.feature) {
              // Pause drawing and open properties panel in edit mode
              useToolStore.getState().setIsNewlyCreatedFeature(true);
              useToolStore.getState().pauseDrawing('freehand');
              onFeatureSelect(event.feature);
              // Dispatch event to sync Select interaction for blue highlight
              window.dispatchEvent(new CustomEvent('featureDrawn', {
                detail: { feature: event.feature }
              }));
            }
          },
          lineColor,
          lineWidth
        );
        map.addInteraction(drawInteractionRef.current);
        addSnapInteraction();
        break;

      case "arrow":
        drawInteractionRef.current = createArrowDraw(
          vectorSource,
          (event) => {
            if (onFeatureSelect && event.feature) {
              // Pause drawing and open properties panel in edit mode
              useToolStore.getState().setIsNewlyCreatedFeature(true);
              useToolStore.getState().pauseDrawing('arrow');
              onFeatureSelect(event.feature);
              // Dispatch event to sync Select interaction for blue highlight
              window.dispatchEvent(new CustomEvent('featureDrawn', {
                detail: { feature: event.feature }
              }));
            }
          },
          lineColor,
          lineWidth
        );
        map.addInteraction(drawInteractionRef.current);
        addSnapInteraction();
        break;

      case "legends":
        // Don't allow drawing if no legend is selected
        if (!selectedLegend) {
          return;
        }

        // Use text styling for legends that have text, otherwise use standard style
        let drawStyle;
        if (selectedLegend.text) {
          // Create a temporary feature to generate the proper text style
          const tempFeature = new Feature({
            geometry: new LineString([
              [0, 0],
              [1, 0],
            ]),
          });
          tempFeature.set("legendType", selectedLegend.id);
          tempFeature.set("islegends", true);
          drawStyle = getTextAlongLineStyle(tempFeature, selectedLegend);
        } else {
          const opacity = selectedLegend.style.opacity || 1;
          const strokeColor = selectedLegend.style.strokeColor || "#000000";

          drawStyle = createLineStyle(
            strokeColor,
            selectedLegend.style.strokeWidth,
            opacity,
            selectedLegend.style.strokeDash
          );
        }

        drawInteractionRef.current = createLegendDraw(
          vectorSource,
          drawStyle,
          selectedLegend.id,
          (event) => {
            if (onFeatureSelect && event.feature) {
              // Pause drawing and open properties panel in edit mode
              useToolStore.getState().setIsNewlyCreatedFeature(true);
              useToolStore.getState().pauseDrawing('legends');
              onFeatureSelect(event.feature);
              // Dispatch event to sync Select interaction for blue highlight
              window.dispatchEvent(new CustomEvent('featureDrawn', {
                detail: { feature: event.feature }
              }));
            }
          }
        );
        map.addInteraction(drawInteractionRef.current);
        addSnapInteraction();
        break;

      case "text":
        registerClickHandler(
          map,
          {
            toolId: "text",
            handlerKey: "TextClickHandler",
            onClick: (coordinate) => {
              // Trigger custom event for text dialog
              const event = new CustomEvent('textToolClick', {
                detail: { coordinate }
              });
              window.dispatchEvent(event);
            },
          },
          vectorSource
        );
        break;

      case "icons":
        // Always open picker when icons tool is activated from toolbar
        const iconPickerEvent = new CustomEvent('iconPickerOpen');
        window.dispatchEvent(iconPickerEvent);

        // If an icon is already selected, also register the click handler
        if (selectedIconPath) {
          registerClickHandler(
            map,
            {
              toolId: "icons",
              handlerKey: "IconClickHandler",
              onClick: (coordinate) => {
                const feature = handleIconClick(vectorSource, coordinate, selectedIconPath);
                if (feature && onFeatureSelect) {
                  // Pause drawing and open properties panel in edit mode
                  useToolStore.getState().setIsNewlyCreatedFeature(true);
                  useToolStore.getState().pauseDrawing('icons');
                  onFeatureSelect(feature);
                  // Dispatch event to sync Select interaction for blue highlight
                  window.dispatchEvent(new CustomEvent('featureDrawn', {
                    detail: { feature }
                  }));
                }
              },
            },
            vectorSource
          );
        }
        break;

      case "measure":
        // Use the measure legend configuration
        const measureLegend = getLegendById("measure");
        if (measureLegend) {
          const opacity = measureLegend.style.opacity || 1;
          const strokeColor = measureLegend.style.strokeColor || "#3b4352";

          const measureDrawStyle = createLineStyle(
            strokeColor,
            measureLegend.style.strokeWidth,
            opacity,
            measureLegend.style.strokeDash
          );

          drawInteractionRef.current = createMeasureDraw(
            vectorSource,
            measureDrawStyle,
            (event) => {
              if (onFeatureSelect && event.feature) {
                // Pause drawing and open properties panel in edit mode
                useToolStore.getState().setIsNewlyCreatedFeature(true);
                useToolStore.getState().pauseDrawing('measure');
                onFeatureSelect(event.feature);
                // Dispatch event to sync Select interaction for blue highlight
                window.dispatchEvent(new CustomEvent('featureDrawn', {
                  detail: { feature: event.feature }
                }));
              }
            }
          );
          map.addInteraction(drawInteractionRef.current);
          addSnapInteraction();
        }
        break;

      case "box":
        drawInteractionRef.current = createBoxDraw(
          vectorSource,
          (event) => {
            if (onFeatureSelect && event.feature) {
              // Pause drawing and open properties panel in edit mode
              useToolStore.getState().setIsNewlyCreatedFeature(true);
              useToolStore.getState().pauseDrawing('box');
              onFeatureSelect(event.feature);
              // Dispatch event to sync Select interaction for blue highlight
              window.dispatchEvent(new CustomEvent('featureDrawn', {
                detail: { feature: event.feature }
              }));
            }
          }
        );
        map.addInteraction(drawInteractionRef.current);
        addSnapInteraction();
        break;

      case "circle":
        drawInteractionRef.current = createCircleDraw(
          vectorSource,
          (event) => {
            if (onFeatureSelect && event.feature) {
              // Pause drawing and open properties panel in edit mode
              useToolStore.getState().setIsNewlyCreatedFeature(true);
              useToolStore.getState().pauseDrawing('circle');
              onFeatureSelect(event.feature);
              // Dispatch event to sync Select interaction for blue highlight
              window.dispatchEvent(new CustomEvent('featureDrawn', {
                detail: { feature: event.feature }
              }));
            }
          }
        );
        map.addInteraction(drawInteractionRef.current);
        addSnapInteraction();
        break;

      case "arc":
        drawInteractionRef.current = createArcDraw(
          vectorSource,
          (event) => {
            if (onFeatureSelect && event.feature) {
              // Pause drawing and open properties panel in edit mode
              useToolStore.getState().setIsNewlyCreatedFeature(true);
              useToolStore.getState().pauseDrawing('arc');
              onFeatureSelect(event.feature);
              // Dispatch event to sync Select interaction for blue highlight
              window.dispatchEvent(new CustomEvent('featureDrawn', {
                detail: { feature: event.feature }
              }));
            }
          },
          lineColor,
          lineWidth
        );
        map.addInteraction(drawInteractionRef.current);
        addSnapInteraction();
        break;

      case "revcloud":
        drawInteractionRef.current = createRevisionCloudDraw(
          vectorSource,
          (event) => {
            if (onFeatureSelect && event.feature) {
              // Pause drawing and open properties panel in edit mode
              useToolStore.getState().setIsNewlyCreatedFeature(true);
              useToolStore.getState().pauseDrawing('revcloud');
              onFeatureSelect(event.feature);
              // Dispatch event to sync Select interaction for blue highlight
              window.dispatchEvent(new CustomEvent('featureDrawn', {
                detail: { feature: event.feature }
              }));
            }
          },
          lineColor
        );
        map.addInteraction(drawInteractionRef.current);
        addSnapInteraction();
        break;

      case "split":
        // Split interaction is managed in MapInteractions.tsx
        // No draw interaction needed here
        break;

      case "merge":
        // Merge interaction is managed in MapInteractions.tsx
        // No draw interaction needed here
        break;

      case "offset":
        // Offset interaction is managed in MapInteractions.tsx
        // No draw interaction needed here
        break;

      default:
        break;
    }

    return () => {
      // Cleanup draw and snap interactions on tool change
      if (drawInteractionRef.current) {
        map.removeInteraction(drawInteractionRef.current);
        drawInteractionRef.current = null;
      }
      if (snapInteractionRef.current) {
        map.removeInteraction(snapInteractionRef.current);
        snapInteractionRef.current = null;
      }
      // Reset cursor to default
      const mapElement = map.getTargetElement();
      if (mapElement) {
        mapElement.style.cursor = "auto";
      }
    };
  }, [
    activeTool,
    map,
    vectorSource,
    selectedLegend,
    selectedIconPath,
    lineColor,
    lineWidth,
    registerClickHandler,
    removeAllClickHandlers,
    onFeatureSelect,
  ]);

  return null; // This component doesn't render anything
};

export default ToolManager;
