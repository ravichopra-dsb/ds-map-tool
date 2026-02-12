import { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import type Map from "ol/Map";
import type { Feature } from "ol";
import type { Geometry } from "ol/geom";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LineStyleEditor, IconStyleEditor } from "./PropertiesPanel";
import { supportsCustomLineStyle, DEFAULT_LINE_STYLE } from "@/utils/featureTypeUtils";
import type { LegendType } from "@/tools/legendsConfig";

interface FolderPropertiesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  folderName: string;
  features: Feature<Geometry>[];
  map: Map | null;
  onSaveMapState?: () => void;
}

export function FolderPropertiesDialog({
  isOpen,
  onClose,
  folderName,
  features,
  map,
  onSaveMapState,
}: FolderPropertiesDialogProps) {
  // Line style state
  const [lineColor, setLineColor] = useState<string>(DEFAULT_LINE_STYLE.color);
  const [lineWidth, setLineWidth] = useState<number>(DEFAULT_LINE_STYLE.width);
  const [lineOpacity, setLineOpacity] = useState(1);
  const [legendType, setLegendType] = useState<string | null>(null);

  // Icon style state
  const [iconOpacity, setIconOpacity] = useState(1);
  const [iconScale, setIconScale] = useState(1);
  const [labelScale, setLabelScale] = useState(1);
  const [textOffsetX, setTextOffsetX] = useState(0);
  const [textOffsetY, setTextOffsetY] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [showLabel, setShowLabel] = useState(true);
  const [iconSrc, setIconSrc] = useState("");

  // Classify features
  const { lineFeatures, iconFeatures } = useMemo(() => {
    const line: Feature<Geometry>[] = [];
    const icon: Feature<Geometry>[] = [];
    for (const f of features) {
      if (supportsCustomLineStyle(f)) line.push(f);
      if (f.get("isIcon") === true) icon.push(f);
    }
    return { lineFeatures: line, iconFeatures: icon };
  }, [features]);

  const hasLineFeatures = lineFeatures.length > 0;
  const hasIconFeatures = iconFeatures.length > 0;

  // Line style adapter (matches LineStyleEditorProps interface)
  const handleColorChange = useCallback((color: string) => setLineColor(color), []);
  const handleWidthChange = useCallback((width: number) => setLineWidth(width), []);
  const handleLineOpacityChange = useCallback((opacity: number) => setLineOpacity(opacity), []);
  const handleLegendTypeChange = useCallback((legend: LegendType) => {
    setLegendType(legend.id);
  }, []);

  const lineStyleAdapter = {
    lineColor,
    lineWidth,
    opacity: lineOpacity,
    legendType,
    handleColorChange,
    handleWidthChange,
    handleOpacityChange: handleLineOpacityChange,
    handleLegendTypeChange,
    setLineColor,
  };

  // Icon style adapter (matches IconStyleEditorProps interface)
  const iconPropertiesAdapter = {
    opacity: iconOpacity,
    iconScale,
    labelScale,
    textOffsetX,
    textOffsetY,
    rotation,
    showLabel,
    iconSrc,
    handleOpacityChange: useCallback((v: number) => setIconOpacity(v), []),
    handleIconScaleChange: useCallback((v: number) => setIconScale(v), []),
    handleLabelScaleChange: useCallback((v: number) => setLabelScale(v), []),
    handleTextOffsetXChange: useCallback((v: number) => setTextOffsetX(v), []),
    handleTextOffsetYChange: useCallback((v: number) => setTextOffsetY(v), []),
    handleRotationChange: useCallback((v: number) => setRotation(v), []),
    handleShowLabelChange: useCallback((v: boolean) => setShowLabel(v), []),
    handleIconChange: useCallback((iconPath: string) => setIconSrc(iconPath), []),
  };

  const handleApply = () => {
    // Apply line styles to all line features
    for (const feature of lineFeatures) {
      feature.set("lineColor", lineColor);
      feature.set("lineWidth", lineWidth);
      feature.set("opacity", lineOpacity);
      if (legendType) {
        feature.set("legendType", legendType);
        feature.set("islegends", true);
      }
      feature.changed();
    }

    // Apply icon styles to all icon features
    for (const feature of iconFeatures) {
      if (iconSrc) feature.set("iconPath", iconSrc);
      feature.set("opacity", iconOpacity);
      feature.set("iconScale", iconScale);
      feature.set("labelScale", labelScale);
      feature.set("textOffsetX", textOffsetX);
      feature.set("textOffsetY", textOffsetY);
      feature.set("iconRotation", rotation);
      feature.set("showLabel", showLabel);
      feature.changed();
    }

    map?.render();
    onSaveMapState?.();
    onClose();
  };

  if (!isOpen || (!hasLineFeatures && !hasIconFeatures)) return null;

  return createPortal(
    <div className="absolute right-4 top-30 w-80 max-h-[calc(100vh-160px)] rounded-lg overflow-y-auto overflow-x-hidden custom-scrollbar bg-white dark:bg-slate-800 shadow-2xl border-l border-gray-200 dark:border-slate-700 z-30 transform transition-transform duration-300 ease-in-out">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-linear-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
              {folderName}
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Folder Properties
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="h-6 w-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-slate-700"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
          {/* Line Style Section */}
          {hasLineFeatures && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Line Style ({lineFeatures.length} feature{lineFeatures.length !== 1 ? "s" : ""})
              </h4>
              <LineStyleEditor lineStyle={lineStyleAdapter} />
            </div>
          )}

          {/* Icon Style Section */}
          {hasIconFeatures && (
            <div className={hasLineFeatures ? "border-t border-gray-100 dark:border-slate-700 pt-4 mt-4" : ""}>
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Icon Style ({iconFeatures.length} feature{iconFeatures.length !== 1 ? "s" : ""})
              </h4>
              <IconStyleEditor iconProperties={iconPropertiesAdapter} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 dark:border-slate-700 bg-linear-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-3 w-3" />
            Cancel
          </Button>
          <Button variant="default" size="sm" onClick={handleApply}>
            <Save className="h-3 w-3" />
            Apply
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
