/**
 * Cursor utility functions for generating tool-specific cursors
 * Supports SVG-based cursors with proper hotspot positioning
 */

import { ICON_SVGS, svgToBase64DataUrl } from "./iconSvgData";

/**
 * Cursor hotspot configuration
 * Defines where the actual click point is on the cursor
 */
interface CursorConfig {
  svg: string;
  hotspotX: number;
  hotspotY: number;
}

/**
 * Create a data URL cursor from an SVG string with hotspot
 */
const createCursor = (config: CursorConfig): string => {
  const dataUrl = svgToBase64DataUrl(config.svg);
  return `url('${dataUrl}') ${config.hotspotX} ${config.hotspotY}, auto`;
};

/**
 * Overlay a small icon on a crosshair SVG
 * Used for click-based tools like Triangle, Pit, etc.
 */
const createCrosshairWithIcon = (toolIconSvg: string): string => {
  // Create a larger canvas to composite the icons
  const composite = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <!-- Crosshair in the background -->
    <line x1="16" y1="2" x2="16" y2="8" stroke="#ff0000" stroke-width="1.5"/>
    <line x1="16" y1="24" x2="16" y2="30" stroke="#ff0000" stroke-width="1.5"/>
    <line x1="2" y1="16" x2="8" y2="16" stroke="#ff0000" stroke-width="1.5"/>
    <line x1="24" y1="16" x2="30" y2="16" stroke="#ff0000" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="2.5" fill="#ff0000"/>

    <!-- Small tool icon in bottom-right corner -->
    <g transform="translate(18, 18) scale(0.6)">
      ${toolIconSvg.replace(/<svg[^>]*>|<\/svg>/g, "")}
    </g>
  </svg>`;

  return createCursor({
    svg: composite,
    hotspotX: 16,
    hotspotY: 16,
  });
};

/**
 * Create cursor from just the tool icon
 */
const createIconCursor = (toolIconSvg: string): string => {
  return createCursor({
    svg: toolIconSvg,
    hotspotX: 12,
    hotspotY: 12,
  });
};

/**
 * Cursor mappings for all tools
 * Maps tool IDs to their cursor CSS values
 */
const TOOL_CURSORS: Record<string, string> = {};

/**
 * Initialize cursor mappings
 * Called once on module load
 */
const initializeCursors = () => {
  if (Object.keys(TOOL_CURSORS).length > 0) return; // Already initialized

  // Drawing Tools - Icon-based cursors
  TOOL_CURSORS.point = createIconCursor(ICON_SVGS.point);
  TOOL_CURSORS.polyline = createIconCursor(ICON_SVGS.polyline);
  TOOL_CURSORS.freehand = createIconCursor(ICON_SVGS.freehand);
  TOOL_CURSORS.arrow = createIconCursor(ICON_SVGS.arrow);
  TOOL_CURSORS.text = createIconCursor(ICON_SVGS.text);
  TOOL_CURSORS.measure = createIconCursor(ICON_SVGS.measure);
  TOOL_CURSORS.box = createIconCursor(ICON_SVGS.box);
  TOOL_CURSORS.circle = createIconCursor(ICON_SVGS.circle);
  TOOL_CURSORS.arc = createIconCursor(ICON_SVGS.arc);
  TOOL_CURSORS.revcloud = createIconCursor(ICON_SVGS.revcloud);
  TOOL_CURSORS.legends = createIconCursor(ICON_SVGS.legends);

  // Click-based Symbol Tools - Crosshair with icon overlay
  TOOL_CURSORS.icons = createCrosshairWithIcon(ICON_SVGS.icons);

  // Edit/Utility Tools - Standard CSS cursors
  TOOL_CURSORS.select = "pointer";
  TOOL_CURSORS.transform = "move";
  TOOL_CURSORS.hand = "grab";
  TOOL_CURSORS.split = createIconCursor(ICON_SVGS.split);
  TOOL_CURSORS.merge = createIconCursor(ICON_SVGS.merge);
  TOOL_CURSORS.offset = createIconCursor(ICON_SVGS.offset);
};

/**
 * Get cursor for a specific tool
 * @param toolId - The tool ID (e.g., 'point', 'triangle', 'select')
 * @returns CSS cursor value (can be used with element.style.cursor)
 */
export const getCursorForTool = (toolId: string): string => {
  initializeCursors();
  return TOOL_CURSORS[toolId] || "auto";
};

/**
 * Get all available tool cursors
 * @returns Record mapping tool IDs to cursor CSS values
 */
export const getAllToolCursors = (): Record<string, string> => {
  initializeCursors();
  return { ...TOOL_CURSORS };
};

/**
 * Check if a tool has a custom cursor defined
 * @param toolId - The tool ID
 * @returns True if a custom cursor exists for this tool
 */
export const hasCustomCursor = (toolId: string): boolean => {
  initializeCursors();
  return toolId in TOOL_CURSORS && TOOL_CURSORS[toolId] !== "auto";
};

/**
 * Apply cursor to a map or DOM element
 * @param element - DOM element to apply cursor to
 * @param toolId - Tool ID
 */
export const applyToolCursor = (element: HTMLElement | null, toolId: string): void => {
  if (!element) return;
  const cursor = getCursorForTool(toolId);
  element.style.cursor = cursor;
};

/**
 * Reset cursor to default
 * @param element - DOM element to reset cursor
 */
export const resetCursor = (element: HTMLElement | null): void => {
  if (!element) return;
  element.style.cursor = "auto";
};

/**
 * Export cursor utility for testing or direct usage
 */
export const cursorUtils = {
  getCursorForTool,
  getAllToolCursors,
  hasCustomCursor,
  applyToolCursor,
  resetCursor,
};
