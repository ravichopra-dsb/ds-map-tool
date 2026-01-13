import React from "react";
import type Map from "ol/Map";
import type Feature from "ol/Feature";
import type { Select } from "ol/interaction";
import { X, Edit2, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_LINE_STYLE } from "@/utils/featureTypeUtils";
import { isProtectedProperty, isCalculatedProperty } from "@/utils/propertyUtils";
import { usePropertiesPanel } from "@/hooks/usePropertiesPanel";
import { useLineStyleEditor } from "@/hooks/useLineStyleEditor";
import { useShapeStyleEditor } from "@/hooks/useShapeStyleEditor";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";

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
    properties.isEditing
  );
  const shapeStyle = useShapeStyleEditor(
    selectedFeature,
    map,
    selectInteraction ?? null,
    properties.isEditing
  );

  const handleSave = () => {
    properties.save();
    lineStyle.commitLineStyle();
    shapeStyle.commitShapeStyle();
  };

  const handleCancel = () => {
    properties.cancel();
    lineStyle.resetToOriginal();
    shapeStyle.resetToOriginal();
  };

  if (!selectedFeature) {
    return null;
  }

  // Don't show properties panel for text features
  if (selectedFeature.get("isText")) {
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
          <div className="space-y-2">
            {!properties.isEditing ? (
              <PropertyDisplayList properties={properties.customProperties} />
            ) : (
              <PropertyEditList
                properties={properties.customProperties}
                onUpdate={properties.updateProperty}
                onDelete={properties.deleteProperty}
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

interface PropertyDisplayListProps {
  properties: { id: string; key: string; value: string }[];
}

const PropertyDisplayList: React.FC<PropertyDisplayListProps> = ({
  properties,
}) => {
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
      {properties.map((prop) => (
        <div
          key={prop.id}
          className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
        >
          <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
            {prop.key}:
          </span>
          <span className="text-gray-600 dark:text-gray-400 truncate ml-2">
            {prop.value || <span className="text-gray-400 italic">Empty</span>}
          </span>
        </div>
      ))}
    </div>
  );
};

interface PropertyEditListProps {
  properties: { id: string; key: string; value: string }[];
  onUpdate: (id: string, field: "key" | "value", value: string) => void;
  onDelete: (id: string) => void;
}

const PropertyEditList: React.FC<PropertyEditListProps> = ({
  properties,
  onUpdate,
  onDelete,
}) => {
  if (properties.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
        <div className="text-3xl mb-2">➕</div>
        <div className="text-sm font-medium">No properties yet</div>
        <div className="text-xs mt-1">Click "Add" to create your first property</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {properties.map((prop) => {
        const isReadOnly = isProtectedProperty(prop.key);
        const isCalculated = isCalculatedProperty(prop.key);

        return (
          <div key={prop.id} className="flex gap-2 items-center">
            <Input
              placeholder="Property name"
              value={prop.key}
              onChange={(e) => onUpdate(prop.id, "key", e.target.value)}
              className={`flex-1 text-sm ${
                isReadOnly || isCalculated ? "bg-gray-50 dark:bg-slate-700" : ""
              }`}
              disabled={isReadOnly || isCalculated}
            />
            <Input
              placeholder="Value"
              value={prop.value}
              onChange={(e) => onUpdate(prop.id, "value", e.target.value)}
              className={`flex-1 text-sm ${
                isCalculated ? "bg-gray-50 dark:bg-slate-700" : ""
              }`}
              disabled={isCalculated}
              type={prop.key === "long" || prop.key === "lat" ? "number" : "text"}
              step={prop.key === "long" || prop.key === "lat" ? "any" : undefined}
            />
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
        );
      })}
    </div>
  );
};

interface LineStyleSectionProps {
  lineStyle: {
    lineColor: string;
    lineWidth: number;
    handleColorChange: (color: string) => void;
    handleWidthChange: (width: number) => void;
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
}

const LineStyleDisplay: React.FC<LineStyleDisplayProps> = ({
  lineColor,
  lineWidth,
}) => (
  <div className="space-y-2">
    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">Color:</span>
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
    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">Width:</span>
      <span className="text-gray-600 dark:text-gray-400">{lineWidth}px</span>
    </div>
  </div>
);

interface LineStyleEditorProps {
  lineStyle: {
    lineColor: string;
    lineWidth: number;
    handleColorChange: (color: string) => void;
    handleWidthChange: (width: number) => void;
    setLineColor: (color: string) => void;
  };
}

const LineStyleEditor: React.FC<LineStyleEditorProps> = ({ lineStyle }) => (
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

    {/* Width Slider */}
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Line Width: {lineStyle.lineWidth}px
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
  </div>
);

interface ShapeStyleSectionProps {
  shapeStyle: {
    strokeColor: string;
    fillColor: string;
    fillOpacity: number;
    handleStrokeColorChange: (color: string) => void;
    handleFillColorChange: (color: string) => void;
    handleFillOpacityChange: (opacity: number) => void;
    setStrokeColor: (color: string) => void;
    setFillColor: (color: string) => void;
  };
  isEditing: boolean;
}

const ShapeStyleSection: React.FC<ShapeStyleSectionProps> = ({
  shapeStyle,
  isEditing,
}) => {
  return (
    <div className="border-t border-gray-100 dark:border-slate-700 pt-4 mt-4">
      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
        Shape Style
      </h4>

      {!isEditing ? (
        <ShapeStyleDisplay
          strokeColor={shapeStyle.strokeColor}
          fillColor={shapeStyle.fillColor}
          fillOpacity={shapeStyle.fillOpacity}
        />
      ) : (
        <ShapeStyleEditor shapeStyle={shapeStyle} />
      )}
    </div>
  );
};

interface ShapeStyleDisplayProps {
  strokeColor: string;
  fillColor: string;
  fillOpacity: number;
}

const ShapeStyleDisplay: React.FC<ShapeStyleDisplayProps> = ({
  strokeColor,
  fillColor,
  fillOpacity,
}) => (
  <div className="space-y-2">
    <div className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <span className="font-medium text-gray-700 dark:text-gray-300">Stroke:</span>
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
      <span className="font-medium text-gray-700 dark:text-gray-300">Fill:</span>
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
      <span className="font-medium text-gray-700 dark:text-gray-300">Opacity:</span>
      <span className="text-gray-600 dark:text-gray-400">{Math.round(fillOpacity * 100)}%</span>
    </div>
  </div>
);

interface ShapeStyleEditorProps {
  shapeStyle: {
    strokeColor: string;
    fillColor: string;
    fillOpacity: number;
    handleStrokeColorChange: (color: string) => void;
    handleFillColorChange: (color: string) => void;
    handleFillOpacityChange: (opacity: number) => void;
    setStrokeColor: (color: string) => void;
    setFillColor: (color: string) => void;
  };
}

const ShapeStyleEditor: React.FC<ShapeStyleEditorProps> = ({ shapeStyle }) => (
  <div className="space-y-4">
    {/* Stroke Color Picker */}
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Stroke Color
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

    {/* Fill Color Picker */}
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

    {/* Opacity Slider */}
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Fill Opacity: {Math.round(shapeStyle.fillOpacity * 100)}%
      </Label>
      <Slider
        value={[shapeStyle.fillOpacity]}
        onValueChange={(value) => shapeStyle.handleFillOpacityChange(value[0])}
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
  </div>
);

export default PropertiesPanel;
