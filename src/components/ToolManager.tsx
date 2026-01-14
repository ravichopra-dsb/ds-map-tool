import React, { useEffect, useRef } from "react";
import { Draw } from "ol/interaction";
import { Feature } from "ol";
import { LineString } from "ol/geom";
import type Map from "ol/Map";
import { Vector as VectorSource } from "ol/source";
import type { Geometry } from "ol/geom";
import type { LegendType } from "@/tools/legendsConfig";
import { getLegendById } from "@/tools/legendsConfig";
import { handleTriangleClick } from "@/icons/Triangle";
import { handlePitClick } from "@/icons/Pit";
import { handleGPClick } from "@/icons/Gp";
import { handleJunctionClick } from "@/icons/JunctionPoint";
import { handleTowerClickFromSvg } from "@/icons/Tower";
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
import { TOWER_CONFIG } from "@/config/toolConfig";
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
  const { registerClickHandler, removeAllClickHandlers } =
    useClickHandlerManager();

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

    // Remove existing draw interaction if any
    if (drawInteractionRef.current) {
      map.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
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
            onFeatureSelect(event.feature);
          }
        });
        map.addInteraction(drawInteractionRef.current);
        break;

      case "polyline":
        drawInteractionRef.current = createPolylineDraw(
          vectorSource,
          (event) => {
            if (onFeatureSelect && event.feature) {
              onFeatureSelect(event.feature);
            }
          },
          lineColor,
          lineWidth
        );
        map.addInteraction(drawInteractionRef.current);
        break;

      case "freehand":
        drawInteractionRef.current = createFreehandDraw(
          vectorSource,
          (event) => {
            if (onFeatureSelect && event.feature) {
              onFeatureSelect(event.feature);
            }
          },
          lineColor,
          lineWidth
        );
        map.addInteraction(drawInteractionRef.current);
        break;

      case "arrow":
        drawInteractionRef.current = createArrowDraw(
          vectorSource,
          (event) => {
            if (onFeatureSelect && event.feature) {
              onFeatureSelect(event.feature);
            }
          },
          lineColor,
          lineWidth
        );
        map.addInteraction(drawInteractionRef.current);
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
              onFeatureSelect(event.feature);
            }
          }
        );
        map.addInteraction(drawInteractionRef.current);
        break;

      case "triangle":
        registerClickHandler(
          map,
          {
            toolId: "triangle",
            handlerKey: "triangleClickHandler",
            onClick: (coordinate) => {
              const feature = handleTriangleClick(vectorSource, coordinate);
              if (feature && onFeatureSelect) {
                onFeatureSelect(feature);
              }
            },
          },
          vectorSource
        );
        break;

      case "pit":
        registerClickHandler(
          map,
          {
            toolId: "pit",
            handlerKey: "PitClickHandler",
            onClick: (coordinate) => {
              const feature = handlePitClick(vectorSource, coordinate);
              if (feature && onFeatureSelect) {
                onFeatureSelect(feature);
              }
            },
          },
          vectorSource
        );
        break;

      case "gp":
        registerClickHandler(
          map,
          {
            toolId: "gp",
            handlerKey: "GpClickHandler",
            onClick: (coordinate) => {
              const feature = handleGPClick(vectorSource, coordinate);
              if (feature && onFeatureSelect) {
                onFeatureSelect(feature);
              }
            },
          },
          vectorSource
        );
        break;

      case "junction":
        registerClickHandler(
          map,
          {
            toolId: "junction",
            handlerKey: "JuctionPointClickHandler",
            onClick: (coordinate) => {
              const feature = handleJunctionClick(vectorSource, coordinate);
              if (feature && onFeatureSelect) {
                onFeatureSelect(feature);
              }
            },
          },
          vectorSource
        );
        break;

      case "tower":
        registerClickHandler(
          map,
          {
            toolId: "tower",
            handlerKey: "TowerClickHandler",
            onClick: (coordinate) => {
              const feature = handleTowerClickFromSvg(
                vectorSource,
                coordinate,
                TOWER_CONFIG.svgPath,
                TOWER_CONFIG.scale,
                TOWER_CONFIG.strokeWidth
              );
              if (feature && onFeatureSelect) {
                onFeatureSelect(feature);
              }
            },
          },
          vectorSource
        );
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
                  onFeatureSelect(feature);
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
                onFeatureSelect(event.feature);
              }
            }
          );
          map.addInteraction(drawInteractionRef.current);
        }
        break;

      case "box":
        drawInteractionRef.current = createBoxDraw(
          vectorSource,
          (event) => {
            if (onFeatureSelect && event.feature) {
              onFeatureSelect(event.feature);
            }
          }
        );
        map.addInteraction(drawInteractionRef.current);
        break;

      case "circle":
        drawInteractionRef.current = createCircleDraw(
          vectorSource,
          (event) => {
            if (onFeatureSelect && event.feature) {
              onFeatureSelect(event.feature);
            }
          }
        );
        map.addInteraction(drawInteractionRef.current);
        break;

      case "arc":
        drawInteractionRef.current = createArcDraw(
          vectorSource,
          (event) => {
            if (onFeatureSelect && event.feature) {
              onFeatureSelect(event.feature);
            }
          },
          lineColor,
          lineWidth
        );
        map.addInteraction(drawInteractionRef.current);
        break;

      case "revcloud":
        drawInteractionRef.current = createRevisionCloudDraw(
          vectorSource,
          (event) => {
            if (onFeatureSelect && event.feature) {
              onFeatureSelect(event.feature);
            }
          },
          lineColor
        );
        map.addInteraction(drawInteractionRef.current);
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
      // Cleanup draw interaction on tool change
      if (drawInteractionRef.current) {
        map.removeInteraction(drawInteractionRef.current);
        drawInteractionRef.current = null;
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
