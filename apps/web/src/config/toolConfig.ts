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
  break: {
    id: "break",
    name: "Break",
    description: "Break LineString features by clicking on them",
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