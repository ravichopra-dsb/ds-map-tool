import React, { useEffect, useRef } from "react";
import { Draw, Snap } from "ol/interaction";
import { Feature } from "ol";
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
  createDimensionDraw,
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
import { TOOLS } from "@/tools/toolConfig";

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
  const snapEnabled = useToolStore((state) => state.snapEnabled);
  const { registerClickHandler, removeAllClickHandlers } =
    useClickHandlerManager();

  // Helper to add snap interaction after draw - must be added AFTER draw for proper event ordering
  const addSnapInteraction = () => {
    if (!map || !snapEnabled) return;

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

  // Toggle snap interaction on/off when snapEnabled changes (F3)
  useEffect(() => {
    if (!map) return;

    if (snapEnabled && drawInteractionRef.current) {
      // Add snap if a draw interaction is active
      if (!snapInteractionRef.current) {
        snapInteractionRef.current = new Snap({
          source: vectorSource,
          pixelTolerance: 15,
          vertex: true,
          edge: true,
        });
        map.addInteraction(snapInteractionRef.current);
      }
    } else if (!snapEnabled && snapInteractionRef.current) {
      // Remove snap when disabled
      map.removeInteraction(snapInteractionRef.current);
      snapInteractionRef.current = null;
    }
  }, [snapEnabled, map, vectorSource]);

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

    // Apply cursor for the active tool on the viewport element
    // (not getTargetElement(), as the viewport is the actual event-capturing element)
    const cursor = getCursorForTool(activeTool);
    const viewport = map.getViewport();
    if (viewport) {
      viewport.style.cursor = cursor;
    }

    switch (activeTool) {
      case "point":
        drawInteractionRef.current = createPointDraw(vectorSource, (event) => {
          // Select the newly created point feature
          if (onFeatureSelect && event.feature) {
            // Pause drawing and open properties panel in edit mode
            useToolStore.getState().setIsNewlyCreatedFeature(true);
            useToolStore.getState().pauseDrawing("point");
            onFeatureSelect(event.feature);
            // Dispatch event to sync Select interaction for blue highlight
            window.dispatchEvent(
              new CustomEvent("featureDrawn", {
                detail: { feature: event.feature },
              }),
            );
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
              useToolStore.getState().pauseDrawing("polyline");
              onFeatureSelect(event.feature);
              // Dispatch event to sync Select interaction for blue highlight
              window.dispatchEvent(
                new CustomEvent("featureDrawn", {
                  detail: { feature: event.feature },
                }),
              );
            }
          },
          lineColor,
          lineWidth,
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
              useToolStore.getState().pauseDrawing("freehand");
              onFeatureSelect(event.feature);
              // Dispatch event to sync Select interaction for blue highlight
              window.dispatchEvent(
                new CustomEvent("featureDrawn", {
                  detail: { feature: event.feature },
                }),
              );
            }
          },
          lineColor,
          lineWidth,
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
              useToolStore.getState().pauseDrawing("arrow");
              onFeatureSelect(event.feature);
              // Dispatch event to sync Select interaction for blue highlight
              window.dispatchEvent(
                new CustomEvent("featureDrawn", {
                  detail: { feature: event.feature },
                }),
              );
            }
          },
          lineColor,
          lineWidth,
        );
        map.addInteraction(drawInteractionRef.current);
        addSnapInteraction();
        break;

      case "dimension":
        drawInteractionRef.current = createDimensionDraw(
          vectorSource,
          (event) => {
            if (onFeatureSelect && event.feature) {
              useToolStore.getState().setIsNewlyCreatedFeature(true);
              useToolStore.getState().pauseDrawing("dimension");
              onFeatureSelect(event.feature);
              window.dispatchEvent(
                new CustomEvent("featureDrawn", {
                  detail: { feature: event.feature },
                }),
              );
            }
          },
        );
        map.addInteraction(drawInteractionRef.current);
        addSnapInteraction();
        break;

      case "legends":
        // Don't allow drawing if no legend is selected
        if (!selectedLegend) {
          return;
        }

        // Use text/zigzag styling for legends that have text or linePattern, otherwise use standard style
        let drawStyle: any;
        if (selectedLegend.text || selectedLegend.linePattern) {
          // Use a style function so zigzag/text updates dynamically during drawing
          const legendRef = selectedLegend;
          drawStyle = (feature: any, resolution: number) => {
            feature.set("legendType", legendRef.id, true);
            feature.set("islegends", true, true);
            return getTextAlongLineStyle(feature, legendRef, resolution);
          };
        } else {
          const opacity = selectedLegend.style.opacity || 1;
          const strokeColor = selectedLegend.style.strokeColor || "#000000";

          drawStyle = createLineStyle(
            strokeColor,
            selectedLegend.style.strokeWidth,
            opacity,
            selectedLegend.style.strokeDash,
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
              useToolStore.getState().pauseDrawing("legends");
              onFeatureSelect(event.feature);
              // Dispatch event to sync Select interaction for blue highlight
              window.dispatchEvent(
                new CustomEvent("featureDrawn", {
                  detail: { feature: event.feature },
                }),
              );
            }
          },
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
              const event = new CustomEvent("textToolClick", {
                detail: { coordinate },
              });
              window.dispatchEvent(event);
            },
          },
          vectorSource,
        );
        break;

      case "icons": {
        // Only open picker when not resuming from a drawing pause
        const { isResumingDrawing } = useToolStore.getState();
        if (!isResumingDrawing) {
          const iconPickerEvent = new CustomEvent("iconPickerOpen");
          window.dispatchEvent(iconPickerEvent);
        }
        // Clear the resuming flag after use
        if (isResumingDrawing) {
          useToolStore.setState({ isResumingDrawing: false });
        }

        // If an icon is already selected, register the click handler
        if (selectedIconPath) {
          registerClickHandler(
            map,
            {
              toolId: "icons",
              handlerKey: "IconClickHandler",
              onClick: (coordinate) => {
                const feature = handleIconClick(
                  vectorSource,
                  coordinate,
                  selectedIconPath,
                );
                if (feature && onFeatureSelect) {
                  // Pause drawing and open properties panel in edit mode
                  useToolStore.getState().setIsNewlyCreatedFeature(true);
                  useToolStore.getState().pauseDrawing("icons");
                  onFeatureSelect(feature);
                  // Dispatch event to sync Select interaction for blue highlight
                  window.dispatchEvent(
                    new CustomEvent("featureDrawn", {
                      detail: { feature },
                    }),
                  );
                }
              },
            },
            vectorSource,
          );
        }
        break;
      }

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
            measureLegend.style.strokeDash,
          );

          drawInteractionRef.current = createMeasureDraw(
            vectorSource,
            measureDrawStyle,
            (event) => {
              if (onFeatureSelect && event.feature) {
                // Pause drawing and open properties panel in edit mode
                useToolStore.getState().setIsNewlyCreatedFeature(true);
                useToolStore.getState().pauseDrawing("measure");
                onFeatureSelect(event.feature);
                // Dispatch event to sync Select interaction for blue highlight
                window.dispatchEvent(
                  new CustomEvent("featureDrawn", {
                    detail: { feature: event.feature },
                  }),
                );
              }
            },
          );
          map.addInteraction(drawInteractionRef.current);
          addSnapInteraction();
        }
        break;

      case "box":
        drawInteractionRef.current = createBoxDraw(vectorSource, (event) => {
          if (onFeatureSelect && event.feature) {
            // Pause drawing and open properties panel in edit mode
            useToolStore.getState().setIsNewlyCreatedFeature(true);
            useToolStore.getState().pauseDrawing("box");
            onFeatureSelect(event.feature);
            // Dispatch event to sync Select interaction for blue highlight
            window.dispatchEvent(
              new CustomEvent("featureDrawn", {
                detail: { feature: event.feature },
              }),
            );
          }
        });
        map.addInteraction(drawInteractionRef.current);
        addSnapInteraction();
        break;

      case "circle":
        drawInteractionRef.current = createCircleDraw(vectorSource, (event) => {
          if (onFeatureSelect && event.feature) {
            // Pause drawing and open properties panel in edit mode
            useToolStore.getState().setIsNewlyCreatedFeature(true);
            useToolStore.getState().pauseDrawing("circle");
            onFeatureSelect(event.feature);
            // Dispatch event to sync Select interaction for blue highlight
            window.dispatchEvent(
              new CustomEvent("featureDrawn", {
                detail: { feature: event.feature },
              }),
            );
          }
        });
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
              useToolStore.getState().pauseDrawing("arc");
              onFeatureSelect(event.feature);
              // Dispatch event to sync Select interaction for blue highlight
              window.dispatchEvent(
                new CustomEvent("featureDrawn", {
                  detail: { feature: event.feature },
                }),
              );
            }
          },
          lineColor,
          lineWidth,
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
              useToolStore.getState().pauseDrawing("revcloud");
              onFeatureSelect(event.feature);
              // Dispatch event to sync Select interaction for blue highlight
              window.dispatchEvent(
                new CustomEvent("featureDrawn", {
                  detail: { feature: event.feature },
                }),
              );
            }
          },
          lineColor,
        );
        map.addInteraction(drawInteractionRef.current);
        addSnapInteraction();
        break;

      case "split":
        // Split interaction is managed in MapInteractions.tsx
        // No draw interaction needed here
        break;

      case "break":
        // Break interaction is managed in MapInteractions.tsx
        // No draw interaction needed here
        break;

      case "trim":
        // Trim interaction is managed in MapInteractions.tsx
        break;

      case "extend":
        // Extend interaction is managed in MapInteractions.tsx
        break;

      case "merge":
        // Merge interaction is managed in MapInteractions.tsx
        // No draw interaction needed here
        break;

      case "offset":
        // Offset interaction is managed in MapInteractions.tsx
        // No draw interaction needed here
        break;

      case "alignedDimension":
        // Aligned Dimension interaction is managed in MapInteractions.tsx
        // No draw interaction needed here
        break;

      case "linearDimension":
        // Linear Dimension interaction is managed in MapInteractions.tsx
        // No draw interaction needed here
        break;
      case "radiusDimension":
        // Radius Dimension interaction is managed in MapInteractions.tsx
        // No draw interaction needed here
        break;

      default: {
        // Handle quick-access icon tools (icon-tower, icon-chamber, etc.)
        const quickIconTool = TOOLS.find(
          (t) => t.id === activeTool && t.iconPath,
        );
        if (quickIconTool?.iconPath) {
          registerClickHandler(
            map,
            {
              toolId: activeTool,
              handlerKey: "QuickIconClickHandler",
              onClick: (coordinate) => {
                const feature = handleIconClick(
                  vectorSource,
                  coordinate,
                  quickIconTool.iconPath!,
                );
                if (feature && onFeatureSelect) {
                  useToolStore.getState().setIsNewlyCreatedFeature(true);
                  useToolStore.getState().pauseDrawing(activeTool);
                  onFeatureSelect(feature);
                  window.dispatchEvent(
                    new CustomEvent("featureDrawn", {
                      detail: { feature },
                    }),
                  );
                }
              },
            },
            vectorSource,
          );
        }
        break;
      }
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
      const viewport = map.getViewport();
      if (viewport) {
        viewport.style.cursor = "";
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
