import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { X, MoveHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import type Feature from "ol/Feature";
import type { Geometry } from "ol/geom";

export type OffsetDirection = "left" | "right" | "both";

interface OffsetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (direction: OffsetDirection, distance: number) => void;
  feature: Feature<Geometry> | null;
}

export function OffsetDialog({
  isOpen,
  onClose,
  onConfirm,
  feature,
}: OffsetDialogProps) {
  const [direction, setDirection] = useState<OffsetDirection>("left");
  const [distanceInput, setDistanceInput] = useState<string>("10");
  const [unit, setUnit] = useState<"m" | "km">("m");
  const [error, setError] = useState<string>("");

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setDirection("left");
      setDistanceInput("10");
      setUnit("m");
      setError("");
    }
  }, [isOpen]);

  const handleConfirm = () => {
    // Validate distance input
    const distanceValue = parseFloat(distanceInput);
    if (isNaN(distanceValue) || distanceValue <= 0) {
      setError("Please enter a valid positive number");
      return;
    }

    // Convert to meters
    const distanceInMeters = unit === "km" ? distanceValue * 1000 : distanceValue;

    onConfirm(direction, distanceInMeters);
    onClose();
  };

  const handleDistanceChange = (value: string) => {
    setDistanceInput(value);
    setError("");
  };

  if (!isOpen || !feature) {
    return null;
  }

  return (
    <div className="absolute right-4 top-30 w-80 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-2xl border-l border-gray-200 dark:border-slate-700 z-50 transform transition-transform duration-300 ease-in-out">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-linear-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800">
          <div className="flex items-center gap-2">
            <MoveHorizontal className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Offset Line
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
          <Card className="border-none shadow-none rounded-none py-0">
            <CardContent className="p-4 space-y-4">
              {/* Direction Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Direction
                </Label>
                <div className="space-y-2">
                  {/* Left */}
                  <label
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                      direction === "left"
                        ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700"
                        : "bg-gray-50 dark:bg-slate-700/50 border border-transparent hover:bg-gray-100 dark:hover:bg-slate-600/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="direction"
                      checked={direction === "left"}
                      onChange={() => setDirection("left")}
                      className="text-blue-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                        Right
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Create offset to the right side
                      </p>
                    </div>
                  </label>

                  {/* Right */}
                  <label
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                      direction === "right"
                        ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700"
                        : "bg-gray-50 dark:bg-slate-700/50 border border-transparent hover:bg-gray-100 dark:hover:bg-slate-600/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="direction"
                      checked={direction === "right"}
                      onChange={() => setDirection("right")}
                      className="text-blue-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                        Left
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Create offset to the left side
                      </p>
                    </div>
                  </label>

                  {/* Both */}
                  <label
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                      direction === "both"
                        ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700"
                        : "bg-gray-50 dark:bg-slate-700/50 border border-transparent hover:bg-gray-100 dark:hover:bg-slate-600/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="direction"
                      checked={direction === "both"}
                      onChange={() => setDirection("both")}
                      className="text-blue-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                        Both
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Create offsets on both sides
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Distance Input */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Distance
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={distanceInput}
                    onChange={(e) => handleDistanceChange(e.target.value)}
                    placeholder="Enter distance"
                    className="flex-1"
                    min="0"
                    step="0.1"
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as "m" | "km")}
                    className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="m">m</option>
                    <option value="km">km</option>
                  </select>
                </div>
                {error && (
                  <p className="text-xs text-red-500 dark:text-red-400">
                    {error}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 dark:border-slate-700 bg-linear-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleConfirm}
            className="flex items-center gap-2"
          >
            <MoveHorizontal className="h-4 w-4" />
            Create Offset
          </Button>
        </div>
      </div>
    </div>
  );
}
