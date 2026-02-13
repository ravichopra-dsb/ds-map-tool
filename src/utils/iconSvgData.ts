/**
 * SVG icon data for all tools
 * Supports both custom SVGs and Lucide icons for cursor generation
 */

import {
  MousePointer2,
  Type,
  Pencil,
  Slash,
  ArrowUp,
  Minus,
  Move,
  RulerDimensionLine,
  MapPin,
  Scissors,
  Spline,
  CopySlash,
  Square,
  CircleDot,
  Merge,
  Cloud,
  HandGrab,
  Circle,
} from "lucide-static";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Icon source type discriminator
 */
export type IconSource = "custom" | "lucide";

/**
 * Base icon definition
 */
export interface BaseIconDefinition {
  source: IconSource;
}

/**
 * Custom SVG icon definition
 */
export interface CustomIconDefinition extends BaseIconDefinition {
  source: "custom";
  svg: string;
}

/**
 * Lucide icon definition
 */
export interface LucideIconDefinition extends BaseIconDefinition {
  source: "lucide";
  svg: string;
}

/**
 * Union type for all icon definitions
 */
export type IconDefinition = CustomIconDefinition | LucideIconDefinition;

/**
 * Icon registry mapping tool IDs to icon definitions
 */
export type IconRegistry = Record<string, IconDefinition>;

// ============================================================================
// CUSTOM SVG ICONS
// ============================================================================

/**
 * Custom-designed SVG icons for specialized tools
 * Sized at 24x24px for optimal cursor usage
 */
export const CUSTOM_SVGS: Record<string, string> = {
  legends: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <line x1="3" y1="12" x2="21" y2="12" stroke="#000000" stroke-width="2"/>
  </svg>`,
};

// ============================================================================
// LUCIDE ICON IMPORTS
// ============================================================================

/**
 * Lucide icons imported as SVG strings
 * These are imported from lucide-static for zero-runtime overhead
 */
export const LUCIDE_ICONS: Record<string, string> = {
  // Standard tools using Lucide icons
  select: MousePointer2,
  text: Type,
  point: Circle,
  freehand: Pencil,
  polyline: Slash,
  arrow: ArrowUp,
  legends: Minus,
  transform: Move,
  measure: RulerDimensionLine,
  icons: MapPin,
  split: Scissors,
  arc: Spline,
  offset: CopySlash,
  box: Square,
  circle: CircleDot,
  merge: Merge,
  revcloud: Cloud,
  hand: HandGrab,
};

// ============================================================================
// UNIFIED ICON REGISTRY
// ============================================================================

/**
 * Main icon registry combining custom and Lucide icons
 * Maps tool IDs to their icon definitions with source tracking
 */
export const ICON_REGISTRY: IconRegistry = {
  // Custom icons - specialized designs
  measure: { source: "custom", svg: CUSTOM_SVGS.measure },

  // Lucide icons - standard tools
  select: { source: "lucide", svg: LUCIDE_ICONS.select },
  text: { source: "lucide", svg: LUCIDE_ICONS.text },
  point: { source: "lucide", svg: LUCIDE_ICONS.point },
  polyline: { source: "lucide", svg: LUCIDE_ICONS.polyline },
  freehand: { source: "lucide", svg: LUCIDE_ICONS.freehand },
  arrow: { source: "lucide", svg: LUCIDE_ICONS.arrow },
  legends: { source: "lucide", svg: LUCIDE_ICONS.legends },
  transform: { source: "custom", svg: CUSTOM_SVGS.transform },
  box: { source: "lucide", svg: LUCIDE_ICONS.box },
  circle: { source: "lucide", svg: LUCIDE_ICONS.circle },
  arc: { source: "lucide", svg: LUCIDE_ICONS.arc },
  revcloud: { source: "lucide", svg: LUCIDE_ICONS.revcloud },
  split: { source: "lucide", svg: LUCIDE_ICONS.split },
  merge: { source: "lucide", svg: LUCIDE_ICONS.merge },
  offset: { source: "lucide", svg: LUCIDE_ICONS.offset },
  hand: { source: "lucide", svg: LUCIDE_ICONS.hand },
  icons: { source: "lucide", svg: LUCIDE_ICONS.icons },
};

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * @deprecated Use ICON_REGISTRY instead
 * Maintained for backward compatibility with existing code (cursorUtils.ts)
 */
export const ICON_SVGS: Record<string, string> = {
  ...CUSTOM_SVGS,
  ...LUCIDE_ICONS,
};

// ============================================================================
// UTILITY FUNCTIONS FOR ICON ACCESS
// ============================================================================

/**
 * Get icon definition by tool ID
 */
export const getIconDefinition = (toolId: string): IconDefinition | undefined => {
  return ICON_REGISTRY[toolId];
};

/**
 * Get raw SVG string by tool ID
 */
export const getIconSvg = (toolId: string): string | undefined => {
  return ICON_REGISTRY[toolId]?.svg;
};

/**
 * Check if icon is from Lucide
 */
export const isLucideIcon = (toolId: string): boolean => {
  return ICON_REGISTRY[toolId]?.source === "lucide";
};

/**
 * Check if icon is custom
 */
export const isCustomIcon = (toolId: string): boolean => {
  return ICON_REGISTRY[toolId]?.source === "custom";
};


/**
 * Utility function to encode SVG as base64 data URL
 */
export const svgToDataUrl = (svg: string): string => {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");
  return `data:image/svg+xml;utf8,${encoded}`;
};

/**
 * Alternative: base64 encoding for better compatibility
 */
export const svgToBase64DataUrl = (svg: string): string => {
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
};
