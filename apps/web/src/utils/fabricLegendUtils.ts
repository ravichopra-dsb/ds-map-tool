import * as fabric from "fabric";
import type { LegendMetadata, LegendMetadataItem } from "./legendMetadataUtils";

const ROW_HEIGHT = 30;
const ICON_WIDTH = 60;
const ICON_HEIGHT = 24;
const PADDING = 12;
const TITLE_HEIGHT = 28;
const LABEL_FONT_SIZE = 12;
const TITLE_FONT_SIZE = 14;
const COL_GAP = 8;

/**
 * Attempt to load an SVG from the given path.
 * Returns a Fabric.js Group if successful, null if the file doesn't exist.
 */
async function loadSvg(
  svgPath: string,
): Promise<fabric.Group | null> {
  try {
    const response = await fetch(svgPath, { method: "HEAD" });
    if (!response.ok) return null;

    const result = await fabric.loadSVGFromURL(svgPath);
    if (!result.objects || result.objects.length === 0) return null;

    const validObjects = result.objects.filter(
      (obj): obj is fabric.FabricObject => obj !== null,
    );
    if (validObjects.length === 0) return null;

    return new fabric.Group(validObjects);
  } catch {
    return null;
  }
}

/**
 * Create a colored/dashed line sample as fallback for legend types without SVGs.
 */
function createLineSample(
  color: string,
  dash?: number[],
): fabric.Line {
  return new fabric.Line([0, 0, ICON_WIDTH, 0], {
    stroke: color || "#000000",
    strokeWidth: 2,
    strokeDashArray:
      dash && dash.length > 0 && dash.some((d) => d > 0) ? dash : undefined,
    selectable: false,
    evented: false,
  });
}

/**
 * Create a placeholder rectangle when SVG is missing for icon types.
 */
function createPlaceholderIcon(): fabric.Rect {
  return new fabric.Rect({
    width: ICON_HEIGHT,
    height: ICON_HEIGHT,
    fill: "#cccccc",
    stroke: "#999999",
    strokeWidth: 1,
    selectable: false,
    evented: false,
  });
}

/**
 * Build the visual element for a single legend row (SVG or fallback).
 */
async function buildRowIcon(
  item: LegendMetadataItem,
): Promise<fabric.FabricObject> {
  const svgGroup = await loadSvg(item.svgPath);

  if (svgGroup) {
    const svgWidth = svgGroup.width || ICON_WIDTH;
    const svgHeight = svgGroup.height || ICON_HEIGHT;
    const scale = Math.min(ICON_WIDTH / svgWidth, ICON_HEIGHT / svgHeight);
    svgGroup.set({
      scaleX: scale,
      scaleY: scale,
      selectable: false,
      evented: false,
    });
    return svgGroup;
  }

  // Fallback
  if (item.type === "legend" && item.strokeColor) {
    return createLineSample(item.strokeColor, item.strokeDash);
  }
  return createPlaceholderIcon();
}

export interface FabricLegendOptions {
  left?: number;
  top?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

/**
 * Build a Fabric.js Group representing the map legend.
 * Loads SVGs where available, uses colored line / placeholder fallbacks otherwise.
 * Returns null if no items.
 *
 * All child positions use center-origin coords so the Fabric.js Group
 * bounding box calculation works correctly.
 */
export async function buildFabricLegend(
  metadata: LegendMetadata,
  options?: FabricLegendOptions,
): Promise<fabric.Group | null> {
  if (!metadata.items.length) return null;

  const objects: fabric.FabricObject[] = [];

  // Measure max label width using a temporary canvas for accurate text measurement
  const measureCanvas = document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  let maxLabelWidth = 100;
  if (ctx) {
    ctx.font = `${LABEL_FONT_SIZE}px Arial, sans-serif`;
    for (const item of metadata.items) {
      const measured = ctx.measureText(item.label).width;
      if (measured > maxLabelWidth) maxLabelWidth = measured;
    }
  } else {
    maxLabelWidth = Math.max(
      ...metadata.items.map((item) => item.label.length * 8),
      100,
    );
  }
  const contentWidth = PADDING + ICON_WIDTH + COL_GAP + maxLabelWidth + PADDING;
  const totalHeight =
    PADDING + TITLE_HEIGHT + metadata.items.length * ROW_HEIGHT + PADDING;

  // Fabric.js Group uses center-origin for children.
  // Convert absolute top-left positions to center-relative coordinates.
  const cx = contentWidth / 2;
  const cy = totalHeight / 2;

  // Background
  objects.push(
    new fabric.Rect({
      left: 0,
      top: 0,
      width: contentWidth,
      height: totalHeight,
      fill: "#ffffff",
      stroke: "#000000",
      strokeWidth: 1.5,
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    }),
  );

  // Title
  objects.push(
    new fabric.FabricText("LEGEND:-", {
      left: PADDING - cx,
      top: PADDING - cy,
      fontSize: TITLE_FONT_SIZE,
      fontWeight: "bold",
      fontFamily: "Arial, sans-serif",
      fill: "#000000",
      underline: true,
      originX: "left",
      originY: "top",
      selectable: false,
      evented: false,
    }),
  );

  // Rows
  for (let i = 0; i < metadata.items.length; i++) {
    const item = metadata.items[i];
    const rowY = PADDING + TITLE_HEIGHT + i * ROW_HEIGHT;
    const iconCenterY = rowY + ROW_HEIGHT / 2;

    // Build icon/symbol
    const icon = await buildRowIcon(item);
    icon.set({
      left: PADDING - cx,
      top: iconCenterY - cy,
      originX: "left",
      originY: "center",
    });
    objects.push(icon);

    // Label text
    objects.push(
      new fabric.FabricText(item.label, {
        left: PADDING + ICON_WIDTH + COL_GAP - cx,
        top: iconCenterY - cy,
        fontSize: LABEL_FONT_SIZE,
        fontFamily: "Arial, sans-serif",
        fill: "#000000",
        originX: "left",
        originY: "center",
        selectable: false,
        evented: false,
      }),
    );
  }

  // Position: default to bottom-right if canvas dimensions are provided
  const margin = 20;
  let legendLeft = options?.left ?? margin;
  let legendTop = options?.top ?? margin;

  if (options?.canvasWidth && options?.canvasHeight) {
    legendLeft = options.left ?? (options.canvasWidth - contentWidth - margin);
    legendTop = options.top ?? (options.canvasHeight - totalHeight - margin);
  }

  // Create the legend group
  const group = new fabric.Group(objects, {
    left: legendLeft,
    top: legendTop,
    selectable: true,
    evented: true,
  });

  // Mark for identification (same pattern as isMapImage in LayoutCanvas)
  (group as fabric.Group & { isLegendGroup?: boolean }).isLegendGroup = true;

  return group;
}
