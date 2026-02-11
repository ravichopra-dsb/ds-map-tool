import React, { useEffect, useState } from "react";
import type Map from "ol/Map";
import type Feature from "ol/Feature";
import type { Select } from "ol/interaction";
import {
  X,
  Edit2,
  Save,
  Plus,
  Trash2,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { useToolStore } from "@/stores/useToolStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { EditableSliderValue } from "@/components/ui/editable-slider-value";
import { DEFAULT_LINE_STYLE } from "@/utils/featureTypeUtils";
import {
  isProtectedProperty,
  isCalculatedProperty,
  formatLengthWithUnit,
  type LengthUnit,
} from "@/utils/propertyUtils";
import { getLength } from "ol/sphere";
import { usePropertiesPanel } from "@/hooks/usePropertiesPanel";
import { useLineStyleEditor } from "@/hooks/useLineStyleEditor";
import { useShapeStyleEditor } from "@/hooks/useShapeStyleEditor";
import { useIconPropertiesEditor } from "@/hooks/useIconPropertiesEditor";
import { usePointOpacityEditor } from "@/hooks/usePointOpacityEditor";
import { useTextStyleEditor } from "@/hooks/useTextStyleEditor";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import {
  ExpandableScreen,
  ExpandableScreenContent,
  ExpandableScreenTrigger,
} from "@/components/ui/expandable-screen";
import { LegendDropdown } from "./LegendDropdown";
import { getLegendById, type LegendType } from "@/tools/legendsConfig";
import { IconPickerDialog } from "./IconPickerDialog";

interface PropertiesPanelProps {
  map: Map | null;
  selectedFeature: Feature | null;
  onClose: () => void;
  onSave?: () => void;
  selectInteraction?: Select | null;
}

const COLOR_OPTIONS = [
  { name: "Green", color: "#00ff00" },
  { name: "Red", color: "#ff0000" },
  { name: "Yellow", color: "#ffff00" },
  { name: "Cyan", color: "#00ffff" },
  { name: "Blue", color: "#0000ff" },
  { name: "Magenta", color: "#ff00ff" },
  { name: "White", color: "#ffffff" },
  { name: "Black", color: "#000000" },
] as const;

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  map,
  selectedFeature,
  onClose,
  onSave,
  selectInteraction,
}) => {
  const properties = usePropertiesPanel(selectedFeature, map, onSave);
  const lineStyle = useLineStyleEditor(
    selectedFeature,
    map,
    selectInteraction ?? null,
    properties.isEditing,
  );
  const shapeStyle = useShapeStyleEditor(
    selectedFeature,
    map,
    selectInteraction ?? null,
    properties.isEditing,
  );
  const pointOpacity = usePointOpacityEditor(
    selectedFeature,
    map,
    selectInteraction ?? null,
    properties.isEditing,
  );
  const iconProperties = useIconPropertiesEditor(
    selectedFeature,
    map,
    selectInteraction ?? null,
    properties.isEditing,
  );
  const textStyle = useTextStyleEditor(
    selectedFeature,
    map,
    selectInteraction ?? null,
    properties.isEditing,
  );

  // Validation error state
  const [nameError, setNameError] = useState<string | null>(null);

  // Auto-enable edit mode when it's a newly created feature
  useEffect(() => {
    const { isNewlyCreatedFeature } = useToolStore.getState();
    if (isNewlyCreatedFeature && selectedFeature) {
      properties.setIsEditing(true);
    }
  }, [selectedFeature, properties]);

  // Clear error when feature changes or editing starts
  useEffect(() => {
    setNameError(null);
  }, [selectedFeature, properties.isEditing]);

  // Local state for length unit (syncs with feature)
  const [lengthUnit, setLengthUnit] = React.useState<LengthUnit>(
    (selectedFeature?.get("lengthUnit") as LengthUnit) || "km",
  );

  // Sync length unit when feature changes
  React.useEffect(() => {
    if (selectedFeature) {
      setLengthUnit((selectedFeature.get("lengthUnit") as LengthUnit) || "km");
    }
  }, [selectedFeature]);

  // Handle length unit change
  const handleLengthUnitChange = (unit: LengthUnit) => {
    if (!selectedFeature) return;

    const lengthProp = properties.customProperties.find(
      (p) => p.key === "length",
    );
    const geometry = selectedFeature.getGeometry();

    if (lengthProp && geometry) {
      // Get actual length from geometry (always in meters)
      const meters = getLength(geometry);
      const newValue = formatLengthWithUnit(meters, unit);

      // Update local state immediately for UI
      setLengthUnit(unit);

      // Update the feature's lengthUnit property
      selectedFeature.set("lengthUnit", unit);

      // Trigger style recalculation for measure label update
      selectedFeature.changed();

      // Update the displayed value
      properties.updateProperty(lengthProp.id, "value", newValue);

      // Trigger save to persist
      onSave?.();
    }
  };

  // Get current label property value
  const currentLabel =
    properties.customProperties.find((p) => p.key === "label")?.value || "name";

  const handleLabelSelect = (propertyKey: string) => {
    // Find the label property and update its value
    const labelProp = properties.customProperties.find(
      (p) => p.key === "label",
    );
    if (labelProp) {
      properties.updateProperty(labelProp.id, "value", propertyKey);
    }
  };

  const handleSave = () => {
    // Validate name field for newly created features
    const { isNewlyCreatedFeature } = useToolStore.getState();
    const nameProp = properties.customProperties.find((p) => p.key === "name");
    const nameValue = nameProp?.value?.trim() || "";

    if (isNewlyCreatedFeature && !nameValue) {
      setNameError("Name is required");
      return;
    }

    setNameError(null);
    properties.save();
    lineStyle.commitLineStyle();
    shapeStyle.commitShapeStyle();
    pointOpacity.commitOpacity();
    iconProperties.commitIconProperties();
    textStyle.commitTextStyle();

    // Resume drawing if paused and close the panel
    const { isDrawingPaused, resumeDrawing } = useToolStore.getState();
    if (isDrawingPaused) {
      resumeDrawing();
    }
    onClose();
  };

  const handleCancel = () => {
    properties.cancel();
    lineStyle.resetToOriginal();
    shapeStyle.resetToOriginal();
    pointOpacity.resetToOriginal();
    iconProperties.resetToOriginal();
    textStyle.resetToOriginal();

    // Resume drawing if paused and close the panel
    const { isDrawingPaused, resumeDrawing } = useToolStore.getState();
    if (isDrawingPaused) {
      resumeDrawing();
    }
    onClose();
  };

  if (!selectedFeature) {
    return null;
  }

  return (
    <div className="absolute right-4 top-30 w-80 h-112 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-2xl border-l border-gray-200 dark:border-slate-700 z-30 transform transition-transform duration-300 ease-in-out">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-linear-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {properties.coordinates.name}
          </h3>
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
          {/* For text features, show only Text Style section */}
          {textStyle.supportsTextStyle ? (
            <TextStyleSection
              textStyle={textStyle}
              isEditing={properties.isEditing}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <>
              <div className="space-y-2">
                {!properties.isEditing ? (
                  <PropertyDisplayList
                    properties={properties.customProperties}
                    currentLabel={currentLabel}
                    lengthUnit={lengthUnit}
                    onLengthUnitChange={handleLengthUnitChange}
                  />
                ) : (
                  <PropertyEditList
                    properties={properties.customProperties}
                    onUpdate={properties.updateProperty}
                    onDelete={properties.deleteProperty}
                    currentLabel={currentLabel}
                    onLabelSelect={handleLabelSelect}
                    lengthUnit={lengthUnit}
                    onLengthUnitChange={handleLengthUnitChange}
                    nameError={nameError}
                  />
                )}
              </div>

              {/* Line Style Controls */}
              {lineStyle.supportsLineStyle && (
                <LineStyleSection
                  lineStyle={lineStyle}
                  isEditing={properties.isEditing}
                />
              )}

              {/* Shape Style Controls (Box and Circle) */}
              {shapeStyle.supportsShapeStyle && (
                <ShapeStyleSection
                  shapeStyle={shapeStyle}
                  isEditing={properties.isEditing}
                />
              )}

              {/* Icon Style Controls (Google Earth icons) */}
              {iconProperties.supportsIconProperties && (
                <IconStyleSection
                  iconProperties={iconProperties}
                  isEditing={properties.isEditing}
                />
              )}

              {/* Point/Icon Opacity Controls (non-icon point features) */}
              {pointOpacity.supportsPointOpacity &&
                !iconProperties.supportsIconProperties && (
                  <PointOpacitySection
                    pointOpacity={pointOpacity}
                    isEditing={properties.isEditing}
                  />
                )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-linear-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800">
          <div className="flex gap-2 pt-2">
            {!properties.isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => properties.setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <Edit2 className="h-3 w-3" />
                Edit
              </Button>
            ) : (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  className="flex items-center gap-2"
                >
                  <Save className="h-3 w-3" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="flex items-center gap-2"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={properties.addProperty}
                  className="flex items-center gap-2 ml-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-components

interface LabelSelectorProps {
  propertyKey: string;
  currentLabel: string;
  onSelect: (key: string) => void;
  disabled?: boolean;
}

const LabelSelector: React.FC<LabelSelectorProps> = ({
  propertyKey,
  currentLabel,
  onSelect,
  disabled = false,
}) => {
  const isSelected = currentLabel === propertyKey;

  // Don't show selector for these properties (they can't be used as labels)
  if (
    propertyKey === "label" ||
    propertyKey === "long" ||
    propertyKey === "lat" ||
    propertyKey === "length" ||
    propertyKey === "vertex"
  ) {
    return <div className="" />; // Spacer
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && onSelect(propertyKey)}
      disabled={disabled}
      className={`w-3 h-3 rounded-full border-2 flex items-center justify-center transition-all shrink-0 absolute -top-1.5 -left-1.5 z-10
        ${
          disabled
            ? "cursor-default opacity-50"
            : "cursor-pointer hover:border-blue-400"
        }
        ${
          isSelected
            ? "border-blue-500 bg-blue-500"
            : "border-gray-300 dark:border-gray-600 bg-white"
        }`}
      title={`Use "${propertyKey}" as label`}
    >
      {isSelected && (
        <svg
          className="w-3 h-3 text-white"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );
};

// Length value with unit selector
interface LengthValueWithUnitProps {
  value: string;
  unit: LengthUnit;
  onUnitChange: (unit: LengthUnit) => void;
}

const LengthValueWithUnit: React.FC<LengthValueWithUnitProps> = ({
  value,
  unit,
  onUnitChange,
}) => {
  // Extract numeric part from value (e.g., "2951.69km" -> "2951.69")
  const numericValue = value.replace(/[^\d.]/g, "");

  return (
    <div className="flex items-center gap-1">
      <span className="text-gray-600 dark:text-gray-400">{numericValue}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-0.5 px-1.5 py-0.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
            {unit}
            <ChevronDown className="w-3 h-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-20 p-1 bg-white dark:bg-slate-800 rounded-sm shadow-lg z-50">
          <DropdownMenuRadioGroup
            value={unit}
            onValueChange={(v) => onUnitChange(v as LengthUnit)}
          >
            <DropdownMenuRadioItem
              value="km"
              className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 data-[state=checked]:bg-blue-50 dark:data-[state=checked]:bg-blue-900/20 rounded"
            >
              km
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem
              value="m"
              className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 data-[state=checked]:bg-blue-50 dark:data-[state=checked]:bg-blue-900/20 rounded"
            >
              m
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

interface PropertyDisplayListProps {
  properties: { id: string; key: string; value: string }[];
  currentLabel: string;
  lengthUnit: LengthUnit;
  onLengthUnitChange: (unit: LengthUnit) => void;
}

const PropertyDisplayList: React.FC<PropertyDisplayListProps> = ({
  properties,
  lengthUnit,
  onLengthUnitChange,
}) => {
  console.log("properties", properties);
  if (properties.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <div className="text-4xl mb-2">📋</div>
        <div className="text-sm font-medium">No properties</div>
        <div className="text-xs mt-1">Click Edit to add properties</div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {properties.map((prop) => {
        // Check if this is an image URL property (supports "Image URL" and "Image URL 1", "Image URL 2", etc.)
        const isImageUrl =
          prop.key.startsWith("Image URL") && prop.value?.startsWith("http");

        if (isImageUrl) {
          return (
            <ExpandableScreen key={prop.id}>
              <ExpandableScreenTrigger>
                <div
                  key={prop.id}
                  className="py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <span className="font-medium text-gray-700 dark:text-gray-300 capitalize block mb-2">
                    {prop.key}:
                  </span>
                  <img
                    src={prop.value}
                    alt="Feature image"
                    className="w-full max-h-48 object-contain rounded border border-gray-200 dark:border-slate-600"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              </ExpandableScreenTrigger>
              <ExpandableScreenContent
                showCloseButton
                className="z-100 bg-white"
              >
                <div
                  key={prop.id}
                  className="rounded-lg bg-yellow-300 mt-24 transition-colors size-[calc(100vh-150px)] mx-auto"
                >
                  <img
                    src={prop.value}
                    alt="Feature image"
                    className=" m-auto size-full z-100 object-cover rounded border border-gray-200 dark:border-slate-600 bg-yellow-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              </ExpandableScreenContent>
            </ExpandableScreen>
          );
        }

        return (
          <div
            key={prop.id}
            className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <span className="font-medium text-gray-700 dark:text-gray-300 capitalize flex-1">
              {prop.key}:
            </span>
            {prop.key === "length" ? (
              <LengthValueWithUnit
                value={prop.value}
                unit={lengthUnit}
                onUnitChange={onLengthUnitChange}
              />
            ) : (
              <span className="text-gray-600 dark:text-gray-400 truncate ml-2">
                {prop.value || (
                  <span className="text-gray-400 italic">Empty</span>
                )}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

interface PropertyEditListProps {
  properties: { id: string; key: string; value: string }[];
  onUpdate: (id: string, field: "key" | "value", value: string) => void;
  onDelete: (id: string) => void;
  currentLabel: string;
  onLabelSelect: (key: string) => void;
  lengthUnit: LengthUnit;
  onLengthUnitChange: (unit: LengthUnit) => void;
  nameError?: string | null;
}

const PropertyEditList: React.FC<PropertyEditListProps> = ({
  properties,
  onUpdate,
  onDelete,
  currentLabel,
  onLabelSelect,
  lengthUnit,
  onLengthUnitChange,
  nameError,
}) => {
  if (properties.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
        <div className="text-3xl mb-2">➕</div>
        <div className="text-sm font-medium">No properties yet</div>
        <div className="text-xs mt-1">
          Click "Add" to create your first property
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {properties.map((prop) => {
        const isReadOnly = isProtectedProperty(prop.key);
        const isCalculated = isCalculatedProperty(prop.key);
        // Check if this is an image URL property (supports "Image URL" and "Image URL 1", "Image URL 2", etc.)
        const isImageUrl =
          prop.key.startsWith("Image URL") && prop.value?.startsWith("http");

        // Special layout for Image URL - show preview below
        if (isImageUrl) {
          return (
            <div key={prop.id} className="relative">
              <div className="flex gap-2 items-center">
                <LabelSelector
                  propertyKey={prop.key}
                  currentLabel={currentLabel}
                  onSelect={onLabelSelect}
                  disabled={false}
                />
                <Input
                  placeholder="Property name"
                  value={prop.key}
                  onChange={(e) => onUpdate(prop.id, "key", e.target.value)}
                  className="flex-1 text-sm bg-gray-50 dark:bg-slate-700"
                  disabled={true}
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDelete(prop.id)}
                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  aria-label="Delete property"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <img
                src={prop.value}
                alt="Feature image"
                className="w-full max-h-48 object-contain rounded border border-gray-200 dark:border-slate-600 mt-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          );
        }

        const isNameField = prop.key === "name";
        const hasNameError = isNameField && nameError;

        return (
          <div key={prop.id} className="relative">
            <div className="flex gap-2 items-center relative">
              <LabelSelector
                propertyKey={prop.key}
                currentLabel={currentLabel}
                onSelect={onLabelSelect}
                disabled={false}
              />
              <Input
                placeholder="Property name"
                value={prop.key}
                onChange={(e) => onUpdate(prop.id, "key", e.target.value)}
                className={`flex-1 text-sm ${
                  isReadOnly || isCalculated
                    ? "bg-gray-50 dark:bg-slate-700"
                    : ""
                }`}
                disabled={isReadOnly || isCalculated}
              />
              {prop.key === "length" ? (
                <div className="flex-1 flex items-center">
                  <LengthValueWithUnit
                    value={prop.value}
                    unit={lengthUnit}
                    onUnitChange={onLengthUnitChange}
                  />
                </div>
              ) : (
                <Input
                  placeholder="Value"
                  value={prop.value}
                  onChange={(e) => onUpdate(prop.id, "value", e.target.value)}
                  className={`flex-1 text-sm ${
                    isCalculated ? "bg-gray-50 dark:bg-slate-700" : ""
                  } ${hasNameError ? "border-red-500 focus:ring-red-500" : ""}`}
                  disabled={isCalculated}
                  type={
                    prop.key === "long" || prop.key === "lat"
                      ? "number"
                      : "text"
                  }
                  step={
                    prop.key === "long" || prop.key === "lat"
                      ? "any"
                      : undefined
                  }
                />
              )}
              {!isReadOnly && !isCalculated && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDelete(prop.id)}
                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  aria-label="Delete property"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            {hasNameError && (
              <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                <AlertCircle className="h-3 w-3" />
                <span>{nameError}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

interface LineStyleSectionProps {
  lineStyle: {
    lineColor: string;
    lineWidth: number;
    opacity: number;
    legendType: string | null;
    handleColorChange: (color: string) => void;
    handleWidthChange: (width: number) => void;
    handleOpacityChange: (opacity: number) => void;
    handleLegendTypeChange: (legend: LegendType) => void;
    setLineColor: (color: string) => void;
  };
  isEditing: boolean;
}

const LineStyleSection: React.FC<LineStyleSectionProps> = ({
  lineStyle,
  isEditing,
}) => {
  return (
    <div className="border-t border-gray-100 dark:border-slate-700 pt-4 mt-4">
      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
        Line Style
      </h4>

      {!isEditing ? (
        <LineStyleDisplay
          lineColor={lineStyle.lineColor}
          lineWidth={lineStyle.lineWidth}
          opacity={lineStyle.opacity}
          legendType={lineStyle.legendType}
        />
      ) : (
        <LineStyleEditor lineStyle={lineStyle} />
      )}
    </div>
  );
};

interface LineStyleDisplayProps {
  lineColor: string;
  lineWidth: number;
  opacity: number;
  legendType: string | null;
}

const LineStyleDisplay: React.FC<LineStyleDisplayProps> = ({
  lineColor,
  lineWidth,
  opacity,
  legendType,
}) => {
  const legend = legendType ? getLegendById(legendType) : null;

  return (
    <div className="space-y-2">
      <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          Color:
        </span>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
            style={{ backgroundColor: lineColor }}
          />
          <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">
            {lineColor.toUpperCase()}
          </span>
        </div>
      </div>
      {legend && (
        <div className="py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Line Type:
          </span>
          <img
            src={legend.imagePath}
            alt={legend.name}
            title={legend.name}
            className="w-full h-8 object-cover rounded border border-gray-200 dark:border-gray-600 mt-1"
          />
        </div>
      )}
      <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          Width:
        </span>
        <span className="text-gray-600 dark:text-gray-400">{lineWidth}px</span>
      </div>
      <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          Opacity:
        </span>
        <span className="text-gray-600 dark:text-gray-400">
          {Math.round(opacity * 100)}%
        </span>
      </div>
    </div>
  );
};

interface LineStyleEditorProps {
  lineStyle: {
    lineColor: string;
    lineWidth: number;
    opacity: number;
    legendType: string | null;
    handleColorChange: (color: string) => void;
    handleWidthChange: (width: number) => void;
    handleOpacityChange: (opacity: number) => void;
    handleLegendTypeChange: (legend: LegendType) => void;
    setLineColor: (color: string) => void;
  };
}

const LineStyleEditor: React.FC<LineStyleEditorProps> = ({ lineStyle }) => {
  const currentLegend = lineStyle.legendType ? getLegendById(lineStyle.legendType) : null;

  return (
  <div className="space-y-4">
    {/* Color Picker */}
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Line Color
      </Label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={lineStyle.lineColor}
          onChange={(e) => lineStyle.handleColorChange(e.target.value)}
          className="w-12 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-10 px-3">
              Choose Color
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48 p-1 bg-white rounded-sm shadow-lg z-10">
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={lineStyle.lineColor}
              onValueChange={(value) => lineStyle.setLineColor(value)}
            >
              {COLOR_OPTIONS.map((colorOption) => (
                <DropdownMenuRadioItem
                  key={colorOption.color}
                  value={colorOption.color}
                  className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 data-[state=checked]:bg-blue-50 dark:data-[state=checked]:bg-blue-900/20"
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: colorOption.color }}
                  />
                  <span>{colorOption.name}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    {/* Line Type */}
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Line Type
      </Label>
      <div className="flex items-center gap-3">
        {currentLegend && (
          <img
            src={currentLegend.imagePath}
            alt={currentLegend.name}
            title={currentLegend.name}
            className="h-10 w-2 flex-1 object-cover rounded border border-gray-300 dark:border-gray-600"
          />
        )}
        <LegendDropdown
          selectedLegend={currentLegend ?? undefined}
          onLegendSelect={lineStyle.handleLegendTypeChange}
        />
      </div>
    </div>

    {/* Width Slider */}
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Line Width:{" "}
        <EditableSliderValue
          value={lineStyle.lineWidth}
          onChange={lineStyle.handleWidthChange}
          min={1}
          max={20}
          step={1}
          format="px"
        />
      </Label>
      <div className="flex items-center gap-3">
        <Slider
          value={[lineStyle.lineWidth]}
          onValueChange={(value) => lineStyle.handleWidthChange(value[0])}
          min={1}
          max={20}
          step={1}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => lineStyle.handleWidthChange(DEFAULT_LINE_STYLE.width)}
          className="px-2 py-1 text-xs shrink-0"
        >
          Reset
        </Button>
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>1px</span>
        <span>20px</span>
      </div>
    </div>

    {/* Opacity Slider */}
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Opacity:{" "}
        <EditableSliderValue
          value={lineStyle.opacity}
          onChange={lineStyle.handleOpacityChange}
          min={0}
          max={1}
          step={0.01}
          format="percent"
        />
      </Label>
      <div className="flex items-center gap-3">
        <Slider
          value={[lineStyle.opacity]}
          onValueChange={(value) => lineStyle.handleOpacityChange(value[0])}
          min={0}
          max={1}
          step={0.01}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => lineStyle.handleOpacityChange(1)}
          className="px-2 py-1 text-xs shrink-0"
        >
          Reset
        </Button>
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  </div>
  );
};

interface ShapeStyleSectionProps {
  shapeStyle: {
    strokeColor: string;
    strokeWidth: number;
    strokeOpacity: number;
    fillColor: string;
    fillOpacity: number;
    bulgeRatio: number;
    isRevisionCloud: boolean;
    handleStrokeColorChange: (color: string) => void;
    handleStrokeWidthChange: (width: number) => void;
    handleStrokeOpacityChange: (opacity: number) => void;
    handleFillColorChange: (color: string) => void;
    handleFillOpacityChange: (opacity: number) => void;
    handleBulgeRatioChange: (ratio: number) => void;
    setStrokeColor: (color: string) => void;
    setFillColor: (color: string) => void;
  };
  isEditing: boolean;
}

const ShapeStyleSection: React.FC<ShapeStyleSectionProps> = ({
  shapeStyle,
  isEditing,
}) => {
  const title = shapeStyle.isRevisionCloud
    ? "Revision Cloud Style"
    : "Shape Style";

  return (
    <div className="border-t border-gray-100 dark:border-slate-700 pt-4 mt-4">
      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
        {title}
      </h4>

      {!isEditing ? (
        <ShapeStyleDisplay
          strokeColor={shapeStyle.strokeColor}
          strokeWidth={shapeStyle.strokeWidth}
          strokeOpacity={shapeStyle.strokeOpacity}
          fillColor={shapeStyle.fillColor}
          fillOpacity={shapeStyle.fillOpacity}
          bulgeRatio={shapeStyle.bulgeRatio}
          isRevisionCloud={shapeStyle.isRevisionCloud}
        />
      ) : (
        <ShapeStyleEditor shapeStyle={shapeStyle} />
      )}
    </div>
  );
};

interface ShapeStyleDisplayProps {
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity: number;
  fillColor: string;
  fillOpacity: number;
  bulgeRatio: number;
  isRevisionCloud: boolean;
}

const ShapeStyleDisplay: React.FC<ShapeStyleDisplayProps> = ({
  strokeColor,
  strokeWidth,
  strokeOpacity,
  fillColor,
  fillOpacity,
  bulgeRatio,
  isRevisionCloud,
}) => (
  <div className="space-y-2">
    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        {isRevisionCloud ? "Color:" : "Stroke:"}
      </span>
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
          style={{ backgroundColor: strokeColor }}
        />
        <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">
          {strokeColor.toUpperCase()}
        </span>
      </div>
    </div>
    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        {isRevisionCloud ? "Width:" : "Stroke Width:"}
      </span>
      <span className="text-gray-600 dark:text-gray-400">{strokeWidth}px</span>
    </div>
    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        {isRevisionCloud ? "Opacity:" : "Stroke Opacity:"}
      </span>
      <span className="text-gray-600 dark:text-gray-400">
        {Math.round(strokeOpacity * 100)}%
      </span>
    </div>
    {/* Bulge Ratio for RevisionCloud */}
    {isRevisionCloud && (
      <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          Radius:
        </span>
        <span className="text-gray-600 dark:text-gray-400">
          {Number(bulgeRatio || 0.5).toFixed(1)}
        </span>
      </div>
    )}
    {/* Hide fill options for RevisionCloud since it's typically stroke-only */}
    {!isRevisionCloud && (
      <>
        <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Fill:
          </span>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
              style={{ backgroundColor: fillColor }}
            />
            <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">
              {fillColor.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Fill Opacity:
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            {Math.round(fillOpacity * 100)}%
          </span>
        </div>
      </>
    )}
  </div>
);

interface ShapeStyleEditorProps {
  shapeStyle: {
    strokeColor: string;
    strokeWidth: number;
    strokeOpacity: number;
    fillColor: string;
    fillOpacity: number;
    bulgeRatio: number;
    isRevisionCloud: boolean;
    handleStrokeColorChange: (color: string) => void;
    handleStrokeWidthChange: (width: number) => void;
    handleStrokeOpacityChange: (opacity: number) => void;
    handleFillColorChange: (color: string) => void;
    handleFillOpacityChange: (opacity: number) => void;
    handleBulgeRatioChange: (ratio: number) => void;
    setStrokeColor: (color: string) => void;
    setFillColor: (color: string) => void;
  };
}

const ShapeStyleEditor: React.FC<ShapeStyleEditorProps> = ({ shapeStyle }) => (
  <div className="space-y-4">
    {/* Stroke/Line Color Picker */}
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {shapeStyle.isRevisionCloud ? "Color" : "Stroke Color"}
      </Label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={shapeStyle.strokeColor}
          onChange={(e) => shapeStyle.handleStrokeColorChange(e.target.value)}
          className="w-12 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-10 px-3">
              Choose Color
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48 p-1 bg-white rounded-sm shadow-lg z-10">
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={shapeStyle.strokeColor}
              onValueChange={(value) => shapeStyle.setStrokeColor(value)}
            >
              {COLOR_OPTIONS.map((colorOption) => (
                <DropdownMenuRadioItem
                  key={colorOption.color}
                  value={colorOption.color}
                  className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 data-[state=checked]:bg-blue-50 dark:data-[state=checked]:bg-blue-900/20"
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: colorOption.color }}
                  />
                  <span>{colorOption.name}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    {/* Stroke/Line Width Slider */}
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {shapeStyle.isRevisionCloud ? "Width" : "Stroke Width"}:{" "}
        <EditableSliderValue
          value={shapeStyle.strokeWidth}
          onChange={shapeStyle.handleStrokeWidthChange}
          min={1}
          max={20}
          step={1}
          format="px"
        />
      </Label>
      <div className="flex items-center gap-3">
        <Slider
          value={[shapeStyle.strokeWidth]}
          onValueChange={(value) =>
            shapeStyle.handleStrokeWidthChange(value[0])
          }
          min={1}
          max={20}
          step={1}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => shapeStyle.handleStrokeWidthChange(2)}
          className="px-2 py-1 text-xs shrink-0"
        >
          Reset
        </Button>
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>1px</span>
        <span>20px</span>
      </div>
    </div>

    {/* Stroke/Line Opacity Slider */}
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {shapeStyle.isRevisionCloud ? "Opacity" : "Stroke Opacity"}:{" "}
        <EditableSliderValue
          value={shapeStyle.strokeOpacity}
          onChange={shapeStyle.handleStrokeOpacityChange}
          min={0}
          max={1}
          step={0.01}
          format="percent"
        />
      </Label>
      <div className="flex items-center gap-3">
        <Slider
          value={[shapeStyle.strokeOpacity]}
          onValueChange={(value) =>
            shapeStyle.handleStrokeOpacityChange(value[0])
          }
          min={0}
          max={1}
          step={0.01}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => shapeStyle.handleStrokeOpacityChange(1)}
          className="px-2 py-1 text-xs shrink-0"
        >
          Reset
        </Button>
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>

    {/* Bulge Ratio Slider - only for RevisionCloud */}
    {shapeStyle.isRevisionCloud && (
      <div>
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Radius:{" "}
          <EditableSliderValue
            value={shapeStyle.bulgeRatio}
            onChange={shapeStyle.handleBulgeRatioChange}
            min={0.5}
            max={1.1}
            step={0.01}
            format="decimal"
          />
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[shapeStyle.bulgeRatio]}
            onValueChange={(value) =>
              shapeStyle.handleBulgeRatioChange(value[0])
            }
            min={0.5}
            max={1.1}
            step={0.01}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => shapeStyle.handleBulgeRatioChange(0.5)}
            className="px-2 py-1 text-xs shrink-0"
          >
            Reset
          </Button>
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>0.5</span>
          <span>1.1</span>
        </div>
      </div>
    )}

    {/* Fill Color Picker - only for non-RevisionCloud shapes */}
    {!shapeStyle.isRevisionCloud && (
      <div>
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Fill Color
        </Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={shapeStyle.fillColor}
            onChange={(e) => shapeStyle.handleFillColorChange(e.target.value)}
            className="w-12 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 px-3">
                Choose Color
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 p-1 bg-white rounded-sm shadow-lg z-10">
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={shapeStyle.fillColor}
                onValueChange={(value) => shapeStyle.setFillColor(value)}
              >
                {COLOR_OPTIONS.map((colorOption) => (
                  <DropdownMenuRadioItem
                    key={colorOption.color}
                    value={colorOption.color}
                    className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 data-[state=checked]:bg-blue-50 dark:data-[state=checked]:bg-blue-900/20"
                  >
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: colorOption.color }}
                    />
                    <span>{colorOption.name}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )}

    {/* Fill Opacity Slider - only for non-RevisionCloud shapes */}
    {!shapeStyle.isRevisionCloud && (
      <div>
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Fill Opacity:{" "}
          <EditableSliderValue
            value={shapeStyle.fillOpacity}
            onChange={shapeStyle.handleFillOpacityChange}
            min={0}
            max={1}
            step={0.01}
            format="percent"
          />
        </Label>
        <Slider
          value={[shapeStyle.fillOpacity]}
          onValueChange={(value) =>
            shapeStyle.handleFillOpacityChange(value[0])
          }
          min={0}
          max={1}
          step={0.01}
          className="flex-1"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>
    )}
  </div>
);

// Point/Icon Opacity Section
interface PointOpacitySectionProps {
  pointOpacity: {
    opacity: number;
    handleOpacityChange: (opacity: number) => void;
    resetToOriginal: () => void;
  };
  isEditing: boolean;
}

const PointOpacitySection: React.FC<PointOpacitySectionProps> = ({
  pointOpacity,
  isEditing,
}) => {
  return (
    <div className="border-t border-gray-100 dark:border-slate-700 pt-4 mt-4">
      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
        Opacity
      </h4>

      {!isEditing ? (
        <PointOpacityDisplay opacity={pointOpacity.opacity} />
      ) : (
        <PointOpacityEditor pointOpacity={pointOpacity} />
      )}
    </div>
  );
};

interface PointOpacityDisplayProps {
  opacity: number;
}

const PointOpacityDisplay: React.FC<PointOpacityDisplayProps> = ({
  opacity,
}) => (
  <div className="space-y-2">
    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        Opacity:
      </span>
      <span className="text-gray-600 dark:text-gray-400">
        {Math.round(opacity * 100)}%
      </span>
    </div>
  </div>
);

interface PointOpacityEditorProps {
  pointOpacity: {
    opacity: number;
    handleOpacityChange: (opacity: number) => void;
    resetToOriginal: () => void;
  };
}

const PointOpacityEditor: React.FC<PointOpacityEditorProps> = ({
  pointOpacity,
}) => (
  <div className="space-y-4">
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Opacity:{" "}
        <EditableSliderValue
          value={pointOpacity.opacity}
          onChange={pointOpacity.handleOpacityChange}
          min={0}
          max={1}
          step={0.01}
          format="percent"
        />
      </Label>
      <div className="flex items-center gap-3">
        <Slider
          value={[pointOpacity.opacity]}
          onValueChange={(value) => pointOpacity.handleOpacityChange(value[0])}
          min={0}
          max={1}
          step={0.01}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => pointOpacity.handleOpacityChange(1)}
          className="px-2 py-1 text-xs shrink-0"
        >
          Reset
        </Button>
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  </div>
);

// Icon Style Section (Google Earth icons)
interface IconStyleSectionProps {
  iconProperties: {
    opacity: number;
    iconScale: number;
    labelScale: number;
    textOffsetX: number;
    textOffsetY: number;
    rotation: number;
    showLabel: boolean;
    iconSrc: string;
    handleOpacityChange: (opacity: number) => void;
    handleIconScaleChange: (scale: number) => void;
    handleLabelScaleChange: (scale: number) => void;
    handleTextOffsetXChange: (offset: number) => void;
    handleTextOffsetYChange: (offset: number) => void;
    handleRotationChange: (rotation: number) => void;
    handleShowLabelChange: (show: boolean) => void;
    handleIconChange: (iconPath: string) => void;
  };
  isEditing: boolean;
}

const IconStyleSection: React.FC<IconStyleSectionProps> = ({
  iconProperties,
  isEditing,
}) => {
  return (
    <div className="border-t border-gray-100 dark:border-slate-700 pt-4 mt-4">
      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
        Icon Style
      </h4>

      {!isEditing ? (
        <IconStyleDisplay
          opacity={iconProperties.opacity}
          iconScale={iconProperties.iconScale}
          labelScale={iconProperties.labelScale}
          textOffsetX={iconProperties.textOffsetX}
          textOffsetY={iconProperties.textOffsetY}
          rotation={iconProperties.rotation}
          showLabel={iconProperties.showLabel}
          iconSrc={iconProperties.iconSrc}
        />
      ) : (
        <IconStyleEditor iconProperties={iconProperties} />
      )}
    </div>
  );
};

interface IconStyleDisplayProps {
  opacity: number;
  iconScale: number;
  labelScale: number;
  textOffsetX: number;
  textOffsetY: number;
  rotation: number;
  showLabel: boolean;
  iconSrc: string;
}

const IconStyleDisplay: React.FC<IconStyleDisplayProps> = ({
  opacity,
  iconScale,
  labelScale,
  textOffsetX,
  textOffsetY,
  rotation,
  showLabel,
  iconSrc,
}) => (
  <div className="space-y-2">
    {iconSrc && (
      <div className="py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          Icon:
        </span>
        <div className="flex items-center gap-2 mt-1">
          <img
            src={iconSrc}
            alt="Current icon"
            className="w-8 h-8 object-contain"
          />
          <span className="text-gray-600 dark:text-gray-400 text-xs truncate">
            {iconSrc.split("/").pop()?.replace(".png", "")}
          </span>
        </div>
      </div>
    )}
    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        Opacity:
      </span>
      <span className="text-gray-600 dark:text-gray-400">
        {Math.round(opacity * 100)}%
      </span>
    </div>
    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        Icon Scale:
      </span>
      <span className="text-gray-600 dark:text-gray-400">
        {iconScale.toFixed(1)}x
      </span>
    </div>
    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        Show Label:
      </span>
      <span className="text-gray-600 dark:text-gray-400">
        {showLabel ? "On" : "Off"}
      </span>
    </div>
    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        Label Scale:
      </span>
      <span className="text-gray-600 dark:text-gray-400">
        {labelScale.toFixed(1)}x
      </span>
    </div>
    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        Label Offset X:
      </span>
      <span className="text-gray-600 dark:text-gray-400">{textOffsetX}px</span>
    </div>
    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        Label Offset Y:
      </span>
      <span className="text-gray-600 dark:text-gray-400">{textOffsetY}px</span>
    </div>
    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        Rotation:
      </span>
      <span className="text-gray-600 dark:text-gray-400">
        {Math.round(rotation)}°
      </span>
    </div>
  </div>
);

interface IconStyleEditorProps {
  iconProperties: {
    opacity: number;
    iconScale: number;
    labelScale: number;
    textOffsetX: number;
    textOffsetY: number;
    rotation: number;
    showLabel: boolean;
    iconSrc: string;
    handleOpacityChange: (opacity: number) => void;
    handleIconScaleChange: (scale: number) => void;
    handleLabelScaleChange: (scale: number) => void;
    handleTextOffsetXChange: (offset: number) => void;
    handleTextOffsetYChange: (offset: number) => void;
    handleRotationChange: (rotation: number) => void;
    handleShowLabelChange: (show: boolean) => void;
    handleIconChange: (iconPath: string) => void;
  };
}

const IconStyleEditor: React.FC<IconStyleEditorProps> = ({
  iconProperties,
}) => {
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  return (
  <div className="space-y-4">
    {/* Icon Picker */}
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Icon
      </Label>
      <div className="flex items-center gap-3 mt-1">
        {iconProperties.iconSrc && (
          <img
            src={iconProperties.iconSrc}
            alt="Current icon"
            className="w-10 h-10 object-contain rounded border border-gray-300 dark:border-gray-600 p-1"
          />
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsIconPickerOpen(true)}
          className="h-10 px-3"
        >
          Change Icon
        </Button>
      </div>
      <IconPickerDialog
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        onSelectIcon={iconProperties.handleIconChange}
      />
    </div>

    {/* Opacity Slider */}
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Opacity:{" "}
        <EditableSliderValue
          value={iconProperties.opacity}
          onChange={iconProperties.handleOpacityChange}
          min={0}
          max={1}
          step={0.01}
          format="percent"
        />
      </Label>
      <div className="flex items-center gap-3">
        <Slider
          value={[iconProperties.opacity]}
          onValueChange={(value) =>
            iconProperties.handleOpacityChange(value[0])
          }
          min={0}
          max={1}
          step={0.01}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => iconProperties.handleOpacityChange(1)}
          className="px-2 py-1 text-xs shrink-0"
        >
          Reset
        </Button>
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>

    {/* Icon Scale Slider */}
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Icon Scale:{" "}
        <EditableSliderValue
          value={iconProperties.iconScale}
          onChange={iconProperties.handleIconScaleChange}
          min={0.1}
          max={5}
          step={0.1}
          format="decimal"
          suffix="x"
        />
      </Label>
      <div className="flex items-center gap-3">
        <Slider
          value={[iconProperties.iconScale]}
          onValueChange={(value) =>
            iconProperties.handleIconScaleChange(value[0])
          }
          min={0.1}
          max={5}
          step={0.1}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => iconProperties.handleIconScaleChange(1)}
          className="px-2 py-1 text-xs shrink-0"
        >
          Reset
        </Button>
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>0.1x</span>
        <span>5x</span>
      </div>
    </div>

    {/* Show Label Toggle */}
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
        Show Label
      </Label>
      <Checkbox
        checked={iconProperties.showLabel}
        onCheckedChange={(checked) =>
          iconProperties.handleShowLabelChange(checked === true)
        }
      />
    </div>

    {/* Label Scale Slider */}
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Label Scale:{" "}
        <EditableSliderValue
          value={iconProperties.labelScale}
          onChange={iconProperties.handleLabelScaleChange}
          min={0.1}
          max={5}
          step={0.1}
          format="decimal"
          suffix="x"
        />
      </Label>
      <div className="flex items-center gap-3">
        <Slider
          value={[iconProperties.labelScale]}
          onValueChange={(value) =>
            iconProperties.handleLabelScaleChange(value[0])
          }
          min={0.1}
          max={5}
          step={0.1}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => iconProperties.handleLabelScaleChange(1)}
          className="px-2 py-1 text-xs shrink-0"
        >
          Reset
        </Button>
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>0.1x</span>
        <span>5x</span>
      </div>
    </div>

    {/* Text Offset X Slider */}
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Label Offset X:{" "}
        <EditableSliderValue
          value={iconProperties.textOffsetX}
          onChange={iconProperties.handleTextOffsetXChange}
          min={-100}
          max={100}
          step={1}
          format="px"
        />
      </Label>
      <div className="flex items-center gap-3">
        <Slider
          value={[iconProperties.textOffsetX]}
          onValueChange={(value) =>
            iconProperties.handleTextOffsetXChange(value[0])
          }
          min={-100}
          max={100}
          step={1}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => iconProperties.handleTextOffsetXChange(0)}
          className="px-2 py-1 text-xs shrink-0"
        >
          Reset
        </Button>
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>-100px</span>
        <span>100px</span>
      </div>
    </div>

    {/* Text Offset Y Slider */}
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Label Offset Y:{" "}
        <EditableSliderValue
          value={iconProperties.textOffsetY}
          onChange={iconProperties.handleTextOffsetYChange}
          min={-100}
          max={100}
          step={1}
          format="px"
        />
      </Label>
      <div className="flex items-center gap-3">
        <Slider
          value={[iconProperties.textOffsetY]}
          onValueChange={(value) =>
            iconProperties.handleTextOffsetYChange(value[0])
          }
          min={-100}
          max={100}
          step={1}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => iconProperties.handleTextOffsetYChange(0)}
          className="px-2 py-1 text-xs shrink-0"
        >
          Reset
        </Button>
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>-100px</span>
        <span>100px</span>
      </div>
    </div>

    {/* Rotation Slider */}
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Rotation:{" "}
        <EditableSliderValue
          value={iconProperties.rotation}
          onChange={iconProperties.handleRotationChange}
          min={0}
          max={360}
          step={1}
          format="degrees"
        />
      </Label>
      <div className="flex items-center gap-3">
        <Slider
          value={[iconProperties.rotation]}
          onValueChange={(value) =>
            iconProperties.handleRotationChange(value[0])
          }
          min={0}
          max={360}
          step={1}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => iconProperties.handleRotationChange(0)}
          className="px-2 py-1 text-xs shrink-0"
        >
          Reset
        </Button>
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>0°</span>
        <span>360°</span>
      </div>
    </div>
  </div>
  );
};

// Text Style Section
interface TextStyleSectionProps {
  textStyle: {
    text: string;
    textScale: number;
    textRotation: number;
    textOpacity: number;
    textFillColor: string;
    textStrokeColor: string;
    textAlign: TextAlign;
    longitude: string;
    latitude: string;
    handleTextChange: (text: string) => void;
    handleScaleChange: (scale: number) => void;
    handleRotationChange: (rotation: number) => void;
    handleOpacityChange: (opacity: number) => void;
    handleFillColorChange: (color: string) => void;
    handleStrokeColorChange: (color: string) => void;
    handleTextAlignChange: (align: TextAlign) => void;
    handleLongitudeChange: (lon: string) => void;
    handleLatitudeChange: (lat: string) => void;
  };
  isEditing: boolean;
  onSave?: () => void;
  onCancel?: () => void;
}

const TextStyleSection: React.FC<TextStyleSectionProps> = ({
  textStyle,
  isEditing,
  onSave,
  onCancel,
}) => {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
        Text Properties
      </h4>

      {!isEditing ? (
        <TextStyleDisplay
          text={textStyle.text}
          textScale={textStyle.textScale}
          textRotation={textStyle.textRotation}
          textOpacity={textStyle.textOpacity}
          textFillColor={textStyle.textFillColor}
          textStrokeColor={textStyle.textStrokeColor}
          longitude={textStyle.longitude}
          latitude={textStyle.latitude}
        />
      ) : (
        <TextStyleEditor
          textStyle={textStyle}
          onSave={onSave}
          onCancel={onCancel}
        />
      )}
    </div>
  );
};

interface TextStyleDisplayProps {
  text: string;
  textScale: number;
  textRotation: number;
  textOpacity: number;
  textFillColor: string;
  textStrokeColor: string;
  longitude: string;
  latitude: string;
}

const TextStyleDisplay: React.FC<TextStyleDisplayProps> = ({
  text,
  textScale,
  textRotation,
  textOpacity,
  textFillColor,
  textStrokeColor,
  longitude,
  latitude,
}) => (
  <div className="space-y-2">
    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        Text:
      </span>
      <span className="text-gray-600 dark:text-gray-400 truncate max-w-[150px]">
        {text || <span className="italic text-gray-400">Empty</span>}
      </span>
    </div>
    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        Longitude:
      </span>
      <span className="text-gray-600 dark:text-gray-400">{longitude}</span>
    </div>
    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        Latitude:
      </span>
      <span className="text-gray-600 dark:text-gray-400">{latitude}</span>
    </div>

    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        Scale:
      </span>
      <span className="text-gray-600 dark:text-gray-400">
        {textScale.toFixed(1)}x
      </span>
    </div>
    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        Rotation:
      </span>
      <span className="text-gray-600 dark:text-gray-400">
        {Math.round(textRotation)}°
      </span>
    </div>
    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        Opacity:
      </span>
      <span className="text-gray-600 dark:text-gray-400">
        {Math.round(textOpacity * 100)}%
      </span>
    </div>
    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        Fill Color:
      </span>
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
          style={{ backgroundColor: textFillColor }}
        />
        <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">
          {textFillColor.toUpperCase()}
        </span>
      </div>
    </div>
    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        Stroke Color:
      </span>
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
          style={{ backgroundColor: textStrokeColor }}
        />
        <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">
          {textStrokeColor.toUpperCase()}
        </span>
      </div>
    </div>
  </div>
);

type TextAlign = "left" | "center" | "right";

interface TextStyleEditorProps {
  textStyle: {
    text: string;
    textScale: number;
    textRotation: number;
    textOpacity: number;
    textFillColor: string;
    textStrokeColor: string;
    textAlign: TextAlign;
    longitude: string;
    latitude: string;
    handleTextChange: (text: string) => void;
    handleScaleChange: (scale: number) => void;
    handleRotationChange: (rotation: number) => void;
    handleOpacityChange: (opacity: number) => void;
    handleFillColorChange: (color: string) => void;
    handleStrokeColorChange: (color: string) => void;
    handleTextAlignChange: (align: TextAlign) => void;
    handleLongitudeChange: (lon: string) => void;
    handleLatitudeChange: (lat: string) => void;
  };
  onSave?: () => void;
  onCancel?: () => void;
}

const TextStyleEditor: React.FC<TextStyleEditorProps> = ({
  textStyle,
  onSave,
  onCancel,
}) => {
  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.altKey) {
      // Alt+Enter: insert newline
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentText = textStyle.text;
      const newText =
        currentText.substring(0, start) + "\n" + currentText.substring(end);
      textStyle.handleTextChange(newText);
      // Set cursor position after the newline
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
    } else if (e.key === "Enter" && !e.altKey) {
      e.preventDefault();
      onSave?.();
    }
    if (e.key === "Escape") {
      onCancel?.();
    }
  };

  return (
    <div className="space-y-4">
      {/* Text Content Input */}
      <div>
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Text
        </Label>
        <Textarea
          value={textStyle.text}
          onChange={(e) => textStyle.handleTextChange(e.target.value)}
          onKeyDown={handleTextKeyDown}
          placeholder="Enter text... (Alt+Enter for new line)"
          className="mt-1 min-h-[60px]"
        />
      </div>

      {/* Text Align */}
      <div>
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Text Align
        </Label>
        <div className="flex gap-1 mt-1">
          {(["left", "center", "right"] as const).map((align) => (
            <Button
              key={align}
              variant={textStyle.textAlign === align ? "default" : "outline"}
              size="sm"
              onClick={() => textStyle.handleTextAlignChange(align)}
              className="flex-1 capitalize"
            >
              {align}
            </Button>
          ))}
        </div>
      </div>

      {/* Longitude Input */}
      <div>
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Longitude
        </Label>
        <Input
          type="number"
          step="any"
          value={textStyle.longitude}
          onChange={(e) => textStyle.handleLongitudeChange(e.target.value)}
          placeholder="0.000000"
          className="mt-1"
          disabled
        />
      </div>

      {/* Latitude Input */}
      <div>
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Latitude
        </Label>
        <Input
          type="number"
          step="any"
          value={textStyle.latitude}
          onChange={(e) => textStyle.handleLatitudeChange(e.target.value)}
          placeholder="0.000000"
          className="mt-1"
          disabled
        />
      </div>

      {/* Scale Slider */}
      <div>
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Scale:{" "}
          <EditableSliderValue
            value={textStyle.textScale}
            onChange={textStyle.handleScaleChange}
            min={0.1}
            max={3.0}
            step={0.1}
            format="decimal"
            suffix="x"
          />
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[textStyle.textScale]}
            onValueChange={(value) => textStyle.handleScaleChange(value[0])}
            min={0.1}
            max={3.0}
            step={0.1}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => textStyle.handleScaleChange(1)}
            className="px-2 py-1 text-xs shrink-0"
          >
            Reset
          </Button>
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>0.1x</span>
          <span>3.0x</span>
        </div>
      </div>

      {/* Rotation Slider */}
      <div>
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Rotation:{" "}
          <EditableSliderValue
            value={textStyle.textRotation}
            onChange={textStyle.handleRotationChange}
            min={0}
            max={360}
            step={1}
            format="degrees"
          />
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[textStyle.textRotation]}
            onValueChange={(value) => textStyle.handleRotationChange(value[0])}
            min={0}
            max={360}
            step={1}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => textStyle.handleRotationChange(0)}
            className="px-2 py-1 text-xs shrink-0"
          >
            Reset
          </Button>
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>0°</span>
          <span>360°</span>
        </div>
      </div>

      {/* Opacity Slider */}
      <div>
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Opacity:{" "}
          <EditableSliderValue
            value={textStyle.textOpacity}
            onChange={textStyle.handleOpacityChange}
            min={0}
            max={1}
            step={0.01}
            format="percent"
          />
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[textStyle.textOpacity]}
            onValueChange={(value) => textStyle.handleOpacityChange(value[0])}
            min={0}
            max={1}
            step={0.01}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => textStyle.handleOpacityChange(1)}
            className="px-2 py-1 text-xs shrink-0"
          >
            Reset
          </Button>
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Fill Color Picker */}
      <div>
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Fill Color
        </Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={textStyle.textFillColor}
            onChange={(e) => textStyle.handleFillColorChange(e.target.value)}
            className="w-12 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 px-3">
                Choose Color
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 p-1 bg-white rounded-sm shadow-lg z-10">
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={textStyle.textFillColor}
                onValueChange={(value) =>
                  textStyle.handleFillColorChange(value)
                }
              >
                {COLOR_OPTIONS.map((colorOption) => (
                  <DropdownMenuRadioItem
                    key={colorOption.color}
                    value={colorOption.color}
                    className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 data-[state=checked]:bg-blue-50 dark:data-[state=checked]:bg-blue-900/20"
                  >
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: colorOption.color }}
                    />
                    <span>{colorOption.name}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stroke Color Picker */}
      <div>
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Stroke Color
        </Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={textStyle.textStrokeColor}
            onChange={(e) => textStyle.handleStrokeColorChange(e.target.value)}
            className="w-12 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 px-3">
                Choose Color
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 p-1 bg-white rounded-sm shadow-lg z-10">
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={textStyle.textStrokeColor}
                onValueChange={(value) =>
                  textStyle.handleStrokeColorChange(value)
                }
              >
                {COLOR_OPTIONS.map((colorOption) => (
                  <DropdownMenuRadioItem
                    key={colorOption.color}
                    value={colorOption.color}
                    className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 data-[state=checked]:bg-blue-50 dark:data-[state=checked]:bg-blue-900/20"
                  >
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: colorOption.color }}
                    />
                    <span>{colorOption.name}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;
