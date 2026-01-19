import { handleTriangleClick } from "@/icons/Triangle";
import { handlePitClick } from "@/icons/Pit";
import { handleGPClick } from "@/icons/Gp";
import { handleJunctionClick } from "@/icons/JunctionPoint";
import { handleTowerClickFromSvg } from "@/icons/Tower";
// Text tool handler is managed in ToolManager.tsx

/**
 * Tool configuration interface
 */
export interface ToolConfig {
  id: string;
  name: string;
  description?: string;
  requiresDrawInteraction?: boolean;
  requiresClickHandler?: boolean;
  requiresCopyPasteInteraction?: boolean;
  drawType?: "Point" | "LineString" | "Polygon" | "MultiLineString" | "MultiPolygon";
  freehand?: boolean;
  clickHandler?: (coordinate: number[], vectorSource: any) => void;
  clickHandlerKey?: string;
  transformEnabled?: boolean;
  modifyDisabled?: boolean;
  selectDisabled?: boolean;
}

/**
 * Tower configuration for SVG path and scaling
 */
export const TOWER_CONFIG = {
  svgPath: `M11.8545,6.4336l-.4131-.2813a4.7623,4.7623,0,0,0,.2813-4.8779l-.0835-.1533L12.0747.875l.0908.167a5.2619,5.2619,0,0,1-.311,5.3916Zm1.1521,7.1316V14h-11v-.4348H4.4952L6.0439,6.4a.5.5,0,0,1,.4888-.3945h.7255V4.6014A1.14,1.14,0,0,1,6.3756,3.5a1.1568,1.1568,0,1,1,2.3136,0,1.14,1.14,0,0,1-.931,1.1112V6.0059h.7223A.5.5,0,0,1,8.9692,6.4l1.5478,7.1648ZM8.4543,8.751H6.5588L6.236,10.2441H8.777ZM6.1279,10.7441l-.3233,1.4952H9.2082l-.3231-1.4952ZM6.936,7.0059,6.6669,8.251H8.3463L8.0771,7.0059ZM5.5179,13.5652H9.4948l-.1786-.8259h-3.62ZM5.21,5.0137a2.7523,2.7523,0,0,1,.0161-3.0518L4.812,1.6826a3.25,3.25,0,0,0-.019,3.6065ZM10.7568,3.5a3.2433,3.2433,0,0,0-.5341-1.7861l-.418.2754a2.7517,2.7517,0,0,1-.0176,3.0488l.4141.2793A3.2341,3.2341,0,0,0,10.7568,3.5ZM3.5342,6.1182A4.7637,4.7637,0,0,1,3.3813,1.13L2.9478.88a5.2643,5.2643,0,0,0,.1694,5.5137Z`,
  scale: 15,
  strokeWidth: 1,
};

/**
 * Comprehensive tool configuration
 */
