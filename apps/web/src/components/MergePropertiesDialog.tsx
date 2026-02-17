import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, GitMerge } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import type Feature from "ol/Feature";
import type { Geometry } from "ol/geom";

// Properties to exclude from display (internal OpenLayers properties)
const EXCLUDED_PROPERTIES = ["geometry", "ol_uid"];

interface MergePropertiesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedProperties: Record<string, any>) => void;
  feature1: Feature<Geometry> | null;
  feature2: Feature<Geometry> | null;
}

interface PropertyChoice {
  key: string;
  value1: any;
  value2: any;
  selected: "feature1" | "feature2";
}

export function MergePropertiesDialog({
  isOpen,
  onClose,
  onConfirm,
  feature1,
  feature2,
}: MergePropertiesDialogProps) {
  const [propertyChoices, setPropertyChoices] = useState<PropertyChoice[]>([]);

  // Build property choices when dialog opens
  useEffect(() => {
    if (isOpen && feature1 && feature2) {
      const props1 = feature1.getProperties();
      const props2 = feature2.getProperties();

      // Get all unique property keys from both features
      const allKeys = new Set([
        ...Object.keys(props1),
        ...Object.keys(props2),
      ]);

      const choices: PropertyChoice[] = [];

      allKeys.forEach((key) => {
        // Skip excluded properties
        if (EXCLUDED_PROPERTIES.includes(key)) return;

        const value1 = props1[key];
        const value2 = props2[key];

        // Only show properties that have different values or exist in one feature
        if (value1 !== value2) {
          choices.push({
            key,
            value1,
            value2,
            selected: "feature1", // Default to feature1
          });
        }
      });

      setPropertyChoices(choices);
    }
  }, [isOpen, feature1, feature2]);

  const handlePropertySelect = (index: number, selected: "feature1" | "feature2") => {
    setPropertyChoices((prev) =>
      prev.map((choice, i) =>
        i === index ? { ...choice, selected } : choice
      )
    );
  };

  const handleConfirm = () => {
    if (!feature1 || !feature2) return;

    // Build final properties object
    const finalProperties: Record<string, any> = {};

    // Start with feature1's properties as base
    const props1 = feature1.getProperties();
    Object.entries(props1).forEach(([key, value]) => {
      if (!EXCLUDED_PROPERTIES.includes(key)) {
        finalProperties[key] = value;
      }
    });

    // Override with selected choices
    propertyChoices.forEach((choice) => {
      if (choice.selected === "feature2") {
        finalProperties[choice.key] = choice.value2;
      } else {
        finalProperties[choice.key] = choice.value1;
      }
    });

    onConfirm(finalProperties);
    onClose();
  };

  const formatValue = (value: any): string => {
    if (value === undefined) return "(not set)";
    if (value === null) return "(null)";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return value.toFixed(2);
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  if (!isOpen || !feature1 || !feature2) {
    return null;
  }

  return (
    <div className="absolute right-4 top-20 w-80 h-112 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-2xl border-l border-gray-200 dark:border-slate-700 z-50 transform transition-transform duration-300 ease-in-out">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-linear-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800">
          <div className="flex items-center gap-2">
            <GitMerge className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Merge Properties
            </h3>
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <Card className="border-none shadow-none rounded-none">
            <CardContent className="p-4 space-y-3">
              {propertyChoices.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Both features have identical properties.
                  <br />
                  Click Merge to combine them.
                </div>
              ) : (
                propertyChoices.map((choice, index) => (
                  <div
                    key={choice.key}
                    className="border border-gray-200 dark:border-slate-600 rounded-lg p-3"
                  >
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                      {choice.key}
                    </Label>
                    <div className="space-y-2">
                      {/* Option 1: Feature 1 */}
                      <label
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          choice.selected === "feature1"
                            ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700"
                            : "bg-gray-50 dark:bg-slate-700/50 border border-transparent hover:bg-gray-100 dark:hover:bg-slate-600/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`property-${index}`}
                          checked={choice.selected === "feature1"}
                          onChange={() => handlePropertySelect(index, "feature1")}
                          className="text-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Line 1:
                          </span>
                          <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                            {formatValue(choice.value1)}
                          </p>
                        </div>
                      </label>

                      {/* Option 2: Feature 2 */}
                      <label
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          choice.selected === "feature2"
                            ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700"
                            : "bg-gray-50 dark:bg-slate-700/50 border border-transparent hover:bg-gray-100 dark:hover:bg-slate-600/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`property-${index}`}
                          checked={choice.selected === "feature2"}
                          onChange={() => handlePropertySelect(index, "feature2")}
                          className="text-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Line 2:
                          </span>
                          <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                            {formatValue(choice.value2)}
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 dark:border-slate-700 bg-linear-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleConfirm}
            className="flex items-center gap-2"
          >
            <GitMerge className="h-4 w-4" />
            Merge
          </Button>
        </div>
      </div>
    </div>
  );
}
