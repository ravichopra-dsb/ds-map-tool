import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { X, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import type Feature from "ol/Feature";
import type { Geometry } from "ol/geom";
import { type OffsetSide, getOffsetSideOptions } from "@/utils/offsetUtils";

interface OffsetDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (distance: number, side: OffsetSide) => void;
    feature: Feature<Geometry> | null;
}

export function OffsetDialog({
    isOpen,
    onClose,
    onApply,
    feature,
}: OffsetDialogProps) {
    const [distance, setDistance] = useState<string>("5");
    const [side, setSide] = useState<OffsetSide>("right");

    // Get geometry type and available side options
    const geometryType = feature?.getGeometry()?.getType() || "LineString";
    const sideOptions = getOffsetSideOptions(geometryType);

    // Reset side when geometry type changes
    useEffect(() => {
        if (isOpen && feature) {
            const type = feature.getGeometry()?.getType();
            if (type === "LineString") {
                setSide("right");
            } else {
                setSide("outward");
            }
        }
    }, [isOpen, feature]);

    const handleApply = () => {
        const distanceNum = parseFloat(distance);
        if (isNaN(distanceNum) || distanceNum <= 0) {
            return;
        }
        onApply(distanceNum, side);
        onClose();
    };

    const handleDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDistance(e.target.value);
    };

    if (!isOpen || !feature) {
        return null;
    }

    const featureName = feature.get("name") || "Feature";
    const distanceNum = parseFloat(distance);
    const isValidDistance = !isNaN(distanceNum) && distanceNum > 0;

    return (
        <div className="absolute right-4 top-20 w-72 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-2xl border-l border-gray-200 dark:border-slate-700 z-50 transform transition-transform duration-300 ease-in-out">
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-linear-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800">
                    <div className="flex items-center gap-2">
                        <Copy className="h-4 w-4 text-blue-500" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Offset Feature
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
                <Card className="border-none shadow-none rounded-none">
                    <CardContent className="p-4 space-y-4">
                        {/* Feature info */}
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            Creating offset of: <span className="font-medium text-gray-700 dark:text-gray-300">{featureName}</span>
                        </div>

                        {/* Distance Input */}
                        <div className="space-y-2">
                            <Label
                                htmlFor="offset-distance"
                                className="text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Distance (meters)
                            </Label>
                            <Input
                                id="offset-distance"
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={distance}
                                onChange={handleDistanceChange}
                                placeholder="Enter distance"
                                className="h-9"
                            />
                        </div>

                        {/* Side Selection */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Side
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                                {sideOptions.map((option) => (
                                    <label
                                        key={option.value}
                                        className={`flex items-center justify-center gap-2 p-2 rounded cursor-pointer transition-colors border ${side === option.value
                                                ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700"
                                                : "bg-gray-50 dark:bg-slate-700/50 border-transparent hover:bg-gray-100 dark:hover:bg-slate-600/50"
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="offset-side"
                                            value={option.value}
                                            checked={side === option.value}
                                            onChange={() => setSide(option.value)}
                                            className="sr-only"
                                        />
                                        <span className="text-sm text-gray-900 dark:text-gray-100">
                                            {option.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 dark:border-slate-700 bg-linear-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800">
                    <Button variant="outline" size="sm" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleApply}
                        disabled={!isValidDistance}
                        className="flex items-center gap-2"
                    >
                        <Copy className="h-4 w-4" />
                        Apply
                    </Button>
                </div>
            </div>
        </div>
    );
}
