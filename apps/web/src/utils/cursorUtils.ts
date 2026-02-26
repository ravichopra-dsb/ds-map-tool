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
  // Extract the inner content of the SVG (strip the <svg> wrapper)
  const innerContent = toolIconSvg.replace(/<svg[^>]*>|<\/svg>/g, "");

  // Check if this is a Lucide icon (has fill="none" and stroke="currentColor" on root)
  const isLucide =
    toolIconSvg.includes('stroke="currentColor"') && toolIconSvg.includes('fill="none"');

  // For Lucide icons: apply stroke/fill attributes that were on the stripped <svg> tag
  // For custom icons: pass through as-is
  const gAttrs = isLucide
    ? 'fill="none" stroke="#000000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"'
    : "";

  // White outline behind the icon for visibility on any background
  const gOutlineAttrs = isLucide
    ? 'fill="none" stroke="#000000" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"'
    : "";

  const composite = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <!-- Crosshair -->
    <line x1="16" y1="2" x2="16" y2="8" stroke="#ff0000" stroke-width="1.5"/>
    <line x1="16" y1="24" x2="16" y2="30" stroke="#ff0000" stroke-width="1.5"/>
    <line x1="2" y1="16" x2="8" y2="16" stroke="#ff0000" stroke-width="1.5"/>
    <line x1="24" y1="16" x2="30" y2="16" stroke="#ff0000" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="2.5" fill="#ff0000"/>

    <!-- Tool icon in bottom-right corner -->
    ${gOutlineAttrs ? `<g transform="translate(17, 17) scale(0.55)" ${gOutlineAttrs}>${innerContent}</g>` : ""}
    <g transform="translate(17, 17) scale(0.55)" ${gAttrs}>
      ${innerContent}
    </g>
  </svg>`;

  return createCursor({
    svg: composite,
    hotspotX: 16,
    hotspotY: 16,
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

  // Drawing Tools - Crosshair with tool icon overlay
  TOOL_CURSORS.point = createCrosshairWithIcon(ICON_SVGS.point);
  TOOL_CURSORS.polyline = createCrosshairWithIcon(ICON_SVGS.polyline);
  TOOL_CURSORS.freehand = createCrosshairWithIcon(ICON_SVGS.freehand);
  TOOL_CURSORS.arrow = createCrosshairWithIcon(ICON_SVGS.arrow);
  TOOL_CURSORS.text = createCrosshairWithIcon(ICON_SVGS.text);
  TOOL_CURSORS.measure = createCrosshairWithIcon(ICON_SVGS.measure);
  TOOL_CURSORS.box = createCrosshairWithIcon(ICON_SVGS.box);
  TOOL_CURSORS.circle = createCrosshairWithIcon(ICON_SVGS.circle);
  TOOL_CURSORS.arc = createCrosshairWithIcon(ICON_SVGS.arc);
  TOOL_CURSORS.revcloud = createCrosshairWithIcon(ICON_SVGS.revcloud);
  TOOL_CURSORS.legends = createCrosshairWithIcon(ICON_SVGS.legends);

  // Click-based Symbol Tools - Crosshair with icon overlay
  TOOL_CURSORS.icons = createCrosshairWithIcon(ICON_SVGS.icons);

  // Edit/Utility Tools
  TOOL_CURSORS.select = "pointer";
  TOOL_CURSORS.transform = "move";
  TOOL_CURSORS.hand = "grab";
  TOOL_CURSORS.split = createCrosshairWithIcon(ICON_SVGS.split);
  TOOL_CURSORS.trim = createCrosshairWithIcon(ICON_SVGS.split);
  TOOL_CURSORS.merge = createCrosshairWithIcon(ICON_SVGS.merge);
  TOOL_CURSORS.offset = createCrosshairWithIcon(ICON_SVGS.offset);
};

/**
 * Get cursor for a specific tool
 * @param toolId - The tool ID (e.g., 'point', 'triangle', 'select')
 * @returns CSS cursor value (can be used with element.style.cursor)
 */
export const getCursorForTool = (toolId: string): string => {
  initializeCursors();
  // Quick-access icon tools (icon-tower, icon-chamber, etc.) use the same cursor as "icons"
  if (toolId.startsWith("icon-") && TOOL_CURSORS["icons"]) {
    return TOOL_CURSORS["icons"];
  }
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