export const TOOLS_CONFIG: Record<string, ToolConfig> = {
  point: {
    id: "point",
    name: "Point",
    requiresDrawInteraction: true,
    drawType: "Point",
  },
  polyline: {
    id: "polyline",
    name: "Polyline",
    requiresDrawInteraction: true,
    drawType: "LineString",
  },
  freehand: {
    id: "freehand",
    name: "Freehand",
    requiresDrawInteraction: true,
    drawType: "LineString",
    freehand: true,
  },
  arrow: {
    id: "arrow",
    name: "Arrow",
    requiresDrawInteraction: true,
    drawType: "LineString",
  },
  legends: {
    id: "legends",
    name: "Legends",
    requiresDrawInteraction: true,
    drawType: "LineString",
    description: "Requires selected legend to be active",
  },
  triangle: {
    id: "triangle",
    name: "Triangle",
    requiresClickHandler: true,
    clickHandler: (coordinate, vectorSource) => {
      handleTriangleClick(vectorSource, coordinate);
    },
    clickHandlerKey: "triangleClickHandler",
  },
  pit: {
    id: "pit",
    name: "Pit",
    requiresClickHandler: true,
    clickHandler: (coordinate, vectorSource) => {
      handlePitClick(vectorSource, coordinate);
    },
    clickHandlerKey: "PitClickHandler",
  },
  gp: {
    id: "gp",
    name: "GP",
    requiresClickHandler: true,
    clickHandler: (coordinate, vectorSource) => {
      handleGPClick(vectorSource, coordinate);
    },
    clickHandlerKey: "GpClickHandler",
  },
  junction: {
    id: "junction",
    name: "Junction Point",
    requiresClickHandler: true,
    clickHandler: (coordinate, vectorSource) => {
      handleJunctionClick(vectorSource, coordinate);
    },
    clickHandlerKey: "JuctionPointClickHandler",
  },
  tower: {
    id: "tower",
    name: "Tower",
    requiresClickHandler: true,
    clickHandler: (coordinate, vectorSource) => {
      handleTowerClickFromSvg(
        vectorSource,
        coordinate,
        TOWER_CONFIG.svgPath,
        TOWER_CONFIG.scale,
        TOWER_CONFIG.strokeWidth
      );
    },
    clickHandlerKey: "TowerClickHandler",
  },
  text: {
    id: "text",
    name: "Text",
    requiresClickHandler: true,
    // Note: The click handler is managed in ToolManager.tsx for dialog integration
    clickHandler: (coordinate) => {
      // This will be handled in ToolManager.tsx to show dialog first
      console.log("Text tool clicked at:", coordinate);
    },
    clickHandlerKey: "TextClickHandler",
  },
  select: {
    id: "select",
    name: "Select",
    transformEnabled: false,
    modifyDisabled: false,
    selectDisabled: false,
  },
  transform: {
    id: "transform",
    name: "Transform",
    transformEnabled: true,
    modifyDisabled: true,
    selectDisabled: false,
  },
  hand: {
    id: "hand",
    name: "Hand",
    selectDisabled: true,
    modifyDisabled: false,
  },
  split: {
    id: "split",
    name: "Split",
    description: "Split LineString features by clicking on them",
    selectDisabled: true,
    modifyDisabled: true,
  },
  merge: {
    id: "merge",
    name: "Merge",
    description: "Merge LineString features by dragging endpoints together",
    selectDisabled: false,
    modifyDisabled: false,
  },
  offset: {
    id: "offset",
    name: "Offset",
    description: "Create parallel copies of LineString features by dragging. Hold Ctrl to duplicate.",
    selectDisabled: true,
    modifyDisabled: true,
  },
  icons: {
    id: "icons",
    name: "Icons",
    requiresClickHandler: true,
    clickHandlerKey: "IconClickHandler",
    description: "Requires selected icon to be active",
  },
  box: {
    id: "box",
    name: "Box",
    requiresDrawInteraction: true,
    drawType: "Polygon",
    modifyDisabled: true,
    description: "Draw rectangular box shapes",
  },
  circle: {
    id: "circle",
    name: "Circle",
    requiresDrawInteraction: true,
    drawType: "Polygon",
    modifyDisabled: true,
    description: "Draw circle shapes",
  },
  arc: {
    id: "arc",
    name: "Arc",
    requiresDrawInteraction: true,
    drawType: "LineString",
    description: "Draw 3-point arc (start, through, end)",
  },
  revcloud: {
    id: "revcloud",
    name: "Revision Cloud",
    requiresDrawInteraction: true,
    drawType: "Polygon",
    freehand: true,
    description: "Draw freehand revision cloud with scalloped edges",
  },
};

/**
 * Get tool configuration by ID
 * @param toolId - Tool identifier
 * @returns Tool configuration or undefined if not found
 */
export const getToolConfig = (toolId: string): ToolConfig | undefined => {
  return TOOLS_CONFIG[toolId];
};

/**
 * Get all available tool configurations
 * @returns Array of tool configurations
 */
export const getAllTools = (): ToolConfig[] => {
  return Object.values(TOOLS_CONFIG);
};

/**
 * Get tools that require draw interactions
 * @returns Array of tool configurations that need draw interactions
 */
export const getDrawTools = (): ToolConfig[] => {
  return getAllTools().filter((tool) => tool.requiresDrawInteraction);
};

/**
 * Get tools that require click handlers
 * @returns Array of tool configurations that need click handlers
 */
export const getClickHandlerTools = (): ToolConfig[] => {
  return getAllTools().filter((tool) => tool.requiresClickHandler);
};

/**
 * Get tools that require copy-paste interactions
 * @returns Array of tool configurations that need copy-paste interactions
 */
export const getCopyPasteTools = (): ToolConfig[] => {
  return getAllTools().filter((tool) => tool.requiresCopyPasteInteraction);
};

/**
 * Check if a tool exists
 * @param toolId - Tool identifier
 * @returns True if tool exists
 */
export const toolExists = (toolId: string): boolean => {
  return toolId in TOOLS_CONFIG;
};

/**
 * Get tools that should disable select interaction
 * @returns Array of tool IDs that disable select
 */
export const getSelectDisabledTools = (): string[] => {
  return getAllTools()
    .filter((tool) => tool.selectDisabled)
    .map((tool) => tool.id);
};

/**
 * Get tools that should disable modify interaction
 * @returns Array of tool IDs that disable modify
 */
export const getModifyDisabledTools = (): string[] => {
  return getAllTools()
    .filter((tool) => tool.modifyDisabled)
    .map((tool) => tool.id);
};