/**
 * SVG icon data for all tools
 * Supports both custom SVGs and Lucide icons for cursor generation
 */

import {
  MousePointer2,
  Type,
  Circle,
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
  // Symbol Tools
  triangle: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <polygon points="12,3 20,20 4,20" fill="#cccccc" stroke="#000000" stroke-width="1.5"/>
  </svg>`,

  pit: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <line x1="12" y1="4" x2="12" y2="20" stroke="#ff0000" stroke-width="2"/>
    <line x1="4" y1="12" x2="20" y2="12" stroke="#ff0000" stroke-width="2"/>
  </svg>`,

  gp: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="8" fill="rgba(147,51,234,0.3)" stroke="#000000" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="2" fill="#000000"/>
  </svg>`,

  junction: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="8" width="8" height="8" fill="#ff0000" stroke="#000000" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="1.5" fill="#000000"/>
  </svg>`,

  tower: `<svg
    xmlns="http://www.w3.org/2000/svg"
    fill="#000000"
    width="800px"
    height="800px"
    viewBox="0 0 15 15"
  >
    <path d="M11.8545,6.4336l-.4131-.2813a4.7623,4.7623,0,0,0,.2813-4.8779l-.0835-.1533L12.0747.875l.0908.167a5.2619,5.2619,0,0,1-.311,5.3916Zm1.1521,7.1316V14h-11v-.4348H4.4952L6.0439,6.4a.5.5,0,0,1,.4888-.3945h.7255V4.6014A1.14,1.14,0,0,1,6.3756,3.5a1.1568,1.1568,0,1,1,2.3136,0,1.14,1.14,0,0,1-.931,1.1112V6.0059h.7223A.5.5,0,0,1,8.9692,6.4l1.5478,7.1648ZM8.4543,8.751H6.5588L6.236,10.2441H8.777ZM6.1279,10.7441l-.3233,1.4952H9.2082l-.3231-1.4952ZM6.936,7.0059,6.6669,8.251H8.3463L8.0771,7.0059ZM5.5179,13.5652H9.4948l-.1786-.8259h-3.62ZM5.21,5.0137a2.7523,2.7523,0,0,1,.0161-3.0518L4.812,1.6826a3.25,3.25,0,0,0-.019,3.6065ZM10.7568,3.5a3.2433,3.2433,0,0,0-.5341-1.7861l-.418.2754a2.7517,2.7517,0,0,1-.0176,3.0488l.4141.2793A3.2341,3.2341,0,0,0,10.7568,3.5ZM3.5342,6.1182A4.7637,4.7637,0,0,1,3.3813,1.13L2.9478.88a5.2643,5.2643,0,0,0,.1694,5.5137Z" />
  </svg>`,

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
  // point: Circle,
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
  triangle: { source: "custom", svg: CUSTOM_SVGS.triangle },
  pit: { source: "custom", svg: CUSTOM_SVGS.pit },
  gp: { source: "custom", svg: CUSTOM_SVGS.gp },
  junction: { source: "custom", svg: CUSTOM_SVGS.junction },
  tower: { source: "custom", svg: CUSTOM_SVGS.tower },
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
