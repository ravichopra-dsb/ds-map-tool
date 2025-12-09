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
} from "@/utils/interactionUtils";
import { createLineStyle } from "@/utils/styleUtils";
import { useClickHandlerManager } from "@/hooks/useClickHandlerManager";
import { TOWER_CONFIG } from "@/config/toolConfig";
import { getTextAlongLineStyle } from "./FeatureStyler";

export interface ToolManagerProps {
  map: Map | null;
  vectorSource: VectorSource<Feature<Geometry>>;
  activeTool: string;
  selectedLegend?: LegendType;
  onToolChange: (tool: string) => void;
}

export const ToolManager: React.FC<ToolManagerProps> = ({
  map,
  vectorSource,
  activeTool,
  selectedLegend,
  onToolChange,
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

    switch (activeTool) {
      case "point":
        drawInteractionRef.current = createPointDraw(vectorSource);
        map.addInteraction(drawInteractionRef.current);
        break;

      case "polyline":
        drawInteractionRef.current = createPolylineDraw(vectorSource);
        map.addInteraction(drawInteractionRef.current);
        break;

      case "freehand":
        drawInteractionRef.current = createFreehandDraw(vectorSource);
        map.addInteraction(drawInteractionRef.current);
        break;

      case "arrow":
        drawInteractionRef.current = createArrowDraw(vectorSource);
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
          selectedLegend.id
        );
        map.addInteraction(drawInteractionRef.current);
        break;

      case "triangle":
        registerClickHandler(
          map,
          {
            toolId: "triangle",
            handlerKey: "triangleClickHandler",
            onClick: (coordinate) =>
              handleTriangleClick(vectorSource, coordinate),
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
            onClick: (coordinate) => handlePitClick(vectorSource, coordinate),
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
            onClick: (coordinate) => handleGPClick(vectorSource, coordinate),
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
            onClick: (coordinate) =>
              handleJunctionClick(vectorSource, coordinate),
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
              handleTowerClickFromSvg(
                vectorSource,
                coordinate,
                TOWER_CONFIG.svgPath,
                TOWER_CONFIG.scale,
                TOWER_CONFIG.strokeWidth
              );
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
            "measure"
          );
          map.addInteraction(drawInteractionRef.current);
        }
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
    };
  }, [
    activeTool,
    map,
    vectorSource,
    selectedLegend,
    registerClickHandler,
    removeAllClickHandlers,
  ]);

  return null; // This component doesn't render anything
};

export default ToolManager;
